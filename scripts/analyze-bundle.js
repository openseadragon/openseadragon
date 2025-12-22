#!/usr/bin/env node
/**
 * Bundle Size Analyzer
 * Generates an interactive HTML visualization of OpenSeadragon's bundle composition.
 * 
 * Usage: node scripts/analyze-bundle.js
 * Output: bundle-analysis.html
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SRC_DIR = path.join(__dirname, '..', 'src');
const BUILD_FILE = path.join(__dirname, '..', 'build', 'openseadragon', 'openseadragon.min.js');
const OUTPUT_FILE = path.join(__dirname, '..', 'bundle-analysis.html');

function getFileSize(filePath) {
    return fs.statSync(filePath).size;
}

function getGzipSize(filePath) {
    const content = fs.readFileSync(filePath);
    return zlib.gzipSync(content).length;
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function analyzeSourceFiles() {
    const files = fs.readdirSync(SRC_DIR)
        .filter(f => f.endsWith('.js'))
        .map(f => {
            const filePath = path.join(SRC_DIR, f);
            const size = getFileSize(filePath);
            return { name: f, size, path: filePath };
        })
        .sort((a, b) => b.size - a.size);
    
    return files;
}

function generateHTML(sourceFiles, bundleSize, bundleGzipSize) {
    const totalSourceSize = sourceFiles.reduce((sum, f) => sum + f.size, 0);
    const colors = [
        '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f',
        '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab',
        '#8cd17d', '#b6992d', '#499894', '#d37295', '#a0cbe8'
    ];

    const fileData = sourceFiles.map((f, i) => ({
        name: f.name,
        size: f.size,
        percentage: ((f.size / totalSourceSize) * 100).toFixed(1),
        color: colors[i % colors.length]
    }));

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpenSeadragon Bundle Analysis</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #1a1a2e; 
            color: #eee; 
            padding: 20px;
            min-height: 100vh;
        }
        h1 { text-align: center; margin-bottom: 10px; color: #fff; }
        .subtitle { text-align: center; color: #888; margin-bottom: 30px; }
        .summary { 
            display: flex; 
            justify-content: center; 
            gap: 40px; 
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        .stat { 
            background: #16213e; 
            padding: 20px 30px; 
            border-radius: 10px;
            text-align: center;
        }
        .stat-value { font-size: 2em; font-weight: bold; color: #4e79a7; }
        .stat-label { color: #888; margin-top: 5px; }
        .container { 
            display: flex; 
            gap: 30px; 
            max-width: 1400px; 
            margin: 0 auto;
            flex-wrap: wrap;
        }
        .treemap-container { 
            flex: 2; 
            min-width: 300px;
            background: #16213e;
            border-radius: 10px;
            padding: 20px;
        }
        .treemap {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            align-content: flex-start;
        }
        .treemap-item {
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            border-radius: 4px;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            overflow: hidden;
            padding: 4px;
        }
        .treemap-item:hover {
            transform: scale(1.02);
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10;
        }
        .treemap-item span {
            font-size: 11px;
            font-weight: 500;
            text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            word-break: break-word;
        }
        .file-list { 
            flex: 1; 
            min-width: 280px;
            background: #16213e;
            border-radius: 10px;
            padding: 20px;
            max-height: 600px;
            overflow-y: auto;
        }
        .file-list h3 { margin-bottom: 15px; color: #fff; }
        .file-item {
            display: flex;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #2a2a4e;
        }
        .file-item:last-child { border-bottom: none; }
        .file-color {
            width: 12px;
            height: 12px;
            border-radius: 3px;
            margin-right: 10px;
            flex-shrink: 0;
        }
        .file-name { flex: 1; font-size: 13px; }
        .file-size { 
            font-size: 12px; 
            color: #888; 
            margin-left: 10px;
            text-align: right;
        }
        .file-percent {
            font-size: 12px;
            color: #4e79a7;
            width: 50px;
            text-align: right;
        }
        .bar-container {
            width: 60px;
            height: 6px;
            background: #2a2a4e;
            border-radius: 3px;
            margin-left: 10px;
            overflow: hidden;
        }
        .bar { height: 100%; border-radius: 3px; }
        footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <h1>📦 OpenSeadragon Bundle Analysis</h1>
    <p class="subtitle">Interactive visualization of source file contributions</p>
    
    <div class="summary">
        <div class="stat">
            <div class="stat-value">${formatBytes(bundleSize)}</div>
            <div class="stat-label">Minified Size</div>
        </div>
        <div class="stat">
            <div class="stat-value">${formatBytes(bundleGzipSize)}</div>
            <div class="stat-label">Gzipped Size</div>
        </div>
        <div class="stat">
            <div class="stat-value">${sourceFiles.length}</div>
            <div class="stat-label">Source Files</div>
        </div>
        <div class="stat">
            <div class="stat-value">${formatBytes(totalSourceSize)}</div>
            <div class="stat-label">Total Source Size</div>
        </div>
    </div>

    <div class="container">
        <div class="treemap-container">
            <h3 style="margin-bottom: 15px; color: #fff;">Treemap Visualization</h3>
            <div class="treemap" id="treemap"></div>
        </div>
        
        <div class="file-list">
            <h3>Files by Size</h3>
            ${fileData.map(f => `
                <div class="file-item">
                    <div class="file-color" style="background: ${f.color}"></div>
                    <div class="file-name">${f.name}</div>
                    <div class="file-size">${formatBytes(f.size)}</div>
                    <div class="file-percent">${f.percentage}%</div>
                    <div class="bar-container">
                        <div class="bar" style="width: ${f.percentage}%; background: ${f.color}"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>

    <footer>
        Generated on ${new Date().toLocaleString()} | OpenSeadragon Bundle Analyzer
    </footer>

    <script>
        const files = ${JSON.stringify(fileData)};
        const totalSize = ${totalSourceSize};
        const treemap = document.getElementById('treemap');
        const containerWidth = treemap.offsetWidth || 800;
        const containerHeight = 500;
        
        // Simple treemap layout
        let x = 0, y = 0, rowHeight = 0, rowWidth = 0;
        const items = [];
        
        files.forEach((file, i) => {
            const area = (file.size / totalSize) * containerWidth * containerHeight;
            const width = Math.max(60, Math.sqrt(area * 1.5));
            const height = Math.max(40, area / width);
            
            items.push({
                ...file,
                width: Math.min(width, containerWidth),
                height: height
            });
        });

        items.forEach(file => {
            const div = document.createElement('div');
            div.className = 'treemap-item';
            div.style.width = file.width + 'px';
            div.style.height = file.height + 'px';
            div.style.background = file.color;
            div.innerHTML = '<span>' + file.name.replace('.js', '') + '<br>' + file.percentage + '%</span>';
            div.title = file.name + '\\n' + '${formatBytes(1).split(' ')[1] === 'B' ? '' : ''}' + Math.round(file.size/1024) + ' KB (' + file.percentage + '%)';
            treemap.appendChild(div);
        });
    </script>
</body>
</html>`;
}

function main() {
    console.log('🔍 Analyzing OpenSeadragon bundle...\n');

    if (!fs.existsSync(BUILD_FILE)) {
        console.error('❌ Build file not found. Run "npm run build" first.');
        process.exit(1);
    }

    const sourceFiles = analyzeSourceFiles();
    const bundleSize = getFileSize(BUILD_FILE);
    const bundleGzipSize = getGzipSize(BUILD_FILE);

    console.log('📊 Bundle Summary:');
    console.log(`   Minified: ${formatBytes(bundleSize)}`);
    console.log(`   Gzipped:  ${formatBytes(bundleGzipSize)}\n`);

    console.log('📁 Top 10 Source Files by Size:');
    sourceFiles.slice(0, 10).forEach((f, i) => {
        const percent = ((f.size / sourceFiles.reduce((s, x) => s + x.size, 0)) * 100).toFixed(1);
        console.log(`   ${(i + 1).toString().padStart(2)}. ${f.name.padEnd(25)} ${formatBytes(f.size).padStart(10)} (${percent}%)`);
    });

    const html = generateHTML(sourceFiles, bundleSize, bundleGzipSize);
    fs.writeFileSync(OUTPUT_FILE, html);

    console.log(`\n✅ Visualization saved to: bundle-analysis.html`);
    console.log('   Open it in a browser to see the interactive treemap.\n');
}

main();
