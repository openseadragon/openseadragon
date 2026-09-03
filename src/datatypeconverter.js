/*
 * OpenSeadragon.converter (static property)
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2025 OpenSeadragon contributors

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

(function($){

const OpenSeadragon = $; // alias for JSDoc

/**
 * modified from https://gist.github.com/Prottoy2938/66849e04b0bac459606059f5f9f3aa1a
 * @private
 */
class WeightedGraph {
    constructor() {
        this.adjacencyList = {};
        this.vertices = {};
    }

    /**
     * Add vertex to graph
     * @param vertex unique vertex ID
     * @return {boolean} true if inserted, false if exists (no-op)
     */
    addVertex(vertex) {
        if (!this.vertices[vertex]) {
            this.vertices[vertex] = new $.PriorityQueue.Node(0, vertex);
            this.adjacencyList[vertex] = [];
            return true;
        }
        return false;
    }

    /**
     * Add edge to graph
     * @param vertex1 id, must exist by calling addVertex()
     * @param vertex2 id, must exist by calling addVertex()
     * @param weight
     * @param transform function that transforms on path vertex1 -> vertex2
     * @return {boolean} true if new edge, false if replaced existing
     */
    addEdge(vertex1, vertex2, weight, transform) {
        if (weight < 0) {
            $.console.error("WeightedGraph: negative weights will make for invalid shortest path computation!");
        }
        const outgoingPaths = this.adjacencyList[vertex1],
            replacedEdgeIndex = outgoingPaths.findIndex(edge => edge.target === this.vertices[vertex2]),
            newEdge = { target: this.vertices[vertex2], origin: this.vertices[vertex1], weight, transform };
        if (replacedEdgeIndex < 0) {
            this.adjacencyList[vertex1].push(newEdge);
            return true;
        }
        this.adjacencyList[vertex1][replacedEdgeIndex] = newEdge;
        return false;
    }

    /**
     * @return {{path: ConversionStep[], cost: number}|undefined} cheapest path from start to finish
     */
    dijkstra(start, finish) {
        const path = []; //to return at end
        if (start === finish) {
            return { path: path, cost: 0 };
        }
        const nodes = new OpenSeadragon.PriorityQueue();
        let smallestNode;
        //build up initial state
        for (let vertex in this.vertices) {
            vertex = this.vertices[vertex];
            if (vertex.value === start) {
                vertex.key = 0; //keys are known distances
                nodes.insertNode(vertex);
            } else {
                vertex.key = Infinity;
                delete vertex.index;
            }
            vertex._previous = null;
        }
        // as long as there is something to visit
        while (nodes.getCount() > 0) {
            smallestNode = nodes.remove();
            if (smallestNode.value === finish) {
                break;
            }
            const neighbors = this.adjacencyList[smallestNode.value];
            for (const neighborKey in neighbors) {
                const edge = neighbors[neighborKey];
                //relax node
                const newCost = smallestNode.key + edge.weight;
                const nextNeighbor = edge.target;
                if (newCost < nextNeighbor.key) {
                    nextNeighbor._previous = smallestNode;
                    //key change
                    nodes.decreaseKey(nextNeighbor, newCost);
                }
            }
        }

        if (!smallestNode || !smallestNode._previous || smallestNode.value !== finish) {
            return undefined; //no path
        }

        const finalCost = smallestNode.key; //final weight last node

        // done, build the shortest path
        while (smallestNode._previous) {
            //backtrack
            const to = smallestNode.value,
                parent = smallestNode._previous,
                from = parent.value;

            path.push(this.adjacencyList[from].find(x => x.target.value === to));
            smallestNode = parent;
        }

        return {
            path: path.reverse(),
            cost: finalCost
        };
    }
}

let _imageConversionWorker;
let _conversionId = 0;
// id -> { resolve, reject, timer? }
const _pendingConversions = new Map();
let __warnedNoSAB = false;
const __hasSAB = typeof SharedArrayBuffer !== 'undefined' && self.crossOriginIsolated === true;

