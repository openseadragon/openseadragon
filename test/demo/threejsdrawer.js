// import 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.149.0/three.min.js';
import '../lib/three.js';
const THREE = window.THREE;

export class ThreeJSDrawer extends OpenSeadragon.DrawerBase{
    constructor(options){
        super(options);
        let _this = this;

        this._stats = options.stats; // optional input of stats.js object to enable performance testing

        // this.viewer set by parent constructor
        // this.canvas set by parent constructor, created and appended to the viewer container element
        this._camera = null;
        this._currentImages = [];
        this._renderer = null;

        this._tileMap = {};
        this._tiledImageMap = {};
        this._uuid = generateUUID(); // to use for reference mapping

        this._renderingContinously = false;
        this._animationFrame = null;

        this._outputCanvas = this.canvas; //output canvas
        this._outputContext = this._outputCanvas.getContext('2d');

        this._renderingCanvas = document.createElement('canvas');
        this._clippingCanvas = document.createElement('canvas');
        this._clippingContext = this._clippingCanvas.getContext('2d');
        this._renderingCanvas.width = this._clippingCanvas.width = this._outputCanvas.width;
        this._renderingCanvas.height = this._clippingCanvas.height = this._outputCanvas.height;

        //make the additional canvas elements mirror size changes to the output canvas
        this.viewer.addHandler("resize", function(){

            if(_this._outputCanvas !== _this.viewer.drawer.canvas){
                _this._outputCanvas.style.width = _this.viewer.drawer.canvas.clientWidth + 'px';
                _this._outputCanvas.style.height = _this.viewer.drawer.canvas.clientHeight + 'px';
            }

            let viewportSize = _this._calculateCanvasSize();
            if( _this._outputCanvas.width !== viewportSize.x ||
                _this._outputCanvas.height !== viewportSize.y ) {
                _this._outputCanvas.width = viewportSize.x;
                _this._outputCanvas.height = viewportSize.y;
                _this._renderer.setViewport(0, 0, _this._outputCanvas.width, _this._outputCanvas.height);
            }

            _this._renderingCanvas.style.width = _this._outputCanvas.clientWidth+'px';
            _this._renderingCanvas.style.height = _this._outputCanvas.clientHeight+'px';
            _this._renderingCanvas.width = _this._clippingCanvas.width = _this._outputCanvas.width;
            _this._renderingCanvas.height = _this._clippingCanvas.height = _this._outputCanvas.height;

            _this.render();
        })
        this._setupRenderer();
    }
    renderFrame(){
        // this._stats && this._stats.begin();
        if(this._animationFrame) {
            cancelAnimationFrame(this._animationFrame);
        }
        this._animationFrame = requestAnimationFrame(()=>this.render());
        // this._stats && this._stats.end();
    }
    render(){
        this._stats && this._stats.begin();

        let numItems = this.viewer.world.getItemCount();
        this._outputContext.clearRect(0, 0, this._outputCanvas.width, this._outputCanvas.height);
        //iterate over items to draw
        for(let i = 0; i < numItems; i++){
            let item = this.viewer.world.getItemAt(i);
            let scene = this._tiledImageMap[item[this._uuid]];

            if(item.wrapHorizontal || item.wrapVertical){
                createWrappingGrid(scene, item);
            } else {
                cleanupObject(scene.userData.wrappedCopies);
                scene.userData.wrappedCopies.clear();
            }
            this._renderer.render(scene, this._camera); //renders to this._renderingCanvas

            this._outputContext.save();
            // set composite operation; ignore for first image drawn
            this._outputContext.globalCompositeOperation = i===0 ? null : item.compositeOperation || this.viewer.compositeOperation;
            if(item._croppingPolygons || item._clip){
                this._renderToClippingCanvas(item);
                this._outputContext.drawImage(this._clippingCanvas, 0, 0);

            } else {
                this._outputContext.drawImage(this._renderingCanvas, 0, 0);
            }
            this._outputContext.restore();
            if(item.debugMode){
                this._drawDebugInfo(item)
            }
        }
        this._animationFrame = null;
        if(this._renderingContinuously){
            this.renderFrame();
        }

        this._stats && this._stats.end();
        // console.log(this._renderer.info.memory, this._renderer.info.render.triangles);
    }
    renderContinuously(continuously){
        if(continuously){
            this._renderingContinuously = true;

        } else {
            this._renderingContinuously = false;
        }
    }

