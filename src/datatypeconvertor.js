/*
 * OpenSeadragon.convertor (static property)
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2023 OpenSeadragon contributors

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

//modified from https://gist.github.com/Prottoy2938/66849e04b0bac459606059f5f9f3aa1a
class WeightedGraph {
    constructor() {
        this.adjacencyList = {};
        this.vertices = {};
    }
    addVertex(vertex) {
        if (!this.vertices[vertex]) {
            this.vertices[vertex] = new $.PriorityQueue.Node(0, vertex);
            this.adjacencyList[vertex] = [];
            return true;
        }
        return false;
    }
    addEdge(vertex1, vertex2, weight, data) {
        this.adjacencyList[vertex1].push({ target: this.vertices[vertex2], weight, data });
    }

    /**
     * @return {{path: *[], cost: number}|undefined} cheapest path for
     *
     */
    dijkstra(start, finish) {
        let path = []; //to return at end
        if (start === finish) {
            return {path: path, cost: 0};
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
            for (let neighborKey in neighbors) {
                let edge = neighbors[neighborKey];
                //relax node
                let newCost = smallestNode.key + edge.weight;
                let nextNeighbor = edge.target;
                if (newCost < nextNeighbor.key) {
                    nextNeighbor._previous = smallestNode;
                    //key change
                    nodes.decreaseKey(nextNeighbor, newCost);
                }
            }
        }

        if (!smallestNode._previous) {
            return undefined; //no path
        }

        let finalCost = smallestNode.key; //final weight last node

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

class DataTypeConvertor {

    constructor() {
        this.graph = new WeightedGraph();

        this.learn("canvas", "string", (canvas) => canvas.toDataURL(), 1, 1);
        this.learn("image", "string", (image) => image.url);
        this.learn("canvas", "context2d", (canvas) => canvas.getContext("2d"));
        this.learn("context2d", "canvas", (context2D) => context2D.canvas);

        //OpenSeadragon supports two conversions out of the box: canvas and image.
        this.learn("image", "canvas", (image) => {
            const canvas = document.createElement( 'canvas' );
            canvas.width = image.width;
            canvas.height = image.height;
            const context = canvas.getContext('2d');
            context.drawImage( image, 0, 0 );
            return canvas;
        }, 1, 1);

        this.learn("string", "image", (url) => {
            const img = new Image();
            img.src = url;
            //FIXME: support async functions! some function conversions are async (like image here)
            // and returning immediatelly will possibly cause the system work with incomplete data
            // - a) remove canvas->image conversion path support
            // - b) busy wait cycle (ugly as..)
            // - c) async conversion execution (makes the whole cache -> transitively rendering async)
            // - d) callbacks (makes the cache API more complicated)
            while (!img.complete) {
                console.log("Burning through CPU :)");
            }
            return img;
        }, 1, 1);
    }

    /**
     * FIXME: types are sensitive thing. Same data type might have different data semantics.
     *  - 'string' can be anything, for images, dataUrl or some URI, or incompatible stuff: vector data (JSON)
     *  - using $.type makes explicit requirements on its extensibility, and makes mess in naming
     *    - most types are [object X]
     *    - selected types are 'nice' -> string, canvas...
     *    - hard to debug
     *
     * Unique identifier (unlike toString.call(x)) to be guessed
     * from the data value
     *
     * @function uniqueType
     * @param x object to get unique identifier for
     *  - can be array, in that case, alphabetically-ordered list of inner unique types
     *    is returned (null, undefined are ignored)
     *  - if $.isPlainObject(x) is true, then the object can define
     *    getType function to specify its type
     *  - otherwise, toString.call(x) is applied to get the parameter description
     * @return {string} unique variable descriptor
     */
    guessType( x ) {
        if (Array.isArray(x)) {
            const types = [];
            for (let item of x) {
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

        //todo consider event...
        if (guessType === "object") {
            if ($.isFunction(x.getType)) {
                return x.getType();
            }
        }
        return guessType;
    }

    /**
     * @param {string} from unique ID of the data item 'from'
     * @param {string} to unique ID of the data item 'to'
     * @param {function} callback convertor that takes type 'from', and converts to type 'to'
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
        $.console.assert(costPower >= 0 && costPower <= 7, "[DataTypeConvertor] Conversion costPower must be between <0, 7>.");
        $.console.assert($.isFunction(callback), "[DataTypeConvertor:learn] Callback must be a valid function!");

        //we won't know if somebody added multiple edges, though it will choose some edge anyway
        costPower++;
        costMultiplier = Math.min(Math.max(costMultiplier, 1), 10 ^ 5);
        this.graph.addVertex(from);
        this.graph.addVertex(to);
        this.graph.addEdge(from, to, costPower * 10 ^ 5 + costMultiplier, callback);
        this._known = {};
    }

    /**
     * FIXME: we could convert as 'convert(x, from, ...to)' and get cheapest path to any of the data
     *  for example, we could say tile.getCache(key)..getData("image", "canvas") if we do not care what we use and
     *  our system would then choose the cheapest option (both can be rendered by html for example).
     *
     * FIXME: conversion should be allowed to await results (e.g. image creation), now it is buggy,
     *  because we do not await image creation...
     *
     * @param {*} x data item to convert
     * @param {string} from data item type
     * @param {string} to desired type
     * @return {*} data item with type 'to', or undefined if the conversion failed
     */
    convert(x, from, to) {
        const conversionPath = this.getConversionPath(from, to);

        if (!conversionPath) {
            $.console.warn(`[DataTypeConvertor.convert] Conversion conversion ${from} ---> ${to} cannot be done!`);
            return undefined;
        }

        for (let node of conversionPath) {
            x = node.data(x);
            if (!x) {
                $.console.warn(`[DataTypeConvertor.convert] data mid result falsey value (conversion to ${node.node})`);
                return undefined;
            }
        }
        return x;
    }

    /**
     * Get possible system type conversions and cache result.
     * @param {string} from data item type
     * @param {string} to desired type
     * @return {[object]|undefined} array of required conversions (returns empty array
     *  for from===to), or undefined if the system cannot convert between given types.
     */
    getConversionPath(from, ...to) {
        $.console.assert(to.length > 0, "[getConversionPath] conversion 'to' type must be defined.");

        let bestConvertorPath;
        const knownFrom = this._known[from];
        if (knownFrom) {
            let bestCost = Infinity;
            for (const outType of to) {
                const conversion = knownFrom[outType];
                if (conversion && bestCost > conversion.cost) {
                    bestConvertorPath = conversion;
                    bestCost = conversion.cost;
                }
            }
        } else {
            this._known[from] = {};
        }
        if (!bestConvertorPath) {
            //FIXME: pre-compute all paths? could be efficient for multiple
            // type system, but overhead for simple use cases...
            bestConvertorPath = this.graph.dijkstra(from, to[0]);
            this._known[from][to[0]] = bestConvertorPath;
        }
        return bestConvertorPath ? bestConvertorPath.path : undefined;
    }
}

/**
 * Static convertor available throughout OpenSeadragon
 * @memberOf OpenSeadragon
 */
$.convertor = new DataTypeConvertor();

}(OpenSeadragon));
