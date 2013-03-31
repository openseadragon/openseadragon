(function() {

    // ----------
    window.Util = {
        // ----------
        simulateViewerClick: function(viewer, widthFactor, heightFactor) {
            if (widthFactor === undefined) {
                widthFactor = 0.5;
            }
            
            //TODO Redefine to be the middle by default
            if (heightFactor === undefined) {
                heightFactor = 0.5;
            }

            widthFactor = Math.min(1, Math.max(0, widthFactor));
            //TODO Fix this.  The max height should be 1/AR
            heightFactor = Math.min(1, Math.max(0, heightFactor));

            var $canvas = $(viewer.element).find('.openseadragon-canvas').not('.navigator .openseadragon-canvas');
            var offset = $canvas.offset();
            var event = {
                clientX: offset.left + Math.floor($canvas.width() * widthFactor),
                clientY: offset.top + Math.floor($canvas.height() * heightFactor)
            };

            $canvas
                .simulate('mouseover', event)
                .simulate('mousedown', event)
                .simulate('mouseup', event);
        },

        simulateNavigatorClick: function(viewer, locationX, locationY) {
            var maxContentWidth = 1;
            var maxContentHeight = 1/viewer.source.aspectRatio;
            if (locationX === undefined) {
                locationX = maxContentWidth/2;
            }

            if (locationY === undefined) {
                locationY = maxContentHeight/2;
            }

            locationX = Math.min(maxContentWidth, Math.max(0, locationX));
            locationY = Math.min(maxContentHeight, Math.max(0, locationY));

            var $canvas = $(viewer.element).find('.openseadragon-canvas');
            var offset = $canvas.offset();
            var event = {
                clientX: offset.left + Math.floor($canvas.width() * locationX),
                clientY: offset.top + Math.floor($canvas.height() * locationY)
            };

            $canvas
                .simulate('mouseover', event)
                .simulate('mousedown', event)
                .simulate('mouseup', event);
        },

        simulateNavigatorDrag: function(viewer, distanceX, distanceY) {
            var maxContentWidth = 1;
            var maxContentHeight = 1/viewer.source.aspectRatio;
            if (distanceX === undefined) {
                distanceX = maxContentWidth/4;
            }

            if (distanceY === undefined) {
                distanceY = maxContentHeight/4;
            }

            distanceX = Math.min(maxContentWidth, Math.max(maxContentWidth * -1, distanceX));
            distanceY = Math.min(maxContentHeight, Math.max(maxContentHeight * -1, distanceY));

            var $canvas = $(viewer.element).find('.displayregion');
            var event = {
                dx: Math.floor($canvas.width() * distanceX),
                dy: Math.floor($canvas.height() * distanceY)
            };

            $canvas
                .simulate('drag', event);
        }


    };

})();
