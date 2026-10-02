# Ultimate Game Launcher

A showcase PC game launcher built with Next.js. It recreates the two halves of a launcher like Epic or Steam: a **storefront** to discover and buy games, and a **library** to install and launch them.

Nothing is actually sold. Sign-in, purchases, installs, playtime and friends are simulated and saved in your browser.

## Features

- **Launcher layout**: a Steam-style sidebar with store search (suggestions as you type), library navigation, live counts, a notification centre, a "now playing" panel, a downloads panel, friends online, quick launch, a theme toggle and your profile with wallet balance. On phones it becomes a slide-out drawer.
- **Discover**: spotlight carousel (pausable, honours reduced-motion settings), a top-deals row, featured games and a "Browse by category" grid.
- **A real-sized catalog**: 90+ games across 19 categories (Action, RPG, Horror, Roguelike, Strategy, Racing, Sports, Fighting, Free to Play…), imported from Steam's public store listings.
- **Browse**: search by title, developer or publisher; combine genres, player modes (co-op, online, controller support…) and price ranges; show only sales; hide games you own or wishlisted; sort by price, discount, release date or title. Active filters show as removable chips, and every filter is stored in the URL, so a view like `/games?genre=RPG,Action&modes=online-co-op&price=under-20` can be shared.
- **Game pages**: screenshot gallery with a full-screen viewer, editions (Deluxe, Gold, Complete…), bundles, player modes (single-player, co-op, online), system requirements, supported languages, ESRB and PEGI age ratings with content descriptors, achievements with global unlock rates, friends who own the game, player reviews with helpful votes, a discussion thread, "More from this studio" and related games. Mature games ask for a date of birth first, like Steam. Every game page is statically generated, and unknown games return a 404.
- **Cart & checkout**: buy any edition, or a bundle priced for the games you don't own yet. Sale and bundle discounts are itemised. Pay with the wallet or a simulated card, and buy any game as a gift for a friend, with a message.
- **Purchases & refunds**: a purchase history with itemised receipts (order number, payment method, discounts). Games bought in the last 14 days and played for less than 2 hours can be refunded to the original payment method.
- **Wallet**: add funds or redeem a gift card code (`ULTIMATE-DEMO-20` and `WELCOME-5` work once per account).
- **Accounts**: sign in with any username, or with one click as the demo player. Each account keeps its own library and wishlist. Passwords are only validated, never stored.
- **Wishlist**: add games from any card or game page (requires sign-in).
- **Library & downloads**: install, play and uninstall games. Organise them into collections, favourites and hidden games, and search or sort the library. Playing a game runs a session that adds playtime (fast-forwarded in the demo) and unlocks achievements as you go. Each game has properties: launch options, verify files (repairs anything that fails), move the install folder between drives, and purchase and refund details. The download manager has a queue you can reorder, pause/resume, a live speed graph, ETAs, storage per drive and a simulated connection speed (demo turbo, 1 Gbps or 100 Mbps).
- **Friends & profiles**: add friends by username (demo players or other accounts in the same browser), see who's online or playing what, follow recent activity, and open public profiles (`/u/pixelnomad`) with recently played games, achievements, most played games and reviews. Review and comment authors link to their profiles.
- **Notifications**: wishlist sales, finished downloads and updates, achievements, gifts, friends and refunds, each type switchable in Settings.
- **Profile & settings**: display name, bio, avatar colour, dark, light or system theme, an accent colour, currency (prices convert from US dollars at fixed demo rates), date of birth for age-rated games, notification types, download and install-drive settings, purchases, wallet, sign out and account deletion.
- **Performance**: images are served as resized WebP with blurred placeholders and colour backgrounds while loading; heavy game details (requirements, languages) stay on the server; download progress lives in its own context so it doesn't re-render the whole app.
- **Polish**: toasts for every action, loading skeletons, empty states, a custom 404, error pages that offer to reset damaged saved data, per-page titles, an Open Graph image and keyboard and screen-reader support.

The demo player account comes with a few games, four friends, a collection, a wallet balance and a purchase history (Red Dead Redemption 2 is still refundable). Use **Reset demo data** on the About page to restore it.

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
npm run import:ratings  # refresh ESRB/PEGI age ratings from Steam
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
  friends/        Friends list and activity
  u/[username]/   Public player profiles
  settings/       Profile, settings, purchases and wallet
  signin/         Mock sign-in
  news/, about/   Static content pages
data/
  games.json      Game catalogue: prices, editions, features, art, descriptions (sent to the browser)
  game-details.json  Screenshots, languages, requirements, age ratings (server only)
  bundles.json    Bundles and their discounts
  image-meta.json, image-colors.json  Generated image placeholders
  news.json       News posts
lib/
  games.js        Catalogue helpers (pricing, filtering, related games)
  store.js        Client store: accounts, settings, cart, checkout, wallet, refunds, gifts, library,
                  collections, play sessions, friends, notifications, reviews, comments
  downloads.js    Download queue and simulated network
  achievements.js Sample achievements, unlocked by playtime
  players.js      Demo players: profiles, libraries and online status
  community.js    Sample reviews and comments from demo players
  currency.js     Display currencies and price formatting
  images.js       Blur placeholders (server only)
scripts/
  image-meta.mjs  Generates image placeholders
  import-steam.mjs  Imports games, details and artwork from the Steam store API
  import-ratings.mjs  Adds ESRB/PEGI age ratings from the Steam store API
  catalog.mjs, steam.mjs  The list of Steam games and shared helpers
public/images/    Game covers, banners and logos
```

To add games, add a `[steamAppId, [genres]]` line to the `CATALOG` list in `scripts/import-steam.mjs` and run `npm run import:steam`, then `npm run images`. The importer downloads and optimizes the artwork and fills in prices, descriptions, screenshots, requirements and languages. It skips games already imported, and games without a US price or standard cover art. Prices are the live US prices at import time.

You can also add a game by hand: an entry in `data/games.json` and `data/game-details.json`, with its images in `public/images/`. Add `salePrice` to put it on sale, `featured: true` to show it in Featured, or a `spotlight` block to add it to the home carousel.

## Credits

Game titles, logos and artwork are trademarks of their respective owners and are used for demonstration only. Screenshots, system requirements, languages, feature lists and age ratings come from the games' public store listings (games whose US listing shows no rating are marked "Not rated"). Prices and edition contents are illustrative, exchange rates are fixed demo values, and demo players, their reviews, comments, libraries and achievements are sample content.
