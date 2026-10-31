/* global QUnit, Util */

(function() {
    const originalCreateAjaxRequest = OpenSeadragon.createAjaxRequest;
    let fakeRequests;

    // A stand-in for XMLHttpRequest, so the tests decide when each request completes.
    const FakeRequest = function() {
        this.readyState = 0;
        this.status = 0;
        this.sendCount = 0;
        fakeRequests.push(this);
    };

    FakeRequest.prototype = {
        open: function(method, url) {
            if (url === 'throws-on-open') {
                throw new Error('Invalid URL');
            }
            this.url = url;
            this.readyState = 1;
        },
        setRequestHeader: function() {},
        send: function() {
            this.sendCount++;
        },
        // Like XMLHttpRequest, aborting a request that was never sent does nothing.
        abort: function() {
            if (this.readyState === 1 && this.sendCount > 0) {
                this.respond(0);
            }
        },
        respond: function(status) {
            this.status = status;
            this.readyState = 4;
            this.onreadystatechange();
        }
    };

    // Starts a request through makeAjaxRequest and records which callbacks it gets.
    const request = function(url) {
        const result = {
            successCount: 0,
            errorCount: 0
        };
        result.xhr = OpenSeadragon.makeAjaxRequest({
            url: url || 'fake-url',
            success: function() {
                result.successCount++;
            },
            error: function() {
                result.errorCount++;
            }
        });
        return result;
    };

    const sendCounts = function(results) {
        return results.map(function(result) {
            return result.xhr.sendCount;
        });
    };

    QUnit.module('AjaxLoaderLimit', {
        beforeEach: function() {
            fakeRequests = [];
            OpenSeadragon.createAjaxRequest = function() {
                return new FakeRequest();
            };
        },
        afterEach: function() {
            OpenSeadragon.createAjaxRequest = originalCreateAjaxRequest;
            OpenSeadragon.setAjaxLoaderLimit(0);
            // Finish anything a failed test left behind, so the queue is empty for the next one.
            fakeRequests.forEach(function(xhr) {
                if (xhr.sendCount > 0 && xhr.readyState !== 4) {
                    xhr.respond(200);
                }
            });
        }
    });

    // ----------
    QUnit.test('setAjaxLoaderLimit', function(assert) {
        assert.strictEqual(OpenSeadragon.settings.ajaxLoaderLimit, 0, 'There is no limit by default');

        OpenSeadragon.setAjaxLoaderLimit(4);
        assert.strictEqual(OpenSeadragon.settings.ajaxLoaderLimit, 4, 'The limit is stored');

        assert.throws(function() {
            OpenSeadragon.setAjaxLoaderLimit(-1);
        }, 'A negative limit is rejected');
        assert.strictEqual(OpenSeadragon.settings.ajaxLoaderLimit, 4, 'A rejected limit leaves the old one in place');
    });

    // ----------
    QUnit.test('Without a limit, each request is sent right away and only once', function(assert) {
        const results = [request(), request(), request()];
        assert.deepEqual(sendCounts(results), [1, 1, 1], 'All requests are sent right away');

        results.forEach(function(result) {
            result.xhr.respond(200);
        });

        assert.deepEqual(sendCounts(results), [1, 1, 1], 'No request is sent a second time');
        assert.deepEqual(results.map(function(result) {
            return result.successCount;
        }), [1, 1, 1], 'Each success callback is called once');
    });

    // ----------
    QUnit.test('With a limit, requests wait for a free slot', function(assert) {
        OpenSeadragon.setAjaxLoaderLimit(2);
        const results = [request(), request(), request(), request(), request()];
        assert.deepEqual(sendCounts(results), [1, 1, 0, 0, 0], 'Only two requests are sent');

        results[0].xhr.respond(200);
        assert.deepEqual(sendCounts(results), [1, 1, 1, 0, 0], 'A successful response frees a slot');
        assert.strictEqual(results[0].successCount, 1, 'The success callback is called');

        results[1].xhr.respond(404);
        assert.deepEqual(sendCounts(results), [1, 1, 1, 1, 0], 'An error response frees a slot');
        assert.strictEqual(results[1].errorCount, 1, 'The error callback is called');

        results[2].xhr.respond(200);
        results[3].xhr.respond(200);
        results[4].xhr.respond(200);
        assert.deepEqual(sendCounts(results), [1, 1, 1, 1, 1], 'Every request is sent exactly once');
        assert.strictEqual(OpenSeadragon.AjaxQueue.numActiveRequests, 0, 'No slot is left taken');
        assert.strictEqual(OpenSeadragon.AjaxQueue.requestFuncs.length, 0, 'The queue is empty');
    });

    // ----------
    QUnit.test('Raising or removing the limit starts queued requests', function(assert) {
        OpenSeadragon.setAjaxLoaderLimit(1);
        const results = [request(), request(), request(), request()];
        assert.deepEqual(sendCounts(results), [1, 0, 0, 0], 'One request is sent');

        OpenSeadragon.setAjaxLoaderLimit(2);
        assert.deepEqual(sendCounts(results), [1, 1, 0, 0], 'Raising the limit sends one more');

        OpenSeadragon.setAjaxLoaderLimit(0);
        assert.deepEqual(sendCounts(results), [1, 1, 1, 1], 'Removing the limit sends the rest');

        results.forEach(function(result) {
            result.xhr.respond(200);
        });
        assert.deepEqual(sendCounts(results), [1, 1, 1, 1], 'No request is sent a second time');
        assert.strictEqual(OpenSeadragon.AjaxQueue.numActiveRequests, 0, 'No slot is left taken');
    });

    // ----------
    QUnit.test('Lowering the limit lets in-flight requests finish first', function(assert) {
        OpenSeadragon.setAjaxLoaderLimit(3);
        const results = [request(), request(), request(), request(), request()];
        assert.deepEqual(sendCounts(results), [1, 1, 1, 0, 0], 'Three requests are sent');

        OpenSeadragon.setAjaxLoaderLimit(1);
        results[0].xhr.respond(200);
        results[1].xhr.respond(200);
        assert.deepEqual(sendCounts(results), [1, 1, 1, 0, 0], 'Nothing new is sent while over the new limit');

        results[2].xhr.respond(200);
        assert.deepEqual(sendCounts(results), [1, 1, 1, 1, 0], 'One request is sent once under the new limit');

        results[3].xhr.respond(200);
        assert.deepEqual(sendCounts(results), [1, 1, 1, 1, 1], 'The last request is sent');
    });

    // ----------
    QUnit.test('Aborting a queued request takes it out of the queue', function(assert) {
        OpenSeadragon.setAjaxLoaderLimit(1);
        const results = [request(), request(), request()];

        results[1].xhr.abort();
        results[0].xhr.respond(200);
        assert.deepEqual(sendCounts(results), [1, 0, 1], 'The aborted request is skipped');
        assert.strictEqual(results[1].successCount + results[1].errorCount, 0,
            'The aborted request gets no callback, like an XMLHttpRequest that was never sent');

        results[2].xhr.abort();
        assert.strictEqual(results[2].errorCount, 1, 'Aborting a request in flight still calls its error callback');
        assert.strictEqual(OpenSeadragon.AjaxQueue.numActiveRequests, 0, 'Aborting a request in flight frees its slot');
    });

    // ----------
    QUnit.test('A request that cannot be sent frees its slot', function(assert) {
        OpenSeadragon.setAjaxLoaderLimit(1);

        const failsNow = request('throws-on-open');
        assert.strictEqual(failsNow.errorCount, 1, 'The error callback is called right away');

        const results = [request(), request('throws-on-open'), request()];
        assert.deepEqual(sendCounts(results), [1, 0, 0], 'The slot freed by the failed request is reused');

        results[0].xhr.respond(200);
        assert.strictEqual(results[1].errorCount, 1, 'A queued request that fails to send calls its error callback');
        assert.strictEqual(results[0].successCount, 1, 'The request that freed the slot still gets its response');
        assert.deepEqual(sendCounts(results), [1, 0, 1], 'The next request is sent');

        results[2].xhr.respond(200);
        assert.strictEqual(OpenSeadragon.AjaxQueue.numActiveRequests, 0, 'No slot is left taken');
    });

    // ----------
    QUnit.test('Real requests complete under a limit', function(assert) {
        OpenSeadragon.createAjaxRequest = originalCreateAjaxRequest;
        OpenSeadragon.setAjaxLoaderLimit(1);

        const timeWatcher = Util.timeWatcher(assert, 5000);
        let remaining = 3;
        const onSuccess = function(xhr) {
            assert.equal(xhr.status, 200, 'Request succeeded');
            remaining--;
            if (remaining === 0) {
                assert.strictEqual(OpenSeadragon.AjaxQueue.numActiveRequests, 0, 'No slot is left taken');
                timeWatcher.done();
            }
        };
        const onError = function() {
            assert.ok(false, 'Error callback should not be called');
            timeWatcher.done();
        };

        for (let i = 0; i < 3; i++) {
            OpenSeadragon.makeAjaxRequest({
                url: 'data/testpattern.dzi',
                success: onSuccess,
                error: onError
            });
        }
    });

})();
