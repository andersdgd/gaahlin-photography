// Gaahlin Photography — Obscura.jsx (visningsrummet, prototyp)
// v0.2.0 — "Levande": scenen är nu mörkrummet (WebGL, src/lib/darkroom.js). Varje bild är en print som
//   framkallas i tråget när den blir aktiv (tätaste toner först, ojämn kemi, korn), och besökaren håller
//   lampan: markören/lutningen flyttar en ljuspöl med baryta-sheen över printen; vid stillhet andas lampan
//   själv. Ljud (av som standard): en dov klang per bild ur dess tonalitet. Närvaro: "N i rummet" via
//   Supabase Realtime. ?native=1 → v0.1-scenen med nativ <img> (HDR-testet). Fallback till nativ vid
//   saknad WebGL eller CORS-tainted bild. Länk till /spegeln.
// v0.1.2 — Buggfix: onLoad läste ev.currentTarget inuti setDims-uppdateraren (körs senare, React har
//   nollat currentTarget) → "null is not an object (evaluating currentTarget.naturalWidth)" så fort
//   första bilden laddat. Nu läses måtten synkront i handlern. Repro med riktiga bilder över HTTP.
// v0.1.1 — Diagnostik + robusthet efter svart sida i Safari (Chromium-repro var ren):
//   • Felgräns (ErrorBoundary) runt hela rummet — ett körfel visas som text på sidan i stället för svart.
//   • ?debug=1 visar en läsbar mätremsa: ramar, aktiv, scrollTop/clientHeight/progress, fångade fel.
//   • Öppningsramen får opacity 1 inline (syns även om paint() aldrig hinner köra), NaN-vakt i paint(),
//     scrollTop nollas vid mount, -webkit-user-select-prefix.
// v0.1.0 — Arc 8 (experiment). Rutt: /obscura. Syfte: pröva två pelare mot verkliga skärmar och
//   verkliga filer innan något annat byggs:
//   1) Trohet — en bild i taget på svart, HDR när filen har gain map (webbläsaren renderar <img>
//      nativt; ingen canvas, så HDR-vägen bryts inte). Övergångar = scroll-styrd dissolve.
//   2) Bevis — Content Credentials (C2PA) läses ur varje bild direkt i besökarens webbläsare:
//      manifestet tolkas lokalt (JUMBF/CBOR, ingen kryptografi), och signaturen verifieras
//      med c2pa-js (Wasm) från CDN när den går att ladda. Statusen skiljer alltid på
//      "manifest läst" och "signatur verifierad".
//   Bildkälla: alla publika gallerier (kapitel = galleri), eller ?g=<slug> för ett enskilt
//   galleri (även dolt, om du är inloggad i /admin i samma webbläsare — RLS avgör).
//   Teknikremsan (nere till höger) visar skärmens HDR/P3-stöd, WebGPU och scroll-driven CSS —
//   den finns för testet och tas bort i en skarp version.
//   Inga ändringar i PublicSite, index.css eller databasen.

import { Component, useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { createDarkroom, containRect } from './lib/darkroom'

const BUCKET = 'gaahlin-public'
const publicUrl = (key) => supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl

// =============================================================================================
// c2pa-lite — läser Content Credentials (C2PA/JUMBF/CBOR), HDR-markörer och EXIF ur en JPEG.
// Ingen kryptografisk verifiering här — bara läsning. (Prövad i Node mot verklig export.)
// =============================================================================================
const td = new TextDecoder('utf-8')
const u16 = (a, p) => (a[p] << 8) | a[p + 1]
const u32 = (a, p) => ((a[p] << 24) >>> 0) + ((a[p + 1] << 16) | (a[p + 2] << 8) | a[p + 3])
const ascii = (a, p, n) => String.fromCharCode(...a.subarray(p, p + n))

function jpegSegments(a) {
  const segs = []
  if (!(a[0] === 0xff && a[1] === 0xd8)) return segs
  let i = 2
  while (i + 4 <= a.length && a[i] === 0xff) {
    const m = a[i + 1]
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue }
    if (m === 0xda || m === 0xd9) break
    const L = u16(a, i + 2)
    segs.push({ marker: m, data: a.subarray(i + 4, i + 2 + L) })
    i += 2 + L
  }
  return segs
}

function cbor(a, pos) {
  const ib = a[pos]; const mt = ib >> 5; const ai = ib & 31; pos += 1
  let n
  if (ai < 24) n = ai
  else if (ai === 24) { n = a[pos]; pos += 1 }
  else if (ai === 25) { n = u16(a, pos); pos += 2 }
  else if (ai === 26) { n = u32(a, pos); pos += 4 }
  else if (ai === 27) { n = Number((BigInt(u32(a, pos)) << 32n) + BigInt(u32(a, pos + 4))); pos += 8 }
  else if (ai === 31) n = null
  else throw new Error('cbor ai')
  switch (mt) {
    case 0: return [n, pos]
    case 1: return [-1 - n, pos]
    case 2: return [{ bytes: n }, pos + n]
    case 3: return [td.decode(a.subarray(pos, pos + n)), pos + n]
    case 4: {
      const out = []
      if (n === null) { while (a[pos] !== 0xff) { const [v, p] = cbor(a, pos); out.push(v); pos = p } return [out, pos + 1] }
      for (let k = 0; k < n; k++) { const [v, p] = cbor(a, pos); out.push(v); pos = p }
      return [out, pos]
    }
    case 5: {
      const out = {}
      if (n === null) { while (a[pos] !== 0xff) { const [k, p1] = cbor(a, pos); const [v, p2] = cbor(a, p1); out[String(k)] = v; pos = p2 } return [out, pos + 1] }
      for (let k = 0; k < n; k++) { const [key, p1] = cbor(a, pos); const [v, p2] = cbor(a, p1); out[String(key)] = v; pos = p2 }
      return [out, pos]
    }
    case 6: return cbor(a, pos)
    case 7:
      if (ai === 20) return [false, pos]
      if (ai === 21) return [true, pos]
      if (ai === 22 || ai === 23) return [null, pos]
      if (ai === 25) return [null, pos + 2]
      if (ai === 26) return [new DataView(a.buffer, a.byteOffset + pos, 4).getFloat32(0), pos + 4]
      if (ai === 27) return [new DataView(a.buffer, a.byteOffset + pos, 8).getFloat64(0), pos + 8]
      return [null, pos]
    default: throw new Error('cbor mt')
  }
}