function getIBWorker() {
    if (_imageConversionWorker) {
        return _imageConversionWorker;
    }

    const code = `
self.onmessage = async (e) => {
  const { id, op, } = e.data;
  let error;
  try {
    if (op === 'decodeFromBlob') {
      const bmp = await createImageBitmap(e.data.blob, { colorSpaceConversion: 'none' });
      postMessage({ id, ok: true, bmp }, [bmp]);
      return;
    }
    if (op === 'decodeFromBytes') {
      const u8 = new Uint8Array(e.data.bytes);
      const b  = new Blob([u8], { type: e.data.mime || '' });
      const bmp = await createImageBitmap(b, { colorSpaceConversion: 'none' });
      postMessage({ id, ok: true, bmp }, [bmp]);
      return;
    }
    if (op === 'fetchDecode') {
      const res = await fetch(e.data.url, e.data.setup);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const b = await res.blob();
      const bmp = await createImageBitmap(b, { colorSpaceConversion: 'none' });
      postMessage({ id, ok: true, bmp }, [bmp]);
      return;
    }
    error = 'Unknown op: ' + op;
  } catch (err) {
    error = String(err && err.message || err);
  }
  postMessage({ id, ok: false, err: error });
};
`;
    // eslint-disable-next-line compat/compat
    const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    _imageConversionWorker = new Worker(url);

    _imageConversionWorker.onmessage = (e) => {
        const { id, ok, bmp, err } = e.data || {};
        const entry = _pendingConversions.get(id);
        if (!entry) {
            return;
        }
        _pendingConversions.delete(id);
        if (entry.timer) {
            clearTimeout(entry.timer);
            entry.timer = null;
        }
        if (ok) {
            entry.resolve(bmp);
        } else {
            entry.reject(new Error(err));
        }
    };

    _imageConversionWorker.onerror = (e) => {
        for (const [, entry] of _pendingConversions) {
            if (entry.timer) {
                clearTimeout(entry.timer);
                entry.timer = null;
            }
            entry.reject(new Error('Worker error'));
        }
        _pendingConversions.clear();
    };
    return _imageConversionWorker;
}

function postWorker(op, payload, { timeoutMs = 15000 } = {}) {
    const worker = getIBWorker();
    const id = ++_conversionId;

    return new $.Promise((resolve, reject) => {
        // possibly test $.supportsPromise here as well...
        payload.id = id;
        payload.op = op;

        const entry = { resolve, reject, timer: null };
        if (timeoutMs > 0) {
            entry.timer = setTimeout(() => {
                entry.timer = null;
                _pendingConversions.delete(id);
                reject(new Error(`Worker timeout (${op})`));
            }, timeoutMs);
        }
        _pendingConversions.set(id, entry);

        // postMessage() throws synchronously on a payload it cannot clone. Without this the entry would
        // sit in the pending map until the timeout above fires, stalling the tile for the full timeout.
        try {
            if (op === 'decodeFromBytes') {
                if (__hasSAB) {
                    const u8 = payload.u8;
                    // eslint-disable-next-line no-undef
                    const sab = new SharedArrayBuffer(u8.byteLength);
                    new Uint8Array(sab).set(u8);
                    worker.postMessage({ id, op, bytes: sab, mime: payload.mime });
                } else {
                    if (!__warnedNoSAB) {
                        __warnedNoSAB = true;
                        console.warn('[Converter] SharedArrayBuffer unavailable; falling back to ArrayBuffer.');
                    }
                    const u8 = payload.u8;
                    const tight = (u8.byteOffset === 0 && u8.byteLength === u8.buffer.byteLength) ? u8 : u8.slice();
                    worker.postMessage({ id, op, bytes: tight.buffer, mime: payload.mime }, [tight.buffer]);
                }
            } else {
                worker.postMessage(payload);
            }
        } catch (e) {
            if (entry.timer) {
                clearTimeout(entry.timer);
                entry.timer = null;
            }
            _pendingConversions.delete(id);
            reject(e);
        }
    });
}

