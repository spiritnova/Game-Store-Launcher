// Helpers shared by the Steam import scripts.

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

export async function fetchApp(id) {
  const r = await fetch(`https://store.steampowered.com/api/appdetails?appids=${id}&cc=us&l=english`)
  if (!r.ok) throw new Error(`appdetails ${r.status}`)
  const entry = (await r.json())[id]
  return entry?.success ? entry.data : null
}


// Finds a game's app id by its exact title, for games that aren't in the catalog list (added by hand).
export async function searchApp(title) {
  const r = await fetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&cc=us&l=english`)
  if (!r.ok) throw new Error(`storesearch ${r.status}`)
  const items = (await r.json()).items ?? []
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
