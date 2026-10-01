# Ultimate Game Launcher

A showcase PC game launcher built with Next.js. It recreates the two halves of a launcher like Epic or Steam: a **storefront** to discover and buy games, and a **library** to install and launch them.

Nothing is actually sold. Sign-in, purchases, installs and playtime are simulated and saved in your browser.

## Features

- **Launcher layout**: a Steam-style sidebar with store and library navigation, live counts, a downloads panel, quick launch for installed games and your profile. On phones it becomes a slide-out drawer.
- **Discover**: spotlight carousel (pausable, honours reduced-motion settings), a top-deals row, featured games and a "Browse by category" grid.
- **A real-sized catalog**: 90+ games across 19 categories (Action, RPG, Horror, Roguelike, Strategy, Racing, Sports, Fighting, Free to Play…), imported from Steam's public store listings.
- **Browse**: search by title, developer or publisher; filter by genre or "on sale"; sort by price, discount, release date or title. Filters are stored in the URL, so a view like `/games?genre=RPG&sale=1` can be shared.
- **Game pages**: screenshot gallery with a full-screen viewer, editions (Deluxe, Gold, Complete…), bundles, player modes (single-player, co-op, online), system requirements, supported languages, player reviews with helpful votes, a discussion thread, "More from this studio" and related games. Every game page is statically generated, and unknown games return a 404.
- **Cart & checkout**: buy any edition, or a bundle priced for the games you don't own yet. Sale and bundle discounts are itemised, and checkout asks you to sign in.
- **Accounts**: sign in with any username, or with one click as the demo player. Each account keeps its own library and wishlist. Passwords are only validated, never stored.
- **Wishlist**: add games from any card or game page (requires sign-in).
- **Library & downloads**: install, play and uninstall games. The download manager has a queue you can reorder, pause/resume, a live speed graph, ETAs, storage usage and a simulated connection speed (demo turbo, 1 Gbps or 100 Mbps).
- **Profile & settings**: display name, bio, avatar colour, an accent colour for the whole launcher, download settings, sign out and account deletion.
- **Performance**: images are served as resized WebP with blurred placeholders and colour backgrounds while loading; heavy game details (requirements, languages) stay on the server; download progress lives in its own context so it doesn't re-render the whole app.
- **Polish**: toasts for every action, loading skeletons, empty states, a custom 404, per-page titles, an Open Graph image and keyboard and screen-reader support.

The demo player account comes with a few games. Use **Reset demo data** on the About page to restore it.

## Tech stack

- [Next.js 14](https://nextjs.org/) App Router with static generation
- React 18, with a Context store persisted to `localStorage`
- CSS Modules with shared design tokens in `app/globals.css`
- [Swiper](https://swiperjs.com/) for the carousels
- [Material UI icons](https://mui.com/material-ui/material-icons/)
- `next/image` with [sharp](https://sharp.pixelplumbing.com/) for resized WebP output and generated blur placeholders

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
npm run import:steam  # import more games from Steam (see below)
npm run images       # regenerate image placeholders after adding or changing artwork
```

Set `NEXT_PUBLIC_SITE_URL` to your deployed URL so Open Graph images resolve to absolute links.

> **Windows note:** if `next build` fails with `PageNotFoundError`, check that your terminal's path uses an uppercase drive letter (`C:\...`, not `c:\...`). This is a known Next.js issue on Windows.

## Project structure

```
app/
  Components/     UI building blocks (Sidebar, Footer, cards, carousels, views)
  games/          Browse page and game pages (/games/[slug])
  library/        Library page
  wishlist/       Wishlist page
  cart/           Cart and checkout
  downloads/      Download manager
  settings/       Profile & settings
  signin/         Mock sign-in
  news/, about/   Static content pages
data/
  games.json      Game catalogue: prices, editions, art, descriptions (sent to the browser)
  game-details.json  Screenshots, features, languages, requirements (server only)
  bundles.json    Bundles and their discounts
  image-meta.json, image-colors.json  Generated image placeholders
  news.json       News posts
lib/
  games.js        Catalogue helpers (pricing, filtering, related games)
  store.js        Client store: accounts, profiles, settings, cart, library, wishlist, reviews, comments
  downloads.js    Download queue and simulated network
  community.js    Sample reviews and comments from demo players
  images.js       Blur placeholders (server only)
scripts/
  image-meta.mjs  Generates image placeholders
  import-steam.mjs  Imports games, details and artwork from the Steam store API
public/images/    Game covers, banners and logos
```

To add games, add a `[steamAppId, [genres]]` line to the `CATALOG` list in `scripts/import-steam.mjs` and run `npm run import:steam`, then `npm run images`. The importer downloads and optimizes the artwork and fills in prices, descriptions, screenshots, requirements and languages. It skips games already imported, and games without a US price or standard cover art. Prices are the live US prices at import time.

You can also add a game by hand: an entry in `data/games.json` and `data/game-details.json`, with its images in `public/images/`. Add `salePrice` to put it on sale, `featured: true` to show it in Featured, or a `spotlight` block to add it to the home carousel.

## Credits

Game titles, logos and artwork are trademarks of their respective owners and are used for demonstration only. Screenshots, system requirements, languages and feature lists come from the games' public store listings. Prices and edition contents are illustrative, and reviews and comments by demo players are sample content.
