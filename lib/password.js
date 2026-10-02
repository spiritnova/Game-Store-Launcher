// Password hashing for the demo's local accounts. Accounts only live in this browser's storage, so this
// isn't real security, but passwords are never stored as plain text: each account keeps a random salt
// and a SHA-256 hash of salt + password.

const toHex = (buffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')

export async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  return toHex(await crypto.subtle.digest('SHA-256', data))
}

export async function makeCredentials(password) {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)))
  return { salt, hash: await hashPassword(password, salt) }
}

export async function checkPassword(password, credentials) {
  return (await hashPassword(password, credentials.salt)) === credentials.hash
}

// 0–4, for the strength meter on the register form
export function passwordStrength(password) {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password) && /[^a-zA-Z0-9]/.test(password)) score++
  return score
}
