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
    webgl: "New WebGL drawer",
    html: ""
}


let viewer;

( function () {

    // prepare base perf object
    if ( typeof window.performance === 'undefined' ) {
        window.performance = {};
    }

    if ( !window.performance.now ) {

        var nowOffset = Date.now();

        if ( performance.timing && performance.timing.navigationStart ) {
            nowOffset = performance.timing.navigationStart;
        }

        window.performance.now = function now () {
            return Date.now() - nowOffset;
        };

    }

    if( !window.performance.mark ) {
        window.performance.mark = function(){}
    }

    if( !window.performance.measure ) {
        window.performance.measure = function(){}
    }

} )();

// rStats courtesy of https://github.com/spite/rstats
// The MIT License (MIT)

// Copyright (c) 2014 Jaume Sanchez Elias

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
/**
 * @class rStats
 * @param {rStats~Settings} [settings] Settings for the rStats instance.
 */

/**
 * @typedef {Object} rStats~Settings
 * @property {Array.<String>} [colours] An array of CSS colour values.
 * @property {String} [CSSPath=''] Base URL where rStats.css is located.
 * @property {Array.<String>} [css] URLs of CSS or font files to import.
 * @property {Object.<String, rStats~CounterProperties>} [values] Properties to use for each counter.
 * @property {Array.<Object>} [groups] Define groups of counters.
 * @property {Array.<Object>} [fractions] Define stacked counters.
 * @property {Array.<Object>} [plugins] Additional plugins.
 */

/**
 * @typedef {Object} rStats~CounterProperties
 * @property {String} [caption] Caption for this counter.
 * @property {Boolean} [average=false] Whether the values should be averaged.
 * @property {Number} [avgMs=1000] Duration for which the values should be averaged.
 * @property {Number} [below] Value below which the graph should be highlighted.
 * @property {Number} [over] Value over which the graph should be highlighted.
 * @property {Boolean} [interpolate=true] Whether framerate should be interpolated.
 */

