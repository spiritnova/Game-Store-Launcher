// Helpers shared by the Steam import scripts.
import { CATALOG, HAND_ADDED_APP_IDS } from './catalog.mjs'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Steam's store API allows roughly 200 requests every 5 minutes, so requests are spaced out and
// retried after a pause when Steam says "too many requests".
const SPACING_MS = 1500
let last = 0

export async function steamJson(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const wait = last + SPACING_MS - Date.now()
    if (wait > 0) await sleep(wait)
    last = Date.now()
    const r = await fetch(url)
    if (r.status === 429 || r.status === 403) {
      console.log(`  Steam is rate limiting, waiting a minute (${url.split('?')[0]})`)
      await sleep(60000)
      continue
    }
    if (!r.ok) throw new Error(`${r.status} ${url}`)
    return r.json()
  }
  throw new Error(`Gave up after repeated rate limiting: ${url}`)
}

export const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/[®™©]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

export function slugify(name) {
  return decode(name)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const stripTags = (html) => decode(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '))

export function shorten(text, max = 300) {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const sentence = cut.lastIndexOf('. ')
  return sentence > max * 0.5 ? cut.slice(0, sentence + 1) : cut.slice(0, cut.lastIndexOf(' ')) + '…'
}

export async function fetchApp(id) {
  const entry = (await steamJson(`https://store.steampowered.com/api/appdetails?appids=${id}&cc=us&l=english`))[id]
  return entry?.success ? entry.data : null
}

// Artwork URLs from the store's browse API. Newer apps keep their library art under hashed paths, so the
// classic `apps/{id}/library_600x900.jpg` URLs don't exist for them. { cover, hero, logo }, each possibly null.
export async function fetchAssets(id) {
  const input = { ids: [{ appid: id }], context: { country_code: 'US', language: 'english' }, data_request: { include_assets: true } }
  const json = await steamJson(`https://api.steampowered.com/IStoreBrowseService/GetItems/v1?input_json=${encodeURIComponent(JSON.stringify(input))}`)
  const assets = json.response?.store_items?.[0]?.assets
  if (!assets) return { cover: null, hero: null, logo: null }
  const url = (file) => (file ? `https://shared.akamai.steamstatic.com/store_item_assets/${assets.asset_url_format.replace('${FILENAME}', file)}` : null)
  return { cover: url(assets.library_capsule_2x ?? assets.library_capsule), hero: url(assets.library_hero), logo: url(assets.library_logo) }
}

// US prices for many apps in one request: { id: { initial, final } } (apps without a price are left out)
export async function fetchPrices(ids) {
  if (ids.length === 0) return {}
  const json = await steamJson(`https://store.steampowered.com/api/appdetails?appids=${ids.join(',')}&cc=us&filters=price_overview`)
  const prices = {}
  for (const id of ids) {
    const overview = json[id]?.success && json[id].data?.price_overview
    if (overview) prices[id] = { initial: overview.initial / 100, final: overview.final / 100 }
  }
  return prices
}

// Calls visit(game, steamData) for every game in data/games.json, with steamData null when the game
// can't be found. Catalog games are matched by app id; games added by hand by id or exact title.
export async function forEachSteamGame(games, visit) {
  const pending = new Map(games.map((game) => [game.slug, game]))
  for (const [id] of CATALOG) {
    if (pending.size === 0) break
    const data = await fetchApp(id).catch(() => null)
    const game = data && pending.get(slugify(data.name))
    if (!game) continue
    pending.delete(game.slug)
    await visit(game, data)
  }
  for (const game of pending.values()) {
    const id = HAND_ADDED_APP_IDS[game.slug] ?? (await searchApp(game.title).catch(() => null))
    await visit(game, id ? await fetchApp(id).catch(() => null) : null)
  }
}


// Finds a game's app id by its exact title, for games that aren't in the catalog list (added by hand).
export async function searchApp(title) {
  const items = (await steamJson(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&cc=us&l=english`)).items ?? []
  const wanted = slugify(title)
  return items.find((item) => slugify(item.name) === wanted)?.id ?? null
}

const ESRB = { e: 'E', e10: 'E10+', t: 'T', m: 'M', ao: 'AO', rp: 'RP' }
const PEGI = ['3', '7', '12', '16', '18']

const descriptors = (text) =>
  (text ?? '')
    .split(/\r?\n|,\s*/)
    .map((d) => decode(d))
    .filter(Boolean)

// ESRB and PEGI ratings plus the age Steam asks visitors to confirm, or null when the store lists none.
export function parseRating(d) {
  const esrb = ESRB[d.ratings?.esrb?.rating?.toLowerCase()]
  const pegi = PEGI.includes(String(d.ratings?.pegi?.rating)) ? String(d.ratings.pegi.rating) : null
  const requiredAge = Number(d.required_age) || 0
  if (!esrb && !pegi && !requiredAge) return null
  return {
    ...(esrb ? { esrb: { rating: esrb, descriptors: descriptors(d.ratings.esrb.descriptors) } } : {}),
    ...(pegi ? { pegi: { rating: pegi, descriptors: descriptors(d.ratings.pegi.descriptors) } } : {}),
    requiredAge,
  }
}
