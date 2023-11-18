/* global QUnit, $, Util, testLog */

(function() {
    const Convertor = OpenSeadragon.convertor;

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
    let imageToCanvas = 0, srcToImage = 0, context2DtoImage = 0, canvasToContext2D = 0, imageToUrl = 0,
        canvasToUrl = 0;
    //set all same costs to get easy testing, know which path will be taken
    Convertor.learn("__TEST__canvas", "__TEST__url", canvas => {
        canvasToUrl++;
        return canvas.toDataURL();
    }, 1, 1);
    Convertor.learn("__TEST__image", "__TEST__url", image => {
        imageToUrl++;
        return image.url;
    }, 1, 1);
    Convertor.learn("__TEST__canvas", "__TEST__context2d", canvas => {
        canvasToContext2D++;
        return canvas.getContext("2d");
    }, 1, 1);
    Convertor.learn("__TEST__context2d", "__TEST__canvas", context2D => {
        context2DtoImage++;
        return context2D.canvas;
    }, 1, 1);
    Convertor.learn("__TEST__image", "__TEST__canvas", image => {
        imageToCanvas++;
        const canvas = document.createElement( 'canvas' );
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d');
        context.drawImage( image, 0, 0 );
        return canvas;
    }, 1, 1);
    Convertor.learn("__TEST__url", "__TEST__image", url => {
        return new Promise((resolve, reject) => {
            srcToImage++;
            const img = new Image();
            img.onerror = img.onabort = reject;
            img.onload = () => resolve(img);
            img.src = url;
        });
    }, 1, 1);

    let canvasDestroy = 0, imageDestroy = 0, contex2DDestroy = 0, urlDestroy = 0;
    //also learn destructors
    Convertor.learnDestroy("__TEST__canvas", () => {
        canvasDestroy++;
    });
    Convertor.learnDestroy("__TEST__image", () => {
        imageDestroy++;
    });
    Convertor.learnDestroy("__TEST__context2d", () => {
        contex2DDestroy++;
    });
    Convertor.learnDestroy("__TEST__url", () => {
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

        test.ok(Convertor.getConversionPath("__TEST__url", "__TEST__image"),
            "Type conversion ok between TEST types.");
        test.ok(Convertor.getConversionPath("canvas", "context2d"),
            "Type conversion ok between real types.");

        test.equal(Convertor.getConversionPath("url", "__TEST__image"), undefined,
            "Type conversion not possible between TEST and real types.");
        test.equal(Convertor.getConversionPath("__TEST__canvas", "context2d"), undefined,
            "Type conversion not possible between TEST and real types.");

        done();
    });

    // ----------
    QUnit.test('Manual Data Convertors: testing conversion & destruction', function (test) {
        const done = test.async();

        //load image object: url -> image
        Convertor.convert("/test/data/A.png", "__TEST__url", "__TEST__image").then(i => {
            test.equal(OpenSeadragon.type(i), "image", "Got image object after conversion.");
            test.equal(srcToImage, 1, "Conversion happened.");
            test.equal(urlDestroy, 1, "Url destructor called.");
            test.equal(imageDestroy, 0, "Image destructor not called.");
            return Convertor.convert(i, "__TEST__image", "__TEST__canvas");
        }).then(c => { //path image -> canvas
            test.equal(OpenSeadragon.type(c), "canvas", "Got canvas object after conversion.");
            test.equal(srcToImage, 1, "Conversion ulr->image did not happen.");
            test.equal(imageToCanvas, 1, "Conversion image->canvas happened.");
            test.equal(urlDestroy, 1, "Url destructor not called.");
            test.equal(imageDestroy, 1, "Image destructor called.");
            return Convertor.convert(c, "__TEST__canvas", "__TEST__image");
        }).then(i => { //path canvas, image: canvas -> url -> image
            test.equal(OpenSeadragon.type(i), "image", "Got image object after conversion.");
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
            done();
        });
    });

    QUnit.test('Data Convertors via Cache object: testing conversion & destruction', function (test) {
        const done = test.async();

        const dummyRect = new OpenSeadragon.Rect(0, 0, 0, 0, 0);
        const dummyTile = new OpenSeadragon.Tile(0, 0, 0, dummyRect, true, "",
            undefined, true, null, dummyRect, "", "key");

        const cache = new OpenSeadragon.CacheRecord();
        cache.addTile(dummyTile, "/test/data/A.png", "__TEST__url");

        //load image object: url -> image
        cache.getData("__TEST__image").then(_ => {
            test.equal(OpenSeadragon.type(cache.data), "image", "Got image object after conversion.");
            test.equal(srcToImage, 1, "Conversion happened.");
            test.equal(urlDestroy, 1, "Url destructor called.");
            test.equal(imageDestroy, 0, "Image destructor not called.");
            return cache.getData("__TEST__canvas");
        }).then(_ => { //path image -> canvas
            test.equal(OpenSeadragon.type(cache.data), "canvas", "Got canvas object after conversion.");
            test.equal(srcToImage, 1, "Conversion ulr->image did not happen.");
            test.equal(imageToCanvas, 1, "Conversion image->canvas happened.");
            test.equal(urlDestroy, 1, "Url destructor not called.");
            test.equal(imageDestroy, 1, "Image destructor called.");
            return cache.getData("__TEST__image");
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

    QUnit.test('Deletion cache while being in the conversion process', function (test) {
        const done = test.async();

        let conversionHappened = false;
        Convertor.learn("__TEST__url", "__TEST__longConversionProcessForTesting", _ => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    conversionHappened = true;
                    resolve("some interesting data");
                }, 20);
            });
        }, 1, 1);
        let destructionHappened = false;
        Convertor.learnDestroy("__TEST__longConversionProcessForTesting", _ => {
            destructionHappened = true;
        });

        const dummyRect = new OpenSeadragon.Rect(0, 0, 0, 0, 0);
        const dummyTile = new OpenSeadragon.Tile(0, 0, 0, dummyRect, true, "",
            undefined, true, null, dummyRect, "", "key");

        const cache = new OpenSeadragon.CacheRecord();
        cache.addTile(dummyTile, "/test/data/A.png", "__TEST__url");
        cache.getData("__TEST__longConversionProcessForTesting").then(_ => {
            test.ok(conversionHappened, "Interrupted conversion finished.");
            test.ok(cache.loaded, "Cache is loaded.");
            test.equal(cache.data, "some interesting data", "We got the correct data.");
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

    // TODO: The ultimate integration test:
    // three items: one plain image data
    //              one modified image data by two different plugins
    //              one modified data by custom code that creates its own cache


    // QUnit.test('Manual Data Convertors: testing conversion & destruction', function (test) {
    //     const done = test.async();
    //
    //
    //
    //     viewer.world.addHandler('add-item', event => {
    //         waitFor(() => {
    //             if (event.item._fullyLoaded) {
    //
    //             }
    //         });
    //     });
    //     viewer.open('/test/data/testpattern.dzi');
    // });

})();
