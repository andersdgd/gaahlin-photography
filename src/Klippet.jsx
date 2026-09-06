// Gaahlin Photography — Klippet.jsx (rummet, Arc 8 pass 8.1)
// v0.2.0 — Riktiga bilder. Poolen hämtas ur gaahlin.galleries/images (publika, i galleriordning; ?g=<slug> =
//   ett galleri, RLS avgör) och bildintelligensen ur gaahlin.image_intelligence (migration 0007, räknad i
//   adminens Analys): fokus = mitt mellan ögonen, direkt blick, ljusriktning/hårdhet, ansiktsboxens andel,
//   tonalitet, lum8-embedding (cosinuslikhet i regel 7). Bilder utan analys klipper på centrum med neutrala
//   värden. Nativ <img> (HDR-vägen), en i taget på svart. Noll väntan: alla bilder förladdas vid öppning och
//   klipparen väljer bara bland laddade; öppningsbilden visas i samma ögonblick som den är laddad.
//   Kapitel = galleriets titel som hörnetikett. ?fixtur=1 = den syntetiska poolen från v0.1.0 (testbänk).
//   Ingen DB-kontakt ⇒ fixturpoolen med orsaken i ?debug=1. Motorn (layout/focusAt/createCutter/klippet) orörd.
//   Buggfix: dubbelklipps-spärren startade på 0 och svalde klipp under sidans första 300 ms — startvärde -1e9.
// v0.1.0 — "Rummet ser bilderna": matchklippet på ögonen. Varje byte är ett hårt klipp där nästa bilds fokus
//   (mellan ögonen) placeras exakt där föregående bilds fokus låg på skärmen; sedan glider bilden till vila
//   på 560 ms (0 ms vid prefers-reduced-motion). Klipparen väljer nästa bild ur poolen med Anders partitur
//   (GAAHLIN-AMAZE.md §5: blickslag, matchklipp, ljusets löpning/vändning, skala, tonalitet, serie,
//   uppmärksamhet ur dwell, seedat brus; ingen repris inom N). Filmen spelar i besökarens takt: tap/klick,
//   scroll/svep uppåt eller →/mellanslag klipper nu; rörelse över bilden håller; annars klipper rummet
//   efter dwell (3 000 ms). Inga reglage, inga titelramar — serien som hörnetikett.
//   Poolen är FIXTURER: tio syntetiska prints i tre serier (flata toner: hårt ljus som två ytor, ögon som
//   två punkter, hand-satta fokuspunkter). Analys i adminen (8.1-bygget) ersätter dem med riktiga bilder
//   och riktiga ögonpunkter; motorn här är densamma. Ingen DB, inget nät, inga bilder att vänta på.
//   ?debug=1 = blickpunkt (ring), regelspår, mätremsa och länkar. ?seed=<n> = reproducerbar film
//   (utan seed: ny film per besök). ?dwell=<ms> = dwell. Felgräns visar en krasch som text, aldrig svart.
//   Testbänk: window.__klippetOnCut(info) anropas i klippögonblicket (bara när den finns).

import { Component, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'

const BUCKET = 'gaahlin-public'
const publicUrl = (key) => supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl

// =============================================================================================
// Felgräns + fångade fel (visas med ?debug=1 och vid krasch)
// =============================================================================================
const caught = []
if (typeof window !== 'undefined' && !window.__klippetHooked) {
  window.__klippetHooked = true
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
          <div>Klippet kraschade i webbläsaren. Skicka den här texten till Claude:</div>
          <div style={{ marginTop: '1rem' }}>{String(e?.message || e)}</div>
          <div style={{ marginTop: '1rem', opacity: .6 }}>{String(e?.stack || '')}</div>
          <div style={{ marginTop: '1rem', opacity: .6 }}>{caught.join('\n')}</div>
          <div style={{ marginTop: '1rem' }}><a href="/" style={{ color: '#fff' }}>Till startsidan</a></div>
        </div>
      )
    }
    return this.props.children
  }
}

const q = (s) => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(s).matches : false)
const param = (k) => (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get(k) : null)

