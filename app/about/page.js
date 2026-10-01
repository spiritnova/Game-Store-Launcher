import Link from 'next/link'
import ResetDemoButton from '../Components/About/ResetDemoButton'
import styles from './page.module.css'

export const metadata = {
  title: 'About',
  description: 'About Ultimate, a game launcher showcase built with Next.js.',
}

const features = [
  { title: 'Discover', text: 'A spotlight carousel, a row of current deals and featured games on the home page.' },
  { title: 'Browse', text: 'Search the catalogue, filter by genre or discount and sort by price or release date. Filters live in the URL, so any view can be shared.' },
  { title: 'Wishlist', text: 'Save games for later and see discounts at a glance.' },
  { title: 'Library', text: 'Buy a game, then install, launch and uninstall it, with a live install progress bar and playtime tracking.' },
]

const stack = [
  'Next.js 14 (App Router, static generation)',
  'React 18 with Context for client state',
  'CSS Modules and design tokens',
  'Swiper for the carousels',
  'Material UI icons',
  'localStorage persistence',
]

export default function About() {
  return (
    <main className={`container ${styles.page}`}>
      <header className={styles.header}>
        <h1>About Ultimate</h1>
        <p>
          Ultimate is a portfolio project that recreates the core of a PC game launcher: a storefront to find games
          and a library to install and play them. Nothing is sold and no account is needed. Your purchases,
          wishlist and installs are simulated and saved in this browser only.
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
          <p>Want a fresh start? Reset the library and wishlist to the sample data a first-time visitor sees.</p>
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
