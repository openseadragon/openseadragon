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

/**
 * based on https://github.com/mrdoob/stats.js/ by @author mrdoob / http://mrdoob.com/
 */

class Stats{
    constructor(){
        this.mode = 0;

        var container = this.container = document.createElement( 'div' );
        container.style.cssText = 'position:fixed;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000';
        container.addEventListener( 'click', function ( event ) {

            event.preventDefault();
            showPanel( ++ mode % container.children.length );

        }, false );


		this.dom = container;

        this.started = false;

        this.fpsPanel = this.addPanel( new Stats.Panel( 'FPS', '#0ff', '#002' ) );
        this.msPanel = this.addPanel( new Stats.Panel( 'MS', '#0f0', '#020' ) );
        this.mspsPanel = this.addPanel( new Stats.Panel( 'MSPS', '#0f0', '#020' ) );

        if ( window.performance && window.performance.memory ) {

            this.memPanel = this.addPanel( new Stats.Panel( 'MB', '#f08', '#201' ) );

        }

        this.showPanel( 0 );
    }


	//

	addPanel( panel ) {

		this.container.appendChild( panel.dom );
		return panel;

	}

	showPanel( id ) {

		for ( var i = 0; i < this.container.children.length; i ++ ) {

			this.container.children[ i ].style.display = i === id ? 'block' : 'none';

		}

		this.mode = id;

	}

	//


    begin() {

        this.beginTime = ( performance || Date ).now();

        if(!this.started){
            this.started = true;
            this.prevTime = this.beginTime;
            this.frames = 0;
            this.cumulativeMS = 0;
        }
    }

    end() {

        this.frames ++;

        var time = ( performance || Date ).now();

        var interval = time - this.beginTime;

        this.cumulativeMS += interval;

        this.msPanel.update( interval, 200 );

        if ( time >= this.prevTime + 1000 ) {

            this.fpsPanel.update( ( this.frames * 1000 ) / ( time - this.prevTime ), 130 );

            this.mspsPanel.update( ( this.cumulativeMS * 1000 ) / ( time - this.prevTime ), 1100 );

            this.prevTime = time;
            this.frames = 0;
            this.cumulativeMS = 0;

            if ( this.memPanel ) {

                var memory = performance.memory;
                this.memPanel.update( memory.usedJSHeapSize / 1048576, memory.jsHeapSizeLimit / 1048576 );

            }

        }

        return time;

    }

    update() {

        this.beginTime = this.end();

    }


};

Stats.Panel = function ( name, fg, bg ) {

	var min = Infinity, max = 0, round = Math.round;
	var PR = round( window.devicePixelRatio || 1 );

	var WIDTH = 80 * PR, HEIGHT = 48 * PR,
			TEXT_X = 3 * PR, TEXT_Y = 2 * PR,
			GRAPH_X = 3 * PR, GRAPH_Y = 15 * PR,
			GRAPH_WIDTH = 74 * PR, GRAPH_HEIGHT = 30 * PR;

	var canvas = document.createElement( 'canvas' );
	canvas.width = WIDTH;
	canvas.height = HEIGHT;
	canvas.style.cssText = 'width:80px;height:48px';

	var context = canvas.getContext( '2d' );
	context.font = 'bold ' + ( 9 * PR ) + 'px Helvetica,Arial,sans-serif';
	context.textBaseline = 'top';

	context.fillStyle = bg;
	context.fillRect( 0, 0, WIDTH, HEIGHT );

	context.fillStyle = fg;
	context.fillText( name, TEXT_X, TEXT_Y );
	context.fillRect( GRAPH_X, GRAPH_Y, GRAPH_WIDTH, GRAPH_HEIGHT );

	context.fillStyle = bg;
	context.globalAlpha = 0.9;
	context.fillRect( GRAPH_X, GRAPH_Y, GRAPH_WIDTH, GRAPH_HEIGHT );

	return {

		dom: canvas,

		update: function ( value, maxValue ) {

			min = Math.min( min, value );
			max = Math.max( max, value );

			context.fillStyle = bg;
			context.globalAlpha = 1;
			context.fillRect( 0, 0, WIDTH, GRAPH_Y );
			context.fillStyle = fg;
			context.fillText( round( value ) + ' ' + name + ' (' + round( min ) + '-' + round( max ) + ')', TEXT_X, TEXT_Y );

			context.drawImage( canvas, GRAPH_X + PR, GRAPH_Y, GRAPH_WIDTH - PR, GRAPH_HEIGHT, GRAPH_X, GRAPH_Y, GRAPH_WIDTH - PR, GRAPH_HEIGHT );

			context.fillRect( GRAPH_X + GRAPH_WIDTH - PR, GRAPH_Y, PR, GRAPH_HEIGHT );

			context.fillStyle = bg;
			context.globalAlpha = 0.9;
			context.fillRect( GRAPH_X + GRAPH_WIDTH - PR, GRAPH_Y, PR, round( ( 1 - ( value / maxValue ) ) * GRAPH_HEIGHT ) );

		}

	};

};


(function(){


    let fpscontainer = $('<div>',{style:'position:fixed;top:0;left:0;'}).appendTo('body');
    let labels=$('<div>',{style:'display:grid;grid-template-columns:1fr 1fr 1fr;justify-items:center;'}).appendTo(fpscontainer);
    $('<label>').text('FPS').appendTo(labels);
    $('<label>').text('Update (ms)').appendTo(labels);
    $('<label>').text('Draw (ms)').appendTo(labels);
    var statsFPS=new Stats();
    statsFPS.begin();
    $(statsFPS.dom).css({position:'relative', display:'inline-block'}).appendTo(fpscontainer);
    requestAnimationFrame(function loop(){statsFPS.update();requestAnimationFrame(loop)});

    var statsUpdate=new Stats();
    $(statsUpdate.dom).css({position:'relative', display:'inline-block'}).appendTo(fpscontainer);
    statsUpdate.showPanel(2);

    var statsDraw=new Stats();
    $(statsDraw.dom).css({position:'relative', display:'inline-block'}).appendTo(fpscontainer);
    statsDraw.showPanel(2);

    let origUpdate = OpenSeadragon.World.prototype.update;
    let origDraw = OpenSeadragon.World.prototype.draw;

    OpenSeadragon.World.prototype.update = function(){
        statsUpdate.begin();
        origUpdate.call(this, ...arguments);
        statsUpdate.end();
    };

    OpenSeadragon.World.prototype.draw = function(){
        statsDraw.begin();
        origDraw.call(this, ...arguments);
        statsDraw.end();
    }

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
        viewer.viewport.panBy(new OpenSeadragon.Point( dist * m/4, 0));

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