function walkBoxes(a, onBox, depth = 0) {
  let p = 0
  while (p + 8 <= a.length) {
    let L = u32(a, p); const t = ascii(a, p + 4, 4); let hdr = 8
    if (L === 1) { L = Number((BigInt(u32(a, p + 8)) << 32n) + BigInt(u32(a, p + 12))); hdr = 16 }
    if (L === 0) L = a.length - p
    if (L < hdr || p + L > a.length) break
    const body = a.subarray(p + hdr, p + L)
    if (t === 'jumb') {
      const dl = u32(body, 0)
      const jd = body.subarray(8, dl)
      const toggles = jd[16]
      let label = ''
      if (toggles & 2) { let e = 17; while (e < jd.length && jd[e] !== 0) e++; label = td.decode(jd.subarray(17, e)) }
      const node = { label, depth, children: [] }
      onBox(node)
      walkBoxes(body.subarray(dl), (child) => node.children.push(child), depth + 1)
    } else if (t === 'cbor') {
      try { onBox({ type: 'cbor', depth, value: cbor(body, 0)[0] }) } catch (e) { onBox({ type: 'cbor', depth, error: String(e) }) }
    } else if (t === 'json') {
      try { onBox({ type: 'json', depth, value: JSON.parse(td.decode(body)) }) } catch (e) { onBox({ type: 'json', depth, error: String(e) }) }
    } else {
      onBox({ type: t, depth, size: L })
    }
    p += L
  }
}

// Sätter ihop C2PA-manifestlagret ur APP11-segmenten (fortsättningspaket upprepar boxhuvudet, 8 B).
function jumbfPayload(segs) {
  const groups = new Map()
  for (const s of segs) {
    if (s.marker !== 0xeb || ascii(s.data, 0, 2) !== 'JP') continue
    const inst = u16(s.data, 2); const seq = u32(s.data, 4)
    if (!groups.has(inst)) groups.set(inst, [])
    groups.get(inst).push({ seq, data: s.data.subarray(8) })
  }
  const parts = []
  for (const [, pk] of groups) {
    pk.sort((x, y) => x.seq - y.seq)
    pk.forEach((p, i) => parts.push(i === 0 ? p.data : p.data.subarray(8)))
  }
  if (!parts.length) return null
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total); let o = 0
  for (const p of parts) { out.set(p, o); o += p.length }
  return out
}

const ACTION_SV = {
  'c2pa.created': 'skapad', 'c2pa.opened': 'öppnad', 'c2pa.edited': 'redigerad',
  'c2pa.color_adjustments': 'ton och färg', 'c2pa.cropped': 'beskärning', 'c2pa.drawing': 'maskning/ritning',
  'c2pa.filtered': 'filter', 'c2pa.resized': 'skalning', 'c2pa.placed': 'infogat material',
  'c2pa.converted': 'konvertering', 'c2pa.published': 'publicering', 'c2pa.removed': 'borttaget',
  'c2pa.transcoded': 'omkodning', 'c2pa.orientation': 'orientering', 'c2pa.unknown': 'okänd',
}

function readCredentials(a) {
  const segs = jpegSegments(a)
  const payload = jumbfPayload(segs)
  if (!payload) return { found: false }
  const roots = []
  walkBoxes(payload, (n) => roots.push(n))
  const store = roots.find((r) => r.label === 'c2pa')
  if (!store) return { found: false }
  const manifests = store.children.filter((c) => c.label && c.children)
  const chain = manifests.map((m) => {
    const assertions = m.children.find((c) => c.label === 'c2pa.assertions')?.children || []
    const claimBox = m.children.find((c) => /^c2pa\.claim/.test(c.label || ''))
    const claim = claimBox?.children.find((c) => c.type === 'cbor')?.value || {}
    const sigBox = m.children.find((c) => c.label === 'c2pa.signature')
    const sig = sigBox?.children.find((c) => c.type === 'cbor')?.value
    const byLabel = (re) => assertions.filter((x) => re.test(x.label || ''))
    const val = (box) => box?.children.find((c) => c.type === 'cbor' || c.type === 'json')?.value
    let generator = ''
    let spec = ''
    const gi = claim.claim_generator_info
    if (Array.isArray(gi) && gi[0]) { generator = [gi[0].name, gi[0].version].filter(Boolean).join(' '); spec = gi[0].specVersion || '' }
    else if (gi && typeof gi === 'object') { generator = [gi.name, gi.version].filter(Boolean).join(' '); spec = gi.specVersion || '' }
    else if (typeof claim.claim_generator === 'string') generator = claim.claim_generator.replace(/_/g, ' ')
    const actions = []
    for (const box of byLabel(/^c2pa\.actions/)) {
      const v = val(box); for (const act of v?.actions || []) actions.push(act)
    }
    const summary = {}
    for (const act of actions) { const k = ACTION_SV[act.action] || act.action; summary[k] = (summary[k] || 0) + 1 }
    const blob = JSON.stringify(actions)
    const generative = /trainedAlgorithmicMedia|generative|firefly/i.test(blob)
    const captured = actions.some((x) => x.action === 'c2pa.created' && /digitalCapture/i.test(x.digitalSourceType || ''))
    const ingredients = byLabel(/^c2pa\.ingredient/).map((box) => { const v = val(box) || {}; return { relationship: v.relationship, format: v['dc:format'], title: v['dc:title'] } })
    let creator = ''
    const cawg = val(byLabel(/^cawg\.metadata/)[0]); if (cawg?.['dc:creator']) creator = [].concat(cawg['dc:creator']).join(', ')
    const cw = val(byLabel(/^stds\.schema-org\.CreativeWork/)[0]); if (!creator && cw?.author) creator = [].concat(cw.author).map((x) => x.name || x).join(', ')
    const ex = val(byLabel(/^stds\.exif/)[0]) || {}
    const camera = [ex['exif:Make'] || ex['tiff:Make'], ex['exif:Model'] || ex['tiff:Model']].filter(Boolean).join(' ')
    const signed = !!sig
    const unprotected = Array.isArray(sig) && sig[1] && typeof sig[1] === 'object' ? sig[1] : {}
    const timestamped = !!(unprotected.sigTst || unprotected.sigTst2)
    return { label: m.label, generator, spec, creator, title: claim['dc:title'] || '', actions, summary, generative, captured, ingredients, camera, signed, timestamped }
  })
  const active = chain[chain.length - 1]
  return { found: true, active, chain }
}

