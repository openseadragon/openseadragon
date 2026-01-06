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


    QUnit.test('Conversion path deduction', function (test) {
        const done = test.async();

        test.ok(Converter.getConversionPath("__TEST__url", "__TEST__image"),
            "Type conversion ok between TEST types.");
        test.ok(Converter.getConversionPath("imageUrl", "context2d"),
            "Type conversion ok between real types.");

        test.equal(Converter.getConversionPath("imageUrl", "__TEST__image"), undefined,
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

            //copy URL
            const URL2 = await Converter.copy({}, URL, "imageUrl");
            //we cannot check if they are not the same object, strings are immutable (and we don't copy anyway :D )
            test.equal(URL, URL2, "String copy is equal in data.");
            test.equal(typeof URL, typeof URL2, "Type of copies equals.");
            test.equal(URL.length, URL2.length, "Data length is also equal.");

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

    QUnit.test('Real types conversion', async function (test) {
        const done = test.async();

        const imageUrl = "data/A.png";
        const image1 = await OpenSeadragon.converter.convert({}, imageUrl, "imageUrl", "image");

        const blob = await OpenSeadragon.converter.convert({}, imageUrl, "imageUrl", "rasterBlob");
        const bitmap = await OpenSeadragon.converter.convert({}, blob, "rasterBlob", "imageBitmap");
        const image2 =  await OpenSeadragon.converter.convert({}, bitmap, "imageBitmap", "image");

        const bitmap2 = await OpenSeadragon.converter.convert({}, imageUrl, "imageUrl", "imageBitmap");
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

    // ----------
    QUnit.test('Test data generators exist for built-in types', function (test) {
        const done = test.async();

        const builtInTypes = ['context2d', 'image', 'imageUrl', 'rasterBlob', 'imageBitmap'];

        for (const type of builtInTypes) {
            test.ok(
                Converter._testDataGenerators[type],
                `Test data generator exists for type '${type}'`
            );
        }

        done();
    });

    // ----------
    QUnit.test('Test data generators produce valid data', function (test) {
        const done = test.async();

        (async function() {
            // Test context2d generator
            const ctx = Converter._testDataGenerators['context2d'](64);
            test.ok(ctx, "context2d generator returns data");
            test.equal(ctx.canvas.width, 64, "context2d has correct width");
            test.equal(ctx.canvas.height, 64, "context2d has correct height");

            // Test imageUrl generator
            const url = Converter._testDataGenerators['imageUrl'](32);
            test.ok(url, "imageUrl generator returns data");
            test.ok(url.startsWith('data:image/'), "imageUrl is a data URL");

            // Test rasterBlob generator (async)
            const blob = await Converter._testDataGenerators['rasterBlob'](32);
            test.ok(blob instanceof Blob, "rasterBlob generator returns a Blob");

            // Test imageBitmap generator (async)
            const bitmap = await Converter._testDataGenerators['imageBitmap'](32);
            test.ok(bitmap, "imageBitmap generator returns data");
            test.equal(bitmap.width, 32, "imageBitmap has correct width");

            done();
        })();
    });

    // ----------
    QUnit.test('registerTestDataGenerator adds custom generator', function (test) {
        const done = test.async();

        const customGenerator = (size) => ({ type: 'custom', size });

        Converter.registerTestDataGenerator('__TEST__customType', customGenerator);

        test.ok(
            Converter._testDataGenerators['__TEST__customType'],
            "Custom generator was registered"
        );

        const data = Converter._testDataGenerators['__TEST__customType'](100);
        test.equal(data.type, 'custom', "Custom generator returns expected data");
        test.equal(data.size, 100, "Custom generator receives size parameter");

        // Cleanup
        delete Converter._testDataGenerators['__TEST__customType'];

        done();
    });

    // ----------
    QUnit.test('benchmark returns cost parameters', function (test) {
        const done = test.async();

        (async function() {
            // Simple sync conversion for testing
            const simpleConversion = (tile, ctx) => {
                // Just return the canvas - minimal work
                return ctx.canvas;
            };

            const result = await Converter.benchmark('context2d', simpleConversion, {
                sizes: [32, 64],
                iterations: 2,
                warmupIterations: 1
            });

            test.ok(result, "Benchmark returns a result");
            test.ok(typeof result.costPower === 'number', "Result has costPower");
            test.ok(typeof result.costMultiplier === 'number', "Result has costMultiplier");
            test.ok(result.costPower >= 0 && result.costPower <= 7, "costPower is in valid range");
            test.ok(result.measurements, "Result has measurements");
            test.ok(result.measurements[32], "Measurements include size 32");
            test.ok(result.measurements[64], "Measurements include size 64");

            done();
        })();
    });

    // ----------
    QUnit.test('benchmark handles async conversions', function (test) {
        const done = test.async();

        (async function() {
            // Async conversion for testing
            const asyncConversion = async (tile, ctx) => {
                await new Promise(resolve => setTimeout(resolve, 5));
                return ctx.canvas;
            };

            const result = await Converter.benchmark('context2d', asyncConversion, {
                sizes: [32],
                iterations: 2,
                warmupIterations: 0
            });

            test.ok(result, "Benchmark handles async conversion");
            test.ok(result.measurements[32].median >= 5, "Measured time includes async delay");

            done();
        })();
    });

    // ----------
    QUnit.test('learnWithBenchmark registers conversion with auto-evaluated cost', function (test) {
        const done = test.async();

        (async function() {
            const testConversion = (tile, ctx) => {
                // Simulate some work
                const canvas = document.createElement('canvas');
                canvas.width = ctx.canvas.width;
                canvas.height = ctx.canvas.height;
                const newCtx = canvas.getContext('2d');
                newCtx.drawImage(ctx.canvas, 0, 0);
                return newCtx;
            };

            const result = await Converter.learnWithBenchmark(
                'context2d',
                '__TEST__benchmarkedType',
                testConversion,
                { sizes: [32, 64], iterations: 2 }
            );

            test.ok(result, "learnWithBenchmark returns result");
            test.ok(typeof result.costPower === 'number', "Result has costPower");

            // Verify conversion was registered
            const path = Converter.getConversionPath('context2d', '__TEST__benchmarkedType');
            test.ok(path, "Conversion path was registered");
            test.equal(path.length, 1, "Direct conversion path exists");

            // Cleanup - remove the test conversion
            // Note: We can't easily remove edges, but they won't interfere with other tests
            // since they use the __TEST__ prefix

            done();
        })();
    });

    // ----------
    QUnit.test('benchmark returns fallback costs when no generator exists', function (test) {
        const done = test.async();

        (async function() {
            const result = await Converter.benchmark('__nonexistent_type__', () => {}, {});

            test.ok(result, "Benchmark returns result even without generator");
            test.equal(result.costPower, 1, "Fallback costPower is 1");
            test.equal(result.costMultiplier, 1, "Fallback costMultiplier is 1");
            test.equal(result.measurements, null, "No measurements when generator missing");

            done();
        })();
    });
})();

