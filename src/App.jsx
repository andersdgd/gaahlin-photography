// Gaahlin Photography — App.jsx (router)
// v0.12.0 — Rummet bor på startsidan (PublicSite v0.10.0 använder Room ur Klippet.jsx). /obscura och /obscura/scen
//   borttagna (okända rutter → /). Obscura.jsx importeras inte längre (pensionerad; beviset lever i lib/credentials).
// v0.11.0 — Arc 8 pass 8.1: /obscura → Klippet (levande mockup av matchklippet, fixturpool, Klippet.jsx);
//   scenen från v0.2.1 (riktiga bilder, Content Credentials, mörkrum bakom ?darkroom=1) flyttad till /obscura/scen.
// v0.10.0 — Arc 8: /spegeln → Spegeln (besökaren i Gaahlins ljus, prototyp).
// v0.9.0 — Arc 8 (experiment): /obscura → visningsrummet (prototyp, Obscura.jsx).
//   "/"             → publik portfolio (PublicSite)
//   "/boka"         → bokningsförfrågan (BookingPage)
//   "/spegeln"      → Spegeln (webbkamera i Gaahlins ljus, allt på enheten)
//   "/admin/*"      → admin (magisk länk + is_admin-gate + skal)
//   "/kund/*"       → kundvy (magisk länk + kund-rad-gate, egna leveranser)
//   v0.8.0: /boka. v0.7.0: kundvy på /kund. v0.6.0: appen blev router.
// BrowserRouter kräver SPA-fallback i Vercel — se vercel.json (rewrites; gamla URL:er 301:as där).

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PublicSite from './PublicSite'
import BookingPage from './BookingPage'
import Spegeln from './Spegeln'
import AdminApp from './admin/AdminApp'
import ClientApp from './client/ClientApp'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicSite />} />
        <Route path="/boka" element={<BookingPage />} />
        <Route path="/spegeln" element={<Spegeln />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/kund/*" element={<ClientApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
