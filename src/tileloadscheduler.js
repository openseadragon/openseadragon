/*
 * OpenSeadragon - TileLoadScheduler
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2025 OpenSeadragon contributors
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * - Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 *
 * - Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 *
 * - Neither the name of CodePlex Foundation nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

(function( $ ){

// Requests are bounded per origin, because that is what the browser and the server both bound: an HTTP/1.1
// origin gets about six connections, an HTTP/2 origin multiplexes over one and tolerates far more.
const BASE_LIMITS = {
    'http/1.1': 6,
    'http/1.0': 6,
    h2: 24,
    h2c: 24,
    h3: 24
};
// Conservative: over-requesting on HTTP/1.1 costs real head-of-line blocking, while under-requesting on
// HTTP/2 only costs a little latency.
const UNKNOWN_LIMIT = 6;
// Tiles that never yield an origin (data: URLs, blobs, custom loaders) all share one budget.
const FALLBACK_ORIGIN = '*';
// Resource timing entries seen from an origin without a protocol before detection gives up on it: a response
// without Timing-Allow-Origin reports none, and the header is a server setting, so later ones will not either.
const MAX_PROTOCOL_PROBES = 10;

// The per-origin budget adapts to the measured request wait, between MIN_BUDGET and the protocol ceiling.
// While the protocol is unknown the ceiling is PROBE_CEILING and the budget starts at UNKNOWN_LIMIT, so an
// origin that turns out to multiplex is discovered by probing rather than by a header most servers omit.
const MIN_BUDGET = 2;
const PROBE_CEILING = 24;
// The controller looks at one round of `budget` completions at a time and splits them by how many requests
// were in flight when each was dispatched. If the ones dispatched into a fuller pipeline waited longer by
// more than QUEUE_TOLERANCE, the pipeline is queueing somewhere and the budget shrinks by BUDGET_STEP; if
// they waited the same and every slot was in use, it grows by BUDGET_STEP. Comparing within a round makes
// the signal independent of when the round happened to fall: the bursts a pan produces supply both bands.
const BUDGET_STEP = 0.25;
// Queueing tolerance at GROW_BAND_SAMPLES per band; scaled up for fewer samples, down for more, so that a
// noisy little round only moves the budget on a strong signal.
const QUEUE_TOLERANCE = 0.15;
// A round can end once it holds at least `budget` completions (never fewer than MIN_ROUND) with at least
// MIN_BAND_SAMPLES in each band. That is enough evidence to shrink on; growing takes GROW_BAND_SAMPLES per
// band and GROW_ROUNDS consecutive flat rounds, since growing into a queue costs more than staying put.
// A round that cannot fill both bands within STALE_ROUNDS times its length is discarded, its samples being
// too old to describe one state of the origin. After a shrink, HOLD_ROUNDS rounds pass before growing.
const MIN_ROUND = 6;
const MIN_BAND_SAMPLES = 2;
const GROW_BAND_SAMPLES = 4;
const GROW_ROUNDS = 2;
const STALE_ROUNDS = 6;
const HOLD_ROUNDS = 4;

const PROTOCOL_ALIASES = {
    'http/2': 'h2',
    http2: 'h2',
    'http/3': 'h3',
    http3: 'h3',
    'http1.1': 'http/1.1',
    'http/1': 'http/1.1'
};

/**
 * @class TileLoadScheduler
 * @memberof OpenSeadragon
 * @classdesc Decides how many tile downloads may be in flight, and which tiles they should be. Internal:
 * configured through the viewer's serverProtocol option, not used directly.
 *
 * There is one instance for the whole page ({@link OpenSeadragon.tileLoadScheduler}), because the limit that
 * matters is per origin and several viewers on a page routinely share one tile server. Dispatch is driven by
 * request completion rather than by the frame loop, so download throughput follows network latency instead
 * of the client's frame rate.
 *
 * Each participating {@link OpenSeadragon.TiledImage} publishes a ranked wish list once per frame; the
 * scheduler round-robins over the images and takes the head of each list while the origin has capacity.
 * Because a wish list is rebuilt from scratch every frame, a tile that is no longer wanted simply stops
 * being offered - no queue has to be cleared to abandon it.
 *
 * How many requests an origin carries is decided in two layers. The protocol - stated through the
 * serverProtocol option or detected from resource timing - gives a ceiling: about six for HTTP/1.1, which is
 * all the browser will open, considerably more for HTTP/2 and HTTP/3. Below that ceiling the budget adapts
 * to the wait each request actually sees, compared with how full the pipeline was when it was dispatched:
 * requests that wait longer for having been dispatched behind more others are queueing, and the budget
 * shrinks; requests that wait the same however many are ahead of them are not, and with every slot in use
 * the budget grows. A server that cannot keep up therefore gets fewer requests rather than a longer queue,
 * and an origin whose protocol could not be detected is grown upward from the HTTP/1.1 figure.
 */