function readHdr(a) {
  const segs = jpegSegments(a)
  let mpf = false, xmpHdr = false
  for (const s of segs) {
    if (s.marker === 0xe2 && ascii(s.data, 0, 4) === 'MPF\0') mpf = true
    if (s.marker === 0xe1 && ascii(s.data, 0, 5) === 'http:') {
      const x = td.decode(s.data)
      if (/hdrgm:Version|hdrgm:GainMapMax|HDRGainMap/i.test(x)) xmpHdr = true
    }
  }
  const gainMap = xmpHdr || (mpf && segs.some((s) => s.marker === 0xe1))
  return { gainMap, mpf, xmpHdr, kind: segs.length ? 'jpeg' : 'okänd' }
}

function readExif(a) {
  const seg = jpegSegments(a).find((s) => s.marker === 0xe1 && ascii(s.data, 0, 6) === 'Exif\0\0')
  if (!seg) return {}
  const t = seg.data.subarray(6)
  if (t.length < 8) return {}
  const le = ascii(t, 0, 2) === 'II'
  const r16 = (p) => le ? t[p] | (t[p + 1] << 8) : u16(t, p)
  const r32 = (p) => le ? (t[p] | (t[p + 1] << 8) | (t[p + 2] << 16)) + t[p + 3] * 16777216 : u32(t, p)
  const ifd0 = r32(4)
  if (ifd0 + 2 > t.length) return {}
  const n = r16(ifd0); const out = {}
  const want = { 0x010f: 'make', 0x0110: 'model', 0x0131: 'software', 0x0132: 'date' }
  for (let i = 0; i < n; i++) {
    const e = ifd0 + 2 + i * 12
    if (e + 12 > t.length) break
    const tag = r16(e); const type = r16(e + 2); const count = r32(e + 4)
    if (!want[tag] || type !== 2) continue
    const off = count <= 4 ? e + 8 : r32(e + 8)
    if (off + count > t.length) continue
    out[want[tag]] = td.decode(t.subarray(off, off + count)).replace(/\0+$/, '').trim()
  }
  return out
}

// =============================================================================================
// Signaturverifiering via c2pa-js (Wasm) från CDN — valfritt lager ovanpå den lokala läsningen.
// Misslyckas laddningen står "manifest läst" kvar; den påstår aldrig mer än den mätt.
// =============================================================================================
const C2PA_BASE = 'https://cdn.jsdelivr.net/npm/c2pa@0'
let c2paPromise = null
function loadC2pa() {
  if (!c2paPromise) {
    c2paPromise = (async () => {
      const entry = `${C2PA_BASE}/+esm`
      const mod = await import(/* @vite-ignore */ entry)
      return mod.createC2pa({
        wasmSrc: `${C2PA_BASE}/dist/assets/wasm/toolkit_bg.wasm`,
        workerSrc: `${C2PA_BASE}/dist/c2pa.worker.min.js`,
      })
    })()
  }
  return c2paPromise
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])

async function verifyWithC2pa(bytes) {
  const c2pa = await withTimeout(loadC2pa(), 12000)
  const blob = new Blob([bytes], { type: 'image/jpeg' })
  const result = await withTimeout(c2pa.read(blob), 12000)
  const store = result?.manifestStore
  if (!store) return { state: 'none' }
  const status = Array.isArray(store.validationStatus) ? store.validationStatus : []
  const errors = status.filter((s) => !s || !s.code || !/^(claimSignature\.validated|assertion\.hashedURI\.match|assertion\.dataHash\.match|timeStamp\.validated|signingCredential\.trusted)$/.test(s.code))
  const info = store.activeManifest?.signatureInfo || {}
  return { state: errors.length ? 'invalid' : 'verified', issuer: info.issuer || '', time: info.time || '', errors: errors.map((e) => e?.code || String(e)) }
}

// =============================================================================================
// Felgräns + fångade fel (visas med ?debug=1 och vid krasch)
// =============================================================================================
const caught = []
if (typeof window !== 'undefined' && !window.__obscuraHooked) {
  window.__obscuraHooked = true
  window.addEventListener('error', (e) => caught.push('error: ' + (e.message || e)))
  window.addEventListener('unhandledrejection', (e) => caught.push('rejection: ' + (e.reason?.message || e.reason)))
}
class Boundary extends Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  render() {
    if (this.state.err) {
      const e = this.state.err
      return (
        <div style={{ position: 'fixed', inset: 0, background: '#000', color: '#fff', padding: '2rem', fontFamily: 'Menlo, monospace', fontSize: 14, lineHeight: 1.6, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
          <div>Obscura kraschade i webbläsaren. Skicka den här texten till Claude:</div>
          <div style={{ marginTop: '1rem' }}>{String(e?.message || e)}</div>
          <div style={{ marginTop: '1rem', opacity: .6 }}>{String(e?.stack || '')}</div>
          <div style={{ marginTop: '1rem', opacity: .6 }}>{caught.join('\n')}</div>
        </div>
      )
    }
    return this.props.children
  }
}

// =============================================================================================
// Hjälpare
// =============================================================================================
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const fade = (x) => clamp(1 - (Math.abs(x) - 0.2) / 0.6, 0, 1)   // platå ±0.2, dissolve till ±0.8
const q = (s) => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(s).matches : false)
const param = (k) => (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get(k) : null)

// Tonalitet ur en laddad bild (48×48): medelluminans + spridning → styr ljudet
function tonality(img) {
  try {
    const c = document.createElement('canvas'); c.width = 48; c.height = 48
    const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0, 48, 48)
    const d = ctx.getImageData(0, 0, 48, 48).data
    let sum = 0, sum2 = 0, n = 0
    for (let i = 0; i < d.length; i += 4) { const L = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; sum += L; sum2 += L * L; n++ }
    const mean = sum / n; const sd = Math.sqrt(Math.max(0, sum2 / n - mean * mean))
    return { mean, sd }
  } catch (e) { return { mean: 0.4, sd: 0.25 } }
}

