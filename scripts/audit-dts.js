/* eslint-env node */
/* eslint-disable no-implicit-globals */

/**
 * Audits types/index.d.ts against the public API surface of src/*.js.
 *
 * Neither `grunt dts:check` (tsc compiles the .d.ts in isolation) nor
 * `grunt dts:smoke` (tsd runs the assertions in test-dts/) ever look at
 * src/*.js, so a public method/property can exist in the JS with no
 * declaration -- or a declaration can outlive the JS it once described --
 * without either check noticing. This script diffs the two directly.
 *
 * It's a heuristic AST diff, not a type checker: it flags candidates for a
 * human to triage, not confirmed bugs. Known sources of noise include
 * inherited members that don't need re-declaring, symbols reached through a
 * level of indirection this script doesn't follow (e.g. `$.extend($, aVar)`
 * where aVar is a variable rather than an inline object literal), and
 * `@private`-tagged internals that legitimately still appear in the .d.ts
 * because they're used as a return type elsewhere in the public API.
 *
 * Parses both sides with the TypeScript *parser* only (no type checking, so
 * no noise from untyped JS) and builds a symbol table:
 *   - top-level: OpenSeadragon.Foo  (class/function/const/namespace member)
 *   - members:   Foo.bar            (prototype method/property)
 *
 * From src/*.js recognizes:
 *   $.Foo = function(...) {...}                       -> top-level Foo
 *   $.Foo = {...}                                      -> top-level Foo
 *   $.Foo.prototype.bar = function(...) {...}          -> Foo.bar
 *   $.Foo.prototype.bar = <value>                      -> Foo.bar
 *   $.Foo.prototype = { bar: ..., baz: ... }           -> Foo.bar, Foo.baz
 *   $.extend($.Foo.prototype, { bar: ..., baz: ... })  -> Foo.bar, Foo.baz
 *   $.extend(true, $.Foo.prototype, {...})             -> same, deep-extend form
 *   $.extend($, { bar: ..., baz: ... })                -> top-level bar, baz
 * Skips members preceded by a JSDoc @private tag, and names starting with "_".
 *
 * From types/index.d.ts recognizes:
 *   class Foo { bar(...): T; baz: T; static qux(): T; }
 *   function foo(...): T;
 *   const foo: T;
 *   enum Foo { ... }
 *   interface Foo { ... }   (recorded as declared, members not cross-checked)
 * Class members are matched up the declared `extends` chain, so an override
 * that only re-declares an already-inherited method isn't flagged.
 *
 * Usage: node scripts/audit-dts.js
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");

// ---------- source file list ----------

function loadSourceList(root) {
    const gruntfile = fs.readFileSync(path.join(root, "Gruntfile.js"), "utf8");
    const arrayMatch = gruntfile.match(/sources\s*=\s*\[([\s\S]*?)\]/);
    if (!arrayMatch) {
        throw new Error("Could not find `sources = [...]` array in Gruntfile.js");
    }
    const files = [];
    for (const line of arrayMatch[1].split("\n")) {
        const uncommented = line.replace(/\/\/.*/, "");
        const entryPattern = /["'](src\/[^"']+\.js)["']/g;
        let entry;
        while ((entry = entryPattern.exec(uncommented))) {
            files.push(entry[1]);
        }
    }
    return files;
}

// ---------- helpers ----------

function getLeadingJSDoc(sourceFile, node) {
    const text = sourceFile.getFullText();
    const ranges = ts.getLeadingCommentRanges(text, node.getFullStart()) || [];
    return ranges.map(r => text.slice(r.pos, r.end)).join("\n");
}

function isPrivateDoc(doc) {
    return /@private\b/.test(doc);
}

function memberName(nameNode) {
    if (!nameNode) {
        return null;
    }
    if (ts.isIdentifier(nameNode)) {
        return nameNode.text;
    }
    if (ts.isStringLiteral(nameNode)) {
        return nameNode.text;
    }
    return null;
}

// dotted property-access chain like $.Foo.prototype.bar -> ["$","Foo","prototype","bar"]
function chainParts(node) {
    const parts = [];
    let cur = node;
    while (cur) {
        if (ts.isIdentifier(cur)) {
            parts.unshift(cur.text);
            break;
        } else if (ts.isPropertyAccessExpression(cur)) {
            parts.unshift(cur.name.text);
            cur = cur.expression;
        } else {
            return null;
        }
    }
    return parts;
}

