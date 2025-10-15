#!/usr/bin/env bun
/**
 * Test runner for OpenSeadragon
 * Runs QUnit tests with Puppeteer
 */

import puppeteer from "puppeteer";

const PORT = 8000;
const TEST_URL = `http://localhost:${PORT}/test/test.html`;

async function runTests() {
    console.log("🧪 Starting test runner...");

    // Start development server
    console.log("🚀 Starting test server...");
    const server = Bun.serve({
        port: PORT,
        async fetch(req) {
            const url = new URL(req.url);
            const path = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;

            try {
                const file = Bun.file(path || "test/test.html");
                if (await file.exists()) {
                    return new Response(file);
                }
                return new Response("Not Found", { status: 404 });
            } catch (error) {
                return new Response("Internal Server Error", { status: 500 });
            }
        },
    });

    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log(`📊 Running tests at ${TEST_URL}`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Collect test details
    const testDetails: any[] = [];

    // Collect console logs and test results
    page.on("console", (msg) => {
        const text = msg.text();
        if (!text.includes("favicon")) {
            console.log(`  ${text}`);
        }
    });

    // Listen for QUnit test results
    await page.exposeFunction("bunTestDetails", (name: string, failed: number, passed: number, total: number) => {
        if (failed > 0) {
            testDetails.push({ name, failed, passed, total });
        }
    });

    let testResults: any = null;
    let timeout: NodeJS.Timeout;

    // Expose a callback for QUnit to call when done
    await page.exposeFunction("bunTestComplete", (results: any) => {
        testResults = results;
    });

    // Navigate to test page
    await page.goto(TEST_URL, { waitUntil: "domcontentloaded" });

    // Wait for QUnit to be available and inject our callback
    await page.waitForFunction(() => {
        // @ts-ignore - window exists in browser context
        return typeof window.QUnit !== 'undefined' && typeof window.QUnit.done !== 'undefined';
    }, { timeout: 10000 });

    // Inject code to report results BEFORE tests start
    await page.evaluate(() => {
        // @ts-ignore - window exists in browser context
        window.QUnit.testDone((details) => {
            // @ts-ignore - window exists in browser context
            window.bunTestDetails(details.name, details.failed, details.passed, details.total);
        });

        // @ts-ignore - window exists in browser context
        window.QUnit.done((results) => {
            // @ts-ignore - window exists in browser context
            window.bunTestComplete(results);
        });
    });

    // Wait for QUnit to actually start running tests
    await page.waitForFunction(() => {
        // @ts-ignore
        return window.QUnit && window.QUnit.config && window.QUnit.config.started;
    }, { timeout: 15000 });

    console.log("✅ QUnit started, waiting for tests to complete...\n");

    // Create a promise that resolves when tests complete
    const testPromise = new Promise((resolve, reject) => {
        // Set generous timeout for all tests to complete
        // OpenSeadragon tests can take a while (images, animations, etc.)
        timeout = setTimeout(() => {
            reject(new Error("Test timeout after 120 seconds"));
        }, 120000);

        // Poll for test results
        const checkInterval = setInterval(() => {
            if (testResults !== null) {
                clearTimeout(timeout);
                clearInterval(checkInterval);
                resolve(testResults);
            }
        }, 100);
    });

    try {
        // Wait for tests to complete
        await testPromise;

        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📊 Test Results:");
        console.log(`   Total: ${testResults.total}`);
        console.log(`   ✅ Passed: ${testResults.passed}`);
        console.log(`   ❌ Failed: ${testResults.failed}`);
        console.log(`   ⏱️  Runtime: ${testResults.runtime}ms`);

        if (testDetails.length > 0) {
            console.log("\n❌ Failed Tests (first 10):");
            testDetails.slice(0, 10).forEach(test => {
                console.log(`   • ${test.name}: ${test.failed}/${test.total} failed`);
            });
            if (testDetails.length > 10) {
                console.log(`   ... and ${testDetails.length - 10} more`);
            }
        }
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        await browser.close();
        server.stop();

        if (testResults.failed > 0) {
            process.exit(1);
        }

        process.exit(0);
    } catch (error) {
        console.error("\n❌ Test error:", error);
        await browser.close();
        server.stop();
        process.exit(1);
    }
}

// Run the tests
runTests();
