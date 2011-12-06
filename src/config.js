
(function( $ ){
    
$.Config = function () {

    this.debugMode = true;

    this.animationTime = 1.5;

    this.blendTime = 0.5;

    this.alwaysBlend = false;

    this.autoHideControls = true;

    this.immediateRender = false;

    this.wrapHorizontal = false;

    this.wrapVertical = false;

    this.minZoomImageRatio = 0.8;

    this.maxZoomPixelRatio = 2;

    this.visibilityRatio = 0.5;

    this.springStiffness = 5.0;

    this.imageLoaderLimit = 2;

    this.clickTimeThreshold = 200;

    this.clickDistThreshold = 5;

    this.zoomPerClick = 2.0;

    this.zoomPerScroll = 1.2;

    this.zoomPerSecond = 2.0;

    this.showNavigationControl = true;

    this.maxImageCacheCount = 100;

    this.minPixelRatio = 0.5;

    this.mouseNavEnabled = true;

    this.navImages = {
        zoomIn: {
            REST: '/Scripts/images/zoomin_rest.png',
            GROUP: '/Scripts/images/zoomin_grouphover.png',
            HOVER: '/Scripts/images/zoomin_hover.png',
            DOWN: '/Scripts/images/zoomin_pressed.png'
        },
        zoomOut: {
            REST: '/Scripts/images/zoomout_rest.png',
            GROUP: '/Scripts/images/zoomout_grouphover.png',
            HOVER: '/Scripts/images/zoomout_hover.png',
            DOWN: '/Scripts/images/zoomout_pressed.png'
        },
        home: {
            REST: '/Scripts/images/home_rest.png',
            GROUP: '/Scripts/images/home_grouphover.png',
            HOVER: '/Scripts/images/home_hover.png',
            DOWN: '/Scripts/images/home_pressed.png'
        },
        fullpage: {
            REST: '/Scripts/images/fullpage_rest.png',
            GROUP: '/Scripts/images/fullpage_grouphover.png',
            HOVER: '/Scripts/images/fullpage_hover.png',
            DOWN: '/Scripts/images/fullpage_pressed.png'
        }
    }
};

}( OpenSeadragon ));
