import { getGame } from '@/lib/games'

export const DEMO_USER = { username: 'demo', displayName: 'Demo Player' }
// The demo account can also be opened from the login form with this password
export const DEMO_PASSWORD = 'demo'
export const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,20}$/
export const PASSWORD_MIN = 8

// The status you show to friends. Playing a game shows as playing unless you're invisible.
export const STATUSES = {
  online: { label: 'Online', description: 'Friends can see you’re around.' },
  away: { label: 'Away', description: 'You’re here, just not at your keyboard.' },
  invisible: { label: 'Invisible', description: 'You appear offline, even while playing.' },
}

export const ACCENTS = {
  blue: { label: 'Blue', swatch: '#2e84ff' },
  purple: { label: 'Purple', swatch: '#8b5cf6' },
  green: { label: 'Green', swatch: '#22c55e' },
  orange: { label: 'Orange', swatch: '#f97316' },
  pink: { label: 'Pink', swatch: '#ec4899' },
}

export const THEMES = {
  dark: { label: 'Dark' },
  light: { label: 'Light' },
  system: { label: 'Match my system' },
}

// Simulated download speeds in GB per second.
export const CONNECTIONS = {
  turbo: { label: 'Demo turbo', description: 'Downloads finish in seconds, handy for trying the launcher out.', min: 3, max: 6 },
  gigabit: { label: '1 Gbps fiber', description: 'A fast home connection. A large game takes about 15 minutes.', min: 0.105, max: 0.118 },
  broadband: { label: '100 Mbps broadband', description: 'A typical connection. Large games take a few hours.', min: 0.0105, max: 0.0118 },
}

// Simulated download servers. `speed` is the share of your connection a region delivers; `ping` is shown for flavour.
export const REGIONS = {
  auto: { label: 'Auto-detect (recommended)', group: 'Automatic', ping: 12, speed: 1 },
  'eu-central': { label: 'Frankfurt', group: 'Europe', ping: 12, speed: 1 },
  'eu-west': { label: 'London', group: 'Europe', ping: 18, speed: 0.97 },
  'eu-north': { label: 'Stockholm', group: 'Europe', ping: 29, speed: 0.93 },
  'us-east': { label: 'US East (New York)', group: 'Americas', ping: 31, speed: 0.94 },
  'us-central': { label: 'US Central (Chicago)', group: 'Americas', ping: 47, speed: 0.91 },
  'us-west': { label: 'US West (Los Angeles)', group: 'Americas', ping: 68, speed: 0.88 },
  'sa-east': { label: 'South America (São Paulo)', group: 'Americas', ping: 196, speed: 0.62 },
  'me-central': { label: 'Middle East (Dubai)', group: 'Middle East & Africa', ping: 94, speed: 0.74 },
  'af-south': { label: 'Africa (Johannesburg)', group: 'Middle East & Africa', ping: 177, speed: 0.58 },
  'as-south': { label: 'India (Mumbai)', group: 'Asia & Pacific', ping: 133, speed: 0.66 },
  'as-sg': { label: 'Singapore', group: 'Asia & Pacific', ping: 148, speed: 0.72 },
  'as-jp': { label: 'Japan (Tokyo)', group: 'Asia & Pacific', ping: 162, speed: 0.7 },
  'as-kr': { label: 'South Korea (Seoul)', group: 'Asia & Pacific', ping: 171, speed: 0.68 },
  'oc-au': { label: 'Australia (Sydney)', group: 'Asia & Pacific', ping: 231, speed: 0.6 },
}

// Download speed caps, in GB per second (shown to people in MB/s).
export const BANDWIDTH_LIMITS = {
  none: { label: 'No limit', gbps: null },
  '1': { label: '1 MB/s', gbps: 1 / 1024 },
  '5': { label: '5 MB/s', gbps: 5 / 1024 },
  '10': { label: '10 MB/s', gbps: 10 / 1024 },
  '25': { label: '25 MB/s', gbps: 25 / 1024 },
  '50': { label: '50 MB/s', gbps: 50 / 1024 },
  '100': { label: '100 MB/s', gbps: 100 / 1024 },
}

export const AUTO_UPDATE_MODES = {
  always: { label: 'Always keep my games up to date', description: 'Updates download as soon as they are available.' },
  scheduled: { label: 'Only during the update window', description: 'Updates wait for the hours you choose below.' },
  manual: { label: 'Never, I will update games myself', description: 'Updates show up in your library and Downloads page.' },
}

// Simulated install drives. `usedGB` is space already taken by other files.
export const DRIVES = {
  c: { label: 'Local Disk (C:)', path: 'C:\\Program Files\\Ultimate\\Games', capacityGB: 1000, usedGB: 312 },
  d: { label: 'Games (D:)', path: 'D:\\UltimateLibrary', capacityGB: 2000, usedGB: 140 },
}

// Space used on each drive: other files plus the games installed there.
export function driveUsage(library) {
  return Object.entries(DRIVES).map(([id, drive]) => {
    const gamesGB = library.filter((e) => e.installed && (e.drive ?? 'c') === id).reduce((sum, e) => sum + (getGame(e.slug).sizeGB ?? 0), 0)
    const usedGB = drive.usedGB + gamesGB
    return { id, ...drive, gamesGB, freeGB: Math.max(0, drive.capacityGB - usedGB), percent: Math.min(100, (usedGB / drive.capacityGB) * 100) }
  })
}

// Which notification types each notification setting covers.
export const NOTIFICATION_SETTINGS = {
  sales: { label: 'Sales and releases', description: 'When a game on your wishlist is discounted or comes out, and when a pre-order unlocks.', types: ['sale', 'release'] },
  downloads: { label: 'Downloads and updates', description: 'When a game finishes installing or updating.', types: ['download', 'update'] },
  social: { label: 'Friends, messages and gifts', description: 'Friend requests, messages from friends and games gifted to you.', types: ['friend', 'gift', 'message'] },
  achievements: { label: 'Achievements', description: 'When you unlock an achievement.', types: ['achievement'] },
}

export const DEFAULT_SETTINGS = {
  accent: 'blue',
  connection: 'turbo',
  autoInstall: false,
  region: 'auto',
  bandwidthLimit: 'none',
  showBits: false,
  // Downloads only run between start and end (local time) when enabled.
  schedule: { enabled: false, start: '01:00', end: '07:00' },
  autoUpdate: 'always',
  updateWindow: { start: '02:00', end: '06:00' },
  installDrive: 'c',
  // Demo: every real second of play counts as a minute, so achievements unlock while you watch.
  fastPlaytime: true,
  notify: { sales: true, downloads: true, social: true, achievements: true },
}

// Per-device preferences that apply whether or not someone is signed in.
// `sidebar` is 'expanded' or 'collapsed' (icons only, on wide screens).
export const DEFAULT_PREFS = { theme: 'dark', currency: 'USD', birthDate: null, sidebar: 'expanded' }

export const REFUND_DAYS = 14
export const REFUND_MINUTES = 120
export const WALLET_AMOUNTS = [5, 10, 25, 50, 100]
// Demo gift card codes, each redeemable once per account.
export const GIFT_CODES = { 'ULTIMATE-DEMO-20': 20, 'WELCOME-5': 5 }
