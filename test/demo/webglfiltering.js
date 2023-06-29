const sources = {
    "rainbow":"../data/testpattern.dzi",
    "leaves":"../data/iiif_2_0_sizes/info.json",
    "bblue":{
        type:'image',
        url: "../data/BBlue.png",
    },
    "duomo":"https://openseadragon.github.io/example-images/duomo/duomo.dzi",
}
const labels = {
    rainbow: 'Rainbow Grid',
    leaves: 'Leaves',
    bblue: 'Blue B',
    duomo: 'Duomo',
}

// viewer1: context2d drawer
let viewer1 = window.viewer1 = OpenSeadragon({
    id: "webgl",
    prefixUrl: "../../build/openseadragon/images/",
    minZoomImageRatio:0.01,
    maxZoomPixelRatio:100,
    smoothTileEdgesMinZoom:1.1,
    crossOriginPolicy: 'Anonymous',
    ajaxWithCredentials: false,
    // maxImageCacheCount: 30,
    drawer:OpenSeadragon.WebGL2Drawer,
    blendTime:0,
    drawerOptions:{
        webgl:{
            programs:[makeRedFilter()],
        }
    }
});

setupImageControls();



class ColorChanelFilter {
    constructor() {
        this.red = 1;
        this.blue = 1;
        this.green = 1;

        this.program = null;
    }
    createProgram(gl){
        this.program = OpenSeadragon.WebGLDrawer.initShaderProgram(gl, this.getVertexShaderCode(), this.getFragmentShaderCode());
    }
    apply(gl, tiledImageTexture, tiledImage){

    }
    getVertexShaderCode(){
        return `
            attribute vec2 a_output_position;
            attribute vec2 a_texture_position;

            uniform mat3 u_matrix;

            varying vec2 v_texCoord;

            void main() {
                gl_Position = vec4(u_matrix * vec3(a_output_position, 1), 1);

                v_texCoord = a_texture_position;
            }
        `;
    }
    getFragmentShaderCode(){
        return `
            precision mediump float;

            // our texture
            uniform sampler2D u_image;

            // the texCoords passed in from the vertex shader.
            varying vec2 v_texCoord;

            // the opacity multiplier for the image
            uniform vec3 color_multiplier;

            void main() {
                gl_FragColor = texture2D(u_image, v_texCoord);
                gl_FragColor *= vec4(color_multiplier, 1);
             }
        `;
    }

}





