
// test/positive-modulo.test.js
// A small unit test for OpenSeadragon.positiveModulo()
// Uses QUnit syntax which is used by OSD test harness

QUnit.module('Utils: positiveModulo');

QUnit.test('positiveModulo returns positive remainder for negative numbers', function (assert) {
  assert.expect(2);

  // Example: -1 mod 5 = 4
  const result1 = OpenSeadragon.positiveModulo(-1, 5);
  assert.strictEqual(result1, 4, 'positiveModulo(-1, 5) === 4');

  // Example: -8 mod 7 = 6
  const result2 = OpenSeadragon.positiveModulo(-8, 7);
  assert.strictEqual(result2, 6, 'positiveModulo(-8, 7) === 6');
});

