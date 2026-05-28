// Gaahlin Photography — App.jsx
// v0.3.0 — B02 leverans 2: portering av nav + hero + statement.
// Aktiverar global CSS (./index.css). Behåller exakt utseende från ursprungs-index.html.
// Inkluderar: scroll-styrd nav, hero-parallax/fade, reveal-animationer, page fade-in,
// hamburger + mobilmeny. Exkluderar (kommer senare): i18n/språkväxlare, lightbox, formulär,
// gallery, featured, about, contact, footer.

import { useEffect, useRef, useState } from 'react'
import './index.css'

export default function App() {
  const [loaded, setLoaded] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const heroImgRef = useRef(null)
  const heroSectionRef = useRef(null)

  // Initial mount: scroll till topp, sen mjuk fade-in av sidan
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const t = setTimeout(() => setLoaded(true), 100)
    return () => clearTimeout(t)
  }, [])

  // Scroll: nav.scrolled + hero parallax/opacity (samma kurvor som ursprungs-JS)
  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        const h = heroSectionRef.current?.offsetHeight || 1
        const progress = Math.min(y / h, 1)
        const img = heroImgRef.current
        if (img) {
          if (window.innerWidth > 900) {
            img.style.transform = `scale(${1 - progress * 0.08}) translateY(${y * 0.15}px)`
          } else {
            img.style.transform = `scale(${1 - progress * 0.06})`
          }
          img.style.opacity = String(1 - progress * 0.85)
        }
        setScrolled(y > 50)
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Reveal-observer för .reveal-element (samma tröskel/marginal som ursprungs-JS)
  useEffect(() => {
    const ro = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            ro.unobserve(e.target)
          }
        })
      },
      { threshold: 0.05, rootMargin: '0px 0px -30px 0px' }
    )
    document.querySelectorAll('.reveal').forEach((el) => ro.observe(el))
    return () => ro.disconnect()
  }, [])

  // Mobil meny: lås body-scroll när menyn är öppen
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const closeMobile = () => setMobileOpen(false)

  return (
    <div id="page-wrap" className={loaded ? 'loaded' : ''}>
      <nav id="mainNav" className={scrolled ? 'scrolled' : ''}>
        <a href="#hero" className="nav-logo">Gaahlin</a>
        <ul className="nav-links">
          <li><a href="#gallery">Arbeten</a></li>
          <li><a href="#about">Om mig</a></li>
          <li><a href="#contact">Kontakt</a></li>
        </ul>
        <div className="nav-right">
          <button
            type="button"
            className={`hamburger ${mobileOpen ? 'open' : ''}`}
            aria-label="Meny"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>

      <div className={`mobile-menu ${mobileOpen ? 'open' : ''}`}>
        <a href="#gallery" className="menu-link" onClick={closeMobile}>Arbeten</a>
        <a href="#about" className="menu-link" onClick={closeMobile}>Om mig</a>
        <a href="#contact" className="menu-link" onClick={closeMobile}>Kontakt</a>
      </div>

      <section id="hero" ref={heroSectionRef}>
        <img
          ref={heroImgRef}
          className="hero-img"
          src="/images/me_bw.jpg"
          alt="Gaahlin Photography"
          fetchPriority="high"
          decoding="sync"
        />
        <div className="hero-overlay"></div>
        <div className="hero-bottom">
          <div className="hero-meta">
            <p>Porträtt</p>
            <p>Stockholm</p>
            <p>2026</p>
          </div>
        </div>
        <div className="hero-scroll">
          <span>Scrolla</span>
          <div className="scroll-arrow"></div>
        </div>
      </section>

      <section id="statement">
        <p className="section-label reveal">Manifest</p>
        <p className="intro-text reveal reveal-delay-1">
          Fotografi är för mig där kreativitet, instinkt och precision möts — bilder som bevarar känsla, atmosfär och identitet.
        </p>
      </section>
    </div>
  )
}