// =============================================================================================
// Fixturpool — tio prints i tre serier. Fält: r = bredd/höjd, f = fokus (mellan ögonen) 0..1,
// d = direkt blick, l = ljusets riktning (grader: 0 = från höger, 90 = uppifrån, 180 = från vänster),
// sc = ansiktsboxens andel av höjden (>0,30 = tätt), m = medelluminans (<0,25 = lågkey), h = ljusets hårdhet.
// =============================================================================================
const FIXTURES = [
  { id: 1, s: 'I', r: .8, f: [.50, .36], d: 1, l: 180, sc: .55, m: .22, h: .9 },
  { id: 2, s: 'I', r: .8, f: [.42, .40], d: 0, l: 170, sc: .25, m: .30, h: .6 },
  { id: 3, s: 'I', r: 1.5, f: [.62, .38], d: 1, l: 160, sc: .20, m: .35, h: .7 },
  { id: 4, s: 'II', r: 1, f: [.50, .42], d: 1, l: 0, sc: .60, m: .18, h: .95 },
  { id: 5, s: 'II', r: .8, f: [.55, .34], d: 0, l: 20, sc: .35, m: .20, h: .7 },
  { id: 6, s: 'II', r: 1.5, f: [.35, .45], d: 1, l: 10, sc: .15, m: .55, h: .5 },
  { id: 7, s: 'III', r: .67, f: [.48, .30], d: 1, l: 190, sc: .45, m: .28, h: .85 },
  { id: 8, s: 'III', r: 1.5, f: [.70, .40], d: 0, l: 175, sc: .22, m: .40, h: .6 },
  { id: 9, s: 'III', r: .8, f: [.50, .38], d: 1, l: 5, sc: .50, m: .15, h: .9 },
  { id: 10, s: 'III', r: 1, f: [.44, .44], d: 1, l: 90, sc: .30, m: .62, h: .4 },
]

// =============================================================================================
// Poolen ur databasen — en rad per publik bild, i galleriordning, med intelligensen invävd.
// Fält som klipparen läser: s (serie = galleri-slug), r (b/h), f (fokus 0..1), d (direkt blick),
// l (ljusets vinkel), sc (ansiktsbox/höjd), m (medelluminans), h (hårdhet), e (embedding), url, title, intel.
// =============================================================================================
const NEUTRAL = { f: [0.5, 0.42], d: 0, l: 90, sc: 0, m: 0.5, h: 0.5 }
async function fetchPool(gSlug) {
  if (!supabase) throw new Error('Supabase-klienten saknas (env)')
  let q = supabase
    .from('galleries')
    .select('id, slug, title, sort_order, images(id, storage_path, width, height, sort_order, is_public)')
    .order('sort_order')
  q = gSlug ? q.eq('slug', gSlug) : q.eq('is_public', true)
  const g = await q
  if (g.error) throw new Error('galleries: ' + g.error.message)
  const ii = await supabase.from('image_intelligence').select('image_id, faces, focus, tonality, light, embedding')
  const intel = {}
  if (!ii.error) for (const r of ii.data || []) intel[r.image_id] = r
  const pool = []
  let n = 0
  for (const gal of g.data || []) {
    const ims = (gal.images || []).filter((im) => im.storage_path && (gSlug || im.is_public)).sort((a, b) => a.sort_order - b.sort_order)
    for (const im of ims) {
      const x = intel[im.id]
      const face = x && x.faces && x.faces[0]
      const w = im.width || 3, h = im.height || 2
      pool.push({
        id: ++n, uid: im.id, s: gal.slug, title: gal.title, r: w / h, url: publicUrl(im.storage_path),
        f: (x && x.focus && x.focus.length === 2) ? x.focus : NEUTRAL.f,
        d: face && face.gaze && face.gaze.direct ? 1 : 0,
        l: x && x.light && Number.isFinite(x.light.angle) ? x.light.angle : NEUTRAL.l,
        sc: face ? face.box[3] : NEUTRAL.sc,
        m: x && x.tonality && Number.isFinite(x.tonality.mean) ? x.tonality.mean : NEUTRAL.m,
        h: x && x.light && Number.isFinite(x.light.hardness) ? x.light.hardness : NEUTRAL.h,
        e: x && Array.isArray(x.embedding) && x.embedding.length ? x.embedding : null,
        intel: !!x,
      })
    }
  }
  return pool
}
const cosine = (a, b) => { let s = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) s += a[i] * b[i]; return s }
// Likhet för regel 7: embedding om båda har en, annars serie-släktskap.
const similar = (A, B) => (A.e && B.e) ? cosine(A.e, B.e) > 0.85 : A.s === B.s