function addObjectLiteralMembers(sf, objLit, cls, members, loc) {
    for (const prop of objLit.properties) {
        if (
            ts.isPropertyAssignment(prop) ||
            ts.isMethodDeclaration(prop) ||
            ts.isShorthandPropertyAssignment(prop) ||
            ts.isGetAccessorDeclaration(prop) ||
            ts.isSetAccessorDeclaration(prop)
        ) {
            const name = memberName(prop.name);
            if (name && !name.startsWith("_")) {
                const doc = getLeadingJSDoc(sf, prop);
                if (!isPrivateDoc(doc)) {
                    const key = cls + "." + name;
                    if (!members.has(key)) {
                        members.set(key, loc(prop));
                    }
                }
            }
        }
    }
}

// members of an ES class body: `$.Foo = class Foo { bar() {}, get baz() {} }`
function addClassMembers(sf, classNode, cls, members, loc) {
    for (const el of classNode.members) {
        if (ts.isConstructorDeclaration(el)) {
            continue;
        }
        if (
            ts.isMethodDeclaration(el) ||
            ts.isPropertyDeclaration(el) ||
            ts.isGetAccessorDeclaration(el) ||
            ts.isSetAccessorDeclaration(el)
        ) {
            const name = memberName(el.name);
            if (name && !name.startsWith("_")) {
                const doc = getLeadingJSDoc(sf, el);
                if (!isPrivateDoc(doc)) {
                    const key = cls + "." + name;
                    if (!members.has(key)) {
                        members.set(key, loc(el));
                    }
                }
            }
        }
    }
}

// collects every `class Foo extends ... {...}` declaration in a file, by name,
// so a later `$.Foo = Foo;` (declare-then-assign-by-reference, e.g. Mat3,
// HTMLDrawer, CanvasDrawer) can be resolved back to its member list.
function collectClassDeclarations(node, out) {
    if (ts.isClassDeclaration(node) && node.name) {
        out.set(node.name.text, node);
    }
    ts.forEachChild(node, child => collectClassDeclarations(child, out));
}

// ---------- extract from src/*.js ----------

