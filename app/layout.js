import Footer from './Components/Footer'
import Navbar from './Components/Navbar'
import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Ultimate Game Launcher',
  description: 'Your best place to find almost all the games on the market, enjoy all your purchased games in our custom library and get ready for some action!!!',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar/>
        {children}
        <Footer/>
      </body>
    </html>
  )
}
