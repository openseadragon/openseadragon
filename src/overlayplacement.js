
(function( $ ){
    
    $.OverlayPlacement = function() {
        throw Error.invalidOperation();
    };

    $.OverlayPlacement = {
        CENTER: 0,
        TOP_LEFT: 1,
        TOP: 2,
        TOP_RIGHT: 3,
        RIGHT: 4,
        BOTTOM_RIGHT: 5,
        BOTTOM: 6,
        BOTTOM_LEFT: 7,
        LEFT: 8
    };

}( OpenSeadragon ));
