/* global module, asyncTest, $, ok, equal, notEqual, start, test, Util, testLog */

(function() {

    module('Rectangle', {});

    var precision = 0.000000001;

    function assertPointsEquals(pointA, pointB, message) {
        Util.assessNumericValue(pointA.x, pointB.x, precision, message + " x: ");
        Util.assessNumericValue(pointA.y, pointB.y, precision, message + " y: ");
    }

    function assertRectangleEquals(rectA, rectB, message) {
        Util.assessNumericValue(rectA.x, rectB.x, precision, message + " x: ");
        Util.assessNumericValue(rectA.y, rectB.y, precision, message + " y: ");
        Util.assessNumericValue(rectA.width, rectB.width, precision,
                message + " width: ");
        Util.assessNumericValue(rectA.height, rectB.height, precision,
                message + " height: ");
        Util.assessNumericValue(rectA.degrees, rectB.degrees, precision,
                message + " degrees: ");
    }

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
        assertPointsEquals(expected, rect.getTopRight(),
                "Incorrect top right point with rotation.");
    });

    test('getBottomLeft', function() {
        var rect = new OpenSeadragon.Rect(0, 0, 3, 1);
        var expected = new OpenSeadragon.Point(0, 1);
        ok(expected.equals(rect.getBottomLeft()), "Incorrect bottom left point.");

        rect.degrees = 45;
        expected = new OpenSeadragon.Point(-1 / Math.sqrt(2), 1 / Math.sqrt(2));
        assertPointsEquals(expected, rect.getBottomLeft(),
                "Incorrect bottom left point with rotation.");
    });

    test('getBottomRight', function() {
        var rect = new OpenSeadragon.Rect(0, 0, 1, 1);
        var expected = new OpenSeadragon.Point(1, 1);
        ok(expected.equals(rect.getBottomRight()), "Incorrect bottom right point.");

        rect.degrees = 45;
        expected = new OpenSeadragon.Point(0, Math.sqrt(2));
        assertPointsEquals(expected, rect.getBottomRight(),
                "Incorrect bottom right point with 45 rotation.");

        rect.degrees = 90;
        expected = new OpenSeadragon.Point(-1, 1);
        assertPointsEquals(expected, rect.getBottomRight(),
                "Incorrect bottom right point with 90 rotation.");

        rect.degrees = 135;
        expected = new OpenSeadragon.Point(-Math.sqrt(2), 0);
        assertPointsEquals(expected, rect.getBottomRight(),
                "Incorrect bottom right point with 135 rotation.");
    });

    test('getCenter', function() {
        var rect = new OpenSeadragon.Rect(0, 0, 1, 1);
        var expected = new OpenSeadragon.Point(0.5, 0.5);
        ok(expected.equals(rect.getCenter()), "Incorrect center point.");

        rect.degrees = 45;
        expected = new OpenSeadragon.Point(0, 0.5 * Math.sqrt(2));
        assertPointsEquals(expected, rect.getCenter(),
                "Incorrect bottom right point with 45 rotation.");

        rect.degrees = 90;
        expected = new OpenSeadragon.Point(-0.5, 0.5);
        assertPointsEquals(expected, rect.getCenter(),
                "Incorrect bottom right point with 90 rotation.");

        rect.degrees = 135;
        expected = new OpenSeadragon.Point(-0.5 * Math.sqrt(2), 0);
        assertPointsEquals(expected, rect.getCenter(),
                "Incorrect bottom right point with 135 rotation.");
    });

    test('rotate', function() {
        var rect = new OpenSeadragon.Rect(0, 0, 2, 1);

        var expected = new OpenSeadragon.Rect(
            1 - 1 / (2 * Math.sqrt(2)),
            0.5 - 3 / (2 * Math.sqrt(2)),
            2,
            1,
            45);
        var actual = rect.rotate(45);
        assertRectangleEquals(expected, actual,
                "Incorrect rectangle after rotation of 45deg around center.");

        expected = new OpenSeadragon.Rect(0, 0, 2, 1, 33);
        actual = rect.rotate(33, rect.getTopLeft());
        assertRectangleEquals(expected, actual,
                "Incorrect rectangle after rotation of 33deg around topLeft.");

        expected = new OpenSeadragon.Rect(0, 0, 2, 1, 101);
        actual = rect.rotate(101, rect.getTopLeft());
        assertRectangleEquals(expected, actual,
                "Incorrect rectangle after rotation of 187deg around topLeft.");

        expected = new OpenSeadragon.Rect(0, 0, 2, 1, 187);
        actual = rect.rotate(187, rect.getTopLeft());
        assertRectangleEquals(expected, actual,
                "Incorrect rectangle after rotation of 187deg around topLeft.");

        expected = new OpenSeadragon.Rect(0, 0, 2, 1, 300);
        actual = rect.rotate(300, rect.getTopLeft());
        assertRectangleEquals(expected, actual,
                "Incorrect rectangle after rotation of 300deg around topLeft.");
    });

    test('getBoundingBox', function() {
        var rect = new OpenSeadragon.Rect(0, 0, 2, 3);

        var bb = rect.getBoundingBox();
        ok(rect.equals(bb), "Bounding box of horizontal rectangle should be " +
                "identical to rectangle.");

        rect.degrees = 90;
        var expected = new OpenSeadragon.Rect(-3, 0, 3, 2);
        assertRectangleEquals(expected, rect.getBoundingBox(),
                "Bounding box of rect rotated 90deg.");

        rect.degrees = 180;
        var expected = new OpenSeadragon.Rect(-2, -3, 2, 3);
        assertRectangleEquals(expected, rect.getBoundingBox(),
                "Bounding box of rect rotated 180deg.");

        rect.degrees = 270;
        var expected = new OpenSeadragon.Rect(0, -2, 3, 2);
        assertRectangleEquals(expected, rect.getBoundingBox(),
                "Bounding box of rect rotated 270deg.");
    });

})();
