// Gaahlin Photography — PublicSite.jsx (publik portfolio)
// v0.12.0 — INTROT (Arc 8, pass 8.2 Introt; Anders 2026-09-10: "byt ut HERO-bilden av mig i svartvitt och skapa
//   exakt samma sak som porträttgalleriet istället … bild 1 upp, zoomar och byter snyggt till bild 2 o.s.v. … inte
//   täcka upp hela skärmen som 'arbeten' gör utan som svartvita bilden … tonar över till nästa bild. Subtilt,
//   snyggt och professionellt." Verdikt på mockupen: "Bygg detta, vi justerar live.")
//   Heron är Rummet igen — <Room mode="hero" intro> i #hero, i samma ram som stillbilden: nav ovanpå, sidscroll,
//   hero-metan och Scrolla kvar, scroll-parallaxen på ytterdiven kvar. Poolen är adminets intro-bildspel
//   (site_content.hero_pool → parseHeroPool → poolFromSnapshot), INTE galleriets: bilderna bläddras i adminets
//   ordning, andas inåt, tonar över med ögonen på ögonen. Ingen väntan: poolen kommer ur site_content, som heron
//   redan inväntar (HERO_WAIT_MS) — fetchPool rör bara indexet och överlägget som förut. Tom lista ⇒ stillbilden
//   exakt som v0.11.1. Kraschar Rummet visar RoomBoundary stillbilden (fallback) och felet går till konsolen.
//   Överlägget pausar introt (active={!roomOpen}). Bildens tid / övertoning: INTRO_DWELL_MS 6000 / INTRO_DISSOLVE_MS
//   1600 — skruvas live med ?dwell= och ?dissolve= på gaahlin.com, sedan hit.
// v0.11.1 — Honeypottens maskering flyttad till klassen .hp-field i index.css (se den filen). Ett dolt,
//   bortpositionerat inmatningsfält inuti ett formulär är en känd nätfiskesignatur; macOS klistra-in-skydd
//   blockerade den här filen på den (2026-09-06, andra gången på denna fil). Ligger maskeringen i CSS och
//   fältet i JSX bär ingen av filerna mönstret. Spamskyddet är oförändrat — handlern läser fortfarande
//   data.get('website'). Rör inte tillbaka stilen hit.
// v0.11.0 — Hero-bilden tillbaka (Anders 2026-09-06: "vi kan inte börja med galleri som kommer nedanför").
//   Heron är åter en stillbild ur site_content (hero_image; tomt fält = repo-filen /images/intro/me_bw.jpg),
//   vilket gör Innehåll-sektionens hero-fält verksamt igen — inget behövde ändras i adminet, fältet var
//   föräldralöst, inte trasigt. Bilden GLIDER IN: opacity 0→1 och scale 1,035→1 på 1400 ms med sajtens
//   klippkurva cubic-bezier(.2,.7,.2,1), startad av bildens egen `load` (aldrig en timer). Skala, inte
//   förskjutning: object-fit är `contain`, så en translate skulle blotta svarta kanter. `prefers-reduced-motion`
//   ⇒ ren toning 400 ms (index.css v0.5.0).
//   TVÅ NODER, inte en: ytterdiven (heroImgRef) äger scroll-parallaxen som skriver transform direkt, <img>
//   inuti äger inglidningen. På samma nod skulle de slåss om transform och heron hacka första sekunden.
//   Heron väntar på site_content (liten tabell) men aldrig längre än 1200 ms — timeouten släpper fram
//   default-bilden om DB:n hänger. `key={heroUrl}` gör att en sent inkommen URL spelar upp inglidningen
//   i stället för att poppa. Rummet är kvar som ÖVERLÄGG ur galleriet — oförändrat. Sidoeffekt: första
//   bilden väntar inte längre på den tunga fetchPool-frågan.
// v0.10.0 — Rummet flyttar in (Arc 8). Hero = <Room mode="hero"> (Klippet.jsx): filmen med Anders porträtt,
//   matchklipp på ögonen, hänglinje, dissolve för bilder med bakgrund; sajtens nav och hero-metan ligger ovanpå.
//   Galleriet är indexet: tryck på en bild öppnar <Room mode="overlay"> på just den bilden, filmen fortsätter,
//   Stäng/Esc/svep ner tar tillbaka till samma plats. Den gamla lightboxen är borttagen (state, effekter, JSX).
//   Poolen (gallerier + bilder + intelligens) hämtas EN gång via fetchPool och ger både indexet och rummen.
//   Hero-bilden ur site_content används inte längre i heron (Innehåll-sektionen behåller fältet tills vidare).
// v0.9.0 — Redaktionellt innehåll från databasen (gaahlin.site_content) via lib/siteContent.js:
//   hero-bild/etikett/stad/år, manifest, om mig (bild, tre stycken, signatur), kontaktrubrik/
//   underrad, Instagram-länk. Allt med fallback till DEFAULTS — sajten renderar identiskt
//   om tabellen är tom. UI-strängar (nav, formulär, "Stäng") ligger kvar i `langs` här.
// v0.8.1 — Spamskydd på kontaktformuläret, utan externa tjänster:
//   1) Honeypot: osynligt fält "website" som bara bottar fyller i.
//   2) Tidskrav: minst 4 s mellan första fokus i formuläret och submit.
//   3) Innehållsspärr: meddelande utan blanksteg (slumpsträng) avvisas.
//   Träff ⇒ tyst "skickat" (ingen insert, ingen signal till botten). Riktiga besökare märker inget.
// v0.8.0 — Justerad galleri-layout. CSS `columns` (spaltflöde) ersatt med rader där
//   varje rad får gemensam höjd och bildbredden följer bildens format (w/h ur DB).
//   Max 3 bilder/rad (desktop), 2 (≤900px), 1 (≤500px). En ensam bild blir centrerad
//   "hero" (stående ~55 % bredd, liggande ~85 %); en påbörjad sista rad stretchas
//   inte utan centreras. Helt dynamiskt utifrån antal och format i varje galleri.
// v0.7.1 — Arc 5: "Boka"-länk i nav + mobilmeny → /boka.
// v0.7.0 — galleriet är nu DB-/Storage-drivet (CMS). Hämtar publika gallerier +
// bilder från Supabase (gaahlin.galleries/images), bygger publika Storage-URL:er
// och renderar varje galleri som ett eget block (titel + rutnät). Bilderna ligger
// i bucket 'gaahlin-public' — inga portfoliobilder i repot längre.
// Hero/om-mig pekar på faktiska repo-sökvägar (intro/, about/).
// Behåller: nav + språkväxlare (SV/NO/DK/FI/EN), mobilmeny, hero, statement, about,
// kontakt (Supabase-insert till gaahlin.contacts), footer. (Lightboxen togs bort i v0.10.0.)

