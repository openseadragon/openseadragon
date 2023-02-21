// import 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.149.0/three.min.js';
import '../lib/three.js';
const THREE = window.THREE;
const DEPTH_MULTIPLIER = 0.1;

export class ThreeJSRenderer extends OpenSeadragon.Drawer{
    constructor(openSeadragonViewer, canvas){
        this._viewer = openSeadragonViewer;
        this._camera = null;
        this._scene = null;
        this._imageContainer = null;
        this._renderer = null;

        this._renderingContinously = false;
        this._animationFrame = null;

        if(canvas){
            this._canvas = canvas;
        } else {
            let viewerCanvas = viewer.drawer.canvas;
            this._canvas = viewer.drawer.canvas;
            // let canvas = this._canvas = document.createElement('canvas');
            // canvas.insertBefore(viewerCanvas);

            // canvas.style.width = viewerCanvas.clientWidth+'px';
            // canvas.style.height = viewerCanvas.clientHeight+'px';
            // canvas.width = viewerCanvas.width;
            // canvas.height = viewerCanvas.height;

            // //make the test canvas mirror all changes to the viewer canvas
            // viewer.addHandler("resize", function(){
            //     canvas.style.width = viewerCanvas.clientWidth+'px';
            //     canvas.style.height = viewerCanvas.clientHeight+'px';
            // });
        }
        createThreeViewer(this);
    }
    renderFrame(){
        if(this._animationFrame) {
            cancelAnimationFrame(this._animationFrame);
        }
        this._animationFrame = requestAnimationFrame(()=>this.render());
    }
    render(){
        // this.camera.updateProjectionMatrix();
        this._renderer.render(this._scene, this._camera);
        this._animationFrame = null;
        if(this._renderingContinuously){
            this.renderFrame();
        }
    }
    renderContinuously(continuously){
        if(continuously){
            this._renderingContinuously = true;

        } else {
            this._renderingContinuously = false;
        }
    }
    destroy(){
        //clear all resources used by the renderer, geometries, textures etc
        //to do: remove handlers from viewer and dispose of any remaining textures/materials
        cleanupObject(this._scene);
        cleanupObject(this._renderer);
        cleanupObject(this._camera);
        this._scene = null;
        this._renderer = null;
        this._camera = null;

    }

    //// Override API from OpenSeadragon.Drawer

        /**
         * This function will create multiple polygon paths on the drawing context by provided polygons,
         * then clip the context to the paths.
         * @param {OpenSeadragon.Point[][]} polygons - an array of polygons. A polygon is an array of OpenSeadragon.Point
         * @param {Boolean} useSketch - Whether to use the sketch canvas or not.
         */
        clipWithPolygons(polygons, useSketch) {
            if (!this.useCanvas) {
                return;
            }
            var context = this._getContext(useSketch);
            context.beginPath();
            polygons.forEach(function (polygon) {
                polygon.forEach(function (coord, i) {
                    context[i === 0 ? 'moveTo' : 'lineTo'](coord.x, coord.y);
              });
            });
            context.clip();
        }

        /**
         * Destroy the drawer (unload current loaded tiles)
         */
        destroy() {
            //force unloading of current canvas (1x1 will be gc later, trick not necessarily needed)
            this.canvas.width  = 1;
            this.canvas.height = 1;
            this.sketchCanvas = null;
            this.sketchContext = null;
        }

        /**
         * Clears the Drawer so it's ready to draw another frame.
         */
        clear(){
            this.canvas.innerHTML = "";
            if ( this.useCanvas ) {
                var viewportSize = this._calculateCanvasSize();
                if( this.canvas.width !== viewportSize.x ||
                    this.canvas.height !== viewportSize.y ) {
                    this.canvas.width = viewportSize.x;
                    this.canvas.height = viewportSize.y;
                    this._updateImageSmoothingEnabled(this.context);
                    if ( this.sketchCanvas !== null ) {
                        var sketchCanvasSize = this._calculateSketchCanvasSize();
                        this.sketchCanvas.width = sketchCanvasSize.x;
                        this.sketchCanvas.height = sketchCanvasSize.y;
                        this._updateImageSmoothingEnabled(this.sketchContext);
                    }
                }
                this._clear();
            }
        }

