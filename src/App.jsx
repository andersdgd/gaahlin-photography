// Gaahlin Photography — App.jsx
// v0.4.0 — B02 leverans 3+4+5+6 sammanslagna: komplett public-portering.
// Inkluderar: nav (med språkväxlare), mobilmeny (med lang), hero, statement, gallery
// (8 bilder, lazy-load past first 3), featured (horisontell strip), about, contact
// (Formspree till mbdwayzy + Instagram-länk), footer, lightbox (tangentbord + swipe + dots).
// 5 språk: SV/NO/DK/FI/EN. Default svensk.
// Utseende bevarat exakt från ursprungs-index.html.

import { useEffect, useRef, useState } from 'react'
import './index.css'

// SVG-flaggor (rena, samma proportioner som ursprungs-index.html)
const flags = {
  sv: (
    <svg viewBox="0 0 22 15" xmlns="http://www.w3.org/2000/svg">
      <rect width="22" height="15" fill="#006AA7" />
      <rect x="6" width="3" height="15" fill="#FECC02" />
      <rect y="6" width="22" height="3" fill="#FECC02" />
    </svg>
  ),
  no: (
    <svg viewBox="0 0 22 15" xmlns="http://www.w3.org/2000/svg">
      <rect width="22" height="15" fill="#EF2B2D" />
      <rect x="6" width="3" height="15" fill="#fff" />
      <rect y="6" width="22" height="3" fill="#fff" />
      <rect x="7" width="1" height="15" fill="#002868" />
      <rect y="7" width="22" height="1" fill="#002868" />
    </svg>
  ),
  dk: (
    <svg viewBox="0 0 22 15" xmlns="http://www.w3.org/2000/svg">
      <rect width="22" height="15" fill="#C60C30" />
      <rect x="7" width="3" height="15" fill="#fff" />
      <rect y="6" width="22" height="3" fill="#fff" />
    </svg>
  ),
  fi: (
    <svg viewBox="0 0 22 15" xmlns="http://www.w3.org/2000/svg">
      <rect width="22" height="15" fill="#fff" />
      <rect x="5" width="3" height="15" fill="#003580" />
      <rect y="5.5" width="22" height="4" fill="#003580" />
    </svg>
  ),
  en: (
    <svg viewBox="0 0 22 15" xmlns="http://www.w3.org/2000/svg">
      <rect width="22" height="15" fill="#012169" />
      <line x1="0" y1="0" x2="22" y2="15" stroke="#fff" strokeWidth="3" />
      <line x1="22" y1="0" x2="0" y2="15" stroke="#fff" strokeWidth="3" />
      <line x1="0" y1="0" x2="22" y2="15" stroke="#C8102E" strokeWidth="1.5" />
      <line x1="22" y1="0" x2="0" y2="15" stroke="#C8102E" strokeWidth="1.5" />
      <rect x="9" width="4" height="15" fill="#fff" />
      <rect y="5.5" width="22" height="4" fill="#fff" />
      <rect x="9.8" width="2.4" height="15" fill="#C8102E" />
      <rect y="6.3" width="22" height="2.4" fill="#C8102E" />
    </svg>
  ),
}

