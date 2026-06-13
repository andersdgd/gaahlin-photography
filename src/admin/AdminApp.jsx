// Gaahlin Photography — admin/AdminApp.jsx
// v0.6.0 — B06 skiva 1: admin-skalet.
//   1. Ingen session  → inloggning via magisk länk (Supabase Auth signInWithOtp).
//   2. Session, ej admin → meddelande + logga ut.
//   3. Session + admin  → skal med fyra sektioner i sidopanelen.
// Admin-check: läser egen rad i gaahlin.roles (RLS: roles_self_select).
// Kontakter läser gaahlin.contacts på riktigt (RLS: contacts_admin_select).
// Bilder/Kunder/Leveranser är förberedda platshållare för nästa skiva.

import { useEffect, useState } from 'react'
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
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [section, setSection] = useState('kontakter')

  useEffect(() => {
    if (!supabase) { setStatus('noconfig'); return }
    let active = true

    const resolve = async (sess) => {
      if (!active) return
      setSession(sess)
      if (!sess) { setStatus('anon'); return }
      const { data } = await supabase.from('roles').select('role').eq('user_id', sess.user.id).maybeSingle()
      if (!active) return
      setStatus(data && data.role === 'admin' ? 'admin' : 'notadmin')
    }

    supabase.auth.getSession().then(({ data }) => resolve(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => resolve(sess))
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  const sendLink = async () => {
    if (!email.trim()) return
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + '/admin' },
    })
    if (!error) setSent(true)
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
      {sent ? (
        <p style={ui.muted}>Kolla din mejl — en inloggningslänk är skickad till {email}.</p>
      ) : (
        <>
          <input
            style={ui.input}
            type="email"
            inputMode="email"
            placeholder="din e-post"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendLink()}
          />
          <button style={ui.btn} onClick={sendLink}>Skicka inloggningslänk</button>
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
        {section === 'bilder' && <Placeholder title="Bilder & gallerier" note="Ordning och publik/dold på galleribilder — nästa skiva. Uppladdning när Supabase Storage kopplas på (B07)." />}
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

function Placeholder({ title, note }) {
  return (
    <div>
      <h2 style={{ ...ui.serif, fontSize: '22px', margin: '0 0 4px', color: '#fff' }}>{title}</h2>
      <p style={{ ...ui.muted, fontSize: '14px', margin: '12px 0 0', maxWidth: '440px', lineHeight: 1.6 }}>{note}</p>
      <p style={{ color: '#555', fontSize: '12px', marginTop: '20px', letterSpacing: '0.08em' }}>KOMMER HÄRNÄST</p>
    </div>
  )
}
