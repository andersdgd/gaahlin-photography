// Gaahlin Photography — Supabase-klient
// v0.5.0 — B05: appens enda Supabase-klient.
// Läser publika env-variabler (VITE_*). Default-schema = 'gaahlin' (husets
// isolering), så supabase.from('contacts') träffar gaahlin.contacts.
// Klienten blir null om env saknas → appen white-screenar aldrig innan
// miljövariablerna är satta i Vercel; formuläret visar då bara ett felmeddelande.

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase =
  url && anonKey
    ? createClient(url, anonKey, { db: { schema: 'gaahlin' } })
    : null
