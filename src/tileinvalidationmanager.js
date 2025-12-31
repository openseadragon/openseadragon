/*
 * OpenSeadragon - TileInvalidationManager
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
 * A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

(function($) {

/**
 * @class TileInvalidationManager
 * @memberof OpenSeadragon
 * @classdesc Manages the tile invalidation pipeline, handling asynchronous
 * tile data updates and cache swapping. This class encapsulates the complex
 * logic for processing tile-invalidated events.
 *
 * The invalidation pipeline:
 * 1. Marks tiles as processing
 * 2. Fires tile-invalidated events for each tile
 * 3. Handles working cache creation and data modifications
 * 4. Performs atomic cache swaps when modifications complete
 * 5. Prepares data for rendering
 *
 * @param {OpenSeadragon.World} world - The World instance this manager belongs to
 */
$.TileInvalidationManager = class {
    constructor(world) {
        /**
         * Reference to the World instance
         * @type {OpenSeadragon.World}
         * @private
         */
        this._world = world;

        /**
         * Current invalidation timestamp. Used to track which invalidation
         * cycle tiles belong to and detect outdated processing runs.
         * @type {number}
         * @private
         */
        this._invalidatedAt = 1;
    }

    /**
     * Get the current invalidation timestamp
     * @returns {number}
     */
    get invalidatedAt() {
        return this._invalidatedAt;
    }

    /**
     * Set the current invalidation timestamp
     * @param {number} value
     */
    set invalidatedAt(value) {
        this._invalidatedAt = value;
    }

    /**
     * Get the viewer reference
     * @returns {OpenSeadragon.Viewer}
     * @private
     */
    get _viewer() {
        return this._world.viewer;
    }

    /**
     * Process a single tile through the invalidation pipeline.
     * This is the core logic for handling one tile's data update cycle.
     *
     * @param {OpenSeadragon.Tile} tile - The tile to process
     * @param {number} tStamp - The timestamp for this invalidation cycle
     * @param {boolean} restoreTiles - Whether to restore tiles to original data
     * @param {boolean} _allowTileUnloaded - Allow processing of unloaded tiles
     * @param {boolean} _isFromTileLoad - Whether this is from initial tile load
     * @param {Array} tilesThatNeedReprocessing - Array to collect tiles needing reprocessing
     * @returns {Promise} Promise that resolves when tile processing completes
     * @private
     */
    _processTile(tile, tStamp, restoreTiles, _allowTileUnloaded, _isFromTileLoad, tilesThatNeedReprocessing) {
        // Skip invalid tiles
        if (!tile || (!_allowTileUnloaded && !tile.loaded && !tile.processing)) {
            return Promise.resolve();
        }

        const tiledImage = tile.tiledImage;
        const drawer = tiledImage.getDrawer();
        // Get event target - use parent viewer for nested viewers
        const eventTarget = drawer._parentViewer || this._viewer;
        const originalCache = tile.getCache(tile.originalCacheKey);
        const tileCache = tile.getCache(tile.originalCacheKey);

        // Skip if already processed with same or newer timestamp
        if (tileCache.__invStamp && tileCache.__invStamp >= tStamp) {
            return Promise.resolve();
        }

        // Handle interrupted processing
        let wasOutdatedRun = false;
        if (originalCache.__finishProcessing) {
            originalCache.__finishProcessing(true);
        }

        // Keep the original promise alive until processing finishes normally
        let promise;
        if (!originalCache.__resolve) {
            promise = new $.Promise((resolve) => {
                originalCache.__resolve = resolve;
            });
        }

        // Create finish processing callback
        originalCache.__finishProcessing = (asInvalidRun) => {
            wasOutdatedRun = wasOutdatedRun || asInvalidRun;
            tile.processing = false;
            originalCache.__finishProcessing = null;
            if (!asInvalidRun) {
                originalCache.__resolve(tile);
                originalCache.__resolve = null;
            }
        };

        // Mark all tiles sharing this cache as processing
        for (const t of originalCache._tiles) {
            t.processing = tStamp;
            if (promise) {
                t.processingPromise = promise;
            }
        }
        originalCache.__invStamp = tStamp;
        originalCache.__wasRestored = restoreTiles;

        // Working cache for modifications
        let workingCache = null;

        // Create getter for working cache data
        const getWorkingCacheData = (type) => {
            if (workingCache) {
                return workingCache.getDataAs(type, false);
            }

            const targetCopyKey = restoreTiles ? tile.originalCacheKey : tile.cacheKey;
            const origCache = tile.getCache(targetCopyKey);
            if (!origCache) {
                $.console.error("[Tile::getData] There is no cache available for tile with key %s", targetCopyKey);
                return $.Promise.reject();
            }
            type = type || origCache.type;
            workingCache = new $.CacheRecord().withTileReference(tile);
            return origCache.getDataAs(type, true).then(data => {
                workingCache.addTile(tile, data, type);
                return workingCache.data;
            });
        };

        // Create setter for working cache data
        const setWorkingCacheData = (value, type) => {
            if (!workingCache) {
                workingCache = new $.CacheRecord().withTileReference(tile);
                workingCache.addTile(tile, value, type);
                return $.Promise.resolve();
            }
            return workingCache.setDataAs(value, type);
        };

        // Atomic cache swap operation
        const atomicCacheSwap = () => {
            if (workingCache) {
                const newCacheKey = tile.buildDistinctMainCacheKey();
                tiledImage._tileCache.injectCache({
                    tile: tile,
                    cache: workingCache,
                    targetKey: newCacheKey,
                    setAsMainCache: true,
                    tileAllowNotLoaded: tile.loading
                });
            } else if (restoreTiles) {
                tiledImage._tileCache.restoreTilesThatShareOriginalCache(
                    tile,
                    tile.getCache(tile.originalCacheKey),
                    true
                );
            }
        };

        // Test if this run is outdated
        const outdatedTest = () => wasOutdatedRun ||
            (typeof originalCache.__invStamp === "number" && originalCache.__invStamp < this._invalidatedAt) ||
            (!tile.loaded && !tile.loading);

        /**
         * @event tile-invalidated
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.TiledImage} tiledImage - Which TiledImage is being drawn.
         * @property {OpenSeadragon.Tile} tile
         * @property {AsyncNullaryFunction<boolean>} outdated - predicate that evaluates to true if the event
         *   is outdated and should not be longer processed (has no effect)
         * @property {AsyncUnaryFunction<any, string>} getData - get data of desired type (string argument)
         * @property {AsyncBinaryFunction<undefined, any, string>} setData - set data (any)
         *   and the type of the data (string)
         * @property {function} resetData - function that deletes any previous data modification in the current
         *   execution pipeline
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        return eventTarget.raiseEventAwaiting('tile-invalidated', {
            tile: tile,
            tiledImage: tiledImage,
            outdated: outdatedTest,
            getData: getWorkingCacheData,
            setData: setWorkingCacheData,
            resetData: () => {
                if (workingCache) {
                    workingCache.destroy();
                    workingCache = null;
                }
            },
            stopPropagation: () => {
                return outdatedTest();
            },
        }).then(_ => {
            return this._handleTileProcessingComplete(
                tile, tiledImage, drawer, originalCache, workingCache,
                wasOutdatedRun, outdatedTest, atomicCacheSwap,
                tStamp, restoreTiles, _isFromTileLoad, tilesThatNeedReprocessing
            );
        }).catch(e => {
            $.console.error("Update routine error:", e);
            if (workingCache) {
                workingCache.destroy();
                workingCache = null;
            }
            originalCache.__finishProcessing();
        });
    }

    /**
     * Handle completion of tile processing after event handlers have run
     * @private
     */
    _handleTileProcessingComplete(tile, tiledImage, drawer, originalCache, workingCache,
                                   wasOutdatedRun, outdatedTest, atomicCacheSwap,
                                   tStamp, restoreTiles, _isFromTileLoad, tilesThatNeedReprocessing) {
        if (this._viewer.isDestroyed()) {
            originalCache.__finishProcessing(true);
            return null;
        }

        if (originalCache.__finishProcessing) {
            if (!wasOutdatedRun && (tile.loaded || tile.loading)) {
                // Check if processing was outdated
                if (originalCache.__invStamp < this._invalidatedAt) {
                    tilesThatNeedReprocessing.push(tile);
                } else if (originalCache.__invStamp === tStamp) {
                    // Handle working cache if created
                    if (workingCache) {
                        return workingCache.prepareForRendering(drawer).then(c => {
                            if (!wasOutdatedRun) {
                                if (!outdatedTest() && c) {
                                    atomicCacheSwap();
                                } else {
                                    workingCache.destroy();
                                    workingCache = null;
                                }
                                originalCache.__finishProcessing();
                            } else {
                                workingCache.destroy();
                                workingCache = null;
                            }
                        });
                    }

                    // Handle restore tiles
                    if (restoreTiles) {
                        const mainCacheRef = tile.getCache();
                        const freshOriginalCacheRef = tile.getCache(tile.originalCacheKey);
                        if (mainCacheRef !== freshOriginalCacheRef) {
                            return freshOriginalCacheRef.prepareForRendering(drawer).then((c) => {
                                if (!wasOutdatedRun) {
                                    if (!outdatedTest() && c) {
                                        atomicCacheSwap();
                                    }
                                    originalCache.__finishProcessing();
                                }
                            });
                        }
                        return null;
                    }
                } else {
                    $.console.error(
                        `Invalidation flow error: tile processing state is invalid. ` +
                        `Tile: ${tile ? tile.toString() : 'null'}, ` +
                        `loaded: ${tile ? tile.loaded : 'n/a'}, loading: ${tile ? tile.loading : 'n/a'}, ` +
                        `originalCache.__invStamp: ${originalCache.__invStamp}, ` +
                        `this._invalidatedAt: ${this._invalidatedAt}, ` +
                        `tStamp: ${tStamp}, wasOutdatedRun: ${wasOutdatedRun}`
                    );
                }

                // Handle first tile load
                if (_isFromTileLoad) {
                    const freshMainCacheRef = tile.getCache();
                    return freshMainCacheRef.prepareForRendering(drawer).then(() => {
                        if (!wasOutdatedRun && originalCache.__finishProcessing) {
                            originalCache.__finishProcessing();
                        }
                    });
                }
                originalCache.__finishProcessing();
                return null;
            }

            if (!wasOutdatedRun) {
                originalCache.__finishProcessing(true);
            }
        }

        // Handle first tile load from invalid event
        if (_isFromTileLoad) {
            const freshMainCacheRef = tile.getCache();
            return freshMainCacheRef.prepareForRendering(drawer).then(() => {
                if (!wasOutdatedRun && originalCache.__finishProcessing) {
                    originalCache.__finishProcessing();
                }
            });
        }

        if (workingCache) {
            workingCache.destroy();
            workingCache = null;
        }
        return null;
    }

    /**
     * Process a batch of tiles through the invalidation pipeline.
     *
     * @param {OpenSeadragon.Tile[]} tilesToProcess - Array of tiles to process
     * @param {number} [tStamp] - Timestamp for this invalidation cycle
     * @param {boolean} [restoreTiles=true] - Whether to restore tiles to original data
     * @param {boolean} [_allowTileUnloaded=false] - Allow processing of unloaded tiles
     * @param {boolean} [_isFromTileLoad=false] - Whether this is from initial tile load
     * @returns {OpenSeadragon.Promise} Promise that resolves when all tiles are processed
     */
    processTiles(tilesToProcess, tStamp, restoreTiles = true,
                 _allowTileUnloaded = false, _isFromTileLoad = false) {
        if (!this._viewer.isOpen()) {
            return $.Promise.resolve();
        }

        if (tStamp === undefined) {
            tStamp = this._invalidatedAt;
        }

        const tilesThatNeedReprocessing = [];

        const jobList = tilesToProcess.map(tile =>
            this._processTile(tile, tStamp, restoreTiles, _allowTileUnloaded,
                              _isFromTileLoad, tilesThatNeedReprocessing)
        );

        return $.Promise.all(jobList).then(() => {
            if (tilesThatNeedReprocessing.length) {
                this.processTiles(tilesThatNeedReprocessing, undefined, restoreTiles, true);
            }
            if (!_allowTileUnloaded && !this._viewer.isDestroyed()) {
                this._world.draw();
            }
        });
    }

    /**
     * Check if tiles need update and process those that do.
     *
     * @param {OpenSeadragon.Tile[]|Object[]} tileList - Array of tiles or draw-spec objects
     */
    ensureTilesUpToDate(tileList) {
        let updateList;
        let wasRestored;

        for (let tile of tileList) {
            tile = tile.tile || tile;  // Handle draw-spec objects with nested tile ref
            if (!tile.loaded || tile.processing) {
                continue;
            }

            const originalCache = tile.getCache(tile.originalCacheKey);
            wasRestored = originalCache.__wasRestored;
            if (originalCache.__invStamp < this._invalidatedAt) {
                if (!updateList) {
                    updateList = [tile];
                } else {
                    updateList.push(tile);
                }
            }
        }

        if (updateList && updateList.length) {
            this.processTiles(updateList, $.now(), wasRestored, false);
        }
    }

    /**
     * Request invalidation of all tiles across all tiled images.
     * Optimizes by prioritizing visible tiles and unloading off-screen tiles.
     *
     * @param {boolean} [restoreTiles=true] - Whether to restore tiles to original data
     * @param {number} [tStamp=OpenSeadragon.now()] - Timestamp for this invalidation cycle
     * @returns {OpenSeadragon.Promise} Promise that resolves when invalidation completes
     */
    requestInvalidate(restoreTiles = true, tStamp = $.now()) {
        this._invalidatedAt = tStamp;

        // Find minimum touch time among drawn tiles
        let drawnTstamp = Infinity;
        for (const item of this._world._items) {
            if (item._lastDrawn.length) {
                drawnTstamp = Math.min(drawnTstamp, item._lastDrawn[0].tile.lastTouchTime);
            }
            for (const tileSet of item._tilesToDraw) {
                if (Array.isArray(tileSet)) {
                    if (tileSet.length) {
                        drawnTstamp = Math.min(drawnTstamp, tileSet[0].tile.lastTouchTime);
                    }
                } else if (tileSet) {
                    drawnTstamp = Math.min(drawnTstamp, tileSet.tile.lastTouchTime);
                }
            }
        }

        const allTiles = this._viewer.tileCache.getLoadedTilesFor(null);
        const tilesToRestore = new Array(allTiles.length);

        let restoreIndex = 0;
        let deletedTiles = 0;

        const cache = this._viewer.tileCache;
        for (let i = 0; i < allTiles.length; i++) {
            const tile = allTiles[i];
            const isRecentlyTouched = tile.lastTouchTime >= drawnTstamp;
            const isAboveCutoff = tile.level <= (tile.tiledImage.source.getClosestLevel() || 0);

            if (isRecentlyTouched || isAboveCutoff) {
                tilesToRestore[restoreIndex++] = tile;
            } else {
                cache._unloadTile(tile, false, i - deletedTiles);
                deletedTiles++;
            }
        }
        tilesToRestore.length = restoreIndex;
        return this.processTiles(tilesToRestore, tStamp, restoreTiles);
    }
};

}(OpenSeadragon));
