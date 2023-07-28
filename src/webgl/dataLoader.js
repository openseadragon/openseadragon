
(function($) {

/**
 * IDataLoader conforms to a specific texture type and WebGL version.
 * It provides API for uniform handling of textures:
 *  - texture loading
 *  - GLSL texture handling
 */
$.WebGLModule.IDataLoader = class {
    /**
     * Creation
     * @param {WebGLRenderingContextBase} gl
     * @param {string} webglVersion
     * @param {object} options
     * @param {GLuint} options.wrap  texture wrap parameteri
     * @param {GLuint} options.magFilter  texture filter parameteri
     * @param {GLuint} options.minFilter  texture filter parameteri
     * */
    constructor(gl, webglVersion, options) {
        //texture cache to keep track of loaded GPU data
        this.__cache = new Map();
        this.wrap = options.wrap;
        this.minFilter = options.minFilter;
        this.magFilter = options.magFilter;
        this.maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);

        /**
         * Loader strategy based on toString result, extend with your type if necessary.
         * If your type cannot use the given version strategy (TEXTURE_2D_ARRAY UNIT), you have
         * to re-define the whole API.
         *
         * When a data is sent to the shader for processing, `toString` method is called to
         * get the data identifier. A typeLoaders key must be present to handle loading
         * of that texture(s) data.
         * @member typeLoaders
         * @memberOf OpenSeadragon.WebGLModule.IDataLoader
         *
         * @return {object} whatever you need to stare in the cache to later free the object
         */
        this.typeLoaders = {};
    }

    /**
     * @param {string} version
     * @return {boolean} true if given webgl version is supported by the loader
     */
    supportsWebglVersion(version) {
        throw("::supportsWebglVersion must be implemented!");
    }

    /**
     * Get stored options under ID
     * @param id
     * @return {unknown} options stored by setLoaded
     */
    getLoaded(id) {
        return this.__cache.get(id);
    }

    /**
     * Store options object
     * @param id
     * @param options
     */
    setLoaded(id, options) {
        this.__cache.set(id, options);
    }

    /**
     * Unload stored options
     * @param id
     */
    setUnloaded(id) {
        this.__cache.delete(id);
    }

    /**
     * Set texture sampling parameters
     * @param {string} name one of 'minFilter', 'magFilter', 'wrap'
     * @param {GLuint} value
     */
    setTextureParam(name, value) {
        if (!['minFilter', 'magFilter', 'wrap'].includes(name)) {
            return;
        }
        this[name] = value;
    }

    /**
     *
     * @param renderer
     * @param id
     * @param options
     */
    unloadTexture(renderer, id, options) {
        throw("::unloadTexture must be implemented!");
    }

    /**
     * @param {OpenSeadragon.WebGLModule} renderer renderer renderer reference
     * @param id
     * @param data
     * @param width
     * @param height
     * @param {[number]} shaderDataIndexToGlobalDataIndex mapping of array indices to data indices, e.g. texture 0 for
     *   this shader corresponds to index shaderDataIndexToGlobalDataIndex[0] in the data array,
     *   -1 value used for textures not loaded
     */
    load(renderer, id, data, width, height, shaderDataIndexToGlobalDataIndex) {
        if (!data) {
            $.console.warn("Attempt to draw nullable data!");
            return;
        }
        const textureLoader = this.typeLoaders[toString.apply(data)];
        if (!textureLoader) {
            throw "WebGL Renderer cannot load data as texture: " + toString.apply(data);
        }
        this.setLoaded(id, textureLoader(this, renderer, data, width, height, shaderDataIndexToGlobalDataIndex));
    }

    /**
     *
     * @param renderer
     * @param id
     */
    free(renderer, id) {
        this.unloadTexture(renderer, id, this.getLoaded(id));
        this.setUnloaded(id);
    }

    /**
     * Called when the program is being loaded (set as active)
     * @param {OpenSeadragon.WebGLModule} renderer
     * @param {WebGLRenderingContextBase} gl WebGL context
     * @param {WebGLProgram} program
     * @param {object} specification reference to the specification object used
     */
    programLoaded(renderer, gl, program, specification) {
        //not needed
    }

    /**
     * Called when tile is processed
     * @param {OpenSeadragon.WebGLModule} renderer renderer renderer reference
     * @param {object} specification reference to the current active specification object
     * @param {*} id data object present in the texture cache
     * @param {WebGLProgram} program current WebGLProgram
     * @param {WebGL2RenderingContext} gl
     */
    programUsed(renderer, specification, id, program, gl) {

    }

    /**
     * Sample texture
     * @param {number|string} index texture index, must respect index re-mapping (see declare())
     * @param {string} vec2coords GLSL expression that evaluates to vec2
     * @return {string} GLSL expression (unterminated) that evaluates to vec4
     */
    sample(index, vec2coords) {
        return `texture(_vis_data_sampler_array, vec3(${vec2coords}, _vis_data_sampler_array_indices[${index}]))`;
    }

    /**
     * Declare GLSL texture logic (global scope) in the GLSL shader
     * @param {[number]} shaderDataIndexToGlobalDataIndex mapping of array indices to data indices, e.g. texture 0 for
     *   this shader corresponds to index shaderDataIndexToGlobalDataIndex[0] in the data array,
     *   -1 value used for textures not loaded
     * @return {string} GLSL declaration (terminated with semicolon) of necessary elements for textures
     */
    declare(shaderDataIndexToGlobalDataIndex) {
        return `
vec4 osd_texture(float index, vec2 coords) {
    //This method must be implemented!
}

//TODO: is this relevant?
// vec2 osd_texture_size() {
//     //This method must be implemented!
// }
`;
    }
};

/**
 * Data loading strategies for different WebGL versions.
 * Should you have your own data format, change/re-define these
 * to correctly load the textures to GPU, based on the WebGL version used.
 *
 * The processing accepts arrays of images to feed to the shader built from configuration.
 * This implementation supports data as Image or Canvas objects. We will refer to them as <image*>
 *
 * Implemented texture loaders support
 *  - working with <image*> object - image data chunks are vertically concatenated
 *  - working with [<image*>] object - images are in array
 *
 * @namespace OpenSeadragon.WebGLModule.Loaders
 */
$.WebGLModule.Loaders = {

    /**
     * //TODO: ugly
     * In case the system is fed by anything but 'Image' (or the like) data object,
     * implement here conversion so that debug mode can draw it.
     * @param {*} data
     * @return {HTMLElement} Dom Element
     */
    dataAsHtmlElement: function(data) {
        return {
            "[object HTMLImageElement]": () => data,
            "[object HTMLCanvasElement]": () => data,
            //Image objects in Array, we assume image objects only
            "[object Array]": function() {
                const node = document.createElement("div");
                for (let image of data) {
                    node.append(image);
                }
                return node;
            }
        }[toString.apply(data)]();
    },

    /**
     * Data loader for WebGL 2.0. Must load the data to a Texture2DArray.
     * The name of the texture is a constant. The order od the textures in
     * the z-stacking is defined in shaderDataIndexToGlobalDataIndex.
     *
     * For details, please, see the implementation.
     * @class OpenSeadragon.WebGLModule.Loaders.TEXTURE_2D_ARRAY
     */
    TEXTURE_2D_ARRAY: class /**@lends $.WebGLModule.Loaders.TEXTURE_2D_ARRAY */ extends OpenSeadragon.WebGLModule.IDataLoader {
        unloadTexture(renderer, id, options) {
            renderer.gl.deleteTexture(options);
        }

        /**
         * Creation
         * @param {WebGL2RenderingContext} gl
         * @param {string} webglVersion
         * @param {object} options
         * @param {GLuint} options.wrap  texture wrap parameteri
         * @param {GLuint} options.magFilter  texture filter parameteri
         * @param {GLuint} options.minFilter  texture filter parameteri
         * @memberOf OpenSeadragon.WebGLModule.Loaders.TEXTURE_2D_ARRAY
         * */
        constructor(gl, webglVersion, options) {
            super(gl, webglVersion, options);

            if (webglVersion !== "2.0") {
                throw "Incompatible WebGL version for TEXTURE_2D_ARRAY data loader!";
            }

            // this.batchSize = 5;
            // let lastBatch = null;

            this.typeLoaders["[object HTMLImageElement]"] =
                this.typeLoaders["[object HTMLCanvasElement]"] = function (self, webglModule, data, width, height,
                                                                           shaderDataIndexToGlobalDataIndex) {

                const NUM_IMAGES = Math.round(data.height / height);
                const gl = webglModule.gl;

                // //todo different tile sizes are problems
                // if (!lastBatch || lastBatch.length < NUM_IMAGES) {
                //     lastBatch = {
                //         texId: gl.createTexture(),
                //         length: this.batchSize,
                //         texCount: 0,
                //     };
                //     gl.bindTexture(gl.TEXTURE_2D_ARRAY, options.texId);
                //     gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, data[0].width, data[0].height, data.length + 1);
                // } else {
                //     gl.bindTexture(gl.TEXTURE_2D_ARRAY, options.texId);
                // }

                const textureId = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D_ARRAY, textureId);
                gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, self.magFilter);
                gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, self.minFilter);
                gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, self.wrap);
                gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, self.wrap);

                gl.texImage3D(
                    gl.TEXTURE_2D_ARRAY,
                    0,
                    gl.RGBA,
                    width,
                    height,
                    NUM_IMAGES,
                    0,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    data
                );

                return textureId;
            };

            //Image objects in Array, we assume image objects only todo ugly, can be array of anything
            this.typeLoaders["[object Array]"] = function (self, webglModule, data, options, width, height, shaderDataIndexToGlobalDataIndex) {
                const gl = webglModule.gl;
                const textureId = gl.createTexture();

                //gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D_ARRAY, textureId);
                gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, data[0].width, data[0].height, data.length + 1);
                gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAX_LEVEL, 0);
                gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, self.minFilter);
                gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, self.magFilter);
                gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, self.wrap);
                gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, self.wrap);

                let index = 0;
                for (let image of data) {
                    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, index++, image.width, image.height,
                        1, gl.RGBA, gl.UNSIGNED_BYTE, image);
                }
                return textureId;
            };
        }

        supportsWebglVersion(version) {
            return version === "2.0";
        }

        programUsed(renderer, specification, id, program, gl) {
            gl.activeTexture(gl.TEXTURE0);
            const tid = this.getLoaded(id);
            gl.bindTexture(gl.TEXTURE_2D_ARRAY, tid);
        }

        sample(index, vec2coords) {
            return `texture(_vis_data_sampler_array, vec3(${vec2coords}, _vis_data_sampler_array_indices[${index}]))`;
        }

        declare(shaderDataIndexToGlobalDataIndex) {
            return `uniform sampler2DArray _vis_data_sampler_array;
int _vis_data_sampler_array_indices[${shaderDataIndexToGlobalDataIndex.length}] = int[${shaderDataIndexToGlobalDataIndex.length}](
  ${shaderDataIndexToGlobalDataIndex.join(",")}
);

vec4 osd_texture(int index, vec2 coords) {
  return ${this.sample("index", "coords")};
}
`;
        }
    },


    /**
     * Data loader for WebGL 2.0. Must load the data to a Texture2DArray.
     * The name of the texture is a constant. The order od the textures in
     * the z-stacking is defined in shaderDataIndexToGlobalDataIndex.
     *
     * For details, please, see the implementation.
     * @class OpenSeadragon.WebGLModule.Loaders.TEXTURE_2D
     */
    TEXTURE_2D: class /**@lends $.WebGLModule.Loaders.TEXTURE_2D */ extends OpenSeadragon.WebGLModule.IDataLoader {

        /**
         * Creation
         * @param {WebGL2RenderingContext} gl
         * @param {string} webglVersion
         * @param {object} options
         * @param {GLuint} options.wrap  texture wrap parameteri
         * @param {GLuint} options.magFilter  texture filter parameteri
         * @param {GLuint} options.minFilter  texture filter parameteri
         * @memberOf OpenSeadragon.WebGLModule.Loaders.TEXTURE_2D
         * */
        constructor(gl, webglVersion, options) {
            super(gl, webglVersion, options);

            this._samples = webglVersion === "1.0" ? "texture2D" : "texture";

            this.typeLoaders["[object HTMLImageElement]"] =
                this.typeLoaders["[object HTMLCanvasElement]"] = function (self, webglModule, data, width, height,
                                                                           shaderDataIndexToGlobalDataIndex) {

                    //Avoid canvas slicing if possible
                    const NUM_IMAGES = Math.round(data.height / height);
                    if (NUM_IMAGES === 1) {
                        const texture = gl.createTexture();
                        gl.bindTexture(gl.TEXTURE_2D, texture);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, self.wrap);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, self.wrap);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, self.minFilter);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, self.magFilter);
                        gl.texImage2D(gl.TEXTURE_2D,
                            0,
                            gl.RGBA,
                            gl.RGBA,
                            gl.UNSIGNED_BYTE,
                            data);
                        return [texture];
                    }

                    if (!self._canvas) {
                        self._canvas = document.createElement('canvas');
                        self._canvasReader = self._canvas.getContext('2d', {willReadFrequently: true});
                        self._canvasConverter = document.createElement('canvas');
                        self._canvasConverterReader = self._canvasConverter.getContext('2d',
                            {willReadFrequently: true});
                    }

                    let index = 0;
                    width = Math.round(width);
                    height = Math.round(height);

                    const units = [];

                    //we read from here
                    self._canvas.width = data.width;
                    self._canvas.height = data.height;
                    self._canvasReader.drawImage(data, 0, 0);

                    //Allowed texture size dimension only 256+ and power of two...

                    //it worked for arbitrary size until we begun with image arrays... is it necessary?
                    const IMAGE_SIZE = data.width < 256 ? 256 : Math.pow(2, Math.ceil(Math.log2(data.width)));
                    self._canvasConverter.width = IMAGE_SIZE;
                    self._canvasConverter.height = IMAGE_SIZE;

                    //just load all images and let shaders reference them...
                    for (let i = 0; i < shaderDataIndexToGlobalDataIndex.length; i++) {
                        if (shaderDataIndexToGlobalDataIndex[i] < 0) {
                            continue;
                        }
                        if (index >= NUM_IMAGES) {
                            console.warn("The visualisation contains less data than layers. Skipping layers ...");
                            return units;
                        }

                        units.push(gl.createTexture());
                        gl.bindTexture(gl.TEXTURE_2D, units[index]);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, self.wrap);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, self.wrap);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, self.minFilter);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, self.magFilter);

                        let pixels;
                        if (width !== IMAGE_SIZE || height !== IMAGE_SIZE) {
                            self._canvasConverterReader.drawImage(self._canvas, 0,
                                shaderDataIndexToGlobalDataIndex[i] * height,
                                width, height, 0, 0, IMAGE_SIZE, IMAGE_SIZE);

                            pixels = self._canvasConverterReader.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);
                        } else {
                            //load data
                            pixels = self._canvasReader.getImageData(0,
                                shaderDataIndexToGlobalDataIndex[i] * height, width, height);
                        }

                        gl.texImage2D(gl.TEXTURE_2D,
                            0,
                            gl.RGBA,
                            gl.RGBA,
                            gl.UNSIGNED_BYTE,
                            pixels);
                        index++;
                    }
                    return units;
                };

            //Image objects in Array, we assume image objects only todo ugly, can be array of anything
            this.typeLoaders["[object Array]"] = function (self, webglModule, data, options, width, height, shaderDataIndexToGlobalDataIndex) {
                const gl = webglModule.gl;

                let index = 0;
                const NUM_IMAGES = data.length;
                const units = [];

                //just load all images and let shaders reference them...
                for (let i = 0; i < shaderDataIndexToGlobalDataIndex.length; i++) {
                    if (shaderDataIndexToGlobalDataIndex[i] < 0) {
                        continue;
                    }
                    if (index >= NUM_IMAGES) {
                        console.warn("The visualisation contains less data than layers. Skipping layers ...");
                        return units;
                    }

                    //create textures
                    units.push(gl.createTexture());
                    gl.bindTexture(gl.TEXTURE_2D, units[index]);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, self.wrap);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, self.wrap);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, self.minFilter);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, self.magFilter);
                    //do not check the image size, we render what wwe
                    gl.texImage2D(gl.TEXTURE_2D,
                        0,
                        gl.RGBA,
                        gl.RGBA,
                        gl.UNSIGNED_BYTE,
                        data[index++]
                    );
                }
                return units;
            };
        }

        unloadTexture(renderer, id, options) {
            for (let textureUnit of options) {
                renderer.gl.deleteTexture(textureUnit);
            }
        }

        supportsWebglVersion(version) {
            return true;
        }

        programUsed(renderer, specification, id, program, gl) {
            const units = this.getLoaded(id);
            for (let i = 0; i < units.length; i++) {
                let textureUnit = units[i];
                let bindConst = `TEXTURE${i}`;
                gl.activeTexture(gl[bindConst]);
                gl.bindTexture(gl.TEXTURE_2D, textureUnit);
                let location = gl.getUniformLocation(program, `vis_data_sampler_${i}`);
                gl.uniform1i(location, i);
            }
        }

        sample(index, vec2coords) {
            return `${this._samples}(vis_data_sampler_${index}, ${vec2coords})`;
        }

        declare(shaderDataIndexToGlobalDataIndex) {
            let samplers = 'uniform vec2 sampler_size;';
            for (let i = 0; i < shaderDataIndexToGlobalDataIndex.length; i++) {
                if (shaderDataIndexToGlobalDataIndex[i] === -1) {
                    continue;
                }
                samplers += `uniform sampler2D vis_data_sampler_${i};`;
            }
            return samplers;
        }
    },
};

})(OpenSeadragon);
