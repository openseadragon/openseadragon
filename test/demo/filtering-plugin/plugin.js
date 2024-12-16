/*
 * Modified and maintained by the OpenSeadragon Community.
 *
 * This software was orignally developed at the National Institute of Standards and
 * Technology by employees of the Federal Government. NIST assumes
 * no responsibility whatsoever for its use by other parties, and makes no
 * guarantees, expressed or implied, about its quality, reliability, or
 * any other characteristic.
 * @author Antoine Vandecreme <antoine.vandecreme@nist.gov>
 */

(function() {

    'use strict';

    const $ = window.OpenSeadragon;
    if (!$) {
        throw new Error('OpenSeadragon is missing.');
    }

    $.Viewer.prototype.setFilterOptions = function(options) {
        if (!this.filterPluginInstance) {
            options = options || {};
            options.viewer = this;
            this.filterPluginInstance = new $.FilterPlugin(options);
        } else {
            setOptions(this.filterPluginInstance, options);
        }
    };

    /**
     * @class FilterPlugin
     * @param {Object} options The options
     * @param {OpenSeadragon.Viewer} options.viewer The viewer to attach this
     * plugin to.
     * @param {Object[]} options.filters The filters to apply to the images.
     * @param {OpenSeadragon.TiledImage[]} options.filters[x].items The tiled images
     * on which to apply the filter.
     * @param {function|function[]} options.filters[x].processors The processing
     * function(s) to apply to the images. The parameter of this function is
     * the context to modify.
     */
    $.FilterPlugin = function(options) {
        options = options || {};
        if (!options.viewer) {
            throw new Error('A viewer must be specified.');
        }
        const self = this;
        this.viewer = options.viewer;
        this.viewer.addHandler('tile-invalidated', applyFilters);

        setOptions(this, options);

        async function applyFilters(e) {
            const tiledImage = e.tiledImage,
                processors = getFiltersProcessors(self, tiledImage);

            if (processors.length === 0) {
                return;
            }

            const contextCopy = await e.getData('context2d');
            if (!contextCopy) return;

            for (let i = 0; i < processors.length; i++) {
                if (e.outdated()) return;
                await processors[i](contextCopy);
            }
            if (e.outdated()) return;
            await e.setData(contextCopy, 'context2d');
        }
    };

    function setOptions(instance, options) {
        options = options || {};
        const filters = options.filters;
        instance.filters = !filters ? [] :
            $.isArray(filters) ? filters : [filters];
        for (let i = 0; i < instance.filters.length; i++) {
            const filter = instance.filters[i];
            if (!filter.processors) {
                throw new Error('Filter processors must be specified.');
            }
            filter.processors = $.isArray(filter.processors) ?
                filter.processors : [filter.processors];
        }
        instance.viewer.requestInvalidate();
    }

    function getFiltersProcessors(instance, item) {
        if (instance.filters.length === 0) {
            return [];
        }

        let globalProcessors = null;
        for (let i = 0; i < instance.filters.length; i++) {
            const filter = instance.filters[i];
            if (!filter.items) {
                globalProcessors = filter.processors;
            } else if (filter.items === item ||
                $.isArray(filter.items) && filter.items.indexOf(item) >= 0) {
                return filter.processors;
            }
        }
        return globalProcessors ? globalProcessors : [];
    }

    $.Filters = {
        THRESHOLDING: function(threshold) {
            if (threshold < 0 || threshold > 255) {
                throw new Error('Threshold must be between 0 and 255.');
            }
            return function(context) {
                const imgData = context.getImageData(
                    0, 0, context.canvas.width, context.canvas.height);
                const pixels = imgData.data;
                for (let i = 0; i < pixels.length; i += 4) {
                    const r = pixels[i];
                    const g = pixels[i + 1];
                    const b = pixels[i + 2];
                    const v = (r + g + b) / 3;
                    pixels[i] = pixels[i + 1] = pixels[i + 2] =
                        v < threshold ? 0 : 255;
                }
                context.putImageData(imgData, 0, 0);
            };
        },
        BRIGHTNESS: function(adjustment) {
            if (adjustment < -255 || adjustment > 255) {
                throw new Error(
                    'Brightness adjustment must be between -255 and 255.');
            }
            const precomputedBrightness = [];
            for (let i = 0; i < 256; i++) {
                precomputedBrightness[i] = i + adjustment;
            }
            return function(context) {
                const imgData = context.getImageData(
                    0, 0, context.canvas.width, context.canvas.height);
                const pixels = imgData.data;
                for (let i = 0; i < pixels.length; i += 4) {
                    pixels[i] = precomputedBrightness[pixels[i]];
                    pixels[i + 1] = precomputedBrightness[pixels[i + 1]];
                    pixels[i + 2] = precomputedBrightness[pixels[i + 2]];
                }
                context.putImageData(imgData, 0, 0);
            };
        },
        CONTRAST: function(adjustment) {
            if (adjustment < 0) {
                throw new Error('Contrast adjustment must be positive.');
            }
            const precomputedContrast = [];
            for (let i = 0; i < 256; i++) {
                precomputedContrast[i] = i * adjustment;
            }
            return function(context) {
                const imgData = context.getImageData(
                    0, 0, context.canvas.width, context.canvas.height);
                const pixels = imgData.data;
                for (let i = 0; i < pixels.length; i += 4) {
                    pixels[i] = precomputedContrast[pixels[i]];
                    pixels[i + 1] = precomputedContrast[pixels[i + 1]];
                    pixels[i + 2] = precomputedContrast[pixels[i + 2]];
                }
                context.putImageData(imgData, 0, 0);
            };
        },
        GAMMA: function(adjustment) {
            if (adjustment < 0) {
                throw new Error('Gamma adjustment must be positive.');
            }
            const precomputedGamma = [];
            for (let i = 0; i < 256; i++) {
                precomputedGamma[i] = Math.pow(i / 255, adjustment) * 255;
            }
            return function(context) {
                const imgData = context.getImageData(
                    0, 0, context.canvas.width, context.canvas.height);
                const pixels = imgData.data;
                for (let i = 0; i < pixels.length; i += 4) {
                    pixels[i] = precomputedGamma[pixels[i]];
                    pixels[i + 1] = precomputedGamma[pixels[i + 1]];
                    pixels[i + 2] = precomputedGamma[pixels[i + 2]];
                }
                context.putImageData(imgData, 0, 0);
            };
        },
        GREYSCALE: function() {
            return function(context) {
                const imgData = context.getImageData(
                    0, 0, context.canvas.width, context.canvas.height);
                const pixels = imgData.data;
                for (let i = 0; i < pixels.length; i += 4) {
                    const val = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
                    pixels[i] = val;
                    pixels[i + 1] = val;
                    pixels[i + 2] = val;
                }
                context.putImageData(imgData, 0, 0);
            };
        },
        INVERT: function() {
            const precomputedInvert = [];
            for (let i = 0; i < 256; i++) {
                precomputedInvert[i] = 255 - i;
            }
            return function(context) {
                const imgData = context.getImageData(
                    0, 0, context.canvas.width, context.canvas.height);
                const pixels = imgData.data;
                for (let i = 0; i < pixels.length; i += 4) {
                    pixels[i] = precomputedInvert[pixels[i]];
                    pixels[i + 1] = precomputedInvert[pixels[i + 1]];
                    pixels[i + 2] = precomputedInvert[pixels[i + 2]];
                }
                context.putImageData(imgData, 0, 0);
            };
        },
        MORPHOLOGICAL_OPERATION: function(kernelSize, comparator) {
            if (kernelSize % 2 === 0) {
                throw new Error('The kernel size must be an odd number.');
            }
            const kernelHalfSize = Math.floor(kernelSize / 2);

            if (!comparator) {
                throw new Error('A comparator must be defined.');
            }

            return function(context) {
                const width = context.canvas.width;
                const height = context.canvas.height;
                const imgData = context.getImageData(0, 0, width, height);
                const originalPixels = context.getImageData(0, 0, width, height)
                    .data;
                let offset;

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        offset = (y * width + x) * 4;
                        let r = originalPixels[offset],
                            g = originalPixels[offset + 1],
                            b = originalPixels[offset + 2];
                        for (let j = 0; j < kernelSize; j++) {
                            for (let i = 0; i < kernelSize; i++) {
                                const pixelX = x + i - kernelHalfSize;
                                const pixelY = y + j - kernelHalfSize;
                                if (pixelX >= 0 && pixelX < width &&
                                    pixelY >= 0 && pixelY < height) {
                                    offset = (pixelY * width + pixelX) * 4;
                                    r = comparator(originalPixels[offset], r);
                                    g = comparator(
                                        originalPixels[offset + 1], g);
                                    b = comparator(
                                        originalPixels[offset + 2], b);
                                }
                            }
                        }
                        imgData.data[offset] = r;
                        imgData.data[offset + 1] = g;
                        imgData.data[offset + 2] = b;
                    }
                }
                context.putImageData(imgData, 0, 0);
            };
        },
        CONVOLUTION: function(kernel) {
            if (!$.isArray(kernel)) {
                throw new Error('The kernel must be an array.');
            }
            const kernelSize = Math.sqrt(kernel.length);
            if ((kernelSize + 1) % 2 !== 0) {
                throw new Error('The kernel must be a square matrix with odd' +
                    'width and height.');
            }
            const kernelHalfSize = (kernelSize - 1) / 2;

            return function(context) {
                const width = context.canvas.width;
                const height = context.canvas.height;
                const imgData = context.getImageData(0, 0, width, height);
                const originalPixels = context.getImageData(0, 0, width, height)
                    .data;
                let offset;

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        let r = 0, g = 0, b = 0;
                        for (let j = 0; j < kernelSize; j++) {
                            for (let i = 0; i < kernelSize; i++) {
                                const pixelX = x + i - kernelHalfSize;
                                const pixelY = y + j - kernelHalfSize;
                                if (pixelX >= 0 && pixelX < width &&
                                    pixelY >= 0 && pixelY < height) {
                                    offset = (pixelY * width + pixelX) * 4;
                                    const weight = kernel[j * kernelSize + i];
                                    r += originalPixels[offset] * weight;
                                    g += originalPixels[offset + 1] * weight;
                                    b += originalPixels[offset + 2] * weight;
                                }
                            }
                        }
                        offset = (y * width + x) * 4;
                        imgData.data[offset] = r;
                        imgData.data[offset + 1] = g;
                        imgData.data[offset + 2] = b;
                    }
                }
                context.putImageData(imgData, 0, 0);
            };
        },
        COLORMAP: function(cmap, ctr) {
            const resampledCmap = cmap.slice(0);
            const diff = 255 - ctr;
            for (let i = 0; i < 256; i++) {
                let position = i > ctr ?
                    Math.min((i - ctr) / diff * 128 + 128,255) | 0 :
                    Math.max(0, i / (ctr / 128)) | 0;
                resampledCmap[i] = cmap[position];
            }
            return function(context) {
                const imgData = context.getImageData(
                    0, 0, context.canvas.width, context.canvas.height);
                const pxl = imgData.data;
                for (let i = 0; i < pxl.length; i += 4) {
                    const v = (pxl[i] + pxl[i + 1] + pxl[i + 2]) / 3 | 0;
                    const c = resampledCmap[v];
                    pxl[i] = c[0];
                    pxl[i + 1] = c[1];
                    pxl[i + 2] = c[2];
                }
                context.putImageData(imgData, 0, 0);
            };
        }
    };

}());