        _clear(useSketch, bounds) {
            if (!this.useCanvas) {
                return;
            }
            var context = this._getContext(useSketch);
            if (bounds) {
                context.clearRect(bounds.x, bounds.y, bounds.width, bounds.height);
            } else {
                var canvas = context.canvas;
                context.clearRect(0, 0, canvas.width, canvas.height);
            }
        }

        /**
         * Draws the given tile.
         * @param {OpenSeadragon.Tile} tile - The tile to draw.
         * @param {Function} drawingHandler - Method for firing the drawing event if using canvas.
         * drawingHandler({context, tile, rendered})
         * @param {Boolean} useSketch - Whether to use the sketch canvas or not.
         * where <code>rendered</code> is the context with the pre-drawn image.
         * @param {Float} [scale=1] - Apply a scale to tile position and size. Defaults to 1.
         * @param {OpenSeadragon.Point} [translate] A translation vector to offset tile position
         * @param {Boolean} [shouldRoundPositionAndSize] - Tells whether to round
         * position and size of tiles supporting alpha channel in non-transparency
         * context.
         * @param {OpenSeadragon.TileSource} source - The source specification of the tile.
         */
        drawTile( tile, drawingHandler, useSketch, scale, translate, shouldRoundPositionAndSize, source) {
            $.console.assert(tile, '[Drawer.drawTile] tile is required');
            $.console.assert(drawingHandler, '[Drawer.drawTile] drawingHandler is required');

            if (this.useCanvas) {
                var context = this._getContext(useSketch);
                scale = scale || 1;
                tile.drawCanvas(context, drawingHandler, scale, translate, shouldRoundPositionAndSize, source);
            } else {
                tile.drawHTML( this.canvas );
            }
        }
        _getContext( useSketch ) {
            var context = this.context;
            if ( useSketch ) {
                if (this.sketchCanvas === null) {
                    this.sketchCanvas = document.createElement( "canvas" );
                    var sketchCanvasSize = this._calculateSketchCanvasSize();
                    this.sketchCanvas.width = sketchCanvasSize.x;
                    this.sketchCanvas.height = sketchCanvasSize.y;
                    this.sketchContext = this.sketchCanvas.getContext( "2d" );

                    // If the viewport is not currently rotated, the sketchCanvas
                    // will have the same size as the main canvas. However, if
                    // the viewport get rotated later on, we will need to resize it.
                    if (this.viewport.getRotation() === 0) {
                        var self = this;
                        this.viewer.addHandler('rotate', function resizeSketchCanvas() {
                            if (self.viewport.getRotation() === 0) {
                                return;
                            }
                            self.viewer.removeHandler('rotate', resizeSketchCanvas);
                            var sketchCanvasSize = self._calculateSketchCanvasSize();
                            self.sketchCanvas.width = sketchCanvasSize.x;
                            self.sketchCanvas.height = sketchCanvasSize.y;
                        });
                    }
                    this._updateImageSmoothingEnabled(this.sketchContext);
                }
                context = this.sketchContext;
            }
            return context;
        }

        // private
        saveContext() {
            if (!this.useCanvas) {
                return;
            }

            this._getContext( useSketch ).save();
        }

        // private
        restoreContext( useSketch ) {
            if (!this.useCanvas) {
                return;
            }

            this._getContext( useSketch ).restore();
        }

        // private
        setClip(rect, useSketch) {
            if (!this.useCanvas) {
                return;
            }

            var context = this._getContext( useSketch );
            context.beginPath();
            context.rect(rect.x, rect.y, rect.width, rect.height);
            context.clip();
        }

        // private
        drawRectangle(rect, fillStyle, useSketch) {
            if (!this.useCanvas) {
                return;
            }

            var context = this._getContext( useSketch );
            context.save();
            context.fillStyle = fillStyle;
            context.fillRect(rect.x, rect.y, rect.width, rect.height);
            context.restore();
        }

