// Gaahlin Photography — App.jsx
// v0.2.0 — Vite/React-grund. Minimal verifieringsvy som bekräftar att
// leveransloopen (pubg -> GitHub -> Vercel) fungerar innan den statiska
// HTML-sajten portas komponent for komponent (backlog B02).

export default function App() {
  return (
    <main
      style={{
        minHeight: '100svh',
        margin: 0,
        background: '#000',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.2rem',
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        WebkitFontSmoothing: 'antialiased',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          fontWeight: 300,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          fontSize: 'clamp(1.1rem, 4vw, 1.9rem)',
          margin: 0,
        }}
      >
        Gaahlin Photography
      </h1>
      <p
        style={{
          fontSize: '9px',
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.4)',
          margin: 0,
          lineHeight: 2,
        }}
      >
        React-grund live · Stockholm 2026
      </p>
    </main>
  )
}
