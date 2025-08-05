/*
 * OpenSeadragon
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2025 OpenSeadragon contributors
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * - Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 *
 * - Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 *
 * - Neither the name of CodePlex Foundation nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/*
 * Portions of this source file taken from jQuery:
 *
 * Copyright 2011 John Resig
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/*
 * Portions of this source file taken from mattsnider.com:
 *
 * Copyright (c) 2006-2013 Matt Snider
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT
 * OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR
 * THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


/**
 * @namespace OpenSeadragon
 * @version <%= pkg.name %> <%= pkg.version %>
 * @classdesc The root namespace for OpenSeadragon.  All utility methods
 * and classes are defined on or below this namespace.
 *
 */


// Typedefs

 /**
  * All required and optional settings for instantiating a new instance of an OpenSeadragon image viewer.
  *
  * @typedef {Object} Options
  * @memberof OpenSeadragon
  *
  * @property {String} id
  *     Id of the element to append the viewer's container element to. If not provided, the 'element' property must be provided.
  *     If both the element and id properties are specified, the viewer is appended to the element provided in the element property.
  *
  * @property {Element} element
  *     The element to append the viewer's container element to. If not provided, the 'id' property must be provided.
  *     If both the element and id properties are specified, the viewer is appended to the element provided in the element property.
  *
  * @property {Array|String|Function|Object} [tileSources=null]
  *     Tile source(s) to open initially. This is a complex parameter; see
  *     {@link OpenSeadragon.Viewer#open} for details.
  *
  * @property {Number} [tabIndex=0]
  *     Tabbing order index to assign to the viewer element. Positive values are selected in increasing order. When tabIndex is 0
  *     source order is used. A negative value omits the viewer from the tabbing order.
  *
  * @property {Array} overlays Array of objects defining permanent overlays of
  *     the viewer. The overlays added via this option and later removed with
  *     {@link OpenSeadragon.Viewer#removeOverlay} will be added back when a new
  *     image is opened.
  *     To add overlays which can be definitively removed, one must use
  *     {@link OpenSeadragon.Viewer#addOverlay}
  *     If displaying a sequence of images, the overlays can be associated
  *     with a specific page by passing the overlays array to the page's
  *     tile source configuration.
  *     Expected properties:
  *     * x, y, (or px, py for pixel coordinates) to define the location.
  *     * width, height in point if using x,y or in pixels if using px,py. If width
  *       and height are specified, the overlay size is adjusted when zooming,
  *       otherwise the size stays the size of the content (or the size defined by CSS).
  *     * className to associate a class to the overlay
  *     * id to set the overlay element. If an element with this id already exists,
  *       it is reused, otherwise it is created. If not specified, a new element is
  *       created.
  *     * placement a string to define the relative position to the viewport.
  *       Only used if no width and height are specified. Default: 'TOP_LEFT'.
  *       See {@link OpenSeadragon.Placement} for possible values.
  *
  * @property {String} [xmlPath=null]
  *     <strong>DEPRECATED</strong>. A relative path to load a DZI file from the server.
  *     Prefer the newer Options.tileSources.
  *
  * @property {String} [prefixUrl='/images/']
  *     Prepends the prefixUrl to navImages paths, which is very useful
  *     since the default paths are rarely useful for production
  *     environments.
  *
  * @property {OpenSeadragon.NavImages} [navImages]
  *     An object with a property for each button or other built-in navigation
  *     control, eg the current 'zoomIn', 'zoomOut', 'home', and 'fullpage'.
  *     Each of those in turn provides an image path for each state of the button
  *     or navigation control, eg 'REST', 'GROUP', 'HOVER', 'PRESS'. Finally the
  *     image paths, by default assume there is a folder on the servers root path
  *     called '/images', eg '/images/zoomin_rest.png'.  If you need to adjust
  *     these paths, prefer setting the option.prefixUrl rather than overriding
  *     every image path directly through this setting.
  *
  * @property {Boolean} [debugMode=false]
  *     TODO: provide an in-screen panel providing event detail feedback.
  *
  * @property {String} [debugGridColor=['#437AB2', '#1B9E77', '#D95F02', '#7570B3', '#E7298A', '#66A61E', '#E6AB02', '#A6761D', '#666666']]
  *     The colors of grids in debug mode. Each tiled image's grid uses a consecutive color.
  *     If there are more tiled images than provided colors, the color vector is recycled.
  *
  * @property {Boolean} [silenceMultiImageWarnings=false]
  *     Silences warnings when calling viewport coordinate functions with multi-image.
  *     Useful when you're overlaying multiple images on top of one another.
  *
  * @property {Number} [blendTime=0]
  *     Specifies the duration of animation as higher or lower level tiles are
  *     replacing the existing tile.
  *
  * @property {Boolean} [alwaysBlend=false]
  *     Forces the tile to always blend.  By default the tiles skip blending
  *     when the blendTime is surpassed and the current animation frame would
  *     not complete the blend.
  *
  * @property {Boolean} [autoHideControls=true]
  *     If the user stops interacting with the viewport, fade the navigation
  *     controls.  Useful for presentation since the controls are by default
  *     floated on top of the image the user is viewing.
  *
  * @property {Boolean} [immediateRender=false]
  *     Render the best closest level first, ignoring the lowering levels which
  *     provide the effect of very blurry to sharp. It is recommended to change
  *     setting to true for mobile devices.
  *
  * @property {Number} [defaultZoomLevel=0]
  *     Zoom level to use when image is first opened or the home button is clicked.
  *     If 0, adjusts to fit viewer.
  *
  * @property {String|DrawerImplementation|Array} [drawer = ['webgl', 'canvas', 'html']]
  *     Which drawer to use. Valid strings are 'webgl', 'canvas', and 'html'. Valid drawer
  *     implementations are constructors of classes that extend OpenSeadragon.DrawerBase.
  *     An array of strings and/or constructors can be used to indicate the priority
  *     of different implementations, which will be tried in order based on browser support.
  *
  * @property {Object} drawerOptions
  *     Options to pass to the selected drawer implementation. For details
  *     please see {@link OpenSeadragon.DrawerOptions}.
  *
  * @property {Number} [opacity=1]
  *     Default proportional opacity of the tiled images (1=opaque, 0=hidden)
  *     Hidden images do not draw and only load when preloading is allowed.
  *
  * @property {Boolean} [preload=false]
  *     Default switch for loading hidden images (true loads, false blocks)
  *
  * @property {String} [compositeOperation=null]
  *     Valid values are 'source-over', 'source-atop', 'source-in', 'source-out',
  *     'destination-over', 'destination-atop', 'destination-in', 'destination-out',
  *     'lighter', 'difference', 'copy', 'xor', etc.
  *     For complete list of modes, please @see {@link https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation/ globalCompositeOperation}
  *
  * @property {Boolean} [imageSmoothingEnabled=true]
  *     Image smoothing for rendering (only if the canvas or webgl drawer is used). Note: Ignored
  *     by some (especially older) browsers which do not support this canvas property.
  *     This property can be changed in {@link Viewer.DrawerBase.setImageSmoothingEnabled}.
  *
  * @property {String|CanvasGradient|CanvasPattern|Function} [placeholderFillStyle=null]
  *     Draws a colored rectangle behind the tile if it is not loaded yet.
  *     You can pass a CSS color value like "#FF8800".
  *     When passing a function the tiledImage and canvas context are available as argument which is useful when you draw a gradient or pattern.
  *
  * @property {Object} [subPixelRoundingForTransparency=null]
  *     Determines when subpixel rounding should be applied for tiles when rendering images that support transparency.
  *     This property is a subpixel rounding enum values dictionary [{@link BROWSERS}] --> {@link SUBPIXEL_ROUNDING_OCCURRENCES}.
  *     The key is a {@link BROWSERS} value, and the value is one of {@link SUBPIXEL_ROUNDING_OCCURRENCES},
  *     indicating, for a given browser, when to apply subpixel rounding.
  *     Key '*' is the fallback value for any browser not specified in the dictionary.
  *     This property has a simple mode, and one can set it directly to
  *     {@link SUBPIXEL_ROUNDING_OCCURRENCES.NEVER}, {@link SUBPIXEL_ROUNDING_OCCURRENCES.ONLY_AT_REST} or {@link SUBPIXEL_ROUNDING_OCCURRENCES.ALWAYS}
  *     in order to apply this rule for all browser. The values {@link SUBPIXEL_ROUNDING_OCCURRENCES.ALWAYS} would be equivalent to { '*', SUBPIXEL_ROUNDING_OCCURRENCES.ALWAYS }.
  *     The default is {@link SUBPIXEL_ROUNDING_OCCURRENCES.NEVER} for all browsers, for backward compatibility reason.
  *
  * @property {Number} [degrees=0]
  *     Initial rotation.
  *
  * @property {Boolean} [flipped=false]
  *     Initial flip state.
  *
  * @property {Boolean} [overlayPreserveContentDirection=true]
  *     When the viewport is flipped (by pressing 'f'), the overlay is flipped using ScaleX.
  *     Normally, this setting (default true) keeps the overlay's content readable by flipping it back.
  *     To make the content flip with the overlay, set overlayPreserveContentDirection to false.
  *
  * @property {Number} [minZoomLevel=null]
  *
  * @property {Number} [maxZoomLevel=null]
  *
  * @property {Boolean} [homeFillsViewer=false]
  *     Make the 'home' button fill the viewer and clip the image, instead
  *     of fitting the image to the viewer and letterboxing.
  *
  * @property {Boolean} [panHorizontal=true]
  *     Allow horizontal pan.
  *
  * @property {Boolean} [panVertical=true]
  *     Allow vertical pan.
  *
  * @property {Boolean} [constrainDuringPan=false]
  *
  * @property {Boolean} [wrapHorizontal=false]
  *     Set to true to force the image to wrap horizontally within the viewport.
  *     Useful for maps or images representing the surface of a sphere or cylinder.
  *
  * @property {Boolean} [wrapVertical=false]
  *     Set to true to force the image to wrap vertically within the viewport.
  *     Useful for maps or images representing the surface of a sphere or cylinder.
  *
  * @property {Number} [minZoomImageRatio=0.9]
  *     The minimum percentage ( expressed as a number between 0 and 1 ) of
  *     the viewport height or width at which the zoom out will be constrained.
  *     Setting it to 0, for example will allow you to zoom out infinity.
  *
  * @property {Number} [maxZoomPixelRatio=1.1]
  *     The maximum ratio to allow a zoom-in to affect the highest level pixel
  *     ratio. This can be set to Infinity to allow 'infinite' zooming into the
  *     image though it is less effective visually if the HTML5 Canvas is not
  *     available on the viewing device.
  *
  * @property {Number} [smoothTileEdgesMinZoom=1.1]
  *     A zoom percentage ( where 1 is 100% ) of the highest resolution level.
  *     When zoomed in beyond this value alternative compositing will be used to
  *     smooth out the edges between tiles. This will have a performance impact.
  *     Can be set to Infinity to turn it off.
  *     Note: This setting is ignored on iOS devices due to a known bug (See {@link https://github.com/openseadragon/openseadragon/issues/952})
  *
  * @property {Boolean} [iOSDevice=?]
  *     True if running on an iOS device, false otherwise.
  *     Used to disable certain features that behave differently on iOS devices.
  *
  * @property {Boolean} [autoResize=true]
  *     Set to false to prevent polling for viewer size changes. Useful for providing custom resize behavior.
  *
  * @property {Boolean} [preserveImageSizeOnResize=false]
  *     Set to true to have the image size preserved when the viewer is resized. This requires autoResize=true (default).
  *
  * @property {Number} [minScrollDeltaTime=50]
  *     Number of milliseconds between canvas-scroll events. This value helps normalize the rate of canvas-scroll
  *     events between different devices, causing the faster devices to slow down enough to make the zoom control
  *     more manageable.
  *
  * @property {Number} [rotationIncrement=90]
  *     The number of degrees to rotate right or left when the rotate buttons or keyboard shortcuts are activated.
  *
  * @property {Number} [maxTilesPerFrame=1]
  *     The number of tiles loaded per frame. As the frame rate of the client's machine is usually high (e.g., 50 fps),
  *     one tile per frame should be a good choice. However, for large screens or lower frame rates, the number of
  *     loaded tiles per frame can be adjusted here. Reasonable values might be 2 or 3 tiles per frame.
  *     (Note that the actual frame rate is given by the client's browser and machine).
  *
  * @property {Number} [pixelsPerWheelLine=40]
  *     For pixel-resolution scrolling devices, the number of pixels equal to one scroll line.
  *
  * @property {Number} [pixelsPerArrowPress=40]
  *     The number of pixels viewport moves when an arrow key is pressed.
  *
  * @property {Number} [visibilityRatio=0.5]
  *     The percentage ( as a number from 0 to 1 ) of the source image which
  *     must be kept within the viewport.  If the image is dragged beyond that
  *     limit, it will 'bounce' back until the minimum visibility ratio is
  *     achieved.  Setting this to 0 and wrapHorizontal ( or wrapVertical ) to
  *     true will provide the effect of an infinitely scrolling viewport.
  *
  * @property {Object} [viewportMargins={}]
  *     Pushes the "home" region in from the sides by the specified amounts.
  *     Possible subproperties (Numbers, in screen coordinates): left, top, right, bottom.
  *
  * @property {Number} [imageLoaderLimit=0]
  *     The maximum number of image requests to make concurrently. By default
  *     it is set to 0 allowing the browser to make the maximum number of
  *     image requests in parallel as allowed by the browsers policy.
  *
  * @property {Number} [clickTimeThreshold=300]
  *      The number of milliseconds within which a pointer down-up event combination
  *      will be treated as a click gesture.
  *
  * @property {Number} [clickDistThreshold=5]
  *      The maximum distance allowed between a pointer down event and a pointer up event
  *      to be treated as a click gesture.
  *
  * @property {Number} [dblClickTimeThreshold=300]
  *      The number of milliseconds within which two pointer down-up event combinations
  *      will be treated as a double-click gesture.
  *
  * @property {Number} [dblClickDistThreshold=20]
  *      The maximum distance allowed between two pointer click events
  *      to be treated as a double-click gesture.
  *
  * @property {Number} [springStiffness=6.5]
  *
  * @property {Number} [animationTime=1.2]
  *     Specifies the animation duration per each {@link OpenSeadragon.Spring}
  *     which occur when the image is dragged, zoomed or rotated.
  *
  * @property {Boolean} [loadDestinationTilesOnAnimation=true]
  *    If true, tiles are loaded only at the destination of an animation.
  *    If false, tiles are loaded along the animation path during the animation.
  * @property {OpenSeadragon.GestureSettings} [gestureSettingsMouse]
  *     Settings for gestures generated by a mouse pointer device. (See {@link OpenSeadragon.GestureSettings})
  * @property {Boolean} [gestureSettingsMouse.dragToPan=true] - Pan on drag gesture
  * @property {Boolean} [gestureSettingsMouse.scrollToZoom=true] - Zoom on scroll gesture
  * @property {Boolean} [gestureSettingsMouse.clickToZoom=true] - Zoom on click gesture
  * @property {Boolean} [gestureSettingsMouse.dblClickToZoom=false] - Zoom on double-click gesture. Note: If set to true
  *     then clickToZoom should be set to false to prevent multiple zooms.
  * @property {Boolean} [gestureSettingsMouse.dblClickDragToZoom=false] - Zoom on dragging through
  * double-click gesture ( single click and next click to drag).  Note: If set to true
  *     then clickToZoom should be set to false to prevent multiple zooms.
  * @property {Boolean} [gestureSettingsMouse.pinchToZoom=false] - Zoom on pinch gesture
  * @property {Boolean} [gestureSettingsMouse.zoomToRefPoint=true] - If zoomToRefPoint is true, the zoom is centered at the pointer position. Otherwise,
  *     the zoom is centered at the canvas center.
  * @property {Boolean} [gestureSettingsMouse.flickEnabled=false] - Enable flick gesture
  * @property {Number} [gestureSettingsMouse.flickMinSpeed=120] - If flickEnabled is true, the minimum speed to initiate a flick gesture (pixels-per-second)
  * @property {Number} [gestureSettingsMouse.flickMomentum=0.25] - If flickEnabled is true, the momentum factor for the flick gesture
  * @property {Boolean} [gestureSettingsMouse.pinchRotate=false] - If pinchRotate is true, the user will have the ability to rotate the image using their fingers.
  *
  * @property {OpenSeadragon.GestureSettings} [gestureSettingsTouch]
  *     Settings for gestures generated by a touch pointer device. (See {@link OpenSeadragon.GestureSettings})
  * @property {Boolean} [gestureSettingsTouch.dragToPan=true] - Pan on drag gesture
  * @property {Boolean} [gestureSettingsTouch.scrollToZoom=false] - Zoom on scroll gesture
  * @property {Boolean} [gestureSettingsTouch.clickToZoom=false] - Zoom on click gesture
  * @property {Boolean} [gestureSettingsTouch.dblClickToZoom=true] - Zoom on double-click gesture. Note: If set to true
  *     then clickToZoom should be set to false to prevent multiple zooms.
    * @property {Boolean} [gestureSettingsTouch.dblClickDragToZoom=true] - Zoom on dragging through
  * double-click gesture ( single click and next click to drag).  Note: If set to true
  *     then clickToZoom should be set to false to prevent multiple zooms.

  * @property {Boolean} [gestureSettingsTouch.pinchToZoom=true] - Zoom on pinch gesture
  * @property {Boolean} [gestureSettingsTouch.zoomToRefPoint=true] - If zoomToRefPoint is true, the zoom is centered at the pointer position. Otherwise,
  *     the zoom is centered at the canvas center.
  * @property {Boolean} [gestureSettingsTouch.flickEnabled=true] - Enable flick gesture
  * @property {Number} [gestureSettingsTouch.flickMinSpeed=120] - If flickEnabled is true, the minimum speed to initiate a flick gesture (pixels-per-second)
  * @property {Number} [gestureSettingsTouch.flickMomentum=0.25] - If flickEnabled is true, the momentum factor for the flick gesture
  * @property {Boolean} [gestureSettingsTouch.pinchRotate=false] - If pinchRotate is true, the user will have the ability to rotate the image using their fingers.
  *
  * @property {OpenSeadragon.GestureSettings} [gestureSettingsPen]
  *     Settings for gestures generated by a pen pointer device. (See {@link OpenSeadragon.GestureSettings})
  * @property {Boolean} [gestureSettingsPen.dragToPan=true] - Pan on drag gesture
  * @property {Boolean} [gestureSettingsPen.scrollToZoom=false] - Zoom on scroll gesture
  * @property {Boolean} [gestureSettingsPen.clickToZoom=true] - Zoom on click gesture
  * @property {Boolean} [gestureSettingsPen.dblClickToZoom=false] - Zoom on double-click gesture. Note: If set to true
  *     then clickToZoom should be set to false to prevent multiple zooms.
  * @property {Boolean} [gestureSettingsPen.pinchToZoom=false] - Zoom on pinch gesture
  * @property {Boolean} [gestureSettingsPen.zoomToRefPoint=true] - If zoomToRefPoint is true, the zoom is centered at the pointer position. Otherwise,
  *     the zoom is centered at the canvas center.
  * @property {Boolean} [gestureSettingsPen.flickEnabled=false] - Enable flick gesture
  * @property {Number} [gestureSettingsPen.flickMinSpeed=120] - If flickEnabled is true, the minimum speed to initiate a flick gesture (pixels-per-second)
  * @property {Number} [gestureSettingsPen.flickMomentum=0.25] - If flickEnabled is true, the momentum factor for the flick gesture
  * @property {Boolean} [gestureSettingsPen.pinchRotate=false] - If pinchRotate is true, the user will have the ability to rotate the image using their fingers.
  *
  * @property {OpenSeadragon.GestureSettings} [gestureSettingsUnknown]
  *     Settings for gestures generated by unknown pointer devices. (See {@link OpenSeadragon.GestureSettings})
  * @property {Boolean} [gestureSettingsUnknown.dragToPan=true] - Pan on drag gesture
  * @property {Boolean} [gestureSettingsUnknown.scrollToZoom=true] - Zoom on scroll gesture
  * @property {Boolean} [gestureSettingsUnknown.clickToZoom=false] - Zoom on click gesture
  * @property {Boolean} [gestureSettingsUnknown.dblClickToZoom=true] - Zoom on double-click gesture. Note: If set to true
  *     then clickToZoom should be set to false to prevent multiple zooms.
  * @property {Boolean} [gestureSettingsUnknown.dblClickDragToZoom=false] - Zoom on dragging through
  * double-click gesture ( single click and next click to drag).  Note: If set to true
  *     then clickToZoom should be set to false to prevent multiple zooms.
  * @property {Boolean} [gestureSettingsUnknown.pinchToZoom=true] - Zoom on pinch gesture
  * @property {Boolean} [gestureSettingsUnknown.zoomToRefPoint=true] - If zoomToRefPoint is true, the zoom is centered at the pointer position. Otherwise,
  *     the zoom is centered at the canvas center.
  * @property {Boolean} [gestureSettingsUnknown.flickEnabled=true] - Enable flick gesture
  * @property {Number} [gestureSettingsUnknown.flickMinSpeed=120] - If flickEnabled is true, the minimum speed to initiate a flick gesture (pixels-per-second)
  * @property {Number} [gestureSettingsUnknown.flickMomentum=0.25] - If flickEnabled is true, the momentum factor for the flick gesture
  * @property {Boolean} [gestureSettingsUnknown.pinchRotate=false] - If pinchRotate is true, the user will have the ability to rotate the image using their fingers.
  *
  * @property {Number} [zoomPerClick=2.0]
  *     The "zoom distance" per mouse click or touch tap. <em><strong>Note:</strong> Setting this to 1.0 effectively disables the click-to-zoom feature (also see gestureSettings[Mouse|Touch|Pen].clickToZoom/dblClickToZoom).</em>
  *
  * @property {Number} [zoomPerScroll=1.2]
  *     The "zoom distance" per mouse scroll or touch pinch. <em><strong>Note:</strong> Setting this to 1.0 effectively disables the mouse-wheel zoom feature (also see gestureSettings[Mouse|Touch|Pen].scrollToZoom}).</em>
  *
  * @property {Number} [zoomPerDblClickDrag=1.2]
  *     The "zoom distance" per double-click mouse drag. <em><strong>Note:</strong> Setting this to 1.0 effectively disables the double-click-drag-to-Zoom feature (also see gestureSettings[Mouse|Touch|Pen].dblClickDragToZoom).</em>
  *
  * @property {Number} [zoomPerSecond=1.0]
  *     Sets the zoom amount per second when zoomIn/zoomOut buttons are pressed and held.
  *     The value is a factor of the current zoom, so 1.0 (the default) disables zooming when the zoomIn/zoomOut buttons
  *     are held. Higher values will increase the rate of zoom when the zoomIn/zoomOut buttons are held. Note that values
  *     < 1.0 will reverse the operation of the zoomIn/zoomOut buttons (zoomIn button will decrease the zoom, zoomOut will
  *     increase the zoom).
  *
  * @property {Boolean} [showNavigator=false]
  *     Set to true to make the navigator minimap appear.
  *
  * @property {Element} [navigatorElement=null]
  *     The element to hold the navigator minimap.
  *     If an element is specified, the Id option (see navigatorId) is ignored.
  *     If no element nor ID is specified, a div element will be generated accordingly.
  *
  * @property {String} [navigatorId=navigator-GENERATED DATE]
  *     The ID of a div to hold the navigator minimap.
  *     If an ID is specified, the navigatorPosition, navigatorSizeRatio, navigatorMaintainSizeRatio, navigator[Top|Left|Height|Width] and navigatorAutoFade options will be ignored.
  *     If an ID is not specified, a div element will be generated and placed on top of the main image.
  *
  * @property {String} [navigatorPosition='TOP_RIGHT']
  *     Valid values are 'TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_RIGHT', or 'ABSOLUTE'.<br>
  *     If 'ABSOLUTE' is specified, then navigator[Top|Left|Height|Width] determines the size and position of the navigator minimap in the viewer, and navigatorSizeRatio and navigatorMaintainSizeRatio are ignored.<br>
  *     For 'TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', and 'BOTTOM_RIGHT', the navigatorSizeRatio or navigator[Height|Width] values determine the size of the navigator minimap.
  *
  * @property {Number} [navigatorSizeRatio=0.2]
  *     Ratio of navigator size to viewer size. Ignored if navigator[Height|Width] are specified.
  *
  * @property {Boolean} [navigatorMaintainSizeRatio=false]
  *     If true, the navigator minimap is resized (using navigatorSizeRatio) when the viewer size changes.
  *
  * @property {Number|String} [navigatorTop=null]
  *     Specifies the location of the navigator minimap (see navigatorPosition).
  *
  * @property {Number|String} [navigatorLeft=null]
  *     Specifies the location of the navigator minimap (see navigatorPosition).
  *
  * @property {Number|String} [navigatorHeight=null]
  *     Specifies the size of the navigator minimap (see navigatorPosition).
  *     If specified, navigatorSizeRatio and navigatorMaintainSizeRatio are ignored.
  *
  * @property {Number|String} [navigatorWidth=null]
  *     Specifies the size of the navigator minimap (see navigatorPosition).
  *     If specified, navigatorSizeRatio and navigatorMaintainSizeRatio are ignored.
  *
  * @property {Boolean} [navigatorAutoResize=true]
  *     Set to false to prevent polling for navigator size changes. Useful for providing custom resize behavior.
  *     Setting to false can also improve performance when the navigator is configured to a fixed size.
  *
  * @property {Boolean} [navigatorAutoFade=true]
  *     If the user stops interacting with the viewport, fade the navigator minimap.
  *     Setting to false will make the navigator minimap always visible.
  *
  * @property {Boolean} [navigatorRotate=true]
  *     If true, the navigator will be rotated together with the viewer.
  *
  * @property {String} [navigatorBackground='#000']
  *     Specifies the background color of the navigator minimap
  *
  * @property {Number} [navigatorOpacity=0.8]
  *     Specifies the opacity of the navigator minimap.
  *
  * @property {String} [navigatorBorderColor='#555']
  *     Specifies the border color of the navigator minimap
  *
  * @property {String} [navigatorDisplayRegionColor='#900']
  *     Specifies the border color of the display region rectangle of the navigator minimap
  *
  * @property {Number} [controlsFadeDelay=2000]
  *     The number of milliseconds to wait once the user has stopped interacting
  *     with the interface before beginning to fade the controls. Assumes
  *     showNavigationControl and autoHideControls are both true.
  *
  * @property {Number} [controlsFadeLength=1500]
  *     The number of milliseconds to animate the controls fading out.
  *
  * @property {Number} [maxImageCacheCount=200]
  *     The max number of images we should keep in memory (per drawer).
  *
  * @property {Number} [timeout=30000]
  *     The max number of milliseconds that an image job may take to complete.
  *
  * @property {Number} [tileRetryMax=0]
  *     The max number of retries when a tile download fails. By default it's 0, so retries are disabled.
  *
  * @property {Number} [tileRetryDelay=2500]
  *     Milliseconds to wait after each tile retry if tileRetryMax is set.
  *
  * @property {Boolean} [useCanvas=true]
  *     Deprecated. Use the `drawer` option to specify preferred renderer.
  *
  * @property {Number} [minPixelRatio=0.5]
  *     The higher the minPixelRatio, the lower the quality of the image that
  *     is considered sufficient to stop rendering a given zoom level.  For
  *     example, if you are targeting mobile devices with less bandwidth you may
  *     try setting this to 1.5 or higher.
  *
  * @property {Boolean} [mouseNavEnabled=true]
  *     Is the user able to interact with the image via mouse or touch. Default
  *     interactions include draging the image in a plane, and zooming in toward
  *     and away from the image.
  *
  * @property {Boolean} [showNavigationControl=true]
  *     Set to false to prevent the appearance of the default navigation controls.<br>
  *     Note that if set to false, the customs buttons set by the options
  *     zoomInButton, zoomOutButton etc, are rendered inactive.
  *
  * @property {OpenSeadragon.ControlAnchor} [navigationControlAnchor=TOP_LEFT]
  *     Placement of the default navigation controls.
  *     To set the placement of the sequence controls, see the
  *     sequenceControlAnchor option.
  *
  * @property {Boolean} [showZoomControl=true]
  *     If true then + and - buttons to zoom in and out are displayed.<br>
  *     Note: {@link OpenSeadragon.Options.showNavigationControl} is overriding
  *     this setting when set to false.
  *
  * @property {Boolean} [showHomeControl=true]
  *     If true then the 'Go home' button is displayed to go back to the original
  *     zoom and pan.<br>
  *     Note: {@link OpenSeadragon.Options.showNavigationControl} is overriding
  *     this setting when set to false.
  *
  * @property {Boolean} [showFullPageControl=true]
  *     If true then the 'Toggle full page' button is displayed to switch
  *     between full page and normal mode.<br>
  *     Note: {@link OpenSeadragon.Options.showNavigationControl} is overriding
  *     this setting when set to false.
  *
  * @property {Boolean} [showRotationControl=false]
  *     If true then the rotate left/right controls will be displayed as part of the
  *     standard controls. This is also subject to the browser support for rotate
  *     (e.g. viewer.drawer.canRotate()).<br>
  *     Note: {@link OpenSeadragon.Options.showNavigationControl} is overriding
  *     this setting when set to false.
  *
  * @property {Boolean} [showFlipControl=false]
  *     If true then the flip controls will be displayed as part of the
  *     standard controls.
  *
  * @property {Boolean} [showSequenceControl=true]
  *     If sequenceMode is true, then provide buttons for navigating forward and
  *     backward through the images.
  *
  * @property {OpenSeadragon.ControlAnchor} [sequenceControlAnchor=TOP_LEFT]
  *     Placement of the default sequence controls.
  *
  * @property {Boolean} [navPrevNextWrap=false]
  *     If true then the 'previous' button will wrap to the last image when
  *     viewing the first image and the 'next' button will wrap to the first
  *     image when viewing the last image.
  *
  *@property {String|Element} zoomInButton
  *     Set the id or element of the custom 'Zoom in' button to use.
  *     This is useful to have a custom button anywhere in the web page.<br>
  *     To only change the button images, consider using
  *     {@link OpenSeadragon.Options.navImages}
  *
  * @property {String|Element} zoomOutButton
  *     Set the id or element of the custom 'Zoom out' button to use.
  *     This is useful to have a custom button anywhere in the web page.<br>
  *     To only change the button images, consider using
  *     {@link OpenSeadragon.Options.navImages}
  *
  * @property {String|Element} homeButton
  *     Set the id or element of the custom 'Go home' button to use.
  *     This is useful to have a custom button anywhere in the web page.<br>
  *     To only change the button images, consider using
  *     {@link OpenSeadragon.Options.navImages}
  *
  * @property {String|Element} fullPageButton
  *     Set the id or element of the custom 'Toggle full page' button to use.
  *     This is useful to have a custom button anywhere in the web page.<br>
  *     To only change the button images, consider using
  *     {@link OpenSeadragon.Options.navImages}
  *
  * @property {String|Element} rotateLeftButton
  *     Set the id or element of the custom 'Rotate left' button to use.
  *     This is useful to have a custom button anywhere in the web page.<br>
  *     To only change the button images, consider using
  *     {@link OpenSeadragon.Options.navImages}
  *
  * @property {String|Element} rotateRightButton
  *     Set the id or element of the custom 'Rotate right' button to use.
  *     This is useful to have a custom button anywhere in the web page.<br>
  *     To only change the button images, consider using
  *     {@link OpenSeadragon.Options.navImages}
  *
  * @property {String|Element} previousButton
  *     Set the id or element of the custom 'Previous page' button to use.
  *     This is useful to have a custom button anywhere in the web page.<br>
  *     To only change the button images, consider using
  *     {@link OpenSeadragon.Options.navImages}
  *
  * @property {String|Element} nextButton
  *     Set the id or element of the custom 'Next page' button to use.
  *     This is useful to have a custom button anywhere in the web page.<br>
  *     To only change the button images, consider using
  *     {@link OpenSeadragon.Options.navImages}
  *
  * @property {Boolean} [sequenceMode=false]
  *     Set to true to have the viewer treat your tilesources as a sequence of images to
  *     be opened one at a time rather than all at once.
  *
  * @property {Number} [initialPage=0]
  *     If sequenceMode is true, display this page initially.
  *
  * @property {Boolean} [preserveViewport=false]
  *     If sequenceMode is true, then normally navigating through each image resets the
  *     viewport to 'home' position.  If preserveViewport is set to true, then the viewport
  *     position is preserved when navigating between images in the sequence.
  *
  * @property {Boolean} [preserveOverlays=false]
  *     If sequenceMode is true, then normally navigating through each image
  *     resets the overlays.
  *     If preserveOverlays is set to true, then the overlays added with {@link OpenSeadragon.Viewer#addOverlay}
  *     are preserved when navigating between images in the sequence.
  *     Note: setting preserveOverlays overrides any overlays specified in the global
  *     "overlays" option for the Viewer. It's also not compatible with specifying
  *     per-tileSource overlays via the options, as those overlays will persist
  *     even after the tileSource is closed.
  *
  * @property {Boolean} [showReferenceStrip=false]
  *     If sequenceMode is true, then display a scrolling strip of image thumbnails for
  *     navigating through the images.
  *
  * @property {String} [referenceStripScroll='horizontal']
  *
  * @property {Element} [referenceStripElement=null]
  *
  * @property {Number} [referenceStripHeight=null]
  *
  * @property {Number} [referenceStripWidth=null]
  *
  * @property {String} [referenceStripPosition='BOTTOM_LEFT']
  *
  * @property {Number} [referenceStripSizeRatio=0.2]
  *
  * @property {Boolean} [collectionMode=false]
  *     Set to true to have the viewer arrange your TiledImages in a grid or line.
  *
  * @property {Number} [collectionRows=3]
  *     If collectionMode is true, specifies how many rows the grid should have. Use 1 to make a line.
  *     If collectionLayout is 'vertical', specifies how many columns instead.
  *
  * @property {Number} [collectionColumns=0]
  *     If collectionMode is true, specifies how many columns the grid should have. Use 1 to make a line.
  *     If collectionLayout is 'vertical', specifies how many rows instead. Ignored if collectionRows is not set to a falsy value.
  *
  * @property {String} [collectionLayout='horizontal']
  *     If collectionMode is true, specifies whether to arrange vertically or horizontally.
  *
  * @property {Number} [collectionTileSize=800]
  *     If collectionMode is true, specifies the size, in viewport coordinates, for each TiledImage to fit into.
  *     The TiledImage will be centered within a square of the specified size.
  *
  * @property {Number} [collectionTileMargin=80]
  *     If collectionMode is true, specifies the margin, in viewport coordinates, between each TiledImage.
  *
  * @property {String|Boolean} [crossOriginPolicy=false]
  *     Valid values are 'Anonymous', 'use-credentials', and false. If false, canvas requests will
  *     not use CORS, and the canvas will be tainted.
  *
  * @property {Boolean} [ajaxWithCredentials=false]
  *     Whether to set the withCredentials XHR flag for AJAX requests.
  *     Note that this can be overridden at the {@link OpenSeadragon.TileSource} level.
  *
  * @property {Boolean} [loadTilesWithAjax=false]
  *     Whether to load tile data using AJAX requests.
  *     Note that this can be overridden at the {@link OpenSeadragon.TileSource} level.
  *
  * @property {Object} [ajaxHeaders={}]
  *     A set of headers to include when making AJAX requests for tile sources or tiles.
  *
  * @property {Boolean} [splitHashDataForPost=false]
  *     Allows to treat _first_ hash ('#') symbol as a separator for POST data:
  *     URL to be opened by a {@link OpenSeadragon.TileSource} can thus look like: http://some.url#postdata=here.
  *     The whole URL is used to fetch image info metadata and it is then split to 'http://some.url' and
  *     'postdata=here'; post data is given to the {@link OpenSeadragon.TileSource} of the choice and can be further
  *     used within tile requests (see TileSource methods).
  *     NOTE: {@link OpenSeadragon.TileSource.prototype.configure} return value should contain the post data
  *     if you want to use it later - so that it is given to your constructor later.
  *     NOTE: usually, post data is expected to be ampersand-separated (just like GET parameters), and is NOT USED
  *     to fetch tile image data unless explicitly programmed, or if loadTilesWithAjax=false 4
  *     (but it is still used for the initial image info request).
  *     NOTE: passing POST data from URL by this feature only supports string values, however,
  *     TileSource can send any data using POST as long as the header is correct
  *     (@see OpenSeadragon.TileSource.prototype.getTilePostData)
  *
  * @property {Boolean} [callTileLoadedWithCachedData=false]
  *     tile-loaded event is called only for tiles that downloaded new data or
  *     their data is stored in the original form in a suplementary cache object.
  *     Caches that render directly from re-used cache does not trigger this event again,
  *     as possible modifications would be applied twice.
  */

 /**
  * Settings for gestures generated by a pointer device.
  *
  * @typedef {Object} GestureSettings
  * @memberof OpenSeadragon
  *
  * @property {Boolean} dragToPan
  *     Set to false to disable panning on drag gestures.
  *
  * @property {Boolean} scrollToZoom
  *     Set to false to disable zooming on scroll gestures.
  *
  * @property {Boolean} clickToZoom
  *     Set to false to disable zooming on click gestures.
  *
  * @property {Boolean} dblClickToZoom
  *     Set to false to disable zooming on double-click gestures. Note: If set to true
  *     then clickToZoom should be set to false to prevent multiple zooms.
  *
  * @property {Boolean} pinchToZoom
  *     Set to false to disable zooming on pinch gestures.
  *
  * @property {Boolean} flickEnabled
  *     Set to false to disable the kinetic panning effect (flick) at the end of a drag gesture.
  *
  * @property {Number} flickMinSpeed
  *     If flickEnabled is true, the minimum speed (in pixels-per-second) required to cause the kinetic panning effect (flick) at the end of a drag gesture.
  *
  * @property {Number} flickMomentum
  *     If flickEnabled is true, a constant multiplied by the velocity to determine the distance of the kinetic panning effect (flick) at the end of a drag gesture.
  *     A larger value will make the flick feel "lighter", while a smaller value will make the flick feel "heavier".
  *     Note: springStiffness and animationTime also affect the "spring" used to stop the flick animation.
  *
  */

 /**
  * @typedef {Object.<string, Object>} DrawerOptions - give the renderer options (both shared - BaseDrawerOptions, and custom).
  *   Supports arbitrary keys: you can register any drawer on the OpenSeadragon namespace, it will get automatically recognized
  *   and its getType() implementation will define what key to specify the options with.
  * @memberof OpenSeadragon
  * @property {BaseDrawerOptions} [webgl] - options if the WebGLDrawer is used.
  * @property {BaseDrawerOptions} [canvas] - options if the CanvasDrawer is used.
  * @property {BaseDrawerOptions} [html] - options if the HTMLDrawer is used.
  * @property {BaseDrawerOptions} [custom] - options if a custom drawer is used.
  *
  * //Note: if you want to add change options for target drawer change type to {BaseDrawerOptions & MyDrawerOpts}
  */


