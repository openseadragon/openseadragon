attribute vec4 a_pos;
attribute vec2 a_tile_pos;
varying vec2 v_tile_pos;

void main() {
  // Pass the overlay tiles
  v_tile_pos = a_tile_pos;
  gl_Position = a_pos;
}
