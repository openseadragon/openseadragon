/* global QUnit, OpenSeadragon */

(function() {
    const Mat3 = OpenSeadragon.Mat3;
    const epsilon = 1e-12;

    function assertMatrixClose(assert, matrix, expected, message) {
        assert.strictEqual(matrix.values.length, 9, message + ': matrix has nine entries');
        expected.forEach(function(value, index) {
            assert.ok(Math.abs(matrix.values[index] - value) < epsilon,
                message + ': entry ' + index + ' should be ' + value +
                ', received ' + matrix.values[index]);
        });
    }

    QUnit.module('Mat3');

    QUnit.test('construction and affine factories', function(assert) {
        assert.deepEqual(new Mat3().values,
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            'default constructor creates a zero matrix');

        const supplied = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        assert.deepEqual(new Mat3(supplied).values, supplied,
            'constructor accepts all nine entries');

        assert.deepEqual(Mat3.makeIdentity().values,
            [1, 0, 0, 0, 1, 0, 0, 0, 1],
            'identity has ones on its diagonal');
        assert.deepEqual(Mat3.makeTranslation(-3, 4).values,
            [1, 0, 0, 0, 1, 0, -3, 4, 1],
            'translation supports negative offsets');
        assert.deepEqual(Mat3.makeScaling(0, -2).values,
            [0, 0, 0, 0, -2, 0, 0, 0, 1],
            'scaling supports zero and negative factors');
    });

    QUnit.test('rotation factories handle positive and negative quarter turns', function(assert) {
        assertMatrixClose(assert, Mat3.makeRotation(Math.PI / 2),
            [0, -1, 0, 1, 0, 0, 0, 0, 1], 'positive quarter turn');
        assertMatrixClose(assert, Mat3.makeRotation(-Math.PI / 2),
            [0, 1, 0, -1, 0, 0, 0, 0, 1], 'negative quarter turn');
    });

    QUnit.test('multiply preserves transform order and operands', function(assert) {
        const translation = Mat3.makeTranslation(3, -4);
        const scaling = Mat3.makeScaling(2, -3);

        assert.deepEqual(translation.multiply(scaling).values,
            [2, 0, 0, 0, -3, 0, 3, -4, 1],
            'scaling applied before translation leaves the offset unchanged');
        assert.deepEqual(scaling.multiply(translation).values,
            [2, 0, 0, 0, -3, 0, 6, 12, 1],
            'translation applied before scaling scales the offset');
        assert.deepEqual(Mat3.makeIdentity().multiply(translation).values,
            translation.values, 'identity on the left changes nothing');
        assert.deepEqual(translation.multiply(Mat3.makeIdentity()).values,
            translation.values, 'identity on the right changes nothing');
        assert.deepEqual(translation.values,
            [1, 0, 0, 0, 1, 0, 3, -4, 1], 'multiplication does not mutate its inputs');
        assert.deepEqual(scaling.values,
            [2, 0, 0, 0, -3, 0, 0, 0, 1], 'right operand is unchanged');
    });

    QUnit.test('multiply handles all entries of a general matrix', function(assert) {
        const first = new Mat3([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        const second = new Mat3([9, 8, 7, 6, 5, 4, 3, 2, 1]);

        assert.deepEqual(first.multiply(second).values,
            [90, 114, 138, 54, 69, 84, 18, 24, 30],
            'full 3x3 multiplication includes off-diagonal and bottom-row terms');
        assert.deepEqual(first.values,
            [1, 2, 3, 4, 5, 6, 7, 8, 9], 'first operand remains unchanged');
        assert.deepEqual(second.values,
            [9, 8, 7, 6, 5, 4, 3, 2, 1], 'second operand remains unchanged');
    });

    QUnit.test('setValues updates the existing nine-entry storage', function(assert) {
        const matrix = Mat3.makeIdentity();
        const values = matrix.values;

        matrix.setValues(4, -2, 9, 6, 1, -3, 5, 0, 8);

        assert.strictEqual(matrix.values, values, 'setValues retains the array');
        assert.deepEqual(matrix.values,
            [4, -2, 9, 6, 1, -3, 5, 0, 8], 'all nine entries are replaced');
    });

    QUnit.test('scaleAndTranslate returns a new matrix for linear-only input', function(assert) {
        const matrix = new Mat3([1, 2, 3, 4, 5, 6, 0, 0, 0]);
        const result = matrix.scaleAndTranslate(-2, 3, 7, -1);

        assert.notStrictEqual(result, matrix, 'method returns a new matrix');
        assert.deepEqual(result.values,
            [-2, -4, -6, 12, 15, 18, 3, 9, 15],
            'linear rows are scaled and combined with translation');
        assert.deepEqual(matrix.values,
            [1, 2, 3, 4, 5, 6, 0, 0, 0], 'source remains unchanged');
    });

    QUnit.test('scaleAndTranslateSelf preserves existing translation in place', function(assert) {
        const matrix = new Mat3([1, 2, 0, -1, 3, 0, 7, -4, 1]);
        const values = matrix.values;

        matrix.scaleAndTranslateSelf(-2, 3, 5, -1);

        assert.strictEqual(matrix.values, values, 'storage is updated in place');
        assert.deepEqual(matrix.values,
            [-2, -4, 0, -3, 9, 0, 13, 3, 1],
            'new translation combines both linear rows and old translation');

        const collapsed = Mat3.makeIdentity();
        collapsed.scaleAndTranslateSelf(0, 0, 3, -2);
        assert.deepEqual(collapsed.values,
            [0, 0, 0, 0, 0, 0, 3, -2, 1],
            'zero scale collapses axes but retains homogeneous and translation terms');
    });

    QUnit.test('scaleAndTranslateOtherSetSelf keeps the other matrix intact', function(assert) {
        const tile = new Mat3([2, 0, 0, 0, 3, 0, 5, -2, 1]);
        const other = new Mat3([1, 2, 0, -1, 3, 0, 7, -4, 1]);
        const values = tile.values;

        tile.scaleAndTranslateOtherSetSelf(other);

        assert.strictEqual(tile.values, values, 'receiver storage is reused');
        assert.deepEqual(tile.values,
            [2, 4, 0, -3, 9, 0, 14, 0, 1],
            'receiver scale and translation compose with all other affine rows');
        assert.deepEqual(other.values,
            [1, 2, 0, -1, 3, 0, 7, -4, 1],
            'source matrix is not mutated');
    });

    QUnit.test('scaleAndTranslate retains existing affine offsets', function(assert) {
        const matrix = new Mat3([1, 2, 0, -1, 3, 0, 7, -4, 1]);
        const original = matrix.values.slice();
        const result = matrix.scaleAndTranslate(-2, 3, 5, -1);
        const inPlace = new Mat3(original.slice());
        inPlace.scaleAndTranslateSelf(-2, 3, 5, -1);
        const general = matrix.multiply(new Mat3([
            -2, 0, 0,
            0, 3, 0,
            5, -1, 1
        ]));

        assert.notStrictEqual(result, matrix, 'result is a new matrix');
        assert.deepEqual(result.values,
            [-2, -4, 0, -3, 9, 0, 13, 3, 1],
            'translation composes with the existing offset, including homogeneous 1');
        assert.deepEqual(result.values, inPlace.values,
            'allocating and in-place compositions agree for the same affine input');
        assert.deepEqual(result.values, general.values,
            'optimized composition agrees with general matrix multiplication');
        assert.deepEqual(matrix.values, original, 'source is unchanged');
    });

    QUnit.test('scaleAndTranslate retains all existing homogeneous-row values', function(assert) {
        const matrix = new Mat3([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        const original = matrix.values.slice();
        const result = matrix.scaleAndTranslate(2, -3, 4, 5);
        const general = matrix.multiply(new Mat3([
            2, 0, 0,
            0, -3, 0,
            4, 5, 1
        ]));

        assert.deepEqual(result.values,
            [2, 4, 6, -12, -15, -18, 31, 41, 51],
            'all nine entries agree with translation plus preexisting third row');
        assert.deepEqual(result.values, general.values,
            'optimized result agrees with full multiplication for a general 3x3');
        assert.deepEqual(matrix.values, original, 'source is unchanged');

        const translated = Mat3.makeTranslation(7, -4);
        const collapsed = translated.scaleAndTranslate(0, 0, 0, 0);
        assert.deepEqual(collapsed.values,
            [0, 0, 0, 0, 0, 0, 7, -4, 1],
            'zero scaling does not erase the existing translation');
    });
})();
