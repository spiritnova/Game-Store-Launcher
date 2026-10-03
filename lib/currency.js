// Display currencies. Every price is stored in US dollars and converted with fixed demo rates,
// so totals, discounts and refunds always add up the same way whichever currency is shown.
export const CURRENCIES = {
  USD: { label: 'US dollar', rate: 1 },
  EUR: { label: 'Euro', rate: 0.86 },
  GBP: { label: 'British pound', rate: 0.75 },
  CAD: { label: 'Canadian dollar', rate: 1.39 },
  AUD: { label: 'Australian dollar', rate: 1.52 },
  JPY: { label: 'Japanese yen', rate: 148 },
  BRL: { label: 'Brazilian real', rate: 5.35 },
  INR: { label: 'Indian rupee', rate: 88 },
}

const formatters = {}

function formatter(code) {
  formatters[code] ??= new Intl.NumberFormat('en-US', { style: 'currency', currency: code })
  return formatters[code]
}

export function formatMoney(usd, code = 'USD') {
  const currency = CURRENCIES[code] ? code : 'USD'
  return formatter(currency).format(usd * CURRENCIES[currency].rate)
}

export function formatPrice(usd, code = 'USD') {
  return usd === 0 ? 'Free' : formatMoney(usd, code)
}
