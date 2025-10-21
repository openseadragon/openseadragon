const actualBounds = viewer.viewport.getBounds();
const expectedBounds = new OpenSeadragon.Rect(0, 0, 1, 1);
assert.deepEqual(actualBounds, expectedBounds);