        /**
         * Blends the sketch canvas in the main canvas.
         * @param {Object} options The options
         * @param {Float} options.opacity The opacity of the blending.
         * @param {Float} [options.scale=1] The scale at which tiles were drawn on
         * the sketch. Default is 1.
         * Use scale to draw at a lower scale and then enlarge onto the main canvas.
         * @param {OpenSeadragon.Point} [options.translate] A translation vector
         * that was used to draw the tiles
         * @param {String} [options.compositeOperation] - How the image is
         * composited onto other images; see compositeOperation in
         * {@link OpenSeadragon.Options} for possible values.
         * @param {OpenSeadragon.Rect} [options.bounds] The part of the sketch
         * canvas to blend in the main canvas. If specified, options.scale and
         * options.translate get ignored.
         */
        blendSketch(opacity, scale, translate, compositeOperation) {
            var options = opacity;
            if (!$.isPlainObject(options)) {
                options = {
                    opacity: opacity,
                    scale: scale,
                    translate: translate,
                    compositeOperation: compositeOperation
                };
            }
            if (!this.useCanvas || !this.sketchCanvas) {
                return;
            }
            opacity = options.opacity;
            compositeOperation = options.compositeOperation;
            var bounds = options.bounds;

            this.context.save();
            this.context.globalAlpha = opacity;
            if (compositeOperation) {
                this.context.globalCompositeOperation = compositeOperation;
            }
            if (bounds) {
                // Internet Explorer, Microsoft Edge, and Safari have problems
                // when you call context.drawImage with negative x or y
                // or x + width or y + height greater than the canvas width or height respectively.
                if (bounds.x < 0) {
                    bounds.width += bounds.x;
                    bounds.x = 0;
                }
                if (bounds.x + bounds.width > this.canvas.width) {
                    bounds.width = this.canvas.width - bounds.x;
                }
                if (bounds.y < 0) {
                    bounds.height += bounds.y;
                    bounds.y = 0;
                }
                if (bounds.y + bounds.height > this.canvas.height) {
                    bounds.height = this.canvas.height - bounds.y;
                }

                this.context.drawImage(
                    this.sketchCanvas,
                    bounds.x,
                    bounds.y,
                    bounds.width,
                    bounds.height,
                    bounds.x,
                    bounds.y,
                    bounds.width,
                    bounds.height
                );
            } else {
                scale = options.scale || 1;
                translate = options.translate;
                var position = translate instanceof $.Point ?
                    translate : new $.Point(0, 0);

                var widthExt = 0;
                var heightExt = 0;
                if (translate) {
                    var widthDiff = this.sketchCanvas.width - this.canvas.width;
                    var heightDiff = this.sketchCanvas.height - this.canvas.height;
                    widthExt = Math.round(widthDiff / 2);
                    heightExt = Math.round(heightDiff / 2);
                }
                this.context.drawImage(
                    this.sketchCanvas,
                    position.x - widthExt * scale,
                    position.y - heightExt * scale,
                    (this.canvas.width + 2 * widthExt) * scale,
                    (this.canvas.height + 2 * heightExt) * scale,
                    -widthExt,
                    -heightExt,
                    this.canvas.width + 2 * widthExt,
                    this.canvas.height + 2 * heightExt
                );
            }
            this.context.restore();
        }

