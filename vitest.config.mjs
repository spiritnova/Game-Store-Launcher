import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Unit tests for the store logic (pricing, refunds, coupons, releases…). Run with `npm test`.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname) },
  },
  test: {
    include: ['tests/**/*.test.js'],
  },
})
