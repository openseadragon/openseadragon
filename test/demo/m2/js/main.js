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
            this.bigBuffer = 0.2;
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

            var layout = this.createLayout();

            var oldSize = new OpenSeadragon.Point(this.$el.width(), this.$el.height());
            var oldBounds = this.viewer.viewport.getBounds();
            var scrollTop = $(window).scrollTop();
            var scrollMax = $(document).height() - $(window).height();
            var scrollFactor = (scrollMax > 0 ? scrollTop / scrollMax : 0);

            if (this.mode === 'thumbs') {
                this.viewer.gestureSettingsMouse.scrollToZoom = false;
                this.viewer.zoomPerClick = 1;
                var viewerWidth = this.$el.width();
                var width = layout.bounds.width + (this.bigBuffer * 2);
                var height = layout.bounds.height + (this.bigBuffer * 2);
                var newHeight = viewerWidth * (height / width);
                this.$el
                    .addClass('thumbs')
                    .removeClass('full')
                    .css({
                        height: newHeight
                    });
            } else {
                this.viewer.gestureSettingsMouse.scrollToZoom = true;
                this.viewer.zoomPerClick = 2;
                this.$el
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

            this.setLayout(layout);

            if (page !== undefined) {
                this.goToPage(page); // Need to do this after layout; does the zoom/pan
            } else {
                this.goHome();
            }

            this.update();
        },

        // ----------
        goToPage: function(page) {
            if (page < 0 || page >= this.viewer.world.getItemCount()) {
                return;
            }

            this.page = page;

            var viewerWidth = this.$el.width();
            var viewerHeight = this.$el.height();
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

            if (this.mode === 'scroll') {
                if (this.page === 0) {
                    x = -this.pageBuffer;
                    width = height * (viewerWidth / viewerHeight);
                } else if (this.page === this.viewer.world.getItemCount() - 1) {
                    width = height * (viewerWidth / viewerHeight);
                    x = (bounds.x + bounds.width + this.pageBuffer) - width;
                }
            }

            this.viewer.viewport.fitBounds(new OpenSeadragon.Rect(x, y, width, height));

            this.update();
        },

        // ----------
        createLayout: function() {
            var viewerWidth = this.$el.width();
            var viewerHeight = this.$el.height();
            var layoutConfig = {};

            if (this.mode === 'thumbs') {
                layoutConfig.columns = Math.floor(viewerWidth / 150);
                layoutConfig.buffer = this.bigBuffer;
            } else if (this.mode === 'scroll') {
                layoutConfig.buffer = this.pageBuffer;
            } else if (this.mode === 'book') {
                layoutConfig.book = true;
                layoutConfig.buffer = this.bigBuffer;
            } else if (this.mode === 'page') {
                layoutConfig.buffer = 2;
            }

            var layout = {
                bounds: null,
                specs: []
            };

            var count = this.viewer.world.getItemCount();
            var x = 0;
            var y = 0;
            var points = [];

            var item;
            for (var i = 0; i < count; i++) {
                item = this.viewer.world.getItemAt(i);
                points.push(new OpenSeadragon.Point(x, y));
                if (layoutConfig.columns && i % layoutConfig.columns === layoutConfig.columns - 1) {
                    x = 0;
                    y += item.getBounds().height + layoutConfig.buffer;
                } else {
                    if (!layoutConfig.book || i % 2 === 0) {
                        x += layoutConfig.buffer;
                    }

                    x += 1;
                }
            }

            var tl = this.viewer.world.getItemAt(this.page).getBounds().getTopLeft();
            var offset = tl.minus(points[this.page]);
            var box, pos;

            for (i = 0; i < count; i++) {
                item = this.viewer.world.getItemAt(i);
                box = item.getBounds();
                pos = points[i].plus(offset);
                box.x = pos.x;
                box.y = pos.y;
                layout.specs.push({
                    item: item,
                    bounds: box
                });

                if (layout.bounds) {
                    layout.bounds = this.union(layout.bounds, box);
                } else {
                    layout.bounds = box.clone();
                }
            }

            return layout;
        },

        // ----------
        setLayout: function(layout) {
            var spec;

            for (var i = 0; i < layout.specs.length; i++) {
                spec = layout.specs[i];
                spec.item.setPosition(spec.bounds.getTopLeft());
            }
        },

        // ----------
        goHome: function() {
            var viewerWidth = this.$el.width();
            var viewerHeight = this.$el.height();
            var layoutConfig = {};

            var box;
            if (this.mode === 'thumbs') {
                box = this.viewer.world.getHomeBounds();
                box.x -= this.bigBuffer;
                box.y -= this.bigBuffer;
                box.width += (this.bigBuffer * 2);
                box.height = box.width * (viewerHeight / viewerWidth);
                this.viewer.viewport.fitBounds(box);
            } else if (this.mode === 'scroll') {
                this.goToPage(this.page);
            } else if (this.mode === 'book') {
                this.goToPage(this.page);
            } else if (this.mode === 'page') {
                this.goToPage(this.page);
            }
        },

        // ----------
        doScroll: function() {
            // var bounds = this.viewer.world.getItemAt(0).getBounds();
            // var x = bounds.x - buffer;
            // var y = bounds.y - buffer;
            // var height = bounds.height + (buffer * 2);
            // var width = height * (viewerWidth / viewerHeight);
        },

        // ----------
        union: function(box1, box2) {
            var left = Math.min(box1.x, box2.x);
            var top = Math.min(box1.y, box2.y);
            var right = Math.max(box1.x + box1.width, box2.x + box2.width);
            var bottom = Math.max(box1.y + box1.height, box2.y + box2.height);

            return new OpenSeadragon.Rect(left, top, right - left, bottom - top);
        }
    };

    // ----------
    $(document).ready(function() {
        App.init();
    });
})();