function extractSrc(root, sourceFiles) {
    // top-level names ($.Foo = ...) and members (Foo.bar)
    const topLevel = new Map(); // name -> {file, line}
    const members = new Map(); // "Foo.bar" -> {file, line}

    for (const rel of sourceFiles) {
        const file = path.join(root, rel);
        if (!fs.existsSync(file)) {
            console.error("WARN: missing source file " + rel);
            continue;
        }
        const text = fs.readFileSync(file, "utf8");
        const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2019, true, ts.ScriptKind.JS);

        // `class Foo extends ... {...}` declarations in this file, by name, so
        // `$.Foo = Foo;` (declare-then-assign-by-reference) can be resolved.
        const localClasses = new Map();
        collectClassDeclarations(sf, localClasses);

        const loc = function(node) {
            const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
            return { file: rel, line: line + 1 };
        };

        const visit = function(node) {
            // $.Foo = ...   or   $.Foo.prototype.bar = ...   or   $.Foo.prototype = {...}
            if (
                ts.isExpressionStatement(node) &&
                ts.isBinaryExpression(node.expression) &&
                node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
                ts.isPropertyAccessExpression(node.expression.left)
            ) {
                const bin = node.expression;
                const parts = chainParts(bin.left);
                if (parts && (parts[0] === "$" || parts[0] === "OpenSeadragon")) {
                    const rest = parts.slice(1);
                    const doc = getLeadingJSDoc(sf, node);
                    if (rest.length === 1) {
                        // $.Foo = ...
                        if (!isPrivateDoc(doc) && !rest[0].startsWith("_")) {
                            const cls = rest[0];
                            if (!topLevel.has(cls)) {
                                topLevel.set(cls, loc(node));
                            }
                            // $.Foo = class Foo {...}, or $.Foo = Foo where Foo was
                            // declared earlier in the file as `class Foo {...}`
                            const rhs = bin.right;
                            let classNode = null;
                            if (ts.isClassExpression(rhs)) {
                                classNode = rhs;
                            } else if (ts.isIdentifier(rhs) && localClasses.has(rhs.text)) {
                                classNode = localClasses.get(rhs.text);
                            }
                            if (classNode) {
                                addClassMembers(sf, classNode, cls, members, loc);
                            }
                        }
                    } else if (rest.length === 3 && rest[1] === "prototype") {
                        // $.Foo.prototype.bar = ...
                        const cls = rest[0];
                        const member = rest[2];
                        if (!isPrivateDoc(doc) && !member.startsWith("_")) {
                            const key = cls + "." + member;
                            if (!members.has(key)) {
                                members.set(key, loc(node));
                            }
                        }
                    } else if (rest.length === 2 && rest[1] === "prototype") {
                        // $.Foo.prototype = { a: ..., b: ... }
                        const cls = rest[0];
                        const rhs = bin.right;
                        if (ts.isObjectLiteralExpression(rhs)) {
                            addObjectLiteralMembers(sf, rhs, cls, members, loc);
                        }
                    } else if (rest.length === 2) {
                        // $.Foo.bar = ...  (a static member of class Foo, e.g. Rect.fromSummits).
                        // Note: this same shape is also how a couple of nested types are declared,
                        // e.g. $.MouseTracker.GesturePointList = function(...) {...}; those are
                        // reconciled on the .d.ts side (see the missingMembers check in main()),
                        // which accepts a match against any declared top-level name as well.
                        const cls = rest[0];
                        const member = rest[1];
                        if (!isPrivateDoc(doc) && !member.startsWith("_")) {
                            const key = cls + "." + member;
                            if (!members.has(key)) {
                                members.set(key, loc(node));
                            }
                        }
                    }
                }
            }

            // $.extend([true,] $.Foo.prototype, $.Mixin.prototype, { a: ..., b: ... })
            // $.extend( $, { a: ..., b: ... } )
            if (
                ts.isCallExpression(node) &&
                ts.isPropertyAccessExpression(node.expression) &&
                node.expression.name.text === "extend"
            ) {
                const calleeParts = chainParts(node.expression.expression);
                if (calleeParts && calleeParts.length === 1 && (calleeParts[0] === "$" || calleeParts[0] === "OpenSeadragon")) {
                    let args = node.arguments;
                    // drop leading boolean literal (deep-extend flag)
                    if (args.length && args[0].kind === ts.SyntaxKind.TrueKeyword) {
                        args = args.slice(1);
                    }
                    if (args.length >= 1) {
                        const targetParts = chainParts(args[0]);
                        if (
                            targetParts &&
                            targetParts.length === 3 &&
                            (targetParts[0] === "$" || targetParts[0] === "OpenSeadragon") &&
                            targetParts[2] === "prototype"
                        ) {
                            const cls = targetParts[1];
                            for (let i = 1; i < args.length; i++) {
                                const arg = args[i];
                                if (ts.isObjectLiteralExpression(arg)) {
                                    addObjectLiteralMembers(sf, arg, cls, members, loc);
                                }
                                // args that are themselves `$.Mixin.prototype` are mixins;
                                // not expanded here since the mixin's own members are already
                                // captured under its own class when that file is visited.
                            }
                        } else if (
                            targetParts &&
                            targetParts.length === 1 &&
                            (targetParts[0] === "$" || targetParts[0] === "OpenSeadragon")
                        ) {
                            // namespace-level mixin
                            for (let i = 1; i < args.length; i++) {
                                const arg = args[i];
                                if (ts.isObjectLiteralExpression(arg)) {
                                    for (const prop of arg.properties) {
                                        if (
                                            ts.isPropertyAssignment(prop) ||
                                            ts.isMethodDeclaration(prop) ||
                                            ts.isShorthandPropertyAssignment(prop)
                                        ) {
                                            const name = memberName(prop.name);
                                            if (name && !name.startsWith("_")) {
                                                const doc = getLeadingJSDoc(sf, prop);
                                                if (!isPrivateDoc(doc)) {
                                                    if (!topLevel.has(name)) {
                                                        topLevel.set(name, loc(prop));
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            ts.forEachChild(node, visit);
        };

        visit(sf);
    }

    return { topLevel, members };
}

// ---------- extract from types/index.d.ts ----------

function extractDts(root) {
    const file = path.join(root, "types/index.d.ts");
    const text = fs.readFileSync(file, "utf8");
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2019, true, ts.ScriptKind.TS);

    const topLevel = new Map(); // name -> kind
    const members = new Map(); // "Foo.bar" -> kind
    const extendsMap = new Map(); // ClassName -> base ClassName (identifier text only)

    function visitNamespaceBody(statements) {
        for (const stmt of statements) {
            if (ts.isClassDeclaration(stmt) && stmt.name) {
                topLevel.set(stmt.name.text, "class");
                for (const m of stmt.members) {
                    const name = memberName(m.name);
                    if (!name) {
                        continue;
                    }
                    members.set(stmt.name.text + "." + name, "class-member");
                }
                if (stmt.heritageClauses) {
                    for (const clause of stmt.heritageClauses) {
                        if (clause.token === ts.SyntaxKind.ExtendsKeyword && clause.types.length) {
                            const expr = clause.types[0].expression;
                            // base may be generic, e.g. EventSource<TileSourceEventMap> -- take the identifier
                            if (ts.isIdentifier(expr)) {
                                extendsMap.set(stmt.name.text, expr.text);
                            }
                        }
                    }
                }
            } else if (ts.isInterfaceDeclaration(stmt)) {
                // TS declaration merging: `interface Viewer extends ControlDock, ... {}`
                // alongside an earlier `class Viewer {...}` describes the *same* type, adding
                // mixed-in members without overriding what makes it a class. Don't let this
                // downgrade an already-recorded class to "interface" -- that would silently
                // stop member auditing for it (the missingMembers check only runs for classes).
                if (topLevel.get(stmt.name.text) !== "class") {
                    topLevel.set(stmt.name.text, "interface");
                }
                for (const m of stmt.members) {
                    const name = memberName(m.name);
                    if (!name) {
                        continue;
                    }
                    members.set(stmt.name.text + "." + name, "class-member");
                }
            } else if (ts.isFunctionDeclaration(stmt) && stmt.name) {
                topLevel.set(stmt.name.text, "function");
            } else if (ts.isEnumDeclaration(stmt)) {
                topLevel.set(stmt.name.text, "enum");
            } else if (ts.isVariableStatement(stmt)) {
                for (const decl of stmt.declarationList.declarations) {
                    if (ts.isIdentifier(decl.name)) {
                        topLevel.set(decl.name.text, "const");
                    }
                }
            } else if (ts.isModuleDeclaration(stmt) && stmt.body && ts.isModuleBlock(stmt.body)) {
                // nested namespace, e.g. `namespace PriorityQueue { class Node {...} }`
                visitNamespaceBody(stmt.body.statements);
            }
        }
    }

    for (const stmt of sf.statements) {
        if (ts.isModuleDeclaration(stmt) && stmt.body && ts.isModuleBlock(stmt.body)) {
            visitNamespaceBody(stmt.body.statements);
        }
    }

    return { topLevel, members, extendsMap };
}

// true if `cls` or any of its declared ancestors declares member `name`
function hasMemberInChain(dts, cls, name, seen) {
    seen = seen || new Set();
    if (seen.has(cls)) {
        return false;
    }
    seen.add(cls);
    if (dts.members.has(cls + "." + name)) {
        return true;
    }
    const base = dts.extendsMap.get(cls);
    if (base) {
        return hasMemberInChain(dts, base, name, seen);
    }
    return false;
}

// ---------- diff ----------

function main() {
    const sourceFiles = loadSourceList(ROOT);
    const src = extractSrc(ROOT, sourceFiles);
    const dts = extractDts(ROOT);

    const missingTopLevel = [];
    for (const [name, loc] of src.topLevel) {
        if (!dts.topLevel.has(name)) {
            missingTopLevel.push({ name, loc });
        }
    }

    const missingMembers = [];
    for (const [key, loc] of src.members) {
        const cls = key.split(".")[0];
        const name = key.split(".").slice(1).join(".");
        // only flag if the class itself is declared (as class) but the member is
        // missing from it AND from every ancestor in its declared `extends` chain;
        // if the class isn't declared at all it's already covered by missingTopLevel.
        // Also accept a match against any declared top-level name: a `$.Foo.Bar = ...`
        // assignment is ambiguous between a static member and a nested type (e.g.
        // `$.MouseTracker.GesturePointList`), and the .d.ts side flattens the latter
        // into a same-named top-level declaration rather than nesting it.
        if (
            dts.topLevel.get(cls) === "class" &&
            !hasMemberInChain(dts, cls, name) &&
            !dts.topLevel.has(name)
        ) {
            missingMembers.push({ key, loc });
        }
    }

    // declared in .d.ts but never found in src -- candidates for removal, or just
    // missed by these heuristics (see the notes at the top of this file)
    const staleTopLevel = [];
    for (const [name, kind] of dts.topLevel) {
        if (kind === "interface") {
            continue; // interfaces are pure types, no src equivalent expected
        }
        if (!src.topLevel.has(name)) {
            staleTopLevel.push({ name, kind });
        }
    }

    console.log("=== SRC SUMMARY ===");
    console.log("top-level public symbols found in src:", src.topLevel.size);
    console.log("prototype members found in src:", src.members.size);
    console.log();

    console.log("=== DTS SUMMARY ===");
    console.log("top-level declarations in .d.ts:", dts.topLevel.size);
    console.log("class members in .d.ts:", dts.members.size);
    console.log();

    console.log("=== MISSING FROM types/index.d.ts (top-level) ===");
    missingTopLevel
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(({ name, loc }) => console.log(`  ${name}  (${loc.file}:${loc.line})`));
    console.log(`(${missingTopLevel.length} total)\n`);

    console.log("=== MISSING FROM types/index.d.ts (class members, only for classes that ARE declared) ===");
    missingMembers
        .sort((a, b) => a.key.localeCompare(b.key))
        .forEach(({ key, loc }) => console.log(`  ${key}  (${loc.file}:${loc.line})`));
    console.log(`(${missingMembers.length} total)\n`);

    console.log("=== IN types/index.d.ts BUT NOT FOUND IN src (review: maybe removed, renamed, or missed by heuristics) ===");
    staleTopLevel
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(({ name, kind }) => console.log(`  ${name}  [${kind}]`));
    console.log(`(${staleTopLevel.length} total)\n`);
}

main();
