/* global QUnit, $, Util, testLog */

(function() {
    const Converter = OpenSeadragon.converter;

    let viewer;

    //we override jobs: remember original function
    const originalJob = OpenSeadragon.ImageLoader.prototype.addJob;

    //event awaiting
    function waitFor(predicate) {
        const time = setInterval(() => {
            if (predicate()) {
                clearInterval(time);
            }
        }, 20);
    }

    //hijack conversion paths
    //count jobs: how many items we process?
    let jobCounter = 0;
    OpenSeadragon.ImageLoader.prototype.addJob = function (options) {
        jobCounter++;
        return originalJob.call(this, options);
    };

    // Replace conversion with our own system and test: __TEST__ prefix must be used, otherwise
    // other tests will interfere
    // Note: this is not the same as in the production conversion, where CANVAS on its own does not exist
    let imageToCanvas = 0, srcToImage = 0, context2DtoImage = 0, canvasToContext2D = 0, imageToUrl = 0,
        canvasToUrl = 0;
    //set all same costs to get easy testing, know which path will be taken
    Converter.learn("__TEST__canvas", "__TEST__url", (tile, canvas) => {
        canvasToUrl++;
        return canvas.toDataURL();
    }, 1, 1);
    Converter.learn("__TEST__image", "__TEST__url", (tile,image) => {
        imageToUrl++;
        return image.url;
    }, 1, 1);
    Converter.learn("__TEST__canvas", "__TEST__context2d", (tile,canvas) => {
        canvasToContext2D++;
        return canvas.getContext("2d");
    }, 1, 1);
    Converter.learn("__TEST__context2d", "__TEST__canvas", (tile,context2D) => {
        context2DtoImage++;
        return context2D.canvas;
    }, 1, 1);
    Converter.learn("__TEST__image", "__TEST__canvas", (tile,image) => {
        imageToCanvas++;
        const canvas = document.createElement( 'canvas' );
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d');
        context.drawImage( image, 0, 0 );
        return canvas;
    }, 1, 1);
    Converter.learn("__TEST__url", "__TEST__image", (tile, url) => {
        return new Promise((resolve, reject) => {
            srcToImage++;
            const img = new Image();
            img.onerror = img.onabort = e => reject(e.message || e);
            img.onload = () => resolve(img);
            img.src = url;
        });
    }, 1, 1);

    let canvasDestroy = 0, imageDestroy = 0, contex2DDestroy = 0, urlDestroy = 0;
    //also learn destructors
    Converter.learnDestroy("__TEST__canvas", canvas => {
        canvas.width = canvas.height = 0;
        canvasDestroy++;
    });
    Converter.learnDestroy("__TEST__image", () => {
        imageDestroy++;
    });
    Converter.learnDestroy("__TEST__context2d", () => {
        contex2DDestroy++;
    });
    Converter.learnDestroy("__TEST__url", () => {
        urlDestroy++;
    });



    QUnit.module('TypeConversion', {
        beforeEach: function () {
            $('<div id="example"></div>').appendTo("#qunit-fixture");

            testLog.reset();

            viewer = OpenSeadragon({
                id: 'example',
                prefixUrl: '/build/openseadragon/images/',
                maxImageCacheCount: 200, //should be enough to fit test inside the cache
                springStiffness: 100 // Faster animation = faster tests
            });
            OpenSeadragon.ImageLoader.prototype.addJob = originalJob;
        },
        afterEach: function () {
            if (viewer && viewer.close) {
                viewer.close();
            }

            viewer = null;
            imageToCanvas = 0; srcToImage = 0; context2DtoImage = 0;
            canvasToContext2D = 0; imageToUrl = 0; canvasToUrl = 0;
            canvasDestroy = 0; imageDestroy = 0; contex2DDestroy = 0; urlDestroy = 0;
        }
    });


    // ----------
    // Names the types visited by a conversion path, e.g. "rasterBlob -> imageBitmap -> context2d".
    function describePath(from, to) {
        const path = Converter.getConversionPath(from, to);
        if (!path) {
            return undefined;
        }
        return [from].concat(path.map(edge => edge.target.value)).join(" -> ");
    }

    QUnit.test('Edge weights order conversions by declared cost', function (test) {
        const done = test.async();

        // 'learn' used to build weights with '^', which is XOR in JS and not exponentiation, so a cheaper
        // costPower could produce a heavier edge. Weights must be monotonic in costPower for Dijkstra to
        // mean anything.
        Converter.learn("__COST__a", "__COST__b", (tile, x) => x, 1, 1);
        Converter.learn("__COST__a", "__COST__c", (tile, x) => x, 3, 1);
        Converter.learn("__COST__b", "__COST__d", (tile, x) => x, 1, 1);
        Converter.learn("__COST__c", "__COST__d", (tile, x) => x, 1, 1);
        // Cheap two-hop route must beat the expensive one, despite having the same number of steps.
        test.equal(describePath("__COST__a", "__COST__d"), "__COST__a -> __COST__b -> __COST__d",
            "Cheaper costPower wins over an equally long but more expensive path.");

        // Also monotonic within a single power class, via costMultiplier.
        Converter.learn("__COST__e", "__COST__f", (tile, x) => x, 1, 1);
        Converter.learn("__COST__e", "__COST__g", (tile, x) => x, 1, 50);
        Converter.learn("__COST__f", "__COST__h", (tile, x) => x, 1, 1);
        Converter.learn("__COST__g", "__COST__h", (tile, x) => x, 1, 1);
        test.equal(describePath("__COST__e", "__COST__h"), "__COST__e -> __COST__f -> __COST__h",
            "Smaller costMultiplier wins within the same cost class.");

        done();
    });

    QUnit.test('Built-in conversion routes prefer imageBitmap decoding', function (test) {
        const done = test.async();

        // What the WebGL drawer asks for. A blob must be decoded straight to an ImageBitmap: that is the only
        // hop that can run off the main thread, and texImage2D uploads an ImageBitmap directly.
        test.equal(describePath("rasterBlob", ["context2d", "image", "imageBitmap"]),
            "rasterBlob -> imageBitmap",
            "WebGL-style targets decode a blob straight to an ImageBitmap.");

        // What the canvas drawer asks for. It cannot take an ImageBitmap, but going through one still beats
        // the objectURL + Image round trip.
        test.equal(describePath("rasterBlob", ["context2d"]),
            "rasterBlob -> imageBitmap -> context2d",
            "Canvas-style targets still decode via ImageBitmap before rasterizing.");

        done();
    });

    QUnit.test('Conversion path deduction', function (test) {
        const done = test.async();

        test.ok(Converter.getConversionPath("__TEST__url", "__TEST__image"),
            "Type conversion ok between TEST types.");
        test.ok(Converter.getConversionPath("image", "context2d"),
            "Type conversion ok between real types.");

        test.equal(Converter.getConversionPath("image", "__TEST__image"), undefined,
            "Type conversion not possible between TEST and real types.");
        test.equal(Converter.getConversionPath("__TEST__canvas", "context2d"), undefined,
            "Type conversion not possible between TEST and real types.");

        done();
    });

    QUnit.test('Copy of build-in types', function (test) {
        const done = test.async();

        //prepare data
        const URL = "/test/data/A.png";
        const image = new Image();
        image.onerror = image.onabort = () => {
            test.ok(false, "Image data preparation failed to load!");
            done();
        };
        const canvas = document.createElement( 'canvas' );
        //test when ready
        image.onload = async () => {
            canvas.width = image.width;
            canvas.height = image.height;
            const context = canvas.getContext('2d');
            context.drawImage( image, 0, 0 );

            //copy context
            const context2 = await Converter.copy({}, context, "context2d");
            test.notEqual(context, context2, "Copy is not the same as original canvas.");
            test.equal(typeof context, typeof context2, "Type of copies equals.");
            test.equal(context.canvas.toDataURL(), context2.canvas.toDataURL(), "Data is equal.");

            //copy image
            const image2 = await Converter.copy({}, image, "image");
            test.notEqual(image, image2, "Copy is not the same as original image.");
            test.equal(typeof image, typeof image2, "Type of copies equals.");
            test.equal(image.src, image2.src, "Data is equal.");

            done();
        };
        image.src = URL;
    });

    // ----------
    QUnit.test('Manual Data Converters: testing conversion, copies & destruction', function (test) {
        const done = test.async();

        //load image object: url -> image
        Converter.convert(null, "/test/data/A.png", "__TEST__url", "__TEST__image").then(i => {
            test.equal(OpenSeadragon.type(i), "image", "Got image object after conversion.");
            test.equal(srcToImage, 1, "Conversion happened.");

            test.equal(urlDestroy, 0, "Url destructor not called automatically.");
            Converter.destroy("/test/data/A.png", "__TEST__url");
            test.equal(urlDestroy, 1, "Url destructor called.");

            test.equal(imageDestroy, 0, "Image destructor not called.");
            return Converter.convert({}, i, "__TEST__image", "__TEST__canvas");
        }).then(c => { //path image -> canvas
            test.equal(OpenSeadragon.type(c), "canvas", "Got canvas object after conversion.");
            test.equal(srcToImage, 1, "Conversion ulr->image did not happen.");
            test.equal(imageToCanvas, 1, "Conversion image->canvas happened.");
            test.equal(urlDestroy, 1, "Url destructor not called.");
            test.equal(imageDestroy, 0, "Image destructor not called unless we ask it.");
            return Converter.convert({}, c, "__TEST__canvas", "__TEST__image");
        }).then(i => { //path canvas, image: canvas -> url -> image
            test.equal(OpenSeadragon.type(i), "image", "Got image object after conversion.");
            test.equal(srcToImage, 2, "Conversion ulr->image happened.");
            test.equal(imageToCanvas, 1, "Conversion image->canvas did not happened.");
            test.equal(context2DtoImage, 0, "Conversion c2d->image did not happened.");
            test.equal(canvasToContext2D, 0, "Conversion canvas->c2d did not happened.");
            test.equal(canvasToUrl, 1, "Conversion canvas->url happened.");
            test.equal(imageToUrl, 0, "Conversion image->url did not happened.");

            test.equal(urlDestroy, 2, "Url destructor called.");
            test.equal(imageDestroy, 0, "Image destructor not called.");
            test.equal(canvasDestroy, 0, "Canvas destructor called.");
            test.equal(contex2DDestroy, 0, "Image destructor not called.");
            done();
        });
    });

    QUnit.test('Data Converters via Cache object: testing conversion & destruction', function (test) {
        const done = test.async();
        const dummyTile = MockSeadragon.getTile("", MockSeadragon.getTiledImage(), {cacheKey: "key"});
        const cache = MockSeadragon.getCacheRecord();
        cache.addTile(dummyTile, "/test/data/A.png", "__TEST__url");

        //load image object: url -> image
        cache.transformTo("__TEST__image").then(_ => {
            test.equal(OpenSeadragon.type(cache.data), "image", "Got image object after conversion.");
            test.equal(srcToImage, 1, "Conversion happened.");
            test.equal(urlDestroy, 1, "Url destructor called.");
            test.equal(imageDestroy, 0, "Image destructor not called.");
            return cache.transformTo("__TEST__canvas");
        }).then(_ => { //path image -> canvas
            test.equal(OpenSeadragon.type(cache.data), "canvas", "Got canvas object after conversion.");
            test.equal(srcToImage, 1, "Conversion ulr->image did not happen.");
            test.equal(imageToCanvas, 1, "Conversion image->canvas happened.");
            test.equal(urlDestroy, 1, "Url destructor not called.");
            test.equal(imageDestroy, 1, "Image destructor called.");
            return cache.transformTo("__TEST__image");
        }).then(_ => { //path canvas, image: canvas -> url -> image
            test.equal(OpenSeadragon.type(cache.data), "image", "Got image object after conversion.");
            test.equal(srcToImage, 2, "Conversion ulr->image happened.");
            test.equal(imageToCanvas, 1, "Conversion image->canvas did not happened.");
            test.equal(context2DtoImage, 0, "Conversion c2d->image did not happened.");
            test.equal(canvasToContext2D, 0, "Conversion canvas->c2d did not happened.");
            test.equal(canvasToUrl, 1, "Conversion canvas->url happened.");
            test.equal(imageToUrl, 0, "Conversion image->url did not happened.");

            test.equal(urlDestroy, 2, "Url destructor called.");
            test.equal(imageDestroy, 1, "Image destructor not called.");
            test.equal(canvasDestroy, 1, "Canvas destructor called.");
            test.equal(contex2DDestroy, 0, "Image destructor not called.");
        }).then(_ => {
            cache.destroy();

            test.equal(urlDestroy, 2, "Url destructor not called.");
            test.equal(imageDestroy, 2, "Image destructor called.");
            test.equal(canvasDestroy, 1, "Canvas destructor not called.");
            test.equal(contex2DDestroy, 0, "Image destructor not called.");

            done();
        });
    });

    QUnit.test('Data Converters via Cache object: testing set/get', function (test) {
        const done = test.async();

        const dummyTile = MockSeadragon.getTile("", MockSeadragon.getTiledImage(), {cacheKey: "key"});
        const cache = MockSeadragon.getCacheRecord({
            testGetSet: async function(type) {
                const value = await cache.getDataAs(type, false);
                await cache.setDataAs(value, type);
                return value;
            }
        });
        cache.addTile(dummyTile, "/test/data/A.png", "__TEST__url");

        //load image object: url -> image
        cache.testGetSet("__TEST__image").then(_ => {
            test.equal(OpenSeadragon.type(cache.data), "image", "Got image object after conversion.");
            test.equal(srcToImage, 1, "Conversion happened.");
            test.equal(urlDestroy, 1, "Url destructor called.");
            test.equal(imageDestroy, 0, "Image destructor not called.");
            return cache.testGetSet("__TEST__canvas");
        }).then(_ => { //path image -> canvas
            test.equal(OpenSeadragon.type(cache.data), "canvas", "Got canvas object after conversion.");
            test.equal(srcToImage, 1, "Conversion ulr->image did not happen.");
            test.equal(imageToCanvas, 1, "Conversion image->canvas happened.");
            test.equal(urlDestroy, 1, "Url destructor not called.");
            test.equal(imageDestroy, 1, "Image destructor called.");
            return cache.testGetSet("__TEST__image");
        }).then(_ => { //path canvas, image: canvas -> url -> image
            test.equal(OpenSeadragon.type(cache.data), "image", "Got image object after conversion.");
            test.equal(srcToImage, 2, "Conversion ulr->image happened.");
            test.equal(imageToCanvas, 1, "Conversion image->canvas did not happened.");
            test.equal(context2DtoImage, 0, "Conversion c2d->image did not happened.");
            test.equal(canvasToContext2D, 0, "Conversion canvas->c2d did not happened.");
            test.equal(canvasToUrl, 1, "Conversion canvas->url happened.");
            test.equal(imageToUrl, 0, "Conversion image->url did not happened.");

            test.equal(urlDestroy, 2, "Url destructor called.");
            test.equal(imageDestroy, 1, "Image destructor not called.");
            test.equal(canvasDestroy, 1, "Canvas destructor called.");
            test.equal(contex2DDestroy, 0, "Image destructor not called.");
        }).then(_ => {
            cache.destroy();

            test.equal(urlDestroy, 2, "Url destructor not called.");
            test.equal(imageDestroy, 2, "Image destructor called.");
            test.equal(canvasDestroy, 1, "Canvas destructor not called.");
            test.equal(contex2DDestroy, 0, "Image destructor not called.");

            done();
        });
    });

    QUnit.test('Deletion cache after a copy was requested but not yet processed.', function (test) {
        const done = test.async();

        let conversionHappened = false;
        Converter.learn("__TEST__url", "__TEST__longConversionProcessForTesting", (tile, value) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    conversionHappened = true;
                    resolve("modified " + value);
                }, 20);
            });
        }, 1, 1);
        let longConversionDestroy = 0;
        Converter.learnDestroy("__TEST__longConversionProcessForTesting", _ => {
            longConversionDestroy++;
        });

        const dummyTile = MockSeadragon.getTile("", MockSeadragon.getTiledImage(), {cacheKey: "key"});
        const cache = MockSeadragon.getCacheRecord();
        cache.addTile(dummyTile, "/test/data/A.png", "__TEST__url");
        cache.getDataAs("__TEST__longConversionProcessForTesting").then(convertedData => {
            test.equal(longConversionDestroy, 1, "Copy already destroyed.");
            test.notOk(cache.loaded, "Cache was destroyed.");
            test.equal(cache.data, undefined, "Already destroyed cache does not return data.");
            test.equal(urlDestroy, 1, "Url was destroyed.");
            test.ok(conversionHappened, "Conversion was fired.");
            //destruction will likely happen after we finish current async callback
            setTimeout(async () => {
                test.equal(longConversionDestroy, 1, "Copy destroyed.");
                done();
            }, 25);
        });
        test.ok(cache.loaded, "Cache is still not loaded.");
        test.equal(cache.data, "/test/data/A.png", "Get data does not override cache.");
        test.equal(cache.type, "__TEST__url", "Cache did not change its type.");
        cache.destroy();
        test.notOk(cache.type, "Type erased immediatelly as the data copy is out.");
        test.equal(urlDestroy, 1, "We destroyed cache before copy conversion finished.");
    });

    QUnit.test('Deletion cache while being in the conversion process', function (test) {
        const done = test.async();

        let conversionHappened = false;
        Converter.learn("__TEST__url", "__TEST__longConversionProcessForTesting", (tile, value) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    conversionHappened = true;
                    resolve("modified " + value);
                }, 20);
            });
        }, 1, 1);
        let destructionHappened = false;
        Converter.learnDestroy("__TEST__longConversionProcessForTesting", _ => {
            destructionHappened = true;
        });

        const dummyTile = MockSeadragon.getTile("", MockSeadragon.getTiledImage(), {cacheKey: "key"});
        const cache = MockSeadragon.getCacheRecord();
        cache.addTile(dummyTile, "/test/data/A.png", "__TEST__url");
        cache.transformTo("__TEST__longConversionProcessForTesting").then(_ => {
            test.ok(conversionHappened, "Interrupted conversion finished.");
            test.ok(cache.loaded, "Cache is loaded.");
            test.equal(cache.data, "modified /test/data/A.png", "We got the correct data.");
            test.equal(cache.type, "__TEST__longConversionProcessForTesting", "Cache declares new type.");
            test.equal(urlDestroy, 1, "Url was destroyed.");

            //destruction will likely happen after we finish current async callback
            setTimeout(() => {
                test.ok(destructionHappened, "Interrupted conversion finished.");
                done();
            }, 25);
        });
        test.ok(!cache.loaded, "Cache is still not loaded.");
        test.equal(cache.data, undefined, "Cache is still not loaded.");
        test.equal(cache.type, "__TEST__longConversionProcessForTesting", "Cache already declares new type.");
        cache.destroy();
        test.equal(cache.type, "__TEST__longConversionProcessForTesting",
            "Type not erased immediatelly as we still process the data.");
        test.ok(!conversionHappened, "We destroyed cache before conversion finished.");
    });

    QUnit.test('ImageBitmap is closed when destroyed', async function (test) {
        const done = test.async();

        const bitmap = await OpenSeadragon.converter.convert({}, "data/A.png", "__private__imageUrl", "imageBitmap");
        test.ok(bitmap.width > 0 && bitmap.height > 0, "Decoded bitmap has dimensions.");

        // Without a registered destructor the pixels would sit around until the collector runs, long after the
        // cache decided to evict them. close() zeroes the dimensions.
        OpenSeadragon.converter.destroy(bitmap, "imageBitmap");
        test.equal(bitmap.width, 0, "Destroyed bitmap released its width.");
        test.equal(bitmap.height, 0, "Destroyed bitmap released its height.");

        done();
    });

    QUnit.test('A failing tile is not fetched twice', async function (test) {
        const done = test.async();

        const originalFetch = window.fetch;
        let fetchCount = 0;
        window.fetch = function () {
            fetchCount++;
            return originalFetch.apply(window, arguments);
        };

        let rejected = false;
        try {
            await OpenSeadragon.converter.convert({}, "data/this-tile-does-not-exist.png",
                "__private__imageUrl", "imageBitmap");
        } catch (e) {
            rejected = true;
        } finally {
            window.fetch = originalFetch;
        }

        test.ok(rejected, "A missing tile rejects instead of resolving with nothing.");
        // The worker reports HTTP and decode errors by rejecting, just like a dead worker does. Falling back
        // on every rejection re-fetched broken tiles on the main thread, doubling the failed traffic - and
        // multiplying it further once tile retries kick in. Only worker death is worth falling back for.
        // (Counted on the main thread: when the worker is used this is 0, when it is unavailable it is 1.)
        test.ok(fetchCount <= 1, "The missing tile is requested at most once, was " + fetchCount + ".");

        done();
    });

    QUnit.test('Real types conversion', async function (test) {
        const done = test.async();

        const imageUrl = "data/A.png";
        // note: __private__imageUrl is used internally
        const image1 = await OpenSeadragon.converter.convert({}, imageUrl, "__private__imageUrl", "image");

        const blob = await OpenSeadragon.converter.convert({}, imageUrl, "__private__imageUrl", "rasterBlob");
        const bitmap = await OpenSeadragon.converter.convert({}, blob, "rasterBlob", "imageBitmap");
        const image2 =  await OpenSeadragon.converter.convert({}, bitmap, "imageBitmap", "image");

        const bitmap2 = await OpenSeadragon.converter.convert({}, imageUrl, "__private__imageUrl", "imageBitmap");
        const image3 = await OpenSeadragon.converter.convert({}, bitmap2, "imageBitmap", "image");

        const test1 = await compareImages(image1, image2);
        test.ok(test1.passed, "Images 1-2 are equal.");

        const test2 = await compareImages(image1, image3);
        test.ok(test2.passed, "Images 1-3 are equal.");
        done();
    });

    async function compareImages(imgA, imgB, {
        perChannel = false,       // compare RGBA channels individually
        tolerancePct = 1.0,       // allowed % of pixels that differ (0 - 100)
        threshold = 10            // per-pixel per-channel threshold (0 - 255)
    } = {}) {
        const w = imgA.naturalWidth, h = imgA.naturalHeight;
        if (!w || !h) throw new Error("imgA has no size");

        const ctxA = await OpenSeadragon.converter.convert({}, imgA, "image", "context2d");
        const a = ctxA.getImageData(0, 0, w, h).data;

        const ctxB = await OpenSeadragon.converter.convert({}, imgB, "image", "context2d");
        const b = ctxB.getImageData(0, 0, w, h).data;

        // Compare
        const nPx = w * h;
        let diffPixels = 0;
        let sqErrSum = 0;

        for (let i = 0; i < a.length; i += 4) {
            const dr = Math.abs(a[i  ] - b[i  ]);
            const dg = Math.abs(a[i+1] - b[i+1]);
            const db = Math.abs(a[i+2] - b[i+2]);
            const da = Math.abs(a[i+3] - b[i+3]);

            const d = perChannel ? Math.max(dr, dg, db, da)
                : Math.abs(0.2126*(a[i]-b[i]) + 0.7152*(a[i+1]-b[i+1]) + 0.0722*(a[i+2]-b[i+2]));

            if (d > threshold) diffPixels++;
            sqErrSum += dr*dr + dg*dg + db*db;  //RMSE
        }

        const diffPct = (diffPixels / nPx) * 100;
        const rmse = Math.sqrt(sqErrSum / (nPx * 3));
        const passed = diffPct <= tolerancePct;

        return { passed, diffPct, rmse, width: w, height: h };
    }
})();