    // Public API required by all Drawer implementations
    /**
     * Clean up the renderer, removing all resources
     */
    destroy(){
        // clear all resources used by the renderer, geometries, textures etc

        // to do: remove handlers from viewer

        // dispose of any remaining textures/materials
        Object.values(this._tileMap).forEach(material=>material.dispose());
        //to do: check whether tiled images are all removed (for clean up) before viewer destroy event

        // clean up renderer and camera objects
        cleanupObject(this._renderer);
        cleanupObject(this._camera);
        this._renderer = null;
        this._camera = null;

    }

    // Public API required by all Drawer implementations
    /**
     *
     * @returns true if the drawer supports rotation
     */
    canRotate(){
        return true;
    }

    // Public API required by all Drawer implementations
    /**
     *
     * @param {Array} tiledImages Array of TiledImage objects to draw
     */
    draw(tiledImages){
        if(this.viewer.drawer === this){
            // tiledImages.forEach(tiledImage => this.)
            this.drawScene();
        } else {
            // actual drawing is handled by event listeneners
            // just mark the tiledImages as having been drawn (happens below)

        }

        tiledImages.forEach(tiledImage => tiledImage._needsDraw = false);
    }

    // Public API required by all Drawer implementations
    /**
     * Set the context2d imageSmoothingEnabled parameter
     * @param {Boolean} enabled
     */
    setImageSmoothingEnabled(enabled){
        this._clippingContext.imageSmoothingEnabled = enabled;
        this._outputContext.imageSmoothingEnabled = enabled;
    }

    /**
     * Draw a rect onto the output canvas for debugging purposes
     * @param {OpenSeadragon.Rect} rect
     */
    drawDebuggingRect(rect){
        let context = this._outputContext;
        context.save();
        context.lineWidth = 2 * OpenSeadragon.pixelDensityRatio;
        context.strokeStyle = this.debugGridColor[0];
        context.fillStyle = this.debugGridColor[0];

        context.strokeRect(
            rect.x * OpenSeadragon.pixelDensityRatio,
            rect.y * OpenSeadragon.pixelDensityRatio,
            rect.width * OpenSeadragon.pixelDensityRatio,
            rect.height * OpenSeadragon.pixelDensityRatio
        );

        context.restore();
    }

    // Private methods

    _setupRenderer(){

        let viewerBounds = this.viewer.viewport.getBoundsNoRotate();
        this._camera = new THREE.OrthographicCamera(
            viewerBounds.width / -2,
            viewerBounds.width / 2,
            viewerBounds.height / 2,
            viewerBounds.height / -2,
            0,
            10000
        );
        this._camera.position.x = viewerBounds.x + viewerBounds.width/2;
        this._camera.position.y = -(viewerBounds.y + viewerBounds.height/2);
        this._camera.position.z = 100;
        this._camera.lookAt(this._camera.position.x, this._camera.position.y, 0);
        this._camera.updateProjectionMatrix();


        this._renderer = new THREE.WebGLRenderer({canvas: this._renderingCanvas, alpha:true});

        // Add listeners for events that require modifying the scene or camera
        this.viewer.addHandler("destroy", ()=>this.destroy());
        this.viewer.world.addHandler("add-item", ev => this._addTiledImage(ev));
        this.viewer.world.addHandler("remove-item", ev => this._removeTiledImage(ev));
        this.viewer.addHandler("tile-ready", ev => this._tileReadyHandler(ev));
        this.viewer.addHandler("tile-unloaded", ev => this._tileUnloadedHandler(ev));

        if(this.viewer.drawer && this.viewer.drawer !== this){
            // Add listeners to sync viewer, since this is not the main drawer
            this.viewer.addHandler("viewport-change", () => this.drawScene());
            this.viewer.addHandler("home", () => this.drawScene());
            this.viewer.addHandler("update-viewport", () => this.drawScene());
        }

        this.drawScene();
    }