// Översättningar. \n = radbrytning (renderas som <br/> där det förekommer).
const langs = {
  sv: {
    label: 'SV', name: 'Svenska',
    nav_work: 'Arbeten', nav_about: 'Om mig', nav_contact: 'Kontakt',
    hero_genre: 'Porträtt', scroll: 'Scrolla',
    label_statement: 'Manifest', label_work: 'Utvalda Arbeten', label_series: 'Serie',
    label_about: 'Om mig', label_contact: 'Kontakt',
    statement_text: 'Fotografi är för mig där kreativitet, instinkt och precision möts — bilder som bevarar känsla, atmosfär och identitet.',
    about_p1: 'Fotografi är för mig där kreativitet, instinkt och precision möts.',
    about_p2: 'Bilder gör mer än att dokumentera ett ögonblick. De bevarar känsla, atmosfär och identitet.',
    about_p3: 'Kunder väljer mig för fotografier som känns personliga, distinkta och varaktiga.',
    contact_heading: 'Arbeta\nmed mig',
    contact_sub: 'Öppen för porträttuppdrag,\neditorial och personliga projekt.',
    form_name: 'Namn', form_email: 'E-post', form_message: 'Meddelande', form_send: 'Skicka meddelande',
    close: 'Stäng', sent: 'Meddelande skickat — tack.', error: 'Något gick fel.',
  },
  no: {
    label: 'NO', name: 'Norsk',
    nav_work: 'Arbeider', nav_about: 'Om meg', nav_contact: 'Kontakt',
    hero_genre: 'Portrett', scroll: 'Rull',
    label_statement: 'Manifest', label_work: 'Utvalgte Arbeider', label_series: 'Serie',
    label_about: 'Om meg', label_contact: 'Kontakt',
    statement_text: 'Fotografering er for meg der kreativitet, instinkt og presisjon møtes.',
    about_p1: 'Fotografering er for meg der kreativitet, instinkt og presisjon møtes.',
    about_p2: 'Bilder gjør mer enn å dokumentere et øyeblikk.',
    about_p3: 'Kunder velger meg for fotografier som føles personlige og varige.',
    contact_heading: 'Jobb\nmed meg',
    contact_sub: 'Åpen for portrettoppdrag\nog personlige prosjekter.',
    form_name: 'Navn', form_email: 'E-post', form_message: 'Melding', form_send: 'Send melding',
    close: 'Lukk', sent: 'Melding sendt — takk.', error: 'Noe gikk galt.',
  },
  dk: {
    label: 'DK', name: 'Dansk',
    nav_work: 'Arbejder', nav_about: 'Om mig', nav_contact: 'Kontakt',
    hero_genre: 'Portræt', scroll: 'Rul',
    label_statement: 'Manifest', label_work: 'Udvalgte Arbejder', label_series: 'Serie',
    label_about: 'Om mig', label_contact: 'Kontakt',
    statement_text: 'Fotografi er for mig dér, hvor kreativitet, instinkt og præcision mødes.',
    about_p1: 'Fotografi er for mig dér, hvor kreativitet, instinkt og præcision mødes.',
    about_p2: 'Billeder gør mere end at dokumentere et øjeblik.',
    about_p3: 'Kunder vælger mig for fotografier, der føles personlige og varige.',
    contact_heading: 'Arbejd\nmed mig',
    contact_sub: 'Åben for portrætopgaver\nog personlige projekter.',
    form_name: 'Navn', form_email: 'E-mail', form_message: 'Besked', form_send: 'Send besked',
    close: 'Luk', sent: 'Besked sendt — tak.', error: 'Noget gik galt.',
  },
  fi: {
    label: 'FI', name: 'Suomi',
    nav_work: 'Työt', nav_about: 'Minusta', nav_contact: 'Yhteystiedot',
    hero_genre: 'Muotokuva', scroll: 'Vieritä',
    label_statement: 'Manifesti', label_work: 'Valitut Työt', label_series: 'Sarja',
    label_about: 'Minusta', label_contact: 'Yhteystiedot',
    statement_text: 'Valokuvaus on minulle paikka, jossa luovuus, vaisto ja tarkkuus kohtaavat.',
    about_p1: 'Valokuvaus on minulle paikka, jossa luovuus, vaisto ja tarkkuus kohtaavat.',
    about_p2: 'Kuvat tekevät enemmän kuin dokumentoivat hetken.',
    about_p3: 'Asiakkaat valitsevat minut henkilökohtaisista valokuvista.',
    contact_heading: 'Tee töitä\nkanssani',
    contact_sub: 'Avoin muotokuvatöille\nja henkilökohtaisille projekteille.',
    form_name: 'Nimi', form_email: 'Sähköposti', form_message: 'Viesti', form_send: 'Lähetä viesti',
    close: 'Sulje', sent: 'Viesti lähetetty — kiitos.', error: 'Jokin meni pieleen.',
  },
  en: {
    label: 'EN', name: 'English',
    nav_work: 'Work', nav_about: 'About', nav_contact: 'Contact',
    hero_genre: 'Portrait', scroll: 'Scroll',
    label_statement: 'Statement', label_work: 'Selected Work', label_series: 'Series',
    label_about: 'About', label_contact: 'Contact',
    statement_text: 'Photography, for me, is where creativity, instinct, and precision meet — images that preserve feeling, atmosphere, and identity.',
    about_p1: 'Photography, for me, is where creativity, instinct, and precision meet.',
    about_p2: 'Images do more than document a moment. They preserve feeling, atmosphere, and identity.',
    about_p3: 'Clients choose me for photographs that feel personal, distinctive, and lasting.',
    contact_heading: 'Work\nwith me',
    contact_sub: 'Open for portrait commissions,\neditorial, and personal projects.',
    form_name: 'Name', form_email: 'Email', form_message: 'Message', form_send: 'Send message',
    close: 'Close', sent: 'Message sent — thank you.', error: 'Something went wrong.',
  },
}

