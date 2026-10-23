#!/usr/bin/env node
/**
 * Rebuilds build/openseadragon/ on every change to src/ and serves the repo
 * root on http://localhost:8000, so test/test.html and test/demo/ pages load
 * the current build.
 */
import { build, preview } from "vite";

const watch = { include: ["src/**", "images/**"] };

console.log("Starting watch builds...");
await build({ mode: "production", build: { watch } });
await build({ mode: "min", build: { watch } });

const server = await preview({
    configFile: false,
    logLevel: "error",
    build: { outDir: "." },
    preview: { port: 8000, strictPort: true }
});
server.printUrls();
console.log("Open http://localhost:8000/test/demo/basic.html or /test/test.html");