function rStats ( settings ) {

    function iterateKeys ( array, callback ) {
        var keys = Object.keys( array );
        for ( var j = 0, l = keys.length; j < l; j++ ) {
            callback( keys[ j ] );
        }
    }

    function importCSS ( url ) {

        var element = document.createElement( 'link' );
        element.href = url;
        element.rel = 'stylesheet';
        element.type = 'text/css';
        document.getElementsByTagName( 'head' )[ 0 ].appendChild( element );

    }

    var _settings = settings || {};
    var _colours = _settings.colours || [ '#850700', '#c74900', '#fcb300', '#284280', '#4c7c0c' ];

    var _cssFont = 'https://fonts.googleapis.com/css?family=Roboto+Condensed:400,700,300';
    var _cssRStats = ( _settings.CSSPath ? _settings.CSSPath : '' ) + 'rStats.css';

    var _css = _settings.css || [ _cssFont, _cssRStats ];
    _css.forEach(function (uri) {
        importCSS( uri );
    });

    if ( !_settings.values ) _settings.values = {};

    var _base, _div, _elHeight = 10, _elWidth = 200;
    var _perfCounters = {};


    function Graph ( _dom, _id, _defArg ) {

        var _def = _defArg || {};
        var _canvas = document.createElement( 'canvas' ),
            _ctx = _canvas.getContext( '2d' ),
            _max = 0,
            _current = 0;

        var c = _def.color ? _def.color : '#666666';

        var _dotCanvas = document.createElement( 'canvas' ),
            _dotCtx = _dotCanvas.getContext( '2d' );
        _dotCanvas.width = 1;
        _dotCanvas.height = 2 * _elHeight;
        _dotCtx.fillStyle = '#444444';
        _dotCtx.fillRect( 0, 0, 1, 2 * _elHeight );
        _dotCtx.fillStyle = c;
        _dotCtx.fillRect( 0, _elHeight, 1, _elHeight );
        _dotCtx.fillStyle = '#ffffff';
        _dotCtx.globalAlpha = 0.5;
        _dotCtx.fillRect( 0, _elHeight, 1, 1 );
        _dotCtx.globalAlpha = 1;

        var _alarmCanvas = document.createElement( 'canvas' ),
            _alarmCtx = _alarmCanvas.getContext( '2d' );
        _alarmCanvas.width = 1;
        _alarmCanvas.height = 2 * _elHeight;
        _alarmCtx.fillStyle = '#444444';
        _alarmCtx.fillRect( 0, 0, 1, 2 * _elHeight );
        _alarmCtx.fillStyle = '#b70000';
        _alarmCtx.fillRect( 0, _elHeight, 1, _elHeight );
        _alarmCtx.globalAlpha = 0.5;
        _alarmCtx.fillStyle = '#ffffff';
        _alarmCtx.fillRect( 0, _elHeight, 1, 1 );
        _alarmCtx.globalAlpha = 1;

        function _init () {

            _canvas.width = _elWidth;
            _canvas.height = _elHeight;
            _canvas.style.width = _canvas.width + 'px';
            _canvas.style.height = _canvas.height + 'px';
            _canvas.className = 'rs-canvas';
            _dom.appendChild( _canvas );

            _ctx.fillStyle = '#444444';
            _ctx.fillRect( 0, 0, _canvas.width, _canvas.height );

        }

        function _draw ( v, alarm ) {
            _current += ( v - _current ) * 0.1;
            _max *= 0.99;
            if ( _current > _max ) _max = _current;
            _ctx.drawImage( _canvas, 1, 0, _canvas.width - 1, _canvas.height, 0, 0, _canvas.width - 1, _canvas.height );
            if ( alarm ) {
                _ctx.drawImage( _alarmCanvas, _canvas.width - 1, _canvas.height - _current * _canvas.height / _max - _elHeight );
            } else {
                _ctx.drawImage( _dotCanvas, _canvas.width - 1, _canvas.height - _current * _canvas.height / _max - _elHeight );
            }
        }

        _init();

        return {
            draw: _draw
        };

    }

    function StackGraph ( _dom, _num ) {

        var _canvas = document.createElement( 'canvas' ),
            _ctx = _canvas.getContext( '2d' );

        function _init () {

            _canvas.width = _elWidth;
            _canvas.height = _elHeight * _num;
            _canvas.style.width = _canvas.width + 'px';
            _canvas.style.height = _canvas.height + 'px';
            _canvas.className = 'rs-canvas';
            _dom.appendChild( _canvas );

            _ctx.fillStyle = '#444444';
            _ctx.fillRect( 0, 0, _canvas.width, _canvas.height );

        }

        function _draw ( v ) {
            _ctx.drawImage( _canvas, 1, 0, _canvas.width - 1, _canvas.height, 0, 0, _canvas.width - 1, _canvas.height );
            var th = 0;
            iterateKeys( v, function ( j ) {
                var h = v[ j ] * _canvas.height;
                _ctx.fillStyle = _colours[ j ];
                _ctx.fillRect( _canvas.width - 1, th, 1, h );
                th += h;
            } );
        }

        _init();

        return {
            draw: _draw
        };

    }

    function PerfCounter ( id, group ) {

        var _id = id,
            _time,
            _value = 0,
            _total = 0,
            _averageValue = 0,
            _accumValue = 0,
            _accumStart = performance.now(),
            _accumSamples = 0,
            _dom = document.createElement( 'div' ),
            _spanId = document.createElement( 'span' ),
            _spanValue = document.createElement( 'div' ),
            _spanValueText = document.createTextNode( '' ),
            _def = _settings ? _settings.values[ _id.toLowerCase() ] : null,
            _graph = new Graph( _dom, _id, _def ),
            _started = false;

        _spanId.className = 'rs-counter-id';
        _spanId.textContent = ( _def && _def.caption ) ? _def.caption : _id;

        _spanValue.className = 'rs-counter-value';
        _spanValue.appendChild( _spanValueText );

        _dom.appendChild( _spanId );
        _dom.appendChild( _spanValue );
        if ( group ) group.div.appendChild( _dom );
        else _div.appendChild( _dom );

        _time = performance.now();

        function _average ( v ) {
            if ( _def && _def.average ) {
                _accumValue += v;
                _accumSamples++;
                var t = performance.now();
                if ( t - _accumStart >= ( _def.avgMs || 1000 ) ) {
                    _averageValue = _accumValue / _accumSamples;
                    _accumValue = 0;
                    _accumStart = t;
                    _accumSamples = 0;
                }
            }
        }

        function _start () {
            _time = performance.now();
            if( _settings.userTimingAPI ) performance.mark( _id + '-start' );
            _started = true;
        }

        function _end () {
            _value = performance.now() - _time;
            if( _settings.userTimingAPI ) {
                performance.mark( _id + '-end' );
                if( _started ) {
                    performance.measure( _id, _id + '-start', _id + '-end' );
                }
            }
            _average( _value );
        }

        function _tick () {
            _end();
            _start();
        }

        function _draw () {
            var v = ( _def && _def.average ) ? _averageValue : _value;
            _spanValueText.nodeValue = Math.round( v * 100 ) / 100;
            var a = ( _def && ( ( _def.below && _value < _def.below ) || ( _def.over && _value > _def.over ) ) );
            _graph.draw( _value, a );
            _dom.className = a ? 'rs-counter-base alarm' : 'rs-counter-base';

        }

        function _frame () {
            var t = performance.now();
            var e = t - _time;
            _total++;
            if ( e > 1000 ) {
                if ( _def && _def.interpolate === false ) {
                    _value = _total;
                } else {
                    _value = _total * 1000 / e;
                }
                _total = 0;
                _time = t;
                _average( _value );
            }
        }

        function _set ( v ) {
            _value = v;
            _average( _value );
        }

        return {
            set: _set,
            start: _start,
            tick: _tick,
            end: _end,
            frame: _frame,
            value: function () {
                return _value;
            },
            draw: _draw
        };

    }

    function sample () {

        var _value = 0;

        function _set ( v ) {
            _value = v;
        }

        return {
            set: _set,
            value: function () {
                return _value;
            }
        };

    }

    function _perf ( idArg ) {

        var id = idArg.toLowerCase();
        if ( id === undefined ) id = 'default';
        if ( _perfCounters[ id ] ) return _perfCounters[ id ];

        var group = null;
        if ( _settings && _settings.groups ) {
            iterateKeys( _settings.groups, function ( j ) {
                var g = _settings.groups[ parseInt( j, 10 ) ];
                if ( !group && g.values.indexOf( id.toLowerCase() ) !== -1 ) {
                    group = g;
                }
            } );
        }

        var p = new PerfCounter( id, group );
        _perfCounters[ id ] = p;
        return p;

    }

    function _init () {

        if ( _settings.plugins ) {
            if ( !_settings.values ) _settings.values = {};
            if ( !_settings.groups ) _settings.groups = [];
            if ( !_settings.fractions ) _settings.fractions = [];
            for ( var j = 0; j < _settings.plugins.length; j++ ) {
                _settings.plugins[ j ].attach( _perf );
                iterateKeys( _settings.plugins[ j ].values, function ( k ) {
                    _settings.values[ k ] = _settings.plugins[ j ].values[ k ];
                } );
                _settings.groups = _settings.groups.concat( _settings.plugins[ j ].groups );
                _settings.fractions = _settings.fractions.concat( _settings.plugins[ j ].fractions );
            }
        } else {
            _settings.plugins = {};
        }

        _base = document.createElement( 'div' );
        _base.className = 'rs-base';
        _base.style.bottom = '0px';
        _base.style.right = '0px';
        _base.style.top = 'initial';
        _base.style.left = 'initial';
        _div = document.createElement( 'div' );
        _div.className = 'rs-container';
        _div.style.height = 'auto';
        _base.appendChild( _div );
        document.body.appendChild( _base );

        if ( !_settings ) return;

        if ( _settings.groups ) {
            iterateKeys( _settings.groups, function ( j ) {
                var g = _settings.groups[ parseInt( j, 10 ) ];
                var div = document.createElement( 'div' );
                div.className = 'rs-group';
                g.div = div;
                var h1 = document.createElement( 'h1' );
                h1.textContent = g.caption;
                h1.addEventListener( 'click', function ( e ) {
                    this.classList.toggle( 'hidden' );
                    e.preventDefault();
                }.bind( div ) );
                _div.appendChild( h1 );
                _div.appendChild( div );
            } );
        }

        if ( _settings.fractions ) {
            iterateKeys( _settings.fractions, function ( j ) {
                var f = _settings.fractions[ parseInt( j, 10 ) ];
                var div = document.createElement( 'div' );
                div.className = 'rs-fraction';
                var legend = document.createElement( 'div' );
                legend.className = 'rs-legend';

                var h = 0;
                iterateKeys( _settings.fractions[ j ].steps, function ( k ) {
                    var p = document.createElement( 'p' );
                    p.textContent = _settings.fractions[ j ].steps[ k ];
                    p.style.color = _colours[ h ];
                    legend.appendChild( p );
                    h++;
                } );
                div.appendChild( legend );
                div.style.height = h * _elHeight + 'px';
                f.div = div;
                var graph = new StackGraph( div, h );
                f.graph = graph;
                _div.appendChild( div );
            } );
        }

    }

    function _update () {

        iterateKeys( _settings.plugins, function ( j ) {
            _settings.plugins[ j ].update();
        } );

        iterateKeys( _perfCounters, function ( j ) {
            _perfCounters[ j ].draw();
        } );

        if ( _settings && _settings.fractions ) {
            iterateKeys( _settings.fractions, function ( j ) {
                var f = _settings.fractions[ parseInt( j, 10 ) ];
                var v = [];
                var base = _perfCounters[ f.base.toLowerCase() ];
                if ( base ) {
                    base = base.value();
                    iterateKeys( _settings.fractions[ j ].steps, function ( k ) {
                        var s = _settings.fractions[ j ].steps[ parseInt( k, 10 ) ].toLowerCase();
                        var val = _perfCounters[ s ];
                        if ( val ) {
                            v.push( val.value() / base );
                        }
                    } );
                }
                f.graph.draw( v );
            } );
        }

        /*if( _height != _div.clientHeight ) {
            _height = _div.clientHeight;
            _base.style.height = _height + 2 * _elHeight + 'px';
        console.log( _base.clientHeight );
        }*/

    }

    _init();

    return function ( id ) {
        if ( id ) return _perf( id );
        return {
            element: _base,
            update: _update
        };
    };

}



