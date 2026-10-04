/* global QUnit */

(function () {
    const imageBase = '/build/openseadragon/images/zoomin_';
    let button;

    function makeButton(options) {
        button = new OpenSeadragon.Button(Object.assign({
            tooltip: 'Zoom in',
            srcRest: imageBase + 'rest.png',
            srcGroup: imageBase + 'grouphover.png',
            srcHover: imageBase + 'hover.png',
            srcDown: imageBase + 'pressed.png'
        }, options));
        document.getElementById('qunit-fixture').appendChild(button.element);
        return button;
    }

    QUnit.module('Button', {
        afterEach: function () {
            if (button) {
                button.destroy();
            }
            button = null;
        }
    });

    QUnit.test('disable and enable toggle aria-disabled', function (assert) {
        makeButton();

        assert.notOk(button.isDisabled(), 'starts enabled');
        assert.notOk(button.element.hasAttribute('aria-disabled'), 'no aria-disabled while enabled');

        button.disable();
        assert.ok(button.isDisabled(), 'isDisabled after disable()');
        assert.equal(button.element.getAttribute('aria-disabled'), 'true', 'aria-disabled set');
        assert.notOk(button.element.disabled, 'native disabled not set on an OSD-created element');
        assert.notOk(button.tracker.isTracking(), 'tracking stops');

        button.enable();
        assert.notOk(button.isDisabled(), 'isDisabled false after enable()');
        assert.notOk(button.element.hasAttribute('aria-disabled'), 'aria-disabled removed');
        assert.ok(button.tracker.isTracking(), 'tracking resumes');
    });

    QUnit.test('disable keeps native disabled on a page-supplied element', function (assert) {
        const element = document.createElement('button');
        makeButton({ element: element });

        button.disable();
        assert.ok(element.disabled, 'native disabled set');
        assert.equal(element.getAttribute('aria-disabled'), 'true', 'aria-disabled set');

        button.enable();
        assert.notOk(element.disabled, 'native disabled cleared');
    });

    QUnit.test('disabled button ignores state changes', function (assert) {
        makeButton();
        button.disable();
        const state = button.currentState;

        button.notifyGroupEnter();
        assert.equal(button.currentState, state, 'state unchanged while disabled');
    });

    QUnit.test('Enter and Space raise click and release', function (assert) {
        makeButton();
        const events = [];
        button.addHandler('click', function () {
            events.push('click');
        });
        button.addHandler('release', function () {
            events.push('release');
        });

        [13, 32, 65].forEach(function (keyCode) {
            button.element.dispatchEvent(new KeyboardEvent('keypress', {
                keyCode: keyCode,
                charCode: keyCode,
                bubbles: true,
                cancelable: true
            }));
        });

        assert.deepEqual(events, ['click', 'release', 'click', 'release'],
            'Enter and Space activate, other keys do not');
    });

})();