/**
 * Edge.transform function on the conversion path in OpenSeadragon.converter.getConversionPath().
 *  It can be also conversion to undefined if used as destructor implementation.
 *
 * @callback TypeConverter
 * @memberof OpenSeadragon
 * @param {OpenSeadragon.Tile} tile reference tile that owns the data
 * @param {any} data data in the input format
 * @returns {any} data in the output format
 */

/**
 * Destructor called every time a data type is to be destroyed or converted to another type.
 *
 * @callback TypeDestructor
 * @memberof OpenSeadragon
 * @param {any} data data in the format the destructor is registered for
 * @returns {any} can return any value that is carried over to the caller if desirable.
 *   Note: not used by the OSD cache system.
 */

/**
 * Node on the conversion path in OpenSeadragon.converter.getConversionPath().
 *
 * @typedef {Object} ConversionStep
 * @memberof OpenSeadragon
 * @param {OpenSeadragon.PriorityQueue.Node} target - Target node of the conversion step.
 *  Its value is the target format.
 * @param {OpenSeadragon.PriorityQueue.Node} origin - Origin node of the conversion step.
 *  Its value is the origin format.
 * @param {number} weight cost of the conversion
 * @param {TypeConverter} transform the conversion itself
 */

/**
 * Class that orchestrates automated data types conversion. Do not instantiate
 * this class, use OpenSeadragon.converter - a global instance, instead.
 *
 * Types are defined to closely describe the data type, e.g. "url" is insufficient,
 * because url can point to many different data types. Another bad example is 'canvas'
 * as canvas can have different underlying rendering implementations and thus differ
 * in behavior. The following data types supported by
 * OpenSeadragon core are:
 * - "image" - HTMLImageElement, an <image> object
 * - "context2d" - HtmlRenderingContext2D, a 2D canvas context
 * - "rasterBlob" - Blob, a binary file-like object carrying image data
 * - "imageBitmap" - an ImageBitmap object
 *
 * The system uses these to deliver desired data from TileSource (which implements fetching logics)
 * through plugins to the renderer with preserving data type compatibility. Typical example is:
 *  TiledImage downloads and creates Image object with type 'image'. It submits
 *  to the system object of data type 'image'. The system runs this object through
 *  possible plugins integrated into the invalidation routine (by default none),
 *  and finishes by conversion for the WebGL renderer, which would most likely be "image"
 *  object, because the conversion in this case is not even necessary, as the drawer publishes
 *  the image type as one of its supported ones.
 *  If some plugin required context2d type, the pipeline would deliver this type and used
 *  it also for WebGL, as texture loading function accepts canvas object as well as image.
 *
 * @class OpenSeadragon.DataTypeConverter
 * @memberOf OpenSeadragon
 */
