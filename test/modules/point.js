/* global QUnit, OpenSeadragon */
(function () {
    'use strict';

    const Point = OpenSeadragon.Point;

    function assertPoint(assert, point, x, y, message) {
        assert.ok(point instanceof Point, message + ' returns a Point');
        assert.strictEqual(point.x, x, message + ' x');
        assert.strictEqual(point.y, y, message + ' y');
    }

    QUnit.module('Point');

    QUnit.test('constructor preserves numbers and defaults missing or nonnumeric coordinates', function (assert) {
        assertPoint(assert, new Point(), 0, 0, 'no arguments');
        assertPoint(assert, new Point(4, -2.5), 4, -2.5, 'numeric arguments');
        assertPoint(assert, new Point('4', null), 0, 0, 'nonnumeric arguments');
        assertPoint(assert, new Point(0, 5), 0, 5, 'explicit zero');
    });

    QUnit.test('clone is independent and equality requires a Point with identical coordinates', function (assert) {
        const original = new Point(2, -3);
        const clone = original.clone();

        assert.notStrictEqual(clone, original, 'clone has a distinct identity');
        assert.ok(clone.equals(original), 'clone has identical coordinates');
        assert.ok(original.equals(new Point(2, -3)), 'equal values compare equal');
        assert.notOk(original.equals(new Point(2, 3)), 'different coordinates compare unequal');
        assert.notOk(original.equals({ x: 2, y: -3 }), 'plain objects are not Points');
        assert.notOk(original.equals(null), 'null is not a Point');

        clone.x = 9;
        assertPoint(assert, original, 2, -3, 'mutating clone does not mutate original');
    });

    QUnit.test('vector operations return new Points without changing their operands', function (assert) {
        const original = new Point(4, -6);
        const other = new Point(-3, 2);

        assertPoint(assert, original.plus(other), 1, -4, 'plus');
        assertPoint(assert, original.minus(other), 7, -8, 'minus');
        assertPoint(assert, original.times(-2), -8, 12, 'times negative factor');
        assertPoint(assert, original.divide(2), 2, -3, 'divide');
        assertPoint(assert, original.negate(), -4, 6, 'negate');
        assertPoint(assert, original, 4, -6, 'original remains unchanged');
        assertPoint(assert, other, -3, 2, 'other remains unchanged');
    });

    QUnit.test('division by zero follows JavaScript numeric semantics', function (assert) {
        const original = new Point(4, -6);
        assertPoint(assert, original.divide(0), Infinity, -Infinity, 'division by zero');
        assertPoint(assert, original, 4, -6, 'division does not mutate the input');
    });

    QUnit.test('distance and squared distance use both coordinates', function (assert) {
        const a = new Point(-1, 2);
        const b = new Point(2, 6);

        assert.strictEqual(a.distanceTo(b), 5, '3-4-5 distance');
        assert.strictEqual(b.distanceTo(a), 5, 'distance is symmetric');
        assert.strictEqual(a.squaredDistanceTo(b), 25, 'squared distance is 9 + 16');
        assert.strictEqual(a.distanceTo(a), 0, 'distance to self is zero');
        assert.strictEqual(a.squaredDistanceTo(a), 0, 'squared distance to self is zero');
    });

    QUnit.test('apply transforms both coordinates and toString rounds to hundredths', function (assert) {
        const original = new Point(-1.2, 2.8);

        assertPoint(assert, original.apply(Math.floor), -2, 2, 'floor each component');
        assertPoint(assert, original, -1.2, 2.8, 'apply leaves the input intact');
        assert.strictEqual(new Point(1.239, -2.789).toString(), '(1.24,-2.79)',
            'string representation rounds to two decimal places');
    });

    QUnit.test('right-angle rotations normalize turns and respect the pivot', function (assert) {
        const original = new Point(3, 2);
        const pivot = new Point(1, 1);

        assertPoint(assert, original.rotate(0, pivot), 3, 2, 'zero degrees');
        assertPoint(assert, original.rotate(90, pivot), 0, 3, '90 degrees');
        assertPoint(assert, original.rotate(-90, pivot), 2, -1, 'negative 90 degrees');
        assertPoint(assert, original.rotate(450, pivot), 0, 3, '450 degrees');
        assertPoint(assert, original, 3, 2, 'rotation leaves input intact');
        assertPoint(assert, pivot, 1, 1, 'rotation leaves pivot intact');
    });

    QUnit.test('non-right-angle rotation uses trigonometric coordinates', function (assert) {
        const rotated = new Point(1, 0).rotate(45);

        assert.ok(Math.abs(rotated.x - Math.SQRT1_2) < 1e-12, 'x is sqrt(2)/2');
        assert.ok(Math.abs(rotated.y - Math.SQRT1_2) < 1e-12, 'y is sqrt(2)/2');
    });
}());
