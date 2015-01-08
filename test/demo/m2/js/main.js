/* globals $, App */

(function() {
    // ----------
    window.App = {
        // ----------
        init: function() {
            var self = this;

            var count = 50;

            this.mode = 'none';
            this.pageBuffer = 0.05;
            this.page = 0;
            this.modeNames = [
                'thumbs',
                'scroll',
                'book',
                'page'
            ];

            var tileSource = {
                Image: {
                    xmlns: "http://schemas.microsoft.com/deepzoom/2008",
                    Url: "http://openseadragon.github.io/example-images/highsmith/highsmith_files/",
                    Format: "jpg",
                    Overlap: "2",
                    TileSize: "256",
                    Size: {
                        Height: "9221",
                        Width:  "7026"
                    }
                }
            };

            var tileSources = [];
            for (var i = 0; i < count; i++) {
                tileSources.push(tileSource);
            }

            this.viewer = OpenSeadragon({
                id: "contentDiv",
                prefixUrl: "../../../build/openseadragon/images/",
                tileSources: tileSources
            });

            this.viewer.addHandler('open', function() {
                self.setMode('thumbs');
            });

            $.each(this.modeNames, function(i, v) {
                $('.' + v).click(function() {
                    self.setMode(v);
                });
            });

            $('.next').click(function() {
                var page = self.page + (self.mode === 'book' ? 2 : 1);
                if (self.mode === 'book' && page % 2 === 0 && page !== 0) {
                    page --;
                }

                self.goToPage(page);
            });

            $('.previous').click(function() {
                var page = self.page - (self.mode === 'book' ? 2 : 1);
                if (self.mode === 'book' && page % 2 === 0 && page !== 0) {
                    page --;
                }

                self.goToPage(page);
            });

            this.update();
        },

        // ----------
        update: function() {
            var self = this;

            $('.nav').toggle(this.mode === 'book' || this.mode === 'page');
            $('.previous').toggleClass('hidden', this.page <= 0);
            $('.next').toggleClass('hidden', this.page >= this.viewer.world.getItemCount() - 1);

            $.each(this.modeNames, function(i, v) {
                $('.' + v).toggleClass('active', v === self.mode);
            });
        },

        // ----------
        setMode: function(mode) {
            if (this.mode === mode) {
                return;
            }

            this.mode = mode;

            if (this.mode === 'thumbs') {
                this.doThumbnails();
            }

            if (this.mode === 'scroll') {
                this.doScroll();
            }

            if (this.mode === 'book') {
                this.doBook();
            }

            if (this.mode === 'page') {
                this.doPage();
            }

            this.update();
        },

        // ----------
        goToPage: function(page) {
            if (page < 0 || page >= this.viewer.world.getItemCount()) {
                return;
            }

            this.page = page;

            var bounds = this.viewer.world.getItemAt(this.page).getBounds();
            var x = bounds.x;
            var y = bounds.y;
            var width = bounds.width;
            var height = bounds.height;

            if (this.mode === 'book') {
                var item;
                if (this.page % 2) { // First in a pair
                    item = this.viewer.world.getItemAt(this.page + 1);
                    if (item) {
                        width += item.getBounds().width;
                    }
                } else {
                    item = this.viewer.world.getItemAt(this.page - 1);
                    if (item) {
                        var box = item.getBounds();
                        x -= width;
                        width += box.width;
                    }
                }
            }

            x -= this.pageBuffer;
            y -= this.pageBuffer;
            width += (this.pageBuffer * 2);
            height += (this.pageBuffer * 2);
            this.viewer.viewport.fitBounds(new OpenSeadragon.Rect(x, y, width, height));

            this.update();
        },

        // ----------
        doLayout: function(config) {
            var count = this.viewer.world.getItemCount();
            var x = 0;
            var y = 0;

            var item;
            for (var i = 0; i < count; i++) {
                item = this.viewer.world.getItemAt(i);
                item.setPosition(new OpenSeadragon.Point(x, y));
                if (config.columns && i % config.columns === config.columns - 1) {
                    x = 0;
                    y += item.getBounds().height + config.buffer;
                } else {
                    if (!config.book || i % 2 === 0) {
                        x += config.buffer;
                    }

                    x += 1;
                }
            }
        },

        // ----------
        doThumbnails: function() {
            var viewerWidth = $(this.viewer.element).width();
            var viewerHeight = $(this.viewer.element).height();
            var columns = Math.floor(viewerWidth / 150);
            var buffer = 0.2;
            this.doLayout({
                columns: columns,
                buffer: buffer
            });

            var width = columns + (buffer * (columns + 1));
            var height = width * (viewerHeight / viewerWidth);

            this.viewer.viewport.fitBounds(new OpenSeadragon.Rect(-buffer, -buffer, width, height));
        },

        // ----------
        doScroll: function() {
            var viewerWidth = $(this.viewer.element).width();
            var viewerHeight = $(this.viewer.element).height();
            var buffer = 0.05;

            this.doLayout({
                buffer: buffer
            });

            var height = this.viewer.world.getItemAt(0).getBounds().height;
            height += buffer * 2;
            var width = height * (viewerWidth / viewerHeight);

            this.viewer.viewport.fitBounds(new OpenSeadragon.Rect(-buffer, -buffer, width, height));
        },

        // ----------
        doBook: function() {
            this.doLayout({
                buffer: 0.2,
                book: true
            });

            this.goToPage(this.page);
        },

        // ----------
        doPage: function() {
            this.doLayout({
                buffer: 2
            });

            this.goToPage(this.page);
        }
    };

    // ----------
    $(document).ready(function() {
        App.init();
    });
})();
