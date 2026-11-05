// A MapLibre custom layer that draws shadows cast by the terrain onto the 3D terrain.
//
// How it works:
//  1. When a terrain tile comes into view, we load the elevation tiles around it and,
//     on the GPU, build its "horizon map": for each pixel and each of 16 compass
//     directions, how high the surrounding terrain rises above flat. This is slow-ish,
//     but it happens once per tile and doesn't depend on the sun.
//  2. Every frame, for each pixel we look up the horizon in the sun's direction.
//     If the horizon is higher than the sun, the pixel is in shadow. That's cheap,
//     so the sun can move every frame.
//
// MapLibre drapes what we draw onto the terrain via `renderToTerrainTile`.

import { DEM_TILE_SIZE, loadDemTile } from './dem.js'
import { createProgram, createTexture, uploadImages } from './gl.js'
import { FULLSCREEN_VERTEX, HORIZON_FRAGMENT, SHADOW_FRAGMENT } from './shaders.js'

const DIRECTIONS = 16 // compass directions per horizon map (a multiple of 4)
const HORIZON_MAP_SIZE = 512 // pixels across, per direction (same as the elevation tiles)
const MIN_ZOOM = 7 // below this, shadows are too small to see
const MAX_DEM_ZOOM = 14 // more zoomed-in tiles reuse part of a zoom 14 horizon map
const COARSE_ZOOMS_OUT = 3 // far-away terrain comes from tiles this many zooms out
const MAX_HORIZON_MAPS = 40 // GPU memory: 4 MB each
// Building a horizon map takes tens of milliseconds of GPU time, so it's split into
// pieces: each square of 4 directions is drawn in horizontal bands, a few per frame,
// so the animation stays smooth.
const BANDS_PER_SQUARE = 4
const PIECES_PER_FRAME = 2
const SOFTNESS = 0.75 // degrees over which a shadow edge fades

const SEA_LEVEL = [128 / 255, 0, 0, 1] // Terrarium-encoded 0 m

export class ShadowLayer {
  id = 'cast-shadows'
  type = 'custom'
  renderingMode = '2d'
  terrainTileRevision = 0 // bumped to tell MapLibre to redraw the terrain tiles

  sun = { azimuth: 180, altitude: 45 }
  color = [0, 0, 0, 0.5] // r, g, b in 0–1, then opacity

  horizonMaps = new Map() // "z/x/y" → { z, x, y, texture, images, lastUsed }
  readyToBuild = [] // horizon maps whose elevation tiles have loaded
  building = null // the horizon map being drawn, a piece at a time
  frame = 0

  constructor({ exaggeration = 1 } = {}) {
    this.exaggeration = exaggeration
  }

  /** Move the sun. Degrees: azimuth clockwise from north, altitude above the horizon. */
  setSun(azimuth, altitude) {
    this.sun = { azimuth, altitude }
    this.redraw()
  }

  /** Shadow color as [r, g, b, opacity], with r, g, b in 0–255. */
  setColor([r, g, b, opacity]) {
    this.color = [r / 255, g / 255, b / 255, opacity]
    this.redraw()
  }

  redraw() {
    this.terrainTileRevision++
    this.map?.triggerRepaint()
  }

  onAdd(map, gl) {
    this.map = map
    this.horizonProgram = createProgram(gl, FULLSCREEN_VERTEX, HORIZON_FRAGMENT)
    this.shadowProgram = createProgram(gl, FULLSCREEN_VERTEX, SHADOW_FRAGMENT)
    this.emptyVertexArray = gl.createVertexArray() // our shaders make their own corners
    this.framebuffer = gl.createFramebuffer()
    // Scratch space for the elevation around the tile being built, reused for every tile.
    this.fineTexture = createTexture(gl, 3 * DEM_TILE_SIZE, 3 * DEM_TILE_SIZE, false)
    this.coarseTexture = createTexture(gl, 3 * DEM_TILE_SIZE, 3 * DEM_TILE_SIZE, false)
  }

  onRemove(map, gl) {
    for (const horizonMap of this.horizonMaps.values()) gl.deleteTexture(horizonMap.texture)
    if (this.building) gl.deleteTexture(this.building.unfinished)
    this.building = null
    this.readyToBuild = []
    gl.deleteProgram(this.horizonProgram)
    gl.deleteProgram(this.shadowProgram)
    gl.deleteVertexArray(this.emptyVertexArray)
    gl.deleteFramebuffer(this.framebuffer)
    gl.deleteTexture(this.fineTexture)
    gl.deleteTexture(this.coarseTexture)
    this.horizonMaps.clear()
    this.map = null
  }

