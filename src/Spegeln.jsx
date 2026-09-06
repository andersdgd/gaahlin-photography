// Gaahlin Photography — Spegeln.jsx (prototyp)
// v0.1.0 — Arc 8. "Se dig själv i Gaahlins ljus." Webbkameran visas genom mörkrummets shader
//   (src/lib/darkroom.js): svartvitt med Gaahlin-kurvan, en hård spot i mörker som besökaren själv
//   flyttar (markör, finger eller lutning), korn. Tryck → bilden fryses → framkallas i tråget →
//   kan sparas (JPEG) eller leda till /boka. Allt sker i besökarens webbläsare: inget skickas,
//   inget lagras, kameran stängs när sidan lämnas. Ingen ansiktsdetektion i v0.1 — ljuset är
//   fotometriskt (spot + kurva), inte geometriskt; det kommer i v0.2 (face mesh → relight).
//   Felgräns visar körfel som text. Nativ fallback finns inte här: utan WebGL visas ett meddelande.

import { Component, useEffect, useRef, useState } from 'react'
import { createDarkroom, containRect } from './lib/darkroom'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const DEV_MS = 3200
const PAPER_MS = 320

class Boundary extends Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  render() {
    if (this.state.err) {
      const e = this.state.err
      return (
        <div style={{ position: 'fixed', inset: 0, background: '#000', color: '#fff', padding: '2rem', fontFamily: 'Menlo, monospace', fontSize: 14, lineHeight: 1.6, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
          <div>Spegeln kraschade i webbläsaren. Skicka den här texten till Claude:</div>
          <div style={{ marginTop: '1rem' }}>{String(e?.message || e)}</div>
          <div style={{ marginTop: '1rem', opacity: .6 }}>{String(e?.stack || '')}</div>
        </div>
      )
    }
    return this.props.children
  }
}

const css = `
.sp-root{position:fixed;inset:0;background:#000;color:#fff;overflow:hidden;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.sp-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.sp-video{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.sp-ui{position:absolute;inset:0;z-index:3;pointer-events:none}
.sp-ui a,.sp-ui button{pointer-events:auto}
.sp-corner{position:absolute;font-size:8px;letter-spacing:.4em;text-transform:uppercase;color:rgba(255,255,255,.35);line-height:2}
.sp-tl{top:calc(1.4rem + env(safe-area-inset-top));left:calc(1.6rem + env(safe-area-inset-left))}
.sp-tl .sp-logo{font-family:'Cormorant Garamond',serif;font-size:13px;letter-spacing:.25em;color:#fff;text-decoration:none;display:block}
.sp-tr{top:calc(1.4rem + env(safe-area-inset-top));right:calc(1.6rem + env(safe-area-inset-right));text-align:right}
.sp-tr a{color:rgba(255,255,255,.35);text-decoration:none;transition:color .3s;display:block}
.sp-tr a:hover,.sp-tr a:focus-visible{color:#fff;outline:none}
.sp-intro{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 1.5rem;pointer-events:auto}
.sp-intro h1{font-family:'Cormorant Garamond',serif;font-weight:300;letter-spacing:.18em;text-transform:uppercase;line-height:1.1;margin:0;font-size:clamp(2.2rem,6vw,5rem);color:rgba(255,255,255,.82)}
.sp-intro p{margin:1.6rem 0 0;max-width:34rem;font-size:12px;letter-spacing:.06em;line-height:1.9;color:rgba(255,255,255,.55)}
.sp-intro small{display:block;margin-top:1.2rem;font-size:8px;letter-spacing:.4em;text-transform:uppercase;color:rgba(255,255,255,.3)}
.sp-btn{display:inline-block;margin-top:2.4rem;padding:.9rem 1.8rem;border:1px solid rgba(255,255,255,.35);background:none;color:#fff;font:inherit;font-size:8px;letter-spacing:.5em;text-transform:uppercase;cursor:pointer;transition:border-color .3s,background .3s;text-decoration:none}
.sp-btn:hover,.sp-btn:focus-visible{border-color:#fff;outline:none;background:rgba(255,255,255,.06)}
.sp-btn[disabled]{opacity:.35;cursor:default}
.sp-bar{position:absolute;left:0;right:0;bottom:calc(1.6rem + env(safe-area-inset-bottom));display:flex;justify-content:center;gap:1.2rem;flex-wrap:wrap;padding:0 1rem}
.sp-bar .sp-btn{margin-top:0;background:rgba(0,0,0,.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.sp-hint{position:absolute;left:50%;bottom:calc(5.4rem + env(safe-area-inset-bottom));transform:translateX(-50%);font-size:8px;letter-spacing:.5em;text-transform:uppercase;color:rgba(255,255,255,.35);white-space:nowrap;text-align:center}
.sp-err{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:2rem;font-size:11px;letter-spacing:.1em;line-height:2;color:rgba(255,255,255,.55);pointer-events:auto}
.sp-err a{color:#fff}
`

export default function Spegeln() {
  return <Boundary><Mirror /></Boundary>
}

function Mirror() {
  const [phase, setPhase] = useState('intro')   // intro | starting | live | developing | done | error
  const [err, setErr] = useState('')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const dr = useRef(null)
  const tex = useRef(null)
  const frozen = useRef(null)     // 2D-canvas med den frysta bildrutan
  const stream = useRef(null)
  const lamp = useRef({ x: 0.5, y: 0.42, tx: 0.5, ty: 0.42, lastMove: 0 })
  const devSince = useRef(0)
  const phaseRef = useRef('intro')
  const reduced = useRef(false)
  useEffect(() => { phaseRef.current = phase }, [phase])

  useEffect(() => {
    reduced.current = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const prev = document.title; document.title = 'Gaahlin — Spegeln'
    return () => { document.title = prev }
  }, [])

  // Mörkrummet
  useEffect(() => {
    if (!canvasRef.current) return
    try {
      const d = createDarkroom(canvasRef.current, { preserve: true })
      if (!d) { setErr('Din webbläsare saknar WebGL, som Spegeln behöver.'); setPhase('error'); return }
      dr.current = d
    } catch (e) { setErr('Mörkrummet kunde inte startas: ' + (e.message || e)); setPhase('error'); return }
    const size = () => {
      const W = window.innerWidth, H = window.innerHeight
      const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(8e6 / Math.max(1, W * H)))
      dr.current.resize(W, H, ratio)
    }
    size(); window.addEventListener('resize', size)
    return () => { window.removeEventListener('resize', size); dr.current?.dispose(); dr.current = null }
  }, [])

