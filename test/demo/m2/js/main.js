/* globals $, App */

(function() {
    // ----------
    window.App = {
        // ----------
        init: function() {
            var self = this;

            var count = 70;

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

            this.viewer = OpenSeadragon({
                id: "contentDiv",
                prefixUrl: "../../../build/openseadragon/images/",
                autoResize: false,
                showHomeControl: false,
                // animationTime: 10,
                // springStiffness: 2,
                tileSources: this.tileSources.slice(0, count)
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
                var result = self.hitTest(pos);
                if (result) {
                    self.setMode('page', result.index);
                }
            });

            this.viewer.addHandler('canvas-drag', function() {
                if (self.mode === 'thumbs') {
                    return;
                }

                if (self.panBounds) {
                    var center = self.viewer.viewport.getCenter();
                    var currentCenter = self.viewer.viewport.getCenter(true);
                    var viewBounds = self.viewer.viewport.getBounds();
                    var bounds = self.panBounds.clone();
                    var left = Math.min(currentCenter.x, bounds.x + (viewBounds.width / 2));
                    var top = Math.min(currentCenter.y, bounds.y + (viewBounds.height / 2));
                    var right = Math.max(currentCenter.x, (bounds.x + bounds.width) - (viewBounds.width / 2));
                    var bottom = Math.max(currentCenter.y, (bounds.y + bounds.height) - (viewBounds.height / 2));

                    var x;
                    if (left <= right) {
                        x = Math.max(left, Math.min(right, center.x));
                    } else {
                        x = bounds.x + (bounds.width / 2);
                    }

                    var y;
                    if (top <= bottom) {
                        y = Math.max(top, Math.min(bottom, center.y));
                    } else {
                        y = bounds.y + (bounds.height / 2);
                    }

                    if (x !== center.x || y !== center.y) {
                        self.viewer.viewport.panTo(new OpenSeadragon.Point(x, y));
                    }
                }

                if (self.mode === 'scroll') {
                    var result = self.hitTest(self.viewer.viewport.getCenter());
                    if (result) {
                        self.page = result.index;
                    }
                }
            });

            $.each(this.modeNames, function(i, v) {
                $('.' + v).click(function() {
                    self.setMode(v);
                });
            });

            $('.next').click(function() {
                self.next();
            });

            $('.previous').click(function() {
                self.previous();
            });

            $(window).keyup(function(event) {
                if (self.mode === 'thumbs') {
                    return;
                }

                if (event.which === 39) { // Right arrow
                    self.next();
                } else if (event.which === 37) { // Left arrow
                    self.previous();
                }
            });

            this.update();
        },

        // ----------
        next: function() {
            var page = this.page + (this.mode === 'book' ? 2 : 1);
            if (this.mode === 'book' && page % 2 === 0 && page !== 0) {
                page --;
            }

            this.goToPage(page);
        },

        // ----------
        previous: function() {
            var page = this.page - (this.mode === 'book' ? 2 : 1);
            if (this.mode === 'book' && page % 2 === 0 && page !== 0) {
                page --;
            }

            this.goToPage(page);
        },

        // ----------
        hitTest: function(pos) {
            var count = this.viewer.world.getItemCount();
            var item, box;

            for (var i = 0; i < count; i++) {
                item = this.viewer.world.getItemAt(i);
                box = item.getBounds();
                if (pos.x > box.x && pos.y > box.y && pos.x < box.x + box.width &&
                        pos.y < box.y + box.height) {
                    return {
                        item: item,
                        index: i
                    };
                }
            }

            return null;
        },

        // ----------
        update: function() {
            var self = this;

            $('.nav').toggle(this.mode === 'scroll' || this.mode === 'book' || this.mode === 'page');
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
                this.viewer.panHorizontal = false;
                this.viewer.panVertical = false;
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
                this.viewer.panHorizontal = true;
                this.viewer.panVertical = true;
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

            this.viewer.viewport.minZoomLevel = this.viewer.viewport.getZoom();

            this.update();
        },

        // ----------
        goToPage: function(page) {
            var itemCount = this.viewer.world.getItemCount();
            page = Math.max(0, Math.min(itemCount - 1, page));
            this.page = page;

            var viewerWidth = this.$el.width();
            var viewerHeight = this.$el.height();
            var bounds = this.viewer.world.getItemAt(this.page).getBounds();
            var x = bounds.x;
            var y = bounds.y;
            var width = bounds.width;
            var height = bounds.height;
            var box;

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
                        box = item.getBounds();
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
                    x = bounds.x - this.pageBuffer;
                    width = height * (viewerWidth / viewerHeight);
                } else if (this.page === this.viewer.world.getItemCount() - 1) {
                    width = height * (viewerWidth / viewerHeight);
                    x = (bounds.x + bounds.width + this.pageBuffer) - width;
                }
            }

            box = new OpenSeadragon.Rect(x, y, width, height);
            this.viewer.viewport.fitBounds(box);

            if (this.mode === 'page' || this.mode === 'book') {
                this.panBounds = box;
            } else if (this.mode === 'scroll') {
                this.panBounds = this.viewer.world.getItemAt(0).getBounds()
                    .union(this.viewer.world.getItemAt(itemCount - 1).getBounds());

                this.panBounds.x -= this.pageBuffer;
                this.panBounds.y -= this.pageBuffer;
                this.panBounds.width += (this.pageBuffer * 2);
                this.panBounds.height += (this.pageBuffer * 2);
            }

            this.viewer.viewport.minZoomLevel = this.viewer.viewport.getZoom();

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
                layoutConfig.sameWidth = true;
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
            var offset = new OpenSeadragon.Point();
            var rowHeight = 0;
            var item, box;
            for (var i = 0; i < count; i++) {
                item = this.viewer.world.getItemAt(i);
                box = item.getBounds();

                if (i === this.page) {
                    offset = box.getTopLeft().minus(new OpenSeadragon.Point(x, y));
                }

                box.x = x;
                box.y = y;
                if (layoutConfig.sameWidth) {
                    box.height = box.height / box.width;
                    box.width = 1;
                } else {
                    box.width = box.width / box.height;
                    box.height = 1;
                }

                rowHeight = Math.max(rowHeight, box.height);

                layout.specs.push({
                    item: item,
                    bounds: box
                });

                if (layoutConfig.columns && i % layoutConfig.columns === layoutConfig.columns - 1) {
                    x = 0;
                    y += rowHeight + layoutConfig.buffer;
                    rowHeight = 0;
                } else {
                    if (!layoutConfig.book || i % 2 === 0) {
                        x += layoutConfig.buffer;
                    }

                    x += box.width;
                }
            }

            var pos, spec;
            for (i = 0; i < count; i++) {
                spec = layout.specs[i];
                pos = spec.bounds.getTopLeft().plus(offset);
                spec.bounds.x = pos.x;
                spec.bounds.y = pos.y;

                if (layout.bounds) {
                    layout.bounds = layout.bounds.union(spec.bounds);
                } else {
                    layout.bounds = spec.bounds.clone();
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
                spec.item.setWidth(spec.bounds.width);
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
            } else {
                this.goToPage(this.page);
            }
        }
    };

    // ----------
    $(document).ready(function() {
        App.init();
    });
})();
