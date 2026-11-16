/* global QUnit, OpenSeadragon */

(function() {
    QUnit.module('PriorityQueue');

    QUnit.test('empty queue and singleton', function(assert) {
        const queue = new OpenSeadragon.PriorityQueue();

        assert.ok(queue.isEmpty(), 'A new queue is empty');
        assert.strictEqual(queue.getCount(), 0, 'A new queue has no entries');
        assert.strictEqual(queue.peek(), undefined, 'Peeking into an empty queue returns undefined');
        assert.strictEqual(queue.peekKey(), undefined, 'An empty queue has no top key');
        assert.strictEqual(queue.remove(), undefined, 'Removing from an empty queue returns undefined');

        queue.insert(4, 'four');
        assert.notOk(queue.isEmpty(), 'Insertion makes the queue nonempty');
        assert.strictEqual(queue.getCount(), 1, 'Singleton count is one');
        assert.strictEqual(queue.peekKey(), 4, 'Singleton key is available');
        assert.strictEqual(queue.peek(), 'four', 'Singleton value is available');

        const removed = queue.remove();
        assert.strictEqual(removed.key, 4, 'Removal returns the key');
        assert.strictEqual(removed.value, 'four', 'Removal returns the value');
        assert.strictEqual(removed.index, undefined, 'Removal detaches the node');
        assert.ok(queue.isEmpty(), 'Removing the singleton empties the queue');
    });

    QUnit.test('out-of-order inserts are removed in ascending key order', function(assert) {
        const queue = new OpenSeadragon.PriorityQueue();
        const entries = [
            [5, 'five'],
            [1, 'one'],
            [4, 'four'],
            [2, 'two'],
            [3, 'three']
        ];
        entries.forEach(function(entry) {
            queue.insert(entry[0], entry[1]);
        });

        assert.deepEqual(queue.getKeys().slice().sort(function(a, b) {
            return a - b;
        }), [1, 2, 3, 4, 5], 'getKeys reports every inserted key');
        assert.deepEqual(queue.getValues().slice().sort(),
            ['five', 'four', 'one', 'three', 'two'], 'getValues reports every inserted value');

        const values = ['one', 'two', 'three', 'four', 'five'];
        for (let i = 0; i < values.length; i++) {
            const key = i + 1;
            assert.strictEqual(queue.peekKey(), key, 'Peek returns the smallest remaining key');
            assert.strictEqual(queue.peek(), values[i], 'Peek does not lose the corresponding value');

            const node = queue.remove();
            assert.strictEqual(node.key, key, 'Removal preserves the key');
            assert.strictEqual(node.value, values[i], 'Removal preserves the value');
            assert.strictEqual(node.index, undefined, 'Removed nodes have no heap index');
            assert.strictEqual(queue.getCount(), 4 - i, 'Every removal reduces the count by one');
        }
        assert.ok(queue.isEmpty(), 'All nodes have been removed');
    });

    QUnit.test('equal priorities preserve both entries without promising stable order', function(assert) {
        const queue = new OpenSeadragon.PriorityQueue();
        queue.insert(2, 'first');
        queue.insert(2, 'second');
        queue.insert(1, 'minimum');

        assert.strictEqual(queue.remove().value, 'minimum', 'Smaller key wins over ties');
        const equalValues = [queue.remove().value, queue.remove().value].sort();
        assert.deepEqual(equalValues, ['first', 'second'], 'Both equal-key values survive');
        assert.ok(queue.isEmpty(), 'All tied entries can be removed');
    });

    QUnit.test('decreaseKey reorders an attached node and reinserts a removed node', function(assert) {
        const queue = new OpenSeadragon.PriorityQueue();
        const late = new OpenSeadragon.PriorityQueue.Node(9, 'late');
        queue.insert(3, 'normal');
        queue.insertNode(late);

        assert.strictEqual(late.index, 1, 'The inserted node starts below the root');
        queue.decreaseKey(late, 1);
        assert.strictEqual(late.index, 0, 'The lowered key moves its node to the root');
        assert.strictEqual(queue.peek(), 'late', 'The lowered key takes precedence');
        assert.strictEqual(queue.remove(), late, 'The same node object is removed');
        assert.strictEqual(late.index, undefined, 'The removed node is detached');

        queue.decreaseKey(late, 2);
        assert.strictEqual(queue.getCount(), 2, 'Decreasing a removed node reinserts it');
        assert.strictEqual(queue.remove().key, 2, 'Reinserted key precedes the previous root');
        assert.strictEqual(queue.remove().key, 3, 'Remaining node follows');
        assert.ok(queue.isEmpty(), 'Both nodes were removed');
    });

    QUnit.test('clone and insertAll preserve entries without sharing heap nodes', function(assert) {
        const original = new OpenSeadragon.PriorityQueue();
        original.insert(4, 'four');
        original.insert(1, 'one');
        original.insert(2, 'two');

        const copy = original.clone();
        assert.strictEqual(copy.getCount(), 3, 'Clone has the same number of entries');
        const fromCopy = copy.remove();
        const fromOriginal = original.remove();
        assert.strictEqual(fromCopy.key, 1, 'Clone preserves the minimum key');
        assert.strictEqual(fromOriginal.key, 1, 'The original minimum is unchanged');
        assert.notStrictEqual(fromCopy, fromOriginal, 'Clone has independent node objects');

        const destination = new OpenSeadragon.PriorityQueue();
        destination.insert(0, 'zero');
        destination.insertAll(copy);
        assert.strictEqual(destination.getCount(), 3, 'insertAll adds to a nonempty heap');
        assert.deepEqual([
            destination.remove().key,
            destination.remove().key,
            destination.remove().key
        ], [0, 2, 4], 'Merged entries retain ascending key order');
        assert.strictEqual(copy.getCount(), 2, 'Consuming destination does not consume clone');
        assert.strictEqual(original.getCount(), 2, 'Consuming destination does not consume original');

        copy.clear();
        assert.ok(copy.isEmpty(), 'clear empties the clone');
        assert.strictEqual(copy.getCount(), 0, 'clear resets the count');
        assert.strictEqual(original.peekKey(), 2, 'Clearing clone does not alter original');
    });

    QUnit.test('containsKey compares keys, not values', function(assert) {
        const queue = new OpenSeadragon.PriorityQueue();
        queue.insert(7, 'seven');
        queue.insert(3, 'three');

        assert.ok(queue.containsKey(7), 'First inserted key is present');
        assert.ok(queue.containsKey(3), 'Second inserted key is present');
        assert.notOk(queue.containsKey('seven'), 'A value is not mistaken for a key');
        assert.notOk(queue.containsKey('three'), 'Other stored values are not keys');
        assert.notOk(queue.containsKey(9), 'Missing key is absent');
        assert.ok(queue.containsValue('seven'), 'containsValue finds the first value');
        assert.ok(queue.containsValue('three'), 'containsValue finds the second value');
        assert.notOk(queue.containsValue(7), 'A key is not mistaken for a value');
    });
})();
