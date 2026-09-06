// Gaahlin Photography — Klippet.jsx (rummet, Arc 8)
// v0.5.0 — Övergången väljs per bildpar ur bildernas egna kanter (mätta vid förladdning, 32×32 via canvas — CORS grön):
//   • Svart möter svart (båda bildernas kanter < 8 % luminans): det hårda klippet på ögonen, som förut (560 ms glid).
//   • Annars: dissolve — B tonas in ovanpå A under 1 200 ms medan A tonas ut, mjuk kurva i båda ändar
//     (cubic-bezier(.4,0,.2,1)); B börjar ögon- och storleksmatchad (skalan klämd 0,85–1,2, vidbild 1,12) och glider
//     till vila under samma tid. Två bilder lever samtidigt i rummet under övergången; A behåller sin andning.
//   • Kapitelbyte: genom svart — A ut 500 ms, 150 ms svart, B in 900 ms (hårt klipp-par: 120 ms svart som förut).
//   • Öppningen tonas in 900 ms om bilden har bakgrund; på svart tänds den direkt.
//   Reduced motion: inga toningar, allt landar direkt.
// v0.4.0 — Anders styrning 2026-09-06: kameran och allt kring "blick" är borttaget (blickbedömningen höll inte mot
//   riktiga porträtt). I stället effekter ur det som ÄR bekräftat på hans bilder — ögonens läge, ansiktets storlek,
//   ljusets riktning/hårdhet, tonalitet, fokuspunkt:
//   • Hänglinjen: porträtt hänger med ögonen på samma höjd i rummet (42 % av höjden), som på en galleriväng;
//     bilden får krympa högst 15 % för att nå linjen, annars närmast möjliga.
//   • Det osynliga klippet: B börjar i den skala som gör ansiktet lika stort som A:s, med ögonen på A:s ögon,
//     och drar sig sedan till sin viloskala på 600 ms — klippet syns inte, bilden förvandlas. Vidbilder (utan
//     ansikte) öppnar 25 % närmare sin fokuspunkt och drar sig ut till hela ramen.
//   • Andningen: under bildens tid en rörelse på 5 % kring ögonen, förskjuten mot ljuset — täta porträtt drar
//     sig utåt, vida kommer närmare. Så långsam att den inte ses börja.
//   • Kapitelandningen: 120 ms svart när galleriet byter.
//   • Klipparen väljer på närvaro (ansiktets storlek × ljusets hårdhet) där den förut valde på blick.
//   Kvar från v0.3.0: tempot, Närmare (håll → 2× kring ögonen), beviset bakom etiketten, wordmark, etiketten på
//   skuggsidan, förladdning (inget klipp väntar), ?fixtur=1, ?debug=1, ?seed=<n>, ?dwell=<ms>.
// v0.3.0 — Tempo, Blicken (kamera), Närmare, beviset, wordmark, etikett på skuggsidan. (Kameran borttagen i v0.4.0.)
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
import { loadCredentials, describeCredentials } from './lib/credentials'

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
  { id: 1, s: 'I', r: .8, f: [.50, .36], d: 1, l: 180, sc: .55, m: .22, sd: 0.09, h: .9 },
  { id: 2, s: 'I', r: .8, f: [.42, .40], d: 0, l: 170, sc: .25, m: .30, sd: 0.12, h: .6 },
  { id: 3, s: 'I', r: 1.5, f: [.62, .38], d: 1, l: 160, sc: .20, m: .35, sd: 0.2, h: .7 },
  { id: 4, s: 'II', r: 1, f: [.50, .42], d: 1, l: 0, sc: .60, m: .18, sd: 0.08, h: .95 },
  { id: 5, s: 'II', r: .8, f: [.55, .34], d: 0, l: 20, sc: .35, m: .20, sd: 0.11, h: .7 },
  { id: 6, s: 'II', r: 1.5, f: [.35, .45], d: 1, l: 10, sc: .15, m: .55, sd: 0.24, h: .5 },
  { id: 7, s: 'III', r: .67, f: [.48, .30], d: 1, l: 190, sc: .45, m: .28, sd: 0.1, h: .85 },
  { id: 8, s: 'III', r: 1.5, f: [.70, .40], d: 0, l: 175, sc: .22, m: .40, sd: 0.22, h: .6 },
  { id: 9, s: 'III', r: .8, f: [.50, .38], d: 1, l: 5, sc: .50, m: .15, sd: 0.07, h: .9 },
  { id: 10, s: 'III', r: 1, f: [.44, .44], d: 1, l: 90, sc: .30, m: .62, sd: 0.27, h: .4 },
]

