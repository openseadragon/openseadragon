#!/usr/bin/env node
/**
 * Runs the QUnit suite headless in Puppeteer against the built bundle.
 *
 *   node test/run-tests.mjs [--coverage] [--module=<name>]
 *
 * --coverage loads test/coverage.html (the instrumented bundle from
 * `vite build --mode coverage`) and writes window.__coverage__ to .nyc_output/.
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";
import { preview } from "vite";

const args = process.argv.slice(2);
const coverage = args.includes("--coverage");
const moduleArg = args.find((a) => a.startsWith("--module="));
const moduleName = moduleArg ? moduleArg.slice("--module=".length) : process.env.QUNIT_MODULE;
const port = 8000;
// Fails the run when no test finishes for this long, as grunt-contrib-qunit's timeout did.
const stallTimeout = 60000;

// Serve the repo root as static files; the dev server would inject its client.
const server = await preview({
    configFile: false,
    logLevel: "error",
    build: { outDir: "." },
    preview: { port, strictPort: true }
});

const page = coverage ? "coverage.html" : "test.html";
const url = `http://localhost:${port}/test/${page}` +
    (moduleName ? `?module=${encodeURIComponent(moduleName)}` : "");
console.log(`Running ${url}`);

// GitHub's Ubuntu runners cannot start Chrome's sandbox.
const browser = await puppeteer.launch({ headless: true, args: process.env.CI ? ["--no-sandbox"] : [] });
let exitCode = 1;
try {
    const tab = await browser.newPage();
    await tab.setViewport({ width: 1024, height: 768 });
    tab.on("pageerror", (err) => console.error(`[page error] ${err.message}`));

    // test.html assigns a config object to window.QUnit before qunit.js
    // replaces it, so hook whichever assignment carries the real QUnit.
    await tab.evaluateOnNewDocument(() => {
        let current;
        window.__qunit = { done: false, failures: [], count: 0 };
        Object.defineProperty(window, "QUnit", {
            configurable: true,
            get: () => current,
            set: (value) => {
                current = value;
                if (typeof value.on !== "function") {
                    return;
                }
                value.on("testEnd", (test) => {
                    window.__qunit.count++;
                    if (test.status === "failed") {
                        window.__qunit.failures.push({
                            name: test.fullName.join(" > "),
                            errors: test.errors.map((e) => e.message || String(e.actual))
                        });
                    }
                });
                value.on("runEnd", (run) => {
                    window.__qunit.done = true;
                    window.__qunit.run = run.testCounts;
                    window.__qunit.runtime = run.runtime;
                });
            }
        });
    });

    await tab.goto(url, { waitUntil: "load" });

    let lastCount = 0;
    let lastProgress = Date.now();
    let lastLog = Date.now();
    while (!(await tab.evaluate(() => window.__qunit.done))) {
        await new Promise((r) => setTimeout(r, 500));
        const count = await tab.evaluate(() => window.__qunit.count);
        const now = Date.now();
        if (count !== lastCount) {
            lastCount = count;
            lastProgress = now;
        } else if (now - lastProgress > stallTimeout) {
            throw new Error(`No test finished in ${stallTimeout / 1000}s after ${count} tests`);
        }
        if (now - lastLog >= 5000) {
            console.log(`  ${count} tests run`);
            lastLog = now;
        }
    }

    const result = await tab.evaluate(() => ({
        ...window.__qunit,
        coverage: window.__coverage__ || null
    }));

    for (const failure of result.failures) {
        console.error(`FAIL ${failure.name}`);
        for (const error of failure.errors) {
            console.error(`    ${error}`);
        }
    }
    const { total, passed, failed, skipped, todo } = result.run;
    console.log(`${total} tests in ${result.runtime}ms: ${passed} passed, ${failed} failed, ${skipped} skipped, ${todo} todo`);

    if (coverage) {
        if (!result.coverage) {
            throw new Error("window.__coverage__ is undefined; run `vite build --mode coverage` first");
        }
        fs.mkdirSync(".nyc_output", { recursive: true });
        fs.writeFileSync(path.join(".nyc_output", "coverage.json"), JSON.stringify(result.coverage));
        console.log(`Coverage written for ${Object.keys(result.coverage).length} files`);
    }
    exitCode = failed === 0 && total > 0 ? 0 : 1;
} finally {
    await browser.close();
    await server.close();
}
process.exit(exitCode);
