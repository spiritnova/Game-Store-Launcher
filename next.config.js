/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The old sign-in page became the login screen
  async redirects() {
    return [{ source: '/signin', destination: '/login', permanent: false }]
  },
  images: {
    // WebP only: AVIF was measured at the same size for this artwork and is much slower to encode.
    formats: ['image/webp'],
    // Artwork rarely changes, so keep optimized variants cached for 30 days.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
}

module.exports = nextConfig
