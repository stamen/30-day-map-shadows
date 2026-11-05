// GLSL for the cast-shadow layer.
//
// Coordinates: "tile units" put the tile we are working on at 0..1, x to the east,
// y to the south (so y = 0 is the tile's north edge, matching image rows).

// Both programs draw one rectangle that covers the whole render target.
export const FULLSCREEN_VERTEX = `#version 300 es
const vec2 CORNERS[4] = vec2[4](vec2(-1, -1), vec2(1, -1), vec2(-1, 1), vec2(1, 1));
out vec2 v_uv; // 0..1 across the target, y = 0 at the north edge

void main() {
  vec2 corner = CORNERS[gl_VertexID];
  v_uv = vec2(corner.x + 1.0, 1.0 - corner.y) / 2.0;
  gl_Position = vec4(corner, 0, 1);
}`

// Pass 1, once per tile: the horizon map.
// For each pixel and each of N compass directions, march outward over the terrain
// and record how high the horizon rises (in degrees above flat).
// Four directions fit in one RGBA pixel, so the output is N/4 squares side by side.
export const HORIZON_FRAGMENT = `#version 300 es
precision highp float;

uniform sampler2D u_fine;      // 3×3 elevation tiles around this tile, same zoom
uniform sampler2D u_coarse;    // 3×3 elevation tiles a few zooms out, for far-away terrain
uniform vec2 u_coarseOrigin;   // north-west corner of the coarse block, in tile units
uniform float u_coarseSize;    // width of the coarse block, in tile units
uniform float u_maxDistance;   // how far to march, in tile units
uniform float u_metersPerTile;
uniform float u_exaggeration;
uniform float u_mapSize;       // width of one direction square, in pixels
uniform int u_directions;

out vec4 fragColor;

const float DEM_SIZE = 512.0;

float decodeTerrarium(vec4 color) {
  return dot(color.rgb, vec3(255.0 * 256.0, 255.0, 255.0 / 256.0)) - 32768.0;
}

// Elevation at a fractional pixel position. With \`blend\`, average the 4 nearest pixels
// (hardware filtering would blend the encoded bytes, which is wrong); otherwise take the nearest.
float elevationAtPixel(sampler2D dem, vec2 pixel, bool blend) {
  ivec2 last = textureSize(dem, 0) - 1;
  if (!blend) return decodeTerrarium(texelFetch(dem, clamp(ivec2(pixel), ivec2(0), last), 0));

  vec2 p = pixel - 0.5;
  ivec2 i = ivec2(floor(p));
  vec2 f = fract(p);
  float a = decodeTerrarium(texelFetch(dem, clamp(i, ivec2(0), last), 0));
  float b = decodeTerrarium(texelFetch(dem, clamp(i + ivec2(1, 0), ivec2(0), last), 0));
  float c = decodeTerrarium(texelFetch(dem, clamp(i + ivec2(0, 1), ivec2(0), last), 0));
  float d = decodeTerrarium(texelFetch(dem, clamp(i + ivec2(1, 1), ivec2(0), last), 0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Elevation in meters at a point in tile units: detailed data nearby, coarse data further out.
float elevation(vec2 p, bool blend) {
  if (all(greaterThan(p, vec2(-0.99))) && all(lessThan(p, vec2(1.99)))) {
    return elevationAtPixel(u_fine, (p + 1.0) * DEM_SIZE, blend);
  }
  vec2 coarsePixels = vec2(textureSize(u_coarse, 0));
  return elevationAtPixel(u_coarse, (p - u_coarseOrigin) / u_coarseSize * coarsePixels, blend);
}

void main() {
  int square = int(gl_FragCoord.x / u_mapSize);
  vec2 here = vec2(mod(gl_FragCoord.x, u_mapSize), gl_FragCoord.y) / u_mapSize;
  float startHeight = elevation(here, true);

  vec4 horizons;
  for (int c = 0; c < 4; c++) {
    float azimuth = radians(float(square * 4 + c) * 360.0 / float(u_directions));
    vec2 direction = vec2(sin(azimuth), -cos(azimuth)); // compass bearing → tile units

    // Steps start one DEM pixel apart and grow by 5% each, so nearby terrain
    // is checked closely and distant mountains more loosely. Only the first few
    // steps need blended (4-pixel) elevation; further out, the nearest pixel is plenty.
    float steepest = 0.0; // rise over run of the highest point seen
    float distance = 1.0 / DEM_SIZE;
    while (distance < u_maxDistance) {
      bool nearby = distance < 16.0 / DEM_SIZE;
      float rise = (elevation(here + direction * distance, nearby) - startHeight) * u_exaggeration;
      steepest = max(steepest, rise / (distance * u_metersPerTile));
      distance += max(1.0 / DEM_SIZE, distance * 0.05);
    }
    horizons[c] = degrees(atan(steepest)) / 90.0;
  }
  fragColor = horizons;
}`

// Pass 2, every frame: shade each pixel whose horizon is higher than the sun.
export const SHADOW_FRAGMENT = `#version 300 es
precision highp float;

in vec2 v_uv;
uniform sampler2D u_horizons;
uniform vec4 u_window;        // which part of the horizon map this tile covers: offset.xy, scale.zw
uniform int u_directions;
uniform float u_sunAzimuth;   // degrees clockwise from north
uniform float u_sunAltitude;  // degrees above the horizon
uniform float u_softness;     // degrees over which a shadow edge fades
uniform vec4 u_color;         // shadow color and opacity

out vec4 fragColor;

// Horizon height in degrees, looking in stored direction k.
float horizonAt(int k, vec2 uv) {
  int squares = u_directions / 4;
  int square = k / 4;
  // Stay half a pixel inside each square so neighboring squares don't bleed in.
  float inset = 0.5 / float(textureSize(u_horizons, 0).y);
  uv = clamp(uv, inset, 1.0 - inset);
  vec4 four = texture(u_horizons, vec2((float(square) + uv.x) / float(squares), uv.y));
  return four[k - square * 4] * 90.0;
}

void main() {
  vec2 uv = u_window.xy + v_uv * u_window.zw;

  // The sun usually sits between two stored directions: blend them.
  float slot = u_sunAzimuth / 360.0 * float(u_directions);
  int before = int(floor(slot)) % u_directions;
  int after = (before + 1) % u_directions;
  float horizon = mix(horizonAt(before, uv), horizonAt(after, uv), fract(slot));

  float shadow = 1.0 - smoothstep(horizon - u_softness, horizon + u_softness, u_sunAltitude);
  float alpha = shadow * u_color.a;
  fragColor = vec4(u_color.rgb * alpha, alpha); // MapLibre expects premultiplied alpha
}`
