/* global OpenSeadragon */
(function () {
    'use strict';

    const { PRESETS, CONNECTIONS, SimBackend, makeTileSource, mulberry32, percentile, mean, fmt, download, stamp,
        csvCell } = window.SimNetwork;

    const IMAGE_SIZE = 32768;
    const TILE_SIZE = 256;
    // Measurement ends this long after arrival even if some layer never reached full resolution.
    const AFTER_ARRIVAL_TIMEOUT = 20000;
    // ...or this long after the animation started, whatever happens.
    const RUN_TIMEOUT = 60000;
    const LOAD_TIMEOUT = 30000;
    // "Deficit after arrival" averages the resolution deficit over this long after arrival.
    const AFTER_ARRIVAL_WINDOW = 500;
    // A run whose 10 ms timer probe was late by more than this (p95) is marked unreliable: the simulated
    // network runs on timers, so a busy main thread stretches its latencies and the result measures the CPU.
    const UNRELIABLE_LAG_MS = 50;

    // ------------------------------------------------------------------------------------------------------
    // Animations. Positions are fractions of the world's home bounds, zooms are multiples of the home zoom,
    // so every scenario means the same thing for one layer, 60 stacked layers or a grid of them.
    // run(viewport, ctx) starts the animation; ctx.after(ms, fn) schedules follow-up input. inputMs(ctx) is when
    // the last scripted input fires: the view cannot have arrived before that, even if it is momentarily at rest
    // between two steps (a wheel burst at 0.3 s settles between ticks).
    // ------------------------------------------------------------------------------------------------------
    const SCENARIOS = [
        {
            key: 'short-pan', label: 'short pan (~1 viewport)',
            start: { zoom: 8, at: [0.3, 0.5] },
            run: (vp, ctx) => vp.panTo(ctx.P(0.42, 0.5))
        },
        {
            key: 'long-pan', label: 'long pan (~6 viewports)',
            start: { zoom: 8, at: [0.15, 0.3] },
            run: (vp, ctx) => vp.panTo(ctx.P(0.85, 0.7))
        },
        {
            key: 'zoom-in', label: 'zoom in x16 about a point',
            start: { zoom: 1, at: [0.5, 0.5] },
            run: (vp, ctx) => vp.zoomTo(ctx.Z(16), ctx.P(0.62, 0.4))
        },
        {
            key: 'zoom-out', label: 'zoom out x16',
            start: { zoom: 16, at: [0.62, 0.4] },
            run: (vp, ctx) => {
                vp.zoomTo(ctx.Z(1));
                vp.panTo(ctx.P(0.5, 0.5));
            }
        },
        {
            key: 'zoom-pan', label: 'zoom in x6 while panning',
            start: { zoom: 2, at: [0.25, 0.25] },
            run: (vp, ctx) => {
                vp.zoomTo(ctx.Z(12));
                vp.panTo(ctx.P(0.75, 0.7));
            }
        },
        {
            key: 'wheel-burst', label: 'wheel burst (10 x 1.25 every 80 ms)',
            start: { zoom: 2, at: [0.5, 0.5] },
            inputMs: () => 9 * 80,
            run: (vp, ctx) => {
                for (let i = 0; i < 10; i++) {
                    ctx.after(i * 80, () => vp.zoomBy(1.25, ctx.P(0.58, 0.45)));
                }
            }
        },
        {
            key: 'drag-flick', label: 'drag, then flick',
            start: { zoom: 8, at: [0.3, 0.5] },
            inputMs: () => 12 * 16,
            run: (vp, ctx) => {
                const width = vp.getBounds().width;
                for (let i = 0; i < 12; i++) {
                    ctx.after(i * 16, () => vp.panBy(new OpenSeadragon.Point(width * 0.02, 0), true));
                }
                ctx.after(12 * 16, () => vp.panBy(new OpenSeadragon.Point(width * 1.5, width * 0.3)));
            }
        },
        {
            key: 'interrupted', label: 'long pan, retargeted at 40%',
            start: { zoom: 8, at: [0.15, 0.3] },
            inputMs: ctx => 0.4 * ctx.animationTime * 1000,
            run: (vp, ctx) => {
                vp.panTo(ctx.P(0.85, 0.7));
                ctx.after(0.4 * ctx.animationTime * 1000, () => vp.panTo(ctx.P(0.5, 0.15)));
            }
        }
    ];

    const VARIANTS = [
        { key: 'A', label: 'look-ahead', element: 'viewer-a', live: 'live-a', planner: 'lookahead', scheduled: true },
        { key: 'B', label: 'destination only', element: 'viewer-b', live: 'live-b', planner: 'destination', scheduled: true },
        { key: 'C', label: 'look-ahead, frame-paced', element: 'viewer-c', live: 'live-c', planner: 'lookahead', scheduled: false }
    ];

    // ------------------------------------------------------------------------------------------------------
    // One viewer under test.
    // ------------------------------------------------------------------------------------------------------
    let runCounter = 0;

    class Run {
        constructor(variant, cfg) {
            this.variant = variant;
            this.cfg = cfg;
            this.backends = new Map();
            this.delivered = new Set();
            this.drawn = new Set();
            this.selectionMs = 0;
            this.frames = 0;
            this.measuring = false;

            const base = 'https://sim-' + variant.key.toLowerCase() + '-' + (++runCounter) + '.invalid';
            const sources = [];
            for (let i = 0; i < cfg.layers; i++) {
                const origin = cfg.origins === 'shared' ? base : base.replace('.invalid', '-' + i + '.invalid');
                if (!this.backends.has(origin)) {
                    this.backends.set(origin, new SimBackend(cfg.backend));
                }
                const source = makeTileSource(this.backends.get(origin), origin, {
                    size: IMAGE_SIZE,
                    tileSize: TILE_SIZE,
                    hue: i * 37,
                    onDeliver: context => {
                        if (this.measuring && context.tile) {
                            this.delivered.add(context.tile.cacheKey);
                        }
                    }
                });
                sources.push({
                    tileSource: source,
                    // Stacked layers are what multiplexed channels look like; all of them load.
                    opacity: cfg.layout === 'stacked' && i > 0 ? 0.35 : 1
                });
            }

            const run = this;
            this.viewer = OpenSeadragon({
                id: variant.element,
                prefixUrl: '../../build/openseadragon/images/',
                tileSources: sources,
                collectionMode: cfg.layout === 'grid',
                collectionRows: Math.ceil(Math.sqrt(cfg.layers)),
                collectionTileMargin: 8,
                showNavigator: false,
                showNavigationControl: false,
                animationTime: cfg.animationTime,
                springStiffness: cfg.stiffness,
                serverProtocol: variant.scheduled ? cfg.backend.protocol : false,
                // Enough for every layer, so eviction never causes re-requests that would blur the comparison.
                maxImageCacheCount: 50000,
                imageLoaderLimit: 0,
                timeout: 120000,
                // The demo drives every viewer from code; input would desynchronise them.
                mouseNavEnabled: false
            });
            this.viewer.world.addHandler('add-item', function (event) {
                const image = event.item;
                image._loadPlanner = variant.planner;
                // Planner tunables under test apply to the look-ahead viewers only; B has nothing to tune.
                if (variant.planner === 'lookahead') {
                    if (cfg.minPathDwell !== undefined) {
                        image._minPathDwell = cfg.minPathDwell;
                    }
                    if (cfg.arrivalSafety !== undefined) {
                        image._arrivalSafety = cfg.arrivalSafety;
                    }
                }
                const original = image._updateLevelsForViewport;
                image._updateLevelsForViewport = function () {
                    const t0 = performance.now();
                    const result = original.apply(this, arguments);
                    if (run.measuring) {
                        run.selectionMs += performance.now() - t0;
                        run.notePlan(this._loadPlan);
                    }
                    return result;
                };
            });
        }

        get images() {
            const world = this.viewer.world;
            const list = [];
            for (let i = 0; i < world.getItemCount(); i++) {
                list.push(world.getItemAt(i));
            }
            return list;
        }

        ready() {
            return this.viewer.world.getItemCount() === this.cfg.layers;
        }

        // Every layer that shows something is loaded. A layer entirely outside the view (most of a zoomed-in
        // grid) has no draw area: it is never updated, so its getFullyLoaded() keeps whatever it was - false
        // for one that has never been on screen - and must not be waited for.
        fullyLoaded() {
            return this.ready() && this.images.every(image => !image.getDrawArea() || image.getFullyLoaded());
        }

        deliveredCount() {
            let total = 0;
            this.backends.forEach(b => {
                total += b.stats.delivered;
            });
            return total;
        }

        inFlight() {
            let total = 0;
            this.backends.forEach(b => {
                total += b.inFlight + b.queue.length;
            });
            return total;
        }

        // What the planner decided, counted per image and frame while measuring.
        notePlan(plan) {
            const stats = this.planStats;
            stats.imageFrames++;
            if (!plan) {
                return;
            }
            stats.planned++;
            stats.reasons[plan.pathReason] = (stats.reasons[plan.pathReason] || 0) + 1;
            if (plan.pathReason !== 'retargeting' && plan.pathReason !== 'destination') {
                // When the planner expects the user to perceive the view as arrived (latest estimate), on the
                // run's clock; compare with the measured arrival, which is stricter (2 % of a viewport).
                this.plannerArrivalMs = plan.arrival - OpenSeadragon.now() + performance.now() - this.start;
            }
            const path = plan.samples.length - 1;
            if (path > 0) {
                stats.withPath++;
                stats.pathSamples += path;
            }
            const destination = plan.samples[0];
            if (destination.levels.length === 1 && destination.levels[0] < destination.level) {
                stats.retargeting++;
            }
        }

        // Called right when the animation starts. inputMs: when the scenario's last scripted input fires.
        begin(inputMs) {
            this.afterArrival = { deficit: 0, time: 0 };
            this.planStats = { imageFrames: 0, planned: 0, withPath: 0, pathSamples: 0, retargeting: 0, reasons: {} };
            this.plannerArrivalMs = NaN;
            this.timeline = [];
            this.nextTimelineAt = 0;
            this.waitsBefore = 0;
            this.backends.forEach(b => {
                this.waitsBefore += b.stats.waits.length;
            });
            this.measuring = true;
            this.start = performance.now();
            this.inputUntil = this.start + (inputMs || 0);
            this.last = this.start;
            this.deliveredBefore = this.deliveredCount();
            this.anim = { deficit: 0, blank: 0, time: 0 };
            this.arrivedAt = null;
            this.atArrival = null;
            this.layerFullAt = new Array(this.cfg.layers).fill(null);
            this.allFullAt = null;
            this.current = { deficit: NaN, blank: NaN };
            this.done = false;
        }

        // Called every frame while measuring.
        sample(now) {
            const viewport = this.viewer.viewport;
            const dt = now - this.last;
            this.last = now;
            this.frames++;

            // Where the view is right now, sampled on a grid over the container. Plain numbers and axis-aligned
            // tests only: no scenario rotates, and Rect.containsPoint() allocates enough per call that with 60
            // layers this metric alone took a sixth of the main thread, distorting what it measures.
            const size = viewport.getContainerSize();
            const grid = this.cfg.layers > 4 ? 12 : 16;
            const topLeft = viewport.viewerElementToViewportCoordinates(new OpenSeadragon.Point(0, 0), true);
            const bottomRight = viewport.viewerElementToViewportCoordinates(new OpenSeadragon.Point(size.x, size.y), true);
            const xs = [];
            const ys = [];
            for (let g = 0; g < grid; g++) {
                xs.push(topLeft.x + (g + 0.5) * (bottomRight.x - topLeft.x) / grid);
                ys.push(topLeft.y + (g + 0.5) * (bottomRight.y - topLeft.y) / grid);
            }

            const zoom = viewport.getZoom(true);
            let deficitSum = 0;
            let blankCount = 0;
            let count = 0;
            const images = this.images;
            const boxes = [];
            for (let index = 0; index < images.length; index++) {
                const image = images[index];
                const bounds = image.getBounds(true);
                const bx0 = bounds.x;
                const by0 = bounds.y;
                const bx1 = bounds.x + bounds.width;
                const by1 = bounds.y + bounds.height;
                const wanted = image._levelForZoom(zoom, image._scaleSpring.current.value);
                const minLevel = image.source.minLevel || 0;
                const drawn = image._lastDrawn || [];
                boxes.length = 0;
                for (const info of drawn) {
                    const b = info.tile.positionedBounds;
                    boxes.push(b.x, b.y, b.x + b.width, b.y + b.height, info.tile.level);
                }
                let layerFull = true;
                for (let pi = 0; pi < grid * grid; pi++) {
                    const px = xs[pi % grid];
                    const py = ys[(pi / grid) | 0];
                    if (px < bx0 || px > bx1 || py < by0 || py > by1) {
                        continue;
                    }
                    let best = -1;
                    for (let k = 0; k < boxes.length; k += 5) {
                        if (boxes[k + 4] > best && px >= boxes[k] && px <= boxes[k + 2] &&
                            py >= boxes[k + 1] && py <= boxes[k + 3]) {
                            best = boxes[k + 4];
                        }
                    }
                    count++;
                    if (best < 0) {
                        blankCount++;
                        deficitSum += wanted - minLevel + 1;
                        layerFull = false;
                    } else {
                        const deficit = Math.max(0, wanted - best);
                        deficitSum += deficit;
                        if (deficit > 0) {
                            layerFull = false;
                        }
                    }
                }
                for (const info of drawn) {
                    this.drawn.add(info.tile.cacheKey);
                }
                if (this.arrivedAt !== null && layerFull && this.layerFullAt[index] === null) {
                    this.layerFullAt[index] = now - this.arrivedAt;
                }
            }
            const deficit = count ? deficitSum / count : 0;
            const blank = count ? blankCount / count : 0;
            this.current = { deficit: deficit, blank: blank };

            const every = this.cfg.timelineMs;
            if (every > 0 && now - this.start >= this.nextTimelineAt) {
                this.nextTimelineAt += every;
                this.timeline.push({
                    t: Math.round(now - this.start),
                    zoom: +zoom.toPrecision(5),
                    deficit: +deficit.toFixed(3),
                    blank: +blank.toFixed(3),
                    arrived: this.arrivedAt !== null,
                    full: this.layerFullAt.filter(x => x !== null).length,
                    delivered: this.deliveredCount() - this.deliveredBefore,
                    inFlight: this.inFlight()
                });
            }

            // Arrival: the user is looking at the destination. Re-armed if the target moves again.
            const target = viewport.getCenter(false);
            const targetZoom = viewport.getZoom(false);
            const arrived = now >= this.inputUntil && Math.abs(zoom / targetZoom - 1) < 0.05 &&
                viewport.getCenter(true).distanceTo(target) < 0.02 / targetZoom;
            if (!arrived) {
                if (this.arrivedAt !== null) {
                    this.arrivedAt = null;
                    this.atArrival = null;
                    this.afterArrival = { deficit: 0, time: 0 };
                    this.layerFullAt.fill(null);
                }
                this.anim.deficit += deficit * dt;
                this.anim.blank += blank * dt;
                this.anim.time += dt;
            } else if (this.arrivedAt === null) {
                this.arrivedAt = now;
                this.atArrival = { deficit: deficit, blank: blank };
                this.arrivalMs = now - this.start;
            } else if (now - this.arrivedAt <= AFTER_ARRIVAL_WINDOW) {
                // The frame at arrival alone is noisy: a batch landing one frame earlier or later flips it.
                this.afterArrival.deficit += deficit * dt;
                this.afterArrival.time += dt;
            }

            if (this.arrivedAt !== null && this.layerFullAt.every(t => t !== null)) {
                this.allFullAt = Math.max.apply(null, this.layerFullAt);
                this.done = true;
            } else if (this.arrivedAt !== null && now - this.arrivedAt > AFTER_ARRIVAL_TIMEOUT) {
                this.done = true;
            } else if (now - this.start > RUN_TIMEOUT) {
                this.done = true;
            }
        }

        finish() {
            this.measuring = false;
            const layerTimes = this.layerFullAt.filter(t => t !== null);
            let neverDrawn = 0;
            this.delivered.forEach(key => {
                if (!this.drawn.has(key)) {
                    neverDrawn++;
                }
            });
            return {
                'deficit during animation': this.anim.time ? this.anim.deficit / this.anim.time : 0,
                'blank % during animation': this.anim.time ? 100 * this.anim.blank / this.anim.time : 0,
                'deficit at arrival': this.atArrival ? this.atArrival.deficit : NaN,
                // Finished early means fully loaded for the rest of the window, so the remainder counts as 0.
                'deficit after arrival': this.atArrival ? this.afterArrival.deficit /
                    Math.max(this.afterArrival.time, this.allFullAt !== null ? AFTER_ARRIVAL_WINDOW : 0) || 0 : NaN,
                'blank % at arrival': this.atArrival ? 100 * this.atArrival.blank : NaN,
                'full res after arrival (ms)': this.allFullAt !== null ? this.allFullAt : NaN,
                'layer full res, median (ms)': percentile(layerTimes, 0.5),
                'layers never full res': this.cfg.layers - layerTimes.length,
                'tiles delivered': this.deliveredCount() - this.deliveredBefore,
                'delivered, never drawn': neverDrawn,
                'tile selection (ms/frame)': this.frames ? this.selectionMs / this.frames : NaN,
                'arrival (ms)': this.arrivalMs !== undefined ? this.arrivalMs : NaN
            };
        }

        // Everything beyond the summary: kept for the JSON export, dropped from memory once auto-exported.
        log() {
            const waits = [];
            this.backends.forEach(b => {
                waits.push.apply(waits, b.stats.waits);
            });
            const recent = waits.slice(this.waitsBefore);
            const stats = this.planStats;
            return {
                planner: Object.assign({}, stats, {
                    pathFrameShare: stats.planned ? stats.withPath / stats.planned : 0,
                    meanPathSamples: stats.withPath ? stats.pathSamples / stats.withPath : 0,
                    arrivalMs: this.plannerArrivalMs
                }),
                tileWaitMs: {
                    count: recent.length,
                    median: percentile(recent, 0.5),
                    p95: percentile(recent, 0.95)
                },
                layerFullAfterArrivalMs: this.layerFullAt.slice(),
                timeline: this.timeline
            };
        }

        destroy() {
            this.backends.forEach(b => b.stop());
            this.viewer.destroy();
        }
    }

    // Metrics that only describe the run, not its quality: never highlighted.
    const INFO_METRICS = new Set(['arrival (ms)']);
    const METRIC_DIGITS = {
        'deficit during animation': 2, 'blank % during animation': 1, 'deficit at arrival': 2,
        'blank % at arrival': 1, 'deficit after arrival': 2, 'tile selection (ms/frame)': 2
    };

    // ------------------------------------------------------------------------------------------------------
    // Driver
    // ------------------------------------------------------------------------------------------------------
    let runs = [];
    let stopRequested = false;
    let rafId = 0;
    const results = [];
    // How many results have already gone out through auto-export; their logs are no longer in memory.
    let exportedUpTo = 0;
    const TABLE_ROWS = 100;

    // A hidden tab gets no animation frames: viewers neither draw nor request tiles, and timers are throttled.
    // A run that was hidden at any point measures the browser, not the loader, so it is thrown away and redone.
    let hiddenDuringRun = document.hidden;
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            hiddenDuringRun = true;
        }
    });

    class HiddenTabError extends Error {
        constructor() {
            super('tab was hidden');
        }
    }

    function $(id) {
        return document.getElementById(id);
    }

    function setStatus(text) {
        $('status').textContent = text;
    }

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function waitFor(predicate, timeout, label) {
        const start = performance.now();
        while (!predicate()) {
            if (stopRequested) {
                throw new Error('stopped');
            }
            if (performance.now() - start > timeout) {
                throw new Error('timed out ' + label);
            }
            await wait(50);
        }
    }

    function backendConfig(presetKey) {
        const preset = PRESETS[presetKey];
        const latency = parseFloat($('latency').value);
        return {
            protocol: preset.protocol,
            connections: CONNECTIONS[preset.protocol],
            latency: isNaN(latency) ? preset.latency : latency,
            workers: preset.workers,
            service: preset.service,
            jitter: preset.jitter,
            bandwidth: preset.bandwidth,
            tileKB: parseFloat($('tileKB').value) || 30
        };
    }

    function singleConfig() {
        return {
            preset: $('preset').value,
            scenario: $('scenario').value,
            animationTime: parseFloat($('animationTime').value),
            stiffness: parseFloat($('stiffness').value),
            layers: parseInt($('layers').value, 10),
            layout: $('layout').value,
            origins: $('origins').value,
            withC: $('withC').checked,
            timelineMs: parseFloat($('sweep-timeline').value) || 0
        };
    }

    function checkedValues(selector) {
        return Array.prototype.slice.call(document.querySelectorAll(selector))
            .filter(el => el.checked).map(el => el.value);
    }

    function matrixConfigs() {
        const base = singleConfig();
        const configs = [];
        for (const preset of checkedValues('.m-preset')) {
            for (const scenario of checkedValues('.m-scenario')) {
                for (const layers of checkedValues('.m-layers')) {
                    for (const stiffness of checkedValues('.m-stiffness')) {
                        for (const time of checkedValues('.m-time')) {
                            configs.push(Object.assign({}, base, {
                                preset: preset,
                                scenario: scenario,
                                layers: parseInt(layers, 10),
                                stiffness: parseFloat(stiffness),
                                animationTime: parseFloat(time)
                            }));
                        }
                    }
                }
            }
        }
        return configs;
    }

    // Every combination of the matrix dimensions and the sweep-only ones. Shuffled with a seed, so a sweep
    // stopped early has still touched every dimension, and an order can be reproduced from the seed.
    function sweepConfigs(seed) {
        const configs = [];
        const dwells = checkedValues('.s-dwell').map(parseFloat);
        const safeties = checkedValues('.s-safety').map(parseFloat);
        const repeats = Math.max(1, parseInt($('sweep-repeats').value, 10) || 1);
        for (const base of matrixConfigs()) {
            for (const layout of checkedValues('.s-layout')) {
                for (const origins of checkedValues('.s-origins')) {
                    for (const dwell of dwells.length ? dwells : [undefined]) {
                        for (const safety of safeties.length ? safeties : [undefined]) {
                            for (let repeat = 0; repeat < repeats; repeat++) {
                                configs.push(Object.assign({}, base, {
                                    layout: layout,
                                    origins: origins,
                                    minPathDwell: dwell,
                                    arrivalSafety: safety,
                                    repeat: repeats > 1 ? repeat : undefined,
                                    swapOrder: repeat % 2 === 1
                                }));
                            }
                        }
                    }
                }
            }
        }
        if ($('sweep-order').value === 'shuffled') {
            const rand = mulberry32(seed);
            for (let i = configs.length - 1; i > 0; i--) {
                const j = Math.floor(rand() * (i + 1));
                const swap = configs[i];
                configs[i] = configs[j];
                configs[j] = swap;
            }
        }
        return configs;
    }

    function describe(cfg) {
        let text = cfg.preset + ' | ' + cfg.scenario + ' | ' + cfg.animationTime + ' s k=' + cfg.stiffness + ' | ' +
            cfg.layers + ' ' + cfg.layout + ' | origins ' + cfg.origins;
        if (cfg.minPathDwell !== undefined || cfg.arrivalSafety !== undefined) {
            text += ' | A dwell ' + (cfg.minPathDwell !== undefined ? cfg.minPathDwell : 'default') +
                ' safety ' + (cfg.arrivalSafety !== undefined ? cfg.arrivalSafety : 'default');
        }
        if (cfg.repeat !== undefined) {
            text += ' | repeat ' + (cfg.repeat + 1) + (cfg.swapOrder ? ' (B first)' : '');
        }
        return text;
    }

    function teardown() {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
        }
        runs.forEach(r => r.destroy());
        runs = [];
    }

    async function runOne(cfg, label) {
        teardown();
        const full = Object.assign({}, cfg, { backend: backendConfig(cfg.preset) });
        const variants = VARIANTS.filter(v => v.key !== 'C' || cfg.withC);
        // The viewer created first also draws, plans and dispatches first in every frame. Repeats alternate
        // the order, so a systematic advantage of the first viewer shows up as a difference between them.
        if (cfg.swapOrder) {
            variants.reverse();
        }
        $('pane-c').style.display = cfg.withC ? '' : 'none';
        runs = variants.map(v => new Run(v, full));

        setStatus(label + ': opening');
        await waitFor(() => runs.every(r => r.ready()), LOAD_TIMEOUT, 'opening');

        // The start view, loaded on every viewer before anything is measured.
        const scenario = SCENARIOS.find(s => s.key === cfg.scenario);
        const contexts = runs.map(r => makeContext(r, full));
        runs.forEach((r, i) => {
            const vp = r.viewer.viewport;
            vp.zoomTo(contexts[i].Z(scenario.start.zoom), null, true);
            vp.panTo(contexts[i].P(scenario.start.at[0], scenario.start.at[1]), true);
        });
        setStatus(label + ': loading the start view');
        await waitFor(() => runs.every(r => r.fullyLoaded()), LOAD_TIMEOUT, 'loading the start view');
        // A quiet moment, so the animation below starts as one deliberate gesture, not a burst of retargets.
        await wait(400);

        setStatus(label + ': animating');
        runs.forEach((r, i) => {
            r.begin(scenario.inputMs ? scenario.inputMs(contexts[i]) : 0);
            scenario.run(r.viewer.viewport, contexts[i]);
        });

        // Main-thread health while measuring: frame times, and how late a 10 ms timer fires.
        const frameTimes = [];
        const timerLags = [];
        let probing = true;
        const probe = function () {
            const asked = performance.now();
            setTimeout(() => {
                timerLags.push(performance.now() - asked - 10);
                if (probing) {
                    probe();
                }
            }, 10);
        };
        probe();
        let lastFrame = performance.now();

        await new Promise(resolve => {
            const frame = function () {
                const now = performance.now();
                frameTimes.push(now - lastFrame);
                lastFrame = now;
                runs.forEach(r => {
                    if (!r.done) {
                        r.sample(now);
                    }
                });
                renderLive();
                if (stopRequested || runs.every(r => r.done)) {
                    rafId = 0;
                    resolve();
                    return;
                }
                rafId = requestAnimationFrame(frame);
            };
            rafId = requestAnimationFrame(frame);
        });
        probing = false;
        contexts.forEach(c => c.cancel());
        if (hiddenDuringRun) {
            throw new HiddenTabError();
        }

        const lagP95 = percentile(timerLags, 0.95);
        const health = {
            frameMedianMs: percentile(frameTimes, 0.5),
            frameP95Ms: percentile(frameTimes, 0.95),
            timerLagP95Ms: lagP95,
            timerLagMaxMs: timerLags.length ? Math.max.apply(null, timerLags) : NaN,
            unreliable: lagP95 > UNRELIABLE_LAG_MS
        };
        const row = { index: results.length + 1, at: new Date().toISOString(), config: cfg, backend: full.backend,
            health: health, viewers: {}, logs: {} };
        // Always A, B, C in the row, whichever was created first.
        runs.slice().sort((a, b) => a.variant.key < b.variant.key ? -1 : 1).forEach(r => {
            row.viewers[r.variant.key] = r.finish();
            row.logs[r.variant.key] = r.log();
        });
        results.push(row);
        renderResults();
    }

    function makeContext(run, cfg) {
        const viewport = run.viewer.viewport;
        const timers = [];
        return {
            animationTime: cfg.animationTime,
            P: (nx, ny) => {
                const home = run.viewer.world.getHomeBounds();
                return new OpenSeadragon.Point(home.x + nx * home.width, home.y + ny * home.height);
            },
            Z: k => viewport.getHomeZoom() * k,
            after: (ms, fn) => timers.push(setTimeout(fn, ms)),
            cancel: () => timers.forEach(clearTimeout)
        };
    }

    function renderLive() {
        for (const r of runs) {
            const el = $(r.variant.live);
            if (!r.anim) {
                el.textContent = '';
                continue;
            }
            el.textContent =
                'phase        ' + (r.done ? 'done' : r.arrivedAt === null ? 'animating' : 'arrived') + '\n' +
                'deficit now  ' + fmt(r.current.deficit, 2) + '   blank ' + fmt(100 * r.current.blank, 1) + ' %\n' +
                'anim mean    ' + fmt(r.anim.time ? r.anim.deficit / r.anim.time : NaN, 2) + '\n' +
                'layers full  ' + r.layerFullAt.filter(t => t !== null).length + ' / ' + r.cfg.layers + '\n' +
                'delivered    ' + (r.deliveredCount() - r.deliveredBefore) + '   in flight ' + r.inFlight();
        }
    }

    function metricNames() {
        for (const row of results) {
            for (const key in row.viewers) {
                return Object.keys(row.viewers[key]);
            }
        }
        return [];
    }

    function renderResults() {
        const metrics = metricNames();
        $('results').querySelector('thead').innerHTML = '<tr><th>scenario</th><th>viewer</th>' +
            metrics.map(m => '<th>' + m + '</th>').join('') + '</tr>';
        const rows = [];
        for (const row of results.slice(-TABLE_ROWS)) {
            if (row.error) {
                rows.push('<tr class="group"><td class="key">' + describe(row.config) +
                    '</td><td class="key worse" colspan="' + (metrics.length + 1) + '">' + row.error + '</td></tr>');
                continue;
            }
            const keys = Object.keys(row.viewers);
            const extremes = {};
            for (const metric of metrics) {
                const values = keys.map(k => row.viewers[k][metric]).filter(v => typeof v === 'number' && !isNaN(v));
                extremes[metric] = values.length > 1 ? { min: Math.min.apply(null, values), max: Math.max.apply(null, values) } : null;
            }
            keys.forEach((key, i) => {
                const cells = metrics.map(metric => {
                    const value = row.viewers[key][metric];
                    const ext = extremes[metric];
                    let cls = '';
                    if (ext && !INFO_METRICS.has(metric) && ext.min !== ext.max) {
                        cls = value === ext.min ? 'better' : value === ext.max ? 'worse' : '';
                    }
                    return '<td class="' + cls + '">' + fmt(value, METRIC_DIGITS[metric]) + '</td>';
                });
                const health = row.health && i === 0 && row.health.unreliable ?
                    '<br><span class="worse">unreliable: timer lag p95 ' + fmt(row.health.timerLagP95Ms) +
                    ' ms</span>' : '';
                rows.push('<tr class="' + (i === 0 ? 'group' : '') + '"><td class="key">' +
                    (i === 0 ? describe(row.config) + health : '') + '</td><td class="key">' + key + ': ' +
                    VARIANTS.find(v => v.key === key).label + '</td>' + cells.join('') + '</tr>');
            });
        }
        $('results').querySelector('tbody').innerHTML = rows.join('');
        $('export-json').disabled = $('export-csv').disabled = results.length === 0;
        renderAggregate(metrics);
    }

    // Mean of every metric per scenario, animation time and stiffness, over everything else that varied.
    function renderAggregate(metrics) {
        const groups = new Map();
        const withUnreliable = $('agg-unreliable').checked;
        let skipped = 0;
        for (const row of results) {
            if (row.error) {
                continue;
            }
            if (row.health && row.health.unreliable && !withUnreliable) {
                skipped++;
                continue;
            }
            const key = row.config.scenario + ' | ' + row.config.animationTime + ' s k=' + row.config.stiffness;
            if (!groups.has(key)) {
                groups.set(key, { runs: 0, viewers: {} });
            }
            const group = groups.get(key);
            group.runs++;
            for (const viewer in row.viewers) {
                const sums = group.viewers[viewer] || (group.viewers[viewer] = {});
                for (const metric of metrics) {
                    const value = row.viewers[viewer][metric];
                    if (typeof value === 'number' && !isNaN(value)) {
                        const entry = sums[metric] || (sums[metric] = { sum: 0, n: 0 });
                        entry.sum += value;
                        entry.n++;
                    }
                }
            }
        }
        const keys = Array.from(groups.keys()).sort();
        $('aggregate').querySelector('thead').innerHTML = '<tr><th>group</th><th>runs</th><th>viewer</th>' +
            metrics.map(m => '<th>' + m + '</th>').join('') + '</tr>';
        const rows = [];
        for (const key of keys) {
            const group = groups.get(key);
            const viewers = Object.keys(group.viewers).sort();
            const means = {};
            for (const viewer of viewers) {
                means[viewer] = {};
                for (const metric of metrics) {
                    const entry = group.viewers[viewer][metric];
                    means[viewer][metric] = entry ? entry.sum / entry.n : NaN;
                }
            }
            viewers.forEach((viewer, i) => {
                const cells = metrics.map(metric => {
                    const values = viewers.map(v => means[v][metric]).filter(v => !isNaN(v));
                    const value = means[viewer][metric];
                    let cls = '';
                    if (values.length > 1 && !INFO_METRICS.has(metric)) {
                        const min = Math.min.apply(null, values);
                        const max = Math.max.apply(null, values);
                        if (min !== max) {
                            cls = value === min ? 'better' : value === max ? 'worse' : '';
                        }
                    }
                    const digits = METRIC_DIGITS[metric] !== undefined ? METRIC_DIGITS[metric] : 1;
                    return '<td class="' + cls + '">' + fmt(value, digits) + '</td>';
                });
                rows.push('<tr class="' + (i === 0 ? 'group' : '') + '"><td class="key">' + (i === 0 ? key : '') +
                    '</td><td>' + (i === 0 ? group.runs : '') + '</td><td class="key">' + viewer + '</td>' +
                    cells.join('') + '</tr>');
            });
        }
        $('aggregate').querySelector('tbody').innerHTML = rows.join('');
        $('agg-skipped').textContent = skipped ? skipped + ' unreliable run' + (skipped === 1 ? '' : 's') +
            ' left out' : '';
    }

    // options: { loop: false, nextPass(pass) -> configs, autoExport: 0 }
    async function runConfigs(configs, options) {
        options = options || {};
        stopRequested = false;
        $('run').disabled = $('run-matrix').disabled = $('run-sweep').disabled = true;
        $('stop').disabled = false;
        const started = performance.now();
        let completed = 0;
        let failed = 0;
        let retried = 0;
        let pass = 1;
        try {
            while (!stopRequested) {
                for (let i = 0; i < configs.length && !stopRequested; i++) {
                    const label = (configs.length > 1 ? (options.loop ? 'pass ' + pass + ' ' : '') + (i + 1) + '/' +
                        configs.length + ' ' : '') + describe(configs[i]);
                    if (document.hidden) {
                        setStatus(label + ': paused while the tab is hidden');
                        while (document.hidden && !stopRequested) {
                            await wait(250);
                        }
                        if (stopRequested) {
                            break;
                        }
                        // Let the viewers catch up on the frames they missed before measuring anything.
                        await wait(500);
                    }
                    hiddenDuringRun = false;
                    try {
                        await runOne(configs[i], label);
                        completed++;
                    } catch (e) {
                        if (stopRequested) {
                            break;
                        }
                        if (hiddenDuringRun || e instanceof HiddenTabError) {
                            // Not a result: the same configuration runs again once the tab is visible.
                            retried++;
                            i--;
                            continue;
                        }
                        failed++;
                        results.push({ index: results.length + 1, at: new Date().toISOString(), config: configs[i],
                            error: e.message, viewers: {}, logs: {} });
                        renderResults();
                        setStatus(label + ': ' + e.message + ', skipped');
                        await wait(500);
                    }
                    if (configs.length > 1) {
                        const elapsed = (performance.now() - started) / 1000;
                        const perRun = elapsed / Math.max(1, completed + failed);
                        $('sweep-progress').textContent = 'pass ' + pass + ': ' + (i + 1) + ' / ' + configs.length +
                            '   completed ' + completed + '   failed ' + failed +
                            (retried ? '   redone (tab hidden) ' + retried : '') + '   elapsed ' +
                            fmt(elapsed / 60, 1) + ' min   ~' + fmt(perRun, 1) + ' s/run   pass ETA ' +
                            fmt((configs.length - i - 1) * perRun / 60, 1) + ' min';
                    }
                    if (options.autoExport > 0 && results.length - exportedUpTo >= options.autoExport) {
                        exportChunk();
                    }
                }
                if (!options.loop || stopRequested) {
                    break;
                }
                pass++;
                configs = options.nextPass(pass);
            }
            if (options.autoExport > 0 && results.length > exportedUpTo) {
                exportChunk();
            }
            setStatus(stopRequested ? 'stopped' : 'done');
        } finally {
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = 0;
            }
            $('run').disabled = $('run-matrix').disabled = $('run-sweep').disabled = false;
            $('stop').disabled = true;
        }
    }

    function exportPayload(rows) {
        return JSON.stringify({
            userAgent: navigator.userAgent,
            exportedAt: new Date().toISOString(),
            results: rows
        }, null, 1);
    }

    // Writes the results since the last auto-export, then drops their logs from memory so an unattended sweep
    // can run for hours; the summaries stay for the tables and the CSV.
    function exportChunk() {
        const rows = results.slice(exportedUpTo);
        const name = 'animationprefetch-runs-' + (exportedUpTo + 1) + '-' + results.length + '-' + stamp() + '.json';
        download(name, exportPayload(rows), 'application/json');
        for (const row of rows) {
            row.logs = null;
            row.logsExportedTo = name;
        }
        exportedUpTo = results.length;
    }

    function exportJson() {
        download('animationprefetch-' + stamp() + '.json', exportPayload(results), 'application/json');
    }

    function exportCsv() {
        const metrics = metricNames();
        const configKeys = ['preset', 'scenario', 'animationTime', 'stiffness', 'layers', 'layout', 'origins',
            'minPathDwell', 'arrivalSafety', 'repeat', 'swapOrder'];
        const healthKeys = ['frameMedianMs', 'frameP95Ms', 'timerLagP95Ms', 'timerLagMaxMs', 'unreliable'];
        const logKeys = ['pathFrameShare', 'meanPathSamples', 'retargeting', 'arrivalMs'];
        const reasonKeys = ['ok', 'dwell', 'noSlack', 'noTime', 'retargeting', 'destination'];
        const lines = [['run', 'at'].concat(configKeys, ['latency'], healthKeys, ['viewer', 'error'], metrics,
            logKeys.map(k => 'planner ' + k), reasonKeys.map(k => 'planner frames ' + k),
            ['tile wait median (ms)']).map(csvCell).join(',')];
        for (const row of results) {
            const head = [row.index, row.at].concat(configKeys.map(k => row.config[k]),
                [row.backend ? row.backend.latency : ''], healthKeys.map(k => row.health ? row.health[k] : ''));
            if (row.error) {
                lines.push(head.concat(['', row.error]).map(csvCell).join(','));
                continue;
            }
            for (const key in row.viewers) {
                const log = row.logs && row.logs[key];
                lines.push(head.concat([key, ''], metrics.map(m => row.viewers[key][m]),
                    logKeys.map(k => log ? log.planner[k] : ''),
                    reasonKeys.map(k => log && log.planner.reasons ? log.planner.reasons[k] || 0 : ''),
                    [log ? log.tileWaitMs.median : ''])
                    .map(csvCell).join(','));
            }
        }
        download('animationprefetch-' + stamp() + '.csv', lines.join('\n'), 'text/csv');
    }

    function updateMatrixSize() {
        const n = matrixConfigs().length;
        $('matrix-size').textContent = n + ' run' + (n === 1 ? '' : 's') + ' (layout and origins from the left)';
        const sweep = sweepConfigs(1).length;
        $('sweep-size').textContent = sweep + ' runs per pass (matrix x layouts x origins x dwell x safety x repeats), ' +
            'about ' + fmt(sweep * 12 / 60, 0) + ' min at ~12 s/run. Network presets (ticked under Matrix): ' +
            (checkedValues('.m-preset').join(', ') || 'none');
    }

    function runSweep() {
        const seed = parseInt($('seed').value, 10) || 1;
        runConfigs(sweepConfigs(seed), {
            loop: $('sweep-loop').checked,
            // A new order each pass, still reproducible from the seed.
            nextPass: pass => sweepConfigs(seed + pass - 1),
            autoExport: parseInt($('sweep-export').value, 10) || 0
        });
    }

    // ------------------------------------------------------------------------------------------------------
    // Page setup
    // ------------------------------------------------------------------------------------------------------
    const scenarioSelect = $('scenario');
    const matrixScenarios = $('matrix-scenarios');
    matrixScenarios.appendChild(document.createTextNode('Animations: '));
    for (const scenario of SCENARIOS) {
        const option = document.createElement('option');
        option.value = scenario.key;
        option.textContent = scenario.label;
        scenarioSelect.appendChild(option);

        const label = document.createElement('label');
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.className = 'm-scenario';
        box.value = scenario.key;
        box.checked = ['long-pan', 'zoom-in', 'wheel-burst', 'interrupted'].indexOf(scenario.key) > -1;
        label.appendChild(box);
        label.appendChild(document.createTextNode(scenario.key));
        matrixScenarios.appendChild(label);
    }
    scenarioSelect.value = 'long-pan';

    document.querySelectorAll('input[type=checkbox]').forEach(el => el.addEventListener('change', updateMatrixSize));
    $('run').addEventListener('click', () => runConfigs([singleConfig()]));
    $('run-matrix').addEventListener('click', () => runConfigs(matrixConfigs()));
    $('run-sweep').addEventListener('click', runSweep);
    $('sweep-order').addEventListener('change', updateMatrixSize);
    $('sweep-repeats').addEventListener('input', updateMatrixSize);
    $('agg-unreliable').addEventListener('change', renderResults);
    $('stop').addEventListener('click', () => {
        stopRequested = true;
    });
    $('clear').addEventListener('click', () => {
        results.length = 0;
        exportedUpTo = 0;
        renderResults();
    });
    $('export-json').addEventListener('click', exportJson);
    $('export-csv').addEventListener('click', exportCsv);
    updateMatrixSize();
    // Unused by the measurement, kept so the console can reach the runs while experimenting.
    window.animationPrefetchDemo = { runs: () => runs, results: results, scenarios: SCENARIOS, mean: mean };
}());
