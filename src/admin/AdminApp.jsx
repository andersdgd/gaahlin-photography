// Gaahlin Photography — admin/AdminApp.jsx
// v0.16.1 — ADRESSEN FÖLJER NAMNET (Anders 2026-09-12: "när jag skapar ett galleri med ett namn så går det inte att ändra
//   senare. Döpte om 'Portraits' till 'Intro' men det ändras inte."). Databasen visade title = 'Intro', slug = 'portraits':
//   omdöpningen sparade titeln men adressen skapades bara vid nyskapande och följde aldrig med — och adminet visar den
//   under namnet, så det såg ut som att inget hänt. Sajten använder aldrig adressen (bara id och titel), så den kan följa
//   namnet fritt; den är unik i databasen, därför löpnummer vid krock (intro, intro-2 …) och ett andra försök vid 23505.
// v0.16.0 — INTRO-BILDSPELET (Arc 8, pass 8.2 Introt; Anders 2026-09-10: "då måste du även göra om i admin så att
//   jag kan byta eller lägga till bilder i bildspelet"). Innehåll → Hero → Intro-bildspel: en väljare (HeroPoolPicker)
//   som visar biblioteket — publika bilder i publika gallerier, sajtens egna regler — som miniatyrer; klick lägger
//   till/tar bort, ‹ › flyttar, × tar bort. Värdet är site_content.hero_pool: en JSON-ögonblicksbild av det Rummet
//   behöver per bild (bildrad, galleri, intelligensens siffror ur Analys), i ordning. Byggs om ur biblioteket vid
//   varje ändring; bilder som saknas i biblioteket markeras och faller bort. "ej analyserad" visas där ögonen inte
//   är kända — övertoningen kan då inte matcha dem (kör Analys). Sparas med Innehålls Spara-knapp som förut.
//   Fältet 'hero_image' heter nu "Stillbild" (visas när bildspelet är tomt). Schema i lib/siteContent.js v0.2.0.
// v0.15.0 — Seendet utbrutet till src/lib/seeing.js (MediaPipe-konstanter, loadLandmarker, parseFaces/headPose,
//   blickregeln) så att rummets kamera (Klippet v0.3.0) och Analys delar samma definition av "blick". Ingen
//   ändring i Analys logik; app-versionen i models blir v0.15.0.
// v0.14.1 — Analys, två rotfel ur första körningen på riktiga bilder (2026-09-06): (1) blick = huvudets vridning
//   (ur meshens z) + ögonens vridning mot objektivet — iris centrerad i ett vridet huvud är inte direkt blick;
//   (2) ansikten söks i tre steg (1280 px → nivålyft kopia → 2048 px) med lägre detektionströskel, och ljus/hårdhet
//   utan ansikte mäts i ett fönster kring fokus i stället för på hela (svarta) ramen. INTEL_VERSION 2.
// v0.14.0 — Arc 8 pass 8.1: ny sektion "Analys" — bildintelligens räknad i adminens webbläsare
//   (CORS-sond → MediaPipe FaceLandmarker från CDN → ögon/blick/pose, tonalitet, ljusriktning, fokus,
//   lum8-embedding) och sparad som siffror i gaahlin.image_intelligence (migration 0007). Utläsning per
//   bild: miniatyr med ögonpunkter, fokus, ansiktsbox och ljusriktning. Rummet på /obscura läser siffrorna.
// v0.13.0 — Ny sektion "Innehåll": redigera sajtens redaktionella text per språk (SV/NO/DK/FI/EN)
//   + hero-/om-mig-bild + Instagram-länk. Schema/defaults i lib/siteContent.js, lagring i
//   gaahlin.site_content (migration 0006). Tomt fält = sajtens standardtext används.
// v0.12.0 — Kontakter: ta bort meddelanden (enskilt + flera via kryssrutor), ConfirmModal,
//   RLS contacts_admin_delete (fanns redan). Bakgrund: kontaktformuläret spammas av bottar.
// v0.11.1 — admin-nav ommöblerad: Bilder & gallerier överst, sedan Kontakter, Bokningar, Kunder.
// v0.11.0 — Arc 5: Bokningar-sektion (gaahlin.bookings) — inkomna förfrågningar
//   från sidan /boka, med statushantering (ny/bekräftad/genomförd/avböjd) + radera.
// v0.10.0 — Arc 3 / B08 skiva 3b: Kunder + privata leveranser i adminet.
//   • "Kunder"-sektionen: lista + bjud in kund (e-post + namn → edge function
//     'invite-client'; service_role skapar auth-användare + clients-rad + mejl).
//   • Klicka en kund → hantera DERAS leveransbilder: ladda upp till privata
//     bucketen gaahlin-deliveries (nyckel <kund-uid>/<uuid>), ordna, döp om, radera.
//     Miniatyrer via signed URLs (privat bucket). "Leveranser"-fliken borttagen —
//     leveranser bor under respektive kund.
//   v0.9.0: window.prompt/confirm → inline-redigering + ConfirmModal; bildtitel redigerbar.
//   v0.8.0: galleri-CMS. v0.6.1: auth-lås-fix. v0.6.2: Safari-autofyll-fix.
//
// Bilder lever i Storage, inte i repot — adminet är källan, sajten läser i runtime.

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { FIELDS, GROUPS, LOCALES, NEUTRAL, DEFAULTS, fetchSiteContent, publicImageUrl, parseHeroPool, serializeHeroPool } from '../lib/siteContent'
import { MP_VERSION, loadLandmarker, parseFaces, r3, EYE_DEG } from '../lib/seeing'

const BUCKET = 'gaahlin-public'
const DELIVERIES = 'gaahlin-deliveries'
const publicUrl = (key) => supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl

function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // å/ä/ö → a/a/o
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function readDims(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url) }
    img.onerror = () => { resolve({ w: null, h: null }); URL.revokeObjectURL(url) }
    img.src = url
  })
}

