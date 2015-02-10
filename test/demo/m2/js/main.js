/* globals $, App, d3 */

(function() {
    // ----------
    window.App = {
        // ----------
        init: function() {
            var self = this;

            this.maxImages = 500;
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

            this.pages = this.createPages();

            var tileSources = $.map(this.pages, function(v, i) {
                return v.tileSource;
            });

            this.viewer = OpenSeadragon({
                id: "contentDiv",
                prefixUrl: "../../../build/openseadragon/images/",
                autoResize: false,
                showHomeControl: false,
                tileSources: tileSources
            });

            this.viewer.addHandler('open', function() {
                self.$el = $(self.viewer.element);

                $.each(self.pages, function(i, v) {
                    v.tiledImage = self.viewer.world.getItemAt(i);
                });

                self.setMode({
                    mode: 'thumbs',
                    immediately: true
                });
            });

            this.viewer.addHandler('canvas-drag', function() {
                if (self.mode === 'scroll') {
                    var result = self.hitTest(self.viewer.viewport.getCenter());
                    if (result) {
                        self.page = result.index;
                        self.update();
                    }
                }
            });

            this.viewer.addHandler('viewport-change', function(event) {
                self.applyConstraints();
            });

            $.each(this.modeNames, function(i, v) {
                $('.' + v).click(function() {
                    self.setMode({
                        mode: v
                    });
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

            this.$scrollInner = $('.scroll-inner');

            this.$scrollCover = $('.scroll-cover')
                .scroll(function(event) {
                    var info = self.getScrollInfo();
                    if (!info || self.ignoreScroll) {
                        return;
                    }

                    var pos = new OpenSeadragon.Point(info.thumbBounds.getCenter().x,
                        info.thumbBounds.y + (info.viewportHeight / 2) +
                        (info.viewportMax * info.scrollFactor));

                    self.viewer.viewport.panTo(pos, true);
                })
                .mousemove(function(event) {
                    var pixel = new OpenSeadragon.Point(event.clientX, event.clientY);
                    pixel.y -= self.$scrollCover.position().top;
                    var result = self.hitTest(self.viewer.viewport.pointFromPixel(pixel));
                    self.updateHover(result ? result.index : -1);
                })
                .click(function(event) {
                    var pixel = new OpenSeadragon.Point(event.clientX, event.clientY);
                    pixel.y -= self.$scrollCover.position().top;
                    var result = self.hitTest(self.viewer.viewport.pointFromPixel(pixel));
                    if (result) {
                        self.setMode({
                            mode: 'page',
                            page: result.index
                        });
                    }
                });

            var svgNode = this.viewer.svgOverlay();

            this.highlight = d3.select(svgNode).append("rect")
                .style('fill', 'none')
                .style('stroke', '#08f')
                .style('opacity', 0)
                .style('stroke-width', 0.05)
                .attr("pointer-events", "none");

            this.hover = d3.select(svgNode).append("rect")
                .style('fill', 'none')
                .style('stroke', '#08f')
                .style('opacity', 0)
                .style('stroke-width', 0.05)
                .attr("pointer-events", "none");

            $(window).resize(function() {
                var newSize = new OpenSeadragon.Point(self.$el.width(), self.$el.height());
                self.viewer.viewport.resize(newSize, false);
                self.setMode({
                    mode: self.mode,
                    immediately: true
                });

                self.viewer.forceRedraw();

                self.viewer.svgOverlay('resize');
            });

            this.update();
        },

        // ----------
        next: function() {
            var page = this.page + (this.mode === 'book' ? 2 : 1);
            if (this.mode === 'book' && page % 2 === 0 && page !== 0) {
                page --;
            }

            this.goToPage({
                page: page
            });
        },

        // ----------
        previous: function() {
            var page = this.page - (this.mode === 'book' ? 2 : 1);
            if (this.mode === 'book' && page % 2 === 0 && page !== 0) {
                page --;
            }

            this.goToPage({
                page: page
            });
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
        getScrollInfo: function() {
            if (!this.thumbBounds) {
                return null;
            }

            var output = {};

            var viewerWidth = this.$el.width();
            var viewerHeight = this.$el.height();
            var scrollTop = this.$scrollCover.scrollTop();
            output.scrollMax = this.$scrollInner.height() - this.$scrollCover.height();
            output.scrollFactor = (output.scrollMax > 0 ? scrollTop / output.scrollMax : 0);

            output.thumbBounds = this.thumbBounds;
            output.viewportHeight = output.thumbBounds.width * (viewerHeight / viewerWidth);
            output.viewportMax = Math.max(0, output.thumbBounds.height - output.viewportHeight);
            return output;
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

            // alternates menu
            if (this.$alternates) {
                this.$alternates.remove();
                this.$alternates = null;
            }

            var page = this.pages[this.page];
            if (page && page.alternates && page.alternates.length) {
                this.$alternates = $('<select>')
                    .change(function() {
                        page.selectAlternate(parseInt(self.$alternates.val(), 10));
                    })
                    .appendTo('.nav');

                $('<option>')
                    .attr('value', -1)
                    .text(page.label || 'Default')
                    .appendTo(self.$alternates);

                $.each(page.alternates, function(i, v) {
                    if (v.label) {
                        $('<option>')
                            .attr('value', i)
                            .text(v.label)
                            .appendTo(self.$alternates);
                    }
                });

                this.$alternates.val(page.alternateIndex);
            }
        },

        // ----------
        applyConstraints: function() {
            if (this.mode === 'thumbs') {
                return;
            }

            if (this.panBounds) {
                var center = this.viewer.viewport.getCenter(true);
                var viewBounds = this.viewer.viewport.getBounds(true);
                var bounds = this.panBounds.clone();
                var left = bounds.x + (viewBounds.width / 2);
                var top = bounds.y + (viewBounds.height / 2);
                var right = (bounds.x + bounds.width) - (viewBounds.width / 2);
                var bottom = (bounds.y + bounds.height) - (viewBounds.height / 2);

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
                    this.viewer.viewport.centerSpringX.current.value = x;
                    this.viewer.viewport.centerSpringY.current.value = y;
                }
            }
        },

        // ----------
        setMode: function(config) {
            var self = this;

            this.mode = config.mode;

            if (config.page !== undefined) {
                this.page = config.page; // Need to do this before layout
            }

            this.ignoreScroll = true;
            this.thumbBounds = null;

            var layout = this.createLayout();

            if (this.mode === 'thumbs') {
                this.viewer.gestureSettingsMouse.scrollToZoom = false;
                this.viewer.zoomPerClick = 1;
                this.viewer.panHorizontal = false;
                this.viewer.panVertical = false;
                var viewerWidth = this.$el.width();
                var width = layout.bounds.width + (this.bigBuffer * 2);
                var height = layout.bounds.height + (this.bigBuffer * 2);
                var newHeight = viewerWidth * (height / width);
                this.$scrollCover.show();
                this.$scrollInner
                    .css({
                        height: newHeight
                    });
            } else {
                this.viewer.gestureSettingsMouse.scrollToZoom = true;
                this.viewer.zoomPerClick = 2;
                this.viewer.panHorizontal = true;
                this.viewer.panVertical = true;
                this.$scrollCover.hide();
            }

            this.setLayout({
                layout: layout,
                immediately: config.immediately
            });

            if (this.mode === 'thumbs') {
                // Set up thumbBounds
                this.thumbBounds = this.viewer.world.getHomeBounds();
                this.thumbBounds.x -= this.bigBuffer;
                this.thumbBounds.y -= this.bigBuffer;
                this.thumbBounds.width += (this.bigBuffer * 2);
                this.thumbBounds.height += (this.bigBuffer * 2);

                // Scroll to the appropriate location
                var info = this.getScrollInfo();

                var viewportBounds = this.thumbBounds.clone();
                viewportBounds.y += info.viewportMax * info.scrollFactor;
                viewportBounds.height = info.viewportHeight;

                var itemBounds = this.viewer.world.getItemAt(this.page).getBounds();
                var top = itemBounds.y - this.bigBuffer;
                var bottom = top + itemBounds.height + (this.bigBuffer * 2);

                var normalY;
                if (top < viewportBounds.y) {
                    normalY = top - this.thumbBounds.y;
                } else if (bottom > viewportBounds.y + viewportBounds.height) {
                    normalY = (bottom - info.viewportHeight) - this.thumbBounds.y;
                }

                if (normalY !== undefined) {
                    var viewportFactor = normalY / info.viewportMax;
                    this.$scrollCover.scrollTop(info.scrollMax * viewportFactor);
                }
            }

            this.goHome({
                immediately: config.immediately
            });

            this.viewer.viewport.minZoomLevel = this.viewer.viewport.getZoom();

            this.update();
            this.updateHighlight();
            this.updateHover(-1);

            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(function() {
                self.ignoreScroll = false;
            }, this.viewer.animationTime * 1000);
        },

        // ----------
        updateHighlight: function() {
            if (this.mode !== 'thumbs') {
                this.highlight.style('opacity', 0);
                return;
            }

            var item = this.viewer.world.getItemAt(this.page);
            var box = item.getBounds();

            this.highlight
                .style('opacity', 1)
                .attr("x", box.x)
                .attr("width", box.width)
                .attr("y", box.y)
                .attr("height", box.height);
        },

        // ----------
        updateHover: function(page) {
            if (page === -1 || this.mode !== 'thumbs') {
                this.hover.style('opacity', 0);
                this.$scrollCover.css({
                    'cursor': 'default'
                });

                return;
            }

            this.$scrollCover.css({
                'cursor': 'pointer'
            });

            var item = this.viewer.world.getItemAt(page);
            var box = item.getBounds();

            this.hover
                .style('opacity', 0.3)
                .attr("x", box.x)
                .attr("width", box.width)
                .attr("y", box.y)
                .attr("height", box.height);
        },

        // ----------
        goToPage: function(config) {
            var self = this;

            var itemCount = this.viewer.world.getItemCount();
            this.page = Math.max(0, Math.min(itemCount - 1, config.page));

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
                        x -= box.width;
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
            this.viewer.viewport.fitBounds(box, config.immediately);

            this.panBounds = null;

            var setPanBounds = function() {
                if (self.mode === 'page' || self.mode === 'book') {
                    self.panBounds = box;
                } else if (self.mode === 'scroll') {
                    self.panBounds = self.viewer.world.getItemAt(0).getBounds()
                        .union(self.viewer.world.getItemAt(itemCount - 1).getBounds());

                    self.panBounds.x -= self.pageBuffer;
                    self.panBounds.y -= self.pageBuffer;
                    self.panBounds.width += (self.pageBuffer * 2);
                    self.panBounds.height += (self.pageBuffer * 2);
                }
            };

            clearTimeout(this.panBoundsTimeout);
            if (config.immediately) {
                setPanBounds();
            } else {
                this.panBoundsTimeout = setTimeout(setPanBounds, this.viewer.animationTime * 1000);
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
            } else if (this.mode === 'book' || this.mode === 'page') {
                layoutConfig.book = (this.mode === 'book');
                var height = 1 + (this.pageBuffer * 2);
                // Note that using window here is approximate, but that's close enough.
                // We can't use viewer, because it may be stretched for the thumbs view.
                layoutConfig.buffer = (height * ($(window).width() / $(window).height())) / 2;
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
        setLayout: function(config) {
            var spec;

            for (var i = 0; i < config.layout.specs.length; i++) {
                spec = config.layout.specs[i];
                spec.item.setPosition(spec.bounds.getTopLeft(), config.immediately);
                spec.item.setWidth(spec.bounds.width, config.immediately);
            }
        },

        // ----------
        goHome: function(config) {
            var viewerWidth = this.$el.width();
            var viewerHeight = this.$el.height();
            var layoutConfig = {};

            if (this.mode === 'thumbs') {
                var info = this.getScrollInfo();
                var box = this.thumbBounds.clone();
                box.height = box.width * (viewerHeight / viewerWidth);
                box.y += info.viewportMax * info.scrollFactor;
                this.viewer.viewport.fitBounds(box, config.immediately);
            } else {
                this.goToPage({
                    page: this.page,
                    immediately: config.immediately
                });
            }
        },

        // ----------
        createPages: function() {
            var self = this;

            if (this.tileSources) {
                return $.map(this.tileSources.slice(0, this.maxImages), function(v, i) {
                    return new self.Page($.extend({
                        pageIndex: i
                    }, v));
                });
            }

            var inputs = [
                {
                    Image: {
                        xmlns: "http://schemas.microsoft.com/deepzoom/2008",
                        Url: "http://openseadragon.github.io/example-images/highsmith/highsmith_files/",
                        Format: "jpg",
                        Overlap: "2",
                        TileSize: "256",
                        Size: {
                            Width:  "7026",
                            Height: "9221"
                        }
                    }
                }, {
                    Image: {
                        xmlns: "http://schemas.microsoft.com/deepzoom/2008",
                        Url: "http://openseadragon.github.io/example-images/duomo/duomo_files/",
                        Format: "jpg",
                        Overlap: "2",
                        TileSize: "256",
                        Size: {
                            Width:  "13920",
                            Height: "10200"
                        }
                    }
                }, {
                //     Image: {
                //         xmlns: "http://schemas.microsoft.com/deepzoom/2008",
                //         Url: "../../data/tall_files/",
                //         Format: "jpg",
                //         Overlap: "1",
                //         TileSize: "254",
                //         Size: {
                //             Width:  "500",
                //             Height: "2000"
                //         }
                //     }
                // }, {
                //     Image: {
                //         xmlns: "http://schemas.microsoft.com/deepzoom/2008",
                //         Url: "../../data/wide_files/",
                //         Format: "jpg",
                //         Overlap: "1",
                //         TileSize: "254",
                //         Size: {
                //             Width:  "2000",
                //             Height: "500"
                //         }
                //     }
                // }, {
                    Image: {
                        xmlns: "http://schemas.microsoft.com/deepzoom/2008",
                        Url: "../../data/testpattern_files/",
                        Format: "jpg",
                        Overlap: "1",
                        TileSize: "254",
                        Size: {
                            Width:  "1000",
                            Height: "1000"
                        }
                    }
                }
            ];

            var pages = [];
            for (var i = 0; i < this.maxImages; i++) {
                pages.push(new this.Page({
                    pageIndex: i,
                    tileSource: inputs[Math.floor(Math.random() * inputs.length)]
                }));
            }

            return pages;
        }
    };

    // ----------
    $(document).ready(function() {
        App.init();
    });
})();
