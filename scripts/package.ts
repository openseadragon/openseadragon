#!/usr/bin/env bun
/**
 * Package script for OpenSeadragon
 * Creates .zip and .tar.gz distribution files
 */

import { mkdirSync, existsSync, rmSync, copyFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { readFileSync } from "fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf-8"));
const packageName = `openseadragon-bin-${packageJson.version}`;
const packageDir = `build/${packageName}`;
const releasesDir = "build/releases";

function copyRecursive(src: string, dest: string) {
    const stats = statSync(src);

    if (stats.isDirectory()) {
        if (!existsSync(dest)) {
            mkdirSync(dest, { recursive: true });
        }

        const entries = readdirSync(src);
        for (const entry of entries) {
            copyRecursive(join(src, entry), join(dest, entry));
        }
    } else {
        copyFileSync(src, dest);
    }
}

async function createPackage() {
    console.log("📦 Creating distribution package...");

    // Ensure build exists
    if (!existsSync("build/openseadragon")) {
        console.error("❌ Build directory not found. Run 'bun run build' first.");
        process.exit(1);
    }

    // Clean and create package directory
    if (existsSync(packageDir)) {
        rmSync(packageDir, { recursive: true, force: true });
    }
    mkdirSync(packageDir, { recursive: true });

    // Copy built files
    console.log("  📋 Copying built files...");
    copyRecursive("build/openseadragon", packageDir);

    // Copy additional files
    console.log("  📋 Copying documentation...");
    copyFileSync("changelog.txt", join(packageDir, "changelog.txt"));
    copyFileSync("LICENSE.txt", join(packageDir, "LICENSE.txt"));

    // Create releases directory
    if (!existsSync(releasesDir)) {
        mkdirSync(releasesDir, { recursive: true });
    }

    // Create .tar.gz
    console.log("  🗜️  Creating .tar.gz archive...");
    const tarProc = Bun.spawn([
        "tar",
        "-czf",
        `${releasesDir}/${packageName}.tar.gz`,
        "-C",
        "build",
        packageName
    ], {
        stdout: "inherit",
        stderr: "inherit",
    });
    await tarProc.exited;

    // Create .zip
    console.log("  🗜️  Creating .zip archive...");
    const zipProc = Bun.spawn([
        "zip",
        "-r",
        "-q",
        `${releasesDir}/${packageName}.zip`,
        packageName
    ], {
        cwd: "build",
        stdout: "inherit",
        stderr: "inherit",
    });
    await zipProc.exited;

    // Clean up package directory
    console.log("  🧹 Cleaning up...");
    rmSync(packageDir, { recursive: true, force: true });

    console.log(`✅ Package created: ${releasesDir}/${packageName}.{tar.gz,zip}`);
}

createPackage();
