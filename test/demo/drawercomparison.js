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
const drawers = {
    canvas: "Context2d drawer (default in OSD &lt;= 4.1.0)",
    webgl: "New WebGL drawer"
}

const viewportMargins = {
    left: 100,
    top: 0,
    right: 0,
    bottom: 50,
};

//Support drawer type from the url
const url = new URL(window.location.href);
const drawer1 = url.searchParams.get("left") || 'canvas';
const drawer2 = url.searchParams.get("right") || 'webgl';

$("#title-w1").html(drawers[drawer1]);
$("#title-w2").html(drawers[drawer2]);

//Double viewer setup for comparison - CanvasDrawer and WebGLDrawer
// viewer1: canvas drawer
let viewer1 = window.viewer1 = OpenSeadragon({
    id: "canvasdrawer",
    prefixUrl: "../../build/openseadragon/images/",
    minZoomImageRatio:0.01,
    maxZoomPixelRatio:100,
    smoothTileEdgesMinZoom:1.1,
    crossOriginPolicy: 'Anonymous',
    ajaxWithCredentials: false,
    // maxImageCacheCount: 30,
    drawer:drawer1,
    blendTime:0,
    showNavigator:true,
    viewportMargins,
});

// viewer2: webgl drawer
let viewer2 = window.viewer2 = OpenSeadragon({
    id: "webgl",
    prefixUrl: "../../build/openseadragon/images/",
    minZoomImageRatio:0.01,
    maxZoomPixelRatio:100,
    smoothTileEdgesMinZoom:1.1,
    crossOriginPolicy: 'Anonymous',
    ajaxWithCredentials: false,
    // maxImageCacheCount: 30,
    drawer:drawer2,
    blendTime:0,
    showNavigator:true,
    viewportMargins,
});

// // viewer3: html drawer, unused
var viewer3 = window.viewer3 = OpenSeadragon({
    id: "htmldrawer",
    drawer:'html',
    blendTime:2,
    prefixUrl: "../../build/openseadragon/images/",
    minZoomImageRatio:0.01,
    customDrawer: OpenSeadragon.HTMLDrawer,
    tileSources: [sources['leaves'], sources['rainbow'], sources['duomo']],
    sequenceMode: true,
    crossOriginPolicy: 'Anonymous',
    ajaxWithCredentials: false
});


// Sync navigation of viewer1 and viewer 2
var viewer1Leading = false;
var viewer2Leading = false;

var viewer1Handler = function() {
    if (viewer2Leading) {
        return;
    }

    viewer1Leading = true;
    viewer2.viewport.zoomTo(viewer1.viewport.getZoom());
    viewer2.viewport.panTo(viewer1.viewport.getCenter());
    viewer2.viewport.rotateTo(viewer1.viewport.getRotation());
    viewer2.viewport.setFlip(viewer1.viewport.flipped);
    viewer1Leading = false;
};

var viewer2Handler = function() {
    if (viewer1Leading) {
        return;
    }

    viewer2Leading = true;
    viewer1.viewport.zoomTo(viewer2.viewport.getZoom());
    viewer1.viewport.panTo(viewer2.viewport.getCenter());
    viewer1.viewport.rotateTo(viewer2.viewport.getRotation());
    viewer1.viewport.setFlip(viewer1.viewport.flipped);
    viewer2Leading = false;
};

viewer1.addHandler('zoom', viewer1Handler);
viewer2.addHandler('zoom', viewer2Handler);
viewer1.addHandler('pan', viewer1Handler);
viewer2.addHandler('pan', viewer2Handler);
viewer1.addHandler('rotate', viewer1Handler);
viewer2.addHandler('rotate', viewer2Handler);
viewer1.addHandler('flip', viewer1Handler);
viewer2.addHandler('flip', viewer2Handler);