OpenSeadragon.DataTypeConverter = class DataTypeConverter {

    constructor() {
        this.graph = new WeightedGraph();
        this.destructors = {};
        this.copyings = {};

        // Teaching OpenSeadragon built-in conversions:
        const canvasContextCreator = (tile, imageData) => {
            const canvas = document.createElement('canvas');
            canvas.width = imageData.width;
            canvas.height = imageData.height;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            context.drawImage(imageData, 0, 0);
            return context;
        };

        // An Image can only be built from a URL, so a Blob has to go through a temporary object URL:
        // a data: URL would base64 encode the whole tile, and createImageBitmap() - which needs no URL -
        // produces an imageBitmap instead, which is the cheaper edge registered below anyway.
        // The URL is released as soon as the image has decoded: no conversion out of the image type needs
        // the src (drawImage and createImageBitmap both work off the decoded element), copying an image
        // hands back the same element, and the HTML drawer places that very element in the DOM rather
        // than a clone. Deferring the release to a destructor would both keep every blob alive for the
        // lifetime of the cache and force it to guess, from the src alone, which images it owns.
        this.learn("rasterBlob", "image", (tile, blob) => new $.Promise((resolve, reject) => {
            if (!$.supportsAsync) {
                return reject("Not supported in sync mode!");
            }
            // eslint-disable-next-line compat/compat
            const urlApi = window.URL || window.webkitURL;
            const url = urlApi.createObjectURL(blob);
            const img = new Image();
            img.onerror = img.onabort = e => {
                urlApi.revokeObjectURL(url);
                reject(e);
            };
            img.onload = () => {
                urlApi.revokeObjectURL(url);
                resolve(img);
            };
            img.decoding = 'async';
            img.src = url;
            return undefined;
        }), 1, 3);

        this.learn("context2d", "rasterBlob", (tile, ctx) => new $.Promise((resolve, reject) => {
            if (!$.supportsAsync) {
                return reject("Not supported in sync mode!");
            }
            // toBlob() reports failure by passing null, which would otherwise be resolved as if it were
            // valid data and only fail further down the conversion path.
            ctx.canvas.toBlob(blob => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("Canvas toBlob() failed to encode the canvas!"));
                }
            });
            return undefined;
        }), 1, 2);

        // rasterBlob -> imageBitmap (preferred fast path)
        this.learn("rasterBlob", "imageBitmap", (tile, blob) => new $.Promise((resolve, reject) => {
            if (!$.supportsAsync) {
                return reject("Not supported in sync mode!");
            }
            if (_imageConversionWorker) {
                postWorker('decodeFromBlob', { blob }).then(resolve).catch(reject);
            } else {
                // Fallback main thread
                createImageBitmap(blob, { colorSpaceConversion: 'none' }).then(resolve).catch(reject);
            }
            return undefined;
        }), 1, 1);

        this.learn("imageBitmap", "context2d", (tile, bmp) => {
            const canvas = document.createElement('canvas');
            canvas.width = bmp.width;
            canvas.height = bmp.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(bmp, 0, 0);
            return ctx;
        }, 1, 2);

        this.learn("image", "imageBitmap", (tile, img) => {
            return createImageBitmap(img, { colorSpaceConversion: 'none' });
        }, 1, 2);
        this.learn("image", "context2d", canvasContextCreator, 1, 2);

        //Copies
        //there is no API to write pixels into an Image, nothing to protect by copying
        this.learn("image", "image", (tile, image) => image, 0, 1);
        this.learn("context2d", "context2d", (tile, ctx) => canvasContextCreator(tile, ctx.canvas));
        this.learn("rasterBlob", "rasterBlob", (tile, blob) => blob, 0, 1); //blobs are immutable, no need to copy
        // createImageBitmap() on an ImageBitmap already yields an independent handle: closing the source
        // does not close the copy, which is the only property the cache ownership model needs. Rasterizing
        // through an OffscreenCanvas to achieve the same thing costs a GPU->CPU->GPU round trip per copy.
        this.learn("imageBitmap", "imageBitmap", (tile, bmp) => {
            if (!$.supportsAsync) {
                return $.Promise.reject("Not supported in sync mode!");
            }
            // A closed ImageBitmap reports zero dimensions, and createImageBitmap() rejects on a zero-sized
            // source: check here so the failure names the actual cause.
            if (!bmp || !bmp.width || !bmp.height) {
                return $.Promise.reject(new Error("Cannot copy a closed or empty ImageBitmap!"));
            }
            return createImageBitmap(bmp, { colorSpaceConversion: 'none' });
        }, 1, 1);
        /**
         * Free up canvas memory
         * (iOS 12 or higher on 2GB RAM device has only 224MB canvas memory,
         * and Safari keeps canvas until its height and width will be set to 0).
         */
        this.learnDestroy("context2d", ctx => {
            ctx.canvas.width = 0;
            ctx.canvas.height = 0;
        });
        /**
         * Release the decoded pixels immediately instead of waiting for the collector. An ImageBitmap can
         * hold several MB, and the cache evicts far more often than the collector runs. Copying the type
         * produces an independent handle, so closing one can never affect another.
         */
        this.learnDestroy("imageBitmap", bmp => {
            if (bmp && typeof bmp.close === 'function') {
                bmp.close();
            }
        });
    }

    /**
     * Unique identifier (unlike toString.call(x)) to be guessed
     * from the data value. This type guess is more strict than
     * OpenSeadragon.type() implementation, but for most type recognition
     * this test relies on the output of OpenSeadragon.type().
     *
     * Note: although we try to implement the type guessing, do
     * not rely on this functionality! Prefer explicit type declaration.
     *
     * @param x object to get unique identifier for
     *  - can be array, in that case, alphabetically-ordered list of inner unique types
     *    is returned (null, undefined are ignored)
     *  - if $.isPlainObject(x) is true, then the object can define
     *    getType function to specify its type
     *  - otherwise, toString.call(x) is applied to get the parameter description
     * @return {string} unique variable descriptor
     */
    guessType(x) {
        if (Array.isArray(x)) {
            const types = [];
            for (const item of x) {
                if (item === undefined || item === null) {
                    continue;
                }

                const type = this.guessType(item);
                if (!types.includes(type)) {
                    types.push(type);
                }
            }
            types.sort();
            return `Array [${types.join(",")}]`;
        }

        const guessType = $.type(x);
        if (guessType === "dom-node") {
            //distinguish nodes
            return guessType.nodeName.toLowerCase();
        }

        if (guessType === "object") {
            if ($.isFunction(x.getType)) {
                return x.getType();
            }
        }
        return guessType;
    }

    /**
     * Teach the system to convert data type 'from' -> 'to'
     * @param {string} from unique ID of the data item 'from'
     * @param {string} to unique ID of the data item 'to'
     * @param {OpenSeadragon.TypeConverter} callback converter that takes two arguments: a tile reference, and
     *  a data object of a type 'from'; and converts this data object to type 'to'. It can return also the value
     *  wrapped in a Promise (returned in resolve) or it can be async function.
     * @param {Number} [costPower=0] positive cost class of the conversion, smaller or equal than 7.
     *   Should reflect the actual cost of the conversion:
     *   - if nothing must be done and only reference is retrieved (or a constant operation done),
     *     return 0 (default)
     *   - if a linear amount of work is necessary,
     *     return 1
     *   ... and so on, basically the number in O() complexity power exponent (for simplification)
     * @param {Number} [costMultiplier=1] multiplier of the cost class, e.g. O(3n^2) would
     *   use costPower=2, costMultiplier=3; can be between 1 and 10^5
     */
    learn(from, to, callback, costPower = 0, costMultiplier = 1) {
        $.console.assert(costPower >= 0 && costPower <= 7, "[DataTypeConverter] Conversion costPower must be between <0, 7>.");
        $.console.assert($.isFunction(callback), "[DataTypeConverter:learn] Callback must be a valid function!");

        if (from === to) {
            this.copyings[to] = callback;
        } else {
            //we won't know if somebody added multiple edges, though it will choose some edge anyway
            costPower++;
            costMultiplier = Math.min(Math.max(costMultiplier, 1), 10 ^ 5);
            this.graph.addVertex(from);
            this.graph.addVertex(to);
            this.graph.addEdge(from, to, costPower * 10 ^ 5 + costMultiplier, callback);
            this._known = {}; //invalidate precomputed paths :/
        }
    }

    /**
     * Teach the system to destroy data type 'type'
     * for example, textures loaded to GPU have to be also manually removed when not needed anymore.
     * Needs to be defined only when the created object has extra deletion process.
     * @param {string} type
     * @param {OpenSeadragon.TypeDestructor} callback destructor, receives the object created,
     *   it is basically a type conversion to 'undefined' - thus the type.
     */
    learnDestroy(type, callback) {
        this.destructors[type] = callback;
    }

    /**
     * Convert data item x of type 'from' to any of the 'to' types, chosen is the cheapest known conversion.
     * Data is destroyed upon conversion. For different behavior, implement your conversion using the
     * path rules obtained from getConversionPath().
     * Note: conversion DOES NOT COPY data if [to] contains type 'from' (e.g., the cheapest conversion is no conversion).
     * It automatically calls destructor on immediate types, but NOT on the x and the result. You should call these
     * manually if these should be destroyed.
     * @param {OpenSeadragon.Tile} tile
     * @param {any} data data item to convert
     * @param {string} from data item type
     * @param {string} to desired type(s)
     * @return {OpenSeadragon.Promise<?>} promise resolution with type 'to', or rejection if conversion failed.
     */
    convert(tile, data, from, ...to) {
        const conversionPath = this.getConversionPath(from, to);
        if (!conversionPath) {
            // A missing path is a static property of the graph, so rejecting here would report it once per
            // tile and, through the cache error handling, take every one of those tiles down permanently.
            // Report it and let the caller keep whatever data it already had, as CacheRecord._convert does.
            $.console.error(`[OpenSeadragon.converter.convert] Conversion ${from} ---> ${to} cannot be done!`);
            return $.Promise.resolve();
        }

        const stepCount = conversionPath.length;
        const _this = this;
        const step = (x, i, destroy = true) => {
            if (i >= stepCount) {
                return $.Promise.resolve(x);
            }
            const edge = conversionPath[i];
            let y;
            try {
                y = edge.transform(tile, x);
            } catch (err) {
                if (destroy) {
                    _this.destroy(x, edge.origin.value);
                }
                return $.Promise.reject(`[OpenSeadragon.converter.convert] sync failure (while converting using ${edge.origin.value} -> ${edge.target.value})`);
            }
            if (y === undefined) {
                if (destroy) {
                    _this.destroy(x, edge.origin.value);
                }
                return $.Promise.reject(`[OpenSeadragon.converter.convert] data mid result undefined value (while converting using ${edge.origin.value} -> ${edge.target.value})`);
            }
            //node.value holds the type string
            if (destroy) {
                _this.destroy(x, edge.origin.value);
            }
            const result = $.type(y) === "promise" ? y : $.Promise.resolve(y);
            return result.then(res => step(res, i + 1));
        };
        //destroy only mid-results, but not the original value
        return step(data, 0, false);
    }

    /**
     * Copy the data item given.
     * @param {OpenSeadragon.Tile} tile
     * @param {any} data data item to convert
     * @param {string} type data type
     * @return {OpenSeadragon.Promise<?>|undefined} promise resolution with data passed from constructor
     */
    copy(tile, data, type) {
        const copyTransform = this.copyings[type];
        if (copyTransform) {
            let y;
            try {
                y = copyTransform(tile, data);
            } catch (e) {
                // Callers treat this as a promise-returning function: a synchronous throw would otherwise
                // escape past them, e.g. out of CacheRecord.getDataAs() itself.
                return $.Promise.reject(e);
            }
            return $.type(y) === "promise" ? y : $.Promise.resolve(y);
        }
        $.console.warn(`[OpenSeadragon.converter.copy] is not supported with type %s`, type);
        return $.Promise.resolve(undefined);
    }

    /**
     * Destroy the data item given.
     * @param {string} type data type
     * @param {any} data
     * @return {OpenSeadragon.Promise<any>|undefined} promise resolution with data passed from constructor, or undefined
     *  if not such conversion exists
     */
    destroy(data, type) {
        const destructor = this.destructors[type];
        if (destructor) {
            const y = destructor(data);
            return $.type(y) === "promise" ? y : $.Promise.resolve(y);
        }
        return undefined;
    }

    /**
     * Get possible system type conversions and cache result.
     * @param {string} from data item type
     * @param {string|string[]} to array of accepted types
     * @return {ConversionStep[]|undefined} array of required conversions (returns empty array
     *  for from===to), or undefined if the system cannot convert between given types.
     *  Each object has 'transform' function that converts between neighbouring types, such
     *  that x = arr[i].transform(x) is valid input for converter arr[i+1].transform(), e.g.
     *  arr[i+1].transform(arr[i].transform( ... )) is a valid conversion procedure.
     *
     *  Note: if a function is returned, it is a callback called once the data is ready.
     */
    getConversionPath(from, to) {
        let bestConverterPath;
        let knownFrom = this._known[from];
        if (!knownFrom) {
            this._known[from] = knownFrom = {};
        }

        if (Array.isArray(to)) {
            $.console.assert(to.length > 0, "[getConversionPath] conversion 'to' type must be defined.");
            let bestCost = Infinity;

            for (const outType of to) {
                let conversion = knownFrom[outType];
                if (conversion === undefined) {
                    knownFrom[outType] = conversion = this.graph.dijkstra(from, outType);
                }
                if (conversion && bestCost > conversion.cost) {
                    bestConverterPath = conversion;
                    bestCost = conversion.cost;
                }
            }
        } else {
            $.console.assert(typeof to === "string", "[getConversionPath] conversion 'to' type must be defined.");
            bestConverterPath = knownFrom[to];
            if (bestConverterPath === undefined) {
                bestConverterPath = this.graph.dijkstra(from, to);
                this._known[from][to] = bestConverterPath;
            }
        }

        return bestConverterPath ? bestConverterPath.path : undefined;
    }

    /**
     * Get the final type of the conversion path.
     * @param {ConversionStep[]} path
     * @return {undefined|string}  undefined if invalid path
     */
    getConversionPathFinalType(path) {
        if (!path || !path.length) {
            return undefined;
        }
        return path[path.length - 1].target.value;
    }

    /**
     * Return a list of known conversion types
     * @return {string[]}
     */
    getKnownTypes() {
        return Object.keys(this.graph.vertices);
    }

    /**
     * Check whether given type is known to the converter
     * @param {string} type type to test
     * @return {boolean}
     */
    existsType(type) {
        return !!this.graph.vertices[type];
    }
};