import { useEffect, useMemo, useRef, useState } from 'react'
import './index.css'
import { supabase } from './lib/supabase'
import { fetchSiteContent, resolveContent, publicImageUrl, parseHeroPool } from './lib/siteContent'
import { Room, RoomBoundary, fetchPool, poolFromSnapshot } from './Klippet'

// === Galleri-layout: justerade rader ===
// Antal bilder per rad beror på viewport (speglar brytpunkterna i index.css).
function useColumns() {
  const calc = () => {
    if (typeof window === 'undefined') return 3
    const w = window.innerWidth
    return w <= 500 ? 1 : w <= 900 ? 2 : 3
  }
  const [cols, setCols] = useState(calc)
  useEffect(() => {
    let raf = 0
    const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setCols(calc())) }
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(raf) }
  }, [])
  return cols
}

const aspectOf = (im) => (im.width && im.height ? im.width / im.height : 1.5)

// Hur länge heron som mest väntar på site_content innan default-bilden släpps fram.
// site_content är en liten tabell; spärren finns för att en hängande DB aldrig ska ge svart hero.
const HERO_WAIT_MS = 1200
// Intro-bildspelet (pass 8.2): bildens tid och övertoningens längd. Mockupens värden, Anders 2026-09-10:
// "Bygg detta, vi justerar live." Skruvas live med ?dwell=6000&dissolve=1600 på gaahlin.com, sedan hit.
const INTRO_DWELL_MS = 6000
const INTRO_DISSOLVE_MS = 1600

