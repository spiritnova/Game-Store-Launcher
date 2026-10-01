import meta from '@/data/image-meta.json'

// Blurred placeholder props for next/image. Only import this from server components:
// image-meta.json is ~50 KB and should never end up in a client bundle.
// Client components use placeholderColor() from lib/image-colors.js instead.
export function blurProps(src) {
  const blur = meta[src]?.blur
  return blur ? { placeholder: 'blur', blurDataURL: blur } : {}
}