// Ljudet: en dov klang som följer bildens tonalitet. Skapas först vid användargest.
function createSound() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  const ac = new AC()
  const master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination)
  const filter = ac.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 600; filter.Q.value = 0.7; filter.connect(master)
  const mk = (type, f, g) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; const gn = ac.createGain(); gn.gain.value = g; o.connect(gn); gn.connect(filter); o.start(); return o }
  const o1 = mk('sine', 82, 0.5), o2 = mk('triangle', 123.3, 0.12), o3 = mk('sine', 41, 0.3)
  // brus (brunt) som ett svagt rum
  const len = ac.sampleRate * 2; const buf = ac.createBuffer(1, len, ac.sampleRate); const ch = buf.getChannelData(0)
  let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; ch[i] = last * 3.5 }
  const noise = ac.createBufferSource(); noise.buffer = buf; noise.loop = true
  const ng = ac.createGain(); ng.gain.value = 0.05; noise.connect(ng); ng.connect(filter); noise.start()
  const lfo = ac.createOscillator(); lfo.frequency.value = 0.05; const lg = ac.createGain(); lg.gain.value = 120; lfo.connect(lg); lg.connect(filter.frequency); lfo.start()
  return {
    ac,
    on() { ac.resume(); master.gain.setTargetAtTime(0.16, ac.currentTime, 1.2) },
    off() { master.gain.setTargetAtTime(0, ac.currentTime, 0.6) },
    tone({ mean, sd }, title) {
      const t = ac.currentTime
      const f = title ? 55 : 48 + mean * 90
      o1.frequency.setTargetAtTime(f, t, 1.4); o2.frequency.setTargetAtTime(f * 1.498, t, 1.4); o3.frequency.setTargetAtTime(f / 2, t, 1.4)
      filter.frequency.setTargetAtTime(title ? 260 : 260 + sd * 2600, t, 1.2)
    },
    dispose() { try { ac.close() } catch (e) { /* tyst */ } },
  }
}

function Mark({ state }) {
  // Ring = inga credentials · ring med punkt = manifest läst · fylld = signatur verifierad · streckad = fel
  const fill = state === 'verified' ? 'currentColor' : 'none'
  return (
    <svg className="ob-mark" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill={fill} stroke="currentColor" strokeWidth="1" strokeDasharray={state === 'error' || state === 'invalid' ? '2 2' : undefined} />
      {(state === 'manifest' || state === 'loading') && <circle cx="8" cy="8" r="2.4" fill="currentColor" />}
    </svg>
  )
}

const css = `
.ob-root{position:fixed;inset:0;background:#000;color:#fff;overflow:hidden;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.ob-stage{position:absolute;inset:0;z-index:1}
.ob-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.ob-img{position:absolute;top:50%;left:50%;max-width:92vw;max-height:88%;width:auto;height:auto;object-fit:contain;transform:translate(-50%,-50%);opacity:0;will-change:opacity,transform;-webkit-user-select:none;user-select:none;-webkit-user-drag:none}
.ob-loader{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.ob-title{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:0;will-change:opacity;padding:0 1.5rem}
.ob-title h1,.ob-title h2{font-family:'Cormorant Garamond',serif;font-weight:300;letter-spacing:.18em;text-transform:uppercase;line-height:1.1;margin:0;color:rgba(255,255,255,.82)}
.ob-title h1{font-size:clamp(2.2rem,6vw,5rem)}
.ob-title h2{font-size:clamp(1.6rem,4vw,3.2rem)}
.ob-title p{margin:1.4rem 0 0;font-size:8px;letter-spacing:.5em;text-transform:uppercase;color:rgba(255,255,255,.3)}
.ob-scroller{position:absolute;inset:0;z-index:2;overflow-y:auto;overflow-x:hidden;scroll-snap-type:y mandatory;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.ob-scroller::-webkit-scrollbar{display:none}
.ob-spacer{height:100%;scroll-snap-align:start;scroll-snap-stop:always}
.ob-ui{position:absolute;inset:0;z-index:3;pointer-events:none}
.ob-ui a,.ob-ui button{pointer-events:auto}
.ob-corner{position:absolute;font-size:8px;letter-spacing:.4em;text-transform:uppercase;color:rgba(255,255,255,.35);line-height:2}
.ob-tl{top:calc(1.4rem + env(safe-area-inset-top));left:calc(1.6rem + env(safe-area-inset-left))}
.ob-tl .ob-logo{font-family:'Cormorant Garamond',serif;font-size:13px;letter-spacing:.25em;color:#fff;text-decoration:none;display:block}
.ob-tr{top:calc(1.4rem + env(safe-area-inset-top));right:calc(1.6rem + env(safe-area-inset-right));text-align:right}
.ob-tr a,.ob-tr button{color:rgba(255,255,255,.35);text-decoration:none;transition:color .3s;background:none;border:0;padding:0;font:inherit;letter-spacing:inherit;text-transform:inherit;cursor:pointer;display:block;margin-left:auto}
.ob-tr a:hover,.ob-tr a:focus-visible,.ob-tr button:hover,.ob-tr button:focus-visible{color:#fff;outline:none}
.ob-tr button[aria-pressed="true"]{color:#fff}
.ob-bl{bottom:calc(1.4rem + env(safe-area-inset-bottom));left:calc(1.6rem + env(safe-area-inset-left));max-width:min(420px,calc(100vw - 3.2rem))}
.ob-br{bottom:calc(1.4rem + env(safe-area-inset-bottom));right:calc(1.6rem + env(safe-area-inset-right));text-align:right;color:rgba(255,255,255,.22)}
.ob-chapter{color:rgba(255,255,255,.45);white-space:nowrap}
.ob-cred{display:inline-flex;align-items:center;gap:.7rem;background:none;border:0;padding:.4rem 0;margin-top:.2rem;color:rgba(255,255,255,.45);font:inherit;font-size:8px;letter-spacing:.4em;text-transform:uppercase;cursor:pointer;transition:color .3s;text-align:left}
.ob-cred:hover,.ob-cred:focus-visible{color:#fff;outline:none}
.ob-cred[aria-expanded="true"]{color:#fff}
.ob-mark{width:12px;height:12px;flex:none}
.ob-panel{margin:0 0 .9rem;padding:1rem 0 .4rem;border-top:1px solid rgba(255,255,255,.12);display:grid;grid-template-columns:auto 1fr;column-gap:1.4rem;row-gap:.45rem;font-size:11px;letter-spacing:.04em;line-height:1.55;color:rgba(255,255,255,.72);text-transform:none;pointer-events:auto;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);padding-right:.8rem}
.ob-panel dt{font-size:8px;letter-spacing:.35em;text-transform:uppercase;color:rgba(255,255,255,.3);padding-top:.25em;white-space:nowrap}
.ob-panel dd{margin:0;overflow-wrap:anywhere}
.ob-panel .ob-dim{color:rgba(255,255,255,.4)}
.ob-dots{position:absolute;right:calc(.8rem + env(safe-area-inset-right));top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:9px;pointer-events:auto}
.ob-dots button{width:14px;height:14px;background:none;border:0;padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center}
.ob-dots span{width:3px;height:3px;border-radius:50%;background:rgba(255,255,255,.25);transition:background .4s,transform .4s;display:block}
.ob-dots button[aria-current="true"] span{background:#fff;transform:scale(1.5)}
.ob-dots button:focus-visible{outline:1px solid rgba(255,255,255,.5);outline-offset:2px}
.ob-note{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:2rem;font-size:11px;letter-spacing:.1em;line-height:2;color:rgba(255,255,255,.5);z-index:4}
.ob-note a{color:#fff}
.ob-debug{position:absolute;left:50%;top:calc(1.2rem + env(safe-area-inset-top));transform:translateX(-50%);z-index:5;font-family:Menlo,monospace;font-size:13px;line-height:1.5;color:#0f0;background:rgba(0,0,0,.7);padding:.6rem .9rem;white-space:pre-wrap;max-width:90vw;pointer-events:none}
.ob-hint{position:absolute;left:50%;bottom:calc(3.2rem + env(safe-area-inset-bottom));transform:translateX(-50%);font-size:8px;letter-spacing:.5em;text-transform:uppercase;color:rgba(255,255,255,.28);white-space:nowrap;transition:opacity 1.2s}
@media (max-width:600px){.ob-br{display:none}.ob-bl{max-width:calc(100vw - 3.2rem)}.ob-dots{display:none}.ob-img{max-width:94vw;max-height:80%}.ob-hint{bottom:calc(5rem + env(safe-area-inset-bottom))}}
@media (prefers-reduced-motion:reduce){.ob-img{transition:none}}
`

