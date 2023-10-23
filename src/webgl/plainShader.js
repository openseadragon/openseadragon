(function($) {
/**
 * Identity shader
 *
 * data reference must contain one index to the data to render using identity
 */
$.WebGLModule.IdentityLayer = class extends $.WebGLModule.ShaderLayer {

    static type() {
        return "identity";
    }

    static name() {
        return "Identity";
    }

    static description() {
        return "shows the data AS-IS";
    }

    static sources() {
        return [{
            acceptsChannelCount: (x) => x === 4,
            description: "4d texture to render AS-IS"
        }];
    }

    getFragmentShaderExecution() {
        return `return ${this.sampleChannel("osd_texture_coords")};`;
        //return `return vec4(osd_texture_coords, .0, 1.0);`;

    }
};

//todo why cannot be inside object :/
$.WebGLModule.IdentityLayer.defaultControls["use_channel0"] = {
    required: "rgba"
};

$.WebGLModule.ShaderMediator.registerLayer($.WebGLModule.IdentityLayer);

})(OpenSeadragon);
