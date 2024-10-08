precision mediump float;
uniform sampler2D u_tile;
uniform vec2 u_tile_size;
varying vec2 v_tile_pos;

// Sum a vector
float sum3(vec3 v) {
  return dot(v,vec3(1));
}

// Weight of a matrix
float weigh3(mat3 m) {
  return sum3(m[0])+sum3(m[1])+sum3(m[2]);
}

// Take the outer product
mat3 outer3(vec3 c, vec3 r) {
  mat3 goal;
  for (int i =0; i<3; i++) {
      goal[i] = r*c[i];
  }
  return goal;
}

//*~*~*~*~*~*~*~*~*~*~*~*~*~
//  Now for the Sobel Program
//*~

// Sample the color at offset
vec3 color(float dx, float dy) {
  // calculate the color of sampler at an offset from position
  return texture2D(u_tile, v_tile_pos+vec2(dx,dy)).rgb;
}

float sobel(mat3 kernel, vec3 near_in[9]) {

  // nearest pixels
  mat3 near_out[3];

  // Get all near_in pixels
  for (int i = 0; i < 3; i++) {
      near_out[i][0] = kernel[0]*vec3(near_in[0][i],near_in[1][i],near_in[2][i]);
      near_out[i][1] = kernel[1]*vec3(near_in[3][i],near_in[4][i],near_in[5][i]);
      near_out[i][2] = kernel[2]*vec3(near_in[6][i],near_in[7][i],near_in[8][i]);
  }

  // convolve the kernel with the nearest pixels
  return length(vec3(weigh3(near_out[0]),weigh3(near_out[1]),weigh3(near_out[2])));
}

void main() {
  // Prep work
  vec3 near_in[9];
  vec3 mean = vec3(1,2,1);
  vec3 slope = vec3(-1,0,1);
  mat3 sobelX = outer3(mean,slope);
  mat3 sobelY = outer3(slope,mean);
  vec2 u = vec2(1./u_tile_size.x, 1./u_tile_size.y);
  // Calculate coordinates of nearest points
  for (int i = 0; i < 9; i++) {
    near_in[i] = color(mod(float(i),3.)*u.x, float(i/3-1)*u.y);
  }

  // Show the mixed XY contrast
  float edgeX = sobel(sobelX, near_in);
  float edgeY = sobel(sobelY, near_in);
  float mixed = length(vec2(edgeX,edgeY));
//  mixed = (max(mixed,0.5)-0.5);

  gl_FragColor = vec4(vec3(mixed),1);
}