        // private
        drawDebugInfo(tile, count, i, tiledImage) {
            if ( !this.useCanvas ) {
                return;
            }

            var colorIndex = this.viewer.world.getIndexOfItem(tiledImage) % this.debugGridColor.length;
            var context = this.context;
            context.save();
            context.lineWidth = 2 * $.pixelDensityRatio;
            context.font = 'small-caps bold ' + (13 * $.pixelDensityRatio) + 'px arial';
            context.strokeStyle = this.debugGridColor[colorIndex];
            context.fillStyle = this.debugGridColor[colorIndex];

            if (this.viewport.getRotation(true) % 360 !== 0 ) {
                this._offsetForRotation({degrees: this.viewport.getRotation(true)});
            }
            if (tiledImage.getRotation(true) % 360 !== 0) {
                this._offsetForRotation({
                    degrees: tiledImage.getRotation(true),
                    point: tiledImage.viewport.pixelFromPointNoRotate(
                        tiledImage._getRotationPoint(true), true)
                });
            }
            if (tiledImage.viewport.getRotation(true) % 360 === 0 &&
                tiledImage.getRotation(true) % 360 === 0) {
                if(tiledImage._drawer.viewer.viewport.getFlip()) {
                    tiledImage._drawer._flip();
                }
            }

            context.strokeRect(
                tile.position.x * $.pixelDensityRatio,
                tile.position.y * $.pixelDensityRatio,
                tile.size.x * $.pixelDensityRatio,
                tile.size.y * $.pixelDensityRatio
            );

            var tileCenterX = (tile.position.x + (tile.size.x / 2)) * $.pixelDensityRatio;
            var tileCenterY = (tile.position.y + (tile.size.y / 2)) * $.pixelDensityRatio;

            // Rotate the text the right way around.
            context.translate( tileCenterX, tileCenterY );
            context.rotate( Math.PI / 180 * -this.viewport.getRotation(true) );
            context.translate( -tileCenterX, -tileCenterY );

            if( tile.x === 0 && tile.y === 0 ){
                context.fillText(
                    "Zoom: " + this.viewport.getZoom(),
                    tile.position.x * $.pixelDensityRatio,
                    (tile.position.y - 30) * $.pixelDensityRatio
                );
                context.fillText(
                    "Pan: " + this.viewport.getBounds().toString(),
                    tile.position.x * $.pixelDensityRatio,
                    (tile.position.y - 20) * $.pixelDensityRatio
                );
            }
            context.fillText(
                "Level: " + tile.level,
                (tile.position.x + 10) * $.pixelDensityRatio,
                (tile.position.y + 20) * $.pixelDensityRatio
            );
            context.fillText(
                "Column: " + tile.x,
                (tile.position.x + 10) * $.pixelDensityRatio,
                (tile.position.y + 30) * $.pixelDensityRatio
            );
            context.fillText(
                "Row: " + tile.y,
                (tile.position.x + 10) * $.pixelDensityRatio,
                (tile.position.y + 40) * $.pixelDensityRatio
            );
            context.fillText(
                "Order: " + i + " of " + count,
                (tile.position.x + 10) * $.pixelDensityRatio,
                (tile.position.y + 50) * $.pixelDensityRatio
            );
            context.fillText(
                "Size: " + tile.size.toString(),
                (tile.position.x + 10) * $.pixelDensityRatio,
                (tile.position.y + 60) * $.pixelDensityRatio
            );
            context.fillText(
                "Position: " + tile.position.toString(),
                (tile.position.x + 10) * $.pixelDensityRatio,
                (tile.position.y + 70) * $.pixelDensityRatio
            );

            if (this.viewport.getRotation(true) % 360 !== 0 ) {
                this._restoreRotationChanges();
            }
            if (tiledImage.getRotation(true) % 360 !== 0) {
                this._restoreRotationChanges();
            }

            if (tiledImage.viewport.getRotation(true) % 360 === 0 &&
                tiledImage.getRotation(true) % 360 === 0) {
                if(tiledImage._drawer.viewer.viewport.getFlip()) {
                    tiledImage._drawer._flip();
                }
            }

            context.restore();
        }

        // private
        debugRect(rect) {
            if ( this.useCanvas ) {
                var context = this.context;
                context.save();
                context.lineWidth = 2 * $.pixelDensityRatio;
                context.strokeStyle = this.debugGridColor[0];
                context.fillStyle = this.debugGridColor[0];

                context.strokeRect(
                    rect.x * $.pixelDensityRatio,
                    rect.y * $.pixelDensityRatio,
                    rect.width * $.pixelDensityRatio,
                    rect.height * $.pixelDensityRatio
                );

                context.restore();
            }
        }



}