function setupImageControls(){

$('#image-picker').sortable({
    update: function(event, ui){
        let thisItem = ui.item.find('.toggle').data('item1');
        let items = $('#image-picker input.toggle:checked').toArray().map(item=>$(item).data('item1'));
        let newIndex = items.indexOf(thisItem);
        if(thisItem){
            viewer1.world.setItemIndex(thisItem, newIndex);
        }
    }
});

Object.keys(sources).forEach((key, index)=>{
    let element = makeImagePickerElement(key, labels[key])
    $('#image-picker').append(element);
    if(index === 0){
        element.find('.toggle').prop('checked',true);
    }
})

$('#image-picker input.toggle').on('change',function(){
    let data = $(this).data();
    if(this.checked){
        addTileSource(viewer1, data.image, this);
    } else {
        if(data.item1){
            viewer1.world.removeItem(data.item1);
            $(this).data({item1: null});
        }
    }
}).trigger('change');

$('#image-picker input:not(.toggle)').on('change',function(){
    let data = $(this).data();
    let value = $(this).val();
    let tiledImage1 = $(`#image-picker input.toggle[data-image=${data.image}]`).data('item1');
    updateTiledImage(tiledImage1, data, value, this);
});

function updateTiledImage(tiledImage, data, value, item){
    if(tiledImage){
        //item = tiledImage
        let field = data.field;
        if(field == 'x'){
            let bounds = tiledImage.getBoundsNoRotate();
            let position = new OpenSeadragon.Point(Number(value), bounds.y);
            tiledImage.setPosition(position);
        } else if ( field == 'y'){
            let bounds = tiledImage.getBoundsNoRotate();
            let position = new OpenSeadragon.Point(bounds.x, Number(value));
            tiledImage.setPosition(position);
        } else if (field == 'width'){
            tiledImage.setWidth(Number(value));
        } else if (field == 'degrees'){
            tiledImage.setRotation(Number(value));
        } else if (field == 'opacity'){
            tiledImage.setOpacity(Number(value));
        } else if (field == 'flipped'){
            tiledImage.setFlip($(item).prop('checked'));
        } else if (field == 'cropped'){
            if( $(item).prop('checked') ){
                let croppingPolygons = [ [{x:200, y:200}, {x:800, y:200}, {x:500, y:800}] ];
                tiledImage.setCroppingPolygons(croppingPolygons);
            } else {
                tiledImage.resetCroppingPolygons();
            }
        } else if (field == 'clipped'){
            if( $(item).prop('checked') ){
                let clipRect = new OpenSeadragon.Rect(2000, 0, 3000, 4000);
                tiledImage.setClip(clipRect);
            } else {
                tiledImage.setClip(null);
            }
        }
        else if (field == 'debug'){
            if( $(item).prop('checked') ){
                tiledImage.debugMode = true;
            } else {
                tiledImage.debugMode = false;
            }
        }
    }
}

$('.image-options select[data-field=composite]').append(getCompositeOperationOptions()).on('change',function(){
    let data = $(this).data();
    let tiledImage1 = $(`#image-picker input.toggle[data-image=${data.image}]`).data('item1');
    if(tiledImage1){
        tiledImage1.setCompositeOperation(this.value == 'null' ? null : this.value);
    }
    let tiledImage2 = $(`#image-picker input.toggle[data-image=${data.image}]`).data('item2');
    if(tiledImage2){
        tiledImage2.setCompositeOperation(this.value == 'null' ? null : this.value);
    }
}).trigger('change');

$('.image-options select[data-field=wrapping]').append(getWrappingOptions()).on('change',function(){
    let data = $(this).data();
    let tiledImage = $(`#image-picker input.toggle[data-image=${data.image}]`).data('item1');
    if(tiledImage){
        switch(this.value){
            case "None": tiledImage.wrapHorizontal = tiledImage.wrapVertical = false; break;
            case "Horizontal": tiledImage.wrapHorizontal = true; tiledImage.wrapVertical = false; break;
            case "Vertical": tiledImage.wrapHorizontal = false; tiledImage.wrapVertical = true; break;
            case "Both": tiledImage.wrapHorizontal = tiledImage.wrapVertical = true; break;
        }
        tiledImage.viewer.raiseEvent('opacity-change');//trigger a redraw for the webgl renderer. TODO: fix this hack.
    }
    tiledImage = $(`#image-picker input.toggle[data-image=${data.image}]`).data('item2');
    if(tiledImage){
        switch(this.value){
            case "None": tiledImage.wrapHorizontal = tiledImage.wrapVertical = false; break;
            case "Horizontal": tiledImage.wrapHorizontal = true; tiledImage.wrapVertical = false; break;
            case "Vertical": tiledImage.wrapHorizontal = false; tiledImage.wrapVertical = true; break;
            case "Both": tiledImage.wrapHorizontal = tiledImage.wrapVertical = true; break;
        }
        tiledImage.viewer.raiseEvent('opacity-change');//trigger a redraw for the webgl renderer. TODO: fix this hack.
    }
}).trigger('change');

function getWrappingOptions(){
    let opts = ['None', 'Horizontal', 'Vertical', 'Both'];
    let elements = opts.map((opt, i)=>{
        let el = $('<option>',{value:opt}).text(opt);
        if(i===0){
            el.attr('selected',true);
        }
        return el[0];
        // $('.image-options select').append(el);
    });
    return $(elements);
}
function getCompositeOperationOptions(){
    let opts = [null,'source-over','source-in','source-out','source-atop',
                'destination-over','destination-in','destination-out','destination-atop',
                'lighten','darken','copy','xor','multiply','screen','overlay','color-dodge',
                'color-burn','hard-light','soft-light','difference','exclusion',
                'hue','saturation','color','luminosity'];
    let elements = opts.map((opt, i)=>{
        let el = $('<option>',{value:opt}).text(opt);
        if(i===0){
            el.attr('selected',true);
        }
        return el[0];
        // $('.image-options select').append(el);
    });
    return $(elements);

}

function addTileSource(viewer, image, checkbox){
    let options = $(`#image-picker input[data-image=${image}][type=number]`).toArray().reduce((acc, input)=>{
        let field = $(input).data('field');
        if(field){
            acc[field] = Number(input.value);
        }
        return acc;
    }, {});

    options.flipped = $(`#image-picker input[data-image=${image}][data-type=flipped]`).prop('checked');

    let items = $('#image-picker input.toggle:checked').toArray();
    let insertionIndex = items.indexOf(checkbox);

    let tileSource = sources[image];
    if(tileSource){
        viewer&&viewer.addTiledImage({tileSource: tileSource, ...options, index: insertionIndex});
        viewer&&viewer.world.addOnceHandler('add-item',function(ev){
            let item = ev.item;
            let field = viewer === viewer1 ? 'item1' : 'item2';
            $(checkbox).data(field,item);
            item.source.hasTransparency = ()=>true; //simulate image with transparency, to show seams in default renderer
        });
    }
}

function makeImagePickerElement(key, label){
    return $(`<div class="image-options">
        <span class="ui-icon ui-icon-arrowthick-2-n-s"></span>
        <label><input type="checkbox" data-image="" class="toggle"> __title__</label>
        <div class="option-grid">
            <label>X: <input type="number" value="0" data-image="" data-field="x"> </label>
            <label>Y: <input type="number" value="0" data-image="" data-field="y"> </label>
            <label>Width: <input type="number" value="1" data-image="" data-field="width" min="0"> </label>
            <label>Degrees: <input type="number" value="0" data-image="" data-field="degrees"> </label>
            <label>Opacity: <input type="number" value="1" data-image="" data-field="opacity" min="0" max="1" step="0.2"> </label>
            <label>Flipped: <input type="checkbox" data-image="" data-field="flipped"></label>
            <label>Cropped: <input type="checkbox" data-image="" data-field="cropped"></label>
            <label>Debug: <input type="checkbox" data-image="" data-field="debug"></label>
            <label>Composite: <select data-image="" data-field="composite"></select></label>
            <label>Wrapping: <select data-image="" data-field="wrapping"></select></label>
        </div>

    </div>`.replaceAll('data-image=""', `data-image="${key}"`).replace('__title__', label));

}
}