// =============================================================================================
// Poolen ur databasen — en rad per publik bild, i galleriordning, med intelligensen invävd.
// Fält som klipparen läser: s (serie = galleri-slug), r (b/h), f (fokus 0..1), d (direkt blick),
// l (ljusets vinkel), sc (ansiktsbox/höjd), m (medelluminans), h (hårdhet), e (embedding), url, title, intel.
// =============================================================================================
const NEUTRAL = { f: [0.5, 0.42], l: 90, sc: 0, m: 0.5, h: 0.5, sd: 0.15 }
async function fetchPool(gSlug) {
  if (!supabase) throw new Error('Supabase-klienten saknas (env)')
  let q = supabase
    .from('galleries')
    .select('id, slug, title, sort_order, images(id, storage_path, width, height, sort_order, is_public, title)')
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
        l: x && x.light && Number.isFinite(x.light.angle) ? x.light.angle : NEUTRAL.l,
        sc: face ? face.box[3] : NEUTRAL.sc,
        m: x && x.tonality && Number.isFinite(x.tonality.mean) ? x.tonality.mean : NEUTRAL.m,
        sd: x && x.tonality && Number.isFinite(x.tonality.sd) ? x.tonality.sd : NEUTRAL.sd,
        pw: w, ph: h, alt: (gal.title || '') + (im.title ? ' — ' + im.title : ''),
        h: x && x.light && Number.isFinite(x.light.hardness) ? x.light.hardness : NEUTRAL.h,
        e: x && Array.isArray(x.embedding) && x.embedding.length ? x.embedding : null,
        intel: !!x,
      })
    }
  }
  return pool
}
// Kanternas luminans (0..1) ur en laddad bild — avgör om bilden står på svart. null om canvas inte får läsa.
function edgeLuminance(img) {
  try {
    const n = 32
    const c = document.createElement('canvas'); c.width = n; c.height = n
    const x = c.getContext('2d', { willReadFrequently: true })
    x.drawImage(img, 0, 0, n, n)
    const d = x.getImageData(0, 0, n, n).data
    let sum = 0, cnt = 0
    for (let y = 0; y < n; y++) for (let xx = 0; xx < n; xx++) {
      if (y > 1 && y < n - 2 && xx > 1 && xx < n - 2) continue
      const i = (y * n + xx) * 4
      sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; cnt++
    }
    return sum / cnt / 255
  } catch (e) { return null }
}
const isDark = (p) => (Number.isFinite(p.edge) ? p.edge < EDGE_DARK : p.m < 0.12)
// Närvaro: ansiktets storlek i ramen × ljusets hårdhet — det klipparen väljer starkaste bild på.
const presence = (p) => (p.sc > 0 ? p.sc * (0.5 + 0.5 * (Number.isFinite(p.h) ? p.h : 0.5)) : 0)
const cosine = (a, b) => { let s = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) s += a[i] * b[i]; return s }
// Likhet för regel 7: embedding om båda har en, annars serie-släktskap.
const similar = (A, B) => (A.e && B.e) ? cosine(A.e, B.e) > 0.85 : A.s === B.s

