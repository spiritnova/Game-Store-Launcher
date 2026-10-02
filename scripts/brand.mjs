// Generates the launcher's brand assets from the source logos in assets/brand:
//   assets/brand/icon.png      app icon (controller and arrow on a dark rounded square)
//   assets/brand/wordmark.png  icon plus "Ultimate Game Launcher" lettering, white on transparent
//
//   npm run brand
//
// Outputs: the favicon and Apple touch icon (app/icon.png, app/apple-icon.png), the wordmark for dark
// and light backgrounds (public/brand), and the Open Graph image (app/opengraph-image.png).
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '..')
const src = (file) => path.join(root, 'assets', 'brand', file)
const out = (...p) => path.join(root, ...p)
const BRAND_YELLOW = '#f8b400'
const INK = [17, 24, 39] // #111827, the light theme's text colour

await mkdir(out('public', 'brand'), { recursive: true })

// ---------- Icons ----------
const icon = sharp(src('icon.png')).trim()
await icon.clone().resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9, palette: true }).toFile(out('app', 'icon.png'))
// iOS draws its own rounded corners, so the touch icon is square and opaque
await icon.clone().resize(180, 180, { fit: 'contain', background: '#0a0b10' }).flatten({ background: '#0a0b10' }).png().toFile(out('app', 'apple-icon.png'))

// ---------- Wordmark ----------
// Trimmed and sized for a 2x screen at up to ~60px tall
const wordmark = await sharp(src('wordmark.png')).trim().resize({ height: 140 }).png().toBuffer()
await sharp(wordmark).png({ compressionLevel: 9, palette: true }).toFile(out('public', 'brand', 'wordmark-on-dark.png'))

// For light backgrounds: the white and grey parts become ink, the yellow stays
const { data, info } = await sharp(wordmark).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
for (let i = 0; i < data.length; i += 4) {
  const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
  const grey = Math.max(r, g, b) - Math.min(r, g, b) < 40
  if (grey && r > 90) {
    data[i] = INK[0]
    data[i + 1] = INK[1]
    data[i + 2] = INK[2]
  }
}
await sharp(data, { raw: info }).png({ compressionLevel: 9, palette: true }).toFile(out('public', 'brand', 'wordmark-on-light.png'))

// ---------- Open Graph image (1200x630) ----------
const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <radialGradient id="glow" cx="78%" cy="18%" r="70%">
      <stop offset="0" stop-color="${BRAND_YELLOW}" stop-opacity="0.32"/>
      <stop offset="1" stop-color="${BRAND_YELLOW}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#0a0b10"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <text x="80" y="420" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="46" fill="#f4f6fb">Discover deals, build a wishlist and</text>
  <text x="80" y="478" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="46" fill="#f4f6fb">launch your game library.</text>
  <text x="80" y="548" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="26" fill="#98a1b5">A game launcher showcase built with Next.js</text>
</svg>`)
const ogWordmark = await sharp(src('wordmark.png')).trim().resize({ height: 200 }).png().toBuffer()
await sharp(background)
  .composite([{ input: ogWordmark, left: 72, top: 110 }])
  .png({ compressionLevel: 9 })
  .toFile(out('app', 'opengraph-image.png'))

console.log('Brand assets written to app/ and public/brand/.')
