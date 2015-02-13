/* global App, $ */
(function() {

    // ----------
    var component = App.Page = function(config) {
        this.label = config.label;
        this.tileSource = config.tileSource;
        this.alternates = config.alternates;
        this.pageIndex = config.pageIndex;
        this.details = config.details;
        this.alternateIndex = -1;
    };

    // ----------
    component.prototype = {
        // ----------
        selectAlternate: function(index) {
            var self = this;

            if (index === this.alternateIndex) {
                return;
            }

            var tileSource = (index === -1 ? this.tileSource : this.alternates[index].tileSource);

            var tiledImage = App.viewer.world.getItemAt(this.pageIndex);
            var bounds = tiledImage.getBounds();

            App.viewer.world.removeItem(tiledImage);
            App.viewer.addTiledImage({
                tileSource: tileSource,
                x: bounds.x,
                y: bounds.y,
                height: bounds.height,
                index: this.pageIndex,
                success: function(event) {
                    self.tiledImage = event.item;
                }
            });

            this.alternateIndex = index;
        },

        // ----------
        addDetails: function() {
            var self = this;

            if (!this.details) {
                return;
            }

            $.each(this.details, function(i, v) {
                App.viewer.addTiledImage({
                    tileSource: v.tileSource,
                    success: function(event) {
                        v.tiledImage = event.item;
                        var bounds = self.tiledImage.getBounds();
                        self.placeDetail(v, bounds.getTopLeft(), bounds.width, true);
                    }
                });
            });
        },

        // ----------
        place: function(position, width, immediately) {
            var self = this;

            this.tiledImage.setPosition(position, immediately);
            this.tiledImage.setWidth(width, immediately);

            if (this.details) {
                $.each(this.details, function(i, v) {
                    if (v.tiledImage) {
                        self.placeDetail(v, position, width, immediately);
                    }
                });
            }
        },

        // ----------
        placeDetail: function(detail, masterPosition, masterWidth, immediately) {
            var position = new OpenSeadragon.Point(
                masterPosition.x + (masterWidth * detail.x),
                masterPosition.y + (masterWidth * detail.y));

            detail.tiledImage.setPosition(position, immediately);
            detail.tiledImage.setWidth(masterWidth * detail.width, immediately);
        }
    };

})();