    _addTiledImage(event){
        let tiledImage = event.item;

        // create a Group for the tiles of this tiled image.
        if(!tiledImage[this._uuid]){
            let tileContainer = new THREE.Group();
            let rotationAxis = new THREE.Group();
            let positioningGroup = new THREE.Group();

            rotationAxis.add(tileContainer);
            positioningGroup.add(rotationAxis);

            let wrappedCopies = new THREE.Group();
            rotationAxis.add(wrappedCopies);

            // save mutual references between OpenSceneGraph and ThreeJSRenderer versions of tiledImages
            // add unique ID to the tiledImage to look it up in our map in event handlers
            let scene = new THREE.Scene()
            let light = new THREE.AmbientLight();
            scene.add(light);
            scene.add(positioningGroup);
            scene.userData.tileContainer = tileContainer;
            scene.userData.wrappedCopies = wrappedCopies;

            let tiledImageID = generateUUID();
            tiledImage[this._uuid] = tiledImageID;
            this._tiledImageMap[tiledImageID] = scene;


            // keep a direct reference to the TiledImage on the Group
            positioningGroup._tiledImage = tiledImage;

            //offset the tileContainer so the center of the image is at the origin of the parent group
            tileContainer.position.x = -0.5;
            tileContainer.position.y = -0.5 / tiledImage.source.aspectRatio;

            //undo the offset of the tileContainer, moving this back into original viewport coordinate space
            rotationAxis.position.x = tileContainer.position.x * -1;
            rotationAxis.position.y = tileContainer.position.y * -1;


            this._updateTiledImageParameters(tiledImage, positioningGroup, rotationAxis);
            tiledImage.addHandler('bounds-change',()=>this._updateTiledImageParameters(tiledImage, positioningGroup, rotationAxis, true));
            tiledImage.addHandler('opacity-change',()=>this._updateTiledImageParameters(tiledImage, positioningGroup, rotationAxis, true));

        }
        this._updateMeshIfNeeded(tiledImage);
        this.renderFrame();
    }

    _removeTiledImage(event){
        let tiledImage = event.item;

        cleanupObject(this._tiledImageMap[tiledImage[this._uuid]]);
        delete this._tiledImageMap[tiledImage[this._uuid]];
        this.renderFrame();
    }

    _tileReadyHandler(event){
        let tile = event.tile;
        let tiledImage = event.tiledImage;

        if(this._tileMap[tile.cacheKey]){
            // this tile has already been handled; ignore repeat ready request (happens when image is wrapped)
            return;
        }

        //create a THREE.Material with the image data for this tile
        let texture = new THREE.CanvasTexture(event.tile.getCanvasContext().canvas);
        texture.flipY = false; // To match OSD reference frame
        let material = new THREE.MeshLambertMaterial({
            map: texture,
            transparent: !!tile.hasTransparency || tiledImage.opacity < 1,
            opacity: tiledImage.opacity
        });

        // cache the material using the tile's cacheKey so that when a tile is located by OpenSeadragon methods, the associate material can be retrieved
        this._tileMap[tile.cacheKey] = material;

        let numTiles = tiledImage.source.getNumTiles(tile.level);
        let tx = OpenSeadragon.positiveModulo(tile.x, numTiles.x);
        let ty = OpenSeadragon.positiveModulo(tile.y, numTiles.y);

        //cache the bounds for this material so it doesn't have to be recomputed every time it is used to update the scene
        material.userData._tileBounds = tiledImage.source.getTileBounds(tile.level, tx, ty);
        material.userData.hasTransparency = !!tile.hasTransparency;
        material.userData.tile = tile;
        material.userData.tiledImage = tiledImage;

        //since a new tile is available, update the image (if needed)
        this._updateTiledImageRendering(tiledImage, tile);
    }

    _tileUnloadedHandler(event){
        console.log('Tile unloaded',event);
        let tile = event.tile;
        if(!this._tileMap[tile.cacheKey]){
            //already cleaned up
            return;
        }
        cleanupObject(this._tileMap[tile.cacheKey], true);
        this._updateTiledImageRendering(event.tiledImage, tile);
        delete this._tileMap[tile.cacheKey];
    }