  // Lampan
  useEffect(() => {
    const move = (x, y) => { const l = lamp.current; l.tx = clamp(x / window.innerWidth, 0, 1); l.ty = clamp(y / window.innerHeight, 0, 1); l.lastMove = performance.now() }
    const onPointer = (e) => move(e.clientX, e.clientY)
    const onTouch = (e) => { if (e.touches[0]) move(e.touches[0].clientX, e.touches[0].clientY) }
    const onTilt = (e) => { if (e.gamma == null || e.beta == null) return; move(window.innerWidth * (0.5 + clamp(e.gamma / 40, -1, 1) * 0.4), window.innerHeight * (0.42 + clamp((e.beta - 40) / 40, -1, 1) * 0.3)) }
    const askTilt = () => { const D = window.DeviceOrientationEvent; if (D && typeof D.requestPermission === 'function') D.requestPermission().catch(() => {}); window.removeEventListener('touchstart', askTilt) }
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchstart', askTilt, { passive: true })
    window.addEventListener('deviceorientation', onTilt)
    return () => { window.removeEventListener('pointermove', onPointer); window.removeEventListener('touchmove', onTouch); window.removeEventListener('touchstart', askTilt); window.removeEventListener('deviceorientation', onTilt) }
  }, [])

  // Kameran
  const start = async () => {
    setPhase('starting')
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Kameran stöds inte i den här webbläsaren.')
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      stream.current = s
      const v = videoRef.current
      v.srcObject = s
      await v.play()
      tex.current = tex.current || dr.current.texture()
      setPhase('live')
    } catch (e) {
      setErr(e?.name === 'NotAllowedError' ? 'Du sa nej till kameran. Det är helt okej — inget händer utan ditt ja.' : 'Kameran gick inte att starta: ' + (e?.message || e))
      setPhase('error')
    }
  }
  const stop = () => { try { stream.current?.getTracks().forEach((t) => t.stop()) } catch (e) { /* tyst */ } stream.current = null }
  useEffect(() => stop, [])

  // Ta bilden: frys rutan i ett 2D-canvas och framkalla den
  const capture = () => {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const c = frozen.current || document.createElement('canvas')
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d').drawImage(v, 0, 0)
    frozen.current = c
    tex.current.upload(c)
    devSince.current = performance.now()
    setPhase('developing')
    stop()
  }
  const again = () => { devSince.current = 0; start() }
  const save = () => {
    const d = dr.current, canvas = canvasRef.current
    if (!d || !tex.current?.ready) return
    // rita en gång till utan gränssnitt och spara exakt det som syns
    drawFrame(performance.now(), true)
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'gaahlin-spegeln.jpg'; document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    }, 'image/jpeg', 0.92)
  }

  const drawFrame = (now, still = false) => {
    const d = dr.current, t = tex.current
    if (!d || !t) return
    const ph = phaseRef.current
    const v = videoRef.current
    if (ph === 'live' && v && v.readyState >= 2) t.upload(v)
    if (!t.ready) return
    const l = lamp.current
    if (!still) {
      if (now - l.lastMove > 4000 || reduced.current) { const s = now / 1000; l.tx = 0.5 + 0.14 * Math.sin(s * 0.19); l.ty = 0.42 + 0.08 * Math.sin(s * 0.14 + 1.1) }
      l.x += (l.tx - l.x) * 0.08; l.y += (l.ty - l.y) * 0.08
    }
    const W = window.innerWidth, H = window.innerHeight
    const rect = containRect(t.w, t.h, W, H, 0.96, 0.9)
    const lampUv = [(l.x * W - rect.x) / rect.w, (l.y * H - rect.y) / rect.h]
    const dev = ph === 'live' ? 1 : (devSince.current ? clamp((now - devSince.current) / DEV_MS, 0, 1) : 1)
    const paperIn = ph === 'live' ? 1 : (devSince.current ? clamp((now - devSince.current) / PAPER_MS, 0, 1) : 1)
    d.clear()
    d.drawPrint(t, rect, { dev, paperIn, lamp: lampUv, lampPower: 1, spot: ph === 'live' ? 1 : 0.85, curve: 1, mirror: 1, grain: ph === 'live' ? 0.05 : 0.04, time: now / 1000, alpha: 1 })
    if (ph === 'developing' && dev >= 1) setPhase('done')
  }

  // Ritloopen
  useEffect(() => {
    let raf = 0, running = true
    const tick = () => { if (!running) return; raf = requestAnimationFrame(tick); drawFrame(performance.now()) }
    raf = requestAnimationFrame(tick)
    return () => { running = false; cancelAnimationFrame(raf) }
  }, [])

  return (
    <div className="sp-root">
      <style>{css}</style>
      <canvas className="sp-canvas" ref={canvasRef} aria-hidden="true" />
      <video className="sp-video" ref={videoRef} playsInline muted autoPlay />
      <div className="sp-ui">
        <div className="sp-corner sp-tl">
          <a className="sp-logo" href="/">Gaahlin</a>
          <span>Spegeln, prototyp 0.1</span>
        </div>
        <div className="sp-corner sp-tr">
          <a href="/obscura">Obscura</a>
          <a href="/">Stäng</a>
        </div>

        {(phase === 'intro' || phase === 'starting') && (
          <div className="sp-intro">
            <h1>Spegeln</h1>
            <p>Se dig själv i Gaahlins ljus. Du håller lampan: flytta den med musen, fingret eller genom att luta telefonen. När ljuset sitter, ta bilden och se den framkallas.</p>
            <small>Kameran stannar i din webbläsare. Inget skickas, inget sparas.</small>
            <button type="button" className="sp-btn" onClick={start} disabled={phase === 'starting'}>{phase === 'starting' ? 'Startar kameran' : 'Slå på kameran'}</button>
          </div>
        )}

        {phase === 'live' && (
          <>
            <div className="sp-hint">Flytta lampan. Tryck när ljuset sitter.</div>
            <div className="sp-bar"><button type="button" className="sp-btn" onClick={capture}>Ta bilden</button></div>
          </>
        )}

        {phase === 'developing' && <div className="sp-hint">Framkallas</div>}

        {phase === 'done' && (
          <div className="sp-bar">
            <button type="button" className="sp-btn" onClick={save}>Spara</button>
            <a className="sp-btn" href="/boka">Boka en riktig</a>
            <button type="button" className="sp-btn" onClick={again}>Igen</button>
          </div>
        )}

        {phase === 'error' && (
          <div className="sp-err"><div>{err}<br /><a href="/obscura">Till Obscura</a></div></div>
        )}
      </div>
    </div>
  )
}