const DWELL_DEFAULT = 3000
const GLIDE_MS = 560
const EASE = 'cubic-bezier(.2,.7,.2,1)'
const CLOSER_MS = 600
const CLOSER_HOLD = 2.0     // håll → närmare
const HOLD_MS = 260         // tryck längre än så = håll, kortare = tapp
const HANG = 0.42           // hänglinjen: ögonen på 42 % av scenens höjd
const HANG_MIN = 0.85       // bilden får krympa högst så här mycket för att nå linjen
const MATCH_MIN = 0.7, MATCH_MAX = 1.8   // skalmatchning vid klipp, klämd
const PANO_IN = 1.25        // vidbild öppnar 25 % närmare fokus (hårt klipp)
const DISSOLVE_MS = 1200    // dissolve mellan bilder med bakgrund
const DISSOLVE_EASE = 'cubic-bezier(.4,0,.2,1)'
const DISSOLVE_MATCH = [0.85, 1.2]   // skalmatchning under dissolve, mjukare
const PANO_IN_SOFT = 1.12
const FADE_OUT_MS = 500, FADE_GAP_MS = 150, FADE_IN_MS = 900   // genom svart vid kapitelbyte
const OPEN_FADE_MS = 900
const EDGE_DARK = 0.08      // kanternas luminans under detta = "på svart"
const BREATH = 0.05         // andningen: 5 % under bildens tid
const CHAPTER_MS = 120      // kapitelandningen: svart vid gallerbyte
// Tempo: dwell per bild = bas × (0,8 + 2·sd, klämt 0,7–1,5) × (1,15 vid stark närvaro) × besökarens takt (0,5–2).
function dwellFor(p, base, tempo, maxP) {
  const sd = Number.isFinite(p.sd) ? p.sd : 0.15
  let f = Math.max(0.7, Math.min(1.5, 0.8 + 2 * sd))
  if (maxP > 0 && presence(p) >= 0.6 * maxP) f *= 1.15
  return Math.round(base * f * tempo)
}