const ui = {
  page: { minHeight: '100vh', background: '#0a0a0a', color: '#e8e8e8', fontFamily: 'system-ui, sans-serif' },
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' },
  card: { width: '100%', maxWidth: '360px', textAlign: 'center' },
  serif: { fontFamily: 'Georgia, "Times New Roman", serif' },
  input: { width: '100%', padding: '12px 14px', background: '#141414', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', fontSize: '15px', marginBottom: '12px', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '12px 14px', background: '#fff', color: '#000', border: 'none', borderRadius: '6px', fontSize: '15px', cursor: 'pointer' },
  ghost: { background: 'none', border: '1px solid #2a2a2a', color: '#aaa', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' },
  muted: { color: '#888' },
  err: { color: '#e0a0a0', fontSize: '13px' },
  editBox: { padding: '15px', background: '#0f0f0f', border: '1px solid #242424', borderRadius: '8px', marginBottom: '8px' },
  label: { fontSize: '11px', letterSpacing: '0.08em', color: '#777', textTransform: 'uppercase', display: 'block', margin: '0 0 6px' },
}

const SECTIONS = [
  { id: 'bilder', label: 'Bilder & gallerier' },
  { id: 'analys', label: 'Analys' },
  { id: 'innehall', label: 'Innehåll' },
  { id: 'kontakter', label: 'Kontakter' },
  { id: 'bokningar', label: 'Bokningar' },
  { id: 'kunder', label: 'Kunder' },
]

function arrowBtn(disabled) {
  return {
    background: 'none', border: '1px solid #2a2a2a', borderRadius: '4px',
    color: disabled ? '#444' : '#aaa', cursor: disabled ? 'default' : 'pointer',
    width: '30px', height: '24px', fontSize: '11px', lineHeight: 1, padding: 0,
  }
}

/* ---------------- Delad bekräftelse-modal ---------------- */
// Ersätter window.confirm. Centrerad mörk ruta, dämpad bakgrund, röd destruktiv knapp.
// Esc eller klick utanför rutan avbryter (om inte upptaget).

function ConfirmModal({ title, body, confirmLabel = 'Ta bort', onConfirm, onCancel, busy }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, busy])

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onCancel() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.62)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '380px', background: '#141414', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '22px' }}>
        <div style={{ ...ui.serif, fontSize: '19px', color: '#fff', margin: '0 0 10px' }}>{title}</div>
        <p style={{ color: '#bbb', fontSize: '14px', lineHeight: 1.6, margin: '0 0 22px' }}>{body}</p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button style={ui.ghost} onClick={onCancel} disabled={busy}>Avbryt</button>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{ background: '#a13535', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 16px', fontSize: '14px', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
          >
            {busy ? 'Tar bort…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Inline titel-redigering ---------------- */
// Raden fälls ut till ett titelfält + Spara/Avbryt. Samma mönster överallt.

function EditRow({ value, onChange, onSave, onCancel, busy, label = 'Titel' }) {
  return (
    <div style={ui.editBox}>
      <label style={ui.label}>{label}</label>
      <input
        autoFocus
        style={ui.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel() }}
      />
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button style={ui.ghost} onClick={onCancel} disabled={busy}>Avbryt</button>
        <button
          style={{ ...ui.btn, width: 'auto', padding: '10px 16px', opacity: busy ? 0.6 : 1 }}
          onClick={onSave}
          disabled={busy}
        >
          Spara
        </button>
      </div>
    </div>
  )
}

export default function AdminApp() {
  const [status, setStatus] = useState('loading') // loading | noconfig | anon | notadmin | admin
  const [session, setSession] = useState(undefined) // undefined = ej avgjort, null = utloggad, objekt = inloggad
  const [sentTo, setSentTo] = useState('')
  const [sending, setSending] = useState(false)
  const [authErr, setAuthErr] = useState('')
  const [section, setSection] = useState('bilder')
  const emailRef = useRef(null)

  // 1) Etablera sessionen. I onAuthStateChange-callbacken gör vi BARA setState —
  //    aldrig andra supabase-anrop (callbacken körs i ett auth-lås).
  useEffect(() => {
    if (!supabase) { setStatus('noconfig'); return }
    let active = true
    supabase.auth.getSession().then(({ data }) => { if (active) setSession(data.session) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => { if (active) setSession(sess) })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  // 2) Admin-koll UTANFÖR auth-låset, när sessionen ändras.
  useEffect(() => {
    if (!supabase) return
    if (session === undefined) return
    if (session === null) { setStatus('anon'); return }
    let active = true
    supabase.from('roles').select('role').eq('user_id', session.user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) { console.error('[admin] roles-koll:', error); setStatus('notadmin'); return }
        setStatus(data && data.role === 'admin' ? 'admin' : 'notadmin')
      })
    return () => { active = false }
  }, [session])

  const sendLink = async () => {
    if (sending) return
    const value = (emailRef.current?.value || '').trim()
    if (!value) { setAuthErr('Fyll i din e-post.'); emailRef.current?.focus(); return }
    setSending(true); setAuthErr('')
    const { error } = await supabase.auth.signInWithOtp({
      email: value,
      options: { emailRedirectTo: window.location.origin + '/admin' },
    })
    setSending(false)
    if (error) { setAuthErr(error.message); return }
    setSentTo(value)
  }

  const logout = () => supabase.auth.signOut()

  if (status === 'loading') {
    return <div style={ui.page}><div style={ui.center}><p style={ui.muted}>Laddar…</p></div></div>
  }

  if (status === 'noconfig') {
    return <div style={ui.page}><div style={ui.center}><div style={ui.card}>
      <p style={ui.muted}>Supabase är inte konfigurerad (saknade miljövariabler).</p>
    </div></div></div>
  }

  if (status === 'anon') {
    return <div style={ui.page}><div style={ui.center}><div style={ui.card}>
      <h1 style={{ ...ui.serif, fontSize: '28px', margin: '0 0 6px' }}>Gaahlin</h1>
      <p style={{ ...ui.muted, margin: '0 0 24px', letterSpacing: '0.1em', fontSize: '12px' }}>ADMIN</p>
      {sentTo ? (
        <p style={ui.muted}>Kolla din mejl — en inloggningslänk är skickad till {sentTo}.</p>
      ) : (
        <>
          <input
            ref={emailRef}
            style={ui.input}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="din e-post"
            defaultValue=""
            onKeyDown={(e) => e.key === 'Enter' && sendLink()}
          />
          <button
            style={{ ...ui.btn, opacity: sending ? 0.6 : 1, cursor: sending ? 'default' : 'pointer' }}
            onClick={sendLink}
            disabled={sending}
          >
            {sending ? 'Skickar…' : 'Skicka inloggningslänk'}
          </button>
          {authErr && <p style={{ ...ui.err, margin: '12px 0 0' }}>{authErr}</p>}
        </>
      )}
    </div></div></div>
  }

  if (status === 'notadmin') {
    return <div style={ui.page}><div style={ui.center}><div style={ui.card}>
      <p style={{ margin: '0 0 16px' }}>Du är inloggad som {session?.user?.email}, men saknar admin-behörighet.</p>
      <button style={ui.ghost} onClick={logout}>Logga ut</button>
    </div></div></div>
  }

  // status === 'admin'
  return (
    <div style={{ ...ui.page, display: 'flex' }}>
      <aside style={{ width: '210px', borderRight: '1px solid #1c1c1c', padding: '20px 12px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ padding: '0 10px 20px' }}>
          <span style={{ ...ui.serif, fontSize: '20px' }}>Gaahlin</span>
          <span style={{ ...ui.muted, fontSize: '11px', letterSpacing: '0.1em', marginLeft: '8px' }}>ADMIN</span>
        </div>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            style={{
              textAlign: 'left', padding: '10px 12px', marginBottom: '2px', borderRadius: '6px',
              border: 'none', cursor: 'pointer', fontSize: '14px',
              background: section === s.id ? '#1c1c1c' : 'transparent',
              color: section === s.id ? '#fff' : '#999',
            }}
          >
            {s.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: '0 12px' }}>
          <p style={{ ...ui.muted, fontSize: '12px', margin: '0 0 8px', wordBreak: 'break-all' }}>{session?.user?.email}</p>
          <button style={ui.ghost} onClick={logout}>Logga ut</button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '28px 32px', minWidth: 0 }}>
        {section === 'kontakter' && <Kontakter />}
        {section === 'bokningar' && <Bookings />}
        {section === 'bilder' && <GalleryManager />}
        {section === 'analys' && <Analys />}
        {section === 'innehall' && <SiteContentEditor />}
        {section === 'kunder' && <ClientManager />}
      </main>
    </div>
  )
}

/* ---------------- Analys (Arc 8, pass 8.1 — "Rummet ser bilderna") ---------------- */
// Bildintelligens räknad HÄR, i adminens webbläsare, aldrig i besökarens: MediaPipe FaceLandmarker
// (478 punkter, iris 468/473) ger ögon, blick och pose; luminansmått ger tonalitet, ljusriktning,
// fokus-fallback och en liten strukturell embedding ('lum8'). Resultatet är siffror i
// gaahlin.image_intelligence (migration 0007); rummet på /obscura läser bara siffror. Pixlarna rörs aldrig.
// Konstanterna bär datum (Lag 7) — CDN-sökvägar och modellversioner rör sig.
const INTEL_VERSION = 2   // v2: blick = huvudets vridning + ögonens vridning mot objektivet; ansikten söks i tre steg
const ANALYSIS_MAX = 1280   // långsida (px) som modellen får se; landmarks är normaliserade så originalet är referensen
const r4 = (v) => Math.round(v * 10000) / 10000

function loadImageCors(url) {
  return new Promise((resolve, reject) => {
    const im = new Image()
    im.crossOrigin = 'anonymous'
    im.onload = () => resolve(im)
    im.onerror = () => reject(new Error('Bilden kunde inte laddas med crossOrigin (CORS-huvud saknas eller 404): ' + url))
    im.src = url
  })
}
function toCanvas(img, max) {
  const s = Math.min(1, max / Math.max(img.naturalWidth || 1, img.naturalHeight || 1))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round((img.naturalWidth || 1) * s))
  c.height = Math.max(1, Math.round((img.naturalHeight || 1) * s))
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
  return c
}
// 48×48 luminans (Rec. 709) + medelkroma. Rutnätet ignorerar bildens proportion — allt nedan räknar i
// normaliserade koordinater (0..1), så ansiktsboxen från modellen mappar rakt in.
function luminanceGrid(src, n = 48) {
  const c = document.createElement('canvas')
  c.width = n; c.height = n
  const ctx = c.getContext('2d')
  ctx.drawImage(src, 0, 0, n, n)
  const d = ctx.getImageData(0, 0, n, n).data
  const L = new Float32Array(n * n)
  let chroma = 0
  for (let i = 0; i < n * n; i++) {
    const r = d[i * 4] / 255, g = d[i * 4 + 1] / 255, b = d[i * 4 + 2] / 255
    L[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b
    chroma += Math.max(r, g, b) - Math.min(r, g, b)
  }
  return { L, n, chroma: chroma / (n * n) }
}
function tonalityOf(grid) {
  const { L, chroma } = grid
  const n = L.length
  let s = 0
  for (let i = 0; i < n; i++) s += L[i]
  const mean = s / n
  let v2 = 0
  for (let i = 0; i < n; i++) v2 += (L[i] - mean) ** 2
  const sd = Math.sqrt(v2 / n)
  const sorted = Array.from(L).sort((a, b) => a - b)
  const p = (q) => sorted[Math.min(n - 1, Math.floor(q * n))]
  return { mean: r3(mean), sd: r3(sd), contrast: r3(p(.95) - p(.05)), key: mean < .25 ? 'low' : mean > .6 ? 'high' : 'mid', bw: chroma < .03 }
}
// Ljusriktning ur luminansgradienten i ansiktsboxen (utan ansikte: hela bilden).
// angle: 0 = från höger, 90 = uppifrån, 180 = från vänster, 270 = underifrån. dir = [x, y (upp = +), z (frontalt)].
function lightOf(grid, box) {
  const { L, n } = grid
  const [bx, by, bw, bh] = box || [0, 0, 1, 1]
  const x0 = Math.max(0, Math.floor(bx * n)), y0 = Math.max(0, Math.floor(by * n))
  const x1 = Math.min(n, Math.max(x0 + 1, Math.ceil((bx + bw) * n))), y1 = Math.min(n, Math.max(y0 + 1, Math.ceil((by + bh) * n)))
  let l = 0, r = 0, t = 0, b = 0, nl = 0, nr = 0, nt = 0, nb = 0
  const vals = []
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const v = L[y * n + x]
    vals.push(v)
    if (x < (x0 + x1) / 2) { l += v; nl++ } else { r += v; nr++ }
    if (y < (y0 + y1) / 2) { t += v; nt++ } else { b += v; nb++ }
  }
  l /= nl || 1; r /= nr || 1; t /= nt || 1; b /= nb || 1
  const dx = (r - l) / ((r + l) || 1), dy = (t - b) / ((t + b) || 1)
  const angle = Math.round(((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360)
  vals.sort((p, q) => p - q)
  const p = (q) => vals[Math.min(vals.length - 1, Math.floor(q * vals.length))]
  const hardness = r3(Math.max(0, Math.min(1, (p(.9) - p(.1)) / 0.6)))
  const dz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy))
  return { dir: [r3(dx), r3(dy), r3(dz)], angle, hardness }
}
// Utan ansikte: ljusriktning = vektorn från de mellanljusa partierna (skuggsidan) till de ljusaste (ljussidan) —
// den pekar mot ljuset. Ett fönster kring kontrast-tyngdpunkten duger inte: tyngdpunkten ligger på den belysta
// sidan, så fönstret delar mitt i ljuset (prövat 2026-09-06). Hårdhet = spridningen inom det som inte är bakgrund.
function lightFromTones(grid) {
  const { L, n } = grid
  let max = 0
  for (let i = 0; i < L.length; i++) if (L[i] > max) max = L[i]
  const hiT = Math.max(0.05, 0.6 * max), midT = Math.max(0.02, 0.15 * max)
  let hx = 0, hy = 0, hw = 0, mx = 0, my = 0, mw = 0
  const vals = []
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const v = L[y * n + x]
    if (v >= hiT) { hx += x * v; hy += y * v; hw += v; vals.push(v) }
    else if (v >= midT) { mx += x * v; my += y * v; mw += v; vals.push(v) }
  }
  if (!hw || !mw) return lightOf(grid, null)
  const dx = hx / hw - mx / mw, dyDown = hy / hw - my / mw
  const len = Math.hypot(dx, dyDown) || 1e-6
  const ux = dx / len, uy = -dyDown / len   // uy > 0 = ljus uppifrån
  const angle = Math.round(((Math.atan2(uy, ux) * 180) / Math.PI + 360) % 360)
  vals.sort((a, b) => a - b)
  const p = (q) => vals[Math.min(vals.length - 1, Math.floor(q * vals.length))]
  const hardness = r3(Math.max(0, Math.min(1, (p(.9) - p(.1)) / 0.6)))
  const strength = Math.min(1, len / (n * 0.25))   // hur tydlig riktningen är (0 = ingen), lagras i dir.z-komplementet
  return { dir: [r3(ux * strength), r3(uy * strength), r3(Math.sqrt(Math.max(0, 1 - strength * strength)))], angle, hardness }
}
function contrastCentroid(grid) {
  const { L, n } = grid
  let sx = 0, sy = 0, sw = 0
  for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) {
    const g = Math.abs(L[y * n + x + 1] - L[y * n + x - 1]) + Math.abs(L[(y + 1) * n + x] - L[(y - 1) * n + x])
    sx += x * g; sy += y * g; sw += g
  }
  return sw ? [r3(sx / sw / n), r3(sy / sw / n)] : [0.5, 0.5]
}
// 'lum8': 8×8 blockmedel av luminansen, centrerat och L2-normaliserat → cosinuslikhet i klienten.
function lum8(grid) {
  const { L, n } = grid
  const k = n / 8
  const out = []
  for (let by = 0; by < 8; by++) for (let bx = 0; bx < 8; bx++) {
    let s = 0, c = 0
    for (let y = by * k; y < (by + 1) * k; y++) for (let x = bx * k; x < (bx + 1) * k; x++) { s += L[y * n + x]; c++ }
    out.push(s / c)
  }
  const mean = out.reduce((a, b) => a + b, 0) / out.length
  let norm = 0
  const v = out.map((x) => { const d = x - mean; norm += d * d; return d })
  norm = Math.sqrt(norm) || 1
  return v.map((d) => r4(d / norm))
}
// Nivålyft för mörka ramar (analysens kopia, aldrig fotografiet): förstärkning så att 99,5-percentilen når ~0,85.
function normalizedCopy(c) {
  const w = c.width, h = c.height
  const d = c.getContext('2d').getImageData(0, 0, w, h)
  const px = d.data, hist = new Uint32Array(256), total = w * h
  for (let i = 0; i < px.length; i += 4) hist[(px[i] * 54 + px[i + 1] * 183 + px[i + 2] * 19) >> 8]++
  let acc = 0, p = 255
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= total * 0.995) { p = v; break } }
  const gain = Math.min(8, Math.max(1.2, 217 / Math.max(1, p)))
  for (let i = 0; i < px.length; i += 4) { px[i] = Math.min(255, px[i] * gain); px[i + 1] = Math.min(255, px[i + 1] * gain); px[i + 2] = Math.min(255, px[i + 2] * gain) }
  const out = document.createElement('canvas'); out.width = w; out.height = h
  out.getContext('2d').putImageData(d, 0, 0)
  return { canvas: out, gain: Math.round(gain * 10) / 10 }
}
// Ansikten söks i tre steg: 1) 1280 px, 2) nivålyft kopia, 3) 2048 px. Landmarks är normaliserade 0..1 i alla
// steg, så resultatet refererar originalet oavsett i vilket steg det hittades.
function detectFaces(img, landmarker, c1) {
  if (!landmarker) return { faces: [], tier: 'ingen modell' }
  let faces = parseFaces(landmarker.detect(c1))
  if (faces.length) return { faces, tier: '1280' }
  const n = normalizedCopy(c1)
  faces = parseFaces(landmarker.detect(n.canvas))
  if (faces.length) return { faces, tier: 'nivålyft ×' + n.gain }
  if (Math.max(img.naturalWidth, img.naturalHeight) > ANALYSIS_MAX) {
    const c2 = toCanvas(img, 2048)
    faces = parseFaces(landmarker.detect(c2))
    if (faces.length) return { faces, tier: '2048' }
    const n2 = normalizedCopy(c2)
    faces = parseFaces(landmarker.detect(n2.canvas))
    if (faces.length) return { faces, tier: '2048 nivålyft ×' + n2.gain }
  }
  return { faces: [], tier: 'inget i tre steg' }
}
function analyzeImage(img, landmarker) {
  const c = toCanvas(img, ANALYSIS_MAX)
  const grid = luminanceGrid(c)
  const det = detectFaces(img, landmarker, c)
  const main = det.faces[0]
  const focus = main ? [r3((main.eyes.l[0] + main.eyes.r[0]) / 2), r3((main.eyes.l[1] + main.eyes.r[1]) / 2)] : contrastCentroid(grid)
  return { faces: det.faces, tier: det.tier, focus, tonality: tonalityOf(grid), light: main ? lightOf(grid, main.box) : lightFromTones(grid), embedding: lum8(grid) }
}
function describeIntel(x) {
  if (!x) return ''
  const f = x.faces && x.faces[0]
  const parts = []
  parts.push(x.faces && x.faces.length ? `${x.faces.length} ansikte${x.faces.length > 1 ? 'n' : ''}` : 'inget ansikte — fokus = kontrast-tyngdpunkt')
  if (f) parts.push(`blick ${f.gaze.direct ? 'direkt' : 'avvänd'}` + (f.gaze.head ? ` (huvud ${f.gaze.head[0]}°/${f.gaze.head[1]}°, ögon ${Math.round(EYE_DEG * f.gaze.offset[0])}°/${Math.round(EYE_DEG * f.gaze.offset[1])}° → ${f.gaze.dir[0]}°/${f.gaze.dir[1]}°)` : ` (offset ${f.gaze.offset[0]}, ${f.gaze.offset[1]})`) + ` · ansiktsbox ${Math.round(f.box[3] * 100)} % av höjden` + (x.tier && x.tier !== '1280' ? ` · hittat: ${x.tier}` : ''))
  if (!f && x.tier && x.tier !== 'ingen modell') parts.push(`sökt: ${x.tier}`)
  if (x.light) parts.push(`ljus ${x.light.angle}° hårdhet ${x.light.hardness}`)
  if (x.tonality) parts.push(`ton medel ${x.tonality.mean} sd ${x.tonality.sd} ${x.tonality.key === 'low' ? 'lågkey' : x.tonality.key === 'high' ? 'högkey' : 'mellan'}${x.tonality.bw ? ' svartvitt' : ''}`)
  return parts.join(' · ')
}

