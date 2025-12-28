#!/usr/bin/env bun
/**
 * Coverage script for OpenSeadragon
 * Runs QUnit tests with code coverage reporting using Istanbul/NYC
 */

import puppeteer from "puppeteer";
import { existsSync, mkdirSync, writeFileSync, rmSync, readdirSync, copyFileSync } from "fs";
import { join, dirname } from "path";

interface QUnitResults {
    total: number;
    passed: number;
    failed: number;
    runtime: number;
}

const PORT = 8000;
const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const coverageDir = `coverage/${dateStr}`;

// Source files to instrument
const sources = [
    "src/openseadragon.js",
    "src/matrix3.js",
    "src/fullscreen.js",
    "src/eventsource.js",
    "src/mousetracker.js",
    "src/control.js",
    "src/controldock.js",
    "src/placement.js",
    "src/viewer.js",
    "src/navigator.js",
    "src/strings.js",
    "src/point.js",
    "src/tilesource.js",
    "src/dzitilesource.js",
    "src/iiiftilesource.js",
    "src/iiptilesource.js",
    "src/iristilesource.js",
    "src/osmtilesource.js",
    "src/tmstilesource.js",
    "src/zoomifytilesource.js",
    "src/legacytilesource.js",
    "src/imagetilesource.js",
    "src/tilesourcecollection.js",
    "src/priorityqueue.js",
    "src/datatypeconverter.js",
    "src/button.js",
    "src/buttongroup.js",
    "src/rectangle.js",
    "src/referencestrip.js",
    "src/displayrectangle.js",
    "src/spring.js",
    "src/imageloader.js",
    "src/tile.js",
    "src/overlay.js",
    "src/drawerbase.js",
    "src/htmldrawer.js",
    "src/canvasdrawer.js",
    "src/webgldrawer.js",
    "src/viewport.js",
    "src/tiledimage.js",
    "src/tilecache.js",
    "src/world.js",
];

async function instrumentCode(): Promise<void> {
    console.log("📊 Instrumenting source files for coverage...");

    // Clean instrumented directory
    if (existsSync("instrumented")) {
        rmSync("instrumented", { recursive: true });
    }
    mkdirSync("instrumented/src", { recursive: true });

    // Use Istanbul (nyc) to instrument the code
    const proc = Bun.spawn([
        "bun", "x", "nyc",
        "instrument",
        "src",
        "instrumented/src",
        "--compact=false",
    ], {
        stdout: "inherit",
        stderr: "inherit",
    });

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
        throw new Error("Failed to instrument source files");
    }

    console.log("✅ Source files instrumented");
}

async function runCoverageTests(): Promise<void> {
    console.log("\n🧪 Running tests with coverage...");

    // Start development server serving instrumented code for coverage.html
    const server = Bun.serve({
        port: PORT,
        async fetch(req) {
            const url = new URL(req.url);
            let path = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;

            // Default path
            if (!path) {
                path = "test/coverage.html";
            }

            try {
                const file = Bun.file(path);
                if (await file.exists()) {
                    return new Response(file);
                }
                return new Response("Not Found", { status: 404 });
            } catch (error) {
                return new Response("Internal Server Error", { status: 500 });
            }
        },
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    console.log(`📊 Running coverage tests at http://localhost:${PORT}/test/coverage.html`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    let testResults: QUnitResults | null = null;
    let coverageData: any = null;

    // Expose callbacks
    await page.exposeFunction("bunTestComplete", (results: QUnitResults) => {
        testResults = results;
    });

    await page.exposeFunction("bunCoverageData", (data: any) => {
        coverageData = data;
    });

    // Navigate to coverage test page
    await page.goto(`http://localhost:${PORT}/test/coverage.html`, { waitUntil: "domcontentloaded" });

    // Wait for QUnit
    await page.waitForFunction(() => {
        // @ts-ignore
        return typeof window.QUnit !== 'undefined' && typeof window.QUnit.done !== 'undefined';
    }, { timeout: 10000 });

    // Inject callbacks
    await page.evaluate(() => {
        // @ts-ignore
        window.QUnit.done((results) => {
            // @ts-ignore - Get coverage data from Istanbul
            const coverage = window.__coverage__;
            // @ts-ignore
            window.bunCoverageData(coverage || null);
            // @ts-ignore
            window.bunTestComplete(results);
        });
    });

    // Wait for QUnit to start
    await page.waitForFunction(() => {
        // @ts-ignore
        return window.QUnit && window.QUnit.config && window.QUnit.config.started;
    }, { timeout: 15000 });

    console.log("✅ Coverage tests started, waiting for completion...\n");

    // Wait for tests to complete (generous timeout)
    const testPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error("Coverage test timeout after 180 seconds"));
        }, 180000);

        const checkInterval = setInterval(() => {
            if (testResults !== null) {
                clearTimeout(timeout);
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
    });

    try {
        await testPromise;

        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📊 Test Results:");
        console.log(`   Total: ${testResults!.total}`);
        console.log(`   ✅ Passed: ${testResults!.passed}`);
        console.log(`   ❌ Failed: ${testResults!.failed}`);
        console.log(`   ⏱️  Runtime: ${testResults!.runtime}ms`);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        // Create coverage directory
        mkdirSync(coverageDir, { recursive: true });

        if (coverageData) {
            // Save coverage JSON
            const coverageJsonPath = join(coverageDir, "coverage.json");
            writeFileSync(coverageJsonPath, JSON.stringify(coverageData, null, 2));
            console.log(`📁 Coverage data saved to ${coverageJsonPath}`);

            // Generate HTML report using nyc
            console.log("📊 Generating coverage report...");
            const reportProc = Bun.spawn([
                "bun", "x", "nyc",
                "report",
                "--reporter=html",
                "--reporter=text",
                `--temp-dir=${coverageDir}`,
                `--report-dir=${coverageDir}/html`,
            ], {
                stdout: "inherit",
                stderr: "inherit",
            });

            await reportProc.exited;
            console.log(`\n📊 Coverage report generated at ${coverageDir}/html/index.html`);
        } else {
            console.log("⚠️  No coverage data collected (coverage instrumentation may not be working)");
        }

        await browser.close();
        server.stop();

        process.exit(testResults!.failed > 0 ? 1 : 0);
    } catch (error) {
        console.error("\n❌ Coverage test error:", error);
        await browser.close();
        server.stop();
        process.exit(1);
    }
}

async function main() {
    console.log("📊 OpenSeadragon Coverage Runner\n");

    try {
        // Step 1: Instrument the code
        await instrumentCode();

        // Step 2: Run tests with coverage
        await runCoverageTests();
    } catch (error) {
        console.error("❌ Coverage failed:", error);
        process.exit(1);
    }
}

main();
