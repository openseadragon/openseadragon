#!/usr/bin/env node
/**
 * Rebuilds build/openseadragon/ on every change to src/ or images/ and serves the repo
 * root on http://localhost:8000, so test/test.html and test/demo/ pages load
 * the current build. The root URL lists the test page and every demo, and
 * open pages reload after each rebuild.
 */
import { existsSync, readdirSync } from "node:fs";
import { build, createServer } from "vite";

const watch = { include: ["src/**", "images/**"] };

// Built per request so new demos show up without a restart. Links are labelled by file
// name because many demo <title>s are copied from basic.html.
function indexPage() {
    const demos = readdirSync("test/demo", { withFileTypes: true }).flatMap((entry) => {
        if (entry.isFile() && entry.name.endsWith(".html")) {
            return [[entry.name.slice(0, -5), `test/demo/${entry.name}`]];
        }
        const index = `test/demo/${entry.name}/index.html`;
        return entry.isDirectory() && existsSync(index) ? [[`${entry.name}/`, index]] : [];
    }).sort(([a], [b]) => a.localeCompare(b));
    const links = demos.map(([name, path]) => `<li><a href="/${path}">${name}</a></li>`);
    return `<!doctype html><meta charset="utf-8"><title>OpenSeadragon dev</title>
<style>
    body { font: 15px/1.5 system-ui, sans-serif; margin: 2rem auto; max-width: 60rem; padding: 0 1rem; }
    h1 { font-size: 1.4rem; margin: 0 0 0.25rem; }
    p { color: #666; margin: 0 0 1.5rem; }
    ul { columns: 15rem; list-style: none; margin: 0; padding: 0; }
    li { break-inside: avoid; padding: 0.1rem 0; }
    a { color: #0b57d0; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .tests { font-size: 1.1rem; font-weight: 600; }
    h2 { font-size: 1rem; }
</style>
<h1>OpenSeadragon dev</h1>
<p>Pages reload after each rebuild of src/.</p>
<p><a class="tests" href="/test/test.html">Run the QUnit tests</a></p>
<h2>Demos (${demos.length})</h2>
<ul>${links.join("")}</ul>`;
}

let server;

// One watcher, with the min build run after each rebuild, so the two never clear each other's
// output and pages reload only once both files are written.
console.log("Starting watch build...");
const watcher = await build({ mode: "production", build: { watch, emptyOutDir: false } });
watcher.on("event", async (event) => {
    if (event.code !== "END") {
        return;
    }
    await build({ mode: "min", logLevel: "warn" });
    server?.ws.send({ type: "full-reload" });
});

server = await createServer({
    configFile: false,
    logLevel: "error",
    server: { port: 8000, strictPort: true, open: "/" },
    // The pages are demos, not an app, so don't scan them for dependencies to pre-bundle.
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [{
        name: "dev-pages",
        configureServer(devServer) {
            devServer.middlewares.use((req, res, next) => {
                if (req.url !== "/") {
                    next();
                    return;
                }
                res.setHeader("Content-Type", "text/html");
                devServer.transformIndexHtml("/", indexPage()).then((html) => res.end(html), next);
            });
        }
    }]
});
await server.listen();
server.printUrls();
