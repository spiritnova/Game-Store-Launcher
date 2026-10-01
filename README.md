# Ultimate Game Launcher

A showcase PC game launcher built with Next.js. It recreates the two halves of a launcher like Epic or Steam: a **storefront** to discover and buy games, and a **library** to install and launch them.

Nothing is actually sold. Purchases, installs and playtime are simulated and saved in your browser.

## Features

- **Discover**: spotlight carousel (pausable, honours reduced-motion settings), a "games on sale" row and featured games.
- **Browse**: search by title, developer or publisher; filter by genre or "on sale"; sort by price, discount, release date or title. Filters are stored in the URL, so a view like `/games?genre=RPG&sale=1` can be shared.
- **Game pages**: banner, description, price with discount, developer/publisher/release info and related games. Every game is statically generated, and unknown games return a 404.
- **Wishlist**: add games from any card or game page; the navbar shows a count.
- **Library**: buy a game, then install it (with a live progress bar), play it or uninstall it. Filter by install state and sort by recent activity.
- **Polish**: toasts for every action, loading skeletons, empty states, a custom 404, per-page titles, an Open Graph image and keyboard and screen-reader support.

First-time visitors get a small demo library. You can restore it at any time from the About page.

## Tech stack

- [Next.js 14](https://nextjs.org/) App Router with static generation
- React 18, with a Context store persisted to `localStorage`
- CSS Modules with shared design tokens in `app/globals.css`
- [Swiper](https://swiperjs.com/) for the carousels
- [Material UI icons](https://mui.com/material-ui/material-icons/)

## Getting started

Requires Node.js 18.17 or newer.

```bash
npm install
npm run dev     # http://localhost:3000
```

Other scripts:

```bash
npm run lint    # ESLint (next/core-web-vitals)
npm run build   # production build
npm start       # serve the production build
```

Set `NEXT_PUBLIC_SITE_URL` to your deployed URL so Open Graph images resolve to absolute links.

> **Windows note:** if `next build` fails with `PageNotFoundError`, check that your terminal's path uses an uppercase drive letter (`C:\...`, not `c:\...`). This is a known Next.js issue on Windows.

## Project structure

```
app/
  Components/     UI building blocks (Navbar, Footer, cards, carousels, views)
  games/          Browse page and game pages (/games/[slug])
  library/        Library page
  wishlist/       Wishlist page
  news/, about/   Static content pages
data/
  games.json      Game catalogue (prices, art, descriptions)
  news.json       News posts
lib/
  games.js        Catalogue helpers (pricing, filtering, related games)
  store.js        Client store: library, wishlist, simulated installs
public/images/    Game covers, banners and logos
```

To add a game, add an entry to `data/games.json` with its images in `public/images/`. Add `salePrice` to put it on sale, `featured: true` to show it in Featured, or a `spotlight` block to add it to the home carousel.

## Credits

Game titles, logos and artwork are trademarks of their respective owners and are used for demonstration only. Prices are illustrative.