// Delar en bildlista i rader om max `cols` bilder.
function chunkRows(images, cols) {
  const rows = []
  for (let i = 0; i < images.length; i += cols) rows.push(images.slice(i, i + cols))
  return rows
}

// Bredd (i % av galleriets bredd) för en rad. Fulla rader fyller kant till kant.
// En ensam bild på desktop/tablet är en "hero"; övriga påbörjade rader krymps så de
// inte stretchas upp till löjliga höjder, och centreras.
function rowWidthPct(row, cols) {
  const k = row.length
  if (cols === 1 || k >= cols) return 100
  if (k === 1) {
    const a = aspectOf(row[0])
    return a < 0.95 ? 55 : a < 1.25 ? 70 : 85
  }
  const base = (k / cols) * 100
  return Math.round(base + (100 - base) / 3)
}

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
    scroll: 'Scrolla',
    label_statement: 'Manifest', label_work: 'Utvalda Arbeten', label_series: 'Serie',
    label_about: 'Om mig', label_contact: 'Kontakt',
    form_name: 'Namn', form_email: 'E-post', form_message: 'Meddelande', form_send: 'Skicka meddelande',
    close: 'Stäng', sent: 'Meddelande skickat — tack.', error: 'Något gick fel.',
  },
  no: {
    label: 'NO', name: 'Norsk',
    nav_work: 'Arbeider', nav_about: 'Om meg', nav_contact: 'Kontakt',
    scroll: 'Rull',
    label_statement: 'Manifest', label_work: 'Utvalgte Arbeider', label_series: 'Serie',
    label_about: 'Om meg', label_contact: 'Kontakt',
    form_name: 'Navn', form_email: 'E-post', form_message: 'Melding', form_send: 'Send melding',
    close: 'Lukk', sent: 'Melding sendt — takk.', error: 'Noe gikk galt.',
  },
  dk: {
    label: 'DK', name: 'Dansk',
    nav_work: 'Arbejder', nav_about: 'Om mig', nav_contact: 'Kontakt',
    scroll: 'Rul',
    label_statement: 'Manifest', label_work: 'Udvalgte Arbejder', label_series: 'Serie',
    label_about: 'Om mig', label_contact: 'Kontakt',
    form_name: 'Navn', form_email: 'E-mail', form_message: 'Besked', form_send: 'Send besked',
    close: 'Luk', sent: 'Besked sendt — tak.', error: 'Noget gik galt.',
  },
  fi: {
    label: 'FI', name: 'Suomi',
    nav_work: 'Työt', nav_about: 'Minusta', nav_contact: 'Yhteystiedot',
    scroll: 'Vieritä',
    label_statement: 'Manifesti', label_work: 'Valitut Työt', label_series: 'Sarja',
    label_about: 'Minusta', label_contact: 'Yhteystiedot',
    form_name: 'Nimi', form_email: 'Sähköposti', form_message: 'Viesti', form_send: 'Lähetä viesti',
    close: 'Sulje', sent: 'Viesti lähetetty — kiitos.', error: 'Jokin meni pieleen.',
  },
  en: {
    label: 'EN', name: 'English',
    nav_work: 'Work', nav_about: 'About', nav_contact: 'Contact',
    scroll: 'Scroll',
    label_statement: 'Statement', label_work: 'Selected Work', label_series: 'Series',
    label_about: 'About', label_contact: 'Contact',
    form_name: 'Name', form_email: 'Email', form_message: 'Message', form_send: 'Send message',
    close: 'Close', sent: 'Message sent — thank you.', error: 'Something went wrong.',
  },
}