const DWELL_DEFAULT = 3000
const GLIDE_MS = 560
const EASE = 'cubic-bezier(.2,.7,.2,1)'

// =============================================================================================
// Geometri — en bild i taget, "contain" på svart. Fokus i skärmkoordinater = vilorekt + f · storlek.
// =============================================================================================
function layout(p, W, H) {
  let w = W, h = W / p.r
  if (h > H) { h = H; w = H * p.r }
  return { x: (W - w) / 2, y: (H - h) / 2, w, h }
}
function focusAt(p, W, H) {
  const r = layout(p, W, H)
  return { x: r.x + p.f[0] * r.w, y: r.y + p.f[1] * r.h }
}

// =============================================================================================
// Klipparen — Anders partitur (AMAZE §5). Viktade poäng för nästa bild B givet A och sessionens historik.
// =============================================================================================
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const angleDiff = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d }

function createCutter(pool, seed) {
  const rnd = mulberry32(seed)
  const byId = Object.fromEntries(pool.map((p) => [p.id, p]))
  const bright = Math.max(...pool.map((p) => p.m))
  const N = Math.min(8, Math.floor(pool.length / 2))
  const st = { seq: [], lightRun: 1, serRun: 1, darkMode: false, darkCnt: 0 }

  // Regel 8 — öppning: starkaste blicken och hårdaste ljuset i serien som ligger först.
  function open() {
    const first = pool.filter((p) => p.s === pool[0].s)
    first.sort((a, b) => (b.d * 2 + b.h) - (a.d * 2 + a.h))
    const p = first[0]
    st.seq = [p]
    st.darkCnt = p.m < .25 ? 1 : 0
    return p
  }

  function rank(A, W, H, dwell, ignoreRecent, ready) {
    const idx = st.seq.length
    const recent = ignoreRecent ? [] : st.seq.slice(-N).map((x) => x.id)
    const fa = focusAt(A, W, H)
    const diag = Math.hypot(W, H) || 1
    const prev = st.seq[st.seq.length - 2]
    const out = []
    for (const B of pool) {
      if (B.id === A.id) continue
      if (ready && !ready(B)) continue   // noll väntan: bara bilder som redan är laddade
      if (recent.includes(B.id)) { out.push({ B, s: -99, parts: [], why: 'repris inom ' + N }); continue }
      const parts = []
      let s = 0, why = ''
      const add = (name, v) => { parts.push([name, v]); s += v }
      // 1. Blickslag — var tredje bild ska ha direkt blick.
      if ((idx + 1) % 3 === 0) { if (B.d) add('blickslag', 3); else why = 'blickslag krävs' }
      // 2. Matchklipp — B:s fokus nära A:s fokus i skärmkoordinater; ögon mot ögon.
      const fb = focusAt(B, W, H)
      const d = Math.hypot(fb.x - fa.x, fb.y - fa.y) / diag
      add('matchklipp ' + (1 - d).toFixed(2), 2 * (1 - d))
      add('ögon mot ögon', 1)
      // 3. Ljusets löpning — samma riktning i 4–6 bilder, sedan en vändning.
      const la = angleDiff(A.l, B.l)
      if (la < 45) {
        if (st.lightRun < 6) add('ljus löper (' + (st.lightRun + 1) + ')', 1.5)
        else { add('ljus löper för länge', 0); why = why || 'löpning slut' }
      } else if (la > 135 && st.lightRun >= 4) add('vändning', 2)
      // 4. Skala — växla tätt och vitt.
      const ta = A.sc > .3, tb = B.sc > .3
      if (ta !== tb) add(tb ? 'skala: vitt → tätt' : 'skala: tätt → vitt', 1)
      else if (prev && (prev.sc > .3) === ta) { add('tre lika i skala', -1); why = why || 'tre lika' }
      // 5. Tonalitet — två lågkey i rad, mörk löpning, ljusaste efter mörkt.
      const ka = A.m < .25, kb = B.m < .25
      if (ka && kb) {
        if (st.darkMode && st.darkCnt < 3) add('mörk löpning', 1)
        else { add('två lågkey i rad', -1); why = why || 'lågkey' }
      }
      if (st.darkCnt >= 2 && B.m === bright) add('ljusaste efter mörkt', 2)
      // 6. Serie — stanna 2–4, korsklipp på matchande blick.
      if (B.s === A.s) { if (st.serRun < 4) add('stannar i serien', 1); else why = why || 'serien mättad' }
      else if (st.serRun >= 2 && A.d && B.d) add('korsklipp på blick', 2)
      // 7. Uppmärksamhet — släktingar (samma serie) till det besökaren stannat vid / skippat.
      const ids = Object.keys(dwell)
      if (ids.some((k) => dwell[k] > 4000 && byId[k] && similar(byId[k], B))) add('uppmärksamhet', 1.5)
      if (ids.some((k) => dwell[k] < 1000 && byId[k] && Number(k) !== B.id && similar(byId[k], B))) add('skippad släkting', -1)
      // Brus.
      add('brus', rnd() * .1)
      out.push({ B, s, parts, why })
    }
    out.sort((a, b) => b.s - a.s)
    return out
  }

  function next(A, W, H, dwell, ready) {
    let out = rank(A, W, H, dwell, false, ready)
    if (!out.length || out[0].s < -50) out = rank(A, W, H, dwell, true, ready)   // liten pool: släpp reprisspärren
    const best = out[0]
    if (!best) return null   // inget laddat att klippa till — vänta (rummet visar aldrig en oladdad bild)
    const B = best.B
    st.lightRun = angleDiff(A.l, B.l) < 45 ? st.lightRun + 1 : 1
    if (B.s === A.s) st.serRun += 1
    else { st.serRun = 1; st.darkMode = rnd() < .5; st.darkCnt = 0 }
    st.darkCnt = B.m < .25 ? st.darkCnt + 1 : 0
    st.seq.push(B)
    return { B, score: best.s, parts: best.parts, rejected: out.slice(1, 4) }
  }

  return { open, next, seq: () => st.seq }
}

