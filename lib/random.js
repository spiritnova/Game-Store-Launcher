// Deterministic randomness for sample content, so every visitor (and the server render) sees the same thing.

// FNV-1a string hash
export function hash(text) {
  let h = 2166136261
  for (const char of text) h = Math.imul(h ^ char.charCodeAt(0), 16777619)
  return h >>> 0
}

// Small seeded PRNG (mulberry32)
export function random(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// `count` distinct items from `list`
export function pick(rand, list, count) {
  const pool = [...list]
  const chosen = []
  while (chosen.length < count && pool.length) chosen.push(pool.splice(Math.floor(rand() * pool.length), 1)[0])
  return chosen
}

export function shuffle(list, rand) {
  return pick(rand, list, list.length)
}
