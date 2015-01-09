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
                autoResize: false,
                // animationTime: 10,
                // springStiffness: 2,
                tileSources: tileSources
            });

            this.viewer.addHandler('open', function() {
                self.$el = $(self.viewer.element);
                self.setMode('thumbs');
            });

            this.viewer.addHandler('canvas-click', function(event) {
                if (self.mode !== 'thumbs' || !event.quick) {
                    return;
                }

                var pos = self.viewer.viewport.pointFromPixel(event.position);
                var count = self.viewer.world.getItemCount();
                var item, box;

                for (var i = 0; i < count; i++) {
                    item = self.viewer.world.getItemAt(i);
                    box = item.getBounds();
                    if (pos.x > box.x && pos.y > box.y && pos.x < box.x + box.width &&
                            pos.y < box.y + box.height) {
                        self.setMode('page', i);
                        break;
                    }
                }
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
        setMode: function(mode, page) {
            var self = this;

            if (this.mode === mode) {
                if (page !== undefined) {
                    this.goToPage(page);
                }

                return;
            }

            this.mode = mode;

            if (page !== undefined) {
                this.page = page; // Need to do this before layout
            }

            var oldSize = new OpenSeadragon.Point(this.$el.width(), this.$el.height());
            var oldBounds = this.viewer.viewport.getBounds();
            var scrollTop = $(window).scrollTop();
            var scrollMax = $(document).height() - $(window).height();
            var scrollFactor = (scrollMax > 0 ? scrollTop / scrollMax : 0);

            if (this.mode === 'thumbs') {
                this.viewer.gestureSettingsMouse.scrollToZoom = false;
                this.viewer.zoomPerClick = 1;
                $('.openseadragon1')
                    .addClass('thumbs')
                    .removeClass('full')
                    .css({
                        height: 2000
                    });
            } else {
                this.viewer.gestureSettingsMouse.scrollToZoom = true;
                this.viewer.zoomPerClick = 2;
                $('.openseadragon1')
                    .addClass('full')
                    .removeClass('thumbs')
                    .css({
                        height: 'auto'
                    });
            }

            var newSize = new OpenSeadragon.Point(this.$el.width(), this.$el.height());
            if (oldSize.x !== newSize.x || oldSize.y !== newSize.y) {
                this.viewer.viewport.resize(newSize, false);
                var newBounds = this.viewer.viewport.getBounds();
                var box = oldBounds.clone();
                box.height = box.width * (newBounds.height / newBounds.width);

                var boxMax = oldBounds.height - box.height;
                box.y += boxMax * scrollFactor;
                this.viewer.viewport.fitBounds(box, true);
                this.viewer.viewport.update();
            }

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

            if (page !== undefined) {
                this.goToPage(page); // Need to do this after layout; does the zoom/pan
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
            var points = [];

            var item;
            for (var i = 0; i < count; i++) {
                item = this.viewer.world.getItemAt(i);
                points.push(new OpenSeadragon.Point(x, y));
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

            var tl = this.viewer.world.getItemAt(this.page).getBounds().getTopLeft();
            var offset = tl.minus(points[this.page]);
            for (i = 0; i < count; i++) {
                item = this.viewer.world.getItemAt(i);
                item.setPosition(points[i].plus(offset));
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

            var bounds = this.viewer.world.getItemAt(0).getBounds();
            var x = bounds.x - buffer;
            var y = bounds.y - buffer;
            var width = columns + (buffer * (columns + 1));
            var height = width * (viewerHeight / viewerWidth);

            this.viewer.viewport.fitBounds(new OpenSeadragon.Rect(x, y, width, height));
        },

        // ----------
        doScroll: function() {
            var viewerWidth = $(this.viewer.element).width();
            var viewerHeight = $(this.viewer.element).height();
            var buffer = 0.05;

            this.doLayout({
                buffer: buffer
            });

            var bounds = this.viewer.world.getItemAt(0).getBounds();
            var x = bounds.x - buffer;
            var y = bounds.y - buffer;
            var height = bounds.height + (buffer * 2);
            var width = height * (viewerWidth / viewerHeight);

            this.viewer.viewport.fitBounds(new OpenSeadragon.Rect(x, y, width, height));
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
