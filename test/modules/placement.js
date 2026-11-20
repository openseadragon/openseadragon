/* global QUnit, OpenSeadragon */
(function () {
    'use strict';

    const Placement = OpenSeadragon.Placement;
    const horizontalFlags = ['isLeft', 'isHorizontallyCentered', 'isRight'];
    const verticalFlags = ['isTop', 'isVerticallyCentered', 'isBottom'];

    QUnit.module('Placement');

    QUnit.test('all nine positions expose the correct horizontal and vertical anchors', function (assert) {
        // Horizontal: left = 0, center = 1, right = 2.
        // Vertical: top = 0, center = 1, bottom = 2.
        const positions = [
            ['CENTER', 0, 1, 1],
            ['TOP_LEFT', 1, 0, 0],
            ['TOP', 2, 1, 0],
            ['TOP_RIGHT', 3, 2, 0],
            ['RIGHT', 4, 2, 1],
            ['BOTTOM_RIGHT', 5, 2, 2],
            ['BOTTOM', 6, 1, 2],
            ['BOTTOM_LEFT', 7, 0, 2],
            ['LEFT', 8, 0, 1]
        ];

        positions.forEach(function (entry) {
            const name = entry[0];
            const id = entry[1];
            const horizontal = entry[2];
            const vertical = entry[3];
            const properties = Placement.properties[id];

            assert.strictEqual(Placement[name], id, name + ' enumeration value');
            assert.ok(properties, name + ' has properties');

            horizontalFlags.forEach(function (flag, index) {
                assert.strictEqual(properties[flag], index === horizontal, name + ' ' + flag);
            });
            verticalFlags.forEach(function (flag, index) {
                assert.strictEqual(properties[flag], index === vertical, name + ' ' + flag);
            });
        });
    });

    QUnit.test('the property table has no out-of-range entries', function (assert) {
        assert.strictEqual(Object.keys(Placement.properties).length, 9, 'exactly nine placements');
        assert.strictEqual(Placement.properties[-1], undefined, 'negative id is absent');
        assert.strictEqual(Placement.properties[9], undefined, 'id after LEFT is absent');
        assert.notStrictEqual(Placement.properties[Placement.TOP_LEFT],
            Placement.properties[Placement.BOTTOM_LEFT], 'different placements have distinct descriptors');
    });
}());
