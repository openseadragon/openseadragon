/* global module, asyncTest, $, ok, equal, notEqual, start, test, Util, testLog */

(function() {

    module('Rectangle', {});

    var precision = 0.000000001;

    test('Constructor', function() {
        var rect = new OpenSeadragon.Rect(1, 2, 3, 4, 5);
        strictEqual(rect.x, 1, 'rect.x should be 1');
        strictEqual(rect.y, 2, 'rect.y should be 2');
        strictEqual(rect.width, 3, 'rect.width should be 3');
        strictEqual(rect.height, 4, 'rect.height should be 4');
        strictEqual(rect.degrees, 5, 'rect.degrees should be 5');

        rect = new OpenSeadragon.Rect();
        strictEqual(rect.x, 0, 'rect.x should be 0');
        strictEqual(rect.y, 0, 'rect.y should be 0');
        strictEqual(rect.width, 0, 'rect.width should be 0');
        strictEqual(rect.height, 0, 'rect.height should be 0');
        strictEqual(rect.degrees, 0, 'rect.degrees should be 0');

        rect = new OpenSeadragon.Rect(0, 0, 1, 2, -405);
        Util.assessNumericValue(Math.sqrt(2) / 2, rect.x, precision,
            'rect.x should be sqrt(2)/2');
        Util.assessNumericValue(-Math.sqrt(2) / 2, rect.y, precision,
            'rect.y should be -sqrt(2)/2');
        Util.assessNumericValue(2, rect.width, precision,
            'rect.width should be 2');
        Util.assessNumericValue(1, rect.height, precision,
            'rect.height should be 1');
        strictEqual(45, rect.degrees, 'rect.degrees should be 45');

        rect = new OpenSeadragon.Rect(0, 0, 1, 2, 135);
        Util.assessNumericValue(-Math.sqrt(2), rect.x, precision,
            'rect.x should be -sqrt(2)');
        Util.assessNumericValue(-Math.sqrt(2), rect.y, precision,
            'rect.y should be -sqrt(2)');
        Util.assessNumericValue(2, rect.width, precision,
            'rect.width should be 2');
        Util.assessNumericValue(1, rect.height, precision,
            'rect.height should be 1');
        strictEqual(45, rect.degrees, 'rect.degrees should be 45');

        rect = new OpenSeadragon.Rect(0, 0, 1, 1, 585);
        Util.assessNumericValue(0, rect.x, precision,
            'rect.x should be 0');
        Util.assessNumericValue(-Math.sqrt(2), rect.y, precision,
            'rect.y should be -sqrt(2)');
        Util.assessNumericValue(1, rect.width, precision,
            'rect.width should be 1');
        Util.assessNumericValue(1, rect.height, precision,
            'rect.height should be 1');
        strictEqual(45, rect.degrees, 'rect.degrees should be 45');
    });

    test('getTopLeft', function() {
        var rect = new OpenSeadragon.Rect(1, 2, 3, 4, 5);
        var expected = new OpenSeadragon.Point(1, 2);
        ok(expected.equals(rect.getTopLeft()), "Incorrect top left point.");
    });

    test('getTopRight', function() {
        var rect = new OpenSeadragon.Rect(0, 0, 1, 3);
        var expected = new OpenSeadragon.Point(1, 0);
        ok(expected.equals(rect.getTopRight()), "Incorrect top right point.");

        rect.degrees = 45;
        expected = new OpenSeadragon.Point(1 / Math.sqrt(2), 1 / Math.sqrt(2));
        Util.assertPointsEquals(expected, rect.getTopRight(), precision,
            "Incorrect top right point with rotation.");
    });

    test('getBottomLeft', function() {
        var rect = new OpenSeadragon.Rect(0, 0, 3, 1);
        var expected = new OpenSeadragon.Point(0, 1);
        ok(expected.equals(rect.getBottomLeft()), "Incorrect bottom left point.");

        rect.degrees = 45;
        expected = new OpenSeadragon.Point(-1 / Math.sqrt(2), 1 / Math.sqrt(2));
        Util.assertPointsEquals(expected, rect.getBottomLeft(), precision,
            "Incorrect bottom left point with rotation.");
    });

    test('getBottomRight', function() {
        var rect = new OpenSeadragon.Rect(0, 0, 1, 1);
        var expected = new OpenSeadragon.Point(1, 1);
        ok(expected.equals(rect.getBottomRight()), "Incorrect bottom right point.");

        rect.degrees = 45;
        expected = new OpenSeadragon.Point(0, Math.sqrt(2));
        Util.assertPointsEquals(expected, rect.getBottomRight(), precision,
            "Incorrect bottom right point with 45 rotation.");

        rect.degrees = 90;
        expected = new OpenSeadragon.Point(-1, 1);
        Util.assertPointsEquals(expected, rect.getBottomRight(), precision,
            "Incorrect bottom right point with 90 rotation.");

        rect.degrees = 135;
        expected = new OpenSeadragon.Point(-Math.sqrt(2), 0);
        Util.assertPointsEquals(expected, rect.getBottomRight(), precision,
            "Incorrect bottom right point with 135 rotation.");
    });

    test('getCenter', function() {
        var rect = new OpenSeadragon.Rect(0, 0, 1, 1);
        var expected = new OpenSeadragon.Point(0.5, 0.5);
        ok(expected.equals(rect.getCenter()), "Incorrect center point.");

        rect.degrees = 45;
        expected = new OpenSeadragon.Point(0, 0.5 * Math.sqrt(2));
        Util.assertPointsEquals(expected, rect.getCenter(), precision,
            "Incorrect bottom right point with 45 rotation.");

        rect.degrees = 90;
        expected = new OpenSeadragon.Point(-0.5, 0.5);
        Util.assertPointsEquals(expected, rect.getCenter(), precision,
            "Incorrect bottom right point with 90 rotation.");

        rect.degrees = 135;
        expected = new OpenSeadragon.Point(-0.5 * Math.sqrt(2), 0);
        Util.assertPointsEquals(expected, rect.getCenter(), precision,
            "Incorrect bottom right point with 135 rotation.");
    });

    test('times', function() {
        var rect = new OpenSeadragon.Rect(1, 2, 3, 4, 45);
        var expected = new OpenSeadragon.Rect(2, 4, 6, 8, 45);
        var actual = rect.times(2);
        Util.assertRectangleEquals(expected, actual, precision,
            "Incorrect x2 rectangles.");
    });

    test('translate', function() {
        var rect = new OpenSeadragon.Rect(1, 2, 3, 4, 45);
        var expected = new OpenSeadragon.Rect(2, 4, 3, 4, 45);
        var actual = rect.translate(new OpenSeadragon.Point(1, 2));
        Util.assertRectangleEquals(expected, actual, precision,
            "Incorrect translation.");
    });

    test('union', function() {
        var rect1 = new OpenSeadragon.Rect(2, 2, 2, 3);
        var rect2 = new OpenSeadragon.Rect(0, 1, 1, 1);
        var expected = new OpenSeadragon.Rect(0, 1, 4, 4);
        var actual = rect1.union(rect2);
        Util.assertRectangleEquals(expected, actual, precision,
            "Incorrect union with horizontal rectangles.");

        rect1 = new OpenSeadragon.Rect(0, -Math.sqrt(2), 2, 2, 45);
        rect2 = new OpenSeadragon.Rect(1, 0, 2, 2, 0);
        expected = new OpenSeadragon.Rect(
            -Math.sqrt(2),
            -Math.sqrt(2),
            3 + Math.sqrt(2),
            2 + Math.sqrt(2));
        actual = rect1.union(rect2);
        Util.assertRectangleEquals(expected, actual, precision,
            "Incorrect union with non horizontal rectangles.");
    });

    test('intersection', function() {
        var rect1 = new OpenSeadragon.Rect(2, 2, 2, 3);
        var rect2 = new OpenSeadragon.Rect(0, 1, 1, 1);
        var expected = null;
        var actual = rect1.intersection(rect2);
        equal(expected, actual,
            "Rectangle " + rect2 + " should not intersect " + rect1);
        actual = rect2.intersection(rect1);
        equal(expected, actual,
            "Rectangle " + rect1 + " should not intersect " + rect2);

        rect1 = new OpenSeadragon.Rect(0, 0, 2, 1);
        rect2 = new OpenSeadragon.Rect(1, 0, 2, 2);
        expected = new OpenSeadragon.Rect(1, 0, 1, 1);
        actual = rect1.intersection(rect2);
        Util.assertRectangleEquals(expected, actual, precision,
            "Intersection of " + rect2 + " with " + rect1 + " should be " +
            expected);
        actual = rect2.intersection(rect1);
        Util.assertRectangleEquals(expected, actual, precision,
            "Intersection of " + rect1 + " with " + rect2 + " should be " +
            expected);

        rect1 = new OpenSeadragon.Rect(0, 0, 3, 3);
        rect2 = new OpenSeadragon.Rect(1, 1, 1, 1);
        expected = new OpenSeadragon.Rect(1, 1, 1, 1);
        actual = rect1.intersection(rect2);
        Util.assertRectangleEquals(expected, actual, precision,
            "Intersection of " + rect2 + " with " + rect1 + " should be " +
            expected);
        actual = rect2.intersection(rect1);
        Util.assertRectangleEquals(expected, actual, precision,
            "Intersection of " + rect1 + " with " + rect2 + " should be " +
            expected);


        rect1 = new OpenSeadragon.Rect(2, 2, 2, 3, 45);
        rect2 = new OpenSeadragon.Rect(0, 1, 1, 1);
        expected = null;
        actual = rect1.intersection(rect2);
        equal(expected, actual,
            "Rectangle " + rect2 + " should not intersect " + rect1);
        actual = rect2.intersection(rect1);
        equal(expected, actual,
            "Rectangle " + rect1 + " should not intersect " + rect2);

        rect1 = new OpenSeadragon.Rect(2, 0, 2, 3, 45);
        rect2 = new OpenSeadragon.Rect(0, 1, 1, 1);
        expected = new OpenSeadragon.Rect(0, 1, 1, 1);
        actual = rect1.intersection(rect2);
        Util.assertRectangleEquals(expected, actual, precision,
            "Intersection of " + rect2 + " with " + rect1 + " should be " +
            expected);
        actual = rect2.intersection(rect1);
        Util.assertRectangleEquals(expected, actual, precision,
            "Intersection of " + rect1 + " with " + rect2 + " should be " +
            expected);
    });

    test('rotate', function() {
        var rect = new OpenSeadragon.Rect(0, 0, 2, 1);

        var expected = new OpenSeadragon.Rect(
            1 - 1 / (2 * Math.sqrt(2)),
            0.5 - 3 / (2 * Math.sqrt(2)),
            2,
            1,
            45);
        var actual = rect.rotate(-675);
        Util.assertRectangleEquals(expected, actual, precision,
            "Incorrect rectangle after rotation of -675deg around center.");

        expected = new OpenSeadragon.Rect(0, 0, 2, 1, 33);
        actual = rect.rotate(33, rect.getTopLeft());
        Util.assertRectangleEquals(expected, actual, precision,
            "Incorrect rectangle after rotation of 33deg around topLeft.");

        expected = new OpenSeadragon.Rect(0, 0, 2, 1, 101);
        actual = rect.rotate(101, rect.getTopLeft());
        Util.assertRectangleEquals(expected, actual, precision,
            "Incorrect rectangle after rotation of 187deg around topLeft.");

        expected = new OpenSeadragon.Rect(0, 0, 2, 1, 187);
        actual = rect.rotate(187, rect.getTopLeft());
        Util.assertRectangleEquals(expected, actual, precision,
            "Incorrect rectangle after rotation of 187deg around topLeft.");

        expected = new OpenSeadragon.Rect(0, 0, 2, 1, 300);
        actual = rect.rotate(300, rect.getTopLeft());
        Util.assertRectangleEquals(expected, actual, precision,
            "Incorrect rectangle after rotation of 300deg around topLeft.");
    });

    test('getBoundingBox', function() {
        var rect = new OpenSeadragon.Rect(0, 0, 2, 3);

        var bb = rect.getBoundingBox();
        ok(rect.equals(bb), "Bounding box of horizontal rectangle should be " +
            "identical to rectangle.");

        rect.degrees = 90;
        var expected = new OpenSeadragon.Rect(-3, 0, 3, 2);
        Util.assertRectangleEquals(expected, rect.getBoundingBox(), precision,
            "Bounding box of rect rotated 90deg.");

        rect.degrees = 180;
        var expected = new OpenSeadragon.Rect(-2, -3, 2, 3);
        Util.assertRectangleEquals(expected, rect.getBoundingBox(), precision,
            "Bounding box of rect rotated 180deg.");

        rect.degrees = 270;
        var expected = new OpenSeadragon.Rect(0, -2, 3, 2);
        Util.assertRectangleEquals(expected, rect.getBoundingBox(), precision,
            "Bounding box of rect rotated 270deg.");
    });

    test('containsPoint', function() {
        var rect = new OpenSeadragon.Rect(0, 0, 1, 1, 45);

        ok(rect.containsPoint(new OpenSeadragon.Point(0, 0)),
            'Point 0,0 should be inside ' + rect);
        ok(rect.containsPoint(rect.getTopRight()),
            'Top right vertex should be inside ' + rect);
        ok(rect.containsPoint(rect.getBottomRight()),
            'Bottom right vertex should be inside ' + rect);
        ok(rect.containsPoint(rect.getBottomLeft()),
            'Bottom left vertex should be inside ' + rect);
        ok(rect.containsPoint(rect.getCenter()),
            'Center should be inside ' + rect);
        notOk(rect.containsPoint(new OpenSeadragon.Point(1, 0)),
            'Point 1,0 should not be inside ' + rect);
        ok(rect.containsPoint(new OpenSeadragon.Point(0.5, 0.5)),
            'Point 0.5,0.5 should be inside ' + rect);
        ok(rect.containsPoint(new OpenSeadragon.Point(0.4, 0.5)),
            'Point 0.4,0.5 should be inside ' + rect);
        notOk(rect.containsPoint(new OpenSeadragon.Point(0.6, 0.5)),
            'Point 0.6,0.5 should not be inside ' + rect);
    });

})();