/**
  * The names for the image resources used for the image navigation buttons.
  *
  * @typedef {Object} NavImages
  * @memberof OpenSeadragon
  *
  * @property {Object} zoomIn - Images for the zoom-in button.
  * @property {String} zoomIn.REST
  * @property {String} zoomIn.GROUP
  * @property {String} zoomIn.HOVER
  * @property {String} zoomIn.DOWN
  *
  * @property {Object} zoomOut - Images for the zoom-out button.
  * @property {String} zoomOut.REST
  * @property {String} zoomOut.GROUP
  * @property {String} zoomOut.HOVER
  * @property {String} zoomOut.DOWN
  *
  * @property {Object} home - Images for the home button.
  * @property {String} home.REST
  * @property {String} home.GROUP
  * @property {String} home.HOVER
  * @property {String} home.DOWN
  *
  * @property {Object} fullpage - Images for the full-page button.
  * @property {String} fullpage.REST
  * @property {String} fullpage.GROUP
  * @property {String} fullpage.HOVER
  * @property {String} fullpage.DOWN
  *
  * @property {Object} rotateleft - Images for the rotate left button.
  * @property {String} rotateleft.REST
  * @property {String} rotateleft.GROUP
  * @property {String} rotateleft.HOVER
  * @property {String} rotateleft.DOWN
  *
  * @property {Object} rotateright - Images for the rotate right button.
  * @property {String} rotateright.REST
  * @property {String} rotateright.GROUP
  * @property {String} rotateright.HOVER
  * @property {String} rotateright.DOWN
  *
  * @property {Object} flip - Images for the flip button.
  * @property {String} flip.REST
  * @property {String} flip.GROUP
  * @property {String} flip.HOVER
  * @property {String} flip.DOWN
  *
  * @property {Object} previous - Images for the previous button.
  * @property {String} previous.REST
  * @property {String} previous.GROUP
  * @property {String} previous.HOVER
  * @property {String} previous.DOWN
  *
  * @property {Object} next - Images for the next button.
  * @property {String} next.REST
  * @property {String} next.GROUP
  * @property {String} next.HOVER
  * @property {String} next.DOWN
  *
  */