  // Called by MapLibre before drawing each frame: a safe moment to render into our own textures.
  prerender(gl) {
    this.frame++
    let finished = false
    for (let i = 0; i < PIECES_PER_FRAME; i++) {
      if (!this.building) {
        this.building = this.readyToBuild.shift()
        if (!this.building) break // nothing to do
        this.startHorizonMap(gl, this.building)
      }
      if (this.drawHorizonPiece(gl, this.building)) {
        this.building = null
        finished = true
      }
    }
    if (finished) {
      this.removeOldHorizonMaps(gl)
      this.redraw()
    } else if (this.building) {
      this.map.triggerRepaint() // come back next frame to keep going
    }
  }

  // Required by MapLibre. Without 3D terrain there's nothing to cast shadows, so draw nothing.
  render() {}

  // Called by MapLibre for each terrain tile it drapes. Clip space covers the tile, north up.
  renderToTerrainTile(gl, { tileID }) {
    const { x, y, z } = tileID.canonical
    if (z < MIN_ZOOM || this.color[3] === 0) return

    const demZoom = Math.min(z, MAX_DEM_ZOOM)
    const shift = z - demZoom
    this.requestHorizonMap(demZoom, x >> shift, y >> shift)

    // Use this tile's horizon map. While it's still loading, borrow a blurrier one
    // from a zoomed-out ancestor tile so shadows don't flicker in and out.
    for (let zoom = demZoom; zoom >= Math.max(demZoom - 4, MIN_ZOOM); zoom--) {
      const levels = z - zoom
      const horizonMap = this.horizonMaps.get(`${zoom}/${x >> levels}/${y >> levels}`)
      if (horizonMap?.texture) {
        horizonMap.lastUsed = this.frame
        this.drawShadows(gl, horizonMap, x, y, levels)
        return
      }
    }
  }

