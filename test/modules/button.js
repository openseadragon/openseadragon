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

    QUnit.test('creates a non-submitting button named by its title', function (assert) {
        const form = document.createElement('form');
        let submitted = false;
        form.addEventListener('submit', function (event) {
            submitted = true;
            event.preventDefault();
        });
        document.getElementById('qunit-fixture').appendChild(form);
        makeButton();
        form.appendChild(button.element);

        assert.equal(button.element.tagName, 'BUTTON', 'element is a button');
        assert.equal(button.element.type, 'button', 'type is button');
        assert.deepEqual(
            [button.imgRest.alt, button.imgGroup.alt, button.imgHover.alt, button.imgDown.alt],
            ['', '', '', ''],
            'images leave title as the name');
        assert.equal(button.element.title, 'Zoom in', 'title kept');

        button.element.click();
        assert.notOk(submitted, 'click does not submit the form');
    });

    QUnit.test('page button styles do not reach the button', function (assert) {
        const style = document.createElement('style');
        style.textContent = 'button { padding: 20px; margin: 8px; background: red; ' +
            'border: 3px solid blue; border-radius: 9px; min-width: 80px; }';
        document.head.appendChild(style);
        makeButton();

        const computed = getComputedStyle(button.element);
        assert.equal(computed.paddingTop, '0px', 'padding reset');
        assert.equal(computed.marginTop, '0px', 'margin reset');
        assert.equal(computed.borderTopWidth, '0px', 'border reset');
        assert.equal(computed.borderTopLeftRadius, '0px', 'radius reset');
        assert.equal(computed.minWidth, '0px', 'min-width reset');
        assert.equal(computed.backgroundColor, 'rgba(0, 0, 0, 0)', 'background reset');

        document.head.removeChild(style);
    });

    QUnit.test('disabled button stays focusable', function (assert) {
        makeButton();
        button.disable();
        button.element.focus();
        assert.equal(document.activeElement, button.element, 'focus kept while disabled');
    });

    QUnit.test('page-supplied element is left as it is', function (assert) {
        const element = document.createElement('div');
        makeButton({ element: element });
        assert.equal(button.element, element, 'element used as given');
        assert.notOk(element.hasAttribute('aria-label'), 'no aria-label added');
    });

})();