var glStats = function() {

    var _rS = null;

    var _totalDrawArraysCalls = 0,
        _totalDrawElementsCalls = 0,
        _totalUseProgramCalls = 0,
        _totalFaces = 0,
        _totalVertices = 0,
        _totalPoints = 0,
        _totalBindTexures = 0;

        function _h( f, c ) {
            return function() {
                c.apply( this, arguments );
                f.apply( this, arguments );
            }
        }
    WebGLRenderingContext.prototype.drawArrays = _h( WebGLRenderingContext.prototype.drawArrays, function() {
        _totalDrawArraysCalls++;
        if( arguments[ 0 ] == this.POINTS ) _totalPoints += arguments[ 2 ];
        else _totalVertices += arguments[ 2 ];
    } );

    WebGLRenderingContext.prototype.drawElements = _h( WebGLRenderingContext.prototype.drawElements, function() {
        _totalDrawElementsCalls++;
        _totalFaces += arguments[ 1 ] / 3;
        _totalVertices += arguments[ 1 ];
    } );

    WebGLRenderingContext.prototype.useProgram = _h( WebGLRenderingContext.prototype.useProgram, function() {
        _totalUseProgramCalls++;
    } );

    WebGLRenderingContext.prototype.bindTexture = _h( WebGLRenderingContext.prototype.bindTexture, function() {
        _totalBindTexures++;
    } );

    var _values = {
        allcalls: { over: 3000, caption: 'Calls (hook)' },
        drawelements: { caption: 'drawElements (hook)' },
        drawarrays: { caption: 'drawArrays (hook)' },
    };

    var _groups = [
        { caption: 'WebGL', values: [ 'allcalls', 'drawelements', 'drawarrays', 'useprogram', 'bindtexture', 'glfaces', 'glvertices', 'glpoints' ] }
    ];

    var _fractions = [
        { base: 'allcalls', steps: [ 'drawelements', 'drawarrays' ] }
    ];

    function _update() {
        _rS( 'allcalls' ).set( _totalDrawArraysCalls + _totalDrawElementsCalls );
        _rS( 'drawElements' ).set( _totalDrawElementsCalls );
        _rS( 'drawArrays' ).set( _totalDrawArraysCalls );
        _rS( 'bindTexture' ).set( _totalBindTexures );
        _rS( 'useProgram' ).set( _totalUseProgramCalls );
        _rS( 'glfaces' ).set( _totalFaces );
        _rS( 'glvertices' ).set( _totalVertices );
        _rS( 'glpoints' ).set( _totalPoints );
    }

    function _start() {
        _totalDrawArraysCalls = 0;
        _totalDrawElementsCalls = 0;
        _totalUseProgramCalls = 0;
        _totalFaces = 0;
        _totalVertices = 0;
        _totalPoints = 0;
        _totalBindTexures = 0;
    }

    function _end() {}

    function _attach( r ) {
        _rS = r;
    }

    return {
        update: _update,
        start: _start,
        end: _end,
        attach: _attach,
        values: _values,
        groups: _groups,
        fractions: _fractions
    }

}

