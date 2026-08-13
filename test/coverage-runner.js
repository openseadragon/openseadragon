#!/usr/bin/env node
'use strict';

/**
 * Coverage runner for OpenSeadragon
 *
 * Runs QUnit tests with nyc-instrumented sources in Puppeteer,
 * extracts window.__coverage__, and writes it to .nyc_output/.
 */

const fs = require('fs');
const path = require('path');

let puppeteer;
try {
    puppeteer = require('puppeteer');
} catch (e) {
    try {
        puppeteer = require('grunt-contrib-qunit/node_modules/puppeteer');
    } catch (e2) {
        console.error('ERROR: puppeteer not found.');
        console.error('Install it: npm install --save-dev puppeteer');
        process.exit(1);
    }
}

const BASE_URL = process.env.COVERAGE_BASE_URL || 'http://localhost:8000';
const MODULE = process.env.QUNIT_MODULE || '';
const NYC_OUTPUT_DIR = path.join(process.cwd(), '.nyc_output');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runCoverage() {
    const url = BASE_URL + '/test/coverage.html' +
        (MODULE ? '?module=' + encodeURIComponent(MODULE) : '');

    console.log('');
    console.log('========================================================');
    console.log('  OpenSeadragon Coverage Runner');
    console.log('========================================================');
    console.log('  URL:', url);
    console.log('');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--allow-file-access-from-files',
            '--use-gl=swiftshader',
            '--enable-webgl',
            '--ignore-gpu-blacklist',
            '--disable-dev-shm-usage'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768 });

    // Capture browser console for debugging
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (type === 'error') {
            console.error('  [browser error]', text);
        } else if (type === 'warn') {
            console.warn('  [browser warn]', text);
        }
    });

    page.on('pageerror', err => {
        console.error('  [page error]', err.message);
    });

    page.on('requestfailed', req => {
        const reqUrl = req.url();
        if (!reqUrl.includes('data:') && !reqUrl.includes('blob:')) {
            console.error('  [request failed]', reqUrl, req.failure().errorText);
        }
    });

    console.log('  Navigating to coverage page...');
    await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 300000
    });

    console.log('  Waiting for QUnit tests to complete...');

    // Wait for QUnit to finish
    await page.waitForFunction(() => window.__qunitDone === true, {
        timeout: 300000
    });

    console.log('  Tests complete, collecting coverage data...');
    await sleep(2000);

    // Extract coverage data AND test results
    const result = await page.evaluate(() => {
        const resultEl = document.getElementById('qunit-testresult');
        const resultText = resultEl ? resultEl.textContent : 'No results found';

        return {
            coverage: typeof window.__coverage__ !== 'undefined'
                ? window.__coverage__
                : null,
            resultText: resultText.trim()
        };
    });

    await browser.close();

    console.log('');
    console.log('========================================================');
    console.log('  Test Results');
    console.log('========================================================');
    console.log('  ' + result.resultText);
    console.log('');

    if (!result.coverage) {
        console.error('========================================================');
        console.error('  ERROR: No coverage data found!');
        console.error('  window.__coverage__ is undefined.');
        console.error('');
        console.error('  Make sure sources are instrumented:');
        console.error('    npx nyc instrument src instrumented/src');
        console.error('========================================================');
        process.exit(1);
    }

    const coverageKeys = Object.keys(result.coverage);
    console.log('  Coverage data collected for ' + coverageKeys.length + ' files.');

    if (!fs.existsSync(NYC_OUTPUT_DIR)) {
        fs.mkdirSync(NYC_OUTPUT_DIR, { recursive: true });
    }

    const coverageFile = path.join(NYC_OUTPUT_DIR, 'coverage.json');
    fs.writeFileSync(coverageFile, JSON.stringify(result.coverage));

    console.log('  Coverage data written to: ' + coverageFile);
    console.log('========================================================');
    console.log('');

    process.exit(0);
}

runCoverage().catch(err => {
    console.error('');
    console.error('========================================================');
    console.error('  FATAL: Coverage run failed!');
    console.error('  ' + err.message);
    console.error('  ' + err.stack);
    console.error('========================================================');
    process.exit(1);
});