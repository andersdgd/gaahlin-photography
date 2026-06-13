FILE: src/BookingPage.jsx
// Gaahlin Photography — BookingPage.jsx (publik bokningsförfrågan, /boka)
// v0.1.0 — Arc 5: besökaren skickar en bokningsförfrågan (typ, önskat datum,
//   detaljer) → insert i gaahlin.bookings (RLS tillåter anon insert). Landar i
//   adminet under Bokningar. Ingen kalender/betalning — ren förfrågan.
//   Svenskspråkig v1 (kan i18n:as senare som resten av sajten).

import { useRef, useState } from 'react'
import { supabase } from './lib/supabase'

const SHOOT_TYPES = ['Porträtt', 'Familj', 'Par', 'Bröllop', 'Event', 'Företag / headshots', 'Annat']

const serif = "'Cormorant Garamond', Georgia, 'Times New Roman', serif"

const ui = {
  page: { minHeight: '100vh', background: '#000', color: '#fff', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", WebkitFontSmoothing: 'antialiased' },
  wrap: { maxWidth: '620px', margin: '0 auto', padding: 'clamp(2rem, 6vw, 5rem) 1.5rem 6rem' },
  back: { fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', textDecoration: 'none' },
  label: { display: 'block', fontSize: '8px', letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', padding: '1.4rem 0 .5rem' },
  field: { width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,.12)', outline: 'none', color: '#fff', fontFamily: 'inherit', fontSize: '14px', letterSpacing: '0.06em', padding: '0 0 1rem', WebkitAppearance: 'none', borderRadius: 0 },
}

export default function BookingPage() {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const f = {
    name: useRef(null), email: useRef(null), phone: useRef(null),
    shoot: useRef(null), date: useRef(null), message: useRef(null),
  }

  const submit = async () => {
    if (busy) return
    if (!supabase) { setError('Sidan är inte konfigurerad ännu.'); return }
    const name = (f.name.current?.value || '').trim()
    const email = (f.email.current?.value || '').trim()
    if (!name || !email) { setError('Fyll i namn och e-post.'); return }
    setBusy(true); setError('')
    const { error } = await supabase.from('bookings').insert({
      name,
      email,
      phone: (f.phone.current?.value || '').trim() || null,
      shoot_type: f.shoot.current?.value || null,
      preferred_date: f.date.current?.value || null,
      message: (f.message.current?.value || '').trim() || null,
    })
    setBusy(false)
    if (error) { setError('Något gick fel — försök igen.'); return }
    setDone(true)
  }

  return (
    <div style={ui.page}>
      <div style={ui.wrap}>
        <a href="/" style={ui.back}>← Gaahlin Photography</a>

        {done ? (
          <div style={{ paddingTop: 'clamp(3rem, 12vw, 7rem)' }}>
            <h1 style={{ fontFamily: serif, fontWeight: 300, fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: '0.04em', margin: '0 0 1rem' }}>
              Tack.
            </h1>
            <p style={{ fontSize: '13px', letterSpacing: '0.1em', lineHeight: 2, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', maxWidth: '420px' }}>
              Din förfrågan är skickad. Jag återkommer så snart jag kan.
            </p>
            <a href="/" style={{ ...ui.back, display: 'inline-block', marginTop: '2.5rem' }}>← Tillbaka till sajten</a>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: serif, fontWeight: 300, fontSize: 'clamp(2.2rem, 5.5vw, 3.4rem)', letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1.05, margin: 'clamp(2.5rem, 8vw, 4.5rem) 0 1.2rem' }}>
              Boka en<br />fotografering
            </h1>
            <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', lineHeight: 2.2, margin: '0 0 2.5rem', maxWidth: '440px' }}>
              Berätta kort vad du söker, så hör jag av mig med upplägg och tillgänglighet.
            </p>

            <div>
              <label style={ui.label}>Namn</label>
              <input ref={f.name} style={ui.field} type="text" autoComplete="name" />

              <label style={ui.label}>E-post</label>
              <input ref={f.email} style={ui.field} type="email" inputMode="email" autoComplete="email" />

              <label style={ui.label}>Telefon (valfritt)</label>
              <input ref={f.phone} style={ui.field} type="tel" inputMode="tel" autoComplete="tel" />

              <label style={ui.label}>Typ av fotografering</label>
              <select ref={f.shoot} style={{ ...ui.field, color: '#fff' }} defaultValue={SHOOT_TYPES[0]}>
                {SHOOT_TYPES.map((s) => (
                  <option key={s} value={s} style={{ background: '#111', color: '#fff' }}>{s}</option>
                ))}
              </select>

              <label style={ui.label}>Önskat datum (valfritt)</label>
              <input ref={f.date} style={{ ...ui.field, colorScheme: 'dark' }} type="date" />

              <label style={ui.label}>Meddelande</label>
              <textarea ref={f.message} style={{ ...ui.field, minHeight: '110px', resize: 'none' }} />

              <button
                onClick={submit}
                disabled={busy}
                style={{
                  marginTop: '2.5rem', background: '#fff', color: '#000', border: 'none',
                  padding: '15px 28px', fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase',
                  cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
                }}
              >
                {busy ? 'Skickar…' : 'Skicka förfrågan'}
              </button>
              {error && <p style={{ color: '#e0a0a0', fontSize: '12px', letterSpacing: '0.08em', margin: '1.2rem 0 0' }}>{error}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