    _updateTiledImageParameters(tiledImage, positioningGroup, rotationAxis, requestRender){
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

        updateOpacity(this._tiledImageMap[tiledImage[this._uuid]].userData.tileContainer, tiledImage.opacity);

        if(requestRender){
            this.renderFrame();
        }

    }

    _updateTiledImageRendering(tiledImage, tile){

        // this._stats && this._stats.begin();

        let scene = this._tiledImageMap[tiledImage[this._uuid]];

        let bounds = this._tileMap[tile.cacheKey].userData._tileBounds

        if(bounds.x < 0 || bounds.y < 0 || bounds.x >= 1 || bounds.y >= 1){
            return;
        }

        this._updateMeshIfNeeded(tiledImage);

        let level = scene.userData.currentLevel;

        //whether the tile was just loaded or unloaded, update any tiles that it overlaps in the current tileGrid (as needed)

        let topLeft = tiledImage.source.getTileAtPoint(level, {x: bounds.x, y: bounds.y});
        let bottomRight = tiledImage.source.getTileAtPoint(level, {x: bounds.x + bounds.width, y: bounds.y + bounds.height});

        //iterate over the tiles overlapped by this one
        let x, y;
        for(x = topLeft.x; x<= bottomRight.x; x++){
            for(y = topLeft.y; y <= bottomRight.y; y++){
                let mesh = scene.userData._tileMatrix[x][y];
                this._loadBestImage(mesh);
            }
        }

        // this._stats && this._stats.end();

        this.renderFrame();
    }

