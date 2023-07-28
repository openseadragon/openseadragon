(function($) {

    /**
 * Shader sharing point
 * @class OpenSeadragon.WebGLModule.ShaderMediator
 */
$.WebGLModule.ShaderMediator = class {

    /**
     * Register shader
     * @param {function} LayerRendererClass class extends OpenSeadragon.WebGLModule.ShaderLayer
     */
    static registerLayer(LayerRendererClass) {
        //todo why not hasOwnProperty check allowed by syntax checker
        // if (this._layers.hasOwnProperty(LayerRendererClass.type())) {
        //     console.warn("Registering an already existing layer renderer:", LayerRendererClass.type());
        // }
        // if (!$.WebGLModule.ShaderLayer.isPrototypeOf(LayerRendererClass)) {
        //     throw `${LayerRendererClass} does not inherit from ShaderLayer!`;
        // }
        this._layers[LayerRendererClass.type()] = LayerRendererClass;
    }

    /**
     * Get the shader class by type id
     * @param {string} id
     * @return {function} class extends OpenSeadragon.WebGLModule.ShaderLayer
     */
    static getClass(id) {
        return this._layers[id];
    }

    /**
     * Get all available shaders
     * @return {function[]} classes that extend OpenSeadragon.WebGLModule.ShaderLayer
     */
    static availableShaders() {
        return Object.values(this._layers);
    }
};
//todo why cannot be inside object :/
$.WebGLModule.ShaderMediator._layers = {};


/**
 * Abstract interface to any Shader.
 * @abstract
 */
$.WebGLModule.ShaderLayer = class {

    /**
     * Override **static** type definition
     * The class must be registered using the type
     * @returns {string} unique id under which is the shader registered
     */
    static type() {
        throw "ShaderLayer::type() Type must be specified!";
    }

    /**
     * Override **static** name definition
     * @returns {string} name of the shader (user-friendly)
     */
    static name() {
        throw "ShaderLayer::name() Name must be specified!";
    }

    /**
     * Provide description
     * @returns {string} optional description
     */
    static description() {
        return "ShaderLayer::description() WebGL shader must provide description.";
    }

    /**
     * Declare the number of data sources it reads from (how many dataSources indexes should the shader contain)
     * @return {Array.<Object>} array of source specifications:
     *  acceptsChannelCount: predicate that evaluates whether given number of channels (argument) is acceptable
     *  [optional] description: the description of the source - what it is being used for
     */
    static sources() {
        throw "ShaderLayer::sources() Shader must specify channel acceptance predicates for each source it uses!";
    }

    /**
     * Global supported options
     * @param {string} id unique ID among all webgl instances and shaders
     * @param {OpenSeadragon.WebGLModule.ShaderLayerParams} options
     *  options.channel: "r", "g" or "b" channel to sample, default "r"
     *  options.use_mode: blending mode - default alpha ("show"), custom blending ("mask") and clipping mask blend ("mask_clip")
     *  options.use_[*]: filtering, gamma/exposure/logscale with a float filter parameter (e.g. "use_gamma" : 1.5)
     * @param {object} privateOptions options that should not be touched, necessary for linking the layer to the core
     */
    constructor(id, options, privateOptions) {
        this.uid = id;
        this._setContextShaderLayer(privateOptions.layer);
        this.webglContext = privateOptions.webgl;
        this.invalidate = privateOptions.invalidate;
        //use with care...
        this._rebuild = privateOptions.rebuild;

        this._buildControls(options);
        this.resetChannel(options);
        this.resetMode(options);
    }

    /**
     * Code placed outside fragment shader's main(...).
     * By default, it includes all definitions of
     * controls you defined in defaultControls
     *
     *  NOTE THAT ANY VARIABLE NAME
     *  WITHIN THE GLOBAL SPACE MUST BE
     *  ESCAPED WITH UNIQUE ID: this.uid
     *
     *  DO NOT SAMPLE TEXTURE MANUALLY: use this.sampleChannel(...) to generate the code
     *
     *  WHEN OVERRIDING, INCLUDE THE OUTPUT OF THIS METHOD AT THE BEGINNING OF THE NEW OUTPUT.
     *
     * @return {string}
     */
    getFragmentShaderDefinition() {
        let controls = this.constructor.defaultControls,
            html = [];
        for (let control in controls) {
            if (control.startsWith("use_")) {
                continue;
            }

            const controlObject = this[control];
            if (controlObject) {
                let code = controlObject.define();
                if (code) {
                    code = code.trim();
                    html.push(code);
                }
            }
        }
        return html.join("\n");
    }

    /**
     * Code executed to create the output color. The code
     * must always return a vec4 value, otherwise the visualization
     * will fail to compile (this code actually runs inside a vec4 function).
     *
     *  DO NOT SAMPLE TEXTURE MANUALLY: use this.sampleChannel(...) to generate the code
     *
     * @return {string}
     */
    getFragmentShaderExecution() {
        throw "ShaderLayer::getFragmentShaderExecution must be implemented!";
    }

    /**
     * Called when an image is rendered
     * @param {WebGLProgram} program WebglProgram instance
     * @param {WebGLRenderingContextBase} gl
     */
    glDrawing(program, gl) {
        let controls = this.constructor.defaultControls;
        for (let control in controls) {
            if (control.startsWith("use_")) {
                continue;
            }

            const controlObject = this[control];
            if (controlObject) {
                controlObject.glDrawing(program, gl);
            }
        }
    }

    /**
     * Called when associated webgl program is switched to
     * @param {WebGLProgram} program WebglProgram instance
     * @param {WebGLRenderingContextBase} gl WebGL Context
     */
    glLoaded(program, gl) {
        let controls = this.constructor.defaultControls;
        for (let control in controls) {
            if (control.startsWith("use_")) {
                continue;
            }

            const controlObject = this[control];
            if (controlObject) {
                controlObject.glLoaded(program, gl);
            }
        }
    }

    /**
     * This function is called once at
     * the beginning of the layer use
     * (might be multiple times), after htmlControls()
     */
    init() {
        let controls = this.constructor.defaultControls;
        for (let control in controls) {
            if (control.startsWith("use_")) {
                continue;
            }

            const controlObject = this[control];
            if (controlObject) {
                controlObject.init();
            }
        }
    }

    /**
     * Get the shader UI controls
     * @return {string} HTML controls for the particular shader
     */
    htmlControls() {
        let controls = this.constructor.defaultControls,
            html = [];
        for (let control in controls) {
            if (control.startsWith("use_")) {
                continue;
            }

            const controlObject = this[control];
            if (controlObject) {
                html.push(controlObject.toHtml(true));
            }
        }
        return html.join("");
    }

    /**
     * Include GLSL shader code on global scope
     * (e.g. define function that is repeatedly used)
     * does not have to use unique ID extended names as this code is included only once
     * @param {string} key a key under which is the code stored, so that the same key is not loaded twice
     * @param {string} code GLSL code to add to the shader
     */
    includeGlobalCode(key, code) {
        let container = this.constructor.__globalIncludes;
        if (!container[key]) {
            container[key] = code;
        }
    }

    /**
     * Parses value to a float string representation with given precision (length after decimal)
     * @param {number} value value to convert
     * @param {number} defaultValue default value on failure
     * @param {number} precisionLen number of decimals
     * @return {string}
     */
    toShaderFloatString(value, defaultValue, precisionLen = 5) {
        return this.constructor.toShaderFloatString(value, defaultValue, precisionLen);
    }

    /**
     * Parses value to a float string representation with given precision (length after decimal)
     * @param {number} value value to convert
     * @param {number} defaultValue default value on failure
     * @param {number} precisionLen number of decimals
     * @return {string}
     */
    static toShaderFloatString(value, defaultValue, precisionLen = 5) {
        if (!Number.isInteger(precisionLen) || precisionLen < 0 || precisionLen > 9) {
            precisionLen = 5;
        }
        try {
            return value.toFixed(precisionLen);
        } catch (e) {
            return defaultValue.toFixed(precisionLen);
        }
    }

    /**
     * Sample only one channel (which is defined in options)
     * @param {string} textureCoords valid GLSL vec2 object as string
     * @param {number} otherDataIndex index of the data in self.dataReference JSON array
     * @param {boolean} raw whether to output raw value from the texture (do not apply filters)
     * @return {string} code for appropriate texture sampling within the shader,
     *                  where only one channel is extracted or float with zero value if
     *                  the reference is not valid
     */
    sampleChannel(textureCoords, otherDataIndex = 0, raw = false) {
        let refs = this.__visualisationLayer.dataReferences;
        const chan = this.__channels[otherDataIndex];

        if (otherDataIndex >= refs.length) {
            switch (chan.length) {
                case 1: return ".0";
                case 2: return "vec2(.0)";
                case 3: return "vec3(.0)";
                default:
                    return 'vec4(0.0)';
            }
        }
        let sampled = `${this.webglContext.texture.sample(refs[otherDataIndex], textureCoords)}.${chan}`;
        // if (raw) return sampled;
        // return this.filter(sampled);
        return sampled;
    }

    /**
     * For error detection, how many textures are available
     * @return {number} number of textures available
     */
    dataSourcesCount() {
        return this.__visualisationLayer.dataReferences.length;
    }

    /**
     * Load value, useful for controls value caching
     * @param {string} name value name
     * @param {string} defaultValue default value if no stored value available
     * @return {string} stored value or default value
     */
    loadProperty(name, defaultValue) {
        let selfType = this.constructor.type();
        if (!this.__visualisationLayer) {
            return defaultValue;
        }

        const value = this.__visualisationLayer.cache[selfType][name];
        return value === undefined ? defaultValue : value;
    }

    /**
     * Store value, useful for controls value caching
     * @param {string} name value name
     * @param {*} value value
     */
    storeProperty(name, value) {
        this.__visualisationLayer.cache[this.constructor.type()][name] = value;
    }

    /**
     * Evaluates option flag, e.g. any value that indicates boolean 'true'
     * @param {*} value value to interpret
     * @return {boolean} true if the value is considered boolean 'true'
     */
    isFlag(value) {
        return value === "1" || value === true || value === "true";
    }

    isFlagOrMissing(value) {
        return value === undefined || this.isFlag(value);
    }

    /**
     * Get the mode we operate in
     * @return {string} mode
     */
    get mode() {
        return this._mode;
    }

    /**
     * Returns number of textures available to this shader
     * @return {number} number of textures available
     */
    get texturesCount() {
        return this.__visualisationLayer.dataReferences.length;
    }

    /**
     * Set sampling channel
     * @param {object} options
     * @param {string} options.use_channel[X] chanel swizzling definition to sample
     */
    resetChannel(options) {
        const parseChannel = (name, def, sourceDef) => {
            const predefined = this.constructor.defaultControls[name];

            if (options[name] || predefined) {
                let channel = predefined ? (predefined.required ? predefined.required : predefined.default) : undefined;
                if (!channel) {
                    channel = this.loadProperty(name, options[name]);
                }

                if (!channel || typeof channel !== "string" || this.constructor.__chanPattern.exec(channel) === null) {
                    console.warn(`Invalid channel '${name}'. Will use channel '${def}'.`, channel, options);
                    this.storeProperty(name, "r");
                    channel = def;
                }

                if (!sourceDef.acceptsChannelCount(channel.length)) {
                    throw `${this.constructor.name()} does not support channel length for channel: ${channel}`;
                }

                if (channel !== options[name]) {
                    this.storeProperty(name, channel);
                }
                return channel;
            }
            return def;
        };
        this.__channels = this.constructor.sources().map((source, i) => parseChannel(`use_channel${i}`, "r", source));
    }

    /**
     * Set blending mode
     * @param {object} options
     * @param {string} options.use_mode blending mode to use: "show" or "mask"
     */
    resetMode(options) {
        const predefined = this.constructor.defaultControls.use_mode;
        if (options["use_mode"]) {
            this._mode = predefined && predefined.required;
            if (!this._mode) {
                this._mode = this.loadProperty("use_mode", options.use_mode);
            }

            if (this._mode !== options.use_mode) {
                this.storeProperty("use_mode", this._mode);
            }
        } else {
            this._mode = predefined ? (predefined.default || "show") : "show";
        }

        this.__mode = this.constructor.modes[this._mode] || "show";
    }

    ////////////////////////////////////
    ////////// PRIVATE /////////////////
    ////////////////////////////////////


    _buildControls(options) {
        let controls = this.constructor.defaultControls;

        if (controls.opacity === undefined || (typeof controls.opacity === "object" && !controls.opacity.accepts("float"))) {
            controls.opacity = {
                default: {type: "range", default: 1, min: 0, max: 1, step: 0.1, title: "Opacity: "},
                accepts: (type, instance) => type === "float"
            };
        }

        for (let control in controls) {
            let buildContext = controls[control];

            if (buildContext) {
                if (control.startsWith("use_")) {
                    continue;
                }

                this[control] = $.WebGLModule.UIControls.build(this, control, options[control],
                    buildContext.default, buildContext.accepts, buildContext.required);
            }
        }
    }

    _setContextShaderLayer(visualisationLayer) {
        this.__visualisationLayer = visualisationLayer;
        if (!this.__visualisationLayer.cache) {
            this.__visualisationLayer.cache = {};
        }
        if (!this.__visualisationLayer.cache[this.constructor.type()]) {
            this.__visualisationLayer.cache[this.constructor.type()] = {};
        }
    }
};

/**
 * Declare supported controls by a particular shader
 * each controls is automatically created for the shader
 * and this[controlId] instance set
 * structure:
 * {
 *     controlId: {
               default: {type: <>, title: <>, interactive: true|false...},
               accepts: (type, instance) => <>,
               required: {type: <> ...} [OPTIONAL]
 *     }, ...
 * }
 *
 * use: controlId: false to disable a specific control (e.g. all shaders
 *  support opacity by default - use to remove this feature)
 *
 *
 * Additionally, use_[...] value can be specified, such controls enable shader
 * to specify default or required values for built-in use_[...] params. example:
 * {
 *     use_channel0: {
 *         default: "bg"
 *     },
 *     use_channel1: {
 *         required: "rg"
 *     },
 *     use_gamma: {
 *         default: 0.5
 *     }
 * }
 * reads by default for texture 1 channels 'bg', second texture is always forced to read 'rg',
 * textures apply gamma filter with 0.5 by default if not overridden
 * todo: allow to use_[filter][X] to distinguish between textures
 *
 * @member {object}
 */
$.WebGLModule.ShaderLayer.defaultControls = {};


/**
 * todo make blending more 'nice'
 * Available use_mode modes
 * @type {{show: string, mask: string}}
 */
$.WebGLModule.ShaderLayer.modes = {
    show: "show",
    mask: "blend"
};
$.WebGLModule.ShaderLayer.modes["mask_clip"] = "blend_clip"; //todo parser error not camel case
$.WebGLModule.ShaderLayer.__globalIncludes = {};
$.WebGLModule.ShaderLayer.__chanPattern = new RegExp('[rgba]{1,4}');

/**
 * Factory Manager for predefined UIControls
 *  - you can manage all your UI control logic within your shader implementation
 *  and not to touch this class at all, but here you will find some most common
 *  or some advanced controls ready to use, simple and powerful
 *  - registering an IComponent implementation (or an UiElement) in the factory results in its support
 *  among all the shaders (given the GLSL type, result of sample(...) matches).
 *  - UiElements are objects to create simple controls quickly and get rid of code duplicity,
 *  for more info @see OpenSeadragon.WebGLModule.UIControls.register()
 * @class OpenSeadragon.WebGLModule.UIControls
 */
$.WebGLModule.UIControls = class {

    /**
     * Get all available control types
     * @return {string[]} array of available control types
     */
    static types() {
        return Object.keys(this._items).concat(Object.keys(this._impls));
    }

    /**
     * Get an element used to create simple controls, if you want
     * an implementation of the controls themselves (IControl), use build(...) to instantiate
     * @param {string} id type of the control
     * @return {*}
     */
    static getUiElement(id) {
        let ctrl = this._items[id];
        if (!ctrl) {
            console.error("Invalid control: " + id);
            ctrl = this._items["number"];
        }
        return ctrl;
    }

    /**
     * Get an element used to create advanced controls, if you want
     * an implementation of simple controls, use build(...) to instantiate
     * @param {string} id type of the control
     * @return {OpenSeadragon.WebGLModule.UIControls.IControl}
     */
    static getUiClass(id) {
        let ctrl = this._impls[id];
        if (!ctrl) {
            console.error("Invalid control: " + id);
            ctrl = this._impls["colormap"];
        }
        return ctrl;
    }

    /**
     * Build UI control object based on given parameters
     * @param {OpenSeadragon.WebGLModule.ShaderLayer} context owner of the control
     * @param {string} name name used for the layer, should be unique among different context types
     * @param {object|*} params parameters passed to the control (defined by the control) or set as default value if not object
     * @param {object} defaultParams default parameters that the shader might leverage above defaults of the control itself
     * @param {function} accepts required GLSL type of the control predicate, for compatibility typechecking
     * @param {object} requiredParams parameters that override anything sent by user or present by defaultParams
     * @return {OpenSeadragon.WebGLModule.UIControls.IControl}
     */
    static build(context, name, params, defaultParams = {}, accepts = () => true, requiredParams = {}) {
        //if not an object, but a value: make it the default one
        if (!(typeof params === 'object')) {
            params = {default: params};
        }
        let originalType = defaultParams.type;

        defaultParams = $.extend(true, {}, defaultParams, params, requiredParams);

        if (!this._items[defaultParams.type]) {
            if (!this._impls[defaultParams.type]) {
                return this._buildFallback(defaultParams.type, originalType, context,
                    name, params, defaultParams, accepts, requiredParams);
            }

            let cls = new this._impls[defaultParams.type](
                context, name, `${name}_${context.uid}`, defaultParams
            );
            if (accepts(cls.type, cls)) {
                return cls;
            }
            return this._buildFallback(defaultParams.type, originalType, context,
                name, params, defaultParams, accepts, requiredParams);
        } else {
            let contextComponent = this.getUiElement(defaultParams.type);
            let comp = new $.WebGLModule.UIControls.SimpleUIControl(
                context, name, `${name}_${context.uid}`, defaultParams, contextComponent
            );
            if (accepts(comp.type, comp)) {
                return comp;
            }
            return this._buildFallback(contextComponent.glType, originalType, context,
                name, params, defaultParams, accepts, requiredParams);
        }
    }

    /**
     * Register simple UI element by providing necessary object
     * implementation:
     *  { defaults: function() {...}, // object with all default values for all supported parameters
          html: function(uniqueId, params, css="") {...}, //how the HTML UI controls look like
          glUniformFunName: function() {...}, //what function webGL uses to pass this attribute to GPU
          decode: function(fromValue) {...}, //parse value obtained from HTML controls into something
                                                gl[glUniformFunName()](...) can pass to GPU
          glType: //what's the type of this parameter wrt. GLSL: int? vec3?
     * @param type the identifier under which is this control used: lookup made against params.type
     * @param uiElement the object to register, fulfilling the above-described contract
     */
    static register(type, uiElement) {
        function check(el, prop, desc) {
            if (!el[prop]) {
                console.warn(`Skipping UI control '${type}' due to '${prop}': missing ${desc}.`);
                return false;
            }
            return true;
        }

        if (check(uiElement, "defaults", "defaults():object") &&
            check(uiElement, "html", "html(uniqueId, params, css):htmlString") &&
            check(uiElement, "glUniformFunName", "glUniformFunName():string") &&
            check(uiElement, "decode", "decode(encodedValue):<compatible with glType>") &&
            check(uiElement, "normalize", "normalize(value, params):<typeof value>") &&
            check(uiElement, "sample", "sample(value, valueGlType):glslString") &&
            check(uiElement, "glType", "glType:string")
        ) {
            uiElement.prototype.getName = () => type;
            if (this._items[type]) {
                console.warn("Registering an already existing control component: ", type);
            }
            uiElement["uiType"] = type;
            this._items[type] = uiElement;
        }
    }

    /**
     * Register class as a UI control
     * @param {string} type unique control name / identifier
     * @param {OpenSeadragon.WebGLModule.UIControls.IControl} cls to register, implementation class of the controls
     */
    static registerClass(type, cls) {
        //todo not really possible with syntax checker :/
        // if ($.WebGLModule.UIControls.IControl.isPrototypeOf(cls)) {
            cls.prototype.getName = () => type;

            if (this._items[type]) {
                console.warn("Registering an already existing control component: ", type);
            }
            cls._uiType = type;
            this._impls[type] = cls;
        // } else {
        //     console.warn(`Skipping UI control '${type}': does not inherit from $.WebGLModule.UIControls.IControl.`);
        // }
    }

    /////////////////////////
    /////// PRIVATE /////////
    /////////////////////////


    static _buildFallback(newType, originalType, context, name, params, defaultParams, requiredType, requiredParams) {
        //repeated check when building object from type

        params.interactive = false;
        if (originalType === newType) { //if default and new equal, fail - recursion will not help
            console.error(`Invalid parameter in shader '${params.type}': the parameter could not be built.`);
            return undefined;
        } else { //otherwise try to build with originalType (default)
            params.type = originalType;
            console.warn("Incompatible UI control type '" + newType + "': making the input non-interactive.");
            return this.build(context, name, params, defaultParams, requiredType, requiredParams);
        }
    }
};

//implementation of UI control classes
//more complex functionality
$.WebGLModule.UIControls._impls = {
    //colormap: $.WebGLModule.UIControls.ColorMap
};
//implementation of UI control objects
//simple functionality
$.WebGLModule.UIControls._items = {
    number: {
        defaults: function() {
            return {title: "Number", interactive: true, default: 0, min: 0, max: 100, step: 1};
        },
        html: function(uniqueId, params, css = "") {
            let title = params.title ? `<span> ${params.title}</span>` : "";
            return `${title}<input class="form-control input-sm" style="${css}" min="${params.min}" max="${params.max}"
step="${params.step}" type="number" id="${uniqueId}">`;
        },
        glUniformFunName: function() {
            return "uniform1f";
        },
        decode: function(fromValue) {
            return Number.parseFloat(fromValue);
        },
        normalize: function(value, params) {
            return (value - params.min) / (params.max - params.min);
        },
        sample: function(name, ratio) {
            return name;
        },
        glType: "float",
        uiType: "number"
    },

    range: {
        defaults: function() {
            return {title: "Range", interactive: true, default: 0, min: 0, max: 100, step: 1};
        },
        html: function(uniqueId, params, css = "") {
            let title = params.title ? `<span> ${params.title}</span>` : "";
            return `${title}<input type="range" style="${css}"
class="with-direct-input" min="${params.min}" max="${params.max}" step="${params.step}" id="${uniqueId}">`;
        },
        glUniformFunName: function() {
            return "uniform1f";
        },
        decode: function(fromValue) {
            return Number.parseFloat(fromValue);
        },
        normalize: function(value, params) {
            return (value - params.min) / (params.max - params.min);
        },
        sample: function(name, ratio) {
            return name;
        },
        glType: "float",
        uiType: "range"
    },

    color: {
        defaults: function() {
            return { title: "Color", interactive: true, default: "#fff900" };
        },
        html: function(uniqueId, params, css = "") {
            let title = params.title ? `<span> ${params.title}</span>` : "";
            return `${title}<input type="color" id="${uniqueId}" style="${css}" class="form-control input-sm">`;
        },
        glUniformFunName: function() {
            return "uniform3fv";
        },
        decode: function(fromValue) {
            try {
                let index = fromValue.startsWith("#") ? 1 : 0;
                return [
                    parseInt(fromValue.slice(index, index + 2), 16) / 255,
                    parseInt(fromValue.slice(index + 2, index + 4), 16) / 255,
                    parseInt(fromValue.slice(index + 4, index + 6), 16) / 255
                ];
            } catch (e) {
                return [0, 0, 0];
            }
        },
        normalize: function(value, params) {
            return value;
        },
        sample: function(name, ratio) {
            return name;
        },
        glType: "vec3",
        uiType: "color"
    },

    bool: {
        defaults: function() {
            return { title: "Checkbox", interactive: true, default: true };
        },
        html: function(uniqueId, params, css = "") {
            let title = params.title ? `<span> ${params.title}</span>` : "";
            let value = this.decode(params.default) ? "checked" : "";
            //note a bit dirty, but works :) - we want uniform access to 'value' property of all inputs
            return `${title}<input type="checkbox" style="${css}" id="${uniqueId}" ${value}
class="form-control input-sm" onchange="this.value=this.checked; return true;">`;
        },
        glUniformFunName: function() {
            return "uniform1i";
        },
        decode: function(fromValue) {
            return fromValue && fromValue !== "false" ? 1 : 0;
        },
        normalize: function(value, params) {
            return value;
        },
        sample: function(name, ratio) {
            return name;
        },
        glType: "bool",
        uiType: "bool"
    }
};

/**
 * @interface
 */
$.WebGLModule.UIControls.IControl = class {

    /**
     * Sets common properties needed to create the controls:
     *  this.context @extends WebGLModule.ShaderLayer - owner context
     *  this.name - name of the parameter for this.context.[load/store]Property(...) call
     *  this.id - unique ID for HTML id attribute, to be able to locate controls in DOM,
     *      created as ${uniq}${name}-${context.uid}
     *  this.webGLVariableName - unique webgl uniform variable name, to not to cause conflicts
     *
     * If extended (class-based definition, see registerCass) children should define constructor as
     *
     * @example
     *   constructor(context, name, webGLVariableName, params) {
     *       super(context, name, webGLVariableName);
     *       ...
     *       //possibly make use of params:
     *       this.params = this.getParams(params);
     *
     *       //now access params:
     *       this.params...
     *   }
     *
     * @param {WebGLModule.ShaderLayer} context shader context owning this control
     * @param {string} name name of the control (key to the params in the shader configuration)
     * @param {string} webGLVariableName configuration parameters,
     *      depending on the params.type field (the only one required)
     * @param {string} uniq another element to construct the DOM id from, mostly for compound controls
     */
    constructor(context, name, webGLVariableName, uniq = "") {
        this.context = context;
        this.id = `${uniq}${name}-${context.uid}`;
        this.name = name;
        this.webGLVariableName = webGLVariableName;
        this._params = {};
        this.__onchange = {};
    }

    /**
     * Safely sets outer params with extension from 'supports'
     *  - overrides 'supports' values with the correct type (derived from supports or supportsAll)
     *  - sets 'supports' as defaults if not set
     * @param params
     */
    getParams(params) {
        const t = this.constructor.getVarType;
        function mergeSafeType(mask, from, possibleTypes) {
            const to = Object.assign({}, mask);
            Object.keys(from).forEach(key => {
                const tVal = to[key],
                    fVal = from[key],
                    tType = t(tVal),
                    fType = t(fVal);

                const typeList = possibleTypes ? possibleTypes[key] : undefined,
                    pTypeList = typeList ? typeList.map(x => t(x)) : [];

                //our type detector distinguishes arrays and objects
                if (tVal && fVal && tType === "object" && fType === "object") {
                    to[key] = mergeSafeType(tVal, fVal, typeList);
                } else if (tVal === undefined || tType === fType || pTypeList.includes(fType)) {
                    to[key] = fVal;
                } else if (fType === "string") {
                    //try parsing NOTE: parsing from supportsAll is ignored!
                    if (tType === "number") {
                        const parsed = Number.parseFloat(fVal);
                        if (!Number.isNaN(parsed)) {
                            to[key] = parsed;
                        }
                    } else if (tType === "boolean") {
                        const value = fVal.toLowerCase();
                        if (value === "false") {
                            to[key] = false;
                        }
                        if (value === "true") {
                            to[key] = true;
                        }
                    }
                }
            });
            return to;
        }
        return mergeSafeType(this.supports, params, this.supportsAll);
    }

    /**
     * Safely check certain param value
     * @param value  value to check
     * @param defaultValue default value to return if check fails
     * @param paramName name of the param to check value type against
     * @return {boolean|number|*}
     */
    getSafeParam(value, defaultValue, paramName) {
        const t = this.constructor.getVarType;
        function nest(suppNode, suppAllNode) {
            if (t(suppNode) !== "object") {
                return [suppNode, suppAllNode];
            }
            if (!suppNode[paramName]) {
                return [undefined, undefined];
            }
            return nest(suppNode[paramName], suppAllNode ? suppAllNode[paramName] : undefined);
        }
        const param = nest(this.supports, this.supportsAll),
            tParam = t(param[0]);

        if (tParam === "object") {
            console.warn("Parameters should not be stored at object level. No type inspection is done.");
            return true; //no supported inspection
        }
        const tValue = t(value);
        //supported type OR supports all types includes the type
        if (tValue === tParam || (param[1] && param[1].map(t).includes(tValue))) {
            return value;
        }

        if (tValue === "string") {
            //try parsing NOTE: parsing from supportsAll is ignored!
            if (tParam === "number") {
                const parsed = Number.parseFloat(value);
                if (!Number.isNaN(parsed)) {
                    return parsed;
                }
            } else if (tParam === "boolean") {
                const val = value.toLowerCase();
                if (val === "false") {
                    return false;
                }
                if (val === "true") {
                    return true;
                }
            }
        }

        //todo test
        console.debug("Failed to load safe param -> new feature, debugging! ", value, defaultValue, paramName);
        return defaultValue;
    }

    /**
     * Uniform behaviour wrt type checking in shaders
     * @param x
     * @return {string}
     */
    static getVarType(x) {
        if (x === undefined) {
            return "undefined";
        }
        if (x === null) {
            return "null";
        }
        return Array.isArray(x) ? "array" : typeof x;
    }

    /**
     * JavaScript initialization
     *  - read/store default properties here using this.context.[load/store]Property(...)
     *  - work with own HTML elements already attached to the DOM
     *      - set change listeners, input values!
     */
    init() {
        throw "WebGLModule.UIControls.IControl::init() must be implemented.";
    }

    /**
     * TODO: improve overall setter API
     * Allows to set the control value programatically.
     * Does not trigger canvas re-rednreing, must be done manually (e.g. control.context.invalidate())
     * @param encodedValue any value the given control can support, encoded
     *  (e.g. as the control acts on the GUI - for input number of
     *    values between 5 and 42, the value can be '6' or 6 or 6.15
     */
    set(encodedValue) {
        throw "WebGLModule.UIControls.IControl::set() must be implemented.";
    }

    /**
     * Called when an image is rendered
     * @param program WebglProgram instance
     * @param {WebGLRenderingContextBase} gl
     */
    glDrawing(program, gl) {
        //the control should send something to GPU
        throw "WebGLModule.UIControls.IControl::glDrawing() must be implemented.";
    }

    /**
     * Called when associated webgl program is switched to
     * @param program WebglProgram instance
     * @param gl WebGL Context
     */
    glLoaded(program, gl) {
        //the control should send something to GPU
        throw "WebGLModule.UIControls.IControl::glLoaded() must be implemented.";
    }

    /**
     * Get the UI HTML controls
     *  - these can be referenced in this.init(...)
     *  - should respect this.params.interactive attribute and return non-interactive output if interactive=false
     *      - don't forget to no to work with DOM elements in init(...) in this case
     */
    toHtml(breakLine = true, controlCss = "") {
        throw "WebGLModule.UIControls.IControl::toHtml() must be implemented.";
    }

    /**
     * Handles how the variable is being defined in GLSL
     *  - should use variable names derived from this.webGLVariableName
     */
    define() {
        throw "WebGLModule.UIControls.IControl::define() must be implemented.";
    }

    /**
     * Sample the parameter using ratio as interpolation, must be one-liner expression so that GLSL code can write
     *    `vec3 mySampledValue = ${this.color.sample("0.2")};`
     * NOTE: you can define your own global-scope functions to keep one-lined sampling,
     * see this.context.includeGlobalCode(...)
     * @param {(string|undefined)} value openGL value/variable, used in a way that depends on the UI control currently active
     *        (do not pass arguments, i.e. 'undefined' just get that value, note that some inputs might require you do it..)
     * @param {string} valueGlType GLSL type of the value
     * @return {string} valid GLSL oneliner (wihtout ';') for sampling the value, or invalid code (e.g. error message) to signal error
     */
    sample(value = undefined, valueGlType = 'void') {
        throw "WebGLModule.UIControls.IControl::sample() must be implemented.";
    }

    /**
     * Parameters supported by this UI component, must contain at least
     *  - 'interactive' - type bool, enables and disables the control interactivity
     *  (by changing the content available when rendering html)
     *  - 'title' - type string, the control title
     *
     *  Additionally, for compatibility reasons, you should, if possible, define
     *  - 'default' - type any; the default value for the particular control
     * @return {{}} name: default value mapping
     */
    get supports() {
        throw "WebGLModule.UIControls.IControl::supports must be implemented.";
    }

    /**
     * Type definitions for supports. Can return empty object. In case of missing
     * type definitions, the type is derived from the 'supports()' default value type.
     *
     * Each key must be an array of default values for the given key if applicable.
     * This is an _extension_ to the supports() and can be used only for keys that have more
     * than one default type applicable
     * @return {{}}
     */
    get supportsAll() {
        throw "WebGLModule.UIControls.IControl::typeDefs must be implemented.";
    }

    /**
     * GLSL type of this control: what type is returned from this.sample(...) ?
     * @return {string}
     */
    get type() {
        throw "WebGLModule.UIControls.IControl::type must be implemented.";
    }

    /**
     * Raw value sent to the GPU, note that not necessarily typeof raw() === type()
     * some controls might send whole arrays of data (raw) and do smart sampling such that type is only a number
     * @return {any}
     */
    get raw() {
        throw "WebGLModule.UIControls.IControl::raw must be implemented.";
    }

    /**
     * Encoded value as used in the UI, e.g. a name of particular colormap, or array of string values of breaks...
     * @return {any}
     */
    get encoded() {
        throw "WebGLModule.UIControls.IControl::encoded must be implemented.";
    }

    //////////////////////////////////////
    //////// COMMON API //////////////////
    //////////////////////////////////////

    /**
     * The control type component was registered with. Handled internally.
     * @return {*}
     */
    get uiControlType() {
        return this.constructor._uiType;
    }

    /**
     * Get current control parameters
     * the control should set the value as this._params = this.getParams(incomingParams);
     * @return {{}}
     */
    get params() {
        return this._params;
    }

    /**
     * Automatically overridden to return the name of the control it was registered with
     * @return {string}
     */
    getName() {
        return "IControl";
    }

    /**
     * Load a value from cache to support its caching - should be used on all values
     * that are available for the user to play around with and change using UI controls
     *
     * @param defaultValue value to return in case of no cached value
     * @param paramName name of the parameter, must be equal to the name from 'supports' definition
     *  - default value can be empty string
     * @return {*} cached or default value
     */
    load(defaultValue, paramName = "") {
        if (paramName === "default") {
            paramName = "";
        }
        const value = this.context.loadProperty(this.name + paramName, defaultValue);
        //check param in case of input cache collision between shader types
        return this.getSafeParam(value, defaultValue, paramName === "" ? "default" : paramName);
    }

    /**
     * Store a value from cache to support its caching - should be used on all values
     * that are available for the user to play around with and change using UI controls
     *
     * @param value to store
     * @param paramName name of the parameter, must be equal to the name from 'supports' definition
     *  - default value can be empty string
     */
    store(value, paramName = "") {
        if (paramName === "default") {
            paramName = "";
        }
        return this.context.storeProperty(this.name + paramName, value);
    }

    /**
     * On parameter change register self
     * @param {string} event which event to fire on
     *  - events are with inputs the names of supported parameters (this.supports), separated by dot if nested
     *  - most controls support "default" event - change of default value
     *  - see specific control implementation to see what events are fired (Advanced Slider fires "breaks" and "mask" for instance)
     * @param {function} clbck(rawValue, encodedValue, context) call once change occurs, context is the control instance
     */
    on(event, clbck) {
        this.__onchange[event] = clbck; //only one possible event -> rewrite?
    }

    /**
     * Clear events of the event type
     * @param {string} event type
     */
    off(event) {
        delete this.__onchange[event];
    }

    /**
     * Clear ALL events
     */
    clearEvents() {
        this.__onchange = {};
    }

    /**
     * Invoke changed value event
     *  -- should invoke every time a value changes !driven by USER!, and use unique or compatible
     *     event name (event 'value') so that shader knows what changed
     * @param event event to call
     * @param value decoded value of encodedValue
     * @param encodedValue value that was received from the UI input
     * @param context self reference to bind to the callback
     */
    changed(event, value, encodedValue, context) {
        if (typeof this.__onchange[event] === "function") {
            this.__onchange[event](value, encodedValue, context);
        }
    }


};


/**
 * Generic UI control implementations
 * used if:
 * {
 *     type: "CONTROL TYPE",
 *     ...
 * }
 *
 * The subclass constructor should get the context reference, the name
 * of the input and the parametrization.
 *
 * Further parameters passed are dependent on the control type, see
 * @ WebGLModule.UIControls
 *
 * @class WebGLModule.UIControls.SimpleUIControl
 */
$.WebGLModule.UIControls.SimpleUIControl = class extends $.WebGLModule.UIControls.IControl {

    //uses intristicComponent that holds all specifications needed to work with the component uniformly
    constructor(context, name, webGLVariableName, params, intristicComponent, uniq = "") {
        super(context, name, webGLVariableName, uniq);
        this.component = intristicComponent;
        this._params = this.getParams(params);

        this.encodedValue = this.load(this.params.default);
        //this unfortunatelly makes cache erasing and rebuilding vis impossible, the shader part has to be fully re-instantiated
        this.params.default = this.encodedValue;
    }

    init() {
        this.value = this.component.normalize(this.component.decode(this.encodedValue), this.params);

        if (this.params.interactive) {
            const _this = this;
            let node = document.getElementById(this.id);
            if (node) {
                let updater = function(e) {
                    _this.set(e.target.value);
                    _this.context.invalidate();
                };
                node.value = this.encodedValue;
                node.addEventListener('change', updater);
            }
        }
    }

    set(encodedValue) {
        this.encodedValue = encodedValue;
        this.value = this.component.normalize(this.component.decode(this.encodedValue), this.params);
        this.changed("default", this.value, this.encodedValue, this);
        this.store(this.encodedValue);
    }

    glDrawing(program, gl) {
        gl[this.component.glUniformFunName()](this.glLocation, this.value);
    }

    glLoaded(program, gl) {
        this.glLocation = gl.getUniformLocation(program, this.webGLVariableName);
    }

    toHtml(breakLine = true, controlCss = "") {
        if (!this.params.interactive) {
            return "";
        }
        const result = this.component.html(this.id, this.params, controlCss);
        return breakLine ? `<div>${result}</div>` : result;
    }

    define() {
        return `uniform ${this.component.glType} ${this.webGLVariableName};`;
    }

    sample(value = undefined, valueGlType = 'void') {
        if (!value || valueGlType !== 'float') {
            return this.webGLVariableName;
        }
        return this.component.sample(this.webGLVariableName, value);
    }

    get uiControlType() {
        return this.component["uiType"];
    }

    get supports() {
        return this.component.defaults();
    }

    get supportsAll() {
        return {};
    }

    get raw() {
        return this.value;
    }

    get encoded() {
        return this.encodedValue;
    }

    get type() {
        return this.component.glType;
    }
};
})(OpenSeadragon);
