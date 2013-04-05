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

        resetDom: function () {
            if ($('#exampleNavigator').is(':ui-dialog')) {
                $('#exampleNavigator').dialog('destroy');
            }
            $("#exampleNavigator").remove();
            $(".navigator").remove();
            $("#example").empty();
            $("#tallexample").empty();
            $("#wideexample").empty();
            $("#example").parent().append('<div id="exampleNavigator"></div>');
        },

        equalsWithVariance: function (value1, value2, variance) {
            return Math.abs(value1 - value2) <= variance;
        },


        assessNumericValue: function (value1, value2, variance, message) {
            ok(Util.equalsWithVariance(value1, value2, variance), message + " Expected:" + value1 + " Found: " + value2 + " Variance: " + variance);
        }


    };

})();
