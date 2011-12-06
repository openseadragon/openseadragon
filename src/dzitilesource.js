
(function( $ ){
    

$.DziTileSource = function(width, height, tileSize, tileOverlap, tilesUrl, fileFormat, displayRects) {
    $.TileSource.call(this, width, height, tileSize, tileOverlap, null, null);

    this._levelRects = {};
    this.tilesUrl = tilesUrl;

    this.fileFormat = fileFormat;
    this.displayRects = displayRects;
    this.initialize();
};

$.DziTileSource.prototype = new $.TileSource();

$.DziTileSource.prototype.constructor = $.DziTileSource;

$.DziTileSource.prototype.initialize = function() {
    if (!this.displayRects) {
        return;
    }

    for (var i = this.displayRects.length - 1; i >= 0; i--) {
        var rect = this.displayRects[i];
        for (var level = rect.minLevel; level <= rect.maxLevel; level++) {
            if (!this._levelRects[level]) {
                this._levelRects[level] = [];
            }
            this._levelRects[level].push(rect);
        }
    }
};

$.DziTileSource.prototype.getTileUrl = function(level, x, y) {
    return [this.tilesUrl, level, '/', x, '_', y, '.', this.fileFormat].join('');
};

$.DziTileSource.prototype.tileExists = function(level, x, y) {
    var rects = this._levelRects[level];

    if (!rects || !rects.length) {
        return true;
    }

    for (var i = rects.length - 1; i >= 0; i--) {
        var rect = rects[i];

        if (level < rect.minLevel || level > rect.maxLevel) {
            continue;
        }

        var scale = this.getLevelScale(level);
        var xMin = rect.x * scale;
        var yMin = rect.y * scale;
        var xMax = xMin + rect.width * scale;
        var yMax = yMin + rect.height * scale;

        xMin = Math.floor(xMin / this.tileSize);
        yMin = Math.floor(yMin / this.tileSize);
        xMax = Math.ceil(xMax / this.tileSize);
        yMax = Math.ceil(yMax / this.tileSize);

        if (xMin <= x && x < xMax && yMin <= y && y < yMax) {
            return true;
        }
    }

    return false;
};

$._DziTileSourceHelper = function() {

};

$._DziTileSourceHelper.prototype = {
    createFromXml: function(xmlUrl, xmlString, callback) {
        var async = typeof (callback) == "function";
        var error = null;

        if (!xmlUrl) {
            this.error = $.Strings.getString("Errors.Empty");
            if (async) {
                window.setTimeout(function() {
                    callback(null, error);
                }, 1);
                return null;
            }
            throw new $.DziError(error);
        }

        var urlParts = xmlUrl.split('/');
        var filename = urlParts[urlParts.length - 1];
        var lastDot = filename.lastIndexOf('.');

        if (lastDot > -1) {
            urlParts[urlParts.length - 1] = filename.slice(0, lastDot);
        }

        var tilesUrl = urlParts.join('/') + "_files/";
        function finish(func, obj) {
            try {
                return func(obj, tilesUrl);
            } catch (e) {
                if (async) {
                    //Start Thatcher - Throwable doesnt have getError
                    //error = this.getError(e).message;
                    return null;
                    //End Thatcher
                } else {
                    throw this.getError(e);
                }
            }
        }
        if (async) {
            if (xmlString) {
                var handler = $.delegate(this, this.processXml);
                window.setTimeout(function() {
                    var source = finish(handler, $.Utils.parseXml(xmlString));
                    callback(source, error);    // call after finish sets error
                }, 1);
            } else {
                var handler = $.delegate(this, this.processResponse);
                $.Utils.makeAjaxRequest(xmlUrl, function(xhr) {
                    var source = finish(handler, xhr);
                    callback(source, error);    // call after finish sets error
                });
            }

            return null;
        }

        if (xmlString) {
            return finish($.delegate(this, this.processXml), $.Utils.parseXml(xmlString));
        } else {
            return finish($.delegate(this, this.processResponse), $.Utils.makeAjaxRequest(xmlUrl));
        }
    },
    processResponse: function(xhr, tilesUrl) {
        if (!xhr) {
            throw new $.DziError($.Strings.getString("Errors.Security"));
        } else if (xhr.status !== 200 && xhr.status !== 0) {
            var status = xhr.status;
            var statusText = (status == 404) ? "Not Found" : xhr.statusText;
            throw new $.DziError($.Strings.getString("Errors.Status", status, statusText));
        }

        var doc = null;

        if (xhr.responseXML && xhr.responseXML.documentElement) {
            doc = xhr.responseXML;
        } else if (xhr.responseText) {
            doc = $.Utils.parseXml(xhr.responseText);
        }

        return this.processXml(doc, tilesUrl);
    },

    processXml: function(xmlDoc, tilesUrl) {
        if (!xmlDoc || !xmlDoc.documentElement) {
            throw new $.DziError($.Strings.getString("Errors.Xml"));
        }

        var root = xmlDoc.documentElement;
        var rootName = root.tagName;

        if (rootName == "Image") {
            try {
                return this.processDzi(root, tilesUrl);
            } catch (e) {
                var defMsg = $.Strings.getString("Errors.Dzi");
                throw (e instanceof $.DziError) ? e : new $.DziError(defMsg);
            }
        } else if (rootName == "Collection") {
            throw new $.DziError($.Strings.getString("Errors.Dzc"));
        } else if (rootName == "Error") {
            return this.processError(root);
        }

        throw new $.DziError($.Strings.getString("Errors.Dzi"));
    },

    processDzi: function(imageNode, tilesUrl) {
        var fileFormat = imageNode.getAttribute("Format");

        if (!$.Utils.imageFormatSupported(fileFormat)) {
            throw new $.DziError($.Strings.getString("Errors.ImageFormat",
                    fileFormat.toUpperCase()));
        }

        var sizeNode = imageNode.getElementsByTagName("Size")[0];
        var dispRectNodes = imageNode.getElementsByTagName("DisplayRect");

        var width = parseInt(sizeNode.getAttribute("Width"), 10);
        var height = parseInt(sizeNode.getAttribute("Height"), 10);
        var tileSize = parseInt(imageNode.getAttribute("TileSize"));
        var tileOverlap = parseInt(imageNode.getAttribute("Overlap"));
        var dispRects = [];

        for (var i = 0; i < dispRectNodes.length; i++) {
            var dispRectNode = dispRectNodes[i];
            var rectNode = dispRectNode.getElementsByTagName("Rect")[0];

            dispRects.push(new $.DisplayRect(
                parseInt(rectNode.getAttribute("X"), 10),
                parseInt(rectNode.getAttribute("Y"), 10),
                parseInt(rectNode.getAttribute("Width"), 10),
                parseInt(rectNode.getAttribute("Height"), 10),
                0,  // ignore MinLevel attribute, bug in Deep Zoom Composer
                parseInt(dispRectNode.getAttribute("MaxLevel"), 10)
            ));
        }
        return new $.DziTileSource(width, height, tileSize, tileOverlap,
                tilesUrl, fileFormat, dispRects);
    },

    processError: function(errorNode) {
        var messageNode = errorNode.getElementsByTagName("Message")[0];
        var message = messageNode.firstChild.nodeValue;

        throw new $.DziError(message);
    },
    getError: function(e) {
        if (!(e instanceof DziError)) {
            $.Debug.error(e.name + " while creating DZI from XML: " + e.message);
            e = new $.DziError($.Strings.getString("Errors.Unknown"));
        }

    }
};

$.DziTileSourceHelper = new $._DziTileSourceHelper();

}( OpenSeadragon ));
