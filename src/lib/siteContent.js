// Gaahlin Photography — lib/siteContent.js
// v0.1.0 — Redaktionellt innehåll för publika sajten. Delas av PublicSite (läser) och
//   AdminApp (skriver). Källa: gaahlin.site_content (key, locale, value). Allt som saknas
//   i databasen faller tillbaka på DEFAULTS här — tabellen får vara tom.
//
// Två klasser av innehåll:
//   • per språk (sv/no/dk/fi/en): rubriker, manifest, om mig, kontakt
//   • språkneutralt (locale '*'): bilder (storage-nycklar i bucket gaahlin-public), länkar
// Gränssnittssträngar ("Skicka", "Stäng", navlänkar) ligger kvar i PublicSite.jsx — de
// ändras aldrig redaktionellt.

import { supabase } from './supabase'

export const LOCALES = ['sv', 'no', 'dk', 'fi', 'en']
export const NEUTRAL = '*'
export const BUCKET = 'gaahlin-public'

// Fältschema: styr adminets formulär. group = rubrik i adminet, multiline = textarea,
// neutral = språkoberoende (bild eller länk), kind = 'text' | 'image' | 'url'.
export const FIELDS = [
  { key: 'hero_image',      group: 'Hero',     label: 'Hero-bild',            kind: 'image', neutral: true,
    hint: 'Fullbredd bakom rubriken. Liggande, gärna 2400 px bred. Används även som delningsbild.' },
  { key: 'hero_genre',      group: 'Hero',     label: 'Genre-etikett',        kind: 'text' },
  { key: 'hero_city',       group: 'Hero',     label: 'Stad',                 kind: 'text',  neutral: true },
  { key: 'hero_year',       group: 'Hero',     label: 'År',                   kind: 'text',  neutral: true },

  { key: 'statement_text',  group: 'Manifest', label: 'Manifest',             kind: 'text', multiline: true },

  { key: 'about_image',     group: 'Om mig',   label: 'Porträtt',             kind: 'image', neutral: true,
    hint: 'Stående. Visas till vänster om texten.' },
  { key: 'about_p1',        group: 'Om mig',   label: 'Stycke 1',             kind: 'text', multiline: true },
  { key: 'about_p2',        group: 'Om mig',   label: 'Stycke 2',             kind: 'text', multiline: true },
  { key: 'about_p3',        group: 'Om mig',   label: 'Stycke 3',             kind: 'text', multiline: true },
  { key: 'about_sig',       group: 'Om mig',   label: 'Signatur',             kind: 'text',  neutral: true },

  { key: 'contact_heading', group: 'Kontakt',  label: 'Rubrik',               kind: 'text', multiline: true,
    hint: 'Radbrytning i fältet blir radbrytning på sajten.' },
  { key: 'contact_sub',     group: 'Kontakt',  label: 'Underrad',             kind: 'text', multiline: true },
  { key: 'instagram_url',   group: 'Kontakt',  label: 'Instagram-länk',       kind: 'url',   neutral: true },
]

export const GROUPS = [...new Set(FIELDS.map((f) => f.group))]

