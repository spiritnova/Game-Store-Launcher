import Footer from './Components/Footer'
import Navbar from './Components/Navbar'
import Providers from './Components/Providers'
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
  'Ultimate is a game launcher showcase: discover new releases and deals, build a wishlist, and manage your library of installed games.'

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Ultimate Game Launcher',
    template: '%s · Ultimate',
  },
  description,
  openGraph: {
    title: 'Ultimate Game Launcher',
    description,
    siteName: 'Ultimate',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export const viewport = {
  themeColor: '#121212',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${poppins.variable} ${inter.variable}`}>
      <body>
        <Providers>
          <a href="#main" className="skip-link">Skip to content</a>
          <Navbar />
          <div id="main" className="page">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
