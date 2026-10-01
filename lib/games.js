import games from '@/data/games.json'

export const allGames = games

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

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function formatPrice(amount) {
  return usd.format(amount)
}

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

export const genres = [...new Set(games.flatMap((game) => game.genres))].sort()

export const gamesOnSale = games.filter(isOnSale)
export const featuredGames = games.filter((game) => game.featured)
export const spotlightGames = games.filter((game) => game.spotlight)

// Games sharing the most genres with `game`, best matches first.
export function getRelatedGames(game, count = 4) {
  return games
    .filter((other) => other.slug !== game.slug)
    .map((other) => ({
      other,
      shared: other.genres.filter((genre) => game.genres.includes(genre)).length,
    }))
    .filter(({ shared }) => shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, count)
    .map(({ other }) => other)
}

export function isSvg(src) {
  return src?.endsWith('.svg')
}
