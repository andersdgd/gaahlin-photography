// Gaahlin Photography — admin/AdminApp.jsx
// v0.8.0 — B06/B07: galleri-CMS mot Supabase Storage + DB.
//   • Gallerier (gaahlin.galleries): skapa, döp om, ordna, publik/dold, radera.
//   • Bilder per galleri (gaahlin.images): ladda upp till bucket 'gaahlin-public',
//     ordna, publik/dold, radera. Mått (width/height) läses vid uppladdning.
//     Radering städar även Storage-objektet → inga föräldralösa filer.
//   v0.6.1: admin-koll utanför onAuthStateChange-låset (token-säker roles-läsning).
//   v0.6.2: okontrollerat login-fält + ref (Safari-autofyll), knapp-feedback.
//
// Bilder lever i Storage, inte i repot — adminet är källan, sajten läser i runtime.

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const BUCKET = 'gaahlin-public'
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
}

const SECTIONS = [
  { id: 'kontakter', label: 'Kontakter' },
  { id: 'bilder', label: 'Bilder & gallerier' },
  { id: 'kunder', label: 'Kunder' },
  { id: 'leveranser', label: 'Leveranser' },
]

function arrowBtn(disabled) {
  return {
    background: 'none', border: '1px solid #2a2a2a', borderRadius: '4px',
    color: disabled ? '#444' : '#aaa', cursor: disabled ? 'default' : 'pointer',
    width: '30px', height: '24px', fontSize: '11px', lineHeight: 1, padding: 0,
  }
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
        {section === 'kunder' && <Placeholder title="Kunder" note="Lista, redigera och koppla leveranser sker här (klientsida). Att bjuda in nya kundkonton kräver serversidan — manuellt i dashboarden först, edge function sen." />}
        {section === 'leveranser' && <Placeholder title="Leveranser" note="Koppla bilder till kundkonton (gaahlin.deliveries) — nästa skiva." />}
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

  const renameGallery = async (g) => {
    const t = window.prompt('Nytt namn på galleriet:', g.title)
    if (t === null) return
    const trimmed = t.trim()
    if (!trimmed) return
    setBusy(true); setError('')
    const { error } = await supabase.from('galleries').update({ title: trimmed }).eq('id', g.id)
    setBusy(false)
    if (error) { setError(error.message); return }
    await load()
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

  const deleteGallery = async (g) => {
    if (!window.confirm(`Ta bort galleriet "${g.title}" och alla dess bilder? Detta går inte att ångra.`)) return
    setBusy(true); setError('')
    const imgs = await supabase.from('images').select('storage_path').eq('gallery_id', g.id)
    const keys = (imgs.data || []).map((i) => i.storage_path).filter(Boolean)
    if (keys.length) await supabase.storage.from(BUCKET).remove(keys)
    const del = await supabase.from('galleries').delete().eq('id', g.id)
    setBusy(false)
    if (del.error) { setError(del.error.message); return }
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
              <button style={{ ...ui.ghost, color: '#999' }} onClick={() => renameGallery(g)} disabled={busy}>Döp om</button>
              <button style={{ ...ui.ghost, color: '#c98a8a', borderColor: '#5a2e2e' }} onClick={() => deleteGallery(g)} disabled={busy}>Radera</button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button onClick={() => moveGallery(idx, -1)} disabled={busy || idx === 0} style={arrowBtn(busy || idx === 0)}>▲</button>
                <button onClick={() => moveGallery(idx, 1)} disabled={busy || idx === galleries.length - 1} style={arrowBtn(busy || idx === galleries.length - 1)}>▼</button>
              </div>
            </div>
          ))}
        </div>
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

  const remove = async (img) => {
    if (!window.confirm('Ta bort bilden?')) return
    setBusy(true); setError('')
    if (img.storage_path) await supabase.storage.from(BUCKET).remove([img.storage_path])
    const del = await supabase.from('images').delete().eq('id', img.id)
    setBusy(false)
    if (del.error) { setError(del.error.message); return }
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
              <button style={{ ...ui.ghost, color: '#c98a8a', borderColor: '#5a2e2e' }} onClick={() => remove(img)} disabled={busy}>Radera</button>
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

/* ---------------- Platshållare ---------------- */

function Placeholder({ title, note }) {
  return (
    <div>
      <h2 style={{ ...ui.serif, fontSize: '22px', margin: '0 0 4px', color: '#fff' }}>{title}</h2>
      <p style={{ ...ui.muted, fontSize: '14px', margin: '12px 0 0', maxWidth: '440px', lineHeight: 1.6 }}>{note}</p>
      <p style={{ color: '#555', fontSize: '12px', marginTop: '20px', letterSpacing: '0.08em' }}>KOMMER HÄRNÄST</p>
    </div>
  )
}
