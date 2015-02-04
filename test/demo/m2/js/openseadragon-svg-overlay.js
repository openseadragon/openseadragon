(function() {

    if (!window.OpenSeadragon) {
        console.error('[openseadragon-svg-overlay] requires OpenSeadragon');
        return;
    }

    var svgNS = 'http://www.w3.org/2000/svg';

    var update = function(viewer) {
        var info = viewer._svgOverlayInfo;

        if (info.containerWidth !== viewer.container.clientWidth) {
            info.containerWidth = viewer.container.clientWidth;
            info.svg.setAttribute('width', info.containerWidth);
        }

        if (info.containerHeight !== viewer.container.clientHeight) {
            info.containerHeight = viewer.container.clientHeight;
            info.svg.setAttribute('height', info.containerHeight);
        }

        var p = viewer.viewport.pixelFromPoint(new OpenSeadragon.Point(0, 0), true);
        var zoom = viewer.viewport.getZoom(true);
        var scale = viewer.container.clientWidth * zoom;
        info.node.setAttribute('transform',
            'translate(' + p.x + ',' + p.y + ') scale(' + scale + ')');
    };

    OpenSeadragon.Viewer.prototype.svgOverlay = function(command) {
        var self = this;

        if (command === undefined) {
            if (this._svgOverlayInfo) {
                console.error('[openseadragon-svg-overlay] already initialized on this viewer');
                return;
            }

            var info = this._svgOverlayInfo = {
                containerWidth: 0,
                containerHeight: 0
            };

            info.svg = document.createElementNS(svgNS, 'svg');
            info.svg.setAttribute('pointer-events', 'none');
            info.svg.style.position = 'absolute';
            info.svg.style.left = 0;
            info.svg.style.top = 0;
            info.svg.style.width = '100%';
            info.svg.style.height = '100%';
            this.container.insertBefore(info.svg, this.canvas.nextSibling);

            info.node = document.createElementNS(svgNS, 'g');
            info.svg.appendChild(info.node);

            this.addHandler('animation', function() {
                update(self);
            });

            this.addHandler('open', function() {
                update(self);
            });

            update(this);
            return info.node;
        } else if (command === 'resize') {
            update(this);
        } else {
            console.error('[openseadragon-svg-overlay] unknown command: ' + command);
        }
    };

})();
