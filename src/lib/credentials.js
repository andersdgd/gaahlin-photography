// Gaahlin Photography — lib/credentials.js
// v0.1.0 — Content Credentials (C2PA) läsning i webbläsaren, utbruten ur Obscura.jsx v0.2.1 (ordagrant):
//   c2pa-lite tolkar JUMBF/CBOR ur JPEG:ens APP11-segment (ingen kryptografi), läser HDR-markörer (gain map)
//   och EXIF, och kan be c2pa-js (Wasm, från CDN) om ett signaturverdikt med tidsgräns. Delas av rummet
//   (Klippet: beviset på begäran) — Obscura.jsx bär tills vidare sin egen kopia och byter till denna vid nästa
//   beröring. describeCredentials() ger panelens texter så att rummet och scenen säger samma sak.

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

export function readCredentials(a) {
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

export function readHdr(a) {
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

export function readExif(a) {
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
export const C2PA_BASE = 'https://cdn.jsdelivr.net/npm/c2pa@0'
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

export async function verifyWithC2pa(bytes) {
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

// Panelens texter ur en metadata-post { state, cred, hdr, exif, verify, bytes } (samma logik som i Obscura.jsx).
export function describeCredentials(m, dims) {
  let credState = 'none', credText = ''
  if (!m || m.state === 'loading') { credState = 'loading'; credText = 'Läser Content Credentials' }
  else if (m.state === 'error') { credState = 'error'; credText = 'Kunde inte läsa filen' }
  else if (!m.cred?.found) { credState = 'none'; credText = 'Inga Content Credentials' }
  else if (m.verify?.state === 'verified') { credState = 'verified'; credText = 'Content Credentials verifierade' }
  else if (m.verify?.state === 'invalid') { credState = 'invalid'; credText = 'Content Credentials: signaturen stämmer inte' }
  else { credState = 'manifest'; credText = 'Content Credentials finns' }
  const a = m?.cred?.active
  const summaryText = a ? Object.entries(a.summary || {}).map(([k, v]) => `${k} ${v}`).join(', ') : ''
  const chainText = a
    ? `${m.cred.chain.length} manifest` +
      (a.ingredients?.length ? `; källa: ${a.ingredients.map((x) => x.format || x.title || x.relationship).join(', ')}` : '') +
      (a.captured || m.cred.chain.some((c) => c.captured) ? '; kamerans signatur ingår' : '; kamerans signatur ingår inte')
    : ''
  const verifyText = !m?.verify ? ''
    : m.verify.state === 'checking' ? 'kontrollerar signaturen (c2pa-js)'
    : m.verify.state === 'verified' ? `signatur giltig (c2pa-js)${m.verify.issuer ? ', utfärdare ' + m.verify.issuer : ''}${m.verify.time ? ', ' + m.verify.time : ''}`
    : m.verify.state === 'invalid' ? `signaturen validerar inte (${(m.verify.errors || []).join(', ') || 'okänd orsak'})`
    : m.verify.state === 'unavailable' ? 'ej kontrollerad (c2pa-js kunde inte laddas)'
    : ''
  const exifText = m?.exif ? [m.exif.make, m.exif.model, m.exif.software].filter(Boolean).join(' · ') : ''
  const imageText = dims
    ? `${dims.w} × ${dims.h}${m?.bytes ? `, ${(m.bytes / 1048576).toFixed(1)} MB` : ''}${m?.hdr ? (m.hdr.gainMap ? ', HDR (gain map)' : ', SDR, ingen gain map') : ''}`
    : ''
  return { credState, credText, active: a, summaryText, chainText, verifyText, exifText, imageText }
}

// Hämtar bytes och läser allt; signaturverdiktet levereras i ett andra steg via onUpdate.
export async function loadCredentials(url, onUpdate) {
  const res = await fetch(url, { mode: 'cors' })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  const bytes = new Uint8Array(await res.arrayBuffer())
  const cred = readCredentials(bytes)
  const hdr = readHdr(bytes)
  const exif = readExif(bytes)
  const first = { state: 'done', cred, hdr, exif, bytes: bytes.length, verify: cred.found ? { state: 'checking' } : { state: 'none' } }
  onUpdate(first)
  if (!cred.found) return first
  let verify
  try { verify = await verifyWithC2pa(bytes) } catch (e) { verify = { state: 'unavailable', reason: String(e?.message || e) } }
  const second = { ...first, verify }
  onUpdate(second)
  return second
}
