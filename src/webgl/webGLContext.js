(function($) {

$.WebGLModule.determineContext = function( version ){
    const namespace = OpenSeadragon.WebGLModule;
    for (let property in namespace) {
        const context = namespace[ property ],
            proto = context.prototype;
        if( proto &&
            proto instanceof namespace.WebGLImplementation &&
            $.isFunction( proto.getVersion ) &&
            proto.getVersion.call( context ) === version
        ){
            return context;
        }
    }
    return null;
};

/**
 * @interface OpenSeadragon.WebGLModule.webglContext
 * Interface for the visualisation rendering implementation which can run
 * on various GLSL versions
 */
$.WebGLModule.WebGLImplementation = class {

    /**
     * Create a WebGL Renderer Context Implementation (version-dependent)
     * @param {WebGLModule} renderer
     * @param {WebGLRenderingContextBase} gl
     * @param webglVersion
     * @param {object} options
     * @param {GLuint} options.wrap  texture wrap parameteri
     * @param {GLuint} options.magFilter  texture filter parameteri
     * @param {GLuint} options.minFilter  texture filter parameteri
     * @param {string|WebGLModule.IDataLoader} options.dataLoader class name or implementation of a given loader
     */
    constructor(renderer, gl, webglVersion, options) {
        //Set default blending to be MASK
        this.renderer = renderer;
        this.gl = gl;
        this.glslBlendCode = "return background * (step(0.001, foreground.a));";

        let Loader = options.dataLoader;
        if (typeof Loader === "string") {
            Loader = $.WebGLModule.Loaders[Loader];
        }
        if (!Loader) {
            throw("Unknown data loader: " + options.dataLoader);
        }
        if (!(Loader.prototype instanceof $.WebGLModule.IDataLoader)) {
            throw("Incompatible texture loader used: " + options.dataLoader);
        }

        this._texture = new Loader(gl, webglVersion, options);
        if (!this.texture.supportsWebglVersion(this.getVersion())) {
            throw("Incompatible texture loader version to the renderer context version! Context WebGL" + this.getVersion());
        }
    }

    /**
     * Static context creation (to avoid class instantiation in case of missing support)
     * @param canvas
     * @return {WebGLRenderingContextBase} //todo base is not common to all, remove from docs
     */
    static create(canvas) {
        throw("::create() must be implemented!");
    }

    /**
     * @return {string} WebGL version used
     */
    getVersion() {
        return "undefined";
    }

    /**
     * Get GLSL texture sampling code
     * @return {string} GLSL code that is correct in texture sampling wrt. WebGL version used
     */
    get texture() {
        return this._texture;
    }

    /**
     * Create a visualisation from the given JSON params
     * @param {string[]} order keys of visualisation.shader in which order to build the visualization
     *   the order: painter's algorithm: the last drawn is the most visible
     * @param {object} visualisation
     * @param {[number]} shaderDataIndexToGlobalDataIndex
     * @param {boolean} withHtml whether html should be also created (false if no UI controls are desired)
     * @return {object} compiled specification object ready to be used by the wrapper, with the following keys:
         {string} object.vertexShader vertex shader code
         {string} object.fragmentShader fragment shader code
         {string} object.html html for the UI
         {number} object.usableShaders how many layers are going to be visualised
         {(array|string[])} object.dataUrls ID's of data in use (keys of visualisation.shaders object) in desired order
                    the data is guaranteed to arrive in this order (images stacked below each other in imageElement)
     */
    compileSpecification(order, visualisation, shaderDataIndexToGlobalDataIndex, withHtml) {
        throw("::compileSpecification() must be implemented!");
    }

    /**
     * Called once program is switched to: initialize all necessary items
     * @param {WebGLProgram} program  used program
     * @param {OpenSeadragon.WebGLModule.RenderingConfig} currentConfig  JSON parameters used for this visualisation
     */
    programLoaded(program, currentConfig) {
        throw("::programLoaded() must be implemented!");
    }

    /**
     * Draw on the canvas using given program
     * @param {WebGLProgram} program  used program
     * @param {OpenSeadragon.WebGLModule.RenderingConfig} currentConfig  JSON parameters used for this visualisation
     *
     * @param {string} id dataId
     * @param {object} tileOpts
     * @param {number} tileOpts.zoom value passed to the shaders as zoom_level
     * @param {number} tileOpts.pixelSize value passed to the shaders as pixel_size_in_fragments
     * @param {OpenSeadragon.Mat3} tileOpts.transform position of the rendered tile
     */
    programUsed(program, currentConfig, id, tileOpts) {
        throw("::programUsed() must be implemented!");
    }

    /**
     * Code to be included only once, required by given shader type (keys are considered global)
     * @param {string} type shader type
     * @returns {object} global-scope code used by the shader in <key: code> format
     */
    globalCodeRequiredByShaderType(type) {
        return $.WebGLModule.ShaderMediator.getClass(type).__globalIncludes;
    }

    /**
     * Blend equation sent from the outside, must be respected
     * @param glslCode code for blending, using two variables: 'foreground', 'background'
     * @example
     * //The shader context must define the following:
     *
     * vec4 some_blending_name_etc(in vec4 background, in vec4 foreground) {
     *     // << glslCode >>
     * }
     *
     * void blend_clip(vec4 input) {
     *     //for details on clipping mask approach see show() below
     *     // <<use some_blending_name_etc() to blend input onto output color of the shader using a clipping mask>>
     * }
     *
     * void blend(vec4 input) { //must be called blend, API
     *     // <<use some_blending_name_etc() to blend input onto output color of the shader>>
     * }
     *
     * //Also, default alpha blending equation 'show' must be implemented:
     * void show(vec4 color) {
     *    //pseudocode
     *    //note that the blending output should not immediatelly work with 'color' but perform caching of the color,
     *    //render the color given in previous call and at the execution end of main call show(vec4(.0))
     *    //this way, the previous color is not yet blended for the next layer show/blend/blend_clip which can use it to create a clipping mask
     *
     *    compute t = color.a + background.a - color.a*background.a;
     *    output vec4((color.rgb * color.a + background.rgb * background.a - background.rgb * (background.a * color.a)) / t, t)
     * }
     */
    setBlendEquation(glslCode) {
        this.glslBlendCode = glslCode;
    }
};

$.WebGLModule.WebGL20 = class extends $.WebGLModule.WebGLImplementation {
    /**
     *
     * @param {OpenSeadragon.WebGLModule} renderer
     * @param {WebGL2RenderingContext} gl
     * @param options
     */
    constructor(renderer, gl, options) {
        super(renderer, gl, "2.0", options);
        this.emptyBuffer = gl.createBuffer();
    }

    getVersion() {
        return "2.0";
    }

    static create(canvas) {
        return canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true });
    }

    //todo try to implement on the global scope version-independntly
    compileSpecification(order, visualisation, shaderDataIndexToGlobalDataIndex, withHtml) {
        var definition = "",
            execution = "",
            html = "",
            _this = this,
            usableShaders = 0,
            globalScopeCode = {};

        order.forEach(dataId => {
            let layer = visualisation.shaders[dataId];
            layer.rendering = false;

            if (layer.type === "none") {
                //prevents the layer from being accounted for
                layer.error = "Not an error - layer type none.";
            } else if (layer.error) {
                if (withHtml) {
                    html = _this.renderer.htmlShaderPartHeader(layer.name, layer.error, dataId, false, layer, false) + html;
                }
                console.warn(layer.error, layer["desc"]);

            } else if (layer._renderContext && (layer._index || layer._index === 0)) {
                let visible = false;
                usableShaders++;

                //make visible textures if 'visible' flag set
                if (layer.visible) {
                    let renderCtx = layer._renderContext;
                    definition += renderCtx.getFragmentShaderDefinition() + `
vec4 lid_${layer._index}_xo() {
    ${renderCtx.getFragmentShaderExecution()}
}`;
                    if (renderCtx.opacity) {
                        execution += `
    vec4 l${layer._index}_out = lid_${layer._index}_xo();
    l${layer._index}_out.a *= ${renderCtx.opacity.sample()};
    ${renderCtx.__mode}(l${layer._index}_out);`;
                    } else {
                        execution += `
    ${renderCtx.__mode}(lid_${layer._index}_xo());`;
                    }

                    layer.rendering = true;
                    visible = true;
                    OpenSeadragon.extend(globalScopeCode, _this.globalCodeRequiredByShaderType(layer.type));
                }

                //reverse order append to show first the last drawn element (top)
                if (withHtml) {
                    html = _this.renderer.htmlShaderPartHeader(layer.name,
                        layer._renderContext.htmlControls(), dataId, visible, layer, true) + html;
                }
            } else {
                if (withHtml) {
                    html = _this.renderer.htmlShaderPartHeader(layer.name,
                        `The requested visualisation type does not work properly.`, dataId, false, layer, false) + html;
                }
                console.warn("Invalid shader part.", "Missing one of the required elements.", layer);
            }
        });

        return {
            vertexShader: this.getVertexShader(),
            fragmentShader: this.getFragmentShader(definition, execution, shaderDataIndexToGlobalDataIndex, globalScopeCode),
            html: html,
            usableShaders: usableShaders,
            dataUrls: this.renderer._dataSources
        };
    }

    getFragmentShader(definition, execution, shaderDataIndexToGlobalDataIndex, globalScopeCode) {
        return `#version 300 es
precision mediump float;
precision mediump sampler2DArray;
precision mediump sampler2D;

${this.texture.declare(shaderDataIndexToGlobalDataIndex)}
uniform float pixel_size_in_fragments;
uniform float zoom_level;
uniform vec2 u_tile_size;
vec4 _last_rendered_color = vec4(.0);

in vec2 tile_texture_coords;

out vec4 final_color;

bool close(float value, float target) {
    return abs(target - value) < 0.001;
}

void show(vec4 color) {
    //premultiplied alpha blending
    vec4 fg = _last_rendered_color;
    _last_rendered_color = color;
    vec4 pre_fg = vec4(fg.rgb * fg.a, fg.a);
    final_color = pre_fg + final_color;
}

vec4 blend_equation(in vec4 foreground, in vec4 background) {
${this.glslBlendCode}
}

void blend_clip(vec4 foreground) {
    _last_rendered_color = blend_equation(foreground, _last_rendered_color);
}

void blend(vec4 foreground) {
    show(_last_rendered_color);
    final_color = blend_equation(foreground, final_color);
    _last_rendered_color = vec4(.0);
}

${Object.values(globalScopeCode).join("\n")}

${definition}

void main() {
    ${execution}

    //blend last level
    show(vec4(.0));
}`;
    }

    getVertexShader() {
        //UNPACK_FLIP_Y_WEBGL not supported with 3D textures so sample bottom up
        return `#version 300 es
precision mediump float;

uniform mat3 transform_matrix;
out vec2 tile_texture_coords;
const vec3 quad[4] = vec3[4] (
    vec3(0.0, 1.0, 1.0),
    vec3(0.0, 0.0, 1.0),
    vec3(1.0, 1.0, 1.0),
    vec3(1.0, 0.0, 1.0)
);

void main() {
    vec3 vertex = quad[gl_VertexID];
    tile_texture_coords = vec2(vertex.x, -vertex.y);
    gl_Position = vec4(transform_matrix * vertex, 1);
}
`;
    }

    programLoaded(program, currentConfig) {
        if (!this.renderer.running) {
            return;
        }

        let context = this.renderer,
            gl = this.gl;

        // Allow for custom loading
        gl.useProgram(program);
        context.visualisationInUse(currentConfig);
        context.glLoaded(gl, program, currentConfig);

        //Note that the drawing strategy is not to resize canvas, and simply draw everyhing on squares
        this.texture.programLoaded(context, gl, program, currentConfig);

        //Empty ARRAY: get the vertices directly from the shader
        gl.bindBuffer(gl.ARRAY_BUFFER, this.emptyBuffer);
    }

    programUsed(program, currentConfig, id, tileOpts) {
        if (!this.renderer.running) {
            return;
        }
        // Allow for custom drawing in webGL and possibly avoid using webGL at all

        let context = this.renderer,
            gl = this.gl;

        context.glDrawing(gl, program, currentConfig, tileOpts);

        // Set Attributes for GLSL
        gl.uniform1f(gl.getUniformLocation(program, "pixel_size_in_fragments"), tileOpts.pixelSize || 1);
        gl.uniform1f(gl.getUniformLocation(program, "zoom_level"), tileOpts.zoom || 1);
        gl.uniformMatrix3fv(gl.getUniformLocation(program, "transform_matrix"), false,
            tileOpts.transform || OpenSeadragon.Mat3.makeIdentity());

        // Upload textures
        this.texture.programUsed(context, currentConfig, id, program, gl);

        // Draw triangle strip (two triangles) from a static array defined in the vertex shader
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
};

})(OpenSeadragon);
