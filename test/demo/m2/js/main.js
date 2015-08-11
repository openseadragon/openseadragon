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
            this.pageIndex = 0;
            this.modeNames = [
                'thumbs',
                'scroll',
                'book',
                'page'
            ];

            this.pages = this.createPages();

            var tileSources = $.map(this.pages, function(v, i) {
                return {
                    tileSource: v.starter.tileSource,
                    clip: v.starter.clip
                };
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
                    v.setTiledImage(self.viewer.world.getItemAt(i));
                    v.addDetails();
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
                        self.pageIndex = result.index;
                        self.update();
                    }
                }
            });

            this.viewer.addHandler('zoom', function(event) {
                self.applyConstraints();
            });

            this.viewer.addHandler('pan', function(event) {
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

            this.$details = $('.details')
                .prop('checked', true)
                .change(function() {
                    if (self.$details.prop('checked')) {
                        self.showDetails();
                    } else {
                        self.hideDetails();
                    }
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
                            pageIndex: result.index
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
            var pageIndex = this.pageIndex + (this.mode === 'book' ? 2 : 1);
            if (this.mode === 'book' && pageIndex % 2 === 0 && pageIndex !== 0) {
                pageIndex --;
            }

            this.goToPage({
                pageIndex: pageIndex
            });
        },

        // ----------
        previous: function() {
            var pageIndex = this.pageIndex - (this.mode === 'book' ? 2 : 1);
            if (this.mode === 'book' && pageIndex % 2 === 0 && pageIndex !== 0) {
                pageIndex --;
            }

            this.goToPage({
                pageIndex: pageIndex
            });
        },

        // ----------
        hideDetails: function() {
            $.each(this.pages, function(i, v) {
                v.removeDetails();
            });
        },

        // ----------
        showDetails: function() {
            $.each(this.pages, function(i, v) {
                v.addDetails();
            });
        },

        // ----------
        hitTest: function(pos) {
            var count = this.pages.length;
            var page, box;

            for (var i = 0; i < count; i++) {
                page = this.pages[i];
                box = page.getBounds();
                if (pos.x > box.x && pos.y > box.y && pos.x < box.x + box.width &&
                        pos.y < box.y + box.height) {
                    return {
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
            $('.previous').toggleClass('hidden', this.pageIndex <= 0);
            $('.next').toggleClass('hidden', this.pageIndex >= this.pages.length - 1);

            $.each(this.modeNames, function(i, v) {
                $('.' + v).toggleClass('active', v === self.mode);
            });

            // alternates menu
            if (this.$alternates) {
                this.$alternates.remove();
                this.$alternates = null;
            }

            var page = this.pages[this.pageIndex];
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

            if (this.panBounds && !this.inZoomConstraints) {
                var changed = false;
                var viewBounds = this.viewer.viewport.getBounds();
                var panBounds = this.panBounds.clone();

                if (viewBounds.x < panBounds.x - 0.00001) {
                    viewBounds.x = panBounds.x;
                    changed = true;
                }

                if (viewBounds.y < panBounds.y - 0.00001) {
                    viewBounds.y = panBounds.y;
                    changed = true;
                }

                if (viewBounds.width > panBounds.width + 0.00001) {
                    viewBounds.width = panBounds.width;
                    changed = true;
                }

                if (viewBounds.height > panBounds.height + 0.00001) {
                    viewBounds.height = panBounds.height;
                    changed = true;
                }

                if (viewBounds.x + viewBounds.width > panBounds.x + panBounds.width + 0.00001) {
                    viewBounds.x = (panBounds.x + panBounds.width) - viewBounds.width;
                    changed = true;
                }

                if (viewBounds.y + viewBounds.height > panBounds.y + panBounds.height + 0.00001) {
                    viewBounds.y = (panBounds.y + panBounds.height) - viewBounds.height;
                    changed = true;
                }

                if (changed) {
                    this.inZoomConstraints = true;
                    this.viewer.viewport.fitBounds(viewBounds);
                    this.inZoomConstraints = false;
                }
            }

            var zoom = this.viewer.viewport.getZoom();
            var maxZoom = 2;

            var zoomPoint = this.viewer.viewport.zoomPoint || this.viewer.viewport.getCenter();
            var info = this.hitTest(zoomPoint);
            if (info) {
                var page = this.pages[info.index];
                var tiledImage = page.hitTest(zoomPoint);
                if (tiledImage) {
                    maxZoom = this.viewer.maxZoomLevel;
                    if (!maxZoom) {
                        var imageWidth = tiledImage.getContentSize().x;
                        var viewerWidth = this.$el.width();
                        maxZoom = imageWidth * this.viewer.maxZoomPixelRatio / viewerWidth;
                        maxZoom /= tiledImage.getBounds().width;
                    }
                }
            }

            if (zoom > maxZoom) {
                this.viewer.viewport.zoomSpring.target.value = maxZoom;
            }
        },

        // ----------
        setMode: function(config) {
            var self = this;

            this.mode = config.mode;

            if (config.pageIndex !== undefined) {
                this.pageIndex = config.pageIndex; // Need to do this before layout
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

                var pageBounds = this.pages[this.pageIndex].getBounds();
                var top = pageBounds.y - this.bigBuffer;
                var bottom = top + pageBounds.height + (this.bigBuffer * 2);

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

            var page = this.pages[this.pageIndex];
            var box = page.getBounds();

            if (this.highlight) {
                this.highlight
                    .style('opacity', 1)
                    .attr("x", box.x)
                    .attr("width", box.width)
                    .attr("y", box.y)
                    .attr("height", box.height);
            }
        },

        // ----------
        updateHover: function(pageIndex) {
            if (pageIndex === -1 || this.mode !== 'thumbs') {
                if (this.hover) {
                    this.hover.style('opacity', 0);
                }
                this.$scrollCover.css({
                    'cursor': 'default'
                });

                return;
            }

            this.$scrollCover.css({
                'cursor': 'pointer'
            });

            var page = this.pages[pageIndex];
            var box = page.getBounds();

            if (this.hover) {
                this.hover
                    .style('opacity', 0.3)
                    .attr("x", box.x)
                    .attr("width", box.width)
                    .attr("y", box.y)
                    .attr("height", box.height);
            }
        },

        // ----------
        goToPage: function(config) {
            var self = this;

            var pageCount = this.pages.length;
            this.pageIndex = Math.max(0, Math.min(pageCount - 1, config.pageIndex));

            var viewerWidth = this.$el.width();
            var viewerHeight = this.$el.height();
            var bounds = this.pages[this.pageIndex].getBounds();
            var x = bounds.x;
            var y = bounds.y;
            var width = bounds.width;
            var height = bounds.height;
            var box;

            if (this.mode === 'book') {
                var page;
                if (this.pageIndex % 2) { // First in a pair
                    if (this.pageIndex < this.pages.length - 1) {
                        page = this.pages[this.pageIndex + 1];
                        width += page.getBounds().width;
                    }
                } else {
                    if (this.pageIndex > 0) {
                        page = this.pages[this.pageIndex - 1];
                        box = page.getBounds();
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
                if (this.pageIndex === 0) {
                    x = bounds.x - this.pageBuffer;
                    width = height * (viewerWidth / viewerHeight);
                } else if (this.pageIndex === this.pages.length - 1) {
                    width = height * (viewerWidth / viewerHeight);
                    x = (bounds.x + bounds.width + this.pageBuffer) - width;
                }
            }

            this.panBounds = null;

            box = new OpenSeadragon.Rect(x, y, width, height);
            this.viewer.viewport.fitBounds(box, config.immediately);

            var setPanBounds = function() {
                if (self.mode === 'page' || self.mode === 'book') {
                    self.panBounds = box;
                } else if (self.mode === 'scroll') {
                    self.panBounds = self.pages[0].getBounds()
                        .union(self.pages[pageCount - 1].getBounds());

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

            var count = this.pages.length;
            var x = 0;
            var y = 0;
            var offset = new OpenSeadragon.Point();
            var rowHeight = 0;
            var box, page;
            for (var i = 0; i < count; i++) {
                page = this.pages[i];
                box = page.getBounds();

                if (i === this.pageIndex) {
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
                    page: page,
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
                spec.page.place(spec.bounds, config.immediately);
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
                    pageIndex: this.pageIndex,
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

            var highsmith = {
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
            };

            var duomo = {
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
            };

            var tall = {
                Image: {
                    xmlns: "http://schemas.microsoft.com/deepzoom/2008",
                    Url: "../../data/tall_files/",
                    Format: "jpg",
                    Overlap: "1",
                    TileSize: "254",
                    Size: {
                        Width:  "500",
                        Height: "2000"
                    }
                }
            };

            var wide = {
                Image: {
                    xmlns: "http://schemas.microsoft.com/deepzoom/2008",
                    Url: "../../data/wide_files/",
                    Format: "jpg",
                    Overlap: "1",
                    TileSize: "254",
                    Size: {
                        Width:  "2000",
                        Height: "500"
                    }
                }
            };

            var testpattern = {
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
            };

            var pages = [];

            pages.push(new this.Page({
                masterWidth: 7026,
                masterHeight: 9221,
                x: 0,
                y: 0,
                width: 1,
                label: 'highsmith',
                tileSource: highsmith,
                alternates: [
                    {
                        x: 0,
                        y: 0.55,
                        width: 1,
                        label: 'duomo',
                        tileSource: duomo
                    },
                    {
                        x: 0.7,
                        y: 0,
                        width: 0.3,
                        label: 'tall',
                        tileSource: tall
                    }
                ]
            }));

            pages.push(new this.Page({
                tileSource: highsmith,
                details: [
                    {
                        x: 0.25,
                        y: 0.15,
                        width: 0.5,
                        tileSource: testpattern
                    },
                    {
                        x: 0.25,
                        y: 0.8,
                        width: 0.5,
                        tileSource: wide
                    }
                ]
            }));

            pages.push(new this.Page({
                tileSource: highsmith,
                clip: {
                    x: 1000,
                    y: 1000,
                    width: 5026,
                    height: 7221
                }
            }));

            var inputs = [
                highsmith,
                duomo,
                testpattern
            ];

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