/***  Create THREE.js version of rendering tiled images using WebGL  ****/
function createThreeViewer(instance){
    // Add listeners for events that require modifying the scene or camera
    instance._viewer.addHandler("close", ()=>instance.destroy());
    instance._viewer.world.addHandler("add-item", ev => addTiledImage(ev, instance));
    instance._viewer.world.addHandler("remove-item", ev => removeTiledImage(ev, instance));
    instance._viewer.world.addHandler("item-index-change", ev => setItemOrder(ev, instance));
    instance._viewer.addHandler("tile-ready", ev => tileReady(ev, instance));
    instance._viewer.addHandler("tile-unloaded", ev => tileUnloaded(ev, instance));
    instance._viewer.addHandler("viewport-change", ev => viewportChange(ev, instance));
    // instance._viewer.addHandler("update-viewport", ev => instance.renderFrame());

    //to do: support pages of sequence mode

    //to do: add handler for resize event to auto-sync

    let viewerBounds = instance._viewer.viewport.getBoundsNoRotate();
    instance._scene = new THREE.Scene();
    instance._imageContainer = new THREE.Group();
    instance._camera = new THREE.OrthographicCamera(
        viewerBounds.width / -2,
        viewerBounds.width / 2,
        viewerBounds.height / 2,
        viewerBounds.height / -2,
        0,
        10000
    );
    instance._camera.position.x = viewerBounds.x + viewerBounds.width/2;
    instance._camera.position.y = -(viewerBounds.y + viewerBounds.height/2);
    instance._camera.position.z = 100;
    instance._camera.lookAt(instance._camera.position.x, instance._camera.position.y, 0);
    instance._camera.updateProjectionMatrix();

    var light = new THREE.AmbientLight();
    instance._scene.add(light);
    instance._scene.add(instance._imageContainer);

    instance._scene.background = new THREE.Color(0.25, 0.25, 0.25);

    instance._renderer = new THREE.WebGLRenderer({canvas: instance._canvas});
}

//private
function tileReady(event, instance){
    let tile = event.tile;
    let tiledImage = event.tiledImage;

    //create a THREE.Material with the image data for this tile
    let texture = new THREE.CanvasTexture(event.tile.getCanvasContext().canvas);
    texture.flipY = false; // To match OSD reference frame
    let material = new THREE.MeshLambertMaterial({
        map: texture,
        transparent: !!tile.hasTransparency || tiledImage.opacity < 1,
        opacity: tiledImage.opacity
    });

    //attach the material to the tile so it can be queried by location using OpenSeadragon methods
    tile._three = material;

    //cache the bounds for this material so it doesn't have to be recomputed every time it is used to update the scene
    material.userData._tileBounds = tiledImage.source.getTileBounds(tile.level, tile.x, tile.y);
    material.userData.hasTransparency = !!tile.hasTransparency;
    material.userData.tile = tile;
    material.userData.tiledImage = tiledImage;

    //since a new tile is available, update the image (if needed)
    updateTiledImageRendering(tiledImage, tile, instance);
}

function tileUnloaded(event, instance){
    let tile = event.tile;
    cleanupObject(tile._three);
    delete tile._three;

    updateTiledImageRendering(event.tiledImage, tile, instance);
}

function viewportChange(event, instance){
    let viewer = event.eventSource;

    let viewerBounds = viewer.viewport.getBoundsNoRotate(true);
    instance._camera.left = viewerBounds.width / -2;
    instance._camera.right = viewerBounds.width / 2;
    instance._camera.top = viewerBounds.height / 2;
    instance._camera.bottom = viewerBounds.height / -2;

    let center = viewer.viewport.getCenter(true);
    instance._camera.position.x = center.x;
    instance._camera.position.y = -center.y;
    instance._camera.rotation.z = viewer.viewport.getRotation(true) * Math.PI / 180;

    instance._camera.updateProjectionMatrix();

    let numItems = viewer.world.getItemCount();
    let i;
    for(i = 0; i < numItems; i++){
        let tiledImage = viewer.world.getItemAt(i);
        updateMeshIfNeeded(tiledImage);
    }

    instance.renderFrame();
}


function addTiledImage(event, instance){
    let tiledImage = event.item;

    //create a Group for the tiles of this tiled image.
    if(!tiledImage._three){
        let tileContainer = new THREE.Group();
        let rotationAxis = new THREE.Group();
        let positioningGroup = new THREE.Group();
        rotationAxis.add(tileContainer);
        positioningGroup.add(rotationAxis);
        positioningGroup.userData._tileContainer = tileContainer;

        //add the object to the group of images (i.e. add to the scene)
        instance._imageContainer.add(positioningGroup);

        //save mutual references between OpenSceneGraph and ThreeJSRenderer versions of tiledImages
        tiledImage._three = positioningGroup;
        positioningGroup._tiledImage = tiledImage;

        //offset the tileContainer so the center of the image is at the origin of the parent group
        tileContainer.position.x = -0.5;
        tileContainer.position.y = -0.5 / tiledImage.source.aspectRatio;

        //undo the offset of the tileContainer, moving this back into original viewport coordinate space
        rotationAxis.position.x = tileContainer.position.x * -1;
        rotationAxis.position.y = tileContainer.position.y * -1;


        updateTiledImageParameters(instance, tiledImage, positioningGroup, rotationAxis);
        tiledImage.addHandler('bounds-change',()=>updateTiledImageParameters(instance, tiledImage, positioningGroup, rotationAxis, true));
        tiledImage.addHandler('opacity-change',()=>updateTiledImageParameters(instance, tiledImage, positioningGroup, rotationAxis, true));

    }
    setItemOrder(null, instance);
}

