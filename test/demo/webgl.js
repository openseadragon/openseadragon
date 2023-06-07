//imports
import { ThreeJSDrawer } from './threejsdrawer.js';
// import { default as Stats } from "https://cdnjs.cloudflare.com/ajax/libs/stats.js/17/Stats.js";
//globals
// const canvas = document.querySelector('#three-canvas');
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

var stats = null;
// var stats = new Stats();
// stats.showPanel( 1 ); // 0: fps, 1: ms, 2: mb, 3+: custom
// document.body.appendChild( stats.dom );


//Double viewer setup for comparison - CanvasDrawer and ThreeJSDrawer

var viewer = window.viewer = OpenSeadragon({
    id: "contentDiv",
    prefixUrl: "../../build/openseadragon/images/",
    // minZoomImageRatio:0.8,
    // maxZoomPixelRatio:0.5,
    minZoomImageRatio:0.01,
    maxZoomPixelRatio:100,
    smoothTileEdgesMinZoom:1.1,
    crossOriginPolicy: 'Anonymous',
    ajaxWithCredentials: false,
    useCanvas:true,
});


// Mirror the interactive viewer with CanvasDrawer onto a separate canvas using ThreeJSDrawer
let threeRenderer = window.threeRenderer = new ThreeJSDrawer({viewer, viewport: viewer.viewport, element:viewer.element, stats: stats});
//make the test canvas mirror all changes to the viewer canvas
let viewerCanvas = viewer.drawer.canvas;
let canvas = threeRenderer.canvas;
let canvasContainer = $('#three-canvas-container').append(canvas);
viewer.addHandler("resize", function(){
    canvasContainer[0].style.width = viewerCanvas.clientWidth+'px';
    canvasContainer[0].style.height = viewerCanvas.clientHeight+'px';
    // canvas.width = viewerCanvas.width;
    // canvas.height = viewerCanvas.height;
});


// Single viewer showing how to use plugin Drawer via configuration
// Also shows sequence mode
var viewer2 = window.viewer2 = OpenSeadragon({
    id: "three-viewer",
    prefixUrl: "../../build/openseadragon/images/",
    minZoomImageRatio:0.01,
    customDrawer: ThreeJSDrawer,
    tileSources: [sources['leaves'], sources['rainbow'], sources['duomo']],
    sequenceMode: true,
    imageSmoothingEnabled: false,
    crossOriginPolicy: 'Anonymous',
    ajaxWithCredentials: false
});




$('#three-viewer').resizable(true);
$('#contentDiv').resizable(true);
$('#image-picker').sortable({
    update: function(event, ui){
        let thisItem = ui.item.find('.toggle').data('item');
        let items = $('#image-picker input.toggle:checked').toArray().map(item=>$(item).data('item'));
        let newIndex = items.indexOf(thisItem);
        if(thisItem){
            viewer.world.setItemIndex(thisItem, newIndex);
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
        addTileSource(data.image, this);

    } else {
        if(data.item){
            viewer.world.removeItem(data.item);
            $(this).data('item',null);
        }
    }
}).trigger('change');

$('#image-picker input:not(.toggle)').on('change',function(){
    let data = $(this).data();
    let value = $(this).val();
    let tiledImage = $(`#image-picker input.toggle[data-image=${data.image}]`).data('item');
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
            tiledImage.setFlip($(this).prop('checked'));
        } else if (field == 'cropped'){
            if( $(this).prop('checked') ){
                let croppingPolygons = [ [{x:200, y:200}, {x:800, y:200}, {x:500, y:800}] ];
                tiledImage.setCroppingPolygons(croppingPolygons);
            } else {
                tiledImage.resetCroppingPolygons();
            }
        } else if (field == 'clipped'){
            if( $(this).prop('checked') ){
                let clipRect = new OpenSeadragon.Rect(2000, 0, 3000, 4000);
                tiledImage.setClip(clipRect);
            } else {
                tiledImage.setClip(null);
            }
        }
        else if (field == 'debug'){
            if( $(this).prop('checked') ){
                tiledImage.debugMode = true;
            } else {
                tiledImage.debugMode = false;
            }
        }
    }
});

$('.image-options select[data-field=composite]').append(getCompositeOperationOptions()).on('change',function(){
    let data = $(this).data();
    let tiledImage = $(`#image-picker input.toggle[data-image=${data.image}]`).data('item');
    if(tiledImage){
        tiledImage.setCompositeOperation(this.value == 'null' ? null : this.value);
    }
}).trigger('change');

$('.image-options select[data-field=wrapping]').append(getWrappingOptions()).on('change',function(){
    let data = $(this).data();
    let tiledImage = $(`#image-picker input.toggle[data-image=${data.image}]`).data('item');
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

function addTileSource(image, checkbox){
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
        viewer.addTiledImage({tileSource: tileSource, ...options, index: insertionIndex});
        viewer.world.addOnceHandler('add-item',function(ev){
            let item = ev.item;
            $(checkbox).data('item',item);
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




