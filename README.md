# Ultimate Game Launcher

A showcase PC game launcher built with Next.js. It recreates the two halves of a launcher like Epic or Steam: a **storefront** to discover and buy games, and a **library** to install and launch them.

Nothing is actually sold. Sign-in, purchases, installs, playtime and friends are simulated and saved in your browser.

## Features

- **Launcher layout**: a Steam-style sidebar with store search (suggestions as you type), library navigation, live counts, a notification centre, a "now playing" panel, a downloads panel, friends online, quick launch, a theme toggle and your profile with wallet balance. On phones it becomes a slide-out drawer.
- **Discover**: spotlight carousel (pausable, honours reduced-motion settings), a top-deals row, featured games and a "Browse by category" grid.
- **A real-sized catalog**: 90+ games across 19 categories (Action, RPG, Horror, Roguelike, Strategy, Racing, Sports, Fighting, Free to Play…), imported from Steam's public store listings.
- **Browse**: search by title, developer or publisher; combine genres, player modes (co-op, online, controller support…) and price ranges; show only sales; hide games you own or wishlisted; sort by price, discount, release date or title. Active filters show as removable chips, and every filter is stored in the URL, so a view like `/games?genre=RPG,Action&modes=online-co-op&price=under-20` can be shared.
- **Game pages**: screenshot gallery with a full-screen viewer, editions (Deluxe, Gold, Complete…), bundles, player modes (single-player, co-op, online), system requirements, supported languages, downloadable content (expansions and add-ons imported from Steam, bought separately or included with editions like the Complete Edition), ESRB and PEGI age ratings with content descriptors, achievements with global unlock rates, friends who own the game, player reviews with helpful votes, a discussion thread, "More from this studio" and related games. Mature games ask for a date of birth first, like Steam. Every game page is statically generated, and unknown games return a 404.
- **Cart & checkout**: buy any edition, or a bundle priced for the games you don't own yet. Sale and bundle discounts are itemised. Pay with the wallet or a simulated card (with a short simulated processing step), apply a coupon code (`SAVE10`, `INDIE25`, `ADDONS15`, `BIG15`, `FIRSTPLAY`), and buy any game as a gift for a friend, with a message. Own a lower edition? Upgrade to a higher one for the price difference, with DLC you already bought credited.
- **Purchases & refunds**: a purchase history with itemised receipts (order number, payment method, discounts). Games bought in the last 14 days and played for less than 2 hours can be refunded to the original payment method; DLC too, counting playtime since it was bought. Refunding a game also refunds edition upgrades bought for it, and keeps the DLC you bought for it.
- **Wallet**: add funds or redeem a gift card code (`ULTIMATE-DEMO-20` and `WELCOME-5` work once per account).
- **Login and registration**: the launcher opens behind an entry screen. Create an account (username, display name, password with a strength meter) or log in; passwords are checked against a salted SHA-256 hash kept in the browser, never stored as text. The demo account is one click away (or log in with `demo` / `demo`). Opening any launcher page while logged out shows a short boot screen, then the login screen, and returns you to that page afterwards. Signing out asks first.
- **Wishlist**: add games from any card or game page (requires sign-in).
- **Library & downloads**: install, play and uninstall games. Organise them into collections, favourites and hidden games, and search or sort the library. Playing a game runs a session that adds playtime (fast-forwarded in the demo) and unlocks achievements as you go. Updates come with a version number and patch notes; the library has an Updates filter and an "Update all" button. Each game has properties: version and what's new, owned DLC, launch options, verify files (repairs anything that fails), move the install folder between drives, and purchase and refund details. The download manager has a queue you can reorder, pause/resume, a live speed graph, ETAs, storage per drive and a simulated connection speed (demo turbo, 1 Gbps or 100 Mbps).
- **Friends & profiles**: add friends by username (demo players or other accounts in the same browser), see who's online or playing what, follow recent activity, and open public profiles (`/u/pixelnomad`) with recently played games, achievements, most played games and reviews. Review and comment authors link to their profiles.
- **Notifications**: wishlist sales, finished downloads and updates, achievements, gifts, friends and refunds, each type switchable in Settings.
- **Profile & settings**: display name, bio, avatar colour, dark, light or system theme, an accent colour, currency (prices convert from US dollars at fixed demo rates), date of birth for age-rated games, notification types, download and install-drive settings, purchases, wallet, sign out and account deletion.
- **Performance**: images are served as resized WebP with blurred placeholders and colour backgrounds while loading; heavy game details (requirements, languages) stay on the server; download progress lives in its own context so it doesn't re-render the whole app.
- **Polish**: toasts for every action, loading skeletons, empty states, a custom 404, error pages that offer to reset damaged saved data, per-page titles, an Open Graph image and keyboard and screen-reader support.

The demo player account comes with a few games (two with updates waiting, so it updates manually), DLC, four friends, a collection, a wallet balance and a purchase history (Red Dead Redemption 2 is still refundable). Use **Reset demo data** on the About page to restore it.

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
npm run import:dlc      # refresh DLC (titles, prices, art) from Steam, then run `npm run images`
npm run brand           # regenerate the favicon, wordmarks and Open Graph image from assets/brand
npm run images       # regenerate image placeholders after adding or changing artwork
```

Set `NEXT_PUBLIC_SITE_URL` to your deployed URL so Open Graph images resolve to absolute links.

> **Windows note:** if `next build` fails with `PageNotFoundError`, check that your terminal's path uses an uppercase drive letter (`C:\...`, not `c:\...`). This is a known Next.js issue on Windows.

## Project structure

```
app/
  Components/     UI building blocks (Sidebar, Footer, cards, carousels, views)
  (auth)/         Entry screen without the launcher around it: login, register, signout
  (launcher)/     Everything behind login, with the sidebar (layout.js holds the login gate)
    games/          Browse page and game pages (/games/[slug])
    library/        Library page
    wishlist/       Wishlist page
    cart/           Cart and checkout
    downloads/      Download manager
    friends/        Friends list and activity
    u/[username]/   Public player profiles
    settings/       Profile, settings, purchases and wallet
    news/, about/   Static content pages
data/
  games.json      Game catalogue: prices, editions, DLC, features, art, descriptions (sent to the browser)
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
  import-dlc.mjs  Imports DLC (up to four paid add-ons per game) from the Steam store API
  brand.mjs       Generates the brand assets
  catalog.mjs, steam.mjs  The list of Steam games and shared helpers
public/images/    Game covers, banners, logos and DLC art
public/brand/     Ultimate Game Launcher wordmarks (generated by `npm run brand`)
assets/brand/     Source logos: the app icon and the wordmark
```

To add games, add a `[steamAppId, [genres]]` line to the `CATALOG` list in `scripts/import-steam.mjs` and run `npm run import:steam`, then `npm run images`. The importer downloads and optimizes the artwork and fills in prices, descriptions, screenshots, requirements and languages. It skips games already imported, and games without a US price or standard cover art. Prices are the live US prices at import time.

You can also add a game by hand: an entry in `data/games.json` and `data/game-details.json`, with its images in `public/images/`. Add `salePrice` to put it on sale, `featured: true` to show it in Featured, or a `spotlight` block to add it to the home carousel.

## Credits

Game titles, logos and artwork are trademarks of their respective owners and are used for demonstration only. Screenshots, system requirements, languages, feature lists, DLC and age ratings come from the games' public store listings (games whose US listing shows no rating are marked "Not rated"). Prices and edition contents are illustrative, exchange rates are fixed demo values, and demo players, their reviews, comments, libraries and achievements are sample content.
