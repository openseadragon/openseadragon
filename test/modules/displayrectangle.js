/* global QUnit, OpenSeadragon */
(function () {
    'use strict';

    const DisplayRect = OpenSeadragon.DisplayRect;
    const Point = OpenSeadragon.Point;

    function assertPoint(assert, point, x, y, message) {
        assert.ok(point instanceof Point, message + ' returns a Point');
        assert.strictEqual(point.x, x, message + ' x');
        assert.strictEqual(point.y, y, message + ' y');
    }

    QUnit.module('DisplayRect');

    QUnit.test('zero and reversed zoom bounds are retained without normalization', function (assert) {
        const zero = new DisplayRect(-7, 4, 0, 6, 0, 0);
        const reversed = new DisplayRect(1, 2, 3, 4, 8, 2);

        assert.strictEqual(zero.x, -7, 'negative x is preserved');
        assert.strictEqual(zero.y, 4, 'y is preserved');
        assert.strictEqual(zero.width, 0, 'zero width is preserved');
        assert.strictEqual(zero.height, 6, 'height is preserved');
        assert.strictEqual(zero.minLevel, 0, 'zero minimum zoom level is preserved');
        assert.strictEqual(zero.maxLevel, 0, 'zero maximum zoom level is preserved');
        assert.strictEqual(reversed.minLevel, 8, 'minimum is not reordered');
        assert.strictEqual(reversed.maxLevel, 2, 'maximum is not reordered');
    });

    QUnit.test('omitted zoom levels remain optional', function (assert) {
        const rect = new DisplayRect(0, 0, 1, 1);

        assert.strictEqual(rect.minLevel, undefined, 'missing minLevel is undefined');
        assert.strictEqual(rect.maxLevel, undefined, 'missing maxLevel is undefined');
    });

    QUnit.test('rectangle geometry methods are available alongside zoom metadata', function (assert) {
        const rect = new DisplayRect(-10, 3, 8, 6, 2, 7);

        assertPoint(assert, rect.getTopLeft(), -10, 3, 'top left');
        assertPoint(assert, rect.getCenter(), -6, 6, 'center');
        assertPoint(assert, rect.getBottomRight(), -2, 9, 'bottom right');
        assert.strictEqual(rect.minLevel, 2, 'geometry queries preserve minLevel');
        assert.strictEqual(rect.maxLevel, 7, 'geometry queries preserve maxLevel');
    });

    QUnit.test('zoom metadata belongs to each rectangle instance', function (assert) {
        const first = new DisplayRect(0, 0, 10, 10, 1, 4);
        const second = new DisplayRect(0, 0, 10, 10, 3, 9);

        first.minLevel = -1;
        first.maxLevel = 5;

        assert.strictEqual(first.minLevel, -1, 'first minimum is writable');
        assert.strictEqual(first.maxLevel, 5, 'first maximum is writable');
        assert.strictEqual(second.minLevel, 3, 'second minimum is independent');
        assert.strictEqual(second.maxLevel, 9, 'second maximum is independent');
    });
}());
