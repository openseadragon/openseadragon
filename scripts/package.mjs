#!/usr/bin/env node
/**
 * Builds the release .zip and .tar.gz into build/releases/ from an existing
 * build. With --publish, also copies the build into ../site-build and bumps
 * its bower.json version (site-build must be cloned next to this repo).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import pkg from "../package.json" with { type: "json" };

const dirName = `openseadragon-bin-${pkg.version}`;
const packageDir = `build/${dirName}`;
const releaseRoot = "../site-build/built-openseadragon";

console.log(`Packaging ${dirName}...`);
fs.rmSync(packageDir, { recursive: true, force: true });
fs.cpSync("build/openseadragon", packageDir, { recursive: true });
fs.copyFileSync("changelog.txt", `${packageDir}/changelog.txt`);
fs.copyFileSync("LICENSE.txt", `${packageDir}/LICENSE.txt`);

fs.mkdirSync("build/releases", { recursive: true });
// zip adds to an existing archive, which would keep files removed since the last run.
fs.rmSync(`build/releases/${dirName}.zip`, { force: true });
execFileSync("zip", ["-qr9", `releases/${dirName}.zip`, dirName], { cwd: "build" });
execFileSync("tar", ["-czf", `releases/${dirName}.tar.gz`, dirName], { cwd: "build" });
fs.rmSync(packageDir, { recursive: true });
console.log(`Wrote build/releases/${dirName}.{zip,tar.gz}`);

if (process.argv.includes("--publish")) {
    if (!fs.existsSync("../site-build")) {
        console.error("Publishing needs the site-build repository cloned next to this one, as ../site-build");
        process.exit(1);
    }
    console.log(`Publishing to ${releaseRoot}...`);
    fs.rmSync(releaseRoot, { recursive: true, force: true });
    fs.cpSync("build", releaseRoot, {
        recursive: true,
        filter: (src) => src !== "build/releases"
    });

    const bowerPath = "../site-build/bower.json";
    const bower = JSON.parse(fs.readFileSync(bowerPath, "utf8"));
    bower.version = pkg.version;
    fs.writeFileSync(bowerPath, `${JSON.stringify(bower, null, 2)}\n`);
    console.log("Updated site-build/bower.json");
}