var threeStats = function( renderer ) {

    var _rS = null;

    var _values = {
        'renderer.info.memory.geometries': { caption: 'Geometries' },
        'renderer.info.memory.textures': { caption: 'Textures' },
        'renderer.info.memory.programs': { caption: 'Programs' },
        'renderer.info.render.calls': { caption: 'Calls' },
        'renderer.info.render.faces': { caption: 'Faces', over: 1000 },
        'renderer.info.render.points': { caption: 'Points' },
        'renderer.info.render.vertices': { caption: 'Vertices' }
    };

    var _groups = [
        { caption: 'Three.js - memory', values: [ 'renderer.info.memory.geometries', 'renderer.info.memory.programs', 'renderer.info.memory.textures' ] },
        { caption: 'Three.js - render', values: [ 'renderer.info.render.calls', 'renderer.info.render.faces', 'renderer.info.render.points', 'renderer.info.render.vertices' ] }
    ];

    var _fractions = [];

    function _update() {

        _rS( 'renderer.info.memory.geometries' ).set( renderer.info.memory.geometries );
        _rS( 'renderer.info.memory.programs' ).set( renderer.info.memory.programs );
        _rS( 'renderer.info.memory.textures' ).set( renderer.info.memory.textures );
        _rS( 'renderer.info.render.calls' ).set( renderer.info.render.calls );
        _rS( 'renderer.info.render.faces' ).set( renderer.info.render.faces );
        _rS( 'renderer.info.render.points' ).set( renderer.info.render.points );
        _rS( 'renderer.info.render.vertices' ).set( renderer.info.render.vertices );

    }

    function _start() {}

    function _end() {}

    function _attach( r ) {
        _rS = r;
    }

    return {
        update: _update,
        start: _start,
        end: _end,
        attach: _attach,
        values: _values,
        groups: _groups,
        fractions: _fractions
    }

}

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


    // let fpscontainer = $('<div>',{style:'position:fixed;top:0;left:0;'}).appendTo('body');
    // let labels=$('<div>',{style:'display:grid;grid-template-columns:1fr 1fr 1fr;justify-items:center;'}).appendTo(fpscontainer);
    // $('<label>').text('FPS').appendTo(labels);
    // $('<label>').text('Update (ms)').appendTo(labels);
    // $('<label>').text('Draw (ms)').appendTo(labels);
    // var statsFPS=new Stats();
    // statsFPS.begin();
    // $(statsFPS.dom).css({position:'relative', display:'inline-block'}).appendTo(fpscontainer);
    // requestAnimationFrame(function loop(){statsFPS.update();requestAnimationFrame(loop)});

    // var statsUpdate=new Stats();
    // $(statsUpdate.dom).css({position:'relative', display:'inline-block'}).appendTo(fpscontainer);
    // statsUpdate.showPanel(2);

    // var statsDraw=new Stats();
    // $(statsDraw.dom).css({position:'relative', display:'inline-block'}).appendTo(fpscontainer);
    // statsDraw.showPanel(2);

    let origUpdate = OpenSeadragon.World.prototype.update;
    let origDraw = OpenSeadragon.World.prototype.draw;

    let glS = new glStats();
    let rS = new rStats( {
        values: {
            frame: { caption: 'Total frame time (ms)', over: 16 },
            fps: { caption: 'Framerate (FPS)', below: 30 },
            raf: { caption: 'Time since last rAF (ms)' },
            rstats: { caption: 'rStats update (ms)' }
        },
        groups: [
            { caption: 'Framerate', values: [ 'fps', 'raf' ] },
            { caption: 'Frame Budget', values: [ 'frame', 'update','draw','other'] }
        ],
        fractions: [
            { base: 'frame', steps: [ 'update', 'draw', 'other' ] }
        ],
        plugins: [
            // tS,
            glS
        ]
    } );

    OpenSeadragon.World.prototype.update = function(){
        // statsUpdate.begin();
        rS( 'frame' ).end();
        rS('other').end();
        rS( 'frame' ).start();
        glS.start();

        rS( 'rAF' ).tick();
        rS( 'FPS' ).frame();
        rS('update').start();
        origUpdate.call(this, ...arguments);
        // statsUpdate.end();
        rS('update').end();
    };

    OpenSeadragon.World.prototype.draw = function(){
        // statsDraw.begin();
        rS('draw').start();
        origDraw.call(this, ...arguments);
        // statsDraw.end();
        rS('draw').end();
        rS('other').start();
        rS().update();
    }

