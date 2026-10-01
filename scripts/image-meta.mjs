// Generates image placeholders for everything in public/images:
//   data/image-meta.json   { "/images/x.jpg": { width, height, blur } }  (server components only)
//   data/image-colors.json { "/images/x.jpg": "#rrggbb" }                 (cards/banners only, safe for client bundles)
// Run `npm run images` after adding or replacing artwork.
import { readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '..')
const imagesDir = path.join(root, 'public', 'images')
const photo = /\.(jpe?g|png|webp|avif)$/i

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else if (photo.test(entry.name)) yield full
  }
}

const meta = {}
const colors = {}

for await (const file of walk(imagesDir)) {
  const src = '/' + path.relative(path.join(root, 'public'), file).split(path.sep).join('/')
  const image = sharp(file)
  const { width, height } = await image.metadata()
  const { dominant } = await image.stats()
  const hex = '#' + [dominant.r, dominant.g, dominant.b].map((v) => v.toString(16).padStart(2, '0')).join('')
  // Client components only need colours for card and banner art
  if (/^\/images\/(covers|heroes|banners)\//.test(src)) colors[src] = hex

  // Logos are transparent and shown at small sizes: they don't need a blurred placeholder.
  const entry = { width, height }
  if (!src.startsWith('/images/logos/')) {
    const tiny = await sharp(file).resize(16, null, { fit: 'inside' }).jpeg({ quality: 50 }).toBuffer()
    entry.blur = `data:image/jpeg;base64,${tiny.toString('base64')}`
  }
  meta[src] = entry
}

const sorted = (obj) => Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)))
await writeFile(path.join(root, 'data', 'image-meta.json'), JSON.stringify(sorted(meta), null, 2) + '\n')
await writeFile(path.join(root, 'data', 'image-colors.json'), JSON.stringify(sorted(colors), null, 2) + '\n')
console.log(`Wrote placeholders for ${Object.keys(meta).length} images.`)
