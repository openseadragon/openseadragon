/* global QUnit, $,testLog */

( function() {
    var viewer;
    const drawerTypes = ['webgl','canvas'];
    drawerTypes.forEach(runDrawerTests);

    function runDrawerTests(drawerType){

        QUnit.module( 'Multi-Image-'+drawerType, {
            beforeEach: function() {
                $( '<div id="example"></div>' ).appendTo( "#qunit-fixture" );

                testLog.reset();

                viewer = OpenSeadragon( {
                    id: 'example',
                    prefixUrl: '/build/openseadragon/images/',
                    springStiffness: 100, // Faster animation = faster tests
                    drawer: drawerType
                });
            },
            afterEach: function() {
                if (viewer){
                    viewer.destroy();
                }

                viewer = null;
                $("#example").remove();
            }
        } );

        // ----------
        QUnit.test( 'Multi-image operations', function(assert) {
            var done = assert.async();
            assert.expect( 24 );
            viewer.addHandler( "open", function( ) {
                assert.equal( 1, viewer.world.getItemCount( ),
                    "One item should be present after opening." );
                var options = {
                    tileSource: {
                        type: 'legacy-image-pyramid',
                        levels: [ {
                                url: "data/A.png",
                                width: 1000,
                                height: 1000
                            } ]
                    }
                };
                viewer.addTiledImage( options );
                viewer.world.addHandler( "add-item", function addFirstItemHandler( event ) {
                    viewer.world.removeHandler( "add-item", addFirstItemHandler );
                    var item1 = event.item;
                    assert.equal( viewer.world.getItemCount( ), 2,
                        "2 items should be present after adding a item." );
                    assert.equal( viewer.world.getIndexOfItem( item1 ), 1,
                        "The first added item should have a index of 1" );
                    assert.equal( viewer.world.getItemAt( 1 ), item1,
                        "The item at index 1 should be the first added item." );

                    viewer.addTiledImage( options );
                    viewer.world.addHandler( "add-item", function addSecondItemHandler( event ) {
                        viewer.world.removeHandler( "add-item", addSecondItemHandler );
                        var item2 = event.item;
                        assert.equal( viewer.world.getItemCount( ), 3,
                            "3 items should be present after adding a second item." );
                        assert.equal( viewer.world.getIndexOfItem( item2 ), 2,
                            "If not specified, a item should be added with the highest index." );
                        assert.equal( viewer.world.getItemAt( 2 ), item2,
                            "The item at index 2 should be the second added item." );

                        viewer.world.addHandler( "item-index-change",
                            function itemIndexChangedHandler( event ) {
                                viewer.world.removeHandler( "item-index-change",
                                    itemIndexChangedHandler );
                                assert.equal( event.item, item2,
                                    "The item which changed index should be item2" );
                                assert.equal( event.previousIndex, 2, "Previous index should be 2." );
                                assert.equal( event.newIndex, 1, "New index should be 1." );
                            });
                        viewer.world.setItemIndex( item2, 1 );
                        assert.equal( viewer.world.getIndexOfItem( item2 ), 1,
                            "Item2 index should be 1 after setItemIndex." );
                        assert.equal( viewer.world.getIndexOfItem( item1 ), 2,
                            "Item1 index should be 2 after setItemIndex." );
                        assert.equal( viewer.world.getItemAt( 1 ), item2,
                            "The item at index 1 should be item2." );
                        assert.equal( viewer.world.getItemAt( 2 ), item1,
                            "The item at index 2 should be item1." );

                        options.index = 2;
                        options.tileSource.levels[0].url = "data/CCyan.png";
                        viewer.addTiledImage( options );
                        viewer.world.addHandler( "add-item", function addThirdItemHandler( event ) {
                            viewer.world.removeHandler( "add-item", addThirdItemHandler );
                            var item3 = event.item;
                            assert.equal( viewer.world.getItemCount( ), 4,
                                "4 items should be present after adding a third item." );
                            assert.equal( viewer.world.getIndexOfItem( item3 ), 2,
                                "Item 3 should be added with index 2." );
                            assert.equal( viewer.world.getIndexOfItem( item2 ), 1,
                                "Item 2 should stay at index 1." );

                            options.index = 2;
                            options.replace = true;
                            viewer.addTiledImage( options );
                            viewer.world.addHandler( "add-item", function replaceAddItemHandler( event ) {
                                viewer.world.removeHandler( "add-item", replaceAddItemHandler );
                                var item4 = event.item;
                                assert.equal( viewer.world.getItemCount( ), 4,
                                    "4 items should still be present after replacing the second item." );
                                assert.equal( viewer.world.getIndexOfItem( item4 ), 2,
                                    "Item 4 should be added with index 2." );
                                assert.equal( viewer.world.getIndexOfItem( item3 ), -1,
                                    "Item 3 should be at index -1." );

                                viewer.world.addHandler( "remove-item", function removeItemHandler( event ) {
                                    viewer.world.removeHandler( "remove-item", removeItemHandler );

                                    assert.equal( item2, event.item, "Removed item should be item2." );

                                    assert.equal( viewer.world.getIndexOfItem( item1 ), 2,
                                        "Item 1 should be at index 2." );
                                    assert.equal( viewer.world.getIndexOfItem( item2 ), -1,
                                        "Item 2 should be at index -1." );
                                    assert.equal( viewer.world.getIndexOfItem( item4 ), 1,
                                        "Item 4 should be at index 1." );

                                    done();
                                });

                                viewer.world.removeItem( item2 );
                            });
                        });
                    });
                });
            });
            viewer.open( '/test/data/testpattern.dzi' );
        });

        // ----------
        QUnit.test( 'Sequences as items', function(assert) {
            var done = assert.async();
            var options = {
                tileSource: [{
                        type: 'legacy-image-pyramid',
                        levels: [{
                                url: "data/A.png",
                                width: 1000,
                                height: 1000
                            }]
                    }, {
                        type: 'legacy-image-pyramid',
                        levels: [{
                                url: "data/BBlue.png",
                                width: 1000,
                                height: 1000
                            }]
                    }]
            };

            viewer.addHandler( "open", function openHandler() {
                viewer.removeHandler( "open", openHandler );

                viewer.addHandler( "add-item-failed",
                    function addItemFailedHandler( event ) {
                        viewer.removeHandler( "add-item-failed", addItemFailedHandler );
                        assert.equal( event.message, "[Viewer.addTiledImage] Sequences can not be added; add them one at a time instead." );
                        assert.equal( event.options, options, "Item failed event should give the options." );
                        done();
                    } );
                viewer.addTiledImage( options );

            });
            viewer.open( '/test/data/testpattern.dzi' );
        });

        // ----------
        QUnit.test('items are added in order', function(assert) {
            var done = assert.async();
            viewer.addHandler('open', function(event) {
                assert.equal(viewer.world.getItemAt(0).getContentSize().y, 2000, 'first image is tall');
                assert.equal(viewer.world.getItemAt(0).getBounds().width, 4, 'first image has 4 width');
                assert.equal(viewer.world.getItemAt(1).getContentSize().x, 2000, 'second image is wide');
                assert.equal(viewer.world.getItemAt(1).getBounds().width, 2, 'second image has 2 width');
                done();
            });

            viewer.open([
                {
                    tileSource: '/test/data/tall.dzi',
                    width: 4
                }, {
                    tileSource: '/test/data/wide.dzi',
                    width: 2
                }
            ]);
        });

        QUnit.test('Viewer.addSimpleImage', function(assert) {
            var done = assert.async();
            viewer.addHandler("open", function openHandler() {
                viewer.removeHandler("open", openHandler);
                viewer.world.addHandler('add-item', function itemAdded(event) {
                    viewer.world.removeHandler('add-item', itemAdded);
                    assert.equal(event.item.opacity, 0.5,
                        'Opacity option should be set when using addSimpleImage');
                    done();
                });

                viewer.addSimpleImage({
                    url: '/test/data/A.png',
                    opacity: 0.5
                });
            });
            viewer.open('/test/data/testpattern.dzi');
        });

        QUnit.test('Transparent image on top of others', function(assert) {
            var done = assert.async();
            viewer.open('/test/data/testpattern.dzi');

            function getPixelFromViewerScreenCoords(x, y) {
                const density = OpenSeadragon.pixelDensityRatio;
                const imageData = viewer.drawer.context.getImageData(x * density, y * density, 1, 1);
                return {
                    r: imageData.data[0],
                    g: imageData.data[1],
                    b: imageData.data[2],
                    a: imageData.data[3]
                };
            }

            viewer.addHandler('open', function() {
                var firstImage = viewer.world.getItemAt(0);
                firstImage.addHandler('fully-loaded-change', function() {
                    viewer.addOnceHandler('update-viewport', function(){
                        // Pixel 250,250 will be in the hole of the A
                        var expectedVal = getPixelFromViewerScreenCoords(250, 250);

                        assert.notEqual(expectedVal.r, 0, 'Red channel should not be 0');
                        assert.notEqual(expectedVal.g, 0, 'Green channel should not be 0');
                        assert.notEqual(expectedVal.b, 0, 'Blue channel should not be 0');
                        assert.notEqual(expectedVal.a, 0, 'Alpha channel should not be 0');

                        viewer.addSimpleImage({
                            url: '/test/data/A.png',
                            success: function() {
                                var secondImage = viewer.world.getItemAt(1);
                                secondImage.addHandler('fully-loaded-change',  function() {
                                    viewer.addOnceHandler('update-viewport', function(){
                                        var actualVal = getPixelFromViewerScreenCoords(250, 250);

                                        assert.equal(actualVal.r, expectedVal.r,
                                            'Red channel should not change in transparent part of the A');
                                        assert.equal(actualVal.g, expectedVal.g,
                                            'Green channel should not change in transparent part of the A');
                                        assert.equal(actualVal.b, expectedVal.b,
                                            'Blue channel should not change in transparent part of the A');
                                        assert.equal(actualVal.a, expectedVal.a,
                                            'Alpha channel should not change in transparent part of the A');

                                        var onAVal = getPixelFromViewerScreenCoords(333 , 250);
                                        assert.equal(onAVal.r, 0, 'Red channel should be 0 on the A');
                                        assert.equal(onAVal.g, 0, 'Green channel should be 0 on the A');
                                        assert.equal(onAVal.b, 0, 'Blue channel should be 0 on the A');
                                        assert.equal(onAVal.a, 255, 'Alpha channel should be 255 on the A');

                                        done();
                                    });
                                    // trigger a redraw so the event fires
                                    firstImage.redraw();
                                });
                            }
                        });
                    });
                });
            });
        });
    }
})();
