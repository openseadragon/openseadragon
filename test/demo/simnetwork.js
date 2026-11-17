/* global OpenSeadragon */
// Shared by the tile loading demos (tileloadscheduler.html, animationprefetch.html): a simulated network and
// tile server, a synthetic tile source on top of it, and small helpers for statistics and export.
(function () {
    'use strict';

    const PRESETS = {
        'h1-lan':       { protocol: 'http/1.1', latency: 20,  workers: 8,  service: 8,  jitter: 0.3, bandwidth: 1000 },
        'h1-wan':       { protocol: 'http/1.1', latency: 120, workers: 8,  service: 10, jitter: 0.3, bandwidth: 50 },
        'h2-wan':       { protocol: 'h2',       latency: 120, workers: 16, service: 10, jitter: 0.3, bandwidth: 50 },
        'h2-slow':      { protocol: 'h2',       latency: 60,  workers: 4,  service: 40, jitter: 0.3, bandwidth: 50 },
        'h2-mobile':    { protocol: 'h2',       latency: 300, workers: 8,  service: 10, jitter: 0.5, bandwidth: 4 },
        'h1-satellite': { protocol: 'http/1.1', latency: 600, workers: 8,  service: 10, jitter: 0.3, bandwidth: 10 }
    };
    const CONNECTIONS = { 'http/1.1': 6, h2: 100 };

    // ------------------------------------------------------------------------------------------------------
    // Simulated network + server. Use one instance per origin and viewer, so compared runs do not compete.
    // A request goes: browser connection queue -> half the round trip -> server worker queue -> service
    // time -> transfer over the shared link -> half the round trip -> delivered. The browser queue is FIFO
    // and cannot be reordered, which is exactly what over-requesting costs: tiles for a view the user
    // already left still get served first. The link is shared: a transfer's duration is set when it starts
    // from the bandwidth divided by the transfers then in progress (processor sharing, approximated).
    // cfg: { connections, latency, workers, service, jitter, bandwidth (Mbit/s, 0 = unlimited), tileKB }
    // ------------------------------------------------------------------------------------------------------
    class SimBackend {
        constructor(cfg) {
            this.cfg = cfg;
            this.queue = [];
            this.serverQueue = [];
            this.inFlight = 0;
            this.serverBusy = 0;
            this.transfers = 0;
            this.stopped = false;
            this.stats = {
                requested: 0, delivered: 0, abortedQueued: 0, abortedInFlight: 0, wastedServer: 0,
                waits: [], maxQueue: 0, maxInFlight: 0, maxTransfers: 0
            };
        }

        request(onDeliver) {
            const req = { t0: performance.now(), state: 'queued', cancelled: false, onDeliver: onDeliver };
            this.stats.requested++;
            this.queue.push(req);
            this._pump();
            // Measured after the pump: a request that went straight onto a free connection never queued.
            this.stats.maxQueue = Math.max(this.stats.maxQueue, this.queue.length);
            return req;
        }

        cancel(req) {
            if (req.state === 'queued') {
                const index = this.queue.indexOf(req);
                if (index > -1) {
                    this.queue.splice(index, 1);
                }
                req.state = 'cancelled';
                this.stats.abortedQueued++;
            } else if (req.state !== 'done' && req.state !== 'cancelled') {
                // An aborted request frees its connection right away; whatever the server is still doing
                // for it is wasted.
                req.cancelled = true;
                req.state = 'cancelled';
                this.stats.abortedInFlight++;
                this._release();
            }
        }

        stop() {
            this.stopped = true;
        }

        _after(ms, fn) {
            setTimeout(() => {
                if (!this.stopped) {
                    fn();
                }
            }, ms);
        }

        _jittered(ms) {
            const j = this.cfg.jitter || 0;
            return ms * (1 - j + Math.random() * 2 * j);
        }

        _pump() {
            while (this.inFlight < this.cfg.connections && this.queue.length) {
                const req = this.queue.shift();
                req.state = 'wire';
                this.inFlight++;
                this.stats.maxInFlight = Math.max(this.stats.maxInFlight, this.inFlight);
                this._after(this._jittered(this.cfg.latency / 2), () => this._arrive(req));
            }
        }

        _arrive(req) {
            if (req.cancelled) {
                return;
            }
            this.serverQueue.push(req);
            this._serve();
        }

        _serve() {
            while (this.serverBusy < this.cfg.workers && this.serverQueue.length) {
                const req = this.serverQueue.shift();
                if (req.cancelled) {
                    continue;
                }
                req.state = 'serving';
                this.serverBusy++;
                this._after(this._jittered(this.cfg.service), () => {
                    this.serverBusy--;
                    this._serve();
                    if (req.cancelled) {
                        this.stats.wastedServer++;
                        return;
                    }
                    this._transfer(req);
                });
            }
        }

        _transfer(req) {
            req.state = 'transfer';
            this.transfers++;
            this.stats.maxTransfers = Math.max(this.stats.maxTransfers, this.transfers);
            // kbit / (Mbit/s / n) = ms
            const ms = this.cfg.bandwidth > 0 ? this.cfg.tileKB * 8 / (this.cfg.bandwidth / this.transfers) : 0;
            this._after(this._jittered(ms), () => {
                this.transfers--;
                if (req.cancelled) {
                    return;
                }
                this._after(this._jittered(this.cfg.latency / 2), () => this._deliver(req));
            });
        }

        _deliver(req) {
            if (req.cancelled) {
                return;
            }
            req.state = 'done';
            this._release();
            this.stats.delivered++;
            this.stats.waits.push(performance.now() - req.t0);
            req.onDeliver();
        }

        _release() {
            this.inFlight--;
            this._pump();
        }
    }

    // ------------------------------------------------------------------------------------------------------
    // Synthetic tile source: every tile is rasterized locally, its "download" goes through the SimBackend.
    // options: { size = 65536, tileSize = 256, hue = 0, onDeliver(context) }
    // ------------------------------------------------------------------------------------------------------
    function makeTileSource(backend, origin, options) {
        options = options || {};
        const size = options.size || 65536;
        const tileSize = options.tileSize || 256;
        const hueShift = options.hue || 0;
        const source = new OpenSeadragon.TileSource({
            width: size,
            height: size,
            tileSize: tileSize,
            tileOverlap: 0
        });
        source.getTileUrl = function (level, x, y) {
            return origin + '/' + level + '/' + x + '_' + y + '.jpg';
        };
        source.downloadTileStart = function (context) {
            context.userData.req = backend.request(function () {
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = tileSize;
                const ctx = canvas.getContext('2d');
                const parts = context.src.split('/');
                const level = parseInt(parts[parts.length - 2], 10);
                const hue = (hueShift + level * 47 + parseInt(parts[parts.length - 1], 10) * 13) % 360;
                ctx.fillStyle = 'hsl(' + hue + ', 60%, ' + (35 + (level % 5) * 10) + '%)';
                ctx.fillRect(0, 0, tileSize, tileSize);
                ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                ctx.strokeRect(0.5, 0.5, tileSize - 1, tileSize - 1);
                ctx.fillStyle = '#fff';
                ctx.font = Math.round(tileSize / 13) + 'px monospace';
                ctx.fillText(parts[parts.length - 2] + ' ' + parts[parts.length - 1].replace('.jpg', ''),
                    tileSize / 20, tileSize / 8);
                if (options.onDeliver) {
                    options.onDeliver(context);
                }
                context.finish(ctx, null, 'context2d');
            });
        };
        source.downloadTileAbort = function (context) {
            if (context.userData.req) {
                backend.cancel(context.userData.req);
            }
        };
        return source;
    }

    // ------------------------------------------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------------------------------------------
    function mulberry32(seed) {
        let a = seed >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function percentile(values, p) {
        if (!values.length) {
            return NaN;
        }
        const sorted = values.slice().sort((a, b) => a - b);
        return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
    }

    function mean(values) {
        return values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN;
    }

    function fmt(value, digits) {
        if (typeof value !== 'number' || isNaN(value)) {
            return '-';
        }
        return value.toFixed(digits === undefined ? 0 : digits);
    }

    function download(name, text, type) {
        const blob = new Blob([text], { type: type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function stamp() {
        return new Date().toISOString().replace(/[:.]/g, '-');
    }

    function csvCell(value) {
        if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) {
            return '';
        }
        const text = String(value);
        return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
    }

    window.SimNetwork = {
        PRESETS: PRESETS,
        CONNECTIONS: CONNECTIONS,
        SimBackend: SimBackend,
        makeTileSource: makeTileSource,
        mulberry32: mulberry32,
        percentile: percentile,
        mean: mean,
        fmt: fmt,
        download: download,
        stamp: stamp,
        csvCell: csvCell
    };
}());
