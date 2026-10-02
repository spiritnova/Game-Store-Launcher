// Pixel-art creature avatars, generated from a seed (like an identicon, in the style of arcade sprites).
// The same seed always draws the same creature, so avatars match on the server and in the browser.
import { hash, random } from '@/lib/random'

export const SPRITE_SIZE = 9 // the grid is 9 by 9 cells, mirrored down the middle
const HALF = Math.ceil(SPRITE_SIZE / 2)

const cache = new Map()

// { body: [[x, y]], shade: [[x, y]], eyes: [[x, y]] } for a seed
export function sprite(seed) {
  if (cache.has(seed)) return cache.get(seed)
  const rand = random(hash(`sprite:${seed}`))
  const eyeRow = 2 + Math.floor(rand() * 2)
  const eyeCol = 1 + Math.floor(rand() * 2)

  // Left half of the grid (true = filled). Denser towards the middle and the head, so creatures have
  // a solid body and spiky edges.
  const half = []
  for (let y = 0; y < SPRITE_SIZE; y++) {
    half.push([])
    for (let x = 0; x < HALF; x++) {
      const inside = y > 0 && y < SPRITE_SIZE - 1
      const chance = x === HALF - 1 ? (y < SPRITE_SIZE - 2 ? 1 : 0.5) : 0.68 - (x === 0 ? 0.35 : 0) - (y > 5 ? 0.15 : 0)
      half[y].push(inside && rand() < chance)
    }
  }
  // The eyes always sit inside the head
  for (let y = eyeRow - 1; y <= eyeRow + 1; y++) {
    for (let x = eyeCol - 1; x <= eyeCol + 1; x++) {
      if (x >= 0 && x < HALF) half[y][x] = true
    }
  }

  const body = []
  const shade = []
  const eyes = []
  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < HALF; x++) {
      if (!half[y][x]) continue
      const isEye = y === eyeRow && x === eyeCol
      const shaded = !isEye && rand() < 0.14
      for (const px of new Set([x, SPRITE_SIZE - 1 - x])) {
        if (isEye) eyes.push([px, y])
        else if (shaded) shade.push([px, y])
        else body.push([px, y])
      }
    }
  }
  const result = { body, shade, eyes }
  cache.set(seed, result)
  return result
}

// The avatar seeds people can choose from in Settings
export const AVATAR_CHOICES = Array.from({ length: 15 }, (_, i) => `pick-${i + 1}`)

// The seed for an account or player: a chosen avatar, or one derived from the username.
// `'initials'` means the person turned picture avatars off.
export function avatarSeed(user) {
  return user.avatar ?? `user:${user.username ?? user.displayName}`
}
