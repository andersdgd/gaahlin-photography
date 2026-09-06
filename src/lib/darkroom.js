// Gaahlin Photography — darkroom.js (mörkrummet)
// v0.1.0 — Arc 8. En WebGL1-motor som ritar "prints" med fyra egenskaper:
//   • Framkallning: bilden stiger ur pappret som i tråget — tätaste partierna först, högdagrarna sist,
//     styrt av bildens verkliga luminans, med ojämn "kemi" (fbm-brus) och ett kort pappersögonblick.
//   • Lampan: en mjuk ljuspöl (uLamp, i print-koordinater 0..1) ger blank baryta-sheen på ljusa toner
//     och lätt strykande ljus; uSpot gör pölen till en hård spot i mörker (Spegeln).
//   • Gaahlin-kurvan (uCurve): svartvitt med krossad svärta, S-kurva, mjuk knä i högdagrarna.
//   • Korn: luminansberoende, mest i mellantoner, animerat.
// En kontext, många prints: drawPrint() ritar en textur i en rektangel (CSS-pixlar) med alfa,
// så två prints kan blandas i samma canvas. Textures uppdateras från <img> eller <video>.
// Pixlarna i fotografiet ändras aldrig i lager som sparas — allt här är presentation.
// Returnerar null om WebGL saknas; anroparen faller tillbaka till nativ <img>.

const VERT = `
attribute vec2 aPos;
uniform vec4 uRect;   // x, y, w, h i canvas-pixlar (origo uppe till vänster)
uniform vec2 uRes;    // canvas-storlek i pixlar
varying vec2 vUv;
void main() {
  vec2 px = uRect.xy + aPos * uRect.zw;
  vec2 clip = px / uRes * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  vUv = vec2(aPos.x, 1.0 - aPos.y);
}`

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec4 uRect;
uniform float uTime, uDev, uPaperIn, uLampPower, uSpot, uCurve, uMirror, uGrain, uAlpha;
uniform vec2 uLamp;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
// Gaahlin: krossad svärta, S-kurva, bevarad spekular
vec3 gaahlin(vec3 c) {
  float L = luma(c);
  float t = smoothstep(0.07, 0.96, L);
  t = pow(t, 1.12);
  t = t * t * (3.0 - 2.0 * t);
  t = mix(t, 1.0, smoothstep(0.93, 1.0, L) * 0.5);
  return vec3(t);
}