// =============================================================================================
// Print — syntetisk fixtur: flata toner. Hårt ljus = två ytor, ögon = två punkter.
// =============================================================================================
function tone(m) {
  const k = Math.max(0, Math.min(1, m))
  const g = (a, b) => Math.round(a + (b - a) * k)
  const rgb = (v) => `rgb(${v},${v},${v})`
  return { bg: rgb(g(0, 40)), sh: rgb(g(22, 90)), lt: rgb(g(130, 235)), sk: rgb(g(12, 60)) }
}
function Print({ p }) {
  const W = 1000 * p.r, H = 1000
  const t = tone(p.m)
  const fx = p.f[0] * W, fy = p.f[1] * H
  const fh = p.sc * H, rx = fh * .36, ry = fh * .5, cy = fy + fh * .12
  const e = fh * .21, ey = fh * .045, px = p.d ? 0 : e * .45
  const id = 'kp' + p.id
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', width: '100%', height: '100%' }} aria-hidden="true">
      <rect width={W} height={H} fill={t.bg} />
      <ellipse cx={fx} cy={cy + ry * 1.55} rx={rx * 3.2} ry={ry * .9} fill={t.sk} />
      <clipPath id={id}><ellipse cx={fx} cy={cy} rx={rx} ry={ry} /></clipPath>
      <ellipse cx={fx} cy={cy} rx={rx} ry={ry} fill={t.sh} />
      <rect clipPath={`url(#${id})`} x={fx - rx * .15} y={cy - ry * 2} width={rx * 3} height={ry * 4} fill={t.lt} transform={`rotate(${-p.l} ${fx} ${cy})`} />
      <ellipse cx={fx - e} cy={fy} rx={e * .36} ry={ey} fill="#f2f2f2" />
      <ellipse cx={fx + e} cy={fy} rx={e * .36} ry={ey} fill="#f2f2f2" />
      <circle cx={fx - e + px} cy={fy} r={ey * .85} fill="#111" />
      <circle cx={fx + e + px} cy={fy} r={ey * .85} fill="#111" />
    </svg>
  )
}