function removeTiledImage(event){
    let tiledImage = event.item;
    //to do: make sure all resources for all tiles are unloaded (even if not actively in the tile group)
    tiledImage._three.removeFromParent();
    cleanupObject(tiledImage._three);
    delete tiledImage._three;

}

function updateTiledImageParameters(instance, tiledImage, positioningGroup, rotationAxis, requestRender){
    let bounds = tiledImage.getBoundsNoRotate(true);
    let rotation = tiledImage.getRotation(true);

    //set size and location
    positioningGroup.scale.x = bounds.width; //scale the normalized image coordinates to match the size within the world
    positioningGroup.scale.y = -bounds.width; //flip Y
    positioningGroup.position.x = bounds.x;
    positioningGroup.position.y = bounds.y * -1;//flip Y

    // rotate about the rotation axis
    rotationAxis.rotation.z = rotation * Math.PI / 180;
    rotationAxis.scale.x = tiledImage.getFlip() ? -1 : 1;

    updateOpacity(tiledImage._three.userData._tileContainer, tiledImage.opacity);

    if(requestRender){
        instance.renderFrame();
    }
}

function updateOpacity(meshGroup, opacity){
    meshGroup.children.forEach(mesh=>{
        mesh.material.opacity = opacity;
        if(opacity < 1 || mesh.material.userData.hasTransparency){
            mesh.material.transparent = true;
        } else {
            mesh.material.transparent = false;
        }
    })
}

function updateTiledImageRendering(tiledImage, tile, instance){
    updateMeshIfNeeded(tiledImage);

    let tileContainer = tiledImage._three.userData._tileContainer;
    let level = tileContainer.userData._tiledImageLevel;

    //whether the tile was just loaded or unloaded, update any tiles that it overlaps in the current tileGrid (as needed)
    let topLeft = tiledImage.source.getTileAtPoint(level, {x: tile.bounds.x, y: tile.bounds.y});
    let bottomRight = tiledImage.source.getTileAtPoint(level, {x: tile.bounds.x + tile.bounds.width, y: tile.bounds.y + tile.bounds.height});

    //iterate over the tiles overlapped by this one
    let x, y;
    for(x = topLeft.x; x<= bottomRight.x; x++){
        for(y = topLeft.y; y <= bottomRight.y; y++){
            let mesh = tileContainer.userData._tileMatrix[x][y];
            loadBestImage(mesh);
        }
    }

    instance.renderFrame();
}

function setItemOrder(event, instance){
    instance._imageContainer.children.forEach(child=>{
        child.position.z = DEPTH_MULTIPLIER * instance._viewer.world.getIndexOfItem(child._tiledImage);
    });
    instance.renderFrame();
}