/* eslint-disable no-redeclare */
function OpenSeadragon( options ){
    return new OpenSeadragon.Viewer( options );
}

(function( $ ){


    /**
     * The OpenSeadragon version.
     *
     * @member {Object} OpenSeadragon.version
     * @property {String} versionStr - The version number as a string ('major.minor.revision').
     * @property {Number} major - The major version number.
     * @property {Number} minor - The minor version number.
     * @property {Number} revision - The revision number.
     * @since 1.0.0
     */
    $.version = {
        versionStr: '<%= osdVersion.versionStr %>',
        major: parseInt('<%= osdVersion.major %>', 10),
        minor: parseInt('<%= osdVersion.minor %>', 10),
        revision: parseInt('<%= osdVersion.revision %>', 10)
    };


    /**
     * Taken from jquery 1.6.1
     * [[Class]] -> type pairs
     * @private
     */
    var class2type = {
            '[object Boolean]':                  'boolean',
            '[object Number]':                   'number',
            '[object String]':                   'string',
            '[object Function]':                 'function',
            '[object AsyncFunction]':            'function',
            '[object Promise]':                  'promise',
            '[object Array]':                    'array',
            '[object Date]':                     'date',
            '[object RegExp]':                   'regexp',
            '[object Object]':                   'object',
            '[object HTMLUnknownElement]':       'dom-node',
            '[object HTMLImageElement]':         'image',
            '[object HTMLCanvasElement]':        'canvas',
            '[object CanvasRenderingContext2D]': 'context2d'
        },
        // Save a reference to some core methods
        toString    = Object.prototype.toString,
        hasOwn      = Object.prototype.hasOwnProperty;

    /**
     * Taken from jQuery 1.6.1
     * @function isFunction
     * @memberof OpenSeadragon
     * @see {@link http://www.jquery.com/ jQuery}
     */
    $.isFunction = function( obj ) {
        return $.type(obj) === "function";
    };

    /**
     * Taken from jQuery 1.6.1
     * @function isArray
     * @memberof OpenSeadragon
     * @see {@link http://www.jquery.com/ jQuery}
     */
    $.isArray = Array.isArray || function( obj ) {
        return $.type(obj) === "array";
    };


    /**
     * A crude way of determining if an object is a window.
     * Taken from jQuery 1.6.1
     * @function isWindow
     * @memberof OpenSeadragon
     * @see {@link http://www.jquery.com/ jQuery}
     */
    $.isWindow = function( obj ) {
        return obj && typeof obj === "object" && "setInterval" in obj;
    };


    /**
     * Taken from jQuery 1.6.1
     * @function type
     * @memberof OpenSeadragon
     * @see {@link http://www.jquery.com/ jQuery}
     */
    $.type = function( obj ) {
        return ( obj === null ) || ( obj === undefined ) ?
            String( obj ) :
            class2type[ toString.call(obj) ] || "object";
    };


    /**
     * Taken from jQuery 1.6.1
     * @function isPlainObject
     * @memberof OpenSeadragon
     * @see {@link http://www.jquery.com/ jQuery}
     */
    $.isPlainObject = function( obj ) {
        // Must be an Object.
        // Because of IE, we also have to check the presence of the constructor property.
        // Make sure that DOM nodes and window objects don't pass through, as well
        if ( !obj || OpenSeadragon.type(obj) !== "object" || obj.nodeType || $.isWindow( obj ) ) {
            return false;
        }

        // Not own constructor property must be Object
        if ( obj.constructor &&
            !hasOwn.call(obj, "constructor") &&
            !hasOwn.call(obj.constructor.prototype, "isPrototypeOf") ) {
            return false;
        }

        // Own properties are enumerated firstly, so to speed up,
        // if last one is own, then all properties are own.

        var lastKey;
        for (var key in obj ) {
            lastKey = key;
        }

        return lastKey === undefined || hasOwn.call( obj, lastKey );
    };


    /**
     * Taken from jQuery 1.6.1
     * @function isEmptyObject
     * @memberof OpenSeadragon
     * @see {@link http://www.jquery.com/ jQuery}
     */
    $.isEmptyObject = function( obj ) {
        for ( var name in obj ) {
            return false;
        }
        return true;
    };

    /**
     * Shim around Object.freeze. Does nothing if Object.freeze is not supported.
     * @param {Object} obj The object to freeze.
     * @returns {Object} obj The frozen object.
     */
    $.freezeObject = function(obj) {
        if (Object.freeze) {
            $.freezeObject = Object.freeze;
        } else {
            $.freezeObject = function(obj) {
                return obj;
            };
        }
        return $.freezeObject(obj);
    };

    /**
     * True if the browser supports the HTML5 canvas element
     * @member {Boolean} supportsCanvas
     * @memberof OpenSeadragon
     */
    $.supportsCanvas = (function () {
        var canvasElement = document.createElement( 'canvas' );
        return !!( $.isFunction( canvasElement.getContext ) &&
                    canvasElement.getContext( '2d' ) );
    }());

    /**
     * Test whether the submitted canvas is tainted or not.
     * @argument {Canvas} canvas The canvas to test.
     * @returns {Boolean} True if the canvas is tainted.
     */
    $.isCanvasTainted = function(canvas) {
        var isTainted = false;
        try {
            // We test if the canvas is tainted by retrieving data from it.
            // An exception will be raised if the canvas is tainted.
            canvas.getContext('2d').getImageData(0, 0, 1, 1);
        } catch (e) {
            isTainted = true;
        }
        return isTainted;
    };

    /**
     * True if the browser supports the EventTarget.addEventListener() method
     * @member {Boolean} supportsAddEventListener
     * @memberof OpenSeadragon
     */
    $.supportsAddEventListener = (function () {
        return !!(document.documentElement.addEventListener && document.addEventListener);
    }());

    /**
     * True if the browser supports the EventTarget.removeEventListener() method
     * @member {Boolean} supportsRemoveEventListener
     * @memberof OpenSeadragon
     */
    $.supportsRemoveEventListener = (function () {
        return !!(document.documentElement.removeEventListener && document.removeEventListener);
    }());

    /**
     * True if the browser supports the newer EventTarget.addEventListener options argument
     * @member {Boolean} supportsEventListenerOptions
     * @memberof OpenSeadragon
     */
    $.supportsEventListenerOptions = (function () {
        var supported = 0;

        if ( $.supportsAddEventListener ) {
            try {
                var options = {
                    get capture() {
                        supported++;
                        return false;
                    },
                    get once() {
                        supported++;
                        return false;
                    },
                    get passive() {
                        supported++;
                        return false;
                    }
                };
                window.addEventListener("test", null, options);
                window.removeEventListener("test", null, options);
            } catch ( e ) {
                supported = 0;
            }
        }

        return supported >= 3;
    }());

    /**
     * If true, OpenSeadragon uses async execution, else it uses synchronous execution.
     * Note that disabling async means no plugins that use Promises / async will work with OSD.
     * @member {boolean}
     * @memberof OpenSeadragon
     */
    $.supportsAsync = true;

    /**
     * A ratio comparing the device screen's pixel density to the canvas's backing store pixel density,
     * clamped to a minimum of 1. Defaults to 1 if canvas isn't supported by the browser.
     * @function getCurrentPixelDensityRatio
     * @memberof OpenSeadragon
     * @returns {Number}
     */
    $.getCurrentPixelDensityRatio = function() {
        if ( $.supportsCanvas ) {
            var context = document.createElement('canvas').getContext('2d');
            var devicePixelRatio = window.devicePixelRatio || 1;
            var backingStoreRatio = context.webkitBackingStorePixelRatio ||
                                    context.mozBackingStorePixelRatio ||
                                    context.msBackingStorePixelRatio ||
                                    context.oBackingStorePixelRatio ||
                                    context.backingStorePixelRatio || 1;
            return Math.max(devicePixelRatio, 1) / backingStoreRatio;
        } else {
            return 1;
        }
    };

    /**
     * A ratio comparing the device screen's pixel density to the canvas's backing store pixel density,
     * clamped to a minimum of 1. Defaults to 1 if canvas isn't supported by the browser.
     * @member {Number} pixelDensityRatio
     * @memberof OpenSeadragon
     */
    $.pixelDensityRatio = $.getCurrentPixelDensityRatio();

}( OpenSeadragon ));

