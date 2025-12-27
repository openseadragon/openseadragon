#!/usr/bin/env bun
/**
 * Development server for OpenSeadragon
 * Replaces grunt-contrib-connect and watch
 */

import { watch } from "fs";
import { join } from "path";
import { readFileSync } from "fs";

const PORT = 8000;
let isBuilding = false;

// Simple debounce for file watching
function debounce(func: Function, wait: number) {
    let timeout: ReturnType<typeof setTimeout>;
    return function executedFunction(...args: any[]) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function rebuild() {
    if (isBuilding) {
        return;
    }

    isBuilding = true;
    console.log("\n🔄 Rebuilding...");

    try {
        const proc = Bun.spawn(["bun", "run", "scripts/build.ts"], {
            stdout: "inherit",
            stderr: "inherit",
        });

        await proc.exited;
        console.log("✅ Rebuild complete!\n");
    } catch (error) {
        console.error("❌ Build failed:", error);
    } finally {
        isBuilding = false;
    }
}

const debouncedRebuild = debounce(rebuild, 300);

// Setup file watcher
function setupWatcher() {
    console.log("👀 Watching for file changes...");

    const watchPaths = ["src", "images"];

    for (const path of watchPaths) {
        watch(path, { recursive: true }, (event, filename) => {
            if (filename && (filename.endsWith(".js") || filename.endsWith(".ts") ||
                filename.endsWith(".png") || filename.endsWith(".jpg") ||
                filename.endsWith(".gif") || filename.endsWith(".svg"))) {
                console.log(`📝 Changed: ${filename}`);
                debouncedRebuild();
            }
        });
    }
}

// Create the development server
const server = Bun.serve({
    port: PORT,
    async fetch(req) {
        const url = new URL(req.url);
        let path = url.pathname;

        // Default to index
        if (path === "/") {
            path = "/test/test.html";
        }

        // Remove leading slash
        const filePath = path.startsWith("/") ? path.slice(1) : path;

        try {
            const file = Bun.file(filePath);

            // Check if file exists
            if (await file.exists()) {
                return new Response(file);
            }

            // Return 404
            return new Response("Not Found", { status: 404 });
        } catch (error) {
            console.error("Error serving file:", error);
            return new Response("Internal Server Error", { status: 500 });
        }
    },
});

console.log(`
🚀 OpenSeadragon Development Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Server running at: http://localhost:${PORT}

Useful URLs:
  📄 Test Suite:     http://localhost:${PORT}/test/test.html
  🎨 Basic Demo:     http://localhost:${PORT}/test/demo/basic.html
  📊 Coverage:       http://localhost:${PORT}/test/coverage.html

Press Ctrl+C to stop
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

// Initial build
console.log("🔨 Running initial build...");
await rebuild();

// Setup file watching
setupWatcher();

// Keep the process running
process.on("SIGINT", () => {
    console.log("\n👋 Shutting down...");
    server.stop();
    process.exit(0);
});
