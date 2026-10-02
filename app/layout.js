import Footer from './Components/Footer'
import Providers from './Components/Providers'
import Sidebar from './Components/Sidebar'
import { STORAGE_KEY } from '@/lib/storage-key'
import './globals.css'
import localFont from 'next/font/local'

// Self-hosted (Latin subset) so builds don't depend on reaching Google Fonts.
const poppins = localFont({
  src: [
    { path: './fonts/poppins-300.woff2', weight: '300' },
    { path: './fonts/poppins-400.woff2', weight: '400' },
    { path: './fonts/poppins-500.woff2', weight: '500' },
    { path: './fonts/poppins-600.woff2', weight: '600' },
    { path: './fonts/poppins-700.woff2', weight: '700' },
  ],
  variable: '--font-poppins',
  display: 'swap',
})

const inter = localFont({
  src: './fonts/inter-variable.woff2',
  weight: '100 900',
  variable: '--font-inter',
  display: 'swap',
})

const description =
  'Ultimate Game Launcher is a game launcher showcase: discover new releases and deals, build a wishlist, and manage your library of installed games.'

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Ultimate Game Launcher',
    template: '%s · Ultimate Game Launcher',
  },
  description,
  openGraph: {
    title: 'Ultimate Game Launcher',
    description,
    siteName: 'Ultimate Game Launcher',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export const viewport = {
  themeColor: '#0a0b10',
}

// Applies the saved theme and accent before the first paint, so there's no flash of the wrong colours.
// Mirrors the logic in lib/store.js (which keeps them in sync afterwards).
const themeScript = `try{var s=JSON.parse(localStorage.getItem('${STORAGE_KEY}')||'{}'),t=(s.prefs&&s.prefs.theme)||'dark',r=document.documentElement;if(t==='system')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';r.dataset.theme=t;var a=s.session&&s.accounts&&s.accounts[s.session.username];if(a&&a.settings&&a.settings.accent)r.dataset.accent=a.settings.accent}catch(e){}`

export default function RootLayout({ children }) {
  return (
    // The theme script changes <html> attributes before React hydrates
    <html lang="en" className={`${poppins.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>
          <a href="#main" className="skip-link">Skip to content</a>
          <div className="shell">
            <Sidebar />
            <div className="content">
              <div id="main" className="page">{children}</div>
              <Footer />
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}
