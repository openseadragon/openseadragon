#!/usr/bin/env bun
/**
 * Lint script for OpenSeadragon
 * Runs ESLint on source files
 */

const sources = [
    "src/**/*.js",
];

async function lint() {
    console.log("🔍 Running ESLint...");

    const proc = Bun.spawn([
        "bun",
        "x",
        "eslint",
        ...sources
    ], {
        stdout: "inherit",
        stderr: "inherit",
        env: {
            ...process.env,
            // ESLint will automatically find .eslintrc.json
        }
    });

    const exitCode = await proc.exited;

    if (exitCode === 0) {
        console.log("✅ No linting errors found!");
    } else {
        console.error("❌ Linting errors found.");
        process.exit(exitCode);
    }
}

lint();
