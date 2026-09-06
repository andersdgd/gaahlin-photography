// Gaahlin Photography — App.jsx (router)
// v0.9.0 — Arc 8 (experiment): /obscura → visningsrummet (prototyp, Obscura.jsx).
//   "/"        → publik portfolio (PublicSite)
//   "/boka"    → bokningsförfrågan (BookingPage)
//   "/obscura" → OBSCURA-prototypen (en bild i taget, Content Credentials + HDR)
//   "/admin/*" → admin (magisk länk + is_admin-gate + skal)
//   "/kund/*"  → kundvy (magisk länk + kund-rad-gate, egna leveranser)
//   v0.8.0: /boka. v0.7.0: kundvy på /kund. v0.6.0: appen blev router.
// BrowserRouter kräver SPA-fallback i Vercel — se vercel.json (rewrites; gamla URL:er 301:as där).

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PublicSite from './PublicSite'
import BookingPage from './BookingPage'
import Obscura from './Obscura'
import AdminApp from './admin/AdminApp'
import ClientApp from './client/ClientApp'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicSite />} />
        <Route path="/boka" element={<BookingPage />} />
        <Route path="/obscura" element={<Obscura />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/kund/*" element={<ClientApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
