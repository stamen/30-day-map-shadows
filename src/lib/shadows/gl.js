// Small WebGL2 helpers.

export function createProgram(gl, vertexSource, fragmentSource) {
  const program = gl.createProgram()
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertexSource],
    [gl.FRAGMENT_SHADER, fragmentSource],
  ]) {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`Shader failed to compile:\n${gl.getShaderInfoLog(shader)}`)
    }
    gl.attachShader(program, shader)
    gl.deleteShader(shader) // freed once the program is deleted
  }
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Shader program failed to link:\n${gl.getProgramInfoLog(program)}`)
  }

  // Look up every uniform once, so we can write program.uniforms.u_name.
  program.uniforms = {}
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
  for (let i = 0; i < count; i++) {
    const { name } = gl.getActiveUniform(program, i)
    program.uniforms[name] = gl.getUniformLocation(program, name)
  }
  return program
}

/** An RGBA8 texture. `smooth` turns on linear filtering. */
export function createTexture(gl, width, height, smooth) {
  const texture = gl.createTexture()
  const filter = smooth ? gl.LINEAR : gl.NEAREST
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, width, height)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return texture
}

/** Copy images into a texture, byte for byte. `images` is a list of { image, x, y }. */
export function uploadImages(gl, texture, images) {
  // Save MapLibre's unpack settings and restore them afterwards.
  const saved = [gl.UNPACK_FLIP_Y_WEBGL, gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, gl.UNPACK_COLORSPACE_CONVERSION_WEBGL]
    .map((name) => [name, gl.getParameter(name)])

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE)

  gl.bindTexture(gl.TEXTURE_2D, texture)
  for (const { image, x, y } of images) {
    gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, gl.RGBA, gl.UNSIGNED_BYTE, image)
  }

  for (const [name, value] of saved) gl.pixelStorei(name, value)
}