// =============================================================================================
// Rummet
// =============================================================================================
function Room() {
  const debug = param('debug') === '1'
  const fixtur = param('fixtur') === '1'
  const [seed] = useState(() => { const s = Number(param('seed')); return Number.isFinite(s) && s > 0 ? Math.floor(s) : (Date.now() % 1000000000) })
  const dwellMs = Math.max(400, Number(param('dwell')) || DWELL_DEFAULT)
  const reduced = q('(prefers-reduced-motion: reduce)')
  const [pool, setPool] = useState(null)          // null = hämtas
  const [source, setSource] = useState('')        // 'db' | 'fixtur' (+ orsak)
  const [cutter, setCutter] = useState(null)
  const loaded = useRef(new Set())                 // pool-id:n vars bild är laddad
  const [loadedCount, setLoadedCount] = useState(0)
  const [size, setSize] = useState({ W: 0, H: 0 })
  const [cur, setCur] = useState(null)
  const [cutNo, setCutNo] = useState(0)
  const [trace, setTrace] = useState(null)
  const stageRef = useRef(null), printRef = useRef(null), ringRef = useRef(null)
  const sizeRef = useRef(size)
  const pending = useRef(null)
  const dwell = useRef({})
  const lastT = useRef(0)
  const lastCut = useRef(-1e9)     // -1e9: spärren får aldrig svälja det första klippet (0 skulle blockera sidans första 300 ms)
  const lastWheel = useRef(-1e9)
  const touchY = useRef(null)
  const timer = useRef(null)

  // Mät scenen (och håll den mätt vid resize/rotation).
  useLayoutEffect(() => {
    const m = () => {
      const r = stageRef.current?.getBoundingClientRect()
      if (r && r.width && r.height) { const s = { W: r.width, H: r.height }; sizeRef.current = s; setSize(s) }
    }
    m()
    window.addEventListener('resize', m)
    return () => window.removeEventListener('resize', m)
  }, [])

  // Poolen: databasen (publika bilder + intelligens) eller fixturerna.
  useEffect(() => {
    let alive = true
    const useFixtures = (why) => { if (!alive) return; setSource('fixtur' + (why ? ' (' + why + ')' : '')); setPool(FIXTURES) }
    if (fixtur) { useFixtures(''); return }
    fetchPool(param('g')).then((p) => {
      if (!alive) return
      if (!p.length) { useFixtures('inga publika bilder'); return }
      setSource('db'); setPool(p)
    }).catch((e) => { caught.push('pool: ' + (e.message || e)); useFixtures(e.message || String(e)) })
    return () => { alive = false }
  }, [fixtur])

  // Förladdning: varje bild i poolen laddas i bakgrunden; klipparen ser bara laddade. Fixturer är alltid "laddade".
  useEffect(() => {
    if (!pool) return
    loaded.current = new Set()
    const c = createCutter(pool, seed)
    setCutter(c)
    if (!pool[0].url) { pool.forEach((p) => loaded.current.add(p.id)); setLoadedCount(pool.length); return }
    let alive = true
    const imgs = pool.map((p) => {
      const im = new Image()
      im.decoding = 'async'
      im.onload = () => { if (!alive) return; loaded.current.add(p.id); setLoadedCount(loaded.current.size) }
      im.onerror = () => { caught.push('bild laddade inte: ' + p.url) }
      im.src = p.url
      return im
    })
    return () => { alive = false; imgs.forEach((im) => { im.onload = null; im.onerror = null }) }
  }, [pool, seed])

  // Öppning — i samma ögonblick som öppningsbilden är laddad (fixturer: omedelbart).
  useEffect(() => {
    if (!cutter || cur) return
    const first = cutter.open()
    if (loaded.current.has(first.id)) { setCur(first); lastT.current = performance.now() }
  }, [cutter, loadedCount])   // eslint-disable-line react-hooks/exhaustive-deps

  const cut = () => {
    const now = performance.now()
    if (now - lastCut.current < 300 || !cutter) return
    const seq = cutter.seq()
    const A = seq[seq.length - 1]
    const { W, H } = sizeRef.current
    if (!A || !W || !H) return
    const res = cutter.next(A, W, H, { ...dwell.current, [A.id]: now - lastT.current }, (B) => loaded.current.has(B.id))
    if (!res) { clearTimeout(timer.current); timer.current = setTimeout(() => cutRef.current(), 250); return }   // inget laddat än — försök strax igen
    dwell.current[A.id] = now - lastT.current
    const fa = focusAt(A, W, H), fb = focusAt(res.B, W, H)
    pending.current = { A, B: res.B, fa, fb, dx: fa.x - fb.x, dy: fa.y - fb.y }
    lastT.current = now
    lastCut.current = now
    setCur(res.B)
    setTrace({ ...res, glide: Math.hypot(fa.x - fb.x, fa.y - fb.y) })
    setCutNo((n) => n + 1)
  }
  const cutRef = useRef(cut)
  cutRef.current = cut

  // Klippögonblicket: B har just renderats i vila — flytta den (utan övergång) så att fokus ligger på A:s
  // skärmposition, tvinga layout, och låt den sedan glida till vila på nästa bildruta. Ringen följer.
  useLayoutEffect(() => {
    const pd = pending.current
    if (!pd) return
    pending.current = null
    const el = printRef.current, rg = ringRef.current
    if (!el) return
    el.style.transition = 'none'
    el.style.transform = `translate(${pd.dx}px,${pd.dy}px)`
    if (rg) { rg.style.transition = 'none'; rg.style.left = pd.fa.x + 'px'; rg.style.top = pd.fa.y + 'px' }
    void el.offsetWidth
    if (typeof window.__klippetOnCut === 'function') window.__klippetOnCut({ el, A: pd.A, B: pd.B, fa: pd.fa, fb: pd.fb, dx: pd.dx, dy: pd.dy })
    requestAnimationFrame(() => {
      el.style.transition = reduced ? 'none' : `transform ${GLIDE_MS}ms ${EASE}`
      el.style.transform = 'translate(0,0)'
      if (rg) {
        rg.style.transition = reduced ? 'none' : `left ${GLIDE_MS}ms ${EASE}, top ${GLIDE_MS}ms ${EASE}`
        rg.style.left = pd.fb.x + 'px'
        rg.style.top = pd.fb.y + 'px'
      }
    })
  }, [cutNo])

  // Filmen — dwell-styrd. Rörelse över bilden håller; en flik i bakgrunden pausar.
  const schedule = () => { clearTimeout(timer.current); timer.current = setTimeout(() => cutRef.current(), dwellMs) }
  useEffect(() => { if (!cur) return; schedule(); return () => clearTimeout(timer.current) }, [cur])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const v = () => { if (document.hidden) clearTimeout(timer.current); else { lastT.current = performance.now(); schedule() } }
    document.addEventListener('visibilitychange', v)
    return () => document.removeEventListener('visibilitychange', v)
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const k = (e) => { if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cutRef.current() } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  const onWheel = (e) => {
    if (e.deltaY <= 12) return
    const now = performance.now()
    if (now - lastWheel.current < 700) return
    lastWheel.current = now
    cutRef.current()
  }
  const onTouchStart = (e) => { touchY.current = e.touches[0]?.clientY ?? null }
  const onTouchEnd = (e) => {
    const y0 = touchY.current, y1 = e.changedTouches[0]?.clientY
    touchY.current = null
    if (y0 != null && y1 != null && y0 - y1 > 40) cutRef.current()
  }

  const { W, H } = size
  const r = cur && W ? layout(cur, W, H) : null
  const f = cur && W ? focusAt(cur, W, H) : null
  const mono = { fontFamily: 'Menlo, monospace', fontSize: 11, lineHeight: 1.6, color: '#9a9a9a' }

  return (
    <div
      ref={stageRef}
      onClick={() => cutRef.current()}
      onPointerMove={schedule}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden', touchAction: 'none', overscrollBehavior: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent', cursor: 'default' }}
    >
      {cur && r && (
        <div ref={printRef} style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, willChange: 'transform' }}>
          {cur.url
            ? <img key={cur.id} src={cur.url} alt="" draggable={false} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'fill' }} />
            : <Print key={cur.id} p={cur} />}
        </div>
      )}
      {cur && (
        <div style={{ position: 'absolute', left: 18, bottom: 16, fontSize: 12, letterSpacing: '.1em', color: '#7a7a7a', pointerEvents: 'none' }}>
          {cur.title || `Serie ${cur.s}`}{debug ? ` · ${cur.uid ? 'bild' : 'print'} ${cur.id}${cur.intel === false ? ' · oanalyserad' : ''}` : ''}
        </div>
      )}
      {debug && f && (
        <div ref={ringRef} style={{ position: 'absolute', left: f.x, top: f.y, width: 26, height: 26, margin: '-13px 0 0 -13px', border: '1.5px solid #fff', borderRadius: '50%', opacity: .85, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', left: 11, top: 11, width: 2, height: 2, background: '#fff', borderRadius: '50%' }} />
        </div>
      )}
      {debug && !cur && (
        <div style={{ position: 'absolute', left: 14, top: 12, ...mono }}>{pool ? `väntar på öppningsbilden · pool ${source} · ${loadedCount}/${pool.length} laddade` : 'hämtar poolen …'}{caught.length ? '\n' + caught.join('\n') : ''}</div>
      )}
      {debug && cur && (
        <div style={{ position: 'absolute', left: 14, top: 12, maxWidth: 'min(92vw, 680px)', pointerEvents: 'none', whiteSpace: 'pre-wrap', ...mono }}>
          <div>
            {`klipp ${cutNo} · ${cur.uid ? 'bild' : 'print'} ${cur.id} · ${cur.s}` +
              (trace ? ` · glid ${Math.round(trace.glide)} px · ${reduced ? 0 : GLIDE_MS} ms` : ' · öppning') +
              ` · dwell ${dwellMs} ms · seed ${seed} · ${Math.round(W)}×${Math.round(H)}`}
          </div>
          <div>{`pool ${source} · ${pool ? pool.length : 0} bilder · ${loadedCount} laddade · ${pool ? pool.filter((p) => p.intel).length : 0} analyserade`}</div>
          <div>{cutter ? cutter.seq().map((p) => p.id).join(' → ') : ''}</div>
          {trace && <div>{`${trace.score.toFixed(1)} p: ` + trace.parts.map(([n, v]) => `${n} ${v >= 0 ? '+' : ''}${v.toFixed(1)}`).join(' · ')}</div>}
          {trace && <div>{'förkastade: ' + trace.rejected.map((x) => `print ${x.B.id} (${x.s < -50 ? x.why : x.s.toFixed(1) + (x.why ? ': ' + x.why : '')})`).join(', ')}</div>}
          {caught.length > 0 && <div style={{ color: '#f66' }}>{caught.join('\n')}</div>}
        </div>
      )}
      {debug && (
        <div style={{ position: 'absolute', right: 14, bottom: 16, ...mono }}>
          <a href="/obscura/scen" style={{ color: '#9a9a9a' }}>scen</a> · <a href="/spegeln" style={{ color: '#9a9a9a' }}>spegeln</a> · <a href="/" style={{ color: '#9a9a9a' }}>stäng</a>
        </div>
      )}
    </div>
  )
}

export default function Klippet() {
  return (
    <Boundary>
      <Room />
    </Boundary>
  )
}
