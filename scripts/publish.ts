#!/usr/bin/env bun
/**
 * Publish script for OpenSeadragon
 * Publishes built files to the site-build repository
 *
 * This assumes you have the site-build repository cloned next to this repository:
 *   parent-folder/
 *     openseadragon/        (this repo)
 *     site-build/           (openseadragon.github.io repo)
 */

import { existsSync, rmSync, mkdirSync, copyFileSync, readdirSync, statSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";

const packageJson = JSON.parse(readFileSync("package.json", "utf-8"));
const releaseRoot = "../site-build/built-openseadragon/";

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
        // Ensure parent directory exists
        const parentDir = dirname(dest);
        if (!existsSync(parentDir)) {
            mkdirSync(parentDir, { recursive: true });
        }
        copyFileSync(src, dest);
    }
}

async function publish() {
    console.log("🚀 Publishing to site-build repository...\n");

    // Check if site-build exists
    if (!existsSync("../site-build")) {
        console.error("❌ Error: site-build repository not found.");
        console.error("   Expected location: ../site-build");
        console.error("   Please clone the site-build repository next to this repository:");
        console.error("   git clone https://github.com/openseadragon/openseadragon.github.io.git ../site-build");
        process.exit(1);
    }

    // Check if build exists
    if (!existsSync("build/openseadragon")) {
        console.error("❌ Error: Build directory not found. Running build first...");
        const proc = Bun.spawn(["bun", "run", "package"], {
            stdout: "inherit",
            stderr: "inherit",
        });
        await proc.exited;
    }

    // Clean the release folder
    console.log("🧹 Cleaning release folder...");
    if (existsSync(releaseRoot)) {
        rmSync(releaseRoot, { recursive: true, force: true });
    }
    mkdirSync(releaseRoot, { recursive: true });

    // Copy built files (excluding releases folder)
    console.log("📋 Copying built files...");
    const entries = readdirSync("build");
    for (const entry of entries) {
        if (entry === "releases") {
            continue; // Skip the releases folder
        }
        copyRecursive(join("build", entry), join(releaseRoot, entry));
    }

    // Copy release archives
    if (existsSync("build/releases")) {
        console.log("📋 Copying release archives...");
        copyRecursive("build/releases", releaseRoot);
    }

    // Update bower.json
    console.log("📝 Updating bower.json...");
    const bowerPath = "../site-build/bower.json";
    if (existsSync(bowerPath)) {
        const bowerData = JSON.parse(readFileSync(bowerPath, "utf-8"));
        bowerData.version = packageJson.version;
        writeFileSync(bowerPath, JSON.stringify(bowerData, null, 2) + "\n");
        console.log(`   Updated version to ${packageJson.version}`);
    } else {
        console.log("   ⚠️  bower.json not found, skipping...");
    }

    console.log(`
✅ Publish complete!

Files have been copied to: ${releaseRoot}

Next steps:
1. cd ../site-build
2. Review the changes: git status
3. Commit the changes: git add . && git commit -m "Update OpenSeadragon to ${packageJson.version}"
4. Push to GitHub: git push
`);
}

// Run the publish
publish();