function updateMeshIfNeeded(tiledImage){
    let tileContainer = tiledImage._three.userData._tileContainer;
    let levelsInterval = tiledImage._getLevelsInterval();
    let level = levelsInterval.highestLevel;

    if(tileContainer.userData._tiledImageLevel === level){
        //we are already drawing the highest-resolution tiles, just return
        return;
    }
    console.log('new level', level);
    tileContainer.userData._tiledImageLevel = level;
    //we need to update the grid.
    //clear the old matrix
    tileContainer.userData._tileMatrix = [];
    //remove existing tiles

    tileContainer.children.forEach(cleanupObject);
    tileContainer.clear();

    //create new set of tiles and add to the tileContainer
    let gridInfo = tiledImage.getGridDefinition(level);
    let col, row;
    for(col = 0; col < gridInfo.numColumns; col += 1){
        tileContainer.userData._tileMatrix[col] = [];
        for(row = 0; row < gridInfo.numRows; row += 1){
            let colInfo = gridInfo.columnInfo[col];
            let rowInfo = gridInfo.rowInfo[row];

            let left = colInfo.x;
            let top = rowInfo.y;
            let x = left + colInfo.width / 2;
            let y = top + rowInfo.height / 2;
            let z = 0;

            let tileGeometry = new THREE.PlaneGeometry(colInfo.width, rowInfo.height);
            let mesh = new THREE.Mesh(tileGeometry);


            mesh.position.set(x, y, z);

            mesh._tileInfo = {
                row: row,
                col: col,
                level: level,
                ...rowInfo,
                ...colInfo,
                tiledImage: tiledImage,
                center: new OpenSeadragon.Point(x, y),
                uvMapOriginal: [],
                // uvMap
            }

            let i;
            let uvAttribute = tileGeometry.attributes.uv;

            for(i =0 ; i<uvAttribute.count; ++i){
                let x = uvAttribute.getX(i);
                let y = uvAttribute.getY(i);
                mesh._tileInfo.uvMapOriginal[i] = [x, y];
            }

            tileContainer.add(mesh);

            tileContainer.userData._tileMatrix[col][row] = mesh;

            //get (current) best image data for the tile
            loadBestImage(mesh);
        }
    }

}

function loadBestImage(mesh){
    let tileInfo = mesh._tileInfo;
    let tiledImage = tileInfo.tiledImage;
    let tileSource = tiledImage.source;
    let tilesMatrix = tiledImage.tilesMatrix;

    //if we have our own texture, use it
    // let tile = tilesMatrix[tileInfo.level][tileInfo.col][tileInfo.row];
    let tile = hasMaterial(tilesMatrix, tileInfo.level, tileInfo.col, tileInfo.row);
    if(tile){
        addMaterialToMesh(mesh, tile, tiledImage);
    } else {
        //start at next highest level and work downward
        let queryLevel = tileInfo.level - 1;
        while(queryLevel >= 0){
            let tileIndex = tileSource.getTileAtPoint(queryLevel, tileInfo.center);
            let tile = hasMaterial(tilesMatrix, queryLevel, tileIndex.x, tileIndex.y);
            if(tile){
                addMaterialToMesh(mesh, tile, tiledImage);
                break;
            }
            queryLevel--;
        }
    }
}

function hasMaterial(tileMatrix, level, x, y){
    let tile = tileMatrix[level] && tileMatrix[level][x] && tileMatrix[level][x][y];
    return tile && tile._three ? tile : null;
}

function addMaterialToMesh(mesh, tile, tiledImage){
    let regionInfo = mesh._tileInfo;
    let material = tile._three;
    let materialBounds = material.userData._tileBounds;

    //update transparent and opacity properties to reflect current state
    let opacity = tiledImage.opacity;
    let transparent = opacity < 1 || material.userData.hasTransparency;
    material.transparent = transparent;
    material.opacity = opacity;

    mesh.material = material;
    let uvMap = mesh._tileInfo.uvMapOriginal;
    let uvAttribute = mesh.geometry.attributes.uv;

    // iterate over UV map for each vertex and calculate position within material/texture
    let xNew, yNew;
    let regionLeft = regionInfo.x;
    let regionTop = regionInfo.y;
    let regionRight = regionLeft + regionInfo.width;
    let regionBottom = regionTop + regionInfo.height;

    //what is needed to calculate the right uv index for each vertex?
    // 1) position of the vertex in normalized coordinates
    // 2) position of the entire texture area (not just non-overlapped area) in normalized coordinates

    uvMap.forEach(([x,y],i)=>{
        // x, y describe which corner of the original texture to use
        if(x==0){
            xNew = (regionLeft - materialBounds.x) / materialBounds.width;
        } else {
            xNew = (regionRight - materialBounds.x) / materialBounds.width;
        }

        if(y == 0){
            yNew = (regionTop - materialBounds.y) / materialBounds.height;
        } else {
            yNew = (regionBottom - materialBounds.y) / materialBounds.height;
        }

        uvAttribute.setXY(i, xNew, yNew);
    });
    uvAttribute.needsUpdate = true;

}




function cleanupObject(object){
    if(object.children && object.children.forEach){
        object.children.forEach(cleanupObject);
    }
    if(object.dispose){
        object.dispose();
    }
    if(object.geometry){
        object.geometry.dispose();
    }
}