// =============================================================================================
// Komponenten
// =============================================================================================
export default function Obscura() {
  return <Boundary><Room /></Boundary>
}

const DEV_MS = 2800      // framkallningstid per print
const PAPER_MS = 320     // pappret in i tråget

function Room() {
  const [frames, setFrames] = useState(null)      // [{type:'title'|'image', ...}]
  const [note, setNote] = useState('')
  const [active, setActive] = useState(0)
  const [srcs, setSrcs] = useState({})            // index → url (laddas nära aktiv bild)
  const [dims, setDims] = useState({})            // index → {w,h} ur den laddade bilden
  const [meta, setMeta] = useState({})            // index → {state, cred, hdr, exif, verify}
  const [panelOpen, setPanelOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(false)
  const [present, setPresent] = useState(0)
  const [dbg, setDbg] = useState(null)
  const [nativeMode, setNativeMode] = useState(() => param('native') === '1')
  const debug = useRef(param('debug') === '1')
  const scrollerRef = useRef(null)
  const canvasRef = useRef(null)
  const elRefs = useRef([])          // titlar (DOM) + nativa <img>
  const imgRefs = useRef([])         // laddar-<img> (texturkälla)
  const reduced = useRef(false)
  const env = useRef({ hdr: false, p3: false, webgpu: false, sda: false })
  const dr = useRef(null)            // darkroom
  const texs = useRef({})            // index → textur
  const tone = useRef({})            // index → {mean, sd}
  const devSince = useRef({})        // index → tidsstämpel när printen lades i tråget
  const lamp = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, lastMove: 0 })
  const progressRef = useRef(0)
  const sound = useRef(null)
  const activeRef = useRef(0)

  // Miljö + titel
  useEffect(() => {
    reduced.current = q('(prefers-reduced-motion: reduce)')
    env.current = {
      hdr: q('(dynamic-range: high)'),
      p3: q('(color-gamut: p3)'),
      webgpu: typeof navigator !== 'undefined' && !!navigator.gpu,
      sda: typeof CSS !== 'undefined' && CSS.supports && CSS.supports('animation-timeline', 'view()'),
    }
    const prev = document.title
    document.title = 'Gaahlin — Obscura'
    return () => { document.title = prev }
  }, [])

  // Hämta gallerier → ramar
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!supabase) { setNote('Supabase är inte konfigurerad.'); return }
      const g = param('g')
      let query = supabase
        .from('galleries')
        .select('id, slug, title, sort_order, images(storage_path, width, height, sort_order, is_public, title)')
        .order('sort_order')
      query = g ? query.eq('slug', g) : query.eq('is_public', true)
      const { data, error } = await query
      if (!alive) return
      if (error) { setNote('Kunde inte läsa gallerierna: ' + error.message); return }
      const list = []
      list.push({ type: 'title', title: 'Gaahlin', sub: 'Obscura' })
      let n = 0
      for (const gal of data || []) {
        const imgs = (gal.images || [])
          .filter((im) => g || im.is_public)
          .sort((a, b) => a.sort_order - b.sort_order)
        if (!imgs.length) continue
        list.push({ type: 'title', title: gal.title, sub: imgs.length === 1 ? 'En bild' : `${imgs.length} bilder` })
        imgs.forEach((im, k) => {
          n += 1
          list.push({ type: 'image', url: publicUrl(im.storage_path), path: im.storage_path, w: im.width, h: im.height, chapter: gal.title, k: k + 1, of: imgs.length, alt: gal.title })
        })
      }
      if (!n) {
        setNote(g
          ? `Galleriet "${g}" gav inga bilder. Är det dolt? Logga in i /admin i samma webbläsare, eller gör det publikt tillfälligt.`
          : 'Inga publika bilder att visa.')
        return
      }
      setFrames(list)
    })()
    return () => { alive = false }
  }, [])

  // Mörkrummet: en WebGL-kontext för hela scenen. Saknas WebGL → nativt läge.
  useEffect(() => {
    if (nativeMode || !canvasRef.current) return
    try {
      const d = createDarkroom(canvasRef.current)
      if (!d) { setNativeMode(true); return }
      dr.current = d
    } catch (e) { caught.push('darkroom: ' + (e.message || e)); setNativeMode(true); return }
    const size = () => {
      const W = window.innerWidth, H = window.innerHeight
      const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(8e6 / Math.max(1, W * H)))
      dr.current.resize(W, H, ratio)
    }
    size()
    window.addEventListener('resize', size)
    return () => { window.removeEventListener('resize', size); dr.current?.dispose(); dr.current = null }
  }, [nativeMode])

  // Lampan: markör, touch, lutning. Vid stillhet andas den själv (i tick).
  useEffect(() => {
    const move = (x, y) => { const l = lamp.current; l.tx = clamp(x / window.innerWidth, 0, 1); l.ty = clamp(y / window.innerHeight, 0, 1); l.lastMove = performance.now() }
    const onPointer = (e) => move(e.clientX, e.clientY)
    const onTouch = (e) => { if (e.touches[0]) move(e.touches[0].clientX, e.touches[0].clientY) }
    const onTilt = (e) => { if (e.gamma == null || e.beta == null) return; move(window.innerWidth * (0.5 + clamp(e.gamma / 40, -1, 1) * 0.4), window.innerHeight * (0.5 + clamp((e.beta - 40) / 40, -1, 1) * 0.3)) }
    const askTilt = () => { const D = window.DeviceOrientationEvent; if (D && typeof D.requestPermission === 'function') D.requestPermission().catch(() => {}); window.removeEventListener('touchstart', askTilt) }
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchstart', askTilt, { passive: true })
    window.addEventListener('deviceorientation', onTilt)
    return () => { window.removeEventListener('pointermove', onPointer); window.removeEventListener('touchmove', onTouch); window.removeEventListener('touchstart', askTilt); window.removeEventListener('deviceorientation', onTilt) }
  }, [])

  // Scroll → progress + aktiv ram (ingen React-rendering per scroll; titlar sätts i tick)
  useEffect(() => {
    const sc = scrollerRef.current
    if (!sc || !frames) return
    if (sc.scrollTop) sc.scrollTop = 0
    let last = -1
    const read = () => {
      const vh = sc.clientHeight || 1
      const p = sc.scrollTop / vh
      if (!Number.isFinite(p)) return
      progressRef.current = p
      const a = clamp(Math.round(p), 0, frames.length - 1)
      if (a !== last) { last = a; activeRef.current = a; setActive(a) }
      if (debug.current) setDbg({ vh, scrollTop: sc.scrollTop, progress: p.toFixed(3) })
    }
    sc.addEventListener('scroll', read, { passive: true })
    window.addEventListener('resize', read)
    read()
    return () => { sc.removeEventListener('scroll', read); window.removeEventListener('resize', read) }
  }, [frames])

  // Tick: ritar prints, titlar, lampa — så länge sidan syns
  useEffect(() => {
    if (!frames) return
    let raf = 0, running = true
    const tick = () => {
      if (!running) return
      raf = requestAnimationFrame(tick)
      const now = performance.now()
      const p = progressRef.current
      const W = window.innerWidth, H = window.innerHeight
      // lampan: följ målet, annars andas
      const l = lamp.current
      if (now - l.lastMove > 3500 || reduced.current) {
        const t = now / 1000
        l.tx = 0.5 + 0.17 * Math.sin(t * 0.21) + 0.05 * Math.sin(t * 0.53)
        l.ty = 0.5 + 0.12 * Math.sin(t * 0.16 + 1.3)
      }
      l.x += (l.tx - l.x) * 0.06; l.y += (l.ty - l.y) * 0.06
      const d = dr.current
      if (d) d.clear()
      frames.forEach((f, i) => {
        const x = p - i
        const alpha = Math.abs(x) > 1.3 ? 0 : fade(x)
        if (f.type === 'title') {
          const el = elRefs.current[i]
          if (el) { const v = String(alpha); if (el.style.opacity !== v) el.style.opacity = v }
          return
        }
        if (nativeMode) {
          const el = elRefs.current[i]
          if (!el) return
          el.style.opacity = String(alpha)
          const s = reduced.current ? 1 : 1 + 0.035 * clamp(Math.abs(x), 0, 1)
          el.style.transform = `translate(-50%,-50%) scale(${s.toFixed(4)})`
          return
        }
        if (!d || alpha <= 0) return
        const tex = texs.current[i]
        if (!tex || !tex.ready) return
        if (Math.abs(x) < 0.5 && !devSince.current[i]) devSince.current[i] = now
        const since = devSince.current[i]
        const dev = since ? clamp((now - since) / DEV_MS, 0, 1) : 0
        const paperIn = since ? clamp((now - since) / PAPER_MS, 0, 1) : 0
        if (!since) return
        const rect = containRect(tex.w, tex.h, W, H, W < 600 ? 0.94 : 0.92, W < 600 ? 0.80 : 0.88)
        // printen hålls: liten parallax mot lampan, och glider upp när den tas ur tråget
        rect.x += (0.5 - l.x) * 6; rect.y += (0.5 - l.y) * 4 + (reduced.current ? 0 : -x * 18)
        const lampUv = [(l.x * W - rect.x) / rect.w, (l.y * H - rect.y) / rect.h]
        d.drawPrint(tex, rect, { dev, paperIn, lamp: lampUv, lampPower: 1, time: now / 1000, alpha, grain: 0.035 })
      })
    }
    raf = requestAnimationFrame(tick)
    const vis = () => { if (document.hidden) { running = false; cancelAnimationFrame(raf) } else if (!running) { running = true; raf = requestAnimationFrame(tick) } }
    document.addEventListener('visibilitychange', vis)
    return () => { running = false; cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', vis) }
  }, [frames, nativeMode])

  // Ladda bild-src för aktiv ram ± 1 (och de två första). Laddade behålls.
  useEffect(() => {
    if (!frames) return
    setSrcs((prev) => {
      const next = { ...prev }
      let changed = false
      frames.forEach((f, i) => {
        if (f.type !== 'image' || next[i]) return
        if (Math.abs(i - active) <= 1 || i <= 2) { next[i] = f.url; changed = true }
      })
      return changed ? next : prev
    })
  }, [frames, active])

  // Bild laddad → textur + tonalitet (mått läses synkront i handlern, aldrig i uppdateraren)
  const onImgLoad = (i, ev) => {
    const el = ev.currentTarget
    const w = el.naturalWidth, h = el.naturalHeight
    setDims((x) => x[i] ? x : { ...x, [i]: { w, h } })
    tone.current[i] = tonality(el)
    if (dr.current && !nativeMode) {
      const t = texs.current[i] || dr.current.texture()
      texs.current[i] = t
      if (!t.upload(el)) { caught.push('textur ' + i + ' (CORS?) — nativt läge'); setNativeMode(true) }
    }
    if (soundOn && sound.current && i === activeRef.current) sound.current.tone(tone.current[i], false)
  }
  const onImgError = (i) => { caught.push('bild ' + i + ' kunde inte laddas (CORS?) — nativt läge'); setNativeMode(true) }

  // Ljud följer aktiv ram
  useEffect(() => {
    if (!soundOn || !sound.current || !frames) return
    const f = frames[active]
    if (!f) return
    if (f.type === 'title') sound.current.tone({ mean: 0.3, sd: 0.1 }, true)
    else if (tone.current[active]) sound.current.tone(tone.current[active], false)
  }, [active, soundOn, frames])
  const toggleSound = () => {
    if (!sound.current) { try { sound.current = createSound() } catch (e) { caught.push('ljud: ' + (e.message || e)) } }
    if (!sound.current) return
    if (soundOn) { sound.current.off(); setSoundOn(false) } else { sound.current.on(); setSoundOn(true) }
  }
  useEffect(() => () => { sound.current?.dispose() }, [])

  // Närvaro: hur många är i rummet just nu
  useEffect(() => {
    if (!supabase || !supabase.channel) return
    let ch
    try {
      const key = Math.random().toString(36).slice(2)
      ch = supabase.channel('obscura-room', { config: { presence: { key } } })
      ch.on('presence', { event: 'sync' }, () => { try { setPresent(Object.keys(ch.presenceState()).length) } catch (e) { /* tyst */ } })
      ch.subscribe((status) => { if (status === 'SUBSCRIBED') ch.track({ at: Date.now() }).catch(() => {}) })
    } catch (e) { caught.push('närvaro: ' + (e.message || e)) }
    return () => { try { ch && supabase.removeChannel(ch) } catch (e) { /* tyst */ } }
  }, [])

  // Läs Content Credentials + HDR-markörer för aktiv bild (en gång per bild).
  useEffect(() => {
    if (!frames) return
    const f = frames[active]
    if (!f || f.type !== 'image' || meta[active]) return
    let alive = true
    setMeta((m) => ({ ...m, [active]: { state: 'loading' } }))
    ;(async () => {
      try {
        const res = await fetch(f.url, { mode: 'cors' })
        if (!res.ok) throw new Error('HTTP ' + res.status)
        const bytes = new Uint8Array(await res.arrayBuffer())
        const cred = readCredentials(bytes)
        const hdr = readHdr(bytes)
        const exif = readExif(bytes)
        if (!alive) return
        setMeta((m) => ({ ...m, [active]: { state: 'done', cred, hdr, exif, bytes: bytes.length, verify: cred.found ? { state: 'checking' } : { state: 'none' } } }))
        if (!cred.found) return
        let verify
        try { verify = await verifyWithC2pa(bytes) } catch (e) { verify = { state: 'unavailable', reason: String(e?.message || e) } }
        if (!alive) return
        setMeta((m) => ({ ...m, [active]: { ...m[active], verify } }))
      } catch (e) {
        if (!alive) return
        setMeta((m) => ({ ...m, [active]: { state: 'error', reason: String(e?.message || e) } }))
      }
    })()
    return () => { alive = false }
  }, [frames, active])

  // Tangentbord
  useEffect(() => {
    if (!frames) return
    const go = (i) => {
      const sc = scrollerRef.current
      if (!sc) return
      const j = clamp(i, 0, frames.length - 1)
      sc.scrollTo({ top: j * sc.clientHeight, behavior: reduced.current ? 'auto' : 'smooth' })
    }
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(active + 1) }
      else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(active - 1) }
      else if (e.key === 'Home') { e.preventDefault(); go(0) }
      else if (e.key === 'End') { e.preventDefault(); go(frames.length - 1) }
      else if (e.key === 'Escape') setPanelOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [frames, active])

  const goTo = (i) => {
    const sc = scrollerRef.current
    if (sc) sc.scrollTo({ top: i * sc.clientHeight, behavior: reduced.current ? 'auto' : 'smooth' })
  }

  // ---- Presentation av credentials för aktiv bild ----
  const cur = frames ? frames[active] : null
  const m = meta[active]
  let credState = 'none', credText = ''
  if (cur && cur.type === 'image') {
    if (!m || m.state === 'loading') { credState = 'loading'; credText = 'Läser Content Credentials' }
    else if (m.state === 'error') { credState = 'error'; credText = 'Kunde inte läsa filen' }
    else if (!m.cred?.found) { credState = 'none'; credText = 'Inga Content Credentials' }
    else if (m.verify?.state === 'verified') { credState = 'verified'; credText = 'Content Credentials verifierade' }
    else if (m.verify?.state === 'invalid') { credState = 'invalid'; credText = 'Content Credentials: signaturen stämmer inte' }
    else { credState = 'manifest'; credText = 'Content Credentials finns' }
  }
  const a = m?.cred?.active
  const summaryText = a ? Object.entries(a.summary).map(([k, v]) => `${k} ${v}`).join(', ') : ''
  const chainText = a
    ? `${m.cred.chain.length} manifest` +
      (a.ingredients.length ? `; källa: ${a.ingredients.map((x) => x.format || x.title || x.relationship).join(', ')}` : '') +
      (a.captured || m.cred.chain.some((c) => c.captured) ? '; kamerans signatur ingår' : '; kamerans signatur ingår inte')
    : ''
  const verifyText = !m?.verify ? ''
    : m.verify.state === 'checking' ? 'kontrollerar signaturen (c2pa-js)'
    : m.verify.state === 'verified' ? `signatur giltig (c2pa-js)${m.verify.issuer ? ', utfärdare ' + m.verify.issuer : ''}${m.verify.time ? ', ' + m.verify.time : ''}`
    : m.verify.state === 'invalid' ? `signaturen validerar inte (${(m.verify.errors || []).join(', ') || 'okänd orsak'})`
    : m.verify.state === 'unavailable' ? 'ej kontrollerad i prototypen (c2pa-js kunde inte laddas)'
    : ''
  const d = dims[active]
  const imageText = cur && cur.type === 'image'
    ? `${d ? `${d.w} × ${d.h}` : `${cur.w} × ${cur.h}`}${m?.bytes ? `, ${(m.bytes / 1048576).toFixed(1)} MB` : ''}, ${m?.hdr ? (m.hdr.gainMap ? 'HDR (gain map)' : 'SDR, ingen gain map') : ''}`
    : ''
  const e = env.current
  const showHint = active === 0 && !nativeMode

  return (
    <div className="ob-root">
      <style>{css}</style>

      <div className="ob-stage" aria-hidden="true">
        {!nativeMode && <canvas className="ob-canvas" ref={canvasRef} />}
        {frames && frames.map((f, i) => f.type === 'title' ? (
          <div key={i} className="ob-title" style={i === 0 ? { opacity: 1 } : undefined} ref={(el) => { elRefs.current[i] = el }}>
            {i === 0 ? <h1>{f.title}</h1> : <h2>{f.title}</h2>}
            <p>{f.sub}</p>
          </div>
        ) : nativeMode ? (
          <img
            key={'n' + i}
            className="ob-img"
            ref={(el) => { elRefs.current[i] = el }}
            src={srcs[i] || undefined}
            alt=""
            decoding="async"
            draggable={false}
            onLoad={(ev) => onImgLoad(i, ev)}
          />
        ) : (
          <img
            key={'l' + i}
            className="ob-loader"
            ref={(el) => { imgRefs.current[i] = el }}
            src={srcs[i] || undefined}
            crossOrigin="anonymous"
            alt=""
            decoding="async"
            onLoad={(ev) => onImgLoad(i, ev)}
            onError={() => onImgError(i)}
          />
        ))}
      </div>

      <div className="ob-scroller" ref={scrollerRef} aria-label="Visning">
        {frames && frames.map((f, i) => <section key={i} className="ob-spacer" aria-label={f.type === 'image' ? `${f.chapter}, bild ${f.k} av ${f.of}` : f.title} />)}
      </div>

      <div className="ob-ui">
        <div className="ob-corner ob-tl">
          <a className="ob-logo" href="/">Gaahlin</a>
          <span>Obscura, prototyp 0.2</span>
        </div>
        <div className="ob-corner ob-tr">
          <a href="/">Stäng</a>
          <a href="/spegeln">Spegeln</a>
          <button type="button" aria-pressed={soundOn} onClick={toggleSound}>{soundOn ? 'Ljud på' : 'Ljud'}</button>
        </div>

        {frames && (
          <div className="ob-dots" role="navigation" aria-label="Ramar">
            {frames.map((f, i) => (
              <button key={i} type="button" aria-current={i === active ? 'true' : undefined} aria-label={f.type === 'image' ? `${f.chapter} ${f.k}` : f.title} onClick={() => goTo(i)}><span /></button>
            ))}
          </div>
        )}

        {frames && <div className="ob-hint" style={{ opacity: showHint ? 1 : 0 }}>Scrolla. Du håller lampan.</div>}

        {cur && cur.type === 'image' && (
          <div className="ob-corner ob-bl">
            {panelOpen && (
              <dl className="ob-panel">
                {a ? (
                  <>
                    <dt>Skapare</dt><dd>{a.creator || <span className="ob-dim">inte angiven</span>}</dd>
                    <dt>Signerat av</dt><dd>{a.generator || 'okänt verktyg'}{a.spec ? ` (C2PA ${a.spec})` : ''}{a.timestamped ? ', tidsstämplat' : a.signed ? ', utan tidsstämpel' : ''}</dd>
                    <dt>Verifiering</dt><dd>{verifyText}</dd>
                    <dt>Åtgärder</dt><dd>{a.actions.length ? `${a.actions.length}: ${summaryText}` : <span className="ob-dim">inga registrerade</span>}</dd>
                    <dt>Generativ AI</dt><dd>{a.generative ? 'registrerad i kedjan' : 'ingen registrerad'}</dd>
                    <dt>Kedja</dt><dd>{chainText}</dd>
                  </>
                ) : (
                  <>
                    <dt>Credentials</dt><dd className="ob-dim">{m?.state === 'error' ? `filen kunde inte hämtas (${m.reason})` : 'filen bär inget C2PA-manifest'}</dd>
                  </>
                )}
                {m?.exif && (m.exif.model || m.exif.software) && (
                  <><dt>EXIF, osignerat</dt><dd>{[m.exif.make && m.exif.model ? `${m.exif.make} ${m.exif.model}` : m.exif.model, m.exif.software].filter(Boolean).join(', ')}</dd></>
                )}
                <dt>Bild</dt><dd>{imageText}</dd>
              </dl>
            )}
            <div className="ob-chapter">{cur.chapter}, {cur.k} av {cur.of}</div>
            <button type="button" className="ob-cred" aria-expanded={panelOpen} onClick={() => setPanelOpen((v) => !v)}>
              <Mark state={credState} />
              <span>{credText}</span>
            </button>
          </div>
        )}

        <div className="ob-corner ob-br" aria-label="Teknik">
          {present > 0 && <div>{present === 1 ? 'Du är ensam i rummet' : `${present} i rummet`}</div>}
          <div>{nativeMode ? 'Nativ scen' : 'Mörkrum, WebGL'}</div>
          <div>Skärm {e.hdr ? 'HDR' : 'SDR'}, {e.p3 ? 'P3' : 'sRGB'}</div>
          <div>WebGPU {e.webgpu ? 'ja' : 'nej'}</div>
        </div>

        {note && <div className="ob-note"><div>{note}<br /><a href="/">Till gaahlin.com</a></div></div>}
        {debug.current && (
          <div className="ob-debug">{[
            `frames ${frames ? frames.length : 'null'}  active ${active}  läge ${nativeMode ? 'nativ' : 'webgl'}  note ${note ? JSON.stringify(note) : '-'}`,
            `scroller ${dbg ? `vh ${dbg.vh}  scrollTop ${dbg.scrollTop}  progress ${dbg.progress}` : 'ingen scroll ännu'}`,
            `supabase ${supabase ? 'ok' : 'null'}  meta ${m ? m.state : '-'}  verify ${m?.verify?.state || '-'}  texturer ${Object.keys(texs.current).length}  ljud ${soundOn ? 'på' : 'av'}  närvaro ${present}`,
            `ua ${typeof navigator !== 'undefined' ? navigator.userAgent.replace(/^.*?(Version\/[\d.]+|Chrome\/[\d.]+).*$/, '$1') : '-'}`,
            caught.length ? 'fel: ' + caught.slice(-3).join(' | ') : 'inga fångade fel',
          ].join('\n')}</div>
        )}
      </div>
    </div>
  )
}
