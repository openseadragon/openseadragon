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
let viewer;

(function(){
    var script=document.createElement('script');
    script.onload=function(){
        var stats=new Stats();
        document.body.appendChild(stats.dom);
        requestAnimationFrame(function loop(){stats.update();requestAnimationFrame(loop)});
    };
    script.src='https://mrdoob.github.io/stats.js/build/stats.min.js';
    document.head.appendChild(script);
})();


$('#create-drawer').on('click',function(){
    let drawerType = $('#select-drawer').val();
    let num = Math.floor($('#input-number').val());
    run(drawerType, num);
});

function run(drawerType, num) {
    if(viewer){
        viewer.destroy();
    }
    viewer = window.viewer = makeViewer(drawerType);
    let tileSources = makeTileSources(num);



    tileSources.forEach((ts, i) => {
        viewer.addTiledImage({
            tileSource: ts,
            x: (i % 10) / 20,
            y: Math.floor(i / 10) / 20,
            width: 1,
            opacity: (i % 3) === 0 ? 0.4 : 1
        });
    });

    let movingLeft = false;
    window.setInterval(()=>{
        let m = movingLeft ? 1 : -1;
        movingLeft = m === -1;
        let dist = viewer.viewport.getBounds().width;
        viewer.viewport.panBy(new OpenSeadragon.Point( dist * m/2, 0));

    }, 1000);
}

function makeViewer(drawerType){
    let viewer = OpenSeadragon({
        id: "drawer",
        prefixUrl: "../../build/openseadragon/images/",
        minZoomImageRatio:0.01,
        maxZoomPixelRatio:100,
        smoothTileEdgesMinZoom:1.1,
        crossOriginPolicy: 'Anonymous',
        ajaxWithCredentials: false,
        drawer:drawerType,
        blendTime:0
    });

    return viewer;
}

function makeTileSources(num){

    let keys = Object.keys(sources);

    let indices = Array.from(Array(num).keys());

    return indices.map(index => {
        let ts = sources[keys[index % keys.length]];
        return ts;
    })

}