$.TileLoadScheduler = function() {
    // origin -> { inFlight, protocol, probes, limit }, see _recordFor()
    this._origins = new Map();
    this._images = [];
    this._cursor = 0;
    this._pumping = false;
    this._observer = null;
    this._observing = false;
};

/** @lends OpenSeadragon.TileLoadScheduler.prototype */
$.TileLoadScheduler.prototype = {

    /**
     * Normalize a protocol identifier. Accepts the ALPN ids reported by the Performance API as well as the
     * friendlier spellings a developer is likely to write.
     * @private
     * @param {String|Boolean} protocol
     * @returns {String|null} a key of BASE_LIMITS, or null if unrecognized
     */
    normalizeProtocol: function(protocol) {
        if (!protocol || protocol === true || protocol === 'auto') {
            return null;
        }
        const key = String(protocol).toLowerCase();
        const aliased = PROTOCOL_ALIASES[key] || key;
        return BASE_LIMITS[aliased] ? aliased : null;
    },

    /**
     * The origin a URL belongs to, for budgeting purposes.
     * @private
     * @param {String} url
     * @returns {String}
     */
    originOf: function(url) {
        if (!url || typeof url !== 'string') {
            return FALLBACK_ORIGIN;
        }
        try {
            // Falls through to the shared bucket below wherever URL or its origin is unavailable.
            // eslint-disable-next-line compat/compat
            const origin = new URL(url, window.location.href).origin;
            // Opaque origins (data:, blob: in some browsers) stringify to "null"; they are not a real
            // connection pool, so they go in the shared bucket.
            return (!origin || origin === 'null') ? FALLBACK_ORIGIN : origin;
        } catch (e) {
            return FALLBACK_ORIGIN;
        }
    },

    /**
     * Register a tiled image that wants scheduled loading.
     * @private
     * @param {OpenSeadragon.TiledImage} tiledImage
     */
    register: function(tiledImage) {
        if (this._images.indexOf(tiledImage) === -1) {
            this._images.push(tiledImage);
            this._invalidateLimits();
        }
    },

    /**
     * Stop scheduling for a tiled image. Must be called when the image is destroyed, or the scheduler keeps
     * it - and everything it references - alive for the lifetime of the page.
     * @private
     * @param {OpenSeadragon.TiledImage} tiledImage
     */
    unregister: function(tiledImage) {
        const index = this._images.indexOf(tiledImage);
        if (index > -1) {
            this._images.splice(index, 1);
            if (this._cursor > index) {
                this._cursor--;
            }
            this._invalidateLimits();
        }
    },

    /**
     * Record which origin an image's tiles come from, learned from its first dispatched tile. This is also
     * the first moment protocol detection has anything to look for.
     * @private
     * @param {OpenSeadragon.TiledImage} tiledImage
     * @param {String} url of the tile being dispatched
     */
    assignOrigin: function(tiledImage, url) {
        tiledImage._schedulerOrigin = this.originOf(url);
        // The image leaves the shared bucket, so both budgets change.
        this._invalidateLimit(FALLBACK_ORIGIN);
        this._invalidateLimit(tiledImage._schedulerOrigin);
        if (this._needsDetection()) {
            this._startObserving();
        }
    },

    /**
     * @private
     * @returns {Boolean} whether any image is currently using the scheduler
     */
    isEnabled: function() {
        return this._images.length > 0;
    },

    /**
     * Book a slot on an origin. Called when a request is dispatched, not when it reaches the wire: a job
     * waiting behind imageLoaderLimit, or staged for batching, is still work we have committed to.
     * @private
     * @param {String} [origin] falsey means the shared budget
     * @returns {Number} how many requests the origin carries now, this one included; hand it back to
     *   noteFinish() so the wait can be compared with the pipeline it was dispatched into
     */
    noteStart: function(origin) {
        const record = this._recordFor(origin);
        return ++record.inFlight;
    },

    /**
     * Release a slot on an origin and, for a request that completed, feed its wait to the budget controller.
     * @private
     * @param {String} [origin] falsey means the shared budget
     * @param {Number} [waitMs] milliseconds from dispatch to delivery; omitted for aborted or failed requests
     * @param {Number} [concurrency] what noteStart() returned for this request
     */
    noteFinish: function(origin, waitMs, concurrency) {
        const record = this._recordFor(origin);
        record.inFlight = Math.max(0, record.inFlight - 1);
        if (typeof waitMs !== 'number' || !(waitMs >= 0)) {
            return;
        }

        const budget = this.budgetFor(origin);
        // Dispatched into the emptier or the fuller half of the budget.
        if (!(concurrency > Math.ceil(budget / 2))) {
            record.lowSum += waitMs;
            record.lowCount++;
        } else {
            record.highSum += waitMs;
            record.highCount++;
        }
        // One decision per round, so a change gets a chance to show before the next.
        const roundLength = Math.max(budget, MIN_ROUND);
        record.roundCount++;
        const samples = Math.min(record.lowCount, record.highCount);
        if (record.roundCount >= roundLength && samples >= MIN_BAND_SAMPLES) {
            this._adjustBudget(origin, record, samples);
        } else if (record.roundCount >= STALE_ROUNDS * roundLength) {
            this._resetRound(record);
        }
    },

    // private
    _resetRound: function(record) {
        record.lowSum = record.highSum = 0;
        record.lowCount = record.highCount = 0;
        record.roundCount = 0;
        record.saturated = false;
    },

    // private
    // The budget controller, run whenever a round has enough samples to say something.
    _adjustBudget: function(origin, record, samples) {
        const ceiling = this.limitFor(origin);
        const budget = this.budgetFor(origin);
        const low = record.lowSum / record.lowCount;
        const high = record.highSum / record.highCount;
        const tolerance = 1 + QUEUE_TOLERANCE * Math.sqrt(GROW_BAND_SAMPLES / samples);

        if (high > low * tolerance) {
            // Requests dispatched behind more others waited longer: they were queueing - in the browser
            // past its connection limit, at the server, or on the link - and fewer in flight will not
            // slow anything down.
            this._resetRound(record);
            record.budget = Math.max(MIN_BUDGET, Math.round(budget * (1 - BUDGET_STEP)));
            record.hold = HOLD_ROUNDS;
            record.flatRounds = 0;
            return;
        }
        if (samples < GROW_BAND_SAMPLES) {
            // Flat, but on too little to build on: let the round run on.
            return;
        }

        const saturated = record.saturated;
        this._resetRound(record);
        if (record.hold > 0) {
            record.hold--;
        }
        if (++record.flatRounds >= GROW_ROUNDS && saturated && budget < ceiling && record.hold === 0) {
            // Same wait however full the pipeline, round after round, and every slot was in use: the
            // origin takes more.
            record.budget = Math.min(ceiling, budget + Math.max(1, Math.round(budget * BUDGET_STEP)));
            record.flatRounds = 0;
        }
    },

    /**
     * Record the wire protocol observed for an origin.
     * @private
     * @param {String} origin
     * @param {String} protocol
     */
    noteProtocol: function(origin, protocol) {
        const normalized = this.normalizeProtocol(protocol);
        if (normalized) {
            const record = this._recordFor(origin);
            record.protocol = normalized;
            record.limit = 0;
            // The table beats whatever the controller had reached; it starts over from there.
            record.budget = 0;
            this._resetRound(record);
            record.hold = 0;
            record.flatRounds = 0;
            if (this._observing && !this._needsDetection()) {
                this._stopObserving();
            }
        }
    },

    /**
     * The most concurrent requests this origin may ever carry: what its protocol allows, capped by
     * imageLoaderLimit. Scans the registered images, so the answer is cached on the origin and invalidated
     * by whatever can change it: registration, origin discovery and protocol detection. The budget actually
     * used sits at or below this, see budgetFor().
     * @private
     * @param {String} [origin] falsey means the shared budget
     * @returns {Number}
     */
    limitFor: function(origin) {
        origin = origin || FALLBACK_ORIGIN;
        const record = this._recordFor(origin);
        if (record.limit) {
            return record.limit;
        }

        let limit = Infinity;
        for (const image of this._images) {
            // Before its first tile is dispatched an image has no known origin and draws on the shared budget.
            if ((image._schedulerOrigin || FALLBACK_ORIGIN) !== origin) {
                continue;
            }

            // An explicit protocol beats a detected one, and where several images disagree about an origin
            // the most conservative answer wins. Unknown means "probe": the ceiling is generous and the
            // budget starts low, see budgetFor().
            const protocol = this.normalizeProtocol(image.serverProtocol) || record.protocol;
            limit = Math.min(limit, protocol ? BASE_LIMITS[protocol] : PROBE_CEILING);

            // imageLoaderLimit is enforced by the loader queue anyway; matching it here just avoids
            // dispatching tiles that would only sit in that queue.
            const jobLimit = image._imageLoader && image._imageLoader.jobLimit;
            if (jobLimit) {
                limit = Math.min(limit, jobLimit);
            }
        }
        record.limit = limit === Infinity ? UNKNOWN_LIMIT : limit;
        return record.limit;
    },

    /**
     * How many requests this origin should carry right now: the adaptive budget, never above limitFor().
     * A stated or detected protocol is trusted and the budget starts at the ceiling; an unknown one starts
     * at the HTTP/1.1 figure and is probed upward by the controller in noteFinish().
     * @private
     * @param {String} [origin] falsey means the shared budget
     * @returns {Number}
     */
    budgetFor: function(origin) {
        const ceiling = this.limitFor(origin);
        const record = this._recordFor(origin);
        if (!record.budget) {
            record.budget = record.protocol || ceiling < UNKNOWN_LIMIT || this._hasStatedProtocol(origin) ?
                ceiling : UNKNOWN_LIMIT;
        }
        return Math.min(record.budget, ceiling);
    },

    /**
     * @private
     * @param {String} [origin] falsey means the shared budget
     * @returns {Number} requests currently booked against the origin
     */
    inFlightFor: function(origin) {
        return this._recordFor(origin).inFlight;
    },

    /**
     * Dispatch as many wanted tiles as the origins have room for, taking one tile from each image in turn so
     * that a busy image cannot starve a quiet one. Visibility scores are computed against each image's own
     * pyramid, so they are not comparable across images and cannot be used to order them.
     */
    pump: function() {
        // Dispatching can complete synchronously (cached data, mock sources, failures), and completion pumps
        // again; the outer sweep already repeats while anything moves, so the nested call has nothing to add.
        if (this._pumping) {
            return;
        }
        this._pumping = true;

        const images = this._images;
        let dispatched;
        try {
            // Each sweep hands out at most one tile per image. Repeat while anything is still moving, so a
            // completion that frees several slots refills all of them without waiting for the next frame.
            // The list can shrink during a sweep (an image destroyed from a load callback), hence the re-checks.
            do {
                dispatched = false;
                const count = images.length;
                for (let i = 0; i < count && images.length; i++) {
                    const image = images[(this._cursor + i) % images.length];
                    if (image && this._dispatchOne(image)) {
                        dispatched = true;
                    }
                }
                if (images.length) {
                    this._cursor = (this._cursor + 1) % images.length;
                }
            } while (dispatched && images.length);
        } finally {
            // A tile source throwing from a load callback must not leave the scheduler stuck as "pumping".
            this._pumping = false;
        }
    },

    // private
    _dispatchOne: function(image) {
        const wishList = image._wishList;
        if (!wishList || !wishList.length) {
            return false;
        }

        const record = this._recordFor(image._schedulerOrigin);
        if (record.inFlight >= this.budgetFor(image._schedulerOrigin)) {
            // Remembered for the controller: growing the budget only makes sense if it was actually used up.
            record.saturated = true;
            return false;
        }

        while (wishList.length) {
            const tile = wishList[0];
            // Destination tiles are ranked ahead of tiles merely on the animation path, so the first path
            // tile marks the end of the destination. Path tiles are stale a few frames later; they get one
            // dispatch per frame, enough to keep a pan from going blank, not enough to flood the origin.
            if (tile && tile.inLoadArea === false && image._pathDispatched >= 1) {
                return false;
            }
            wishList.shift();
            // The list was built before the most recent completions landed, so a tile in it may already
            // have been satisfied elsewhere.
            if (tile && !tile.loaded && !tile.loading) {
                if (tile.inLoadArea === false) {
                    image._pathDispatched++;
                }
                image._loadTile(tile, image._wishListTime);
                return true;
            }
        }
        return false;
    },

    // private
    // Whether some image on the origin states its protocol outright, in which case the controller trusts
    // the table for its starting point instead of probing up from the HTTP/1.1 figure.
    _hasStatedProtocol: function(origin) {
        origin = origin || FALLBACK_ORIGIN;
        for (const image of this._images) {
            if ((image._schedulerOrigin || FALLBACK_ORIGIN) === origin && this.normalizeProtocol(image.serverProtocol)) {
                return true;
            }
        }
        return false;
    },

    // private
    // The single funnel for every per-origin read and write, and therefore the one place that has to know
    // what an absent origin means: an image whose first tile has not been dispatched yet, or a tile with no
    // real origin at all, draws on the shared budget.
    _recordFor: function(origin) {
        origin = origin || FALLBACK_ORIGIN;
        let record = this._origins.get(origin);
        if (!record) {
            record = {
                inFlight: 0,
                // detected wire protocol, a key of BASE_LIMITS
                protocol: null,
                // resource entries seen without a protocol, see MAX_PROTOCOL_PROBES
                probes: 0,
                // cached limitFor() answer, 0 when it has to be recomputed
                limit: 0,
                // adaptive budget, 0 until budgetFor() initialises it
                budget: 0,
                // controller state, see noteFinish() and _adjustBudget()
                lowSum: 0,
                lowCount: 0,
                highSum: 0,
                highCount: 0,
                roundCount: 0,
                saturated: false,
                hold: 0,
                flatRounds: 0
            };
            this._origins.set(origin, record);
        }
        return record;
    },

    // private
    _invalidateLimit: function(origin) {
        const record = this._origins.get(origin || FALLBACK_ORIGIN);
        if (record) {
            record.limit = 0;
        }
    },

    // private
    _invalidateLimits: function() {
        for (const record of this._origins.values()) {
            record.limit = 0;
        }
    },

    // private
    // Whether some image still waits for its origin's protocol to be detected. Only such images justify
    // watching resource timing, which otherwise costs a callback for every resource the page loads.
    _needsDetection: function() {
        for (const image of this._images) {
            const origin = image._schedulerOrigin;
            if (!origin || origin === FALLBACK_ORIGIN || this.normalizeProtocol(image.serverProtocol)) {
                continue;
            }
            const record = this._origins.get(origin);
            if (!record || (record.protocol === null && record.probes < MAX_PROTOCOL_PROBES)) {
                return true;
            }
        }
        return false;
    },

    // private
    _startObserving: function() {
        if (this._observing) {
            return;
        }
        if (typeof PerformanceObserver === 'undefined') {
            $.console.warn('PerformanceObserver not available, tile loading concurrency will use the ' +
                'conservative default. Set the serverProtocol option explicitly.');
            return;
        }

        const _this = this;
        try {
            const observer = new PerformanceObserver(function(list) {
                for (const entry of list.getEntries()) {
                    const origin = _this.originOf(entry.name);
                    const record = _this._origins.get(origin);
                    if (!record) {
                        // not a tile server of ours
                        continue;
                    }
                    // nextHopProtocol is the empty string for a cross-origin response without a
                    // Timing-Allow-Origin header, which is the default for most tile servers. That is why
                    // serverProtocol can also be stated outright.
                    if (entry.nextHopProtocol) {
                        _this.noteProtocol(origin, entry.nextHopProtocol);
                    } else {
                        record.probes++;
                    }
                }
                if (_this._observing && !_this._needsDetection()) {
                    _this._stopObserving();
                }
            });
            // buffered picks up responses that arrived before the first scheduled image was registered.
            observer.observe({ type: 'resource', buffered: true });
            this._observer = observer;
            this._observing = true;
        } catch (e) {
            $.console.warn('Could not observe resource timing, tile loading concurrency will use the ' +
                'conservative default. Set the serverProtocol option explicitly.', e);
        }
    },

    // private
    _stopObserving: function() {
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
        this._observing = false;
    },

    /**
     * Drop all state. Intended for tests.
     */
    reset: function() {
        this._origins.clear();
        this._images.length = 0;
        this._cursor = 0;
        this._pumping = false;
        this._stopObserving();
    }
};

/**
 * The page-wide tile load scheduler.
 * @member {OpenSeadragon.TileLoadScheduler} tileLoadScheduler
 * @memberof OpenSeadragon
 */
$.tileLoadScheduler = new $.TileLoadScheduler();

}( OpenSeadragon ));