/**
 * Static converter available throughout OpenSeadragon.
 *
 * Built-in conversions include types:
 *  - context2d    canvas 2d context
 *  - image        HTMLImage element
 *  - url    url string carrying or pointing to 2D raster data
 *  - canvas       HTMLCanvas element
 *
 * @type OpenSeadragon.DataTypeConverter
 * @memberOf OpenSeadragon
 */
$.converter = new $.DataTypeConverter();

// Image URL -> image private conversion, used in tests (was public originally, but made private to
// discourage bad practices by forcing conversion API to deal with URLs that download data
$.converter.learn("__private__imageUrl", "imageBitmap", (tile, url) => new $.Promise((resolve, reject) => {
    if (!$.supportsAsync) {
        return reject("Not supported in sync mode!");
    }
    let setup;
    if (tile.tiledImage && tile.tiledImage.crossOriginPolicy) {
        const policy = tile.tiledImage.crossOriginPolicy;
        if (policy === 'anonymous') {
            setup = {
                mode: 'cors',
                credentials: 'omit',
            };
        } else if (policy === 'use-credentials') {
            setup = {
                mode: 'cors',
                credentials: 'include',
            };
        } else if (policy) {
            $.console.error(`Unsupported crossOriginPolicy ${policy}. Ignoring the property.`);
        }
    }
    if (_imageConversionWorker) {
        return postWorker('fetchDecode', { url, setup }).then(resolve).catch(reject);
    }
    // Fallback to the main thread
    // eslint-disable-next-line compat/compat
    return fetch(url, setup).then(res => {
        if (!res.ok) {
            throw new Error(`HTTP ${res.status} loading ${url}`);
        }
        return res.blob();
    }).then(blob => createImageBitmap(blob, { colorSpaceConversion: 'none' })
    ).then(resolve).catch(reject);
}), 1, 1);
$.converter.learn("__private__imageUrl", "__private__imageUrl", (tile, url) => url, 0, 1); //strings are immutable, no need to copy
}(OpenSeadragon));
