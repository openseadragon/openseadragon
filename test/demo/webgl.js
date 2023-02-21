//imports
import { ThreeJSRenderer } from './webgl-renderer.js';

//globals
const canvas = document.querySelector('#three-canvas');
const sources = {
    "rainbow":"../data/testpattern.dzi",
    "leaves":"../data/iiif_2_0_sizes/info.json",
    "bblue":{
        type:'image',
        url: "../data/BBlue.png",
    },
    // "duomo":"https://openseadragon.github.io/example-images/highsmith/highsmith.dzi"
}
var viewer = window.viewer = OpenSeadragon({
    // debugMode: true,
    id: "contentDiv",
    prefixUrl: "../../build/openseadragon/images/",
    showNavigator:true,
    minZoomImageRatio:0.001,
    customRenderer: true, // set this to true to use a renderer plugin instead of the built-in drawer
    useCanvas: {contextType: 'webgl2'} //set this to match the context type used by the plugin renderer
});

//sync size

// let viewerCanvas = viewer.drawer.canvas;
// canvas.style.width = viewerCanvas.clientWidth+'px';
// canvas.style.height = viewerCanvas.clientHeight+'px';
// canvas.width = viewerCanvas.width;
// canvas.height = viewerCanvas.height;

// //make the test canvas mirror all changes to the viewer canvas
// viewer.addHandler("resize", function(){
//     canvas.style.width = viewerCanvas.clientWidth+'px';
//     canvas.style.height = viewerCanvas.clientHeight+'px';
// })
let noCanvas;

let threeRenderer = window.threeRenderer = new ThreeJSRenderer(viewer, noCanvas);

// viewer.addHandler("open", () => viewer.world.getItemAt(0).source.hasTransparency = function(){ return true; });

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
        }
    }
})

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






