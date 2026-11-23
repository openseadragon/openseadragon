/* global OpenSeadragon */
(function () {
    'use strict';

    const { PRESETS, CONNECTIONS, SimBackend, mulberry32, percentile, mean, fmt, download, stamp, csvCell } =
        window.SimNetwork;
    const TILE_SIZE = 256;
    const IMAGE_SIZE = 65536;

    // ------------------------------------------------------------------------------------------------------
    // Synthetic tile source: every tile is rasterized locally, its "download" goes through the SimBackend.
    // ------------------------------------------------------------------------------------------------------
    function makeTileSource(backend, origin) {
        return window.SimNetwork.makeTileSource(backend, origin, { size: IMAGE_SIZE, tileSize: TILE_SIZE });
    }

    // ------------------------------------------------------------------------------------------------------
    // One side of the comparison.
    // ------------------------------------------------------------------------------------------------------
    class Run {
        constructor(elementId, label, backendCfg, viewerOptions, origin) {
            this.label = label;
            this.origin = origin;
            this.backend = new SimBackend(backendCfg);
            this.source = makeTileSource(this.backend, origin);
            this.tilesLoaded = 0;
            this.tilesFailed = 0;
            // Cache keys of every tile that made it to the screen at least once. Sampled from the image's
            // last drawn list each frame, because the WebGL drawer raises no tile-drawn event.
            this.drawnKeys = new Set();
            this.hops = [];         // { index, start, coverMs|null, interrupted }
            this.current = null;
            this.viewer = OpenSeadragon(Object.assign({
                id: elementId,
                prefixUrl: '../../build/openseadragon/images/',
                tileSources: this.source,
                showNavigator: false,
                showNavigationControl: false,
                animationTime: 0.8,
                springStiffness: 6.5,
                timeout: 120000,
                imageLoaderLimit: 0,
                maxTilesPerFrame: 1
            }, viewerOptions));
            this.viewer.addHandler('tile-loaded', () => { this.tilesLoaded++; });
            this.viewer.addHandler('tile-load-failed', () => { this.tilesFailed++; });
        }

        get image() {
            return this.viewer.world.getItemAt(0);
        }

        hop(index, zoom, center, immediately) {
            this.finishHop(true);
            this.current = {
                index: index, zoom: zoom, center: { x: center.x, y: center.y }, immediately: immediately,
                start: performance.now(), settledAt: null, coverMs: null, interrupted: false, sawIncomplete: false,
                tilesDeliveredBefore: this.backend.stats.delivered
            };
            this.hops.push(this.current);
            this.viewer.viewport.zoomTo(zoom, null, immediately);
            this.viewer.viewport.panTo(center, immediately);
        }

        // Called every frame: a hop is covered once the springs have settled and the image reports itself
        // fully loaded for the settled view.
        tick() {
            const image = this.image;
            if (image && image._lastDrawn) {
                for (const info of image._lastDrawn) {
                    this.drawnKeys.add(info.tile.cacheKey);
                }
            }
            const hop = this.current;
            if (!hop || !image) {
                return;
            }
            const vp = this.viewer.viewport;
            const settled = vp.getZoom(true) === vp.getZoom(false) &&
                vp.getCenter(true).equals(vp.getCenter(false));
            if (settled && hop.settledAt === null) {
                hop.settledAt = performance.now();
            }
            const loaded = image.getFullyLoaded();
            if (!settled || !loaded) {
                hop.sawIncomplete = true;
                return;
            }
            if (hop.sawIncomplete || performance.now() - hop.start > 50) {
                hop.coverMs = performance.now() - hop.start;
                hop.tilesDeliveredAfter = this.backend.stats.delivered;
                this.current = null;
            }
        }

        finishHop(interrupted) {
            if (this.current && this.current.coverMs === null) {
                this.current.interrupted = interrupted;
                this.current.elapsed = performance.now() - this.current.start;
                this.current.tilesDeliveredAfter = this.backend.stats.delivered;
                this.current = null;
            }
        }

        destroy() {
            this.backend.stop();
            this.viewer.destroy();
        }
    }

    // ------------------------------------------------------------------------------------------------------
    // Seeded navigation script shared by both runs.
    // ------------------------------------------------------------------------------------------------------
    function makeHops(count, rand, opts, viewport) {
        const home = viewport.getHomeZoom();
        const max = viewport.getMaxZoom();
        const hops = [];
        for (let i = 0; i < count; i++) {
            const t = rand();
            // Log-uniform zoom, biased a little toward deep levels where most tiles live.
            const zoom = home * Math.pow(max / home, 0.3 + 0.7 * t);
            hops.push({
                zoom: zoom,
                center: new OpenSeadragon.Point(0.05 + rand() * 0.9, 0.05 + rand() * 0.9),
                immediately: rand() < opts.immediate,
                delay: opts.intervalMin + rand() * (opts.intervalMax - opts.intervalMin)
            });
        }
        return hops;
    }

    // ------------------------------------------------------------------------------------------------------
    // Statistics
    // ------------------------------------------------------------------------------------------------------
    // Every metric states which direction wins, so the highlight never has to guess from the label.
    // 'lower' / 'higher' pick a winner, 'info' rows are never highlighted.
    const lower = (value, digits) => ({ value: value, better: 'lower', digits: digits || 0 });
    const higher = (value, digits) => ({ value: value, better: 'higher', digits: digits || 0 });
    const info = (value, digits) => ({ value: value, better: null, digits: digits || 0 });

    // Time from the animation settling to the view being complete: the part of "time to cover" that the
    // network is responsible for. Zero when everything arrived during the animation.
    function coverAfterSettle(hop) {
        return Math.max(0, hop.coverMs - (hop.settledAt - hop.start));
    }

    function collect(run) {
        const s = run.backend.stats;
        const coveredHops = run.hops.filter(h => h.coverMs !== null);
        const covered = coveredHops.map(h => h.coverMs);
        const afterSettle = coveredHops.filter(h => h.settledAt !== null).map(coverAfterSettle);
        const image = run.image;
        const origin = run.origin;
        const scheduler = OpenSeadragon.tileLoadScheduler;
        const scheduled = image && image.serverProtocol;
        return {
            'Hops': {
                'hops started': info(run.hops.length),
                'hops covered': higher(covered.length),
                'hops not covered before next hop': lower(run.hops.filter(h => h.interrupted).length),
                'time to cover, mean (ms)': lower(mean(covered), 1),
                'time to cover, median (ms)': lower(percentile(covered, 0.5), 1),
                'time to cover, p95 (ms)': lower(percentile(covered, 0.95), 1),
                'time to cover, max (ms)': lower(covered.length ? Math.max.apply(null, covered) : NaN, 1),
                'cover after settle, mean (ms)': lower(mean(afterSettle), 1),
                'cover after settle, p95 (ms)': lower(percentile(afterSettle, 0.95), 1)
            },
            // Fewer tiles for the same coverage is the win: every extra tile is bandwidth and server time.
            'Tiles': {
                'requested': lower(s.requested),
                'delivered': lower(s.delivered),
                'delivered per covered hop': lower(covered.length ? s.delivered / covered.length : NaN, 1),
                'aborted while queued in browser': lower(s.abortedQueued),
                'aborted while on the wire': lower(s.abortedInFlight),
                'server work wasted (aborted after service)': lower(s.wastedServer),
                'loaded into viewer (tile-loaded)': lower(run.tilesLoaded),
                'delivered, never drawn': lower(Math.max(0, s.delivered - run.drawnKeys.size)),
                'failed': lower(run.tilesFailed)
            },
            'Tile wait, request to delivery': {
                'mean (ms)': lower(mean(s.waits), 1),
                'median (ms)': lower(percentile(s.waits, 0.5), 1),
                'p95 (ms)': lower(percentile(s.waits, 0.95), 1),
                'max (ms)': lower(s.waits.length ? Math.max.apply(null, s.waits) : NaN, 1)
            },
            'Network': {
                'max requests on the wire': info(s.maxInFlight),
                'max transfers sharing the link': info(s.maxTransfers),
                'max requests queued in browser': lower(s.maxQueue),
                'on the wire now': info(run.backend.inFlight),
                'queued in browser now': info(run.backend.queue.length),
                'scheduler ceiling for origin': info(scheduled ? scheduler.limitFor(origin) : NaN),
                'scheduler budget for origin (adaptive)': info(scheduled ? scheduler.budgetFor(origin) : NaN),
                'scheduler booked for origin': info(scheduled ? scheduler.inFlightFor(origin) : NaN)
            }
        };
    }

    function render(runA, runB) {
        const a = collect(runA);
        const b = collect(runB);
        const tbody = document.querySelector('#stats tbody');
        const rows = [];
        for (const section in a) {
            rows.push('<tr class="section"><td colspan="3">' + section + '</td></tr>');
            for (const metric in a[section]) {
                const ma = a[section][metric];
                const mb = b[section][metric];
                const va = ma.value, vb = mb.value;
                let classA = '', classB = '';
                if (ma.better && typeof va === 'number' && typeof vb === 'number' &&
                    !isNaN(va) && !isNaN(vb) && va !== vb) {
                    const aWins = ma.better === 'lower' ? va < vb : va > vb;
                    if (aWins) {
                        classA = 'better';
                    } else {
                        classB = 'better';
                    }
                }
                rows.push('<tr><td>' + metric + '</td><td class="' + classA + '">' + fmt(va, ma.digits) +
                    '</td><td class="' + classB + '">' + fmt(vb, mb.digits) + '</td></tr>');
            }
        }
        tbody.innerHTML = rows.join('');
    }

    function log(line) {
        const el = document.getElementById('log');
        el.textContent += line + '\n';
        el.scrollTop = el.scrollHeight;
    }

    // ------------------------------------------------------------------------------------------------------
    // Session history and export. Every run since the page was opened is kept, including runs stopped early.
    // ------------------------------------------------------------------------------------------------------
    const sessions = [];

    function flatten(collected) {
        const flat = {};
        for (const section in collected) {
            for (const metric in collected[section]) {
                flat[section + ' / ' + metric] = collected[section][metric].value;
            }
        }
        return flat;
    }

    function snapshotRun(run) {
        return {
            label: run.label,
            serverProtocol: run.image ? run.image.serverProtocol : null,
            summary: flatten(collect(run)),
            hops: run.hops.map(h => ({
                index: h.index,
                zoom: h.zoom,
                center: h.center,
                immediately: h.immediately,
                coverMs: h.coverMs,
                settleMs: h.settledAt !== null ? h.settledAt - h.start : null,
                coverAfterSettleMs: h.coverMs !== null && h.settledAt !== null ? coverAfterSettle(h) : null,
                interrupted: h.interrupted,
                elapsedMs: h.coverMs !== null ? h.coverMs : (h.elapsed !== undefined ? h.elapsed : null),
                tilesDelivered: (h.tilesDeliveredAfter !== undefined ? h.tilesDeliveredAfter : run.backend.stats.delivered) -
                    h.tilesDeliveredBefore
            })),
            tileWaitsMs: run.backend.stats.waits.map(w => Math.round(w * 10) / 10)
        };
    }

    function recordSession(cfg, hops, startedAt, completed) {
        sessions.push({
            index: sessions.length + 1,
            startedAt: startedAt,
            endedAt: new Date().toISOString(),
            completed: completed,
            userAgent: navigator.userAgent,
            config: cfg,
            hops: hops.map((h, i) => ({
                index: i + 1, zoom: h.zoom, center: { x: h.center.x, y: h.center.y },
                immediately: h.immediately, delayMs: h.delay
            })),
            viewers: { A: snapshotRun(runs[0]), B: snapshotRun(runs[1]) }
        });
        document.getElementById('sessions').textContent = sessions.length + ' session' +
            (sessions.length === 1 ? '' : 's') + ' recorded';
        document.getElementById('export-json').disabled = false;
        document.getElementById('export-csv').disabled = false;
    }

    function exportJson() {
        download('tileloadscheduler-sessions-' + stamp() + '.json', JSON.stringify(sessions, null, 2),
            'application/json');
    }

    function exportCsv() {
        if (!sessions.length) {
            return;
        }
        const configKeys = ['protocol', 'connections', 'latency', 'workers', 'service', 'jitter', 'bandwidth', 'tileKB'];
        const runKeys = ['tao', 'hops', 'intervalMin', 'intervalMax', 'immediate', 'seed', 'drawer'];
        const metricKeys = Object.keys(sessions[0].viewers.A.summary);
        const header = ['session', 'startedAt', 'completed', 'viewer', 'serverProtocol']
            .concat(configKeys, runKeys, metricKeys);
        const lines = [header.map(csvCell).join(',')];
        for (const session of sessions) {
            for (const key of ['A', 'B']) {
                const viewer = session.viewers[key];
                const row = [session.index, session.startedAt, session.completed, key, viewer.serverProtocol]
                    .concat(configKeys.map(k => session.config.backend[k]))
                    .concat(runKeys.map(k => session.config[k]))
                    .concat(metricKeys.map(k => viewer.summary[k]));
                lines.push(row.map(csvCell).join(','));
            }
        }
        download('tileloadscheduler-sessions-' + stamp() + '.csv', lines.join('\n'), 'text/csv');
    }

    // ------------------------------------------------------------------------------------------------------
    // Driver
    // ------------------------------------------------------------------------------------------------------
    let runs = null;
    let rafId = 0;
    let runCounter = 0;
    let stopRequested = false;
    // { cfg, hops, startedAt, recorded } for the run in progress
    let session = null;

    function readConfig() {
        const num = id => parseFloat(document.getElementById(id).value);
        const protocol = document.getElementById('protocol').value;
        return {
            backend: {
                protocol: protocol,
                connections: CONNECTIONS[protocol],
                latency: num('latency'),
                workers: num('workers'),
                service: num('service'),
                jitter: num('jitter'),
                bandwidth: num('bandwidth'),
                tileKB: num('tileKB')
            },
            tao: document.getElementById('tao').checked,
            hops: num('hops'),
            intervalMin: num('intervalMin'),
            intervalMax: num('intervalMax'),
            immediate: num('immediate'),
            seed: num('seed'),
            drawer: document.getElementById('drawer').value
        };
    }

    function applyPreset() {
        const preset = PRESETS[document.getElementById('preset').value];
        if (!preset) {
            return;
        }
        document.getElementById('protocol').value = preset.protocol;
        document.getElementById('latency').value = preset.latency;
        document.getElementById('workers').value = preset.workers;
        document.getElementById('service').value = preset.service;
        document.getElementById('jitter').value = preset.jitter;
        document.getElementById('bandwidth').value = preset.bandwidth;
    }

    function setStatus(text) {
        document.getElementById('status').textContent = text;
    }

    // completed === true only when the hop script ran to its end; the Stop button passes a click event.
    function stop(completed) {
        stopRequested = true;
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
        }
        if (runs) {
            runs.forEach(r => r.finishHop(true));
            render(runs[0], runs[1]);
            if (session && !session.recorded) {
                session.recorded = true;
                recordSession(session.cfg, session.hops, session.startedAt, completed === true);
            }
        }
        document.getElementById('run').disabled = false;
        document.getElementById('stop').disabled = true;
    }

    function start() {
        stop();
        stopRequested = false;
        if (runs) {
            runs.forEach(r => r.destroy());
        }
        document.getElementById('log').textContent = '';
        document.getElementById('run').disabled = true;
        document.getElementById('stop').disabled = false;

        const cfg = readConfig();
        runCounter++;
        // A fresh origin per run keeps the page-wide scheduler's detection state from leaking between runs.
        const originA = 'https://sim-a-' + runCounter + '.invalid';
        const originB = 'https://sim-b-' + runCounter + '.invalid';

        const runA = new Run('viewer-a', 'A', cfg.backend, { serverProtocol: 'auto', drawer: cfg.drawer }, originA);
        const runB = new Run('viewer-b', 'B', cfg.backend, { serverProtocol: false, drawer: cfg.drawer }, originB);
        runs = [runA, runB];
        session = { cfg: cfg, hops: [], startedAt: new Date().toISOString(), recorded: false };

        if (cfg.tao) {
            // What the PerformanceObserver would learn from the first response carrying Timing-Allow-Origin.
            // The simulated backend produces no resource timing entries, so the outcome is injected instead.
            OpenSeadragon.tileLoadScheduler.noteProtocol(originA, cfg.backend.protocol);
        }

        log('backend: ' + JSON.stringify(cfg.backend) + ' Timing-Allow-Origin: ' + cfg.tao);

        let opened = 0;
        const onOpen = function () {
            if (++opened < 2) {
                return;
            }
            // Wait for the home view to load on both before the hops start, so the clock measures hops only.
            const homeLoaded = () => runs.every(r => r.image && r.image.getFullyLoaded());
            const waitHome = () => {
                if (stopRequested) {
                    return;
                }
                if (!homeLoaded()) {
                    setStatus('loading home view...');
                    setTimeout(waitHome, 50);
                    return;
                }
                runHops(cfg);
            };
            waitHome();
        };
        runA.viewer.addOnceHandler('open', onOpen);
        runB.viewer.addOnceHandler('open', onOpen);
    }

    function runHops(cfg) {
        const rand = mulberry32(cfg.seed);
        const hops = makeHops(cfg.hops, rand, cfg, runs[0].viewer.viewport);
        session.hops = hops;
        session.startedAt = new Date().toISOString();
        let index = 0;

        const frame = function () {
            runs.forEach(r => r.tick());
            render(runs[0], runs[1]);
            rafId = requestAnimationFrame(frame);
        };
        frame();

        const next = function () {
            if (stopRequested) {
                return;
            }
            if (index >= hops.length) {
                // Let the last hop finish, then freeze the numbers.
                const settleStart = performance.now();
                const settle = function () {
                    const done = runs.every(r => r.current === null) || performance.now() - settleStart > 15000;
                    if (!done && !stopRequested) {
                        setTimeout(settle, 100);
                        return;
                    }
                    runs.forEach(r => r.finishHop(true));
                    stop(true);
                    setStatus('done: ' + hops.length + ' hops');
                    log('done');
                };
                settle();
                return;
            }
            const hop = hops[index++];
            runs.forEach(r => r.hop(index, hop.zoom, hop.center, hop.immediately));
            setStatus('hop ' + index + ' / ' + hops.length);
            log('hop ' + index + ': zoom ' + hop.zoom.toFixed(2) + ' center ' + hop.center.toString() +
                (hop.immediately ? ' immediate' : ' animated') + ' next in ' + hop.delay.toFixed(0) + ' ms');
            setTimeout(next, hop.delay);
        };
        next();
    }

    document.getElementById('preset').addEventListener('change', applyPreset);
    document.getElementById('run').addEventListener('click', start);
    document.getElementById('stop').addEventListener('click', stop);
    document.getElementById('export-json').addEventListener('click', exportJson);
    document.getElementById('export-csv').addEventListener('click', exportCsv);
    applyPreset();
}());