    _updateMeshIfNeeded(tiledImage){
        let tileContainer = this._tiledImageMap[tiledImage[this._uuid]].userData.tileContainer;
        let scene = this._tiledImageMap[tiledImage[this._uuid]]
        // let levelsInterval = tiledImage._getLevelsInterval();
        // let level = levelsInterval.highestLevel;
        let level = Math.max(...tiledImage.getTilesToDraw().map(tile => tile.level));

        if(scene.userData.currentLevel === level){
            //we are already drawing the highest-resolution tiles, just return
            return;
        }
        // console.log('new level', level);
        scene.userData.currentLevel = level;
        //we need to update the grid.
        //clear the old matrix
        scene.userData._tileMatrix = [];
        scene.userData.tiledImage = tiledImage;
        //remove existing tiles

        tileContainer.children.forEach(cleanupObject);
        tileContainer.clear();

        //create new set of tiles and add to the tileContainer
        let gridInfo = tiledImage.getGridDefinition(level);
        let col, row;
        for(col = 0; col < gridInfo.numColumns; col += 1){
            scene.userData._tileMatrix[col] = [];
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

                mesh.userData._tileInfo = {
                    row: row,
                    col: col,
                    level: level,
                    ...rowInfo,
                    ...colInfo,
                    tiledImageID: tiledImage[this._uuid],
                    center: new OpenSeadragon.Point(x, y),
                    uvMapOriginal: [],
                    // uvMap
                }

                let i;
                let uvAttribute = tileGeometry.attributes.uv;

                for(i =0 ; i<uvAttribute.count; ++i){
                    let x = uvAttribute.getX(i);
                    let y = uvAttribute.getY(i);
                    mesh.userData._tileInfo.uvMapOriginal[i] = [x, y];
                }

                tileContainer.add(mesh);

                scene.userData._tileMatrix[col][row] = mesh;

                //get (current) best image data for the tile
                this._loadBestImage(mesh);
            }
        }
    }

    _loadBestImage(mesh){
        let tileInfo = mesh.userData._tileInfo;
        let tiledImage = this._tiledImageMap[tileInfo.tiledImageID].userData.tiledImage;
        let tileSource = tiledImage.source;
        let tilesMatrix = tiledImage.tilesMatrix;

        //if we have our own texture, use it
        // let tile = tilesMatrix[tileInfo.level][tileInfo.col][tileInfo.row];
        let tile = getTile(tilesMatrix, tileInfo.level, tileInfo.col, tileInfo.row);
        let material = tile && this._tileMap[tile.cacheKey];
        if(material){
            addMaterialToMesh(mesh, material, tiledImage.opacity);
        } else {
            //start at next highest level and work downward
            let queryLevel = tileInfo.level - 1;
            while(queryLevel >= 0){
                let tileIndex = tileSource.getTileAtPoint(queryLevel, tileInfo.center);
                let tile = getTile(tilesMatrix, queryLevel, tileIndex.x, tileIndex.y);
                let material = tile && this._tileMap[tile.cacheKey];
                if(material){
                    addMaterialToMesh(mesh, material, tiledImage.opacity);
                    break;
                }
                queryLevel--;
            }
        }
    }

    drawScene(){
        //this._stats && this._stats.begin();
        let viewer = this.viewer;

        let viewerBounds = viewer.viewport.getBoundsNoRotate(true);
        this._camera.left = viewerBounds.width / -2;
        this._camera.right = viewerBounds.width / 2;
        this._camera.top = viewerBounds.height / 2;
        this._camera.bottom = viewerBounds.height / -2;

        let center = viewer.viewport.getCenter(true);
        this._camera.position.x = center.x;
        this._camera.position.y = -center.y;
        this._camera.rotation.z = viewer.viewport.getRotation(true) * Math.PI / 180;

        this._camera.updateProjectionMatrix();

        let numItems = viewer.world.getItemCount();
        let i;
        for(i = 0; i < numItems; i++){
            let tiledImage = viewer.world.getItemAt(i);
            this._updateMeshIfNeeded(tiledImage);
        }
        this.render();
        // this.renderFrame(); //this._stats && this._stats.end();
    }

    _renderToClippingCanvas(item){
        let _this = this;

        this._clippingContext.clearRect(0, 0, this._clippingCanvas.width, this._clippingCanvas.height);
        this._clippingContext.save();

        if(item._clip){
            var box = item.imageToViewportRectangle(item._clip, true);
            var rect = this._viewportToDrawerRectangle(box);
            this._clippingContext.beginPath();
            this._clippingContext.rect(rect.x, rect.y, rect.width, rect.height);
            this._clippingContext.clip();
        }
        if(item._croppingPolygons){
            let polygons = item._croppingPolygons.map(function (polygon) {
                return polygon.map(function (coord) {
                    let point = item.imageToViewportCoordinates(coord.x, coord.y, true)
                        .rotate(_this.viewer.viewport.getRotation(true), _this.viewer.viewport.getCenter(true));
                    let clipPoint = _this._viewportCoordToDrawerCoord(point);
                    return clipPoint;
                });
            });
            this._clippingContext.beginPath();
            polygons.forEach(function (polygon) {
                polygon.forEach(function (coord, i) {
                    _this._clippingContext[i === 0 ? 'moveTo' : 'lineTo'](coord.x, coord.y);
                });
            });
            this._clippingContext.clip();
        }

        this._clippingContext.drawImage(this._renderingCanvas, 0, 0);

        this._clippingContext.restore();
    }

    // private
    _offsetForRotation(options) {
        var point = options.point ?
            options.point.times(OpenSeadragon.pixelDensityRatio) :
            new OpenSeadragon.Point(this._outputCanvas.width / 2, this._outputCanvas.height / 2);

        var context = this._outputContext;
        context.save();

        context.translate(point.x, point.y);
        if(this.viewport.flipped){
          context.rotate(Math.PI / 180 * -options.degrees);
          context.scale(-1, 1);
        } else{
          context.rotate(Math.PI / 180 * options.degrees);
        }
        context.translate(-point.x, -point.y);
    }
    // private
    _drawDebugInfoOnTile(tile, count, i, tiledImage) {

        var colorIndex = this.viewer.world.getIndexOfItem(tiledImage) % this.debugGridColor.length;
        var context = this._outputContext;
        context.save();
        context.lineWidth = 2 * OpenSeadragon.pixelDensityRatio;
        context.font = 'small-caps bold ' + (13 * OpenSeadragon.pixelDensityRatio) + 'px arial';
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
            tile.position.x * OpenSeadragon.pixelDensityRatio,
            tile.position.y * OpenSeadragon.pixelDensityRatio,
            tile.size.x * OpenSeadragon.pixelDensityRatio,
            tile.size.y * OpenSeadragon.pixelDensityRatio
        );

        var tileCenterX = (tile.position.x + (tile.size.x / 2)) * OpenSeadragon.pixelDensityRatio;
        var tileCenterY = (tile.position.y + (tile.size.y / 2)) * OpenSeadragon.pixelDensityRatio;

        // Rotate the text the right way around.
        context.translate( tileCenterX, tileCenterY );
        context.rotate( Math.PI / 180 * -this.viewport.getRotation(true) );
        context.translate( -tileCenterX, -tileCenterY );

        if( tile.x === 0 && tile.y === 0 ){
            context.fillText(
                "Zoom: " + this.viewport.getZoom(),
                tile.position.x * OpenSeadragon.pixelDensityRatio,
                (tile.position.y - 30) * OpenSeadragon.pixelDensityRatio
            );
            context.fillText(
                "Pan: " + this.viewport.getBounds().toString(),
                tile.position.x * OpenSeadragon.pixelDensityRatio,
                (tile.position.y - 20) * OpenSeadragon.pixelDensityRatio
            );
        }
        context.fillText(
            "Level: " + tile.level,
            (tile.position.x + 10) * OpenSeadragon.pixelDensityRatio,
            (tile.position.y + 20) * OpenSeadragon.pixelDensityRatio
        );
        context.fillText(
            "Column: " + tile.x,
            (tile.position.x + 10) * OpenSeadragon.pixelDensityRatio,
            (tile.position.y + 30) * OpenSeadragon.pixelDensityRatio
        );
        context.fillText(
            "Row: " + tile.y,
            (tile.position.x + 10) * OpenSeadragon.pixelDensityRatio,
            (tile.position.y + 40) * OpenSeadragon.pixelDensityRatio
        );
        context.fillText(
            "Order: " + i + " of " + count,
            (tile.position.x + 10) * OpenSeadragon.pixelDensityRatio,
            (tile.position.y + 50) * OpenSeadragon.pixelDensityRatio
        );
        context.fillText(
            "Size: " + tile.size.toString(),
            (tile.position.x + 10) * OpenSeadragon.pixelDensityRatio,
            (tile.position.y + 60) * OpenSeadragon.pixelDensityRatio
        );
        context.fillText(
            "Position: " + tile.position.toString(),
            (tile.position.x + 10) * OpenSeadragon.pixelDensityRatio,
            (tile.position.y + 70) * OpenSeadragon.pixelDensityRatio
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
    _drawDebugInfo( tiledImage ) {
        let scene = this._tiledImageMap[tiledImage[this._uuid]];
        let level = scene.userData.currentLevel;
        let tiles = tiledImage.getTilesToDraw().filter(tile=>tile.level === level);

        // only draw on the highest level tiles
        for ( var i = tiles.length - 1; i >= 0; i-- ) {
            var tile = tiles[ i ].tile;
            try {
                this._drawDebugInfoOnTile(tile, tiles.length, i, tiledImage);
            } catch(e) {
                OpenSeadragon.console.error(e);
            }
        }
    }


    // private
    _restoreRotationChanges() {
        var context = this._outputContext;
        context.restore();
    }

}

