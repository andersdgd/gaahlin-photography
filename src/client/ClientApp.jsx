// Gaahlin Photography — client/ClientApp.jsx
// v0.2.0 — Arc 6: kund-inlogg-härdning.
//   • shouldCreateUser: false på OTP-anropet — /kund skapar aldrig nya auth-användare;
//     bara adresser som redan bjudits in via adminet (edge fn invite-client) får länk.
//   • Utgången/ogiltig länk (Supabase lägger ?error=/#error= i URL:en) fångas upp och
//     förklaras; kunden erbjuds att begära en ny länk direkt.
//   • Svenska, handlingsbara fel: "Signups not allowed" → adressen saknar konto;
//     rate limit (429) → vänta och försök igen. "Skicka igen"/"annan e-post" efter utskick.
// v0.1.0 — Arc 3 / B08 skiva 3c: kundens egen vy på /kund.
//   Magisk länk-inloggning → gate (inloggad OCH har en kund-rad i gaahlin.clients)
//   → visar kundens egna leveranser i rutnät, med lightbox + nedladdning.
//   Kunden ser BARA sina egna filer (RLS: clients_self_select, deliveries_client_select,
//   + storage-policy på <kund-uid>/-mappen). Inbjudningslänken från adminet landar här:
//   tokens i URL:en konsumeras automatiskt → kunden hamnar direkt i kundvyn.
//
// Samma auth-mönster som adminet: i onAuthStateChange-callbacken görs BARA setState
// (callbacken körs i ett auth-lås); alla supabase-anrop ligger i separata effekter.

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const DELIVERIES = 'gaahlin-deliveries'

