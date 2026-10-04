const js = require("@eslint/js");
const compat = require("eslint-plugin-compat");
const stylistic = require("@stylistic/eslint-plugin");
const globals = require("globals");

module.exports = [
    {
        ignores: [
            "**/*.d.ts",
            "types/",
            "test-dts/**/*.ts",
            "test/lib/*.js",
            "eslint.config.js"
        ]
    },
    js.configs.recommended,
    compat.configs["flat/recommended"],
    {
        plugins: {
            "@stylistic": stylistic
        },
        languageOptions: {
            ecmaVersion: 2015,
            sourceType: "script",
            globals: Object.assign({}, globals.browser, {
                OpenSeadragon: "writable",
                define: "readonly",
                module: "readonly"
            })
        },
        rules: {
            "no-unused-vars": ["error", {"args": "none", "caughtErrors": "none"}],
            "@stylistic/semi": ["error", "always"],
            "block-scoped-var": ["error"],
            "consistent-return": ["error"],
            "curly": ["error", "all"],
            "eqeqeq": ["error"],
            "no-eval": ["error"],
            "no-implicit-globals": ["error"],
            "no-implied-eval": ["error"],
            "no-invalid-this": ["error"],
            "@stylistic/no-multi-spaces": ["error", {
                "ignoreEOLComments": true,
                "exceptions": {"Property": true, "VariableDeclarator": true, "AssignmentExpression": true}
            }],
            "no-new-wrappers": ["error"],
            "no-new": ["error"],
            "no-return-assign": ["error"],
            "no-self-compare": ["error"],
            "no-unmodified-loop-condition": ["error"],
            "no-unused-expressions": ["error"],
            "no-useless-call": ["error"],
            "no-useless-concat": ["error"],
            "no-useless-escape": ["error"],
            "no-useless-return": ["error"],
            "no-with": ["error"],
            "radix": ["error"],
            "yoda": ["off"],
            "no-undef-init": ["error"],
            "no-use-before-define": ["error", {"functions": false, "classes": true, "variables": true}],
            "camelcase": ["error"],
            "@stylistic/comma-spacing": ["error"],
            "@stylistic/comma-style": ["error"],
            "consistent-this": ["off", "self"],
            "@stylistic/eol-last": ["error"],
            "@stylistic/function-call-spacing": ["error"],
            "func-name-matching": ["error"],
            "@stylistic/key-spacing": ["error", {"mode": "minimum"}],
            "@stylistic/max-statements-per-line": ["error", {"max": 1}],
            "new-cap": ["error"],
            "@stylistic/new-parens": ["error"],
            "no-array-constructor": ["error"],
            "@stylistic/no-mixed-operators": ["error", {
                "groups": [
                    ["&", "|", "^", "~", "<<", ">>", ">>>"],
                    ["==", "!=", "===", "!==", ">", ">=", "<", "<="],
                    ["&&", "||"],
                    ["in", "instanceof"]
                ]
            }],
            "@stylistic/no-tabs": ["error"],
            "@stylistic/no-trailing-spaces": ["error"],
            "no-unneeded-ternary": ["error"],
            "@stylistic/no-whitespace-before-property": ["error"],
            "@stylistic/one-var-declaration-per-line": ["error"],
            "one-var": ["off", "never"],
            "operator-assignment": ["error"],
            "@stylistic/operator-linebreak": ["error", "after"],
            "@stylistic/quote-props": ["error", "as-needed"],
            "@stylistic/semi-spacing": ["error"],
            "@stylistic/space-infix-ops": ["error"],
            "@stylistic/space-unary-ops": ["error", {"words": true, "nonwords": false}],
            "unicode-bom": ["error"],
            "no-caller": ["error"],
            "no-loop-func": ["error"],
            "no-object-constructor": ["error"],
            // Dropped from recommended in ESLint 9.
            "no-inner-declarations": ["error"]
        }
    }
];
