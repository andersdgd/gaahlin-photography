// Gaahlin Photography — lib/seeing.js
// v0.1.0 — Seendet: MediaPipe FaceLandmarker från CDN (konstanter med datum), tolkning av ansikten till ögon,
//   blick (huvudets vridning ur meshens djup + ögonens vridning ur irisoffset) och ansiktsbox. Delas av
//   Analys i adminen (IMAGE-läge, räknar bildernas intelligens vid uppladdning) och rummet (VIDEO-läge, ser
//   besökaren lokalt — inga bildrutor lämnar enheten). Utbrutet ur AdminApp v0.14.1 utan ändring i logiken.

export const MP_VERSION = '0.10.14'   // verifierad 2026-09-06: paketroten via jsDelivr ger namngivna exporter (dev.to 2026-04-30; docs 2026-05-28)
export const MP_MODULES = [
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}`,
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/+esm`,
]
export const MP_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`
export const MP_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

// MediaPipe-index: höger öga (personens) 33/133 hörn, 159/145 lock; vänster 263/362, 386/374; iris 468/473;
// kinder 234/454, panna 10, haka 152. Vi lagrar bildens vänstra/högra (sorterat på x) — det är skärmen rummet klipper på.
const LM = { a: { outer: 33, inner: 133, top: 159, bot: 145 }, b: { outer: 263, inner: 362, top: 386, bot: 374 }, iris: [468, 473], cheeks: [234, 454], brow: 10, chin: 152 }
export const r3 = (v) => Math.round(v * 1000) / 1000
export const EYE_DEG = 80        // grader ögonvridning per enhet irisoffset (iris i ögonvrån ≈ ±0,5 ≈ ±40°)
export const DIRECT_H = 12, DIRECT_V = 25   // blick mot objektivet: inom ±12° i sidled, ±25° i höjdled (lodrätt mått är grövre)
// Huvudets vridning ur meshens djup (z ≈ samma skala som x, mindre = närmare kameran): är bildens högra kind
// längre bort än den vänstra är huvudet vänt åt höger. Pitch ur panna/haka på samma sätt (+ = nedåt).
export function headPose(pts) {
  const [c1, c2] = LM.cheeks.map((k) => pts[k])
  const [L, R] = c1.x <= c2.x ? [c1, c2] : [c2, c1]
  const yaw = (Math.atan2((R.z || 0) - (L.z || 0), Math.abs(R.x - L.x) || 1e-6) * 180) / Math.PI
  const t = pts[LM.brow], c = pts[LM.chin]
  const pitch = (Math.atan2((c.z || 0) - (t.z || 0), Math.abs(c.y - t.y) || 1e-6) * 180) / Math.PI
  return [Math.round(yaw) || 0, Math.round(pitch) || 0]
}
export function parseFaces(res) {
  const faces = []
  const lms = (res && res.faceLandmarks) || []
  for (let i = 0; i < lms.length; i++) {
    const pts = lms[i]
    if (!pts || pts.length < 400) continue
    let minx = 1, miny = 1, maxx = 0, maxy = 0
    for (const p of pts) { if (p.x < minx) minx = p.x; if (p.y < miny) miny = p.y; if (p.x > maxx) maxx = p.x; if (p.y > maxy) maxy = p.y }
    const box = [r3(minx), r3(miny), r3(maxx - minx), r3(maxy - miny)]
    if (box[3] < 0.03) continue   // för litet för att vara ett porträtt — sannolikt falskt utslag
    const eye = (sp) => {
      const c1 = pts[sp.outer], c2 = pts[sp.inner], t = pts[sp.top], b = pts[sp.bot]
      const cx = (c1.x + c2.x) / 2, cy = (c1.y + c2.y) / 2
      const w = Math.abs(c1.x - c2.x) || 1e-6, h = Math.abs(t.y - b.y) || 1e-6
      const iris = LM.iris.map((k) => pts[k]).filter(Boolean)
        .sort((p, q) => Math.hypot(p.x - cx, p.y - cy) - Math.hypot(q.x - cx, q.y - cy))[0] || { x: cx, y: cy }
      return { c: [iris.x, iris.y], off: [(iris.x - cx) / w, (iris.y - cy) / h] }
    }
    const e1 = eye(LM.a), e2 = eye(LM.b)
    const [Le, Re] = e1.c[0] <= e2.c[0] ? [e1, e2] : [e2, e1]
    const off = [(Le.off[0] + Re.off[0]) / 2, (Le.off[1] + Re.off[1]) / 2]
    // Blick mot objektivet = huvudets vridning + ögonens vridning. Iris centrerad i ett vridet huvud tittar dit
    // huvudet pekar, inte in i kameran (fyndet 2026-09-06: porträtt som tittar bort fick "direkt"). Huvudet får
    // vara vridet så länge ögonen kompenserar — det är så de starkaste porträtten ser ut.
    const head = headPose(pts)
    const dir = [Math.round(head[0] + EYE_DEG * off[0]), Math.round(head[1] + EYE_DEG * off[1])]
    const direct = Math.abs(dir[0]) < DIRECT_H && Math.abs(dir[1]) < DIRECT_V
    let pose = null
    const m = res.facialTransformationMatrixes && res.facialTransformationMatrixes[i] && res.facialTransformationMatrixes[i].data
    if (m && m.length >= 12) {
      const R = (r, c) => m[c * 4 + r]
      const yaw = Math.asin(Math.max(-1, Math.min(1, R(0, 2))))
      const pitch = Math.atan2(-R(1, 2), R(2, 2))
      const roll = Math.atan2(-R(0, 1), R(0, 0))
      pose = [yaw, pitch, roll].map((a) => Math.round((a * 180) / Math.PI) || 0)   // || 0: aldrig -0
    }
    faces.push({ box, eyes: { l: Le.c.map(r3), r: Re.c.map(r3) }, gaze: { direct, offset: off.map(r3), head, dir }, pose, score: 1 })
  }
  faces.sort((a, b) => b.box[2] * b.box[3] - a.box[2] * a.box[3])
  return faces
}

export async function loadLandmarker({ mode = 'IMAGE', numFaces = 4, onStatus = () => {} } = {}) {
  let mod = null, used = ''
  for (const url of MP_MODULES) {
    try {
      onStatus('Laddar MediaPipe ' + MP_VERSION + ' från ' + url + ' …')
      const m = await import(/* @vite-ignore */ url)
      if (m && m.FaceLandmarker && m.FilesetResolver) { mod = m; used = url; break }
    } catch (e) { /* prova nästa */ }
  }
  if (!mod) throw new Error('MediaPipe kunde inte laddas från CDN (' + MP_MODULES.join(' / ') + ')')
  onStatus('Hämtar wasm + modell (face_landmarker, ~3 MB) …')
  const vision = await mod.FilesetResolver.forVisionTasks(MP_WASM)
  const opts = (delegate) => ({
    baseOptions: { modelAssetPath: MP_MODEL, delegate },
    runningMode: mode, numFaces, outputFacialTransformationMatrixes: true, outputFaceBlendshapes: false,
    minFaceDetectionConfidence: 0.3, minFacePresenceConfidence: 0.3,   // mörka, små ansikten (fyndet 2026-09-06)
  })
  let lm, delegate = 'GPU'
  try { lm = await mod.FaceLandmarker.createFromOptions(vision, opts('GPU')) }
  catch (e) { delegate = 'CPU'; lm = await mod.FaceLandmarker.createFromOptions(vision, opts('CPU')) }
  return { lm, delegate, used }
}