// Hjälpare: rendera text med \n som <br/>
function renderLines(text) {
  const parts = text.split('\n')
  return parts.flatMap((line, i) =>
    i < parts.length - 1 ? [line, <br key={i} />] : [line]
  )
}

export default function PublicSite() {
  const [loaded, setLoaded] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [currentLang, setCurrentLang] = useState('sv')
  const [pool, setPool] = useState(null)           // rummets pool: bilder + intelligens, hämtas en gång
  const [roomOpen, setRoomOpen] = useState(false)  // rummet i helskärm ur galleriet
  const [roomStart, setRoomStart] = useState(null) // bilden det öppnar på (uid)
  const [submitNote, setSubmitNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const formFirstFocusRef = useRef(0)
  const [siteDb, setSiteDb] = useState({})   // redaktionellt innehåll ur gaahlin.site_content
  const [siteReady, setSiteReady] = useState(false)  // site_content avgjord (svar, fel eller timeout)
  const [heroReady, setHeroReady] = useState(false)  // hero-bilden laddad ⇒ inglidningen startar
  const c = resolveContent(siteDb, currentLang)   // spamskydd: när besökaren först rörde formuläret
  // Hero-bilden: satt i adminet (Innehåll → Hero) eller repo-filen när fältet är tomt.
  const heroUrl = c.hero_image ? publicImageUrl(c.hero_image) : '/images/intro/me_bw.jpg'
  // Intro-bildspelet: poolen ur site_content.hero_pool (adminets ögonblicksbild) — ingen fetchPool, ingen väntan
  // utöver site_content som redan inväntas. Tom lista ⇒ stillbilden ovan, precis som i v0.11.
  const heroPool = useMemo(() => poolFromSnapshot(parseHeroPool(c.hero_pool)), [c.hero_pool])
  const [galleries, setGalleries] = useState([])   // [{...galleri, images:[{...bild, url, flatIndex, uid}]}]
  const cols = useColumns()

  const heroImgRef = useRef(null)
  const heroSectionRef = useRef(null)
  const langSwitcherRef = useRef(null)

  const t = langs[currentLang]

  // Mount: scroll till topp, fade in sidan, preload första två bilder
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const t1 = setTimeout(() => setLoaded(true), 100)
    return () => clearTimeout(t1)
  }, [])

  // Poolen: publika gallerier + bilder + intelligens (fetchPool i Klippet.jsx), EN hämtning för index och rum.
  // Indexet grupperar poolen per galleri i galleriordning.
  useEffect(() => {
    let active = true
    ;(async () => {
      if (!supabase) return
      let p = []
      try { p = await fetchPool(null) } catch (e) { p = [] }
      if (!active) return
      setPool(p)
      const byG = new Map()
      p.forEach((x, i) => {
        if (!byG.has(x.gid)) byG.set(x.gid, { id: x.gid, slug: x.s, title: x.title, images: [] })
        byG.get(x.gid).images.push({ uid: x.uid, url: x.url, width: x.pw, height: x.ph, title: x.imgTitle, flatIndex: i })
      })
      setGalleries([...byG.values()].filter((g) => g.images.length > 0))
    })()
    return () => { active = false }
  }, [])

  // Redaktionellt innehåll (text + bildplatser). Fel ⇒ tomt ⇒ DEFAULTS.
  // Heron väntar på svaret (så rätt bild visas direkt i stället för att poppa), men aldrig längre
  // än HERO_WAIT_MS: hänger databasen släpps default-bilden fram ändå. Kommer svaret senare och
  // pekar på en annan bild spelas inglidningen upp på nytt (key={heroUrl}) i stället för att poppa.
  useEffect(() => {
    let active = true
    const release = () => { if (active) setSiteReady(true) }
    const timer = setTimeout(release, HERO_WAIT_MS)
    fetchSiteContent()
      .then((db) => { if (active) setSiteDb(db) })
      .catch(() => {})
      .finally(() => { clearTimeout(timer); release() })
    return () => { active = false; clearTimeout(timer) }
  }, [])

  // Byts hero-bilden (adminet, eller ett sent DB-svar) börjar inglidningen om från noll.
  useEffect(() => { setHeroReady(false) }, [heroUrl])

  // Uppdatera <html lang> när språk byts
  useEffect(() => {
    document.documentElement.lang = currentLang
  }, [currentLang])

  // Scroll: nav.scrolled + heron (bilden) tonas och krymper svagt när man scrollar förbi.
  // Skriver transform/opacity på YTTERDIVEN — <img> inuti äger inglidningen, så de två aldrig krockar.
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
          img.style.transform = window.innerWidth > 900 ? `scale(${1 - progress * 0.06}) translateY(${y * 0.15}px)` : `scale(${1 - progress * 0.04})`
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
  }, [galleries])

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
  }, [galleries])

  // Body scroll lock: mobil meny ELLER rummet öppet
  useEffect(() => {
    document.body.style.overflow = (mobileOpen || roomOpen) ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen, roomOpen])

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

  // Rummet ur galleriet: öppnar på bilden besökaren tryckte; stäng tar tillbaka till samma plats (ingen scroll rörs).
  const openRoom = (uid) => { setRoomStart(uid); setRoomOpen(true) }
  const closeRoom = () => setRoomOpen(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    const form = e.currentTarget
    const data = new FormData(form)
    const payload = {
      name: (data.get('name') || '').toString().trim(),
      email: (data.get('email') || '').toString().trim(),
      message: (data.get('message') || '').toString().trim(),
    }

    // --- Spamskydd (tyst: bottar får samma "skickat" som människor) ---
    const honeypot = (data.get('website') || '').toString()
    const elapsed = formFirstFocusRef.current ? Date.now() - formFirstFocusRef.current : 0
    const looksRandom = payload.message.length > 12 && !/\s/.test(payload.message)
    if (honeypot || elapsed < 4000 || looksRandom) {
      setSubmitNote(t.sent)
      form.reset()
      setIsSubmitting(false)
      return
    }

    try {
      if (!supabase) throw new Error('Supabase ej konfigurerad')
      // Default-schema är 'gaahlin' (satt i src/lib/supabase.js) → gaahlin.contacts.
      // RLS tillåter publik insert; ingen läsning sker härifrån.
      const { error } = await supabase.from('contacts').insert(payload)
      if (error) throw error
      setSubmitNote(t.sent)
      form.reset()
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
          <li><a href="/boka">{{ sv: 'Boka', no: 'Bestill', dk: 'Book', fi: 'Varaa', en: 'Book' }[currentLang]}</a></li>
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
        <a href="/boka" className="menu-link" onClick={closeMobile}>{{ sv: 'Boka', no: 'Bestill', dk: 'Book', fi: 'Varaa', en: 'Book' }[currentLang]}</a>
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
        <div ref={heroImgRef} style={{ position: 'absolute', inset: 0, willChange: 'transform, opacity' }}>
          {siteReady && (heroPool.length > 0
            ? (
              <RoomBoundary fallback={<img className="hero-img settled" src={heroUrl} alt="Gaahlin Photography" decoding="async" />}>
                <Room mode="hero" intro pool={heroPool} dwell={INTRO_DWELL_MS} dissolveMs={INTRO_DISSOLVE_MS} active={!roomOpen} />
              </RoomBoundary>
            )
            : (
              <img
                key={heroUrl}
                className={`hero-img${heroReady ? ' settled' : ''}`}
                src={heroUrl}
                alt="Gaahlin Photography"
                fetchPriority="high"
                decoding="async"
                onLoad={() => setHeroReady(true)}
                onError={() => setHeroReady(true)}
              />
            ))}
        </div>
        <div className="hero-bottom" style={{ pointerEvents: 'none' }}>
          <div className="hero-meta">
            <p>{c.hero_genre}</p>
            <p>{c.hero_city}</p>
            <p>{c.hero_year}</p>
          </div>
        </div>
        <div className="hero-scroll" style={{ pointerEvents: 'none' }}>
          <span>{t.scroll}</span>
          <div className="scroll-arrow"></div>
        </div>
      </section>

      <section id="statement">
        <p className="section-label reveal">{t.label_statement}</p>
        <p className="intro-text reveal reveal-delay-1">{c.statement_text}</p>
      </section>

      <section id="gallery">
        {galleries.map((g, gi) => (
          <div
            key={g.id}
            className="gallery-block"
            style={{ marginBottom: gi < galleries.length - 1 ? 'clamp(3rem, 8vw, 7rem)' : 0 }}
          >
            <p className="section-label reveal">{g.title}</p>
            <div className="gallery-grid">
              {chunkRows(g.images, cols).map((row, ri) => (
                <div
                  key={ri}
                  className="gallery-row"
                  style={{ width: `${rowWidthPct(row, cols)}%` }}
                >
                  {row.map((img) => {
                    const eager = img.flatIndex < 3
                    const ar = aspectOf(img)
                    return (
                      <div
                        key={img.flatIndex}
                        className="gallery-item reveal"
                        style={{ flexGrow: ar, aspectRatio: String(ar) }}
                        {...(eager ? {} : { 'data-lazy': '1' })}
                        onClick={() => openRoom(img.uid)}
                      >
                        {eager ? (
                          <img src={img.url} alt={img.title || g.title} decoding="async" />
                        ) : (
                          <img
                            data-src={img.url}
                            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"
                            alt={img.title || g.title}
                            decoding="async"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section id="about">
        <div className="about-image reveal">
          <img src={c.about_image ? publicImageUrl(c.about_image) : '/images/about/me.jpg'} alt="Anders Gåhlin Dufberg" loading="lazy" decoding="async" />
        </div>
        <div className="about-content">
          <p className="section-label reveal">{t.label_about}</p>
          <h2 className="reveal reveal-delay-1">Anders Gåhlin<br />Dufberg</h2>
          <p className="reveal reveal-delay-2">{c.about_p1}</p>
          <p className="reveal reveal-delay-3">{c.about_p2}</p>
          <p className="reveal">{c.about_p3}</p>
          <div className="about-sig reveal">{c.about_sig}</div>
        </div>
      </section>

      <section id="contact">
        <div className="contact-intro">
          <p className="section-label reveal">{t.label_contact}</p>
          <h2 className="reveal reveal-delay-1">{renderLines(c.contact_heading)}</h2>
          <p className="reveal reveal-delay-2">{renderLines(c.contact_sub)}</p>
          <div className="contact-links reveal reveal-delay-3">
            <a
              href={c.instagram_url}
              className="contact-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>
          </div>
        </div>
        <form
          onSubmit={handleSubmit}
          onFocus={() => { if (!formFirstFocusRef.current) formFirstFocusRef.current = Date.now() }}
        >
          {/* Honeypot — osynligt för människor, ifyllt av bottar. Maskeringen ligger i .hp-field (index.css),
              aldrig som inline-stil här: se filhuvudet, v0.11.1. */}
          <div aria-hidden="true" className="hp-field">
            <label htmlFor="contact-website">Website</label>
            <input id="contact-website" type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>
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

      {roomOpen && (
        <RoomBoundary>
          <Room mode="overlay" pool={pool} startUid={roomStart} onClose={closeRoom} closeLabel={t.close} />
        </RoomBoundary>
      )}
    </div>
  )
}