  drawShadows(gl, horizonMap, x, y, levels) {
    // A tile `levels` zooms below the horizon map covers one 2^levels-th of it.
    const scale = 1 / 2 ** levels
    const mask = 2 ** levels - 1
    const program = this.shadowProgram
    const u = program.uniforms

    gl.useProgram(program)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, horizonMap.texture)
    gl.uniform1i(u.u_horizons, 0)
    gl.uniform4f(u.u_window, (x & mask) * scale, (y & mask) * scale, scale, scale)
    gl.uniform1i(u.u_directions, DIRECTIONS)
    gl.uniform1f(u.u_sunAzimuth, this.sun.azimuth)
    gl.uniform1f(u.u_sunAltitude, this.sun.altitude)
    gl.uniform1f(u.u_softness, SOFTNESS)
    gl.uniform4fv(u.u_color, this.color)
    gl.bindVertexArray(this.emptyVertexArray)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindVertexArray(null)
  }

  // Start loading the elevation a horizon map needs, unless we already have.
  requestHorizonMap(z, x, y) {
    const key = `${z}/${x}/${y}`
    if (this.horizonMaps.has(key)) return
    const horizonMap = { z, x, y, texture: null, lastUsed: this.frame }
    this.horizonMaps.set(key, horizonMap)

    // Fine: the tile and its 8 neighbors. Coarse: the 3×3 tiles around it a few zooms out.
    const coarseZ = Math.max(z - COARSE_ZOOMS_OUT, 0)
    const coarseShift = z - coarseZ
    const around = (tz, tx, ty) =>
      [-1, 0, 1].flatMap((dy) =>
        [-1, 0, 1].map((dx) =>
          loadDemTile(tz, tx + dx, ty + dy).then((image) => ({
            image,
            x: (dx + 1) * DEM_TILE_SIZE,
            y: (dy + 1) * DEM_TILE_SIZE,
          })),
        ),
      )

    Promise.all([
      Promise.all(around(z, x, y)),
      Promise.all(around(coarseZ, x >> coarseShift, y >> coarseShift)),
    ]).then(([fine, coarse]) => {
      if (this.horizonMaps.get(key) !== horizonMap) return // removed while loading
      horizonMap.images = { fine, coarse }
      this.readyToBuild.push(horizonMap)
      this.map?.triggerRepaint()
    })
  }

  // Get a horizon map ready to draw: elevation into the scratch textures, plus an empty texture.
  startHorizonMap(gl, horizonMap) {
    const { z, x, y, images } = horizonMap
    horizonMap.images = null

    // 1. Copy the elevation tiles into the scratch textures, sea level where there's no tile.
    gl.disable(gl.SCISSOR_TEST) // otherwise MapLibre's settings could limit the clear
    gl.colorMask(true, true, true, true)
    for (const [texture, tiles] of [
      [this.fineTexture, images.fine],
      [this.coarseTexture, images.coarse],
    ]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
      gl.viewport(0, 0, 3 * DEM_TILE_SIZE, 3 * DEM_TILE_SIZE)
      gl.clearColor(...SEA_LEVEL)
      gl.clear(gl.COLOR_BUFFER_BIT)
      uploadImages(gl, texture, tiles.filter((tile) => tile.image))
    }

    // 2. Where the coarse block sits, in tile units (this tile spans 0..1).
    const coarseZ = Math.max(z - COARSE_ZOOMS_OUT, 0)
    const tilesPerCoarseTile = 2 ** (z - coarseZ)
    const coarseTileX = Math.floor(x / tilesPerCoarseTile) * tilesPerCoarseTile - x
    const coarseTileY = Math.floor(y / tilesPerCoarseTile) * tilesPerCoarseTile - y

    // 3. How many meters one tile spans at this latitude.
    const n = 2 ** z
    const latitude = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 0.5)) / n)))
    const metersPerTile = (40_075_016.686 * Math.cos(latitude)) / n

    horizonMap.unfinished = createTexture(gl, HORIZON_MAP_SIZE * (DIRECTIONS / 4), HORIZON_MAP_SIZE, true)
    horizonMap.piecesDone = 0
    horizonMap.uniforms = {
      coarseOrigin: [coarseTileX - tilesPerCoarseTile, coarseTileY - tilesPerCoarseTile],
      coarseSize: 3 * tilesPerCoarseTile,
      // The coarse block reaches at least one coarse tile beyond this tile in every direction.
      maxDistance: tilesPerCoarseTile,
      metersPerTile,
    }
  }

  // Draw the next piece (one band of one 4-direction square). Returns true once the map is complete.
  drawHorizonPiece(gl, horizonMap) {
    const square = Math.floor(horizonMap.piecesDone / BANDS_PER_SQUARE)
    const band = horizonMap.piecesDone % BANDS_PER_SQUARE
    const bandHeight = HORIZON_MAP_SIZE / BANDS_PER_SQUARE
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, horizonMap.unfinished, 0)
    // The shader works out which pixel it's on from gl_FragCoord, so drawing into a
    // smaller viewport simply fills in that part of the map.
    gl.viewport(square * HORIZON_MAP_SIZE, band * bandHeight, HORIZON_MAP_SIZE, bandHeight)
    for (const flag of [gl.BLEND, gl.DEPTH_TEST, gl.STENCIL_TEST, gl.SCISSOR_TEST, gl.CULL_FACE]) gl.disable(flag)
    gl.colorMask(true, true, true, true)

    const program = this.horizonProgram
    const u = program.uniforms
    gl.useProgram(program)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.fineTexture)
    gl.uniform1i(u.u_fine, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.coarseTexture)
    gl.uniform1i(u.u_coarse, 1)
    gl.uniform2fv(u.u_coarseOrigin, horizonMap.uniforms.coarseOrigin)
    gl.uniform1f(u.u_coarseSize, horizonMap.uniforms.coarseSize)
    gl.uniform1f(u.u_maxDistance, horizonMap.uniforms.maxDistance)
    gl.uniform1f(u.u_metersPerTile, horizonMap.uniforms.metersPerTile)
    gl.uniform1f(u.u_exaggeration, this.exaggeration)
    gl.uniform1f(u.u_mapSize, HORIZON_MAP_SIZE)
    gl.uniform1i(u.u_directions, DIRECTIONS)
    gl.bindVertexArray(this.emptyVertexArray)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindVertexArray(null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    horizonMap.piecesDone++
    if (horizonMap.piecesDone < (DIRECTIONS / 4) * BANDS_PER_SQUARE) return false
    horizonMap.texture = horizonMap.unfinished // ready to use
    horizonMap.unfinished = null
    return true
  }

  // Keep GPU memory in check: drop the horizon maps that haven't been used for the longest.
  removeOldHorizonMaps(gl) {
    const built = [...this.horizonMaps.entries()].filter(([, horizonMap]) => horizonMap.texture)
    const extra = built.length - MAX_HORIZON_MAPS
    if (extra <= 0) return
    // Never drop one that's on screen right now, even if that means going over the limit.
    const unused = built.filter(([, horizonMap]) => horizonMap.lastUsed < this.frame - 1)
    unused.sort(([, a], [, b]) => a.lastUsed - b.lastUsed)
    for (const [key, horizonMap] of unused.slice(0, extra)) {
      gl.deleteTexture(horizonMap.texture)
      this.horizonMaps.delete(key)
    }
  }
}
