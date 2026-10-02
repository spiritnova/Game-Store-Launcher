// Payments are simulated, but a real one takes a moment: card payments wait a little longer than the
// wallet, and free orders are quickest.
const DELAYS = { card: 2200, wallet: 1300, free: 700 }

export function simulatePayment(method) {
  return new Promise((resolve) => setTimeout(resolve, DELAYS[method] ?? DELAYS.card))
}
