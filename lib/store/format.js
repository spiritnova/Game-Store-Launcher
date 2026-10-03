const DAY = 24 * 60 * 60 * 1000

// Age in whole years for a "YYYY-MM-DD" birth date.
export function ageFrom(birthDate, now = new Date()) {
  const [y, m, d] = birthDate.split('-').map(Number)
  let age = now.getFullYear() - y
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--
  return age
}

export function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes} min`
  const hours = minutes / 60
  return `${hours < 10 ? Math.round(hours * 10) / 10 : Math.round(hours)} h`
}

export function formatPlaytime(minutes) {
  if (!minutes) return 'Never played'
  if (minutes < 60) return `${minutes} min played`
  return `${Math.round(minutes / 60)} h played`
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function formatRelative(timestamp) {
  const seconds = Math.round((timestamp - Date.now()) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 60) return relative.format(seconds, 'second')
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute')
  if (abs < DAY / 1000) return relative.format(Math.round(seconds / 3600), 'hour')
  return relative.format(Math.round(seconds / 86400), 'day')
}

export function formatLastPlayed(timestamp) {
  if (!timestamp) return null
  const days = Math.round((timestamp - Date.now()) / DAY)
  if (days === 0) return 'Played today'
  return `Played ${relative.format(days, 'day')}`
}

export function formatDateTime(timestamp) {
  return new Date(timestamp).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
