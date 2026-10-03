# Ultimate Game Launcher

A PC game launcher in the style of Steam and Epic, built with Next.js. There's a store where you browse and buy games, and a library where you install and play them.

Nothing is actually for sale. Accounts, purchases, downloads, playtime and friends are all simulated and saved in your browser's localStorage, so there's no backend to set up.

Live demo: https://ultimate-game-launcher.vercel.app

## Trying it out

Click "Continue as demo player" on the login screen, or log in with `demo` / `demo`. The demo account already owns a few games (two of them have updates waiting), has four friends, a friend request from RetroFox and a short chat with PixelNomad. Red Dead Redemption 2 was bought 3 days ago, so you can try a refund on it.

Some things worth clicking:

- Press Play on a game. Playtime is fast-forwarded (a second counts as a minute), so achievements start popping up after a while.
- Install or update something and open Downloads. Under Settings > Library & downloads you can switch from "demo turbo" to 1 Gbps or 100 Mbps if you want to watch the queue.
- Coupons: `SAVE10`, `INDIE25`, `ADDONS15`, `BIG15`, `FIRSTPLAY`. Gift cards for the wallet: `ULTIMATE-DEMO-20`, `WELCOME-5` (once per account).
- Message a friend. Demo players answer after a few seconds, and the answer depends on what you wrote.
- Browse filters are saved in the URL, e.g. `/games?genre=RPG,Action&price=under-20`.

"Reset demo data" on the About page puts everything back.

## What's in it

The catalog has 103 games across 19 genres, imported from Steam's public store pages: prices, editions, DLC, screenshots, system requirements, languages and ESRB/PEGI ratings. Mature games ask for a date of birth first.

On the store side there's the Discover page, a Browse page with filters, game pages, a cart that handles editions, bundles, DLC, coupons and gifts, and pre-orders for upcoming games. Game pages are statically generated and rebuilt every hour, so a pre-order turns into a released game on its release day without a redeploy.

On the library side you can install, update, verify and uninstall games, sort them into collections, play them, and refund them. Refunds follow Steam's rules: within 14 days and under 2 hours played. Pre-orders can be refunded any time before release.

There are also friends, public profiles (`/u/pixelnomad`), messages, notifications, a wallet, purchase history with receipts, and settings for the theme (dark, light or system), accent colour, currency and downloads.

Passwords for accounts created in the browser are stored as a salted SHA-256 hash, not as text. It's still a demo, so don't reuse a real password.

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router) and React 18
- A React context store saved to `localStorage`, split into action modules in `lib/store/actions`
- CSS Modules, with the theme colours as CSS variables in `app/globals.css`
- [Swiper](https://swiperjs.com/) for the carousels and [Material UI icons](https://mui.com/material-ui/material-icons/)
- `next/image` with [sharp](https://sharp.pixelplumbing.com/) for WebP images and blur placeholders
- [Vitest](https://vitest.dev/) for the store logic (pricing, refunds, coupons, release dates)

## Running it locally

Needs Node.js 18.17 or newer.

```bash
npm install
npm run dev     # http://localhost:3000
```

Other scripts:

```bash
npm test                # unit tests
npm run lint
npm run build           # production build
npm start               # serve the production build
npm run import:steam    # import games listed in scripts/catalog.mjs
npm run import:ratings  # refresh ESRB/PEGI ratings
npm run import:dlc      # refresh DLC, then run `npm run images`
npm run images          # regenerate image placeholders after changing artwork
npm run brand           # regenerate the favicon, logos and Open Graph image
```

Set `NEXT_PUBLIC_SITE_URL` to the deployed URL so the Open Graph image gets an absolute link.

`npm run dev` and `npm run build` both write to `.next`, so don't build while the dev server is running. Build into another folder instead: `NEXT_DIST_DIR=.next-prod npm run build`.

On Windows, if `next build` fails with `PageNotFoundError`, make sure the terminal's path starts with an uppercase drive letter (`C:\`, not `c:\`). It's a known Next.js bug.

## Project structure

```
app/
  (auth)/         login, register and sign-out (no sidebar)
  (launcher)/     everything behind the login, with the sidebar
  Components/     components, grouped by page
data/             games, game details (server only), bundles, news, image placeholders
lib/
  store/          the client store: state, actions, pricing and refunds
  downloads.js    download queue and the fake network
  games.js        catalog helpers
  chat.js         demo players' message replies
  players.js      demo players and their online status
scripts/          Steam importers and image/brand generators
tests/            Vitest tests
```

## Adding games

Add a `[steamAppId, [genres]]` line to `CATALOG` in `scripts/catalog.mjs`, then run `npm run import:steam` and `npm run images`. The importer skips games that are already in the catalog, games without a US price or cover art, and upcoming games without a fixed release date. Prices are whatever Steam charges at import time.

You can also add a game by hand in `data/games.json` and `data/game-details.json`, with its images in `public/images/`. `salePrice` puts it on sale, `featured: true` shows it under Featured, and a `spotlight` block adds it to the home carousel.

## Credits

Game names, logos and artwork belong to their owners and are only used for this demo. Screenshots, requirements, languages, DLC and age ratings come from the games' Steam store pages. Prices, exchange rates, demo players, their reviews and their libraries are made up.
