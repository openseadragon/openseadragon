/*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~
/* viaWebGL
/* Set shaders on Image or Canvas with WebGL
/* Built on 2016-9-9
/* http://via.hoff.in
*/
ViaWebGL = function(incoming) {

    /* Custom WebGL API calls
    ~*~*~*~*~*~*~*~*~*~*~*~*/
    this['gl-drawing'] = function(e) { return e; };
    this['gl-loaded'] = function(e) { return e; };
    this.ready = function(e) { return e; };

    var gl = this.maker();
    this.flat = document.createElement('canvas').getContext('2d');
    this.tile_size = 'u_tile_size';
    this.vShader = 'vShader.glsl';
    this.fShader = 'fShader.glsl';
    this.wrap = gl.CLAMP_TO_EDGE;
    this.tile_pos = 'a_tile_pos';
    this.filter = gl.NEAREST;
    this.pos = 'a_pos';
    this.height = 128;
    this.width = 128;
    this.on = 0;
    this.gl = gl;
    // Assign from incoming terms
    for (var key in incoming) {
        this[key] = incoming[key];
    }
};

ViaWebGL.prototype = {

    init: function(source) {
        var ready = this.ready;
        // Allow for mouse actions on click
        if (this.hasOwnProperty('container') && this.hasOwnProperty('onclick')) {
            this.container.onclick = this[this.onclick].bind(this);
        }
        if (source && source.height && source.width) {
            this.ready = this.toCanvas.bind(this,source);
            this.height = source.height;
            this.width = source.width;
        }
        this.source = source;
        this.gl.canvas.width = this.width;
        this.gl.canvas.height = this.height;
        this.gl.viewport(0, 0, this.width, this.height);
        // Load the shaders when ready and return the promise
        var step = [[this.vShader, this.fShader].map(this.getter)];
        step.push(this.toProgram.bind(this), this.toBuffers.bind(this));
        return Promise.all(step[0]).then(step[1]).then(step[2]).then(this.ready);

    },
    // Make a canvas
    maker: function(options){
        return this.context(document.createElement('canvas'));
    },
    context: function(a){
        return a.getContext('experimental-webgl') || a.getContext('webgl');
    },
    // Get a file as a promise
    getter: function(where) {
        return new Promise(function(done){
            // Return if not a valid filename
            if (where.slice(-4) != 'glsl') {
                return done(where);
            }
            var bid = new XMLHttpRequest();
            var win = function(){
                if (bid.status == 200) {
                    return done(bid.response);
                }
                return done(where);
            };
            bid.open('GET', where, true);
            bid.onerror = bid.onload = win;
            bid.send();
        });
    },
    // Link shaders from strings
    toProgram: function(files) {
        var gl = this.gl;
        var program = gl.createProgram();
        var ok = function(kind,status,value,sh) {
            if (!gl['get'+kind+'Parameter'](value, gl[status+'_STATUS'])){
                console.log((sh||'LINK')+':\n'+gl['get'+kind+'InfoLog'](value));
            }
            return value;
        }
        // 1st is vertex; 2nd is fragment
        files.map(function(given,i) {
            var sh = ['VERTEX_SHADER', 'FRAGMENT_SHADER'][i];
            var shader = gl.createShader(gl[sh]);
            gl.shaderSource(shader, given);
            gl.compileShader(shader);
            gl.attachShader(program, shader);
            ok('Shader','COMPILE',shader,sh);
        });
        gl.linkProgram(program);
        return ok('Program','LINK',program);
    },
    // Load data to the buffers
    toBuffers: function(program) {

        // Allow for custom loading
        this.gl.useProgram(program);
        this['gl-loaded'].call(this, program);

        // Unchangeable square array buffer fills viewport with texture
        var boxes = [[-1, 1,-1,-1, 1, 1, 1,-1], [0, 1, 0, 0, 1, 1, 1, 0]];
        var buffer = new Float32Array([].concat.apply([], boxes));
        var bytes = buffer.BYTES_PER_ELEMENT;
        var gl = this.gl;
        var count = 4;

        // Get uniform term
        var tile_size = gl.getUniformLocation(program, this.tile_size);
        gl.uniform2f(tile_size, gl.canvas.height, gl.canvas.width);

        // Get attribute terms
        this.att = [this.pos, this.tile_pos].map(function(name, number) {

            var index = Math.min(number, boxes.length-1);
            var vec = Math.floor(boxes[index].length/count);
            var vertex = gl.getAttribLocation(program, name);

            return [vertex, vec, gl.FLOAT, 0, vec*bytes, count*index*vec*bytes];
        });
        // Get texture
        this.tex = {
            texParameteri: [
                [gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this.wrap],
                [gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this.wrap],
                [gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.filter],
                [gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.filter]
            ],
            texImage2D: [gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE],
            bindTexture: [gl.TEXTURE_2D, gl.createTexture()],
            drawArrays: [gl.TRIANGLE_STRIP, 0, count],
            pixelStorei: [gl.UNPACK_FLIP_Y_WEBGL, 1]
        };
        // Build the position and texture buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW);
    },
    // Turns image or canvas into a rendered canvas
    toCanvas: function(tile) {
        // Stop Rendering
        if (this.on%2 !== 0) {
            if(tile.nodeName == 'IMG') {
                this.flat.canvas.width = tile.width;
                this.flat.canvas.height = tile.height;
                this.flat.drawImage(tile,0,0,tile.width,tile.height);
                return this.flat.canvas;
            }
            return tile;
        }

        // Allow for custom drawing in webGL
        this['gl-drawing'].call(this,tile);
        var gl = this.gl;

        // Set Attributes for GLSL
        this.att.map(function(x){

            gl.enableVertexAttribArray(x.slice(0,1));
            gl.vertexAttribPointer.apply(gl, x);
        });

        // Set Texture for GLSL
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture.apply(gl, this.tex.bindTexture);
        gl.pixelStorei.apply(gl, this.tex.pixelStorei);

        // Apply texture parameters
        this.tex.texParameteri.map(function(x){
            gl.texParameteri.apply(gl, x);
        });
        // Send the tile into the texture.
        var output = this.tex.texImage2D.concat([tile]);
        gl.texImage2D.apply(gl, output);

        // Draw everything needed to canvas
        gl.drawArrays.apply(gl, this.tex.drawArrays);

        // Apply to container if needed
        if (this.container) {
            this.container.appendChild(this.gl.canvas);
        }
        return this.gl.canvas;
    },
    toggle: function() {
        this.on ++;
        this.container.innerHTML = '';
        this.container.appendChild(this.toCanvas(this.source));

    }
}
