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
    
    // Vibrant color palette
    const colors = [
        '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
        '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe',
        '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000',
        '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080',
        '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
        '#dfe6e9', '#fd79a8', '#a29bfe', '#6c5ce7', '#00b894'
    ];

    const fileData = sourceFiles.map((f, i) => ({
        name: f.name,
        size: f.size,
        formattedSize: formatBytes(f.size),
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
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); 
            color: #eee; 
            padding: 20px;
            min-height: 100vh;
        }
        h1 { text-align: center; margin-bottom: 10px; color: #fff; font-size: 2.2em; }
        .subtitle { text-align: center; color: #888; margin-bottom: 30px; font-size: 1.1em; }
        .summary { 
            display: flex; 
            justify-content: center; 
            gap: 20px; 
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        .stat { 
            background: linear-gradient(145deg, #1e2a4a, #16213e);
            padding: 20px 30px; 
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.1);
        }
        .stat-value { font-size: 1.8em; font-weight: bold; color: #4ecdc4; }
        .stat-label { color: #888; margin-top: 5px; font-size: 0.9em; }
        .container { 
            display: flex; 
            gap: 30px; 
            max-width: 1600px; 
            margin: 0 auto;
            flex-wrap: wrap;
        }
        .treemap-container { 
            flex: 2; 
            min-width: 400px;
            background: linear-gradient(145deg, #1e2a4a, #16213e);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        .treemap-title { margin-bottom: 15px; color: #fff; font-size: 1.2em; }
        .treemap {
            display: flex;
            flex-wrap: wrap;
            gap: 3px;
            align-content: flex-start;
            min-height: 500px;
        }
        .treemap-item {
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            overflow: hidden;
            padding: 8px;
            position: relative;
        }
        .treemap-item:hover {
            transform: scale(1.03);
            box-shadow: 0 8px 25px rgba(0,0,0,0.4);
            z-index: 10;
        }
        .treemap-item span {
            font-size: 11px;
            font-weight: 600;
            color: rgba(0,0,0,0.8);
            text-shadow: 0 1px 2px rgba(255,255,255,0.3);
            word-break: break-word;
            line-height: 1.3;
        }
        .treemap-item.dark-text span {
            color: rgba(0,0,0,0.85);
        }
        .treemap-item.light-text span {
            color: rgba(255,255,255,0.95);
            text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
        .file-list { 
            flex: 1; 
            min-width: 320px;
            background: linear-gradient(145deg, #1e2a4a, #16213e);
            border-radius: 12px;
            padding: 20px;
            max-height: 700px;
            overflow-y: auto;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        .file-list h3 { margin-bottom: 15px; color: #fff; font-size: 1.2em; }
        .file-item {
            display: flex;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            transition: background 0.2s;
        }
        .file-item:hover {
            background: rgba(255,255,255,0.03);
        }
        .file-item:last-child { border-bottom: none; }
        .file-color {
            width: 14px;
            height: 14px;
            border-radius: 4px;
            margin-right: 12px;
            flex-shrink: 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .file-name { flex: 1; font-size: 13px; color: #ddd; }
        .file-size { 
            font-size: 12px; 
            color: #888; 
            margin-left: 10px;
            min-width: 70px;
            text-align: right;
        }
        .file-percent {
            font-size: 12px;
            color: #4ecdc4;
            font-weight: 600;
            width: 55px;
            text-align: right;
        }
        .bar-container {
            width: 80px;
            height: 8px;
            background: rgba(255,255,255,0.1);
            border-radius: 4px;
            margin-left: 12px;
            overflow: hidden;
        }
        .bar { 
            height: 100%; 
            border-radius: 4px;
            transition: width 0.3s ease;
        }
        footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 12px;
        }
        .tooltip {
            position: fixed;
            background: rgba(0,0,0,0.9);
            color: #fff;
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 13px;
            pointer-events: none;
            z-index: 1000;
            display: none;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
    </style>
</head>
<body>
    <h1>📦 OpenSeadragon Bundle Analysis</h1>
    <p class="subtitle">Interactive visualization of source file contributions to the bundle</p>
    
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
            <div class="stat-label">Total Source</div>
        </div>
    </div>

    <div class="container">
        <div class="treemap-container">
            <h3 class="treemap-title">📊 Bundle Composition Treemap</h3>
            <div class="treemap" id="treemap"></div>
        </div>
        
        <div class="file-list">
            <h3>📁 Files by Size</h3>
            ${fileData.map(f => `
                <div class="file-item">
                    <div class="file-color" style="background: ${f.color}"></div>
                    <div class="file-name">${f.name}</div>
                    <div class="file-size">${f.formattedSize}</div>
                    <div class="file-percent">${f.percentage}%</div>
                    <div class="bar-container">
                        <div class="bar" style="width: ${f.percentage}%; background: ${f.color}"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>

    <footer>
        Generated on ${new Date().toLocaleString()} • OpenSeadragon Bundle Analyzer
    </footer>

    <div class="tooltip" id="tooltip"></div>

    <script>
        const files = ${JSON.stringify(fileData)};
        const totalSize = ${totalSourceSize};
        const treemap = document.getElementById('treemap');
        const tooltip = document.getElementById('tooltip');
        
        // Calculate treemap layout
        const containerWidth = treemap.offsetWidth || 800;
        const containerHeight = 500;
        const totalArea = containerWidth * containerHeight;
        
        // Determine if color needs light or dark text
        function needsLightText(hexColor) {
            const r = parseInt(hexColor.slice(1, 3), 16);
            const g = parseInt(hexColor.slice(3, 5), 16);
            const b = parseInt(hexColor.slice(5, 7), 16);
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            return luminance < 0.5;
        }

        files.forEach((file, i) => {
            const proportion = file.size / totalSize;
            const area = proportion * totalArea;
            
            // Calculate dimensions maintaining reasonable aspect ratio
            let width = Math.sqrt(area * 1.6);
            let height = area / width;
            
            // Minimum sizes
            width = Math.max(60, Math.min(width, containerWidth * 0.95));
            height = Math.max(35, height);
            
            const div = document.createElement('div');
            div.className = 'treemap-item ' + (needsLightText(file.color) ? 'light-text' : 'dark-text');
            div.style.width = width + 'px';
            div.style.height = height + 'px';
            div.style.background = file.color;
            
            const label = file.name.replace('.js', '');
            div.innerHTML = '<span>' + label + '<br>' + file.percentage + '%</span>';
            
            div.addEventListener('mouseenter', (e) => {
                tooltip.style.display = 'block';
                tooltip.innerHTML = '<strong>' + file.name + '</strong><br>' + 
                    file.formattedSize + ' (' + file.percentage + '%)';
            });
            
            div.addEventListener('mousemove', (e) => {
                tooltip.style.left = (e.clientX + 15) + 'px';
                tooltip.style.top = (e.clientY + 15) + 'px';
            });
            
            div.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });
            
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
    console.log('   Minified: ' + formatBytes(bundleSize));
    console.log('   Gzipped:  ' + formatBytes(bundleGzipSize) + '\n');

    console.log('📁 Top 10 Source Files by Size:');
    sourceFiles.slice(0, 10).forEach((f, i) => {
        const percent = ((f.size / sourceFiles.reduce((s, x) => s + x.size, 0)) * 100).toFixed(1);
        console.log('   ' + (i + 1).toString().padStart(2) + '. ' + f.name.padEnd(25) + formatBytes(f.size).padStart(10) + ' (' + percent + '%)');
    });

    const html = generateHTML(sourceFiles, bundleSize, bundleGzipSize);
    fs.writeFileSync(OUTPUT_FILE, html);

    console.log('\n✅ Visualization saved to: bundle-analysis.html');
    console.log('   Open it in a browser to see the interactive treemap.\n');
}

main();