// === Arc 6: utgången/ogiltig länk ===
// Supabase skickar tillbaka fel som query- eller hash-parametrar, t.ex.
// #error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
function readLinkError() {
  const parse = (str) => new URLSearchParams(str.replace(/^[#?]/, ''))
  const h = parse(window.location.hash)
  const q = parse(window.location.search)
  const code = h.get('error_code') || q.get('error_code')
  const err = h.get('error') || q.get('error')
  if (!code && !err) return null
  return code || err
}

function clearLinkError() {
  try { window.history.replaceState(null, '', window.location.pathname) } catch { /* ignorera */ }
}

function linkErrorText(code) {
  switch (code) {
    case 'otp_expired':
      return 'Inloggningslänken har gått ut. Länkar är giltiga en begränsad tid och kan bara användas en gång.'
    case 'access_denied':
      return 'Inloggningslänken är ogiltig eller redan använd.'
    default:
      return 'Inloggningslänken gick inte att använda.'
  }
}

// Översätt Supabase-auth-fel till begripliga, handlingsbara meddelanden.
function authErrorText(error) {
  const msg = (error?.message || '').toLowerCase()
  const status = error?.status
  if (status === 429 || msg.includes('rate limit') || msg.includes('too many'))
    return 'För många försök just nu. Vänta en stund och försök igen.'
  if (msg.includes('signups not allowed') || msg.includes('signup'))
    return 'Den här e-postadressen har inget kundkonto hos oss. Kontrollera adressen — eller hör av dig om du väntar på bilder.'
  if (msg.includes('invalid') && msg.includes('email'))
    return 'Det ser inte ut som en giltig e-postadress.'
  return error?.message || 'Något gick fel. Försök igen.'
}

const ui = {
  page: { minHeight: '100vh', background: '#0a0a0a', color: '#e8e8e8', fontFamily: 'system-ui, sans-serif' },
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' },
  card: { width: '100%', maxWidth: '380px', textAlign: 'center' },
  serif: { fontFamily: 'Georgia, "Times New Roman", serif' },
  input: { width: '100%', padding: '13px 15px', background: '#141414', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', fontSize: '15px', marginBottom: '12px', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '13px 15px', background: '#fff', color: '#000', border: 'none', borderRadius: '6px', fontSize: '15px', cursor: 'pointer' },
  ghost: { background: 'none', border: '1px solid #2a2a2a', color: '#aaa', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' },
  muted: { color: '#888' },
  err: { color: '#e0a0a0', fontSize: '13px' },
  notice: { color: '#d8d8d8', fontSize: '14px', lineHeight: 1.6, textAlign: 'left', padding: '12px 14px', border: '1px solid #2a2a2a', borderRadius: '6px', background: '#121212' },
  link: { background: 'none', border: 'none', padding: 0, color: '#ccc', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' },
}

export default function ClientApp() {
  const [status, setStatus] = useState('loading')  // loading | noconfig | anon | noaccess | client
  const [session, setSession] = useState(undefined) // undefined = ej avgjort, null = utloggad, objekt = inloggad
  const [client, setClient] = useState(null)
  const [sentTo, setSentTo] = useState('')
  const [sending, setSending] = useState(false)
  const [authErr, setAuthErr] = useState('')
  const [linkErr, setLinkErr] = useState(() => readLinkError())  // fel från utgången/ogiltig länk i URL:en
  const emailRef = useRef(null)

  const [rows, setRows] = useState(null)
  const [signed, setSigned] = useState({})
  const [delivErr, setDelivErr] = useState('')
  const [lightbox, setLightbox] = useState(null)   // index eller null

  // 0) Städa bort felparametrar ur URL:en (de är redan lästa in i state).
  useEffect(() => { if (linkErr) clearLinkError() }, [linkErr])

  // 1) Etablera sessionen (callbacken gör bara setState).
  useEffect(() => {
    if (!supabase) { setStatus('noconfig'); return }
    let active = true
    supabase.auth.getSession().then(({ data }) => { if (active) setSession(data.session) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => { if (active) setSession(sess) })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  // 2) Gate: har den inloggade en kund-rad? (RLS clients_self_select)
  useEffect(() => {
    if (!supabase) return
    if (session === undefined) return
    if (session === null) { setStatus('anon'); setClient(null); return }
    let active = true
    supabase.from('clients').select('*').eq('user_id', session.user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error || !data) { setStatus('noaccess'); return }
        setClient(data)
        setStatus('client')
      })
    return () => { active = false }
  }, [session])

  // 3) Ladda kundens leveranser + signera miniatyrerna (privat bucket).
  useEffect(() => {
    if (status !== 'client' || !session) return
    let active = true
    const load = async () => {
      const { data, error } = await supabase
        .from('deliveries').select('*').eq('client_id', session.user.id).order('sort_order')
      if (!active) return
      if (error) { setDelivErr(error.message); setRows([]); return }
      setRows(data || [])
      const keys = (data || []).map((r) => r.storage_path).filter(Boolean)
      if (keys.length) {
        const { data: urls } = await supabase.storage.from(DELIVERIES).createSignedUrls(keys, 3600)
        if (!active) return
        const map = {}
        for (const u of urls || []) if (u.signedUrl) map[u.path] = u.signedUrl
        setSigned(map)
      }
    }
    load()
    return () => { active = false }
  }, [status, session])

  // Tangentbordsnavigering i lightboxen.
  useEffect(() => {
    if (lightbox === null || !rows) return
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(null)
      else if (e.key === 'ArrowRight') setLightbox((i) => (i === null ? i : (i + 1) % rows.length))
      else if (e.key === 'ArrowLeft') setLightbox((i) => (i === null ? i : (i - 1 + rows.length) % rows.length))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, rows])

  const sendLink = async () => {
    if (sending) return
    const value = (emailRef.current?.value || '').trim()
    if (!value) { setAuthErr('Fyll i din e-post.'); emailRef.current?.focus(); return }
    setSending(true); setAuthErr('')
    const { error } = await supabase.auth.signInWithOtp({
      email: value,
      options: {
        emailRedirectTo: window.location.origin + '/kund',
        shouldCreateUser: false,   // Arc 6: /kund skapar aldrig konton — bara inbjudna kunder
      },
    })
    setSending(false)
    if (error) { setAuthErr(authErrorText(error)); return }
    setLinkErr(null)
    setSentTo(value)
  }

  // "Skicka igen" / "annan e-post": tillbaka till formuläret med adressen förifylld.
  const resetSend = () => { setSentTo(''); setAuthErr('') }

  const logout = () => supabase.auth.signOut()

  // Nedladdning: färsk signed URL med Content-Disposition: attachment.
  const download = async (row) => {
    const ext = (row.storage_path.split('.').pop() || 'jpg')
    const base = (row.title || 'bild').replace(/[^\w-]+/g, '_')
    const filename = `${base}.${ext}`
    const { data, error } = await supabase.storage.from(DELIVERIES)
      .createSignedUrl(row.storage_path, 120, { download: filename })
    if (error || !data?.signedUrl) return
    const a = document.createElement('a')
    a.href = data.signedUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  // ---------- render ----------
  if (status === 'loading') {
    return <div style={ui.page}><div style={ui.center}><p style={ui.muted}>Laddar…</p></div></div>
  }

  if (status === 'noconfig') {
    return <div style={ui.page}><div style={ui.center}><div style={ui.card}>
      <p style={ui.muted}>Sidan är inte konfigurerad ännu.</p>
    </div></div></div>
  }

  if (status === 'anon') {
    return <div style={ui.page}><div style={ui.center}><div style={ui.card}>
      <h1 style={{ ...ui.serif, fontSize: '30px', margin: '0 0 6px' }}>Gaahlin</h1>
      <p style={{ ...ui.muted, margin: '0 0 28px', letterSpacing: '0.12em', fontSize: '12px' }}>DINA BILDER</p>
      {sentTo ? (
        <>
          <p style={{ ...ui.muted, fontSize: '14px', lineHeight: 1.6, margin: '0 0 20px' }}>
            Kolla din mejl — en inloggningslänk är skickad till {sentTo}. Länken fungerar en gång och en begränsad tid.
          </p>
          <p style={{ ...ui.muted, fontSize: '13px', margin: 0 }}>
            Inget mejl? Titta i skräpposten, eller{' '}
            <button style={ui.link} onClick={resetSend}>skicka igen</button>.
          </p>
        </>
      ) : (
        <>
          {linkErr && (
            <p style={{ ...ui.notice, margin: '0 0 20px' }}>
              {linkErrorText(linkErr)} Ange din e-post nedan så skickar vi en ny.
            </p>
          )}
          <p style={{ ...ui.muted, fontSize: '14px', margin: '0 0 20px', lineHeight: 1.6 }}>
            {linkErr ? 'Begär en ny inloggningslänk.' : 'Ange din e-post så skickar vi en inloggningslänk.'}
          </p>
          <input
            ref={emailRef}
            style={ui.input}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="din e-post"
            defaultValue={sentTo}
            onKeyDown={(e) => e.key === 'Enter' && sendLink()}
          />
          <button
            style={{ ...ui.btn, opacity: sending ? 0.6 : 1, cursor: sending ? 'default' : 'pointer' }}
            onClick={sendLink}
            disabled={sending}
          >
            {sending ? 'Skickar…' : (linkErr ? 'Skicka ny inloggningslänk' : 'Skicka inloggningslänk')}
          </button>
          {authErr && <p style={{ ...ui.err, margin: '12px 0 0' }}>{authErr}</p>}
        </>
      )}
    </div></div></div>
  }

  if (status === 'noaccess') {
    return <div style={ui.page}><div style={ui.center}><div style={ui.card}>
      <h1 style={{ ...ui.serif, fontSize: '26px', margin: '0 0 12px' }}>Inga bilder här</h1>
      <p style={{ ...ui.muted, fontSize: '14px', lineHeight: 1.6, margin: '0 0 20px' }}>
        Kontot {session?.user?.email} har inga leveranser. Är du inloggad med rätt e-postadress?
      </p>
      <button style={ui.ghost} onClick={logout}>Logga ut</button>
    </div></div></div>
  }

  // status === 'client'
  return (
    <div style={ui.page}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #161616' }}>
        <span style={{ ...ui.serif, fontSize: '22px' }}>Gaahlin</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ ...ui.muted, fontSize: '13px' }}>{client?.display_name || client?.email}</span>
          <button style={ui.ghost} onClick={logout}>Logga ut</button>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ ...ui.serif, fontSize: '28px', margin: '0 0 6px', color: '#fff' }}>Dina bilder</h1>
        <p style={{ ...ui.muted, fontSize: '14px', margin: '0 0 32px' }}>
          {rows && rows.length > 0
            ? `${rows.length} bild${rows.length === 1 ? '' : 'er'} · klicka för att se stort eller ladda ner`
            : ''}
        </p>

        {delivErr && <p style={ui.err}>{delivErr}</p>}
        {rows === null && !delivErr && <p style={ui.muted}>Laddar…</p>}
        {rows && rows.length === 0 && <p style={ui.muted}>Inga bilder levererade ännu.</p>}

        {rows && rows.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
            {rows.map((row, idx) => (
              <button
                key={row.id}
                onClick={() => setLightbox(idx)}
                style={{ padding: 0, border: 'none', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', background: '#111', aspectRatio: '1 / 1' }}
              >
                {signed[row.storage_path] ? (
                  <img src={signed[row.storage_path]} alt={row.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%' }} />
                )}
              </button>
            ))}
          </div>
        )}
      </main>

      {lightbox !== null && rows && rows[lightbox] && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setLightbox(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.94)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
            <span style={{ ...ui.muted, fontSize: '13px' }}>
              {(rows[lightbox].title || 'Namnlös')} · {lightbox + 1} / {rows.length}
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={ui.ghost} onClick={() => download(rows[lightbox])}>Ladda ner</button>
              <button style={ui.ghost} onClick={() => setLightbox(null)}>Stäng ✕</button>
            </div>
          </div>
          <div
            onClick={(e) => { if (e.target === e.currentTarget) setLightbox(null) }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px 24px', position: 'relative' }}
          >
            {rows.length > 1 && (
              <button onClick={() => setLightbox((i) => (i - 1 + rows.length) % rows.length)} style={navArrow('left')}>‹</button>
            )}
            <img
              src={signed[rows[lightbox].storage_path]}
              alt={rows[lightbox].title || ''}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', userSelect: 'none' }}
            />
            {rows.length > 1 && (
              <button onClick={() => setLightbox((i) => (i + 1) % rows.length)} style={navArrow('right')}>›</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function navArrow(side) {
  return {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)', [side]: '8px',
    background: 'rgba(0,0,0,0.4)', border: '1px solid #2a2a2a', color: '#fff',
    width: '44px', height: '44px', borderRadius: '50%', fontSize: '22px', lineHeight: 1,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}