// Functions below do not depend on an instance of the Drawer, and can be defined outside of the class definition

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

function getTile(tileMatrix, level, x, y){
    return tileMatrix[level] && tileMatrix[level][x] && tileMatrix[level][x][y];
}

function addMaterialToMesh(mesh, material, opacity){
    let regionInfo = mesh.userData._tileInfo;
    let materialBounds = material.userData._tileBounds;

    //update transparent and opacity properties to reflect current state
    let transparent = opacity < 1 || material.userData.hasTransparency;
    material.transparent = transparent;
    material.opacity = opacity;

    mesh.material = material;
    let uvMap = mesh.userData._tileInfo.uvMapOriginal;
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

function createWrappingGrid(scene, tiledImage){

    // TO DO: This is a problematic approach and needs to be debugged/reworked.
    //        Tiles of wrapped images are the wrong resolution because higher-res
    //        images only get loaded into the main panel, and cloning the entire
    //        image every frame is too expensive

    //calculate how to tile the space

    let tiledImageBounds = tiledImage.getBoundsNoRotate();
    let imgBounds = {x: 0, y: 0, width: tiledImageBounds.width, height: tiledImageBounds.height };
    let drawArea = tiledImage.viewer.viewport.getBounds(true);
    let center = drawArea.getCenter();
    let halfDiag = Math.sqrt(drawArea.width * drawArea.width + drawArea.height * drawArea.height);
    let left = center.x - halfDiag;
    let right = center.x + halfDiag;
    let top = center.y - halfDiag;
    let bottom = center.y + halfDiag;

    let xMin = tiledImage.wrapHorizontal ? Math.floor(left / imgBounds.width) : imgBounds.x;
    let yMin = tiledImage.wrapVertical ? Math.floor(top / imgBounds.height) : imgBounds.y;
    let xMax = tiledImage.wrapHorizontal ? Math.floor(right / imgBounds.width) : imgBounds.x;
    let yMax = tiledImage.wrapVertical ? Math.floor(bottom / imgBounds.height) : imgBounds.y;

    let container = scene.userData.wrappedCopies;
    if( container.userData.xMin !== xMin ||
        container.userData.xMax !== xMax ||
        container.userData.yMin !== yMin ||
        container.userData.yMax !== yMax
        ){

            // container.clear();
        cleanupObject(container);
        container.clear();


        for(let x = xMin; x <= xMax; x += 1){
            for(let y = yMin; y <= yMax; y += 1){
                if(x == 0 && y == 0) {
                    continue;
                }
                let clone = scene.userData.tileContainer.clone();
                clone.position.x += x * imgBounds.width;
                clone.position.y += y * imgBounds.height;
                container.add(clone);
            }
        }
    }

}


function cleanupObject(object, cleanupTextures){
    if(object.children && object.children.forEach){
        object.children.forEach(cleanupObject, cleanupTextures);
    }
    if(object.dispose){
        object.dispose();
    }
    if(object.geometry){
        object.geometry.dispose();
    }
    if(object.map && cleanupTextures){
        object.map.dispose();
    }
}

// http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136
const _lut = [ '00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '0a', '0b', '0c', '0d', '0e', '0f', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '1a', '1b', '1c', '1d', '1e', '1f', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '2a', '2b', '2c', '2d', '2e', '2f', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '3a', '3b', '3c', '3d', '3e', '3f', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '4a', '4b', '4c', '4d', '4e', '4f', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '5a', '5b', '5c', '5d', '5e', '5f', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '6a', '6b', '6c', '6d', '6e', '6f', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '7a', '7b', '7c', '7d', '7e', '7f', '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '8a', '8b', '8c', '8d', '8e', '8f', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99', '9a', '9b', '9c', '9d', '9e', '9f', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'aa', 'ab', 'ac', 'ad', 'ae', 'af', 'b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'ba', 'bb', 'bc', 'bd', 'be', 'bf', 'c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'ca', 'cb', 'cc', 'cd', 'ce', 'cf', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'da', 'db', 'dc', 'dd', 'de', 'df', 'e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'ea', 'eb', 'ec', 'ed', 'ee', 'ef', 'f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'fa', 'fb', 'fc', 'fd', 'fe', 'ff' ];
function generateUUID() {

    const d0 = Math.random() * 0xffffffff | 0;
    const d1 = Math.random() * 0xffffffff | 0;
    const d2 = Math.random() * 0xffffffff | 0;
    const d3 = Math.random() * 0xffffffff | 0;
    const uuid = _lut[ d0 & 0xff ] + _lut[ d0 >> 8 & 0xff ] + _lut[ d0 >> 16 & 0xff ] + _lut[ d0 >> 24 & 0xff ] + '-' +
            _lut[ d1 & 0xff ] + _lut[ d1 >> 8 & 0xff ] + '-' + _lut[ d1 >> 16 & 0x0f | 0x40 ] + _lut[ d1 >> 24 & 0xff ] + '-' +
            _lut[ d2 & 0x3f | 0x80 ] + _lut[ d2 >> 8 & 0xff ] + '-' + _lut[ d2 >> 16 & 0xff ] + _lut[ d2 >> 24 & 0xff ] +
            _lut[ d3 & 0xff ] + _lut[ d3 >> 8 & 0xff ] + _lut[ d3 >> 16 & 0xff ] + _lut[ d3 >> 24 & 0xff ];

    // .toLowerCase() here flattens concatenated strings to save heap memory space.
    return uuid.toLowerCase();

}