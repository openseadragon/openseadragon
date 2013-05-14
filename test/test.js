(function() {

    // ----------
    window.Util = {
        // ----------
        simulateViewerClick: function(viewer, widthFactor, heightFactor) {
            if (widthFactor === undefined) {
                widthFactor = 0.5;
            }
            
            if (heightFactor === undefined) {
                heightFactor = 0.5;
            }

            widthFactor = Math.min(1, Math.max(0, widthFactor));
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

        // ----------
        timeWatcher: function(time) {
            time = time || 2000;
            var finished = false;

            setTimeout(function() {
                if (!finished) {
                    finished = true;
                    ok(false, 'finishes in ' + time + 'ms');
                    start();
                }
            }, time);

            return {
                done: function() {
                    if (!finished) {
                        finished = true;
                        start();
                    }
                }
            };
        }
    };

})();
