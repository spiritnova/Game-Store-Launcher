import games from '@/data/games.json'
import bundles from '@/data/bundles.json'

export const allGames = games
export const allBundles = bundles

export function getGame(slug) {
  return games.find((game) => game.slug === slug)
}

export function isOnSale(game) {
  return game.salePrice != null && game.salePrice < game.price
}

export function currentPrice(game) {
  return isOnSale(game) ? game.salePrice : game.price
}

export function discountPercent(game) {
  return isOnSale(game) ? Math.round((1 - game.salePrice / game.price) * 100) : 0
}

// Server code formats in US dollars; client components use the store's formatPrice, which follows
// the currency picked in Settings.
export { formatPrice } from '@/lib/currency'

// Rounds down to the cent, so discounted prices end in .x9 like the base prices.
const toCents = (amount) => Math.floor(amount * 100 + 1e-6) / 100

// ---------- Editions ----------

export function getEdition(game, editionId = 'standard') {
  return game.editions.find((edition) => edition.id === editionId) ?? game.editions[0]
}

// Sale discounts apply to every edition of a game.
export function editionPrice(game, edition) {
  if (edition.id === 'standard') return currentPrice(game)
  return isOnSale(game) ? toCents(edition.price * (game.salePrice / game.price)) : edition.price
}

// ---------- DLC ----------
// Add-ons imported from Steam (`npm run import:dlc`): { id, title, description, price, salePrice?, releaseDate?, image }

export function getDlc(game, id) {
  return game.dlc?.find((dlc) => dlc.id === id)
}

export function dlcPrice(dlc) {
  return dlc.salePrice != null && dlc.salePrice < dlc.price ? dlc.salePrice : dlc.price
}

const normalize = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

// DLC that comes with an edition, matched by name against the edition's contents
// (the Complete Edition's "Blood and Wine expansion" includes the "Blood and Wine" DLC).
export function editionDlc(game, editionId) {
  const includes = getEdition(game, editionId).includes.map(normalize)
  return (game.dlc ?? []).filter((dlc) => normalize(dlc.title).length >= 4 && includes.some((item) => item.includes(normalize(dlc.title)))).map((dlc) => dlc.id)
}

// ---------- Bundles ----------

export function getBundle(slug) {
  return bundles.find((bundle) => bundle.slug === slug)
}

export function bundlesForGame(slug) {
  return bundles.filter((bundle) => bundle.games.includes(slug))
}

// Price for the games in a bundle the user doesn't own yet ("complete the set"),
// with the bundle discount applied on top of current sale prices.
export function bundlePrice(bundle, owns = () => false) {
  const remaining = bundle.games.map(getGame).filter((game) => !owns(game.slug))
  const separate = remaining.reduce((sum, game) => sum + currentPrice(game), 0)
  const price = toCents(separate * (1 - bundle.discount / 100))
  return { games: remaining, separate, price, savings: separate - price }
}

// ---------- Display helpers ----------

// Portrait art for store cards; games without a cover fall back to their landscape art.
export function cardImage(game) {
  return game.cover ?? game.hero
}

export function releaseYear(game) {
  return new Date(game.releaseDate).getUTCFullYear()
}

export function formatReleaseDate(game) {
  return new Date(game.releaseDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatSize(gb) {
  if (gb == null) return 'Unknown'
  if (gb >= 1) return `${gb.toFixed(gb >= 100 ? 0 : 1).replace(/\.0$/, '')} GB`
  return `${Math.round(gb * 1024)} MB`
}

export const genres = [...new Set(games.flatMap((game) => game.genres))].sort()

export const gamesOnSale = games.filter(isOnSale)

// The biggest discounts first, for the home page row.
export function topDeals(count) {
  return [...gamesOnSale].sort((a, b) => discountPercent(b) - discountPercent(a) || currentPrice(a) - currentPrice(b)).slice(0, count)
}

// Genres with their game counts (largest first) and a banner to represent each one.
// Each category gets a banner that no other category tile is using, where possible.
export function getGenreStats() {
  const used = new Set()
  return genres
    .map((name) => ({ name, inGenre: games.filter((game) => game.genres.includes(name)) }))
    .sort((a, b) => b.inGenre.length - a.inGenre.length || a.name.localeCompare(b.name))
    .map(({ name, inGenre }) => {
      const withBanner = inGenre.filter((game) => game.banner)
      const pick = withBanner.find((game) => !used.has(game.banner)) ?? withBanner[0]
      if (pick) used.add(pick.banner)
      return { name, count: inGenre.length, banner: pick?.banner ?? null }
    })
}

export const featuredGames = games.filter((game) => game.featured)
export const spotlightGames = games.filter((game) => game.spotlight)

// Games sharing the most genres with `game`, best matches first.
export function getRelatedGames(game, count = 4, exclude = []) {
  return games
    .filter((other) => other.slug !== game.slug && !exclude.includes(other.slug))
    .map((other) => ({
      other,
      shared: other.genres.filter((genre) => game.genres.includes(genre)).length,
    }))
    .filter(({ shared }) => shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, count)
    .map(({ other }) => other)
}

// Other games from the same developer, falling back to the same publisher.
export function getMoreFromStudio(game) {
  const byDeveloper = games.filter((other) => other.slug !== game.slug && other.developer === game.developer)
  if (byDeveloper.length > 0) return { label: game.developer, games: byDeveloper }
  const byPublisher = games.filter((other) => other.slug !== game.slug && other.publisher === game.publisher)
  return { label: game.publisher, games: byPublisher }
}

export function isSvg(src) {
  return src?.endsWith('.svg')
}
