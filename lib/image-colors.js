import colors from '@/data/image-colors.json'

// Dominant colour of an image, shown while it loads. The map is tiny, so it's safe in client bundles.
export function placeholderColor(src) {
  return colors[src] ?? 'var(--surface)'
}