// Utläsning: miniatyr med ögonpunkter, fokus, ansiktsbox och ljusriktning ritade ovanpå.
function Readout({ url, intel, width = 260 }) {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv || !intel) return
    let alive = true
    const im = new Image()
    im.crossOrigin = 'anonymous'
    im.onload = () => {
      if (!alive) return
      const w = width, h = Math.max(1, Math.round((im.naturalHeight / im.naturalWidth) * w))
      cv.width = w; cv.height = h
      const ctx = cv.getContext('2d')
      ctx.drawImage(im, 0, 0, w, h)
      ctx.lineWidth = 1.5
      for (const f of intel.faces || []) {
        ctx.strokeStyle = 'rgba(255,255,255,.55)'
        ctx.strokeRect(f.box[0] * w, f.box[1] * h, f.box[2] * w, f.box[3] * h)
        for (const e of [f.eyes.l, f.eyes.r]) {
          ctx.beginPath(); ctx.arc(e[0] * w, e[1] * h, 5, 0, Math.PI * 2)
          ctx.strokeStyle = f.gaze.direct ? '#ffd166' : '#fff'; ctx.stroke()
        }
      }
      if (intel.focus) {
        const [fx, fy] = [intel.focus[0] * w, intel.focus[1] * h]
        ctx.strokeStyle = '#ffd166'
        ctx.beginPath(); ctx.moveTo(fx - 9, fy); ctx.lineTo(fx + 9, fy); ctx.moveTo(fx, fy - 9); ctx.lineTo(fx, fy + 9); ctx.stroke()
      }
      if (intel.light) {
        const a = (intel.light.angle * Math.PI) / 180
        const f = intel.faces && intel.faces[0]
        const cx = f ? (f.box[0] + f.box[2] / 2) * w : w / 2, cy = f ? (f.box[1] + f.box[3] / 2) * h : h / 2
        const len = 34
        ctx.strokeStyle = 'rgba(255,209,102,.9)'
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * len, cy - Math.sin(a) * len); ctx.lineTo(cx, cy); ctx.stroke()
      }
    }
    im.src = url
    return () => { alive = false }
  }, [url, intel, width])
  return <canvas ref={ref} style={{ display: 'block', width, borderRadius: '4px', background: '#000' }} />
}

