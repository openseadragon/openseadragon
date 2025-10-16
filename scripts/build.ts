#!/usr/bin/env bun
/**
 * Build script for OpenSeadragon
 * Replaces Grunt's concat, uglify, and build tasks
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { join } from "path";

const packageJson = JSON.parse(readFileSync("package.json", "utf-8"));

// Source files in the correct order (from Gruntfile.js)
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

interface BuildOptions {
    minify?: boolean;
    clean?: boolean;
}

async function getGitInfo(): Promise<string> {
    try {
        const proc = Bun.spawn(["git", "describe", "--always", "--dirty"], {
            stdout: "pipe",
        });
        const output = await new Response(proc.stdout).text();
        return output.trim() || "unknown";
    } catch {
        return "unknown";
    }
}

function createBanner(gitInfo: string): string {
    const date = new Date().toISOString().split("T")[0];
    return `//! ${packageJson.name} ${packageJson.version}
//! Built on ${date}
//! Git commit: ${gitInfo}
//! http://openseadragon.github.io
//! License: http://openseadragon.github.io/license/

`;
}

async function copyImages() {
    console.log("📦 Copying image files...");
    const targetDir = "build/openseadragon/images";

    if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
    }

    // Copy all files from images directory (cross-platform)
    const { readdirSync, copyFileSync } = await import("fs");
    const { join } = await import("path");

    const sourceDir = "images";
    const files = readdirSync(sourceDir);

    for (const file of files) {
        const sourcePath = join(sourceDir, file);
        const targetPath = join(targetDir, file);
        copyFileSync(sourcePath, targetPath);
    }
}

async function buildBundle(options: BuildOptions = {}) {
    const { minify = false, clean = false } = options;

    if (clean && existsSync("build")) {
        console.log("🧹 Cleaning build directory...");
        rmSync("build", { recursive: true, force: true });
    }

    const gitInfo = await getGitInfo();
    const banner = createBanner(gitInfo);

    console.log(`🔨 Building OpenSeadragon ${packageJson.version}...`);
    console.log(`   Git: ${gitInfo}`);

    // Ensure build directory exists
    mkdirSync("build/openseadragon", { recursive: true });

    // Read and concatenate all source files
    console.log(`📝 Concatenating ${sources.length} source files...`);
    let concatenated = "";
    for (const source of sources) {
        const content = readFileSync(source, "utf-8");
        concatenated += content + "\n";
    }

    // Replace template variables (Grunt used to do this)
    const versionParts = packageJson.version.split('.');
    const versionStr = packageJson.version;
    const major = versionParts[0] || '0';
    const minor = versionParts[1] || '0';
    const revision = versionParts[2] || '0';

    concatenated = concatenated
        .replace(/<%= pkg\.name %>/g, packageJson.name)
        .replace(/<%= pkg\.version %>/g, packageJson.version)
        .replace(/<%= osdVersion\.versionStr %>/g, versionStr)
        .replace(/<%= osdVersion\.major %>/g, major)
        .replace(/<%= osdVersion\.minor %>/g, minor)
        .replace(/<%= osdVersion\.revision %>/g, revision);

    // Write unminified version with banner
    const outputPath = "build/openseadragon/openseadragon.js";
    writeFileSync(outputPath, banner + concatenated);
    console.log(`✅ Created: ${outputPath}`);

    // Create minified version if requested
    if (minify) {
        console.log("⚡ Creating minified version...");

        // Use Terser to minify while preserving the UMD wrapper
        const { minify: terserMinify } = await import("terser");
        const result = await terserMinify(concatenated, {
            sourceMap: {
                filename: "openseadragon.min.js",
                url: "openseadragon.min.js.map",
            },
            compress: {
                dead_code: true,
                drop_debugger: true,
                conditionals: true,
                evaluate: true,
                booleans: true,
                loops: true,
                unused: true,
                hoist_funs: true,
                keep_fargs: false,
                hoist_vars: false,
                if_return: true,
                join_vars: true,
                side_effects: true,
            },
            mangle: {
                reserved: ["OpenSeadragon"],  // Don't mangle the main export
            },
        });

        if (result.code) {
            const minPath = "build/openseadragon/openseadragon.min.js";
            const mapPath = "build/openseadragon/openseadragon.min.js.map";
            writeFileSync(minPath, banner + result.code);
            if (result.map) {
                writeFileSync(mapPath, typeof result.map === 'string' ? result.map : JSON.stringify(result.map));
            }
            console.log(`✅ Created: ${minPath}`);
        } else {
            console.error("❌ Minification failed");
            process.exit(1);
        }
    }

    // Copy images
    await copyImages();

    console.log("✨ Build complete!");
}

// Parse command line arguments
const args = Bun.argv.slice(2);
const options: BuildOptions = {
    minify: args.includes("--minify") || args.includes("--min"),
    clean: args.includes("--clean"),
};

// Run build
await buildBundle(options);
