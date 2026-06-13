// Gaahlin Photography — admin/AdminApp.jsx
// v0.7.0 — B06 skiva 2: Bilder & gallerier-admin (ordna + publik/dold mot gaahlin.images).
//   v0.6.2: inloggningsfältet okontrollerat + läses via ref (Safari-autofyll
//   uppdaterar inte React-state → knappen verkade död). Knapp-feedback + felmeddelande.
//   v0.6.1: admin-kollen körs inte inuti onAuthStateChange-låset
//   (gav token-lös/deadlockad roles-läsning efter magisk-länk → falsk "ej admin").
//   1. Ingen session  → inloggning via magisk länk (Supabase Auth signInWithOtp).
//   2. Session, ej admin → meddelande + logga ut.
//   3. Session + admin  → skal med fyra sektioner i sidopanelen.
// Admin-check: läser egen rad i gaahlin.roles (RLS: roles_self_select).
// Kontakter läser gaahlin.contacts på riktigt (RLS: contacts_admin_select).
// Bilder & gallerier är live (skiva 2); Kunder/Leveranser fortfarande platshållare.

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const ui = {
  page: { minHeight: '100vh', background: '#0a0a0a', color: '#e8e8e8', fontFamily: 'system-ui, sans-serif' },
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' },
  card: { width: '100%', maxWidth: '360px', textAlign: 'center' },
  serif: { fontFamily: 'Georgia, "Times New Roman", serif' },
  input: { width: '100%', padding: '12px 14px', background: '#141414', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', fontSize: '15px', marginBottom: '12px', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '12px 14px', background: '#fff', color: '#000', border: 'none', borderRadius: '6px', fontSize: '15px', cursor: 'pointer' },
  ghost: { background: 'none', border: '1px solid #2a2a2a', color: '#aaa', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' },
  muted: { color: '#888' },
}

const SECTIONS = [
  { id: 'kontakter', label: 'Kontakter' },
  { id: 'bilder', label: 'Bilder & gallerier' },
  { id: 'kunder', label: 'Kunder' },
  { id: 'leveranser', label: 'Leveranser' },
]

export default function AdminApp() {
  const [status, setStatus] = useState('loading') // loading | noconfig | anon | notadmin | admin
  const [session, setSession] = useState(undefined) // undefined = ej avgjort, null = utloggad, objekt = inloggad
  const [sentTo, setSentTo] = useState('')      // e-post vi skickat länk till (tom = ej skickat)
  const [sending, setSending] = useState(false)
  const [authErr, setAuthErr] = useState('')
  const emailRef = useRef(null)
  const [section, setSection] = useState('kontakter')

  // 1) Etablera sessionen. VIKTIGT: i onAuthStateChange-callbacken gör vi BARA
  //    setState — aldrig andra supabase-anrop. Callbacken körs i ett internt
  //    auth-lås (navigator.locks); ett dataanrop därinne (t.ex. .from('roles'))
  //    körs då utan token / kan deadlocka. Det var precis det som gjorde att
  //    admin-kollen föll igenom efter magisk-länk-inloggning fast DB:n sa admin.
  useEffect(() => {
    if (!supabase) { setStatus('noconfig'); return }
    let active = true
    supabase.auth.getSession().then(({ data }) => { if (active) setSession(data.session) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => { if (active) setSession(sess) })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  // 2) Kör admin-kollen UTANFÖR auth-låset, när sessionen ändras. Som vanlig
  //    React-effekt körs detta efter render, då låset redan släppts → .from()
  //    får med din inloggade token → RLS släpper fram din rad i gaahlin.roles.
  useEffect(() => {
    if (!supabase) return
    if (session === undefined) return            // väntar fortfarande på getSession
    if (session === null) { setStatus('anon'); return }
    let active = true
    supabase.from('roles').select('role').eq('user_id', session.user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) { console.error('[admin] roles-koll misslyckades:', error); setStatus('notadmin'); return }
        setStatus(data && data.role === 'admin' ? 'admin' : 'notadmin')
      })
    return () => { active = false }
  }, [session])

  const sendLink = async () => {
    if (sending) return
    // Läs värdet direkt från fältet. Safari-autofyll uppdaterar inte alltid
    // React-state, så ett kontrollerat value kan vara tomt fast fältet ser ifyllt
    // ut — därför okontrollerat fält + ref-läsning här.
    const value = (emailRef.current?.value || '').trim()
    if (!value) { setAuthErr('Fyll i din e-post.'); emailRef.current?.focus(); return }
    setSending(true)
    setAuthErr('')
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
          {authErr && <p style={{ color: '#e0a0a0', fontSize: '13px', margin: '12px 0 0' }}>{authErr}</p>}
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
        {section === 'bilder' && <Bilder />}
        {section === 'kunder' && <Placeholder title="Kunder" note="Lista, redigera och koppla leveranser sker här (klientsida). Att bjuda in nya kundkonton kräver serversidan — manuellt i dashboarden först, edge function sen." />}
        {section === 'leveranser' && <Placeholder title="Leveranser" note="Koppla bilder till kundkonton (gaahlin.deliveries) — nästa skiva." />}
      </main>
    </div>
  )
}

function Kontakter() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    supabase.from('contacts').select('*').order('created_at', { ascending: false }).then(({ data, error }) => {
      if (!active) return
      if (error) { setError(true); return }
      setRows(data || [])
    })
    return () => { active = false }
  }, [])

  return (
    <div>
      <h2 style={{ ...ui.serif, fontSize: '22px', margin: '0 0 4px', color: '#fff' }}>Kontakter</h2>
      <p style={{ ...ui.muted, fontSize: '13px', margin: '0 0 24px' }}>Inkomna meddelanden från kontaktformuläret.</p>
      {error && <p style={ui.muted}>Kunde inte hämta kontakter.</p>}
      {rows === null && !error && <p style={ui.muted}>Laddar…</p>}
      {rows && rows.length === 0 && <p style={ui.muted}>Inga meddelanden än.</p>}
      {rows && rows.map((r) => (
        <div key={r.id} style={{ borderBottom: '1px solid #1c1c1c', padding: '16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '6px' }}>
            <span style={{ fontWeight: 500 }}>{r.name}</span>
            <span style={{ ...ui.muted, fontSize: '12px', whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleString('sv-SE')}</span>
          </div>
          <a href={`mailto:${r.email}`} style={{ color: '#8ab4f8', fontSize: '13px', textDecoration: 'none' }}>{r.email}</a>
          <p style={{ margin: '8px 0 0', color: '#cfcfcf', fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{r.message}</p>
        </div>
      ))}
    </div>
  )
}

function arrowBtn(disabled) {
  return {
    background: 'none', border: '1px solid #2a2a2a', borderRadius: '4px',
    color: disabled ? '#444' : '#aaa', cursor: disabled ? 'default' : 'pointer',
    width: '28px', height: '22px', fontSize: '10px', lineHeight: 1, padding: 0,
  }
}

function Bilder() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    supabase.from('images').select('*').order('sort_order', { ascending: true }).then(({ data, error }) => {
      if (!active) return
      if (error) { setError(error.message); return }
      setRows(data || [])
    })
    return () => { active = false }
  }, [])

  // Toggla publik/dold — sparas direkt (RLS: images_admin_all).
  const togglePublic = async (img) => {
    if (busy) return
    setBusy(true); setError('')
    const { error } = await supabase.from('images').update({ is_public: !img.is_public }).eq('id', img.id)
    setBusy(false)
    if (error) { setError(error.message); return }
    setRows((rs) => rs.map((r) => (r.id === img.id ? { ...r, is_public: !r.is_public } : r)))
  }

  // Flytta upp/ner genom att byta sort_order med grannen (två uppdateringar).
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

  return (
    <div>
      <h2 style={{ ...ui.serif, fontSize: '22px', margin: '0 0 4px', color: '#fff' }}>Bilder &amp; gallerier</h2>
      <p style={{ ...ui.muted, fontSize: '13px', margin: '0 0 24px' }}>
        Ordna galleribilderna och styr vilka som visas publikt. Uppladdning kommer när Storage kopplas på (B07).
      </p>
      {error && <p style={{ color: '#e0a0a0', fontSize: '13px', margin: '0 0 16px' }}>{error}</p>}
      {rows === null && !error && <p style={ui.muted}>Laddar…</p>}
      {rows && rows.length === 0 && <p style={ui.muted}>Inga bilder än.</p>}
      {rows && rows.length > 0 && (
        <div style={{ maxWidth: '620px' }}>
          {rows.map((img, idx) => (
            <div key={img.id} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '10px', marginBottom: '8px',
              background: '#111', border: '1px solid #1c1c1c', borderRadius: '8px',
              opacity: img.is_public ? 1 : 0.55,
            }}>
              <img
                src={img.storage_path}
                alt={img.title || ''}
                style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '4px', background: '#000', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', color: '#eee' }}>{img.title || img.storage_path}</div>
                <div style={{ ...ui.muted, fontSize: '12px', wordBreak: 'break-all' }}>{img.storage_path}</div>
              </div>
              <button
                onClick={() => togglePublic(img)}
                disabled={busy}
                style={{
                  ...ui.ghost, minWidth: '78px',
                  color: img.is_public ? '#7ec699' : '#999',
                  borderColor: img.is_public ? '#2e5a3f' : '#2a2a2a',
                  cursor: busy ? 'default' : 'pointer',
                }}
              >
                {img.is_public ? 'Publik' : 'Dold'}
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button onClick={() => move(idx, -1)} disabled={busy || idx === 0} style={arrowBtn(busy || idx === 0)}>▲</button>
                <button onClick={() => move(idx, 1)} disabled={busy || idx === rows.length - 1} style={arrowBtn(busy || idx === rows.length - 1)}>▼</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Placeholder({ title, note }) {
  return (
    <div>
      <h2 style={{ ...ui.serif, fontSize: '22px', margin: '0 0 4px', color: '#fff' }}>{title}</h2>
      <p style={{ ...ui.muted, fontSize: '14px', margin: '12px 0 0', maxWidth: '440px', lineHeight: 1.6 }}>{note}</p>
      <p style={{ color: '#555', fontSize: '12px', marginTop: '20px', letterSpacing: '0.08em' }}>KOMMER HÄRNÄST</p>
    </div>
  )
}