const photos = [
  '/images/Gallery1.jpg',
  '/images/Gallery2.jpg',
  '/images/Gallery3.jpg',
  '/images/Gallery4.jpg',
  '/images/Gallery5.jpg',
  '/images/Gallery6.jpg',
  '/images/Gallery7.jpg',
  '/images/Gallery8.jpg',
]

// Hjälpare: rendera text med \n som <br/>
function renderLines(text) {
  const parts = text.split('\n')
  return parts.flatMap((line, i) =>
    i < parts.length - 1 ? [line, <br key={i} />] : [line]
  )
}

export default function App() {
  const [loaded, setLoaded] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [currentLang, setCurrentLang] = useState('sv')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState(0)
  const [lightboxSrc, setLightboxSrc] = useState('')
  const [imgVisible, setImgVisible] = useState(false)
  const [submitNote, setSubmitNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const heroImgRef = useRef(null)
  const heroSectionRef = useRef(null)
  const langSwitcherRef = useRef(null)
  const touchStartRef = useRef(0)

  const t = langs[currentLang]

  // Mount: scroll till topp, fade in sidan, preload första två bilder
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const t1 = setTimeout(() => setLoaded(true), 100)
    photos.slice(0, 2).forEach((src) => {
      const img = new Image()
      img.src = src
    })
    return () => clearTimeout(t1)
  }, [])

  // Uppdatera <html lang> när språk byts
  useEffect(() => {
    document.documentElement.lang = currentLang
  }, [currentLang])

  // Scroll: nav.scrolled + hero parallax/opacity
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

  // Reveal observer
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

  // Lazy-load gallery-bilder med data-src
  useEffect(() => {
    const go = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const img = e.target.querySelector('img[data-src]')
            if (img && img.dataset.src) {
              img.src = img.dataset.src
              delete img.dataset.src
              go.unobserve(e.target)
            }
          }
        })
      },
      { rootMargin: '200px' }
    )
    document.querySelectorAll('.gallery-item[data-lazy]').forEach((el) => go.observe(el))
    return () => go.disconnect()
  }, [])

  // Body scroll lock: mobil meny ELLER lightbox öppen
  useEffect(() => {
    document.body.style.overflow = (mobileOpen || lightboxOpen) ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen, lightboxOpen])

  // Lightbox: tangentbord (Esc, pilar)
  useEffect(() => {
    if (!lightboxOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setLightboxOpen(false)
      else if (e.key === 'ArrowRight') setLightboxIdx((i) => (i + 1) % photos.length)
      else if (e.key === 'ArrowLeft') setLightboxIdx((i) => (i - 1 + photos.length) % photos.length)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightboxOpen])

  // Lightbox: byt bild med 200ms fade och preload av grannar
  useEffect(() => {
    if (!lightboxOpen) {
      setImgVisible(false)
      return
    }
    setImgVisible(false)
    // Preload grannarna
    ;[1, -1].forEach((d) => {
      const p = new Image()
      p.src = photos[(lightboxIdx + d + photos.length) % photos.length]
    })
    const t1 = setTimeout(() => {
      setLightboxSrc(photos[lightboxIdx])
    }, 200)
    return () => clearTimeout(t1)
  }, [lightboxIdx, lightboxOpen])

  // Stäng språkdropdown vid klick utanför
  useEffect(() => {
    if (!langOpen) return
    const onClick = (e) => {
      if (langSwitcherRef.current && !langSwitcherRef.current.contains(e.target)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [langOpen])

  const closeMobile = () => setMobileOpen(false)

  const openLightbox = (i) => {
    setLightboxIdx(i)
    setLightboxOpen(true)
  }

  const navigateLightbox = (d) => {
    setLightboxIdx((i) => (i + d + photos.length) % photos.length)
  }

  const onLightboxTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX
  }
  const onLightboxTouchEnd = (e) => {
    const delta = touchStartRef.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 50) navigateLightbox(delta > 0 ? 1 : -1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    const form = e.currentTarget
    try {
      const res = await fetch('https://formspree.io/f/mbdwayzy', {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      })
      setSubmitNote(res.ok ? t.sent : t.error)
      if (res.ok) form.reset()
    } catch {
      setSubmitNote(t.error)
    } finally {
      setIsSubmitting(false)
      setTimeout(() => setSubmitNote(''), 5000)
    }
  }

  return (
    <div id="page-wrap" className={loaded ? 'loaded' : ''}>
      <nav id="mainNav" className={scrolled ? 'scrolled' : ''}>
        <a href="#hero" className="nav-logo">Gaahlin</a>
        <ul className="nav-links">
          <li><a href="#gallery">{t.nav_work}</a></li>
          <li><a href="#about">{t.nav_about}</a></li>
          <li><a href="#contact">{t.nav_contact}</a></li>
        </ul>
        <div className="nav-right">
          <div className={`lang-switcher ${langOpen ? 'open' : ''}`} ref={langSwitcherRef}>
            <button
              type="button"
              className="lang-current"
              onClick={(e) => { e.stopPropagation(); setLangOpen((v) => !v) }}
              aria-label="Språk"
            >
              <span className="lang-current-flag">{flags[currentLang]}</span>
              <span className="lang-current-code">{t.label}</span>
              <span className="lang-arrow">▾</span>
            </button>
            <div className="lang-dropdown">
              {Object.keys(langs).map((code) => (
                <div
                  key={code}
                  className={`lang-option ${code === currentLang ? 'active' : ''}`}
                  onClick={() => { setCurrentLang(code); setLangOpen(false) }}
                >
                  <span className="lang-flag">{flags[code]}</span>
                  <span className="lang-name">{langs[code].name}</span>
                </div>
              ))}
            </div>
          </div>
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
        <a href="#gallery" className="menu-link" onClick={closeMobile}>{t.nav_work}</a>
        <a href="#about" className="menu-link" onClick={closeMobile}>{t.nav_about}</a>
        <a href="#contact" className="menu-link" onClick={closeMobile}>{t.nav_contact}</a>
        <div className="mobile-lang">
          {Object.keys(langs).map((code) => (
            <button
              key={code}
              type="button"
              className={`mobile-lang-btn ${code === currentLang ? 'active' : ''}`}
              onClick={() => setCurrentLang(code)}
            >
              <span className="mobile-flag">{flags[code]}</span>
              <span>{langs[code].label}</span>
            </button>
          ))}
        </div>
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
            <p>{t.hero_genre}</p>
            <p>Stockholm</p>
            <p>2026</p>
          </div>
        </div>
        <div className="hero-scroll">
          <span>{t.scroll}</span>
          <div className="scroll-arrow"></div>
        </div>
      </section>

      <section id="statement">
        <p className="section-label reveal">{t.label_statement}</p>
        <p className="intro-text reveal reveal-delay-1">{t.statement_text}</p>
      </section>

      <section id="gallery">
        <p className="section-label reveal">{t.label_work}</p>
        <div className="gallery-grid">
          {photos.map((src, i) => {
            const eager = i < 3
            return (
              <div
                key={src}
                className="gallery-item reveal"
                {...(eager ? {} : { 'data-lazy': '1' })}
                onClick={() => openLightbox(i)}
              >
                {eager ? (
                  <img src={src} alt={`Portrait ${i + 1}`} decoding="async" />
                ) : (
                  <img
                    data-src={src}
                    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"
                    alt={`Portrait ${i + 1}`}
                    decoding="async"
                    style={{ minHeight: '200px', background: '#111' }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section id="featured">
        <p className="section-label">{t.label_series}</p>
        <div className="featured-strip">
          {photos.map((src, i) => (
            <div key={src} className="strip-item" onClick={() => openLightbox(i)}>
              <img src={src} alt={`Series ${i + 1}`} loading="lazy" />
            </div>
          ))}
        </div>
      </section>

      <section id="about">
        <div className="about-image reveal">
          <img src="/images/me.jpg" alt="Anders Gåhlin Dufberg" loading="lazy" decoding="async" />
        </div>
        <div className="about-content">
          <p className="section-label reveal">{t.label_about}</p>
          <h2 className="reveal reveal-delay-1">Anders Gåhlin<br />Dufberg</h2>
          <p className="reveal reveal-delay-2">{t.about_p1}</p>
          <p className="reveal reveal-delay-3">{t.about_p2}</p>
          <p className="reveal">{t.about_p3}</p>
          <div className="about-sig reveal">Anders</div>
        </div>
      </section>

      <section id="contact">
        <div className="contact-intro">
          <p className="section-label reveal">{t.label_contact}</p>
          <h2 className="reveal reveal-delay-1">{renderLines(t.contact_heading)}</h2>
          <p className="reveal reveal-delay-2">{renderLines(t.contact_sub)}</p>
          <div className="contact-links reveal reveal-delay-3">
            <a
              href="https://www.instagram.com/gaahlinphotography/"
              className="contact-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group reveal">
            <label>{t.form_name}</label>
            <input type="text" name="name" required autoComplete="name" />
          </div>
          <div className="form-group reveal reveal-delay-1">
            <label>{t.form_email}</label>
            <input type="email" name="email" required inputMode="email" />
          </div>
          <div className="form-group reveal reveal-delay-2">
            <label>{t.form_message}</label>
            <textarea name="message" required></textarea>
          </div>
          <button
            type="submit"
            className="btn-submit reveal reveal-delay-3"
            disabled={isSubmitting}
          >
            {isSubmitting ? '...' : t.form_send}
          </button>
          <span className="submit-note">{submitNote}</span>
        </form>
      </section>

      <footer>
        <p>© 2026 Gaahlin Photography</p>
        <p>Stockholm, Sweden</p>
      </footer>

      <div
        className={`lightbox ${lightboxOpen ? 'open' : ''}`}
        onTouchStart={onLightboxTouchStart}
        onTouchEnd={onLightboxTouchEnd}
      >
        <button
          type="button"
          className="lightbox-close"
          onClick={() => setLightboxOpen(false)}
        >
          {t.close}
        </button>
        <button
          type="button"
          className="lb-arrow lb-arrow-left"
          onClick={() => navigateLightbox(-1)}
          aria-label="Föregående"
        >
          <svg viewBox="0 0 40 40">
            <line x1="28" y1="20" x2="12" y2="20" />
            <polyline points="19,13 12,20 19,27" />
          </svg>
        </button>
        <div className="lightbox-img-wrap">
          <img
            id="lightboxImg"
            className={imgVisible ? 'visible' : ''}
            src={lightboxSrc}
            alt=""
            onLoad={() => setImgVisible(true)}
          />
        </div>
        <button
          type="button"
          className="lb-arrow lb-arrow-right"
          onClick={() => navigateLightbox(1)}
          aria-label="Nästa"
        >
          <svg viewBox="0 0 40 40">
            <line x1="12" y1="20" x2="28" y2="20" />
            <polyline points="21,13 28,20 21,27" />
          </svg>
        </button>
        <div className="lb-counter">
          {photos.map((_, i) => (
            <div
              key={i}
              className={`lb-dot ${i === lightboxIdx ? 'active' : ''}`}
              onClick={() => setLightboxIdx(i)}
            />
          ))}
        </div>
        <div className="lb-info">{lightboxIdx + 1} / {photos.length}</div>
      </div>
    </div>
  )
}
