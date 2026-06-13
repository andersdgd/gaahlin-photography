// Gaahlin Photography — App.jsx (router)
// v0.7.0 — Arc 3 / B08 skiva 3c: kundvy på /kund.
//   "/"        → publik portfolio (PublicSite)
//   "/admin/*" → admin (magisk länk + is_admin-gate + skal)
//   "/kund/*"  → kundvy (magisk länk + kund-rad-gate, egna leveranser)
//   v0.6.0: appen blev router.
// BrowserRouter kräver SPA-fallback i Vercel — se vercel.json.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PublicSite from './PublicSite'
import AdminApp from './admin/AdminApp'
import ClientApp from './client/ClientApp'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicSite />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/kund/*" element={<ClientApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