function Analys() {
  const [rows, setRows] = useState(null)      // [{ image, gallery }] alla bilder, galleriordning
  const [intel, setIntel] = useState({})      // image_id -> rad
  const [probe, setProbe] = useState({ state: 'idle', text: '' })
  const [model, setModel] = useState({ state: 'idle', text: '' })
  const lmRef = useRef(null)
  const [busyId, setBusyId] = useState(null)
  const [busyAll, setBusyAll] = useState(false)
  const [error, setError] = useState('')
  const [log, setLog] = useState({})          // image_id -> text/fel per bild

  const load = async () => {
    const g = await supabase.from('galleries').select('id, slug, title, sort_order, is_public, images(id, storage_path, width, height, sort_order, is_public, title)').order('sort_order')
    if (g.error) { setError(g.error.message); return }
    const list = []
    for (const gal of g.data || []) {
      const ims = (gal.images || []).slice().sort((a, b) => a.sort_order - b.sort_order)
      for (const im of ims) if (im.storage_path) list.push({ image: im, gallery: gal })
    }
    setRows(list)
    const ii = await supabase.from('image_intelligence').select('image_id, version, faces, focus, tonality, light, embedding, models, analyzed_at')
    if (ii.error) { setError(ii.error.message); return }
    const map = {}
    for (const r of ii.data || []) map[r.image_id] = r
    setIntel(map)
  }
  useEffect(() => { load() }, [])

  // CORS-sonden — allt nedan förutsätter att den är grön.
  const runProbe = async (list) => {
    const first = (list || rows || [])[0]
    if (!first) { setProbe({ state: 'red', text: 'Inga bilder att sondera.' }); return false }
    setProbe({ state: 'busy', text: 'Laddar ' + first.image.storage_path + ' med crossOrigin …' })
    try {
      const im = await loadImageCors(publicUrl(first.image.storage_path))
      const c = document.createElement('canvas'); c.width = 2; c.height = 2
      const ctx = c.getContext('2d'); ctx.drawImage(im, 0, 0, 2, 2)
      const px = ctx.getImageData(0, 0, 1, 1).data
      setProbe({ state: 'green', text: `CORS OK — pixel läst ur Storage (rgb ${px[0]},${px[1]},${px[2]}; ${im.naturalWidth}×${im.naturalHeight}).` })
      return true
    } catch (e) {
      setProbe({ state: 'red', text: 'CORS RÖD — ' + (e.message || e) + '. Lös Storage-CORS innan analys.' })
      return false
    }
  }
  useEffect(() => { if (rows && rows.length && probe.state === 'idle') runProbe(rows) }, [rows])   // eslint-disable-line react-hooks/exhaustive-deps

  const ensureModel = async () => {
    if (lmRef.current) return lmRef.current
    setModel({ state: 'busy', text: 'Laddar …' })
    const t0 = performance.now()
    try {
      const r = await loadLandmarker({ mode: 'IMAGE', onStatus: (t) => setModel({ state: 'busy', text: t }) })
      lmRef.current = r.lm
      setModel({ state: 'green', text: `MediaPipe ${MP_VERSION} laddad (${r.delegate}, ${((performance.now() - t0) / 1000).toFixed(1)} s) från ${r.used}` })
      return r.lm
    } catch (e) {
      setModel({ state: 'red', text: 'Modellen kunde inte laddas: ' + (e.message || e) })
      throw e
    }
  }

  const analyzeOne = async (row) => {
    const im = await loadImageCors(publicUrl(row.image.storage_path))
    const lm = await ensureModel()
    const t0 = performance.now()
    const out = analyzeImage(im, lm)
    const ms = Math.round(performance.now() - t0)
    const rec = {
      image_id: row.image.id, version: INTEL_VERSION,
      faces: out.faces, focus: out.focus, tonality: out.tonality, light: out.light, embedding: out.embedding,
      models: { face: `mediapipe tasks-vision ${MP_VERSION} · face_landmarker float16/1`, gaze: 'head(z)+iris v2', tier: out.tier, embedding: 'lum8', app: 'AdminApp v0.15.0', analysis_px: ANALYSIS_MAX },
      analyzed_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('image_intelligence').upsert(rec, { onConflict: 'image_id' })
    if (error) throw new Error('Sparning nekad: ' + error.message)
    setIntel((m) => ({ ...m, [row.image.id]: rec }))
    setLog((l) => ({ ...l, [row.image.id]: `${describeIntel({ ...rec, tier: out.tier })} · ${ms} ms` }))
  }
  const analyze = async (row) => {
    if (busyId || busyAll) return
    setBusyId(row.image.id); setError('')
    try { await analyzeOne(row) }
    catch (e) { setLog((l) => ({ ...l, [row.image.id]: 'Fel: ' + (e.message || e) })) }
    setBusyId(null)
  }
  const analyzeAll = async () => {
    if (busyId || busyAll || !rows) return
    setBusyAll(true); setError('')
    for (const row of rows) {
      setBusyId(row.image.id)
      try { await analyzeOne(row) }
      catch (e) { setLog((l) => ({ ...l, [row.image.id]: 'Fel: ' + (e.message || e) })) }
    }
    setBusyId(null); setBusyAll(false)
  }

  const dot = (state) => ({ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', marginRight: 8, verticalAlign: 'middle', background: state === 'green' ? '#5fbf6f' : state === 'red' ? '#d9534f' : state === 'busy' ? '#e0b34a' : '#444' })
  const analyzedCount = rows ? rows.filter((r) => intel[r.image.id]).length : 0

  return (
    <div>
      <h2 style={{ ...ui.serif, fontWeight: 400, fontSize: '24px', margin: '0 0 6px' }}>Analys</h2>
      <p style={{ ...ui.muted, fontSize: '13px', margin: '0 0 18px', maxWidth: 720 }}>
        Rummet ser bilderna. Analysen körs här i din webbläsare (modeller från CDN, inga nycklar, inget skickas) och sparar
        siffror per bild — ögon, blick, ljusriktning, tonalitet — som <code>/obscura</code> klipper på. Fotografierna rörs aldrig.
      </p>
      {error && <p style={ui.err}>{error}</p>}

      <div style={{ ...ui.editBox, marginBottom: 12 }}>
        <span style={ui.label}>1 · CORS-sond (Storage → canvas)</span>
        <div style={{ fontSize: '13px' }}><span style={dot(probe.state)} />{probe.text || 'Väntar på bildlistan …'}
          <button style={{ ...ui.ghost, marginLeft: 12, padding: '4px 10px' }} onClick={() => runProbe()} disabled={probe.state === 'busy'}>Kör igen</button>
        </div>
      </div>
      <div style={{ ...ui.editBox, marginBottom: 12 }}>
        <span style={ui.label}>2 · Modell</span>
        <div style={{ fontSize: '13px', wordBreak: 'break-all' }}><span style={dot(model.state)} />{model.text || 'Laddas vid första analysen (~3 MB, cachas av webbläsaren).'}
          {model.state !== 'green' && <button style={{ ...ui.ghost, marginLeft: 12, padding: '4px 10px' }} onClick={() => ensureModel().catch(() => {})} disabled={model.state === 'busy'}>Ladda nu</button>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0 10px' }}>
        <span style={{ ...ui.label, margin: 0 }}>3 · Bilder — {rows ? `${analyzedCount} av ${rows.length} analyserade` : 'laddar …'}</span>
        <button style={ui.ghost} onClick={analyzeAll} disabled={!rows || !rows.length || busyAll || !!busyId || probe.state !== 'green'}>
          {busyAll ? 'Analyserar …' : 'Analysera alla'}
        </button>
      </div>
      {rows && rows.length === 0 && <p style={ui.muted}>Inga bilder i gallerierna.</p>}
      {rows && rows.map((row) => {
        const x = intel[row.image.id]
        const busy = busyId === row.image.id
        const url = publicUrl(row.image.storage_path)
        return (
          <div key={row.image.id} style={{ ...ui.editBox, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ width: 260, flex: 'none' }}>
              {x ? <Readout url={url} intel={x} /> : <img src={url} alt="" style={{ display: 'block', width: 260, borderRadius: 4, background: '#000' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0, fontSize: '13px' }}>
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: '#fff' }}>{row.gallery.title}</span>
                <span style={ui.muted}> · {row.image.width}×{row.image.height}{row.image.is_public && row.gallery.is_public ? '' : ' · dold'}</span>
              </div>
              <div style={{ ...ui.muted, marginBottom: 8 }}>
                {x ? `Analyserad ${new Date(x.analyzed_at).toLocaleString('sv-SE')} · v${x.version}` : 'Inte analyserad — rummet klipper på bildcentrum tills dess.'}
              </div>
              {(log[row.image.id] || x) && (
                <div style={{ color: (log[row.image.id] || '').startsWith('Fel') ? '#e0a0a0' : '#ccc', lineHeight: 1.5, marginBottom: 8 }}>
                  {log[row.image.id] || describeIntel(x)}
                </div>
              )}
              <button style={ui.ghost} onClick={() => analyze(row)} disabled={busy || busyAll || probe.state !== 'green'}>
                {busy ? 'Analyserar …' : x ? 'Analysera igen' : 'Analysera'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ---------------- Kontakter ---------------- */

function Kontakter() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [confirmIds, setConfirmIds] = useState(null)   // array av id att ta bort, eller null

  useEffect(() => {
    let active = true
    supabase.from('contacts').select('*').order('created_at', { ascending: false }).then(({ data, error }) => {
      if (!active) return
      if (error) { setError('Kunde inte hämta kontakter.'); return }
      setRows(data || [])
    })
    return () => { active = false }
  }, [])

  const toggle = (id) => setSelected((s) => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  const toggleAll = () => setSelected((s) =>
    rows && s.size === rows.length ? new Set() : new Set((rows || []).map((r) => r.id)))

  const performDelete = async () => {
    if (busy || !confirmIds?.length) return
    setBusy(true); setError('')
    const { error } = await supabase.from('contacts').delete().in('id', confirmIds)
    setBusy(false)
    if (error) { setError(error.message); return }
    const gone = new Set(confirmIds)
    setRows((rs) => rs.filter((r) => !gone.has(r.id)))
    setSelected((s) => { const n = new Set(s); gone.forEach((id) => n.delete(id)); return n })
    setConfirmIds(null)
  }

  const allSelected = rows && rows.length > 0 && selected.size === rows.length

  return (
    <div>
      <h2 style={{ ...ui.serif, fontSize: '22px', margin: '0 0 4px', color: '#fff' }}>Kontakter</h2>
      <p style={{ ...ui.muted, fontSize: '13px', margin: '0 0 20px' }}>Inkomna meddelanden från kontaktformuläret.</p>

      {rows && rows.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', paddingBottom: '10px', borderBottom: '1px solid #1c1c1c' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#aaa', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!allSelected} onChange={toggleAll} disabled={busy} />
            {allSelected ? 'Avmarkera alla' : 'Markera alla'}
          </label>
          <span style={{ flex: 1 }} />
          <button
            style={{ ...ui.ghost, color: selected.size ? '#c98a8a' : '#555', borderColor: selected.size ? '#5a2e2e' : '#2a2a2a' }}
            onClick={() => setConfirmIds([...selected])}
            disabled={busy || selected.size === 0}
          >
            Ta bort valda{selected.size ? ` (${selected.size})` : ''}
          </button>
        </div>
      )}

      {error && <p style={ui.err}>{error}</p>}
      {rows === null && !error && <p style={ui.muted}>Laddar…</p>}
      {rows && rows.length === 0 && <p style={ui.muted}>Inga meddelanden än.</p>}
      {rows && rows.map((r) => (
        <div key={r.id} style={{ display: 'flex', gap: '14px', borderBottom: '1px solid #1c1c1c', padding: '16px 0', background: selected.has(r.id) ? '#111' : 'transparent' }}>
          <input
            type="checkbox"
            checked={selected.has(r.id)}
            onChange={() => toggle(r.id)}
            disabled={busy}
            style={{ marginTop: '4px', flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '6px' }}>
              <span style={{ fontWeight: 500, overflowWrap: 'anywhere' }}>{r.name}</span>
              <span style={{ ...ui.muted, fontSize: '12px', whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleString('sv-SE')}</span>
            </div>
            <a href={`mailto:${r.email}`} style={{ color: '#8ab4f8', fontSize: '13px', textDecoration: 'none', overflowWrap: 'anywhere' }}>{r.email}</a>
            <p style={{ margin: '8px 0 10px', color: '#cfcfcf', fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{r.message}</p>
            <button style={{ ...ui.ghost, color: '#c98a8a', borderColor: '#5a2e2e' }} onClick={() => setConfirmIds([r.id])} disabled={busy}>Ta bort</button>
          </div>
        </div>
      ))}

      {confirmIds && (
        <ConfirmModal
          title={confirmIds.length === 1 ? 'Ta bort meddelandet?' : `Ta bort ${confirmIds.length} meddelanden?`}
          body="Meddelandet raderas permanent. Detta går inte att ångra."
          onConfirm={performDelete}
          onCancel={() => setConfirmIds(null)}
          busy={busy}
        />
      )}
    </div>
  )
}

/* ---------------- Innehåll (redaktionell text + bilder) ---------------- */

const LOCALE_LABEL = { sv: 'Svenska', no: 'Norsk', dk: 'Dansk', fi: 'Suomi', en: 'English' }

/* Intro-bildspelet (Innehåll → Hero → Intro-bildspel). Värdet är site_content.hero_pool: en JSON-ögonblicksbild av
   precis det Rummet behöver per bild (bildrad, galleri, intelligensens siffror), i visningsordning. Biblioteket är
   sajtens egna regler: publika bilder i publika gallerier. Varje ändring bygger om hela ögonblicksbilden ur
   biblioteket, så siffrorna är alltid de senaste ur Analys. Bilder som försvunnit ur biblioteket visas som
   "saknas" och faller bort vid nästa ändring. Sparas med resten av Innehåll (Spara-knappen). */
const compactIntel = (x) => x ? {
  faces: Array.isArray(x.faces) && x.faces[0] && x.faces[0].box ? [{ box: x.faces[0].box }] : [],
  focus: Array.isArray(x.focus) && x.focus.length === 2 ? x.focus : null,
  tonality: x.tonality ? { mean: x.tonality.mean, sd: x.tonality.sd } : null,
  light: x.light ? { angle: x.light.angle, hardness: x.light.hardness } : null,
} : null

function HeroPoolPicker({ value, onChange, disabled }) {
  const [lib, setLib] = useState(null)    // { rows: [{ im, gal, x }], byId }
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    ;(async () => {
      const g = await supabase.from('galleries').select('id, slug, title, sort_order, is_public, images(id, storage_path, width, height, sort_order, is_public, title)').order('sort_order')
      if (g.error) { if (alive) setError(g.error.message); return }
      const ii = await supabase.from('image_intelligence').select('image_id, faces, focus, tonality, light')
      const intel = {}
      if (!ii.error) for (const r of ii.data || []) intel[r.image_id] = r
      const rows = []
      for (const gal of g.data || []) {
        if (!gal.is_public) continue
        const ims = (gal.images || []).filter((im) => im.storage_path && im.is_public).sort((a, b) => a.sort_order - b.sort_order)
        for (const im of ims) rows.push({ im: { id: im.id, storage_path: im.storage_path, width: im.width, height: im.height, title: im.title || '' }, gal: { id: gal.id, slug: gal.slug, title: gal.title }, x: compactIntel(intel[im.id]) })
      }
      const byId = {}
      for (const r of rows) byId[r.im.id] = r
      if (alive) setLib({ rows, byId })
    })()
    return () => { alive = false }
  }, [])

  const sel = parseHeroPool(value)
  const ids = sel.map((e) => e.im.id)
  const commit = (nextIds) => {
    if (!lib) return
    onChange(serializeHeroPool(nextIds.map((id) => lib.byId[id]).filter(Boolean)))
  }
  const add = (id) => { if (!ids.includes(id)) commit([...ids, id]) }
  const remove = (id) => commit(ids.filter((x) => x !== id))
  const move = (id, dir) => {
    const i = ids.indexOf(id), j = i + dir
    if (i < 0 || j < 0 || j >= ids.length) return
    const n = ids.slice(); n[i] = ids[j]; n[j] = ids[i]; commit(n)
  }

  const thumb = (path) => publicImageUrl(path)
  const tiny = { ...ui.ghost, padding: '4px 8px', fontSize: '12px', lineHeight: 1 }
  const dot = (ok, text) => <span title={text} style={{ fontSize: '10px', letterSpacing: '0.06em', color: ok ? '#7ec699' : '#d8b878' }}>{ok ? '● analyserad' : '○ ej analyserad'}</span>

  if (error) return <p style={ui.err}>Biblioteket kunde inte läsas: {error}</p>
  if (!lib) return <p style={{ ...ui.muted, fontSize: '13px' }}>Läser biblioteket…</p>

  const groups = []
  for (const r of lib.rows) { let g = groups.find((x) => x.gal.id === r.gal.id); if (!g) { g = { gal: r.gal, rows: [] }; groups.push(g) } g.rows.push(r) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <span style={ui.label}>Bildspelet — {sel.length ? `${sel.length} bild${sel.length === 1 ? '' : 'er'} i ordning` : 'tomt ⇒ stillbilden visas'}</span>
        {sel.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {sel.map((e, i) => {
              const live = lib.byId[e.im.id]
              return (
                <div key={e.im.id} style={{ width: '168px', background: '#0f0f0f', border: '1px solid ' + (live ? '#242424' : '#5a3a2e'), borderRadius: '8px', padding: '8px' }}>
                  <div style={{ position: 'relative' }}>
                    <img src={thumb(e.im.storage_path)} alt="" style={{ width: '152px', height: '96px', objectFit: 'cover', borderRadius: '5px', background: '#111', display: 'block' }} />
                    <span style={{ position: 'absolute', top: '6px', left: '6px', background: 'rgba(0,0,0,.7)', color: '#fff', fontSize: '11px', padding: '2px 7px', borderRadius: '10px' }}>{i + 1}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', gap: '4px' }}>
                    {live ? dot(!!(live.x && live.x.focus), live.x && live.x.focus ? 'Ögonen är kända — övertoningen matchar dem' : 'Kör Analys på bilden så matchar övertoningen ögonen') : <span style={{ fontSize: '10px', color: '#d8b878' }}>saknas i biblioteket</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                    <button style={tiny} onClick={() => move(e.im.id, -1)} disabled={disabled || i === 0} title="Tidigare">‹</button>
                    <button style={tiny} onClick={() => move(e.im.id, 1)} disabled={disabled || i === sel.length - 1} title="Senare">›</button>
                    <span style={{ flex: 1 }} />
                    <button style={{ ...tiny, color: '#c99' }} onClick={() => remove(e.im.id)} disabled={disabled} title="Ta bort ur bildspelet">×</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div>
        <span style={ui.label}>Biblioteket — klicka för att lägga till (publika bilder i publika gallerier)</span>
        {groups.length === 0 && <p style={{ ...ui.muted, fontSize: '13px' }}>Inga publika bilder ännu. Lägg upp i Bilder &amp; gallerier först.</p>}
        {groups.map((g) => (
          <div key={g.gal.id} style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', color: '#999', margin: '6px 0' }}>{g.gal.title || g.gal.slug}</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {g.rows.map((r) => {
                const on = ids.includes(r.im.id)
                return (
                  <button
                    key={r.im.id}
                    onClick={() => (on ? remove(r.im.id) : add(r.im.id))}
                    disabled={disabled}
                    title={on ? 'Ta bort ur bildspelet' : (r.x && r.x.focus ? 'Lägg till' : 'Lägg till (ej analyserad — övertoningen kan inte matcha ögonen)')}
                    style={{ position: 'relative', padding: 0, border: '2px solid ' + (on ? '#fff' : 'transparent'), borderRadius: '6px', background: 'none', cursor: disabled ? 'default' : 'pointer', opacity: on ? 1 : 0.85 }}
                  >
                    <img src={thumb(r.im.storage_path)} alt="" style={{ width: '104px', height: '66px', objectFit: 'cover', borderRadius: '4px', background: '#111', display: 'block' }} />
                    {on && <span style={{ position: 'absolute', top: '4px', right: '4px', background: '#fff', color: '#000', fontSize: '10px', padding: '1px 6px', borderRadius: '8px' }}>{ids.indexOf(r.im.id) + 1}</span>}
                    {!(r.x && r.x.focus) && <span style={{ position: 'absolute', bottom: '4px', left: '4px', fontSize: '9px', color: '#d8b878', background: 'rgba(0,0,0,.7)', padding: '1px 5px', borderRadius: '6px' }}>ej analyserad</span>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SiteContentEditor() {
  const [db, setDb] = useState(null)        // sparat läge, { [locale]: { [key]: value } }
  const [draft, setDraft] = useState({})    // { 'locale|key': value } — bara ändrade celler
  const [locale, setLocale] = useState('sv')
  const [busy, setBusy] = useState(false)
  const [uploadingKey, setUploadingKey] = useState('')
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    let active = true
    fetchSiteContent().then((d) => { if (active) setDb(d) })
    return () => { active = false }
  }, [])

  const cell = (loc, key) => `${loc}|${key}`
  const saved = (loc, key) => db?.[loc]?.[key] ?? ''
  const current = (loc, key) => (cell(loc, key) in draft ? draft[cell(loc, key)] : saved(loc, key))
  const setValue = (loc, key, value) => {
    setDraft((d) => {
      const n = { ...d }
      if (value === saved(loc, key)) delete n[cell(loc, key)]; else n[cell(loc, key)] = value
      return n
    })
    setNote('')
  }
  const dirtyCount = Object.keys(draft).length

  const save = async () => {
    if (busy || !dirtyCount) return
    setBusy(true); setError(''); setNote('')
    const rows = Object.entries(draft).map(([k, value]) => {
      const [loc, key] = k.split('|'); return { key, locale: loc, value }
    })
    const { error } = await supabase.from('site_content').upsert(rows, { onConflict: 'key,locale' })
    setBusy(false)
    if (error) { setError(error.message); return }
    // Städa ersatta bilder i storage (bara filer vi själva lagt under site/)
    const staleImages = rows
      .filter((r) => FIELDS.find((f) => f.key === r.key)?.kind === 'image')
      .map((r) => saved(r.locale, r.key))
      .filter((old) => old && old.startsWith('site/') && !rows.some((r) => r.value === old))
    if (staleImages.length) await supabase.storage.from(BUCKET).remove(staleImages)
    setDb((d) => {
      const n = { ...d }
      for (const r of rows) n[r.locale] = { ...(n[r.locale] || {}), [r.key]: r.value }
      return n
    })
    setDraft({})
    setNote(`Sparat — ${rows.length} fält uppdaterade. Sajten visar ändringen direkt.`)
  }

  const discard = () => { setDraft({}); setNote('') }

  const uploadImage = async (field, e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || busy) return
    setUploadingKey(field.key); setError('')
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const key = `site/${field.key}-${crypto.randomUUID()}.${ext}`
    const up = await supabase.storage.from(BUCKET).upload(key, file, { cacheControl: '3600', upsert: false })
    setUploadingKey('')
    if (up.error) { setError(up.error.message); return }
    setValue(NEUTRAL, field.key, key)
  }

  if (db === null) return <p style={ui.muted}>Laddar…</p>

  const renderField = (f) => {
    const loc = f.neutral ? NEUTRAL : locale
    const value = current(loc, f.key)
    const dirty = cell(loc, f.key) in draft
    const def = DEFAULTS[loc]?.[f.key] ?? ''
    const label = (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', color: dirty ? '#fff' : '#bbb' }}>{f.label}</span>
        {f.neutral && <span style={{ ...ui.muted, fontSize: '11px' }}>alla språk</span>}
        {dirty && <span style={{ fontSize: '11px', color: '#d8b878' }}>ändrad</span>}
      </div>
    )

    if (f.kind === 'pool') {
      return (
        <div key={f.key} style={{ marginBottom: '26px' }}>
          {label}
          <HeroPoolPicker value={value} onChange={(v) => setValue(loc, f.key, v)} disabled={busy} />
          {f.hint && <div style={{ ...ui.muted, fontSize: '12px', marginTop: '10px', maxWidth: '560px', lineHeight: 1.5 }}>{f.hint}</div>}
        </div>
      )
    }

    if (f.kind === 'image') {
      const src = value ? publicImageUrl(value) : (f.key === 'hero_image' ? '/images/intro/me_bw.jpg' : '/images/about/me.jpg')
      return (
        <div key={f.key} style={{ marginBottom: '22px' }}>
          {label}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <img src={src} alt="" style={{ width: '160px', height: '110px', objectFit: 'cover', borderRadius: '6px', background: '#111', border: '1px solid #1c1c1c' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ ...ui.ghost, display: 'inline-block', cursor: uploadingKey ? 'default' : 'pointer', color: '#ddd' }}>
                {uploadingKey === f.key ? 'Laddar upp…' : 'Byt bild'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => uploadImage(f, e)} disabled={busy || !!uploadingKey} />
              </label>
              {value && (
                <button style={{ ...ui.ghost, color: '#999' }} onClick={() => setValue(loc, f.key, '')} disabled={busy}>Använd standardbilden</button>
              )}
              {f.hint && <span style={{ ...ui.muted, fontSize: '12px', maxWidth: '320px', lineHeight: 1.5 }}>{f.hint}</span>}
            </div>
          </div>
        </div>
      )
    }

    const common = {
      value,
      placeholder: def || (f.kind === 'url' ? 'https://…' : ''),
      onChange: (e) => setValue(loc, f.key, e.target.value),
      disabled: busy,
      style: { ...ui.input, marginBottom: 0, borderColor: dirty ? '#5a4a2e' : '#2a2a2a', fontFamily: 'inherit', lineHeight: 1.5 },
    }
    return (
      <div key={f.key} style={{ marginBottom: '18px' }}>
        {label}
        {f.multiline
          ? <textarea rows={f.key === 'contact_heading' ? 2 : 3} {...common} />
          : <input type={f.kind === 'url' ? 'url' : 'text'} {...common} />}
        {f.hint && <div style={{ ...ui.muted, fontSize: '12px', marginTop: '6px' }}>{f.hint}</div>}
        {!value && def && <div style={{ ...ui.muted, fontSize: '11px', marginTop: '6px' }}>Tomt = standardtexten (visas grå ovan) används.</div>}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '720px' }}>
      <h2 style={{ ...ui.serif, fontSize: '22px', margin: '0 0 4px', color: '#fff' }}>Innehåll</h2>
      <p style={{ ...ui.muted, fontSize: '13px', margin: '0 0 20px' }}>
        Texten och bilderna på gaahlin.com. Språkfälten redigeras per flik; bilder och länkar gäller alla språk.
      </p>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '26px', flexWrap: 'wrap' }}>
        {LOCALES.map((l) => {
          const changed = FIELDS.some((f) => !f.neutral && cell(l, f.key) in draft)
          return (
            <button
              key={l}
              onClick={() => setLocale(l)}
              style={{
                ...ui.ghost, padding: '7px 14px',
                background: locale === l ? '#1c1c1c' : 'none',
                color: locale === l ? '#fff' : '#999',
                borderColor: changed ? '#5a4a2e' : (locale === l ? '#333' : '#2a2a2a'),
              }}
            >
              {LOCALE_LABEL[l]}{changed ? ' •' : ''}
            </button>
          )
        })}
      </div>

      {GROUPS.map((g) => (
        <section key={g} style={{ marginBottom: '32px', paddingBottom: '8px', borderBottom: '1px solid #1c1c1c' }}>
          <h3 style={{ ...ui.serif, fontSize: '17px', color: '#fff', margin: '0 0 14px' }}>{g}</h3>
          {FIELDS.filter((f) => f.group === g).map(renderField)}
        </section>
      ))}

      <div style={{ position: 'sticky', bottom: 0, background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(6px)', padding: '14px 0', display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid #1c1c1c' }}>
        <button
          style={{ ...ui.btn, width: 'auto', padding: '10px 18px', opacity: dirtyCount && !busy ? 1 : 0.5, cursor: dirtyCount && !busy ? 'pointer' : 'default' }}
          onClick={save}
          disabled={busy || !dirtyCount}
        >
          {busy ? 'Sparar…' : dirtyCount ? `Spara ${dirtyCount} ändring${dirtyCount === 1 ? '' : 'ar'}` : 'Inget att spara'}
        </button>
        {dirtyCount > 0 && <button style={ui.ghost} onClick={discard} disabled={busy}>Ångra</button>}
        <span style={{ flex: 1 }} />
        {error && <span style={ui.err}>{error}</span>}
        {note && <span style={{ fontSize: '13px', color: '#7ec699' }}>{note}</span>}
      </div>
    </div>
  )
}

/* ---------------- Bokningar ---------------- */

function Bookings() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const STATUSES = [
    { id: 'ny', label: 'Ny' },
    { id: 'bekräftad', label: 'Bekräftad' },
    { id: 'genomförd', label: 'Genomförd' },
    { id: 'avböjd', label: 'Avböjd' },
  ]
  const statusColor = (s) =>
    s === 'bekräftad' ? '#7ec699' : s === 'genomförd' ? '#8ab4f8' : s === 'avböjd' ? '#c98a8a' : '#d8b878'

  const load = async () => {
    const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false })
    if (error) { setError(error.message); return }
    setRows(data || [])
  }
  useEffect(() => { load() }, [])

  const changeStatus = async (row, status) => {
    if (busy || row.status === status) return
    setBusy(true); setError('')
    const { error } = await supabase.from('bookings').update({ status }).eq('id', row.id)
    setBusy(false)
    if (error) { setError(error.message); return }
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status } : r)))
  }

  const remove = async (row) => {
    if (busy) return
    setBusy(true); setError('')
    const { error } = await supabase.from('bookings').delete().eq('id', row.id)
    setBusy(false)
    if (error) { setError(error.message); return }
    setRows((rs) => rs.filter((r) => r.id !== row.id))
  }

  return (
    <div>
      <h2 style={{ ...ui.serif, fontSize: '22px', margin: '0 0 4px', color: '#fff' }}>Bokningar</h2>
      <p style={{ ...ui.muted, fontSize: '13px', margin: '0 0 24px' }}>Inkomna bokningsförfrågningar från sidan /boka. Sätt status allteftersom.</p>
      {error && <p style={ui.err}>{error}</p>}
      {rows === null && !error && <p style={ui.muted}>Laddar…</p>}
      {rows && rows.length === 0 && <p style={ui.muted}>Inga bokningsförfrågningar än.</p>}
      {rows && rows.map((r) => (
        <div key={r.id} style={{ borderBottom: '1px solid #1c1c1c', padding: '18px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '8px', alignItems: 'baseline' }}>
            <span style={{ ...ui.serif, fontSize: '17px', color: '#fff' }}>
              {r.name}
              {r.shoot_type ? <span style={{ ...ui.muted, fontSize: '13px', fontFamily: 'system-ui, sans-serif' }}> · {r.shoot_type}</span> : null}
            </span>
            <span style={{ ...ui.muted, fontSize: '12px', whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleString('sv-SE')}</span>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: r.message ? '10px' : '14px' }}>
            <a href={`mailto:${r.email}`} style={{ color: '#8ab4f8', fontSize: '13px', textDecoration: 'none' }}>{r.email}</a>
            {r.phone && <a href={`tel:${r.phone}`} style={{ color: '#8ab4f8', fontSize: '13px', textDecoration: 'none' }}>{r.phone}</a>}
            {r.preferred_date && <span style={{ ...ui.muted, fontSize: '13px' }}>Önskat datum: {r.preferred_date}</span>}
          </div>
          {r.message && <p style={{ margin: '0 0 14px', color: '#cfcfcf', fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{r.message}</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {STATUSES.map((s) => {
              const active = r.status === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => changeStatus(r, s.id)}
                  disabled={busy}
                  style={{
                    background: active ? statusColor(s.id) : 'none',
                    color: active ? '#000' : statusColor(s.id),
                    border: `1px solid ${statusColor(s.id)}`,
                    borderRadius: '999px', padding: '5px 12px', fontSize: '12px',
                    cursor: busy ? 'default' : 'pointer',
                  }}
                >
                  {s.label}
                </button>
              )
            })}
            <span style={{ flex: 1 }} />
            <button style={{ ...ui.ghost, color: '#c98a8a', borderColor: '#5a2e2e' }} onClick={() => remove(r)} disabled={busy}>Radera</button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------------- Galleri-CMS ---------------- */

function GalleryManager() {
  const [galleries, setGalleries] = useState(null)   // null = laddar
  const [counts, setCounts] = useState({})           // gallery_id -> antal bilder
  const [openId, setOpenId] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState(null)   // galleri under inline-redigering
  const [editTitle, setEditTitle] = useState('')
  const [confirmGallery, setConfirmGallery] = useState(null) // galleri som ska raderas

  const load = async () => {
    const g = await supabase.from('galleries').select('*').order('sort_order')
    if (g.error) { setError(g.error.message); return }
    setGalleries(g.data || [])
    const c = await supabase.from('images').select('gallery_id')
    if (!c.error) {
      const map = {}
      for (const row of c.data || []) map[row.gallery_id] = (map[row.gallery_id] || 0) + 1
      setCounts(map)
    }
  }
  useEffect(() => { load() }, [])

  const createGallery = async () => {
    const t = newTitle.trim()
    if (!t || busy) return
    const slug = slugify(t) || ('galleri-' + Date.now())
    setBusy(true); setError('')
    const nextOrder = galleries && galleries.length ? Math.max(...galleries.map((g) => g.sort_order)) + 1 : 0
    const { error } = await supabase.from('galleries').insert({ slug, title: t, sort_order: nextOrder, is_public: true })
    setBusy(false)
    if (error) {
      setError(error.code === '23505' ? 'Ett galleri med det namnet finns redan.' : error.message)
      return
    }
    setNewTitle('')
    await load()
  }

  // Inline-redigering ersätter window.prompt.
  const startEdit = (g) => { setEditingId(g.id); setEditTitle(g.title) }
  const cancelEdit = () => { setEditingId(null); setEditTitle('') }
  // Adressen (slug) följer namnet (Anders 2026-09-12: "döpte om 'Portraits' till 'Intro' men det ändras inte" — titeln
  // sparades, adressen stod kvar). Den har ingen publik roll — sajten visar den aldrig — men den är unik i databasen
  // (galleries_slug_key), så en krock med ett annat galleri får ett löpnummer: intro, intro-2, intro-3 …
  const freeSlug = (base, ownId) => {
    const taken = (x) => (galleries || []).some((g) => g.id !== ownId && g.slug === x)
    let candidate = base, n = 2
    while (taken(candidate)) candidate = `${base}-${n++}`
    return candidate
  }
  const saveEdit = async (g) => {
    const t = editTitle.trim()
    if (!t || busy) return
    setBusy(true); setError('')
    let slug = freeSlug(slugify(t) || g.slug, g.id)
    let { error } = await supabase.from('galleries').update({ title: t, slug }).eq('id', g.id)
    if (error && error.code === '23505') {   // unik-krock trots kontrollen (galleri skapat i annan flik) — ett löpnummer till, en gång
      slug = `${slug}-${Date.now() % 1000}`
      ;({ error } = await supabase.from('galleries').update({ title: t, slug }).eq('id', g.id))
    }
    setBusy(false)
    if (error) { setError(error.message); return }
    setGalleries((gs) => gs.map((x) => (x.id === g.id ? { ...x, title: t, slug } : x)))
    cancelEdit()
  }

  const toggleGalleryPublic = async (g) => {
    setBusy(true); setError('')
    const { error } = await supabase.from('galleries').update({ is_public: !g.is_public }).eq('id', g.id)
    setBusy(false)
    if (error) { setError(error.message); return }
    setGalleries((gs) => gs.map((x) => (x.id === g.id ? { ...x, is_public: !x.is_public } : x)))
  }

  const moveGallery = async (idx, dir) => {
    if (busy || !galleries) return
    const j = idx + dir
    if (j < 0 || j >= galleries.length) return
    const a = galleries[idx], b = galleries[j]
    setBusy(true); setError('')
    const r1 = await supabase.from('galleries').update({ sort_order: b.sort_order }).eq('id', a.id)
    const r2 = await supabase.from('galleries').update({ sort_order: a.sort_order }).eq('id', b.id)
    setBusy(false)
    if (r1.error || r2.error) { setError((r1.error || r2.error).message); return }
    setGalleries((gs) => {
      const copy = gs.map((x) => {
        if (x.id === a.id) return { ...x, sort_order: b.sort_order }
        if (x.id === b.id) return { ...x, sort_order: a.sort_order }
        return x
      })
      return copy.sort((x, y) => x.sort_order - y.sort_order)
    })
  }

  // Radering: bekräftelse via ConfirmModal ersätter window.confirm.
  const performDeleteGallery = async () => {
    const g = confirmGallery
    if (!g) return
    setBusy(true); setError('')
    const imgs = await supabase.from('images').select('storage_path').eq('gallery_id', g.id)
    const keys = (imgs.data || []).map((i) => i.storage_path).filter(Boolean)
    if (keys.length) await supabase.storage.from(BUCKET).remove(keys)
    const del = await supabase.from('galleries').delete().eq('id', g.id)
    setBusy(false)
    if (del.error) { setError(del.error.message); return }
    setConfirmGallery(null)
    await load()
  }

  if (openId) {
    const g = (galleries || []).find((x) => x.id === openId)
    if (!g) { setOpenId(null); return null }
    return <GalleryImages gallery={g} onBack={() => { setOpenId(null); load() }} />
  }

  return (
    <div>
      <h2 style={{ ...ui.serif, fontSize: '22px', margin: '0 0 4px', color: '#fff' }}>Bilder &amp; gallerier</h2>
      <p style={{ ...ui.muted, fontSize: '13px', margin: '0 0 24px' }}>
        Skapa gallerier och fyll dem med bilder. Bilderna lagras i Supabase Storage — sajten läser dem direkt.
      </p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', maxWidth: '520px' }}>
        <input
          style={{ ...ui.input, marginBottom: 0, flex: 1 }}
          placeholder="Nytt galleri — t.ex. Black Series"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createGallery()}
        />
        <button
          style={{ ...ui.btn, width: 'auto', padding: '12px 18px', whiteSpace: 'nowrap', opacity: busy ? 0.6 : 1 }}
          onClick={createGallery}
          disabled={busy}
        >
          Skapa galleri
        </button>
      </div>

      {error && <p style={{ ...ui.err, margin: '0 0 16px' }}>{error}</p>}
      {galleries === null && !error && <p style={ui.muted}>Laddar…</p>}
      {galleries && galleries.length === 0 && <p style={ui.muted}>Inga gallerier än — skapa ditt första ovan.</p>}

      {galleries && galleries.length > 0 && (
        <div style={{ maxWidth: '680px' }}>
          {galleries.map((g, idx) => (
            editingId === g.id ? (
              <EditRow
                key={g.id}
                value={editTitle}
                onChange={setEditTitle}
                onSave={() => saveEdit(g)}
                onCancel={cancelEdit}
                busy={busy}
              />
            ) : (
              <div key={g.id} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 16px', marginBottom: '8px',
                background: '#111', border: '1px solid #1c1c1c', borderRadius: '8px',
                opacity: g.is_public ? 1 : 0.55,
              }}>
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setOpenId(g.id)}>
                  <div style={{ ...ui.serif, fontSize: '16px', color: '#fff' }}>{g.title}</div>
                  <div style={{ ...ui.muted, fontSize: '12px' }}>
                    {(counts[g.id] || 0)} bild{(counts[g.id] || 0) === 1 ? '' : 'er'} · /{g.slug}
                  </div>
                </div>
                <button style={{ ...ui.ghost, color: '#bbb' }} onClick={() => setOpenId(g.id)}>Öppna</button>
                <button
                  onClick={() => toggleGalleryPublic(g)}
                  disabled={busy}
                  style={{ ...ui.ghost, minWidth: '70px', color: g.is_public ? '#7ec699' : '#999', borderColor: g.is_public ? '#2e5a3f' : '#2a2a2a' }}
                >
                  {g.is_public ? 'Publik' : 'Dold'}
                </button>
                <button style={{ ...ui.ghost, color: '#999' }} onClick={() => startEdit(g)} disabled={busy}>Döp om</button>
                <button style={{ ...ui.ghost, color: '#c98a8a', borderColor: '#5a2e2e' }} onClick={() => setConfirmGallery(g)} disabled={busy}>Radera</button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button onClick={() => moveGallery(idx, -1)} disabled={busy || idx === 0} style={arrowBtn(busy || idx === 0)}>▲</button>
                  <button onClick={() => moveGallery(idx, 1)} disabled={busy || idx === galleries.length - 1} style={arrowBtn(busy || idx === galleries.length - 1)}>▼</button>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {confirmGallery && (
        <ConfirmModal
          title="Ta bort galleriet?"
          body={`${confirmGallery.title} och alla dess ${counts[confirmGallery.id] || 0} bilder tas bort. Detta går inte att ångra.`}
          onConfirm={performDeleteGallery}
          onCancel={() => setConfirmGallery(null)}
          busy={busy}
        />
      )}
    </div>
  )
}

/* ---------------- En gallerimapps bilder ---------------- */

function GalleryImages({ gallery, onBack }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(0)
  const [editingId, setEditingId] = useState(null)   // bild under inline-redigering
  const [editTitle, setEditTitle] = useState('')
  const [confirmImage, setConfirmImage] = useState(null) // bild som ska raderas
  const fileRef = useRef(null)

  const load = async () => {
    const { data, error } = await supabase.from('images').select('*').eq('gallery_id', gallery.id).order('sort_order')
    if (error) { setError(error.message); return }
    setRows(data || [])
  }
  useEffect(() => { load() }, [gallery.id])

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    setError(''); setUploading(files.length)
    let order = rows && rows.length ? Math.max(...rows.map((r) => r.sort_order)) : 0
    for (const file of files) {
      const dims = await readDims(file)
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const key = `${gallery.slug}/${crypto.randomUUID()}.${ext}`
      const up = await supabase.storage.from(BUCKET).upload(key, file, { cacheControl: '3600', upsert: false })
      if (up.error) { setError(up.error.message); setUploading((n) => Math.max(0, n - 1)); continue }
      order += 1
      const ins = await supabase.from('images').insert({
        gallery_id: gallery.id,
        storage_path: key,
        sort_order: order,
        is_public: true,
        width: dims.w,
        height: dims.h,
        title: file.name.replace(/\.[^.]+$/, ''),
      })
      if (ins.error) setError(ins.error.message)
      setUploading((n) => Math.max(0, n - 1))
    }
    await load()
  }

  const move = async (idx, dir) => {
    if (busy || !rows) return
    const j = idx + dir
    if (j < 0 || j >= rows.length) return
    const a = rows[idx], b = rows[j]
    setBusy(true); setError('')
    const r1 = await supabase.from('images').update({ sort_order: b.sort_order }).eq('id', a.id)
    const r2 = await supabase.from('images').update({ sort_order: a.sort_order }).eq('id', b.id)
    setBusy(false)
    if (r1.error || r2.error) { setError((r1.error || r2.error).message); return }
    setRows((rs) => {
      const copy = rs.map((r) => {
        if (r.id === a.id) return { ...r, sort_order: b.sort_order }
        if (r.id === b.id) return { ...r, sort_order: a.sort_order }
        return r
      })
      return copy.sort((x, y) => x.sort_order - y.sort_order)
    })
  }

  const togglePublic = async (img) => {
    if (busy) return
    setBusy(true); setError('')
    const { error } = await supabase.from('images').update({ is_public: !img.is_public }).eq('id', img.id)
    setBusy(false)
    if (error) { setError(error.message); return }
    setRows((rs) => rs.map((r) => (r.id === img.id ? { ...r, is_public: !r.is_public } : r)))
  }

  // Inline-redigering av bildtitel (bilder var tidigare oredigerbara).
  const startEdit = (img) => { setEditingId(img.id); setEditTitle(img.title || '') }
  const cancelEdit = () => { setEditingId(null); setEditTitle('') }
  const saveEdit = async (img) => {
    if (busy) return
    const t = editTitle.trim()
    setBusy(true); setError('')
    const { error } = await supabase.from('images').update({ title: t || null }).eq('id', img.id)
    setBusy(false)
    if (error) { setError(error.message); return }
    setRows((rs) => rs.map((r) => (r.id === img.id ? { ...r, title: t || null } : r)))
    cancelEdit()
  }

  // Radering via ConfirmModal ersätter window.confirm.
  const performDeleteImage = async () => {
    const img = confirmImage
    if (!img) return
    setBusy(true); setError('')
    if (img.storage_path) await supabase.storage.from(BUCKET).remove([img.storage_path])
    const del = await supabase.from('images').delete().eq('id', img.id)
    setBusy(false)
    if (del.error) { setError(del.error.message); return }
    setConfirmImage(null)
    setRows((rs) => rs.filter((r) => r.id !== img.id))
  }

  return (
    <div>
      <button style={{ ...ui.ghost, marginBottom: '18px' }} onClick={onBack}>← Alla gallerier</button>
      <h2 style={{ ...ui.serif, fontSize: '22px', margin: '0 0 4px', color: '#fff' }}>{gallery.title}</h2>
      <p style={{ ...ui.muted, fontSize: '13px', margin: '0 0 20px' }}>
        /{gallery.slug} · {gallery.is_public ? 'publikt galleri' : 'dolt galleri'}
      </p>

      <div style={{ marginBottom: '24px' }}>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple style={{ display: 'none' }} onChange={onFiles} />
        <button
          style={{ ...ui.btn, width: 'auto', padding: '12px 18px', opacity: uploading ? 0.6 : 1, cursor: uploading ? 'default' : 'pointer' }}
          onClick={() => fileRef.current?.click()}
          disabled={uploading > 0}
        >
          {uploading > 0 ? `Laddar upp… (${uploading} kvar)` : 'Ladda upp bilder'}
        </button>
        <span style={{ ...ui.muted, fontSize: '12px', marginLeft: '12px' }}>JPEG, PNG, WebP eller AVIF · max 20 MB</span>
      </div>

      {error && <p style={{ ...ui.err, margin: '0 0 16px' }}>{error}</p>}
      {rows === null && !error && <p style={ui.muted}>Laddar…</p>}
      {rows && rows.length === 0 && <p style={ui.muted}>Inga bilder i galleriet än — ladda upp ovan.</p>}

      {rows && rows.length > 0 && (
        <div style={{ maxWidth: '680px' }}>
          {rows.map((img, idx) => (
            editingId === img.id ? (
              <EditRow
                key={img.id}
                label="Titel / bildtext"
                value={editTitle}
                onChange={setEditTitle}
                onSave={() => saveEdit(img)}
                onCancel={cancelEdit}
                busy={busy}
              />
            ) : (
              <div key={img.id} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '10px', marginBottom: '8px',
                background: '#111', border: '1px solid #1c1c1c', borderRadius: '8px',
                opacity: img.is_public ? 1 : 0.55,
              }}>
                <img
                  src={publicUrl(img.storage_path)}
                  alt={img.title || ''}
                  style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '4px', background: '#000', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', color: '#eee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.title || 'Namnlös'}</div>
                  <div style={{ ...ui.muted, fontSize: '12px' }}>{img.width && img.height ? `${img.width}×${img.height}` : '—'}</div>
                </div>
                <button
                  onClick={() => togglePublic(img)}
                  disabled={busy}
                  style={{ ...ui.ghost, minWidth: '70px', color: img.is_public ? '#7ec699' : '#999', borderColor: img.is_public ? '#2e5a3f' : '#2a2a2a' }}
                >
                  {img.is_public ? 'Publik' : 'Dold'}
                </button>
                <button style={{ ...ui.ghost, color: '#999' }} onClick={() => startEdit(img)} disabled={busy}>Döp om</button>
                <button style={{ ...ui.ghost, color: '#c98a8a', borderColor: '#5a2e2e' }} onClick={() => setConfirmImage(img)} disabled={busy}>Radera</button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button onClick={() => move(idx, -1)} disabled={busy || idx === 0} style={arrowBtn(busy || idx === 0)}>▲</button>
                  <button onClick={() => move(idx, 1)} disabled={busy || idx === rows.length - 1} style={arrowBtn(busy || idx === rows.length - 1)}>▼</button>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {confirmImage && (
        <ConfirmModal
          title="Ta bort bilden?"
          body="Bilden tas bort från galleriet och Storage. Detta går inte att ångra."
          onConfirm={performDeleteImage}
          onCancel={() => setConfirmImage(null)}
          busy={busy}
        />
      )}
    </div>
  )
}

/* ---------------- Kunder + privata leveranser ---------------- */

function ClientManager() {
  const [clients, setClients] = useState(null)        // null = laddar
  const [counts, setCounts] = useState({})            // client user_id -> antal leveransbilder
  const [openClient, setOpenClient] = useState(null)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmClient, setConfirmClient] = useState(null)

  const load = async () => {
    const c = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    if (c.error) { setError(c.error.message); return }
    setClients(c.data || [])
    const d = await supabase.from('deliveries').select('client_id')
    if (!d.error) {
      const map = {}
      for (const row of d.data || []) map[row.client_id] = (map[row.client_id] || 0) + 1
      setCounts(map)
    }
  }
  useEffect(() => { load() }, [])

  // Bjud in kund via edge function (service_role skapar auth-användare + clients-rad + mejl).
  const addClient = async () => {
    const e = email.trim().toLowerCase()
    if (!e || busy) return
    setBusy(true); setError(''); setNote('')
    const { data, error } = await supabase.functions.invoke('invite-client', { body: { email: e, name: name.trim() } })
    setBusy(false)
    if (error) {
      let msg = 'Inbjudan misslyckades.'
      try { const b = await error.context.json(); if (b?.error) msg = b.error } catch (_) { /* behåll generiskt */ }
      setError(msg); return
    }
    if (data?.error) { setError(data.error); return }
    setEmail(''); setName('')
    setNote(`Inbjudan skickad till ${e}. Kunden får ett mejl och syns i listan nedan.`)
    await load()
  }

  const performDeleteClient = async () => {
    const c = confirmClient
    if (!c) return
    setBusy(true); setError('')
    // Städa leveransfiler i privata bucketen; clients-radering kaskaderar deliveries-rader.
    const d = await supabase.from('deliveries').select('storage_path').eq('client_id', c.user_id)
    const keys = (d.data || []).map((x) => x.storage_path).filter(Boolean)
    if (keys.length) await supabase.storage.from(DELIVERIES).remove(keys)
    const del = await supabase.from('clients').delete().eq('user_id', c.user_id)
    setBusy(false)
    if (del.error) { setError(del.error.message); return }
    setConfirmClient(null)
    await load()
  }

  if (openClient) {
    return <ClientDeliveries client={openClient} onBack={() => { setOpenClient(null); load() }} />
  }

  return (
    <div>
      <h2 style={{ ...ui.serif, fontSize: '22px', margin: '0 0 4px', color: '#fff' }}>Kunder</h2>
      <p style={{ ...ui.muted, fontSize: '13px', margin: '0 0 24px' }}>
        Bjud in kunder och leverera bilder privat. Varje kund loggar in med magisk länk och ser bara sina egna bilder.
      </p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', maxWidth: '640px', flexWrap: 'wrap' }}>
        <input
          style={{ ...ui.input, marginBottom: 0, flex: '2 1 220px' }}
          type="email" inputMode="email" placeholder="Kundens e-post"
          value={email} onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addClient()}
        />
        <input
          style={{ ...ui.input, marginBottom: 0, flex: '1 1 140px' }}
          placeholder="Namn (valfritt)"
          value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addClient()}
        />
        <button
          style={{ ...ui.btn, width: 'auto', padding: '12px 18px', whiteSpace: 'nowrap', opacity: busy ? 0.6 : 1 }}
          onClick={addClient} disabled={busy}
        >
          {busy ? 'Bjuder in…' : 'Bjud in kund'}
        </button>
      </div>
      {note && <p style={{ color: '#7ec699', fontSize: '13px', margin: '0 0 16px' }}>{note}</p>}
      {error && <p style={{ ...ui.err, margin: '8px 0 16px' }}>{error}</p>}
      {!note && !error && <div style={{ height: '8px' }} />}

      {clients === null && !error && <p style={ui.muted}>Laddar…</p>}
      {clients && clients.length === 0 && <p style={ui.muted}>Inga kunder än — bjud in din första ovan.</p>}

      {clients && clients.length > 0 && (
        <div style={{ maxWidth: '680px' }}>
          {clients.map((c) => (
            <div key={c.user_id} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 16px', marginBottom: '8px',
              background: '#111', border: '1px solid #1c1c1c', borderRadius: '8px',
            }}>
              <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setOpenClient(c)}>
                <div style={{ ...ui.serif, fontSize: '16px', color: '#fff' }}>{c.display_name || c.email}</div>
                <div style={{ ...ui.muted, fontSize: '12px' }}>
                  {c.display_name ? c.email + ' · ' : ''}{(counts[c.user_id] || 0)} bild{(counts[c.user_id] || 0) === 1 ? '' : 'er'}
                </div>
              </div>
              <button style={{ ...ui.ghost, color: '#bbb' }} onClick={() => setOpenClient(c)}>Öppna</button>
              <button style={{ ...ui.ghost, color: '#c98a8a', borderColor: '#5a2e2e' }} onClick={() => setConfirmClient(c)} disabled={busy}>Ta bort</button>
            </div>
          ))}
        </div>
      )}

      {confirmClient && (
        <ConfirmModal
          title="Ta bort kunden?"
          body={`${confirmClient.display_name || confirmClient.email} och alla deras ${counts[confirmClient.user_id] || 0} levererade bilder tas bort. Inloggningskontot finns kvar men förlorar åtkomst. Detta går inte att ångra.`}
          onConfirm={performDeleteClient}
          onCancel={() => setConfirmClient(null)}
          busy={busy}
        />
      )}
    </div>
  )
}

/* ---------------- En kunds leveransbilder (privat bucket) ---------------- */

function ClientDeliveries({ client, onBack }) {
  const [rows, setRows] = useState(null)
  const [signed, setSigned] = useState({})            // storage_path -> signed url
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [confirmRow, setConfirmRow] = useState(null)
  const fileRef = useRef(null)

  const load = async () => {
    const { data, error } = await supabase.from('deliveries').select('*').eq('client_id', client.user_id).order('sort_order')
    if (error) { setError(error.message); return }
    setRows(data || [])
    // Privat bucket → ingen publik URL. Admin har åtkomst, så vi signerar miniatyrerna.
    const keys = (data || []).map((r) => r.storage_path).filter(Boolean)
    if (keys.length) {
      const { data: urls } = await supabase.storage.from(DELIVERIES).createSignedUrls(keys, 3600)
      const map = {}
      for (const u of urls || []) if (u.signedUrl) map[u.path] = u.signedUrl
      setSigned(map)
    } else setSigned({})
  }
  useEffect(() => { load() }, [client.user_id])

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    setError(''); setUploading(files.length)
    let order = rows && rows.length ? Math.max(...rows.map((r) => r.sort_order)) : 0
    for (const file of files) {
      const dims = await readDims(file)
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      // Nyckel = <kund-uid>/<uuid> → storage-policyn låter just den kunden läsa.
      const key = `${client.user_id}/${crypto.randomUUID()}.${ext}`
      const up = await supabase.storage.from(DELIVERIES).upload(key, file, { cacheControl: '3600', upsert: false })
      if (up.error) { setError(up.error.message); setUploading((n) => Math.max(0, n - 1)); continue }
      order += 1
      const ins = await supabase.from('deliveries').insert({
        client_id: client.user_id,
        storage_path: key,
        sort_order: order,
        width: dims.w,
        height: dims.h,
        title: file.name.replace(/\.[^.]+$/, ''),
      })
      if (ins.error) setError(ins.error.message)
      setUploading((n) => Math.max(0, n - 1))
    }
    await load()
  }

  const move = async (idx, dir) => {
    if (busy || !rows) return
    const j = idx + dir
    if (j < 0 || j >= rows.length) return
    const a = rows[idx], b = rows[j]
    setBusy(true); setError('')
    const r1 = await supabase.from('deliveries').update({ sort_order: b.sort_order }).eq('id', a.id)
    const r2 = await supabase.from('deliveries').update({ sort_order: a.sort_order }).eq('id', b.id)
    setBusy(false)
    if (r1.error || r2.error) { setError((r1.error || r2.error).message); return }
    setRows((rs) => {
      const copy = rs.map((r) => {
        if (r.id === a.id) return { ...r, sort_order: b.sort_order }
        if (r.id === b.id) return { ...r, sort_order: a.sort_order }
        return r
      })
      return copy.sort((x, y) => x.sort_order - y.sort_order)
    })
  }

  const startEdit = (row) => { setEditingId(row.id); setEditTitle(row.title || '') }
  const cancelEdit = () => { setEditingId(null); setEditTitle('') }
  const saveEdit = async (row) => {
    if (busy) return
    const t = editTitle.trim()
    setBusy(true); setError('')
    const { error } = await supabase.from('deliveries').update({ title: t || null }).eq('id', row.id)
    setBusy(false)
    if (error) { setError(error.message); return }
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, title: t || null } : r)))
    cancelEdit()
  }

  const performDelete = async () => {
    const row = confirmRow
    if (!row) return
    setBusy(true); setError('')
    if (row.storage_path) await supabase.storage.from(DELIVERIES).remove([row.storage_path])
    const del = await supabase.from('deliveries').delete().eq('id', row.id)
    setBusy(false)
    if (del.error) { setError(del.error.message); return }
    setConfirmRow(null)
    setRows((rs) => rs.filter((r) => r.id !== row.id))
  }

  return (
    <div>
      <button style={{ ...ui.ghost, marginBottom: '18px' }} onClick={onBack}>← Alla kunder</button>
      <h2 style={{ ...ui.serif, fontSize: '22px', margin: '0 0 4px', color: '#fff' }}>{client.display_name || client.email}</h2>
      <p style={{ ...ui.muted, fontSize: '13px', margin: '0 0 20px' }}>
        {client.email} · privata leveranser (bara kunden ser dem)
      </p>

      <div style={{ marginBottom: '24px' }}>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple style={{ display: 'none' }} onChange={onFiles} />
        <button
          style={{ ...ui.btn, width: 'auto', padding: '12px 18px', opacity: uploading ? 0.6 : 1, cursor: uploading ? 'default' : 'pointer' }}
          onClick={() => fileRef.current?.click()}
          disabled={uploading > 0}
        >
          {uploading > 0 ? `Laddar upp… (${uploading} kvar)` : 'Ladda upp bilder'}
        </button>
        <span style={{ ...ui.muted, fontSize: '12px', marginLeft: '12px' }}>JPEG, PNG, WebP eller AVIF · max 50 MB</span>
      </div>

      {error && <p style={{ ...ui.err, margin: '0 0 16px' }}>{error}</p>}
      {rows === null && !error && <p style={ui.muted}>Laddar…</p>}
      {rows && rows.length === 0 && <p style={ui.muted}>Inga bilder levererade än — ladda upp ovan.</p>}

      {rows && rows.length > 0 && (
        <div style={{ maxWidth: '680px' }}>
          {rows.map((row, idx) => (
            editingId === row.id ? (
              <EditRow
                key={row.id}
                label="Titel / bildtext"
                value={editTitle}
                onChange={setEditTitle}
                onSave={() => saveEdit(row)}
                onCancel={cancelEdit}
                busy={busy}
              />
            ) : (
              <div key={row.id} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '10px', marginBottom: '8px',
                background: '#111', border: '1px solid #1c1c1c', borderRadius: '8px',
              }}>
                <img
                  src={signed[row.storage_path] || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"}
                  alt={row.title || ''}
                  style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '4px', background: '#000', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', color: '#eee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.title || 'Namnlös'}</div>
                  <div style={{ ...ui.muted, fontSize: '12px' }}>{row.width && row.height ? `${row.width}×${row.height}` : '—'}</div>
                </div>
                <button style={{ ...ui.ghost, color: '#999' }} onClick={() => startEdit(row)} disabled={busy}>Döp om</button>
                <button style={{ ...ui.ghost, color: '#c98a8a', borderColor: '#5a2e2e' }} onClick={() => setConfirmRow(row)} disabled={busy}>Radera</button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button onClick={() => move(idx, -1)} disabled={busy || idx === 0} style={arrowBtn(busy || idx === 0)}>▲</button>
                  <button onClick={() => move(idx, 1)} disabled={busy || idx === rows.length - 1} style={arrowBtn(busy || idx === rows.length - 1)}>▼</button>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {confirmRow && (
        <ConfirmModal
          title="Ta bort bilden?"
          body="Bilden tas bort från leveransen och Storage. Detta går inte att ångra."
          onConfirm={performDelete}
          onCancel={() => setConfirmRow(null)}
          busy={busy}
        />
      )}
    </div>
  )
}