/**
 *  This closure defines all static methods available to the OpenSeadragon
 *  namespace.  Many, if not most, are taken directly from jQuery for use
 *  to simplify and reduce common programming patterns.  More static methods
 *  from jQuery may eventually make their way into this though we are
 *  attempting to avoid an explicit dependency on jQuery only because
 *  OpenSeadragon is a broadly useful code base and would be made less broad
 *  by requiring jQuery fully.
 *
 *  Some static methods have also been refactored from the original OpenSeadragon
 *  project.
 */
(function( $ ){

    /**
     * Taken from jQuery 1.6.1
     * @function extend
     * @memberof OpenSeadragon
     * @see {@link http://www.jquery.com/ jQuery}
     */
    $.extend = function() {
        var options,
            name,
            src,
            copy,
            copyIsArray,
            clone,
            target  = arguments[ 0 ] || {},
            length  = arguments.length,
            deep    = false,
            i       = 1;

        // Handle a deep copy situation
        if ( typeof target === "boolean" ) {
            deep    = target;
            target  = arguments[ 1 ] || {};
            // skip the boolean and the target
            i = 2;
        }

        // Handle case when target is a string or something (possible in deep copy)
        if ( typeof target !== "object" && !OpenSeadragon.isFunction( target ) ) {
            target = {};
        }

        // extend jQuery itself if only one argument is passed
        if ( length === i ) {
            target = this;
            --i;
        }

        for ( ; i < length; i++ ) {
            // Only deal with non-null/undefined values
            options = arguments[ i ];
            if ( options !== null || options !== undefined ) {
                // Extend the base object
                for ( name in options ) {
                    var descriptor = Object.getOwnPropertyDescriptor(options, name);

                    if (descriptor !== undefined) {
                        if (descriptor.get || descriptor.set) {
                            Object.defineProperty(target, name, descriptor);
                            continue;
                        }

                        copy = descriptor.value;
                    } else {
                        $.console.warn('Could not copy inherited property "' + name + '".');
                        continue;
                    }

                    // Prevent never-ending loop
                    if ( target === copy ) {
                        continue;
                    }

                    // Recurse if we're merging plain objects or arrays
                    if ( deep && copy && ( OpenSeadragon.isPlainObject( copy ) || ( copyIsArray = OpenSeadragon.isArray( copy ) ) ) ) {
                        src = target[ name ];

                        if ( copyIsArray ) {
                            copyIsArray = false;
                            clone = src && OpenSeadragon.isArray( src ) ? src : [];

                        } else {
                            clone = src && OpenSeadragon.isPlainObject( src ) ? src : {};
                        }

                        // Never move original objects, clone them
                        target[ name ] = OpenSeadragon.extend( deep, clone, copy );

                    // Don't bring in undefined values
                    } else if ( copy !== undefined ) {
                        target[ name ] = copy;
                    }
                }
            }
        }

        // Return the modified object
        return target;
    };

    var isIOSDevice = function () {
        if (typeof navigator !== 'object') {
            return false;
        }
        var userAgent = navigator.userAgent;
        if (typeof userAgent !== 'string') {
            return false;
        }
        return userAgent.indexOf('iPhone') !== -1 ||
               userAgent.indexOf('iPad') !== -1 ||
               userAgent.indexOf('iPod') !== -1;
    };

    $.extend( $, /** @lends OpenSeadragon */{
        /**
         * The default values for the optional settings documented at {@link OpenSeadragon.Options}.
         * @static
         * @type {Object}
         */
        DEFAULT_SETTINGS: {
            //DATA SOURCE DETAILS
            xmlPath:                null,
            tileSources:            null,
            tileHost:               null,
            initialPage:            0,
            crossOriginPolicy:      false,
            ajaxWithCredentials:    false,
            loadTilesWithAjax:      false,
            ajaxHeaders:            {},
            splitHashDataForPost:   false,
            callTileLoadedWithCachedData: false,

            //PAN AND ZOOM SETTINGS AND CONSTRAINTS
            panHorizontal:          true,
            panVertical:            true,
            constrainDuringPan:     false,
            wrapHorizontal:         false,
            wrapVertical:           false,
            visibilityRatio:        0.5, //-> how much of the viewer can be negative space
            minPixelRatio:          0.5, //->closer to 0 draws tiles meant for a higher zoom at this zoom
            defaultZoomLevel:       0,
            minZoomLevel:           null,
            maxZoomLevel:           null,
            homeFillsViewer:        false,

            //UI RESPONSIVENESS AND FEEL
            clickTimeThreshold:     300,
            clickDistThreshold:     5,
            dblClickTimeThreshold:  300,
            dblClickDistThreshold:  20,
            springStiffness:        6.5,
            animationTime:          1.2,
            loadDestinationTilesOnAnimation: true,
            gestureSettingsMouse:   {
                dragToPan: true,
                scrollToZoom: true,
                clickToZoom: true,
                dblClickToZoom: false,
                dblClickDragToZoom: false,
                pinchToZoom: false,
                zoomToRefPoint: true,
                flickEnabled: false,
                flickMinSpeed: 120,
                flickMomentum: 0.25,
                pinchRotate: false
            },
            gestureSettingsTouch:   {
                dragToPan: true,
                scrollToZoom: false,
                clickToZoom: false,
                dblClickToZoom: true,
                dblClickDragToZoom: true,
                pinchToZoom: true,
                zoomToRefPoint: true,
                flickEnabled: true,
                flickMinSpeed: 120,
                flickMomentum: 0.25,
                pinchRotate: false
            },
            gestureSettingsPen:     {
                dragToPan: true,
                scrollToZoom: false,
                clickToZoom: true,
                dblClickToZoom: false,
                dblClickDragToZoom: false,
                pinchToZoom: false,
                zoomToRefPoint: true,
                flickEnabled: false,
                flickMinSpeed: 120,
                flickMomentum: 0.25,
                pinchRotate: false
            },
            gestureSettingsUnknown: {
                dragToPan: true,
                scrollToZoom: false,
                clickToZoom: false,
                dblClickToZoom: true,
                dblClickDragToZoom: false,
                pinchToZoom: true,
                zoomToRefPoint: true,
                flickEnabled: true,
                flickMinSpeed: 120,
                flickMomentum: 0.25,
                pinchRotate: false
            },
            zoomPerClick:           2,
            zoomPerScroll:          1.2,
            zoomPerDblClickDrag:    1.2,
            zoomPerSecond:          1.0,
            blendTime:              0,
            alwaysBlend:            false,
            autoHideControls:       true,
            immediateRender:        false,
            minZoomImageRatio:      0.9, //-> closer to 0 allows zoom out to infinity
            maxZoomPixelRatio:      1.1, //-> higher allows 'over zoom' into pixels
            smoothTileEdgesMinZoom: 1.1, //-> higher than maxZoomPixelRatio disables it
            iOSDevice:              isIOSDevice(),
            pixelsPerWheelLine:     40,
            pixelsPerArrowPress:    40,
            autoResize:             true,
            preserveImageSizeOnResize: false, // requires autoResize=true
            minScrollDeltaTime:     50,
            rotationIncrement:      90,
            maxTilesPerFrame:       1,

            //DEFAULT CONTROL SETTINGS
            showSequenceControl:     true,  //SEQUENCE
            sequenceControlAnchor:   null,  //SEQUENCE
            preserveViewport:        false, //SEQUENCE
            preserveOverlays:        false, //SEQUENCE
            navPrevNextWrap:         false, //SEQUENCE
            showNavigationControl:   true,  //ZOOM/HOME/FULL/ROTATION
            navigationControlAnchor: null,  //ZOOM/HOME/FULL/ROTATION
            showZoomControl:         true,  //ZOOM
            showHomeControl:         true,  //HOME
            showFullPageControl:     true,  //FULL
            showRotationControl:     false, //ROTATION
            showFlipControl:         false,  //FLIP
            controlsFadeDelay:       2000,  //ZOOM/HOME/FULL/SEQUENCE
            controlsFadeLength:      1500,  //ZOOM/HOME/FULL/SEQUENCE
            mouseNavEnabled:         true,  //GENERAL MOUSE INTERACTIVITY

            //VIEWPORT NAVIGATOR SETTINGS
            showNavigator:              false,
            navigatorElement:           null,
            navigatorId:                null,
            navigatorPosition:          null,
            navigatorSizeRatio:         0.2,
            navigatorMaintainSizeRatio: false,
            navigatorTop:               null,
            navigatorLeft:              null,
            navigatorHeight:            null,
            navigatorWidth:             null,
            navigatorAutoResize:        true,
            navigatorAutoFade:          true,
            navigatorRotate:            true,
            navigatorBackground:        '#000',
            navigatorOpacity:           0.8,
            navigatorBorderColor:       '#555',
            navigatorDisplayRegionColor: '#900',

            // INITIAL ROTATION
            degrees:                    0,

            // INITIAL FLIP STATE
            flipped:                          false,
            overlayPreserveContentDirection:  true,

            // APPEARANCE
            opacity:                           1, // to be passed into each TiledImage
            compositeOperation:                null, // to be passed into each TiledImage

            // DRAWER SETTINGS
            drawer:                            ['webgl', 'canvas', 'html'], // prefer using webgl, then canvas (i.e. context2d), then fallback to html

            drawerOptions: {
                webgl: {

                },
                canvas: {

                },
                html: {

                },
                custom: {

                }
            },

            // TILED IMAGE SETTINGS
            preload:                           false, // to be passed into each TiledImage
            imageSmoothingEnabled:             true,  // to be passed into each TiledImage
            placeholderFillStyle:              null,  // to be passed into each TiledImage
            subPixelRoundingForTransparency:   null,  // to be passed into each TiledImage

            //REFERENCE STRIP SETTINGS
            showReferenceStrip:          false,
            referenceStripScroll:       'horizontal',
            referenceStripElement:       null,
            referenceStripHeight:        null,
            referenceStripWidth:         null,
            referenceStripPosition:      'BOTTOM_LEFT',
            referenceStripSizeRatio:     0.2,

            //COLLECTION VISUALIZATION SETTINGS
            collectionRows:         3, //or columns depending on layout
            collectionColumns:      0, //columns in horizontal layout, rows in vertical layout
            collectionLayout:       'horizontal', //vertical
            collectionMode:         false,
            collectionTileSize:     800,
            collectionTileMargin:   80,

            //PERFORMANCE SETTINGS
            imageLoaderLimit:       0,
            maxImageCacheCount:     200,
            timeout:                30000,
            tileRetryMax:           0,
            tileRetryDelay:         2500,

            //INTERFACE RESOURCE SETTINGS
            prefixUrl:              "/images/",
            navImages: {
                zoomIn: {
                    REST:   'zoomin_rest.png',
                    GROUP:  'zoomin_grouphover.png',
                    HOVER:  'zoomin_hover.png',
                    DOWN:   'zoomin_pressed.png'
                },
                zoomOut: {
                    REST:   'zoomout_rest.png',
                    GROUP:  'zoomout_grouphover.png',
                    HOVER:  'zoomout_hover.png',
                    DOWN:   'zoomout_pressed.png'
                },
                home: {
                    REST:   'home_rest.png',
                    GROUP:  'home_grouphover.png',
                    HOVER:  'home_hover.png',
                    DOWN:   'home_pressed.png'
                },
                fullpage: {
                    REST:   'fullpage_rest.png',
                    GROUP:  'fullpage_grouphover.png',
                    HOVER:  'fullpage_hover.png',
                    DOWN:   'fullpage_pressed.png'
                },
                rotateleft: {
                    REST:   'rotateleft_rest.png',
                    GROUP:  'rotateleft_grouphover.png',
                    HOVER:  'rotateleft_hover.png',
                    DOWN:   'rotateleft_pressed.png'
                },
                rotateright: {
                    REST:   'rotateright_rest.png',
                    GROUP:  'rotateright_grouphover.png',
                    HOVER:  'rotateright_hover.png',
                    DOWN:   'rotateright_pressed.png'
                },
                flip: { // Flip icon designed by Yaroslav Samoylov from the Noun Project and modified by Nelson Campos ncampos@criteriamarathon.com, https://thenounproject.com/term/flip/136289/
                    REST:   'flip_rest.png',
                    GROUP:  'flip_grouphover.png',
                    HOVER:  'flip_hover.png',
                    DOWN:   'flip_pressed.png'
                },
                previous: {
                    REST:   'previous_rest.png',
                    GROUP:  'previous_grouphover.png',
                    HOVER:  'previous_hover.png',
                    DOWN:   'previous_pressed.png'
                },
                next: {
                    REST:   'next_rest.png',
                    GROUP:  'next_grouphover.png',
                    HOVER:  'next_hover.png',
                    DOWN:   'next_pressed.png'
                }
            },

            //DEVELOPER SETTINGS
            debugMode:              false,
            debugGridColor:         ['#437AB2', '#1B9E77', '#D95F02', '#7570B3', '#E7298A', '#66A61E', '#E6AB02', '#A6761D', '#666666'],
            silenceMultiImageWarnings: false

        },

        /**
         * Returns a function which invokes the method as if it were a method belonging to the object.
         * @function
         * @param {Object} object
         * @param {Function} method
         * @returns {Function}
         */
        delegate: function( object, method ) {
            return function(){
                var args = arguments;
                if ( args === undefined ){
                    args = [];
                }
                return method.apply( object, args );
            };
        },


        /**
         * An enumeration of Browser vendors.
         * @static
         * @type {Object}
         * @property {Number} UNKNOWN
         * @property {Number} IE
         * @property {Number} FIREFOX
         * @property {Number} SAFARI
         * @property {Number} CHROME
         * @property {Number} OPERA
         * @property {Number} EDGE
         * @property {Number} CHROMEEDGE
         */
        BROWSERS: {
            UNKNOWN:    0,
            IE:         1,
            FIREFOX:    2,
            SAFARI:     3,
            CHROME:     4,
            OPERA:      5,
            EDGE:       6,
            CHROMEEDGE: 7
        },

        /**
         * An enumeration of when subpixel rounding should occur.
         * @static
         * @type {Object}
         * @property {Number} NEVER Never apply subpixel rounding for transparency.
         * @property {Number} ONLY_AT_REST Do not apply subpixel rounding for transparency during animation (panning, zoom, rotation) and apply it once animation is over.
         * @property {Number} ALWAYS Apply subpixel rounding for transparency during animation and when animation is over.
         */
        SUBPIXEL_ROUNDING_OCCURRENCES: {
            NEVER:        0,
            ONLY_AT_REST: 1,
            ALWAYS:       2
        },

        /**
         * Keep track of which {@link Viewer}s have been created.
         * - Key: {@link Element} to which a Viewer is attached.
         * - Value: {@link Viewer} of the element defined by the key.
         * @private
         * @static
         * @type {Object}
         */
        _viewers: new Map(),

       /**
         * Returns the {@link Viewer} attached to a given DOM element. If there is
         * no viewer attached to the provided element, undefined is returned.
         * @function
         * @param {String|Element} element Accepts an id or element.
         * @returns {Viewer} The viewer attached to the given element, or undefined.
         */
        getViewer: function(element) {
            return $._viewers.get(this.getElement(element));
        },

        /**
         * Returns a DOM Element for the given id or element.
         * @function
         * @param {String|Element} element Accepts an id or element.
         * @returns {Element} The element with the given id, null, or the element itself.
         */
        getElement: function( element ) {
            if ( typeof ( element ) === "string" ) {
                element = document.getElementById( element );
            }
            return element;
        },


        /**
         * Determines the position of the upper-left corner of the element.
         * @function
         * @param {Element|String} element - the element we want the position for.
         * @returns {OpenSeadragon.Point} - the position of the upper left corner of the element.
         */
        getElementPosition: function( element ) {
            var result = new $.Point(),
                isFixed,
                offsetParent;

            element      = $.getElement( element );
            isFixed      = $.getElementStyle( element ).position === "fixed";
            offsetParent = getOffsetParent( element, isFixed );

            while ( offsetParent ) {

                result.x += element.offsetLeft;
                result.y += element.offsetTop;

                if ( isFixed ) {
                    result = result.plus( $.getPageScroll() );
                }

                element = offsetParent;
                isFixed = $.getElementStyle( element ).position === "fixed";
                offsetParent = getOffsetParent( element, isFixed );
            }

            return result;
        },


        /**
         * Determines the position of the upper-left corner of the element adjusted for current page and/or element scroll.
         * @function
         * @param {Element|String} element - the element we want the position for.
         * @returns {OpenSeadragon.Point} - the position of the upper left corner of the element adjusted for current page and/or element scroll.
         */
        getElementOffset: function( element ) {
            element = $.getElement( element );

            var doc = element && element.ownerDocument,
                docElement,
                win,
                boundingRect = { top: 0, left: 0 };

            if ( !doc ) {
                return new $.Point();
            }

            docElement = doc.documentElement;

            if ( typeof element.getBoundingClientRect !== typeof undefined ) {
                boundingRect = element.getBoundingClientRect();
            }

            win = ( doc === doc.window ) ?
                doc :
                ( doc.nodeType === 9 ) ?
                    doc.defaultView || doc.parentWindow :
                    false;

            return new $.Point(
                boundingRect.left + ( win.pageXOffset || docElement.scrollLeft ) - ( docElement.clientLeft || 0 ),
                boundingRect.top + ( win.pageYOffset || docElement.scrollTop ) - ( docElement.clientTop || 0 )
            );
        },


        /**
         * Determines the height and width of the given element.
         * @function
         * @param {Element|String} element
         * @returns {OpenSeadragon.Point}
         */
        getElementSize: function( element ) {
            element = $.getElement( element );

            return new $.Point(
                element.clientWidth,
                element.clientHeight
            );
        },


        /**
         * Returns the CSSStyle object for the given element.
         * @function
         * @param {Element|String} element
         * @returns {CSSStyle}
         */
        getElementStyle:
            document.documentElement.currentStyle ?
            function( element ) {
                element = $.getElement( element );
                return element.currentStyle;
            } :
            function( element ) {
                element = $.getElement( element );
                return window.getComputedStyle( element, "" );
            },

        /**
         * Returns the property with the correct vendor prefix appended.
         * @param {String} property the property name
         * @returns {String} the property with the correct prefix or null if not
         * supported.
         */
        getCssPropertyWithVendorPrefix: function(property) {
            var memo = {};

            $.getCssPropertyWithVendorPrefix = function(property) {
                if (memo[property] !== undefined) {
                    return memo[property];
                }
                var style = document.createElement('div').style;
                var result = null;
                if (style[property] !== undefined) {
                    result = property;
                } else {
                    var prefixes = ['Webkit', 'Moz', 'MS', 'O',
                        'webkit', 'moz', 'ms', 'o'];
                    var suffix = $.capitalizeFirstLetter(property);
                    for (var i = 0; i < prefixes.length; i++) {
                        var prop = prefixes[i] + suffix;
                        if (style[prop] !== undefined) {
                            result = prop;
                            break;
                        }
                    }
                }
                memo[property] = result;
                return result;
            };
            return $.getCssPropertyWithVendorPrefix(property);
        },

        /**
         * Capitalizes the first letter of a string
         * @param {String} string
         * @returns {String} The string with the first letter capitalized
         */
        capitalizeFirstLetter: function(string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        },

        /**
         * Compute the modulo of a number but makes sure to always return
         * a positive value (also known as Euclidean modulo).
         * @param {Number} number the number to compute the modulo of
         * @param {Number} modulo the modulo
         * @returns {Number} the result of the modulo of number
         */
        positiveModulo: function(number, modulo) {
            var result = number % modulo;
            if (result < 0) {
                result += modulo;
            }
            return result;
        },


        /**
         * Determines if a point is within the bounding rectangle of the given element (hit-test).
         * @function
         * @param {Element|String} element
         * @param {OpenSeadragon.Point} point
         * @returns {Boolean}
         */
        pointInElement: function( element, point ) {
            element = $.getElement( element );
            var offset = $.getElementOffset( element ),
                size = $.getElementSize( element );
            return point.x >= offset.x && point.x < offset.x + size.x && point.y < offset.y + size.y && point.y >= offset.y;
        },


        /**
         * Gets the position of the mouse on the screen for a given event.
         * @function
         * @param {Event} [event]
         * @returns {OpenSeadragon.Point}
         */
        getMousePosition: function( event ) {

            if ( typeof ( event.pageX ) === "number" ) {
                $.getMousePosition = function( event ){
                    var result = new $.Point();

                    result.x = event.pageX;
                    result.y = event.pageY;

                    return result;
                };
            } else if ( typeof ( event.clientX ) === "number" ) {
                $.getMousePosition = function( event ){
                    var result = new $.Point();

                    result.x =
                        event.clientX +
                        document.body.scrollLeft +
                        document.documentElement.scrollLeft;
                    result.y =
                        event.clientY +
                        document.body.scrollTop +
                        document.documentElement.scrollTop;

                    return result;
                };
            } else {
                throw new Error(
                    "Unknown event mouse position, no known technique."
                );
            }

            return $.getMousePosition( event );
        },


        /**
         * Determines the page's current scroll position.
         * @function
         * @returns {OpenSeadragon.Point}
         */
        getPageScroll: function() {
            var docElement  = document.documentElement || {},
                body        = document.body || {};

            if ( typeof ( window.pageXOffset ) === "number" ) {
                $.getPageScroll = function(){
                    return new $.Point(
                        window.pageXOffset,
                        window.pageYOffset
                    );
                };
            } else if ( body.scrollLeft || body.scrollTop ) {
                $.getPageScroll = function(){
                    return new $.Point(
                        document.body.scrollLeft,
                        document.body.scrollTop
                    );
                };
            } else if ( docElement.scrollLeft || docElement.scrollTop ) {
                $.getPageScroll = function(){
                    return new $.Point(
                        document.documentElement.scrollLeft,
                        document.documentElement.scrollTop
                    );
                };
            } else {
                // We can't reassign the function yet, as there was no scroll.
                return new $.Point(0, 0);
            }

            return $.getPageScroll();
        },

        /**
         * Set the page scroll position.
         * @function
         * @returns {OpenSeadragon.Point}
         */
        setPageScroll: function( scroll ) {
            if ( typeof ( window.scrollTo ) !== "undefined" ) {
                $.setPageScroll = function( scroll ) {
                    window.scrollTo( scroll.x, scroll.y );
                };
            } else {
                var originalScroll = $.getPageScroll();
                if ( originalScroll.x === scroll.x &&
                    originalScroll.y === scroll.y ) {
                    // We are already correctly positioned and there
                    // is no way to detect the correct method.
                    return;
                }

                document.body.scrollLeft = scroll.x;
                document.body.scrollTop = scroll.y;
                var currentScroll = $.getPageScroll();
                if ( currentScroll.x !== originalScroll.x &&
                    currentScroll.y !== originalScroll.y ) {
                    $.setPageScroll = function( scroll ) {
                        document.body.scrollLeft = scroll.x;
                        document.body.scrollTop = scroll.y;
                    };
                    return;
                }

                document.documentElement.scrollLeft = scroll.x;
                document.documentElement.scrollTop = scroll.y;
                currentScroll = $.getPageScroll();
                if ( currentScroll.x !== originalScroll.x &&
                    currentScroll.y !== originalScroll.y ) {
                    $.setPageScroll = function( scroll ) {
                        document.documentElement.scrollLeft = scroll.x;
                        document.documentElement.scrollTop = scroll.y;
                    };
                    return;
                }

                // We can't find anything working, so we do nothing.
                $.setPageScroll = function( scroll ) {
                };
            }

            $.setPageScroll( scroll );
        },

        /**
         * Determines the size of the browsers window.
         * @function
         * @returns {OpenSeadragon.Point}
         */
        getWindowSize: function() {
            var docElement = document.documentElement || {},
                body    = document.body || {};

            if ( typeof ( window.innerWidth ) === 'number' ) {
                $.getWindowSize = function(){
                    return new $.Point(
                        window.innerWidth,
                        window.innerHeight
                    );
                };
            } else if ( docElement.clientWidth || docElement.clientHeight ) {
                $.getWindowSize = function(){
                    return new $.Point(
                        document.documentElement.clientWidth,
                        document.documentElement.clientHeight
                    );
                };
            } else if ( body.clientWidth || body.clientHeight ) {
                $.getWindowSize = function(){
                    return new $.Point(
                        document.body.clientWidth,
                        document.body.clientHeight
                    );
                };
            } else {
                throw new Error("Unknown window size, no known technique.");
            }

            return $.getWindowSize();
        },


        /**
         * Wraps the given element in a nest of divs so that the element can
         * be easily centered using CSS tables
         * @function
         * @param {Element|String} element
         * @returns {Element} outermost wrapper element
         */
        makeCenteredNode: function( element ) {
            // Convert a possible ID to an actual HTMLElement
            element = $.getElement( element );

            /*
                CSS tables require you to have a display:table/row/cell hierarchy so we need to create
                three nested wrapper divs:
             */

            var wrappers = [
                $.makeNeutralElement( 'div' ),
                $.makeNeutralElement( 'div' ),
                $.makeNeutralElement( 'div' )
            ];

            // It feels like we should be able to pass style dicts to makeNeutralElement:
            $.extend(wrappers[0].style, {
                display: "table",
                height: "100%",
                width: "100%"
            });

            $.extend(wrappers[1].style, {
                display: "table-row"
            });

            $.extend(wrappers[2].style, {
                display: "table-cell",
                verticalAlign: "middle",
                textAlign: "center"
            });

            wrappers[0].appendChild(wrappers[1]);
            wrappers[1].appendChild(wrappers[2]);
            wrappers[2].appendChild(element);

            return wrappers[0];
        },


        /**
         * Creates an easily positionable element of the given type that therefor
         * serves as an excellent container element.
         * @function
         * @param {String} tagName
         * @returns {Element}
         */
        makeNeutralElement: function( tagName ) {
            var element = document.createElement( tagName ),
                style   = element.style;

            style.background = "transparent none";
            style.border     = "none";
            style.margin     = "0px";
            style.padding    = "0px";
            style.position   = "static";

            return element;
        },


        /**
         * Returns the current milliseconds, using Date.now() if available
         * @function
         */
        now: function( ) {
            if (Date.now) {
                $.now = Date.now;
            } else {
                $.now = function() {
                    return new Date().getTime();
                };
            }

            return $.now();
        },


        /**
         * Ensures an image is loaded correctly to support alpha transparency.
         * @function
         * @param {String} src
         * @returns {Element}
         */
        makeTransparentImage: function( src ) {
            var img = $.makeNeutralElement( "img" );

            img.src = src;

            return img;
        },


        /**
         * Sets the opacity of the specified element.
         * @function
         * @param {Element|String} element
         * @param {Number} opacity
         * @param {Boolean} [usesAlpha]
         */
        setElementOpacity: function( element, opacity, usesAlpha ) {

            var ieOpacity,
                ieFilter;

            element = $.getElement( element );

            if ( usesAlpha && !$.Browser.alpha ) {
                opacity = Math.round( opacity );
            }

            if ( $.Browser.opacity ) {
                element.style.opacity = opacity < 1 ? opacity : "";
            } else {
                if ( opacity < 1 ) {
                    ieOpacity = Math.round( 100 * opacity );
                    ieFilter  = "alpha(opacity=" + ieOpacity + ")";
                    element.style.filter = ieFilter;
                } else {
                    element.style.filter = "";
                }
            }
        },


        /**
         * Sets the specified element's touch-action style attribute to 'none'.
         * @function
         * @param {Element|String} element
         */
        setElementTouchActionNone: function( element ) {
            element = $.getElement( element );
            if ( typeof element.style.touchAction !== 'undefined' ) {
                element.style.touchAction = 'none';
            } else if ( typeof element.style.msTouchAction !== 'undefined' ) {
                element.style.msTouchAction = 'none';
            }
        },


        /**
         * Sets the specified element's pointer-events style attribute to the passed value.
         * @function
         * @param {Element|String} element
         * @param {String} value
         */
        setElementPointerEvents: function( element, value ) {
            element = $.getElement( element );
            if (typeof element.style !== 'undefined' && typeof element.style.pointerEvents !== 'undefined' ) {
                element.style.pointerEvents = value;
            }
        },


        /**
         * Sets the specified element's pointer-events style attribute to 'none'.
         * @function
         * @param {Element|String} element
         */
        setElementPointerEventsNone: function( element ) {
            $.setElementPointerEvents( element, 'none' );
        },


        /**
         * Add the specified CSS class to the element if not present.
         * @function
         * @param {Element|String} element
         * @param {String} className
         */
        addClass: function( element, className ) {
            element = $.getElement( element );

            if (!element.className) {
                element.className = className;
            } else if ( ( ' ' + element.className + ' ' ).
                indexOf( ' ' + className + ' ' ) === -1 ) {
                element.className += ' ' + className;
            }
        },

        /**
         * Find the first index at which an element is found in an array or -1
         * if not present.
         *
         * Code taken and adapted from
         * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf#Compatibility
         *
         * @function
         * @param {Array} array The array from which to find the element
         * @param {Object} searchElement The element to find
         * @param {Number} [fromIndex=0] Index to start research.
         * @returns {Number} The index of the element in the array.
         */
        indexOf: function( array, searchElement, fromIndex ) {
            if ( Array.prototype.indexOf ) {
                this.indexOf = function( array, searchElement, fromIndex ) {
                    return array.indexOf( searchElement, fromIndex );
                };
            } else {
                this.indexOf = function( array, searchElement, fromIndex ) {
                    var i,
                        pivot = ( fromIndex ) ? fromIndex : 0,
                        length;
                    if ( !array ) {
                        throw new TypeError( );
                    }

                    length = array.length;
                    if ( length === 0 || pivot >= length ) {
                        return -1;
                    }

                    if ( pivot < 0 ) {
                        pivot = length - Math.abs( pivot );
                    }

                    for ( i = pivot; i < length; i++ ) {
                        if ( array[i] === searchElement ) {
                            return i;
                        }
                    }
                    return -1;
                };
            }
            return this.indexOf( array, searchElement, fromIndex );
        },

        /**
         * Remove the specified CSS class from the element.
         * @function
         * @param {Element|String} element
         * @param {String} className
         */
        removeClass: function( element, className ) {
            var oldClasses,
                newClasses = [],
                i;

            element = $.getElement( element );
            oldClasses = element.className.split( /\s+/ );
            for ( i = 0; i < oldClasses.length; i++ ) {
                if ( oldClasses[ i ] && oldClasses[ i ] !== className ) {
                    newClasses.push( oldClasses[ i ] );
                }
            }
            element.className = newClasses.join(' ');
        },

        /**
         * Convert passed addEventListener() options to boolean or options object,
         * depending on browser support.
         * @function
         * @param {Boolean|Object} [options] Boolean useCapture, or if [supportsEventListenerOptions]{@link OpenSeadragon.supportsEventListenerOptions}, can be an object
         * @param {Boolean} [options.capture]
         * @param {Boolean} [options.passive]
         * @param {Boolean} [options.once]
         * @returns {String} The protocol (http:, https:, file:, ftp: ...)
         */
        normalizeEventListenerOptions: function (options) {
            var opts;
            if ( typeof options !== 'undefined' ) {
                if ( typeof options === 'boolean' ) {
                    // Legacy Boolean useCapture
                    opts = $.supportsEventListenerOptions ? { capture: options } : options;
                } else {
                    // Options object
                    opts = $.supportsEventListenerOptions ? options :
                        ( ( typeof options.capture !== 'undefined' ) ? options.capture : false );
                }
            } else {
                // No options specified - Legacy optional useCapture argument
                //   (for IE, first supported on version 9, so we'll pass a Boolean)
                opts = $.supportsEventListenerOptions ? { capture: false } : false;
            }
            return opts;
        },

        /**
         * Adds an event listener for the given element, eventName and handler.
         * @function
         * @param {Element|String} element
         * @param {String} eventName
         * @param {Function} handler
         * @param {Boolean|Object} [options] Boolean useCapture, or if [supportsEventListenerOptions]{@link OpenSeadragon.supportsEventListenerOptions}, can be an object
         * @param {Boolean} [options.capture]
         * @param {Boolean} [options.passive]
         * @param {Boolean} [options.once]
         */
        addEvent: (function () {
            if ( $.supportsAddEventListener ) {
                return function ( element, eventName, handler, options ) {
                    options = $.normalizeEventListenerOptions(options);
                    element = $.getElement( element );
                    element.addEventListener( eventName, handler, options );
                };
            } else if ( document.documentElement.attachEvent && document.attachEvent ) {
                return function ( element, eventName, handler ) {
                    element = $.getElement( element );
                    element.attachEvent( 'on' + eventName, handler );
                };
            } else {
                throw new Error( "No known event model." );
            }
        }()),


        /**
         * Remove a given event listener for the given element, event type and
         * handler.
         * @function
         * @param {Element|String} element
         * @param {String} eventName
         * @param {Function} handler
         * @param {Boolean|Object} [options] Boolean useCapture, or if [supportsEventListenerOptions]{@link OpenSeadragon.supportsEventListenerOptions}, can be an object
         * @param {Boolean} [options.capture]
         */
        removeEvent: (function () {
            if ( $.supportsRemoveEventListener ) {
                return function ( element, eventName, handler, options ) {
                    options = $.normalizeEventListenerOptions(options);
                    element = $.getElement( element );
                    element.removeEventListener( eventName, handler, options );
                };
            } else if ( document.documentElement.detachEvent && document.detachEvent ) {
                return function( element, eventName, handler ) {
                    element = $.getElement( element );
                    element.detachEvent( 'on' + eventName, handler );
                };
            } else {
                throw new Error( "No known event model." );
            }
        }()),


        /**
         * Cancels the default browser behavior had the event propagated all
         * the way up the DOM to the window object.
         * @function
         * @param {Event} [event]
         */
        cancelEvent: function( event ) {
            event.preventDefault();
        },


        /**
         * Returns true if {@link OpenSeadragon.cancelEvent|cancelEvent} has been called on
         * the event, otherwise returns false.
         * @function
         * @param {Event} [event]
         */
        eventIsCanceled: function( event ) {
            return event.defaultPrevented;
        },


        /**
         * Stops the propagation of the event through the DOM in the capturing and bubbling phases.
         * @function
         * @param {Event} [event]
         */
        stopEvent: function( event ) {
            event.stopPropagation();
        },


        /**
         * Retrieves the value of a url parameter from the window.location string.
         * @function
         * @param {String} key
         * @returns {String} The value of the url parameter or null if no param matches.
         */
        getUrlParameter: function( key ) {
            // eslint-disable-next-line no-use-before-define
            var value = URLPARAMS[ key ];
            return value ? value : null;
        },

        /**
         * Retrieves the protocol used by the url. The url can either be absolute
         * or relative.
         * @function
         * @private
         * @param {String} url The url to retrieve the protocol from.
         * @returns {String} The protocol (http:, https:, file:, ftp: ...)
         */
        getUrlProtocol: function( url ) {
            var match = url.match(/^([a-z]+:)\/\//i);
            if ( match === null ) {
                // Relative URL, retrive the protocol from window.location
                return window.location.protocol;
            }
            return match[1].toLowerCase();
        },

        /**
         * Create an XHR object
         * @private
         * @param {type} [local] Deprecated. Ignored (IE/ActiveXObject file protocol no longer supported).
         * @returns {XMLHttpRequest}
         */
        createAjaxRequest: function() {
            if ( window.XMLHttpRequest ) {
                $.createAjaxRequest = function() {
                    return new XMLHttpRequest();
                };
                return new XMLHttpRequest();
            } else {
                throw new Error( "Browser doesn't support XMLHttpRequest." );
            }
        },

        /**
         * Makes an AJAX request.
         * @param {String} url - the url to request
         * @param {Function} onSuccess
         * @param {Function} onError
         * @throws {Error}
         * @returns {XMLHttpRequest}
         * @deprecated deprecated way of calling this function
         *//**
         * Makes an AJAX request.
         * @param {Object} options
         * @param {String} options.url - the url to request
         * @param {Function} options.success - a function to call on a successful response
         * @param {Function} options.error - a function to call on when an error occurs
         * @param {Object} options.headers - headers to add to the AJAX request
         * @param {String} options.responseType - the response type of the AJAX request
         * @param {String} options.postData - HTTP POST data (usually but not necessarily in k=v&k2=v2... form,
         *      see TileSource::getTilePostData), GET method used if null
         * @param {Boolean} [options.withCredentials=false] - whether to set the XHR's withCredentials
         * @throws {Error}
         * @returns {XMLHttpRequest}
         */
        makeAjaxRequest: function( url, onSuccess, onError ) {
            var withCredentials;
            var headers;
            var responseType;
            var postData;

            // Note that our preferred API is that you pass in a single object; the named
            // arguments are for legacy support.
            if( $.isPlainObject( url ) ){
                onSuccess = url.success;
                onError = url.error;
                withCredentials = url.withCredentials;
                headers = url.headers;
                responseType = url.responseType || null;
                postData = url.postData || null;
                url = url.url;
            } else {
                $.console.warn("OpenSeadragon.makeAjaxRequest() deprecated usage!");
            }

            var protocol = $.getUrlProtocol( url );
            var request = $.createAjaxRequest();

            if ( !$.isFunction( onSuccess ) ) {
                throw new Error( "makeAjaxRequest requires a success callback" );
            }

            request.onreadystatechange = function() {
                // 4 = DONE (https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#Properties)
                if ( request.readyState === 4 ) {
                    request.onreadystatechange = function(){};

                    // With protocols other than http/https, a successful request status is in
                    // the 200's on Firefox and 0 on other browsers
                    if ( (request.status >= 200 && request.status < 300) ||
                        ( request.status === 0 &&
                          protocol !== "http:" &&
                          protocol !== "https:" )) {
                        onSuccess( request );
                    } else {
                        if ( $.isFunction( onError ) ) {
                            onError( request );
                        } else {
                            $.console.error( "AJAX request returned %d: %s", request.status, url );
                        }
                    }
                }
            };

            var method = postData ? "POST" : "GET";
            try {
                request.open( method, url, true );

                if (responseType) {
                    request.responseType = responseType;
                }

                if (headers) {
                    for (var headerName in headers) {
                        if (Object.prototype.hasOwnProperty.call(headers, headerName) && headers[headerName]) {
                            request.setRequestHeader(headerName, headers[headerName]);
                        }
                    }
                }

                if (withCredentials) {
                    request.withCredentials = true;
                }

                request.send(postData);
            } catch (e) {
                $.console.error( "%s while making AJAX request: %s", e.name, e.message );

                request.onreadystatechange = function(){};

                if ( $.isFunction( onError ) ) {
                    onError( request, e );
                }
            }

            return request;
        },

        /**
         * Taken from jQuery 1.6.1
         * @function
         * @param {Object} options
         * @param {String} options.url
         * @param {Function} options.callback
         * @param {String} [options.param='callback'] The name of the url parameter
         *      to request the jsonp provider with.
         * @param {String} [options.callbackName=] The name of the callback to
         *      request the jsonp provider with.
         */
        jsonp: function( options ){
            var script,
                url     = options.url,
                head    = document.head ||
                    document.getElementsByTagName( "head" )[ 0 ] ||
                    document.documentElement,
                jsonpCallback = options.callbackName || 'openseadragon' + $.now(),
                previous      = window[ jsonpCallback ],
                replace       = "$1" + jsonpCallback + "$2",
                callbackParam = options.param || 'callback',
                callback      = options.callback;

            url = url.replace( /(=)\?(&|$)|\?\?/i, replace );
            // Add callback manually
            url += (/\?/.test( url ) ? "&" : "?") + callbackParam + "=" + jsonpCallback;

            // Install callback
            window[ jsonpCallback ] = function( response ) {
                if ( !previous ){
                    try{
                        delete window[ jsonpCallback ];
                    }catch(e){
                        //swallow
                    }
                } else {
                    window[ jsonpCallback ] = previous;
                }
                if( callback && $.isFunction( callback ) ){
                    callback( response );
                }
            };

            script = document.createElement( "script" );

            //TODO: having an issue with async info requests
            if( undefined !== options.async || false !== options.async ){
                script.async = "async";
            }

            if ( options.scriptCharset ) {
                script.charset = options.scriptCharset;
            }

            script.src = url;

            // Attach handlers for all browsers
            script.onload = script.onreadystatechange = function( _, isAbort ) {

                if ( isAbort || !script.readyState || /loaded|complete/.test( script.readyState ) ) {

                    // Handle memory leak in IE
                    script.onload = script.onreadystatechange = null;

                    // Remove the script
                    if ( head && script.parentNode ) {
                        head.removeChild( script );
                    }

                    // Dereference the script
                    script = undefined;
                }
            };
            // Use insertBefore instead of appendChild  to circumvent an IE6 bug.
            // This arises when a base node is used (#2709 and #4378).
            head.insertBefore( script, head.firstChild );

        },


        /**
         * Fully deprecated. Will throw an error.
         * @function
         * @deprecated use {@link OpenSeadragon.Viewer#open}
         */
        createFromDZI: function() {
            throw "OpenSeadragon.createFromDZI is deprecated, use Viewer.open.";
        },

        /**
         * Parses an XML string into a DOM Document.
         * @function
         * @param {String} string
         * @returns {Document}
         */
        parseXml: function( string ) {
            if ( window.DOMParser ) {

                $.parseXml = function( string ) {
                    var xmlDoc = null,
                        parser;

                    parser = new DOMParser();
                    xmlDoc = parser.parseFromString( string, "text/xml" );
                    return xmlDoc;
                };

            } else {
                throw new Error( "Browser doesn't support XML DOM." );
            }

            return $.parseXml( string );
        },

        /**
         * Parses a JSON string into a Javascript object.
         * @function
         * @param {String} string
         * @returns {Object}
         */
        parseJSON: function(string) {
            $.parseJSON = window.JSON.parse;
            return $.parseJSON(string);
        },

        /**
         * Reports whether the image format is supported for tiling in this
         * version.
         * @function
         * @param {String} [extension]
         * @returns {Boolean}
         */
        imageFormatSupported: function( extension ) {
            extension = extension ? extension : "";
            // eslint-disable-next-line no-use-before-define
            return !!FILEFORMATS[ extension.toLowerCase() ];
        },

        /**
         * Updates supported image formats with user-specified values.
         * Preexisting formats that are not being updated are left unchanged.
         * By default, the defined formats are
         * <pre><code>{
         *      avif: true,
         *      bmp:  false,
         *      jpeg: true,
         *      jpg:  true,
         *      png:  true,
         *      tif:  false,
         *      wdp:  false,
         *      webp: true
         * }
         * </code></pre>
         * @function
         * @example
         * // sets bmp as supported and png as unsupported
         * setImageFormatsSupported({bmp: true, png: false});
         * @param {Object} formats An object containing format extensions as
         * keys and booleans as values.
         */
        setImageFormatsSupported: function(formats) {
            //TODO: how to deal with this within the data pipeline?
            // $.console.warn("setImageFormatsSupported method is deprecated. You should check that" +
            //     " the system supports your TileSources by implementing corresponding data type convertors.");

            // eslint-disable-next-line no-use-before-define
            $.extend(FILEFORMATS, formats);
        },
    });


    //TODO: $.console is often used inside a try/catch block which generally
    //      prevents allowings errors to occur with detection until a debugger
    //      is attached.  Although I've been guilty of the same anti-pattern
    //      I eventually was convinced that errors should naturally propagate in
    //      all but the most special cases.
    /**
     * A convenient alias for console when available, and a simple null
     * function when console is unavailable.
     * @static
     * @private
     */
    var nullfunction = function( msg ){
        //document.location.hash = msg;
    };

    $.console = window.console || {
        log:    nullfunction,
        debug:  nullfunction,
        info:   nullfunction,
        warn:   nullfunction,
        error:  nullfunction,
        assert: nullfunction
    };


    /**
     * The current browser vendor, version, and related information regarding detected features.
     * @member {Object} Browser
     * @memberof OpenSeadragon
     * @static
     * @type {Object}
     * @property {OpenSeadragon.BROWSERS} vendor - One of the {@link OpenSeadragon.BROWSERS} enumeration values.
     * @property {Number} version
     * @property {Boolean} alpha - Does the browser support image alpha transparency.
     */
    $.Browser = {
        vendor:     $.BROWSERS.UNKNOWN,
        version:    0,
        alpha:      true
    };


    var FILEFORMATS = {
            avif: true,
            bmp:  false,
            jpeg: true,
            jpg:  true,
            png:  true,
            tif:  false,
            wdp:  false,
            webp: true
        },
        URLPARAMS = {};

    (function() {
        //A small auto-executing routine to determine the browser vendor,
        //version and supporting feature sets.
        var ver = navigator.appVersion,
            ua  = navigator.userAgent,
            regex;

        //console.error( 'appName: ' + navigator.appName );
        //console.error( 'appVersion: ' + navigator.appVersion );
        //console.error( 'userAgent: ' + navigator.userAgent );

        //TODO navigator.appName is deprecated. Should be 'Netscape' for all browsers
        //  but could be dropped at any time
        //  See https://developer.mozilla.org/en-US/docs/Web/API/Navigator/appName
        //      https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent
        switch( navigator.appName ){
            case "Microsoft Internet Explorer":
                if( !!window.attachEvent &&
                    !!window.ActiveXObject ) {

                    $.Browser.vendor = $.BROWSERS.IE;
                    $.Browser.version = parseFloat(
                        ua.substring(
                            ua.indexOf( "MSIE" ) + 5,
                            ua.indexOf( ";", ua.indexOf( "MSIE" ) ) )
                        );
                }
                break;
            case "Netscape":
                if (window.addEventListener) {
                    if ( ua.indexOf( "Edge" ) >= 0 ) {
                        $.Browser.vendor = $.BROWSERS.EDGE;
                        $.Browser.version = parseFloat(
                            ua.substring( ua.indexOf( "Edge" ) + 5 )
                        );
                    } else if ( ua.indexOf( "Edg" ) >= 0 ) {
                        $.Browser.vendor = $.BROWSERS.CHROMEEDGE;
                        $.Browser.version = parseFloat(
                            ua.substring( ua.indexOf( "Edg" ) + 4 )
                        );
                    } else if ( ua.indexOf( "Firefox" ) >= 0 ) {
                        $.Browser.vendor = $.BROWSERS.FIREFOX;
                        $.Browser.version = parseFloat(
                            ua.substring( ua.indexOf( "Firefox" ) + 8 )
                        );
                    } else if ( ua.indexOf( "Safari" ) >= 0 ) {
                        $.Browser.vendor = ua.indexOf( "Chrome" ) >= 0 ?
                            $.BROWSERS.CHROME :
                            $.BROWSERS.SAFARI;
                        $.Browser.version = parseFloat(
                            ua.substring(
                                ua.substring( 0, ua.indexOf( "Safari" ) ).lastIndexOf( "/" ) + 1,
                                ua.indexOf( "Safari" )
                            )
                        );
                    } else {
                        regex = new RegExp( "Trident/.*rv:([0-9]{1,}[.0-9]{0,})");
                        if ( regex.exec( ua ) !== null ) {
                            $.Browser.vendor = $.BROWSERS.IE;
                            $.Browser.version = parseFloat( RegExp.$1 );
                        }
                    }
                }
                break;
            case "Opera":
                $.Browser.vendor = $.BROWSERS.OPERA;
                $.Browser.version = parseFloat( ver );
                break;
        }

            // ignore '?' portion of query string
        var query = window.location.search.substring( 1 ),
            parts = query.split('&'),
            part,
            sep,
            i;

        for ( i = 0; i < parts.length; i++ ) {
            part = parts[ i ];
            sep  = part.indexOf( '=' );

            if ( sep > 0 ) {
                var key = part.substring( 0, sep ),
                    value = part.substring( sep + 1 );
                try {
                    URLPARAMS[ key ] = decodeURIComponent( value );
                } catch (e) {
                    $.console.error( "Ignoring malformed URL parameter: %s=%s", key, value );
                }
            }
        }

        //determine if this browser supports image alpha transparency
        $.Browser.alpha = !(
            $.Browser.vendor === $.BROWSERS.CHROME && $.Browser.version < 2
        );

        //determine if this browser supports element.style.opacity
        $.Browser.opacity = true;

        if ( $.Browser.vendor === $.BROWSERS.IE ) {
            $.console.error('Internet Explorer is not supported by OpenSeadragon');
        }
    })();


    // Adding support for HTML5's requestAnimationFrame as suggested by acdha.
    // Implementation taken from matt synder's post here:
    // http://mattsnider.com/cross-browser-and-legacy-supported-requestframeanimation/
    (function( w ) {

        // most browsers have an implementation
        var requestAnimationFrame = w.requestAnimationFrame ||
            w.mozRequestAnimationFrame ||
            w.webkitRequestAnimationFrame ||
            w.msRequestAnimationFrame;

        var cancelAnimationFrame = w.cancelAnimationFrame ||
            w.mozCancelAnimationFrame ||
            w.webkitCancelAnimationFrame ||
            w.msCancelAnimationFrame;

        // polyfill, when necessary
        if ( requestAnimationFrame && cancelAnimationFrame ) {
            // We can't assign these window methods directly to $ because they
            // expect their "this" to be "window", so we call them in wrappers.
            $.requestAnimationFrame = function(){
                return requestAnimationFrame.apply( w, arguments );
            };
            $.cancelAnimationFrame = function(){
                return cancelAnimationFrame.apply( w, arguments );
            };
        } else {
            var aAnimQueue = [],
                processing = [],
                iRequestId = 0,
                iIntervalId;

            // create a mock requestAnimationFrame function
            $.requestAnimationFrame = function( callback ) {
                aAnimQueue.push( [ ++iRequestId, callback ] );

                if ( !iIntervalId ) {
                    iIntervalId = setInterval( function() {
                        if ( aAnimQueue.length ) {
                            var time = $.now();
                            // Process all of the currently outstanding frame
                            // requests, but none that get added during the
                            // processing.
                            // Swap the arrays so we don't have to create a new
                            // array every frame.
                            var temp = processing;
                            processing = aAnimQueue;
                            aAnimQueue = temp;
                            while ( processing.length ) {
                                processing.shift()[ 1 ]( time );
                            }
                        } else {
                            // don't continue the interval, if unnecessary
                            clearInterval( iIntervalId );
                            iIntervalId = undefined;
                        }
                    }, 1000 / 50);  // estimating support for 50 frames per second
                }

                return iRequestId;
            };

            // create a mock cancelAnimationFrame function
            $.cancelAnimationFrame = function( requestId ) {
                // find the request ID and remove it
                var i, j;
                for ( i = 0, j = aAnimQueue.length; i < j; i += 1 ) {
                    if ( aAnimQueue[ i ][ 0 ] === requestId ) {
                        aAnimQueue.splice( i, 1 );
                        return;
                    }
                }

                // If it's not in the queue, it may be in the set we're currently
                // processing (if cancelAnimationFrame is called from within a
                // requestAnimationFrame callback).
                for ( i = 0, j = processing.length; i < j; i += 1 ) {
                    if ( processing[ i ][ 0 ] === requestId ) {
                        processing.splice( i, 1 );
                        return;
                    }
                }
            };
        }
    })( window );

    /**
     * @private
     * @inner
     * @function
     * @param {Element} element
     * @param {Boolean} [isFixed]
     * @returns {Element}
     */
    function getOffsetParent( element, isFixed ) {
        if ( isFixed && element !== document.body ) {
            return document.body;
        } else {
            return element.offsetParent;
        }
    }

    /**
     * @template T
     * @typedef {function(): OpenSeadragon.Promise<T>} AsyncNullaryFunction
     * Represents an asynchronous function that takes no arguments and returns a promise of type T.
     */

    /**
     * @template T, A
     * @typedef {function(A): OpenSeadragon.Promise<T>} AsyncUnaryFunction
     * Represents an asynchronous function that:
     * @param {A} arg - The single argument of type A.
     * @returns {OpenSeadragon.Promise<T>} A promise that resolves to a value of type T.
     */

    /**
     * @template T, A, B
     * @typedef {function(A, B): OpenSeadragon.Promise<T>} AsyncBinaryFunction
     * Represents an asynchronous function that:
     * @param {A} arg1 - The first argument of type A.
     * @param {B} arg2 - The second argument of type B.
     * @returns {OpenSeadragon.Promise<T>} A promise that resolves to a value of type T.
     */

    /**
     * Promise proxy in OpenSeadragon, enables $.supportsAsync feature.
     * This proxy is also necessary because OperaMini does not implement Promises (checks fail).
     * @type {PromiseConstructor}
     */
    $.Promise = window["Promise"] && $.supportsAsync ? window["Promise"] : class {
        constructor(handler) {
            this._error = false;
            this.__value = undefined;

            try {
                // Make sure to unwrap all nested promises!
                handler(
                    (value) => {
                        while (value instanceof $.Promise) {
                            value = value._value;
                        }
                        this._value = value;
                    },
                    (error) => {
                        while (error instanceof $.Promise) {
                            error = error._value;
                        }
                        this._value = error;
                        this._error = true;
                    }
                );
            } catch (e) {
                this._value = e;
                this._error = true;
            }
        }

        then(handler) {
            if (!this._error) {
                try {
                    this._value = handler(this._value);
                } catch (e) {
                    this._value = e;
                    this._error = true;
                }
            }
            return this;
        }

        catch(handler) {
            if (this._error) {
                try {
                    this._value = handler(this._value);
                    this._error = false;
                } catch (e) {
                    this._value = e;
                    this._error = true;
                }
            }
            return this;
        }

        get _value() {
            return this.__value;
        }
        set _value(val) {
            if (val && val.constructor === this.constructor) {
                val = val._value; //unwrap
            }
            this.__value = val;
        }

        static resolve(value) {
            return new this((resolve) => resolve(value));
        }

        static reject(error) {
            return new this((_, reject) => reject(error));
        }

        static all(functions) {
            return new this((resolve) => {
                // no async support, just execute them
                return resolve(functions.map(fn => fn()));
            });
        }

        static race(functions) {
            if (functions.length < 1) {
                return this.resolve();
            }
            // no async support, just execute the first
            return new this((resolve) => {
                return resolve(functions[0]());
            });
        }
    };
}(OpenSeadragon));


// Universal Module Definition, supports CommonJS, AMD and simple script tag
(function (root, $) {
    if (typeof define === 'function' && define.amd) {
        // expose as amd module
        define([], function () {
            return $;
        });
    } else if (typeof module === 'object' && module.exports) {
        // expose as commonjs module
        module.exports = $;
    } else {
        if (!root) {
            root = typeof window === 'object' && window;
            if (!root) {
                $.console.error("OpenSeadragon must run in browser environment!");
            }
        }
        // expose as window.OpenSeadragon
        root.OpenSeadragon = $;
    }
}(this, OpenSeadragon));
