# Trackpad Scroll Speed Fix

## Problem
Trackpad scrolling in OpenSeadragon was significantly faster than mouse wheel scrolling, creating an inconsistent user experience. This was due to the library normalizing all scroll events to ±1 regardless of the input device type.

## Solution
Implemented device detection and appropriate scaling factors to normalize trackpad scroll speed compared to mouse wheel scrolling.

## Changes Made

### 1. Core Implementation (`src/mousetracker.js`)
- **Modified `handleWheelEvent` function** to detect trackpad vs mouse wheel events
- **Added device detection logic** based on `deltaY` magnitude and `deltaMode`
- **Applied scaling factors**:
  - Trackpads: Use configurable sensitivity multiplier (default: 0.3)
  - Mouse wheels: Maintain original behavior (±1)

### 2. Configuration Options (`src/openseadragon.js`)
- **Added `trackpadScrollSensitivity` to DEFAULT_SETTINGS** (default: 0.3)
- **Added documentation** for the new configuration option
- **Updated MouseTracker constructor** to use DEFAULT_SETTINGS value

### 3. MouseTracker Enhancement (`src/mousetracker.js`)
- **Added `trackpadScrollSensitivity` property** to MouseTracker constructor
- **Added comprehensive documentation** for the new property
- **Maintained backward compatibility** with existing code

## Device Detection Logic
```javascript
const absDeltaY = Math.abs(event.deltaY);
const isTrackpad = absDeltaY < 10 && event.deltaMode === 0;
```

- **Trackpads**: Small `deltaY` values (< 10) in pixel mode (deltaMode = 0)
- **Mouse wheels**: Large `deltaY` values (≥ 10) in line mode (deltaMode = 1)

## Configuration

### Global Setting
```javascript
OpenSeadragon({
    trackpadScrollSensitivity: 0.3  // Lower = slower trackpad scrolling
});
```

### MouseTracker Setting
```javascript
new OpenSeadragon.MouseTracker({
    element: myElement,
    trackpadScrollSensitivity: 0.5
});
```

## Testing

### Test Files Created
1. **`test/trackpad-scroll-test.html`** - Comprehensive test page with side-by-side comparison
2. **`test/trackpad-scroll-simple.html`** - Simple test page for quick verification
3. **`test/modules/trackpad-scroll.js`** - Unit tests for the implementation

### Test Coverage
- ✅ MouseTracker property initialization
- ✅ Device detection logic
- ✅ Scroll delta calculation for both devices
- ✅ DEFAULT_SETTINGS integration
- ✅ Viewer configuration acceptance

## Usage Examples

### Basic Usage (Uses Default Settings)
```javascript
const viewer = OpenSeadragon({
    id: 'viewer',
    tileSources: 'path/to/image.dzi'
    // trackpadScrollSensitivity defaults to 0.3
});
```

### Custom Sensitivity
```javascript
const viewer = OpenSeadragon({
    id: 'viewer',
    tileSources: 'path/to/image.dzi',
    trackpadScrollSensitivity: 0.5  // More sensitive trackpad scrolling
});
```

### Runtime Adjustment
```javascript
// Adjust sensitivity after viewer creation
viewer.canvasTracker.trackpadScrollSensitivity = 0.2;
```

## Backward Compatibility
- ✅ No breaking changes to existing APIs
- ✅ Default behavior maintains original mouse wheel scrolling
- ✅ New configuration is optional
- ✅ Existing code continues to work unchanged

## Browser Support
- ✅ All modern browsers supporting wheel events
- ✅ Maintains compatibility with legacy mouse wheel events
- ✅ Works with both W3C Pointer Events and legacy mouse events

## Performance Impact
- ✅ Minimal performance impact (simple arithmetic operations)
- ✅ No additional event listeners
- ✅ No memory leaks or resource consumption

## Files Modified
1. `src/mousetracker.js` - Core scroll handling logic
2. `src/openseadragon.js` - Global configuration and documentation
3. `test/trackpad-scroll-test.html` - Comprehensive test page
4. `test/trackpad-scroll-simple.html` - Simple test page
5. `test/modules/trackpad-scroll.js` - Unit tests

## Future Enhancements
- Consider adding mouse wheel sensitivity configuration
- Add support for different trackpad types (Apple vs Windows)
- Implement adaptive sensitivity based on scroll frequency
- Add visual feedback for sensitivity adjustments

## Testing Instructions
1. Open `test/trackpad-scroll-simple.html` in a browser
2. Try scrolling with both mouse wheel and trackpad
3. Observe that trackpad scrolling now feels more similar to mouse wheel scrolling
4. Adjust the sensitivity if needed using the configuration options

This fix addresses GitHub issue #2788 and provides a consistent scrolling experience across different input devices.