$('#image-picker').sortable({
    update: function(event, ui){
        let thisItem = ui.item.find('.toggle').data('item1');
        let items = $('#image-picker input.toggle:checked').toArray().map(item=>$(item).data('item1'));
        let newIndex = items.indexOf(thisItem);
        if(thisItem){
            viewer1.world.setItemIndex(thisItem, newIndex);
        }

        thisItem = ui.item.find('.toggle').data('item2');
        items = $('#image-picker input.toggle:checked').toArray().map(item=>$(item).data('item2'));
        newIndex = items.indexOf(thisItem);
        if(thisItem){
            viewer2.world.setItemIndex(thisItem, newIndex);
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

$('#image-picker').append(makeComparisonSwitcher());

$('#image-picker input.toggle').on('change',function(){
    let data = $(this).data();
    if(this.checked){
        addTileSource(viewer1, data.image, this);
        addTileSource(viewer2, data.image, this);
    } else {
        if(data.item1){
            viewer1.world.removeItem(data.item1);
            viewer2.world.removeItem(data.item2);
            $(this).data({item1: null, item2: null});
        }
    }
}).trigger('change');

$('#image-picker input:not(.toggle)').on('change',function(){
    let data = $(this).data();
    let value = $(this).val();
    let tiledImage1 = $(`#image-picker input.toggle[data-image=${data.image}]`).data('item1');
    let tiledImage2 = $(`#image-picker input.toggle[data-image=${data.image}]`).data('item2');
    updateTiledImage(tiledImage1, data, value, this);
    updateTiledImage(tiledImage2, data, value, this);
});

function updateTiledImage(tiledImage, data, value, item){
    let field = data.field;

    if(tiledImage){
        //item = tiledImage
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
        } else if (field == 'smoothing'){
            const checked = $(item).prop('checked');
            viewer1.drawer.setImageSmoothingEnabled(checked);
            viewer2.drawer.setImageSmoothingEnabled(checked);
            $('[data-field=smoothing]').prop('checked', checked);
        } else if (field == 'cropped'){
            if( $(item).prop('checked') ){
                let scale = tiledImage.source.width;
                let croppingPolygons = [ [{x:0.2*scale, y:0.2*scale}, {x:0.8*scale, y:0.2*scale}, {x:0.5*scale, y:0.8*scale}] ];
                tiledImage.setCroppingPolygons(croppingPolygons);
            } else {
                tiledImage.resetCroppingPolygons();
            }
        } else if (field == 'clipped'){
            if( $(item).prop('checked') ){
                let scale = tiledImage.source.width;
                let clipRect = new OpenSeadragon.Rect(0.1*scale, 0.2*scale, 0.6*scale, 0.4*scale);
                tiledImage.setClip(clipRect);
            } else {
                tiledImage.setClip(null);
            }
        } else if (field == 'debug'){
            if( $(item).prop('checked') ){
                tiledImage.debugMode = true;
            } else {
                tiledImage.debugMode = false;
            }
        }
    } else {
        //viewer-level option
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
        tiledImage.redraw();//trigger a redraw for the webgl renderer.
    }
    tiledImage = $(`#image-picker input.toggle[data-image=${data.image}]`).data('item2');
    if(tiledImage){
        switch(this.value){
            case "None": tiledImage.wrapHorizontal = tiledImage.wrapVertical = false; break;
            case "Horizontal": tiledImage.wrapHorizontal = true; tiledImage.wrapVertical = false; break;
            case "Vertical": tiledImage.wrapHorizontal = false; tiledImage.wrapVertical = true; break;
            case "Both": tiledImage.wrapHorizontal = tiledImage.wrapVertical = true; break;
        }
        tiledImage.redraw();//trigger a redraw for the webgl renderer.
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
            // item.source.hasTransparency = ()=>true; //simulate image with transparency, to show seams in default renderer
        });
    }
}

function getAvailableDrawerSelect(name, selectedDrawer) {
    return `
<select name="${name}">
  ${Object.entries(drawers).map(([k, v]) => {
      const selected = selectedDrawer === k ? "selected" : "";
      return `<option value="${k}" ${selected}>${v}</option>`;
    }).join("\n")}
</select>`;
}

function makeComparisonSwitcher() {
    const left = getAvailableDrawerSelect("left", drawer1),
        right = getAvailableDrawerSelect("right", drawer2);
    return `
<div>
  Note: you can run the comparison with desired drawers like this: drawercomparison.html?left=[type]&right=[type]
  <form method="get">
     ${left}
     ${right}
     <button>Submit</button>
  </form>
</div>`;
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
            <span></span>
            <label>Flipped: <input type="checkbox" data-image="" data-field="flipped"></label>
            <label>Cropped: <input type="checkbox" data-image="" data-field="cropped"></label>
            <label>Clipped: <input type="checkbox" data-image="" data-field="clipped"></label>
            <label>Chess Tile Opacity: <input type="checkbox" data-image="" data-field="tile-level-opecity"></label>
            <label>Debug: <input type="checkbox" data-image="" data-field="debug"></label>
            <label>Composite: <select data-image="" data-field="composite"></select></label>
            <label>Wrap: <select data-image="" data-field="wrapping"></select></label>
            <label>Smoothing: <input type="checkbox" data-image="" data-field="smoothing" checked></label>
        </div>
    </div>`.replaceAll('data-image=""', `data-image="${key}"`).replace('__title__', label));

}




