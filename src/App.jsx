// Gaahlin Photography — App.jsx (router)
// v0.6.0 — B06 skiva 1: appen blir router. Den publika sajten ligger nu i
// PublicSite.jsx (oförändrad), admin i admin/AdminApp.jsx.
//   "/"        → publik portfolio
//   "/admin/*" → admin (magisk länk-inloggning + is_admin-gate + skal)
// BrowserRouter kräver SPA-fallback i Vercel — se vercel.json.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PublicSite from './PublicSite'
import AdminApp from './admin/AdminApp'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicSite />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
