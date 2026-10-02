import Link from 'next/link'
import ResetDemoButton from '../../Components/About/ResetDemoButton'
import styles from './page.module.css'

export const metadata = {
  title: 'About',
  description: 'About Ultimate Game Launcher, a game launcher showcase built with Next.js.',
}

const features = [
  { title: 'Discover', text: 'A spotlight carousel, a row of current deals and featured games on the home page.' },
  { title: 'Game pages', text: 'Screenshot gallery, editions, bundles, player modes, system requirements, languages, player reviews and a discussion thread.' },
  { title: 'Browse', text: 'Search the catalogue, filter by genre or discount and sort by price or release date. Filters live in the URL, so any view can be shared.' },
  { title: 'Cart & checkout', text: 'Buy any edition or a whole bundle (you only pay for the games you don’t own yet) and check out.' },
  { title: 'Accounts', text: 'Sign in with any username, or as the demo player, and each account keeps its own library and wishlist.' },
  { title: 'Wishlist', text: 'Save games for later and see discounts at a glance.' },
  { title: 'Library & downloads', text: 'A download manager with a queue, pause and resume, a live speed graph and a simulated connection speed, plus quick launch from the sidebar.' },
  { title: 'Profile & settings', text: 'Edit your display name, bio and avatar colour, pick an accent colour for the whole launcher and tune downloads.' },
]

const stack = [
  'Next.js 14 (App Router, static generation)',
  'React 18 with Context for client state',
  'CSS Modules and design tokens',
  'Swiper for the carousels',
  'next/image with WebP and blurred placeholders',
  'Material UI icons',
  'localStorage persistence',
]

export default function About() {
  return (
    <main className={`container ${styles.page}`}>
      <header className={styles.header}>
        <h1>About Ultimate Game Launcher</h1>
        <p>
          Ultimate Game Launcher is a portfolio project that recreates the core of a PC game launcher: a storefront to find games
          and a library to install and play them. Nothing is sold and sign-in is simulated: accounts, purchases,
          wishlists and installs are saved in this browser only.
        </p>
      </header>

      <section aria-labelledby="features-title">
        <h2 id="features-title">What you can do</h2>
        <ul className={styles.features}>
          {features.map((feature) => (
            <li key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className={styles.columns}>
        <section aria-labelledby="stack-title">
          <h2 id="stack-title">Built with</h2>
          <ul className={styles.stack}>
            {stack.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section aria-labelledby="author-title">
          <h2 id="author-title">Author</h2>
          <p>
            Designed and built by Ibrahim Abboud. The source is on{' '}
            <a href="https://github.com/spiritnova/Game-Store-Launcher" target="_blank" rel="noreferrer">GitHub</a>,
            and you can reach me by <a href="mailto:ibrahimabboud2000@gmail.com">email</a>.
          </p>
        </section>

        <section aria-labelledby="demo-title">
          <h2 id="demo-title">Demo data</h2>
          <p>Want a fresh start? This signs you out, empties the cart and restores the demo player&apos;s library and wishlist.</p>
          <ResetDemoButton />
        </section>
      </div>

      <p className={styles.disclaimer}>
        Game titles, logos and artwork belong to their respective owners and are used here for demonstration only.
        Prices are illustrative. <Link href="/games">Browse the store</Link>
      </p>
    </main>
  )
}
