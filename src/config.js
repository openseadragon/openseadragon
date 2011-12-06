
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
            REST: '/images/zoomin_rest.png',
            GROUP: '/images/zoomin_grouphover.png',
            HOVER: '/images/zoomin_hover.png',
            DOWN: '/images/zoomin_pressed.png'
        },
        zoomOut: {
            REST: '/images/zoomout_rest.png',
            GROUP: '/images/zoomout_grouphover.png',
            HOVER: '/images/zoomout_hover.png',
            DOWN: '/images/zoomout_pressed.png'
        },
        home: {
            REST: '/images/home_rest.png',
            GROUP: '/images/home_grouphover.png',
            HOVER: '/images/home_hover.png',
            DOWN: '/images/home_pressed.png'
        },
        fullpage: {
            REST: '/images/fullpage_rest.png',
            GROUP: '/images/fullpage_grouphover.png',
            HOVER: '/images/fullpage_hover.png',
            DOWN: '/images/fullpage_pressed.png'
        }
    }
};

}( OpenSeadragon ));
