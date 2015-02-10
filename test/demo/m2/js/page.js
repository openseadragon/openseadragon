/* global App */
(function() {

    // ----------
    var component = App.Page = function(config) {
        this.label = config.label;
        this.tileSource = config.tileSource;
        this.alternates = config.alternates;
        this.pageIndex = config.pageIndex;
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
        }
    };

})();
