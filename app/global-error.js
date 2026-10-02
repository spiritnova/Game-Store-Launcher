'use client'

import { useEffect } from 'react'
import { clearSavedData } from '@/lib/reset-storage'

// Replaces the whole app when the root layout itself fails (for example the store provider), so it
// can't rely on the layout's styles or components.
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const button = {
    padding: '0.65rem 1.4rem',
    border: 0,
    borderRadius: 12,
    font: 'inherit',
    fontWeight: 600,
    cursor: 'pointer',
  }

  return (
    <html lang="en">
      <body
        style={{
          display: 'grid',
          placeItems: 'center',
          minHeight: '100vh',
          margin: 0,
          padding: '1rem',
          background: '#0a0b10',
          color: '#f4f6fb',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <main style={{ maxWidth: 480 }}>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>The launcher couldn’t start</h1>
          <p style={{ color: '#98a1b5', marginBottom: '1.5rem', lineHeight: 1.55 }}>
            Something went wrong while loading. Try again, or reset the demo data saved in this browser if it keeps happening.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
            <button type="button" onClick={reset} style={{ ...button, background: '#3d8bff', color: '#fff' }}>Try again</button>
            <button type="button" onClick={clearSavedData} style={{ ...button, background: 'rgba(255,255,255,0.08)', color: '#f4f6fb' }}>
              Reset saved data
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
