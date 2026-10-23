import { execSync } from "node:child_process";
import fs from "node:fs";
import { defineConfig } from "vite";
import istanbul from "vite-plugin-istanbul";
import pkg from "./package.json" with { type: "json" };

const outDir = "build/openseadragon";

function gitDescribe() {
    try {
        // Same format the Grunt build used: tag-since-hash, without git's "g" prefix.
        return execSync("git describe --tags --always --long --dirty", { encoding: "utf8" })
            .trim()
            .replace(/-g([0-9a-f]+)/, "-$1");
    } catch {
        return "unknown";
    }
}

const banner = [
    `//! ${pkg.name} ${pkg.version}`,
    `//! Built on ${new Date().toISOString().slice(0, 10)}`,
    `//! Git commit: ${gitDescribe()}`,
    "//! http://openseadragon.github.io",
    "//! License: http://openseadragon.github.io/license/",
    ""
].join("\n");

const copyImages = {
    name: "copy-images",
    closeBundle() {
        fs.cpSync("images", `${outDir}/images`, { recursive: true });
    }
};

export default defineConfig(({ mode }) => {
    const min = mode === "min";
    const coverage = mode === "coverage";
    return {
        publicDir: false,
        plugins: coverage ?
            [istanbul({ include: "src/*", forceBuildInstrument: true, requireEnv: false })] :
            [copyImages],
        build: {
            outDir: coverage ? "instrumented" : outDir,
            // The min build runs second and must keep the unminified files.
            emptyOutDir: !min,
            minify: min,
            // The source is linted to ES2015, so the minifier must not emit newer syntax such as ||=.
            target: "es2015",
            sourcemap: true,
            lib: {
                entry: "src/index.js",
                name: "OpenSeadragon",
                // An IIFE assigns a top-level var, which stays a global in every script-tag load.
                formats: ["iife"],
                fileName: () => (min ? "openseadragon.min.js" : "openseadragon.js")
            },
            rolldownOptions: {
                output: {
                    exports: "default",
                    postBanner: banner
                }
            }
        }
    };
});
