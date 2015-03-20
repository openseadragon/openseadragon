/* global App, $ */
(function() {

    // ----------
    var component = App.Page = function(config) {
        this.label = config.label;
        this.alternates = config.alternates;
        this.pageIndex = config.pageIndex;
        this.details = config.details;

        if (config.masterWidth && config.masterHeight) {
            this.bounds = new OpenSeadragon.Rect(0, 0, config.masterWidth, config.masterHeight);
        }

        this.starter = {
            x: config.x,
            y: config.y,
            width: config.width,
            tileSource: config.tileSource
        };

        if (config.clip) {
            this.starter.clip = new OpenSeadragon.Rect(config.clip.x, config.clip.y,
                config.clip.width, config.clip.height);
        }

        this.main = {};

        this.alternateIndex = -1;
    };

    // ----------
    component.prototype = {
        // ----------
        setTiledImage: function(tiledImage) {
            this.setDetail(this.main, this.starter, tiledImage);

            if (!this.bounds) {
                this.bounds = this.main.tiledImage.getBounds();
            }
        },

        // ----------
        setDetail: function(detail, info, tiledImage) {
            detail.tiledImage = tiledImage;
            detail.x = info.x || 0;
            detail.y = info.y || 0;
            detail.width = info.width || 1;
        },

        // ----------
        selectAlternate: function(index) {
            var self = this;

            if (index === this.alternateIndex) {
                return;
            }

            var itemInfo = (index === -1 ? this.starter : this.alternates[index]);

            App.viewer.world.removeItem(this.main.tiledImage);
            App.viewer.addTiledImage({
                tileSource: itemInfo.tileSource,
                clip: itemInfo.clip,
                index: this.pageIndex,
                success: function(event) {
                    self.setDetail(self.main, itemInfo, event.item);
                    self.placeDetail(self.main, true);
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
                if (v.tiledImage) {
                    return;
                }

                App.viewer.addTiledImage({
                    tileSource: v.tileSource,
                    clip: v.clip,
                    success: function(event) {
                        v.tiledImage = event.item;
                        self.placeDetail(v, true);
                    }
                });
            });
        },

        // ----------
        removeDetails: function() {
            var self = this;

            if (!this.details) {
                return;
            }

            $.each(this.details, function(i, v) {
                if (v.tiledImage) {
                    App.viewer.world.removeItem(v.tiledImage);
                    delete v.tiledImage;
                }
            });
        },

        // ----------
        hitTest: function(pos) {
            if (!this.details) {
                return this.main.tiledImage;
            }

            var count = this.details.length;
            var detail, box;

            for (var i = 0; i < count; i++) {
                detail = this.details[i];
                if (!detail.tiledImage) {
                    continue;
                }

                box = detail.tiledImage.getBounds();
                if (pos.x > box.x && pos.y > box.y && pos.x < box.x + box.width &&
                        pos.y < box.y + box.height) {
                    return detail.tiledImage;
                }
            }

            return this.main.tiledImage;
        },

        // ----------
        getBounds: function() {
            return this.bounds.clone();
        },

        // ----------
        place: function(bounds, immediately) {
            var self = this;

            this.bounds = bounds.clone();

            this.placeDetail(this.main, immediately);

            if (this.details) {
                $.each(this.details, function(i, v) {
                    if (v.tiledImage) {
                        self.placeDetail(v, immediately);
                    }
                });
            }
        },

        // ----------
        placeDetail: function(detail, immediately) {
            var position = new OpenSeadragon.Point(
                this.bounds.x + (this.bounds.width * detail.x),
                this.bounds.y + (this.bounds.width * detail.y));

            detail.tiledImage.setPosition(position, immediately);
            detail.tiledImage.setWidth(this.bounds.width * detail.width, immediately);
        }
    };

})();