// =============================================================================================
// Geometri — en bild i taget, "contain" på svart. Fokus i skärmkoordinater = vilorekt + f · storlek.
// =============================================================================================
function contain(p, W, H) {
  let w = W, h = W / p.r
  if (h > H) { h = H; w = H * p.r }
  return { x: (W - w) / 2, y: (H - h) / 2, w, h }
}
// Vilorekt: bilder utan ansikte centreras; porträtt hänger med ögonen på hänglinjen. Bilden får krympa högst
// (1 − HANG_MIN) för att nå linjen — räcker inte det läggs ögonen så nära linjen som ramen tillåter. Aldrig beskuren.
function layout(p, W, H) {
  const base = contain(p, W, H)
  if (!(p.sc > 0) || !(p.f[1] > 0.02 && p.f[1] < 0.98)) return base
  const hangY = HANG * H
  const hMax = Math.min(hangY / p.f[1], (H - hangY) / (1 - p.f[1]))
  let h = Math.min(base.h, hMax)
  if (h < base.h * HANG_MIN) h = base.h * HANG_MIN
  const w = h * p.r
  const y = Math.max(0, Math.min(H - h, hangY - p.f[1] * h))
  return { x: (W - w) / 2, y, w, h }
}
function focusAt(p, W, H) {
  const r = layout(p, W, H)
  return { x: r.x + p.f[0] * r.w, y: r.y + p.f[1] * r.h, r }
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
  const maxP = Math.max(...pool.map(presence))
  const N = Math.min(8, Math.floor(pool.length / 2))
  const st = { seq: [], lightRun: 1, serRun: 1, darkMode: false, darkCnt: 0 }

  // Regel 8 — öppning: starkaste närvaron (ansikte × hårt ljus) i serien som ligger först.
  function open() {
    const first = pool.filter((p) => p.s === pool[0].s)
    first.sort((a, b) => (presence(b) * 2 + b.h) - (presence(a) * 2 + a.h))
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
      // 1. Närvaroslag — var tredje bild ska bära stark närvaro (ansikte × hårt ljus).
      if ((idx + 1) % 3 === 0) { const pr = maxP > 0 ? presence(B) / maxP : 0; if (pr >= 0.5) add('närvaroslag', 3 * pr); else why = 'närvaro krävs' }
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
      else if (st.serRun >= 2 && A.sc > .3 && B.sc > .3) add('korsklipp tätt mot tätt', 2)
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

  return { open, next, seq: () => st.seq, maxP }
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
  const stageRef = useRef(null), ringRef = useRef(null)
  const nodes = useRef({})                          // pool-id → { el, breath }
  const [prev, setPrev] = useState(null)            // bilden som tonas ut under en dissolve
  const prevTimer = useRef(null)
  const sizeRef = useRef(size)
  const pending = useRef(null)
  const dwell = useRef({})
  const lastT = useRef(0)
  const lastCut = useRef(-1e9)     // -1e9: spärren får aldrig svälja det första klippet (0 skulle blockera sidans första 300 ms)
  const lastWheel = useRef(-1e9)
  const timer = useRef(null)
  // Tempo: besökarens manuella klipp (intervall, EMA) styr filmen inom sessionen.
  const tempoRef = useRef({ ema: 0, n: 0, last: 0 })
  const [tempo, setTempo] = useState(1)
  // Närmare: håll (pekare).
  const pointer = useRef({ down: false, t: 0, x: 0, y: 0, moved: false, held: false, timer: null })
  const [closer, setCloser] = useState(0)          // 0 = vila, annars skalfaktor
  const [blank, setBlank] = useState(false)        // kapitelandningen
  // Beviset på begäran.
  const [proofOpen, setProofOpen] = useState(false)
  const [proof, setProof] = useState(null)         // metadata för aktuell bild
  const proofCache = useRef({})

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
    if (!pool[0].url) { pool.forEach((p) => { p.edge = 0.157 * p.m; loaded.current.add(p.id) }); setLoadedCount(pool.length); return }
    let alive = true
    const imgs = pool.map((p) => {
      const im = new Image()
      im.crossOrigin = 'anonymous'   // samma CORS-läge som <img> i rummet → en hämtning, och kanterna får läsas
      im.decoding = 'async'
      im.onload = () => { if (!alive) return; p.edge = edgeLuminance(im); loaded.current.add(p.id); setLoadedCount(loaded.current.size) }
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

  const cut = (manual = false) => {
    const now = performance.now()
    if (now - lastCut.current < 300 || !cutter) return
    const seq = cutter.seq()
    const A = seq[seq.length - 1]
    const { W, H } = sizeRef.current
    if (!A || !W || !H) return
    const res = cutter.next(A, W, H, { ...dwell.current, [A.id]: now - lastT.current }, (B) => loaded.current.has(B.id))
    if (!res) { clearTimeout(timer.current); timer.current = setTimeout(() => cutRef.current(), 250); return }   // inget laddat än — försök strax igen
    dwell.current[A.id] = now - lastT.current
    const B = res.B
    const fa = focusAt(A, W, H), fb = focusAt(B, W, H)
    // Övergång: svart möter svart → hårt klipp; annars dissolve. Skalmatchning: B börjar med ansiktet lika stort
    // som A:s (ögonen på A:s ögon); vidbild öppnar närmare fokus. Under dissolve mjukare skalor.
    const dissolve = !(isDark(A) && isDark(B)) && !reduced
    const [mMin, mMax] = dissolve ? DISSOLVE_MATCH : [MATCH_MIN, MATCH_MAX]
    let s0 = 1
    if (A.sc > 0 && B.sc > 0) s0 = Math.max(mMin, Math.min(mMax, (A.sc * fa.r.h) / (B.sc * fb.r.h)))
    else if (!(B.sc > 0)) s0 = dissolve ? PANO_IN_SOFT : PANO_IN
    const chapter = A.s !== B.s
    const pd = { A, B, fa, fb, dx: fa.x - fb.x, dy: fa.y - fb.y, s0, chapter, dissolve, fadeIn: dissolve ? (chapter ? FADE_IN_MS : DISSOLVE_MS) : 0 }
    lastT.current = now
    lastCut.current = now
    if (manual) {   // besökarens takt: EMA av intervallen mellan manuella klipp
      const t = tempoRef.current
      if (t.last) { const iv = now - t.last; t.ema = t.n ? t.ema * 0.6 + iv * 0.4 : iv; t.n += 1; if (t.n >= 2) setTempo(Math.max(0.5, Math.min(2, t.ema / dwellMs))) }
      t.last = now
    }
    setProofOpen(false)
    setCloser(0)
    const show = () => {
      pending.current = pd
      setBlank(false)
      clearTimeout(prevTimer.current)
      if (dissolve && !chapter) { setPrev(A); prevTimer.current = setTimeout(() => setPrev(null), DISSOLVE_MS + 80) }
      else setPrev(null)
      setCur(B)
      setTrace({ ...res, glide: Math.hypot(pd.dx, pd.dy), s0, chapter, mode: dissolve ? (chapter ? 'genom svart' : 'dissolve') : (chapter ? 'klipp · kapitel' : 'klipp') })
      setCutNo((n) => n + 1)
    }
    clearTimeout(timer.current)
    if (chapter && dissolve) {   // genom svart: A ut, paus, B in
      const a = nodes.current[A.id]
      if (a && a.el) { a.el.style.transition = `opacity ${FADE_OUT_MS}ms ${DISSOLVE_EASE}`; a.el.style.opacity = '0' }
      setTimeout(show, FADE_OUT_MS + FADE_GAP_MS)
    } else if (chapter && !reduced) { setBlank(true); setTimeout(show, CHAPTER_MS) }   // kapitelandningen (hårt klipp-par)
    else show()
  }
  const cutRef = useRef(cut)
  cutRef.current = cut

  // Klippögonblicket: B har just renderats i vila — flytta och skala den (utan övergång, kring sina ögon) så att
  // ögonen ligger på A:s ögon i A:s storlek, tvinga layout, och låt den sedan glida till vila på nästa bildruta.
  // Andningen startar samtidigt: en långsam rörelse under bildens tid. Ringen (debug) följer ögonen.
  const breathe = (p, ms) => {
    const n = nodes.current[p && p.id]
    const b = n && n.breath
    if (!b || !p) return
    b.style.transition = 'none'
    b.style.transform = 'scale(1)'
    void b.offsetWidth
    if (reduced) return
    const target = p.sc > .3 ? 1 - BREATH : p.sc > 0 ? 1 + BREATH : 1 - BREATH * 0.6
    requestAnimationFrame(() => { b.style.transition = `transform ${Math.max(1500, ms)}ms cubic-bezier(.33,0,.67,1)`; b.style.transform = `scale(${target})` })
  }
  useLayoutEffect(() => {
    const pd = pending.current
    if (!pd) return
    pending.current = null
    const n = nodes.current[pd.B.id], el = n && n.el, rg = ringRef.current
    if (!el) return
    const ms = pd.dissolve ? pd.fadeIn : GLIDE_MS
    const ease = pd.dissolve ? DISSOLVE_EASE : EASE
    el.style.transition = 'none'
    el.style.transform = `translate(${pd.dx}px,${pd.dy}px) scale(${pd.s0})`
    el.style.opacity = pd.dissolve ? '0' : '1'
    if (rg) { rg.style.transition = 'none'; rg.style.left = pd.fa.x + 'px'; rg.style.top = pd.fa.y + 'px' }
    void el.offsetWidth
    if (typeof window.__klippetOnCut === 'function') window.__klippetOnCut({ el, A: pd.A, B: pd.B, fa: pd.fa, fb: pd.fb, dx: pd.dx, dy: pd.dy, s0: pd.s0, chapter: pd.chapter, dissolve: pd.dissolve, ms })
    breathe(pd.B, dwellFor(pd.B, dwellMs, tempoRef2.current, cutter ? cutter.maxP : 0))
    const a = pd.dissolve && !pd.chapter ? nodes.current[pd.A.id] : null
    requestAnimationFrame(() => {
      el.style.transition = reduced ? 'none' : `transform ${ms}ms ${ease}, opacity ${ms}ms ${ease}`
      el.style.transform = 'translate(0,0) scale(1)'
      el.style.opacity = '1'
      if (a && a.el) { a.el.style.transition = `opacity ${ms}ms ${ease}`; a.el.style.opacity = '0' }
      if (rg) {
        rg.style.transition = reduced ? 'none' : `left ${ms}ms ${ease}, top ${ms}ms ${ease}`
        rg.style.left = pd.fb.x + 'px'
        rg.style.top = pd.fb.y + 'px'
      }
    })
  }, [cutNo])   // eslint-disable-line react-hooks/exhaustive-deps
  // Öppningsbilden: tonas in om den har bakgrund, tänds direkt på svart; andas.
  useLayoutEffect(() => {
    if (!cur || cutNo !== 0) return
    const n = nodes.current[cur.id]
    if (n && n.el && !reduced && !isDark(cur)) {
      n.el.style.transition = 'none'; n.el.style.opacity = '0'; void n.el.offsetWidth
      requestAnimationFrame(() => { n.el.style.transition = `opacity ${OPEN_FADE_MS}ms ${DISSOLVE_EASE}`; n.el.style.opacity = '1' })
    }
    breathe(cur, dwellFor(cur, dwellMs, 1, cutter ? cutter.maxP : 0))
  }, [cur, cutNo])   // eslint-disable-line react-hooks/exhaustive-deps

  // Filmen — dwell-styrd, med klipparens tempo. Rörelse över bilden håller; närmare håller; en besökare som
  // tittar (kamera) håller; en flik i bakgrunden pausar.
  const curRef = useRef(null); curRef.current = cur
  const tempoRef2 = useRef(1); tempoRef2.current = tempo
  const holdRef = useRef(false)   // sant medan närmare är aktivt
  const schedule = () => {
    clearTimeout(timer.current)
    if (holdRef.current) return
    const p = curRef.current
    timer.current = setTimeout(() => cutRef.current(false), p ? dwellFor(p, dwellMs, tempoRef2.current, cutter ? cutter.maxP : 0) : dwellMs)
  }
  useEffect(() => { if (!cur) return; schedule(); return () => clearTimeout(timer.current) }, [cur, tempo])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const v = () => { if (document.hidden) clearTimeout(timer.current); else { lastT.current = performance.now(); schedule() } }
    document.addEventListener('visibilitychange', v)
    return () => document.removeEventListener('visibilitychange', v)
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const k = (e) => {
      if (e.key === 'Escape') { setProofOpen(false); return }
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cutRef.current(true) }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  const onWheel = (e) => {
    if (e.deltaY <= 12) return
    const now = performance.now()
    if (now - lastWheel.current < 700) return
    lastWheel.current = now
    cutRef.current(true)
  }
  // Pekare: tapp = klipp, svep uppåt = klipp, håll = närmare (kring ögonen), släpp = tillbaka.
  const setHold = (on) => { holdRef.current = on; if (on) clearTimeout(timer.current); else schedule() }
  const onPointerDown = (e) => {
    if (e.button && e.button !== 0) return
    const p = pointer.current
    p.down = true; p.t = performance.now(); p.x = e.clientX; p.y = e.clientY; p.moved = false; p.held = false
    clearTimeout(p.timer)
    p.timer = setTimeout(() => { if (p.down && !p.moved) { p.held = true; setCloser(CLOSER_HOLD); setHold(true) } }, HOLD_MS)
  }
  const onPointerMove = (e) => {
    schedule()
    const p = pointer.current
    if (p.down && !p.held && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 12) p.moved = true
  }
  const onPointerUp = (e) => {
    const p = pointer.current
    if (!p.down) return
    p.down = false
    clearTimeout(p.timer)
    if (p.held) { p.held = false; setCloser(0); setHold(false); return }
    const dy = p.y - e.clientY
    if (dy > 40) { cutRef.current(true); return }
    if (!p.moved && performance.now() - p.t < HOLD_MS + 200) cutRef.current(true)
  }
  const onPointerCancel = () => { const p = pointer.current; p.down = false; clearTimeout(p.timer); if (p.held) { p.held = false; setCloser(0); setHold(false) } }

  // Beviset på begäran — etiketten öppnar Content Credentials för aktuell bild.
  const toggleProof = (e) => {
    e.stopPropagation()
    if (!cur || !cur.url) return
    if (proofOpen) { setProofOpen(false); return }
    setProofOpen(true)
    const cached = proofCache.current[cur.uid]
    if (cached) { setProof(cached); return }
    setProof({ state: 'loading' })
    const uid = cur.uid
    loadCredentials(cur.url, (m) => { proofCache.current[uid] = m; if (curRef.current && curRef.current.uid === uid) setProof(m) })
      .catch((err) => { const m = { state: 'error', reason: String(err && err.message || err) }; proofCache.current[uid] = m; if (curRef.current && curRef.current.uid === uid) setProof(m) })
  }
  useEffect(() => { if (cur && proofOpen) setProof(proofCache.current[cur.uid] || null) }, [cur])   // eslint-disable-line react-hooks/exhaustive-deps

  const { W, H } = size
  const r = cur && W ? layout(cur, W, H) : null
  const f = cur && W ? focusAt(cur, W, H) : null
  const mono = { fontFamily: 'Menlo, monospace', fontSize: 11, lineHeight: 1.6, color: '#9a9a9a' }
  // Etiketten på skuggsidan: kommer ljuset från vänster (90°–270°) är skuggan till höger.
  const labelSide = cur && cur.l > 90 && cur.l < 270 ? 'right' : 'left'
  // Andningens origo: ögonen, förskjutna mot ljuset (en tiondel av ansiktshöjden).
  const breathOriginOf = (p) => {
    const k = 0.1 * (p.sc > 0 ? p.sc : 0.3), a = ((Number.isFinite(p.l) ? p.l : 90) * Math.PI) / 180
    const ox = p.f[0] + (k / (p.r || 1)) * Math.cos(a), oy = p.f[1] - k * Math.sin(a)
    return `${(Math.max(0, Math.min(1, ox)) * 100).toFixed(2)}% ${(Math.max(0, Math.min(1, oy)) * 100).toFixed(2)}%`
  }

  return (
    <div
      ref={stageRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onWheel={onWheel}
      onContextMenu={(e) => e.preventDefault()}
      style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden', touchAction: 'none', overscrollBehavior: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', WebkitTapHighlightColor: 'transparent', cursor: 'default' }}
    >
      {W > 0 && [prev, cur].filter((p, i, arr) => p && arr.indexOf(p) === i).map((p) => {
        const pr = layout(p, W, H)
        const isCur = cur && p.id === cur.id
        return (
          <div key={p.id} ref={(el) => { if (el) nodes.current[p.id] = { el, breath: el.firstElementChild }; else delete nodes.current[p.id] }}
            style={{ position: 'absolute', left: pr.x, top: pr.y, width: pr.w, height: pr.h, willChange: 'transform, opacity', transformOrigin: `${p.f[0] * 100}% ${p.f[1] * 100}%` }}>
            <div style={{ width: '100%', height: '100%', transformOrigin: breathOriginOf(p), willChange: 'transform' }}>
              <div style={{ width: '100%', height: '100%', transformOrigin: `${p.f[0] * 100}% ${p.f[1] * 100}%`, transform: isCur && closer ? `scale(${closer})` : 'scale(1)', transition: reduced ? 'none' : `transform ${CLOSER_MS}ms ${EASE}` }}>
                {p.url
                  ? <img src={p.url} alt={p.alt || ''} crossOrigin="anonymous" draggable={false} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'fill' }} />
                  : <Print p={p} />}
              </div>
            </div>
          </div>
        )
      })}
      {blank && <div style={{ position: 'absolute', inset: 0, background: '#000' }} />}
      <a href="/" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} style={{ position: 'absolute', left: 18, top: 14, fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 19, letterSpacing: '.02em', color: '#8a8a8a', textDecoration: 'none' }}>Gaahlin</a>
      {cur && (
        <button type="button" onClick={toggleProof} onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} aria-expanded={proofOpen}
          style={{ position: 'absolute', bottom: 16, [labelSide]: 18, background: 'none', border: 0, padding: 0, font: 'inherit', fontSize: 12, letterSpacing: '.1em', color: proofOpen ? '#cfcfcf' : '#7a7a7a', cursor: cur.url ? 'pointer' : 'default', textAlign: labelSide === 'right' ? 'right' : 'left' }}>
          {cur.title || `Serie ${cur.s}`}{debug ? ` · ${cur.uid ? 'bild' : 'print'} ${cur.id}${cur.intel === false ? ' · oanalyserad' : ''}` : ''}
        </button>
      )}
      {proofOpen && cur && cur.url && (() => {
        const d = describeCredentials(proof, cur.pw && cur.ph ? { w: cur.pw, h: cur.ph } : null)
        const dt = { fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: '#6f6f6f', margin: '10px 0 2px' }
        const dd = { margin: 0, color: '#bdbdbd', fontSize: 12, lineHeight: 1.5 }
        return (
          <div onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} style={{ position: 'absolute', bottom: 44, [labelSide]: 18, width: 'min(78vw, 380px)', padding: '12px 14px', background: 'rgba(0,0,0,.72)', border: '1px solid #1e1e1e', borderRadius: 4, fontSize: 12, color: '#bdbdbd' }}>
            <div style={{ color: d.credState === 'verified' ? '#e6c98a' : '#cfcfcf', fontSize: 12, letterSpacing: '.08em' }}>{d.credText}</div>
            {proof && proof.state === 'error' && <div style={{ ...dd, color: '#9a9a9a' }}>{proof.reason}</div>}
            {d.active && (
              <dl style={{ margin: 0 }}>
                <dt style={dt}>Skapare</dt><dd style={dd}>{d.active.creator || 'inte angiven'}</dd>
                <dt style={dt}>Signerat av</dt><dd style={dd}>{d.active.generator || 'okänt verktyg'}{d.active.spec ? ` (C2PA ${d.active.spec})` : ''}{d.active.timestamped ? ', tidsstämplat' : d.active.signed ? ', utan tidsstämpel' : ''}</dd>
                <dt style={dt}>Verifiering</dt><dd style={dd}>{d.verifyText}</dd>
                <dt style={dt}>Åtgärder</dt><dd style={dd}>{d.active.actions && d.active.actions.length ? `${d.active.actions.length}: ${d.summaryText}` : 'inga registrerade'}</dd>
                <dt style={dt}>Generativ AI</dt><dd style={dd}>{d.active.generative ? 'registrerad i kedjan' : 'ingen registrerad'}</dd>
                <dt style={dt}>Kedja</dt><dd style={dd}>{d.chainText}</dd>
              </dl>
            )}
            {d.exifText && <><div style={dt}>Kamera (EXIF, osignerat)</div><div style={dd}>{d.exifText}</div></>}
            {d.imageText && <><div style={dt}>Bild</div><div style={dd}>{d.imageText}</div></>}
          </div>
        )
      })()}

      {debug && f && (
        <div ref={ringRef} style={{ position: 'absolute', left: f.x, top: f.y, width: 26, height: 26, margin: '-13px 0 0 -13px', border: '1.5px solid #fff', borderRadius: '50%', opacity: .85, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', left: 11, top: 11, width: 2, height: 2, background: '#fff', borderRadius: '50%' }} />
        </div>
      )}
      {debug && !cur && (
        <div style={{ position: 'absolute', left: 14, top: 40, ...mono }}>{pool ? `väntar på öppningsbilden · pool ${source} · ${loadedCount}/${pool.length} laddade` : 'hämtar poolen …'}{caught.length ? '\n' + caught.join('\n') : ''}</div>
      )}
      {debug && cur && (
        <div style={{ position: 'absolute', left: 14, top: 40, maxWidth: 'min(92vw, 680px)', pointerEvents: 'none', whiteSpace: 'pre-wrap', ...mono }}>
          <div>
            {`klipp ${cutNo} · ${cur.uid ? 'bild' : 'print'} ${cur.id} · ${cur.s}` +
              (trace ? ` · ${trace.mode} · glid ${Math.round(trace.glide)} px · skala ${trace.s0.toFixed(2)} · ${reduced ? 0 : trace.mode.startsWith('klipp') ? GLIDE_MS : trace.mode === 'genom svart' ? FADE_IN_MS : DISSOLVE_MS} ms` : ' · öppning') +
              ` · dwell ${dwellMs} ms · seed ${seed} · ${Math.round(W)}×${Math.round(H)}`}
          </div>
          <div>{`pool ${source} · ${pool ? pool.length : 0} bilder · ${loadedCount} laddade · ${pool ? pool.filter((p) => p.intel).length : 0} analyserade`}</div>
          <div>{`tempo ×${tempo.toFixed(2)} · dwell för bilden ${dwellFor(cur, dwellMs, tempo, cutter ? cutter.maxP : 0)} ms · hänglinje ${Math.round(HANG * 100)} % (ögon på ${r ? Math.round(((r.y + cur.f[1] * r.h) / H) * 100) : '–'} %) · kant ${Number.isFinite(cur.edge) ? (cur.edge * 100).toFixed(0) + ' %' : '–'} ${isDark(cur) ? 'svart' : 'bakgrund'} · andning ±${Math.round(BREATH * 100)} % mot ${cur.l}° · närvaro ${presence(cur).toFixed(2)} · närmare ${closer || '–'}${proofOpen ? ' · bevis öppet' : ''}`}</div>
          <div>{cutter ? cutter.seq().map((p) => p.id).join(' → ') : ''}</div>
          {trace && <div>{`${trace.score.toFixed(1)} p: ` + trace.parts.map(([n, v]) => `${n} ${v >= 0 ? '+' : ''}${v.toFixed(1)}`).join(' · ')}</div>}
          {trace && <div>{'förkastade: ' + trace.rejected.map((x) => `print ${x.B.id} (${x.s < -50 ? x.why : x.s.toFixed(1) + (x.why ? ': ' + x.why : '')})`).join(', ')}</div>}
          {caught.length > 0 && <div style={{ color: '#f66' }}>{caught.join('\n')}</div>}
        </div>
      )}
      {debug && (
        <div style={{ position: 'absolute', right: 14, bottom: 40, ...mono }}>
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
