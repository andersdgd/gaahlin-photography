// Gaahlin Photography — admin/AdminApp.jsx
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
  { id: 'kontakter', label: 'Kontakter' },
  { id: 'bilder', label: 'Bilder & gallerier' },
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
        {section === 'bilder' && <GalleryManager />}
        {section === 'kunder' && <ClientManager />}
      </main>
    </div>
  )
}

/* ---------------- Kontakter ---------------- */

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
  const saveEdit = async (g) => {
    const t = editTitle.trim()
    if (!t || busy) return
    setBusy(true); setError('')
    const { error } = await supabase.from('galleries').update({ title: t }).eq('id', g.id)
    setBusy(false)
    if (error) { setError(error.message); return }
    setGalleries((gs) => gs.map((x) => (x.id === g.id ? { ...x, title: t } : x)))
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