// })();

function run(drawerType, num) {
    rS('other').start();

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
    window.setTimeout(()=>viewer.viewport.goHome(), 500);

    let movingLeft = false;
    if(window.interval){
        window.clearInterval(window.interval);
    }
    window.interval = window.setInterval(()=>{
        let m = movingLeft ? 1 : -1;
        movingLeft = m === -1;
        let dist = viewer.viewport.getBounds().width;
        viewer.viewport.panBy(new OpenSeadragon.Point( dist * m/40, 0));

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

const url = new URL(window.location.href);
const drawer = url.searchParams.get("drawer");
const numberOfSources = Number.parseInt(url.searchParams.get("sources")) || 1;

$('#create-drawer').on('click',function(){
    const drawer = $('#select-drawer').val();
    let num = Math.floor($('#input-number').val());

    url.searchParams.set("drawer", drawer);
    url.searchParams.set("sources", num);
    if ("undefined" !== typeof history.replaceState) {
        history.replaceState(null, window.location.title, url.toString());
    }
    run(drawer, num);
});

$('#input-number').val(numberOfSources);
$("#select-drawer").html(Object.entries(drawers).map(([k, v]) => {
    const selected = drawer === k ? "selected" : "";
    return `<option value="${k}" ${selected}>${v}</option>`;
}).join("\n"));
if (drawer) {
    run(drawer, numberOfSources);
}

