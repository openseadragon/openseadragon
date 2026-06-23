/* eslint-env node */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.resolve(__dirname, '..');
const packageJson = require(path.join(root, 'package.json'));
const checks = packageJson.bundlesize || [];

function parseMaxSize(size) {
    const match = /^(\d+(?:\.\d+)?)\s*(b|kb|mb)$/i.exec(size);

    if (!match) {
        throw new Error(`Unsupported maxSize value: ${size}`);
    }

    const amount = Number(match[1]);
    if (!Number.isFinite(amount)) {
        throw new Error(`Unsupported maxSize value: ${size}`);
    }

    const unit = match[2].toLowerCase();
    const multipliers = {
        b: 1,
        kb: 1000,
        mb: 1000 * 1000
    };

    return amount * multipliers[unit];
}

function formatSize(bytes) {
    if (bytes < 1000) {
        return `${bytes}B`;
    }

    return `${(bytes / 1000).toFixed(2)}kB`;
}

function getSize(filePath, compression) {
    const file = fs.readFileSync(filePath);

    if (compression === 'gzip') {
        return zlib.gzipSync(file).length;
    }

    if (compression === 'none') {
        return file.length;
    }

    throw new Error(`Unsupported compression value: ${compression}`);
}

let failed = false;

for (const check of checks) {
    const filePath = path.join(root, check.path);
    const maxSize = parseMaxSize(check.maxSize);
    const compression = check.compression || 'gzip';

    if (!fs.existsSync(filePath)) {
        console.error(`FAIL ${check.path}: file does not exist`);
        failed = true;
        continue;
    }

    const size = getSize(filePath, compression);
    const passed = size <= maxSize;
    const status = passed ? 'PASS' : 'FAIL';
    const comparator = passed ? '<' : '>';

    console.log(
        `${status} ${check.path}: ${formatSize(size)} ${comparator} maxSize ${check.maxSize.replace(/\s+/g, '')} (${compression})`
    );

    failed = failed || !passed;
}

process.exitCode = failed ? 1 : 0;
