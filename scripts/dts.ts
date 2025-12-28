#!/usr/bin/env bun
/**
 * TypeScript definition checking script for OpenSeadragon
 * Replaces grunt dts, dts:check, and dts:smoke tasks
 */

type CheckType = "check" | "smoke" | "all";

async function runTypeCheck(name: string, configFile: string): Promise<boolean> {
    console.log(`\n🔍 Running ${name}...`);

    const proc = Bun.spawn([
        "bun", "x", "tsc",
        "--noEmit",
        "-p", configFile,
    ], {
        stdout: "inherit",
        stderr: "inherit",
    });

    const exitCode = await proc.exited;

    if (exitCode === 0) {
        console.log(`✅ ${name} passed`);
        return true;
    } else {
        console.error(`❌ ${name} failed`);
        return false;
    }
}

async function main() {
    const args = Bun.argv.slice(2);

    // Determine which checks to run
    let checkType: CheckType = "all";

    if (args.includes("--check") || args.includes("-c")) {
        checkType = "check";
    } else if (args.includes("--smoke") || args.includes("-s")) {
        checkType = "smoke";
    }

    console.log("📘 TypeScript Definition Checker\n");

    let allPassed = true;

    // dts:check - Validates the type definitions themselves
    if (checkType === "check" || checkType === "all") {
        const checkPassed = await runTypeCheck(
            "DTS Check (validating types/index.d.ts)",
            "tsconfig.dts.json"
        );
        allPassed = allPassed && checkPassed;
    }

    // dts:smoke - Runs compile tests against the type definitions
    if (checkType === "smoke" || checkType === "all") {
        const smokePassed = await runTypeCheck(
            "DTS Smoke Test (compiling test-dts/)",
            "test-dts/tsconfig.json"
        );
        allPassed = allPassed && smokePassed;
    }

    // Summary
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    if (allPassed) {
        console.log("✅ All TypeScript definition checks passed!");
    } else {
        console.log("❌ Some TypeScript definition checks failed");
        process.exit(1);
    }
}

main();