void main() {
  vec2 uv = vUv;
  if (uMirror > 0.5) uv.x = 1.0 - uv.x;
  vec3 col = texture2D(uTex, uv).rgb;
  if (uCurve > 0.5) col = gaahlin(col);
  float L = luma(col);

  // --- framkallning ---
  float density = 1.0 - L;
  float chem = fbm(uv * 3.0 + vec2(uTime * 0.03, -uTime * 0.02)) * 0.30 + fbm(uv * 13.0) * 0.08;
  float stage = uDev * 1.45 - 0.08;
  float a = smoothstep(density + chem - 0.14, density + chem + 0.06, stage);
  // tidigt i framkallningen är bilden mjuk och lågkontrast: lyft mot mellangrått
  vec3 soft = mix(vec3(0.5), col, 0.55);
  vec3 img = mix(soft, col, smoothstep(0.35, 1.0, uDev));
  vec3 paper = vec3(0.90, 0.885, 0.86);
  vec3 dev = mix(paper, img, a);
  dev = mix(vec3(0.0), dev, uPaperIn);

  // --- lampan ---
  float aspect = uRect.z / max(uRect.w, 1.0);
  vec2 d = (uv - uLamp) * vec2(aspect, 1.0);
  float pool = exp(-dot(d, d) * 3.2);
  float lit = mix(1.0, 0.84 + 0.20 * pool, uLampPower);
  lit = mix(lit, 0.10 + 1.05 * pool, uSpot);
  float sheen = pool * pow(L, 2.4) * 0.20 * uLampPower * a;
  vec3 outc = dev * lit + sheen;

  // --- korn ---
  float g = (hash(floor(vUv * uRect.zw * 0.5) + fract(uTime * 0.7) * 91.0) - 0.5) * uGrain * (0.45 + 0.9 * (1.0 - abs(L - 0.5) * 2.0));
  outc += g * a;

  gl_FragColor = vec4(clamp(outc, 0.0, 1.0), uAlpha);
}`

export function createDarkroom(canvas, { preserve = false } = {}) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true, antialias: false, preserveDrawingBuffer: preserve, powerPreference: 'high-performance' })
  if (!gl) return null
  const compile = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error('darkroom shader: ' + log) }
    return s
  }
  const prog = gl.createProgram()
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('darkroom link: ' + gl.getProgramInfoLog(prog))
  gl.useProgram(prog)

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW)
  const aPos = gl.getAttribLocation(prog, 'aPos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  const U = {}
  for (const n of ['uTex', 'uRes', 'uRect', 'uTime', 'uDev', 'uPaperIn', 'uLampPower', 'uSpot', 'uCurve', 'uMirror', 'uGrain', 'uAlpha', 'uLamp']) U[n] = gl.getUniformLocation(prog, n)
  gl.uniform1i(U.uTex, 0)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

  let dpr = 1
  const api = {
    gl,
    resize(cssW, cssH, ratio = 1) {
      dpr = ratio
      const w = Math.max(1, Math.round(cssW * dpr)), h = Math.max(1, Math.round(cssH * dpr))
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
      gl.viewport(0, 0, w, h)
      gl.uniform2f(U.uRes, w, h)
    },
    clear() { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT) },
    texture() {
      const t = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      const h = { t, w: 0, h: 0, ready: false,
        upload(source) {
          gl.bindTexture(gl.TEXTURE_2D, t)
          try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source) } catch (e) { return false }
          h.w = source.naturalWidth || source.videoWidth || source.width || 0
          h.h = source.naturalHeight || source.videoHeight || source.height || 0
          h.ready = h.w > 0 && h.h > 0
          return h.ready
        },
        dispose() { gl.deleteTexture(t) } }
      return h
    },
    // rect i CSS-pixlar; opts: dev, paperIn, lamp [u,v], lampPower, spot, curve, mirror, grain, alpha, time
    drawPrint(tex, rect, o) {
      if (!tex || !tex.ready) return
      gl.bindTexture(gl.TEXTURE_2D, tex.t)
      gl.uniform4f(U.uRect, rect.x * dpr, rect.y * dpr, rect.w * dpr, rect.h * dpr)
      gl.uniform1f(U.uTime, o.time || 0)
      gl.uniform1f(U.uDev, o.dev == null ? 1 : o.dev)
      gl.uniform1f(U.uPaperIn, o.paperIn == null ? 1 : o.paperIn)
      gl.uniform2f(U.uLamp, o.lamp ? o.lamp[0] : 0.5, o.lamp ? o.lamp[1] : 0.5)
      gl.uniform1f(U.uLampPower, o.lampPower == null ? 1 : o.lampPower)
      gl.uniform1f(U.uSpot, o.spot || 0)
      gl.uniform1f(U.uCurve, o.curve ? 1 : 0)
      gl.uniform1f(U.uMirror, o.mirror ? 1 : 0)
      gl.uniform1f(U.uGrain, o.grain == null ? 0.035 : o.grain)
      gl.uniform1f(U.uAlpha, o.alpha == null ? 1 : o.alpha)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    },
    dispose() { try { gl.getExtension('WEBGL_lose_context')?.loseContext() } catch (e) { /* tyst */ } },
  }
  return api
}

// Passar in en bild (w×h) i en box (W×H) med marginal; returnerar rect i CSS-pixlar, centrerad.
export function containRect(w, h, W, H, maxWFrac = 0.92, maxHFrac = 0.88) {
  const bw = W * maxWFrac, bh = H * maxHFrac
  const s = Math.min(bw / w, bh / h)
  const rw = w * s, rh = h * s
  return { x: (W - rw) / 2, y: (H - rh) / 2, w: rw, h: rh }
}