// Standardvärden = det som stod hårdkodat i PublicSite t.o.m. v0.8.1.
export const DEFAULTS = {
  [NEUTRAL]: {
    hero_image: '',          // tomt = repo-filen /images/intro/me_bw.jpg
    about_image: '',         // tomt = repo-filen /images/about/me.jpg
    hero_city: 'Stockholm',
    hero_year: '2026',
    about_sig: 'Anders',
    instagram_url: 'https://www.instagram.com/gaahlinphotography/',
  },
  sv: {
    hero_genre: 'Porträtt',
    statement_text: 'Fotografi är för mig där kreativitet, instinkt och precision möts — bilder som bevarar känsla, atmosfär och identitet.',
    about_p1: 'Fotografi är för mig där kreativitet, instinkt och precision möts.',
    about_p2: 'Bilder gör mer än att dokumentera ett ögonblick. De bevarar känsla, atmosfär och identitet.',
    about_p3: 'Kunder väljer mig för fotografier som känns personliga, distinkta och varaktiga.',
    contact_heading: 'Arbeta\nmed mig',
    contact_sub: 'Öppen för porträttuppdrag,\neditorial och personliga projekt.',
  },
  no: {
    hero_genre: 'Portrett',
    statement_text: 'Fotografering er for meg der kreativitet, instinkt og presisjon møtes.',
    about_p1: 'Fotografering er for meg der kreativitet, instinkt og presisjon møtes.',
    about_p2: 'Bilder gjør mer enn å dokumentere et øyeblikk.',
    about_p3: 'Kunder velger meg for fotografier som føles personlige og varige.',
    contact_heading: 'Jobb\nmed meg',
    contact_sub: 'Åpen for portrettoppdrag\nog personlige prosjekter.',
  },
  dk: {
    hero_genre: 'Portræt',
    statement_text: 'Fotografi er for mig dér, hvor kreativitet, instinkt og præcision mødes.',
    about_p1: 'Fotografi er for mig dér, hvor kreativitet, instinkt og præcision mødes.',
    about_p2: 'Billeder gør mere end at dokumentere et øjeblik.',
    about_p3: 'Kunder vælger mig for fotografier, der føles personlige og varige.',
    contact_heading: 'Arbejd\nmed mig',
    contact_sub: 'Åben for portrætopgaver\nog personlige projekter.',
  },
  fi: {
    hero_genre: 'Muotokuva',
    statement_text: 'Valokuvaus on minulle paikka, jossa luovuus, vaisto ja tarkkuus kohtaavat.',
    about_p1: 'Valokuvaus on minulle paikka, jossa luovuus, vaisto ja tarkkuus kohtaavat.',
    about_p2: 'Kuvat tekevät enemmän kuin dokumentoivat hetken.',
    about_p3: 'Asiakkaat valitsevat minut henkilökohtaisista valokuvista.',
    contact_heading: 'Tee töitä\nkanssani',
    contact_sub: 'Avoin muotokuvatöille\nja henkilökohtaisille projekteille.',
  },
  en: {
    hero_genre: 'Portrait',
    statement_text: 'Photography, for me, is where creativity, instinct, and precision meet — images that preserve feeling, atmosphere, and identity.',
    about_p1: 'Photography, for me, is where creativity, instinct, and precision meet.',
    about_p2: 'Images do more than document a moment. They preserve feeling, atmosphere, and identity.',
    about_p3: 'Clients choose me for photographs that feel personal, distinctive, and lasting.',
    contact_heading: 'Work\nwith me',
    contact_sub: 'Open for portrait commissions,\neditorial, and personal projects.',
  },
}

export const publicImageUrl = (key) =>
  key ? supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl : ''

// Hämtar hela tabellen → { [locale]: { [key]: value } }. Tom vid fel (⇒ defaults).
export async function fetchSiteContent() {
  if (!supabase) return {}
  const { data, error } = await supabase.from('site_content').select('key, locale, value')
  if (error || !data) return {}
  const out = {}
  for (const r of data) {
    if (!out[r.locale]) out[r.locale] = {}
    out[r.locale][r.key] = r.value
  }
  return out
}

// Slår ihop DB-innehåll med defaults för ett språk. Tom sträng i DB = "använd default"
// (så adminet kan lämna fält tomma utan att sajten blir tom).
export function resolveContent(db, locale) {
  const pick = (loc, key) => {
    const v = db?.[loc]?.[key]
    return v != null && v !== '' ? v : DEFAULTS[loc]?.[key] ?? ''
  }
  const out = {}
  for (const f of FIELDS) out[f.key] = pick(f.neutral ? NEUTRAL : locale, f.key)
  return out
}
