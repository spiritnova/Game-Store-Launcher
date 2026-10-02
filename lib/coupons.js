// Demo coupon codes for the cart. One coupon per order. The cart previews the discount and checkout
// applies the same calculation, splitting it across items so each one records what was actually paid.
import { getGame } from '@/lib/games'

const toCents = (amount) => Math.round(amount * 100) / 100

// test(line) decides which cart lines a coupon applies to; lines are { slug, price, type }
export const COUPONS = {
  SAVE10: { description: '10% off your order', percent: 10 },
  INDIE25: { description: '25% off indie games', percent: 25, test: (line) => getGame(line.slug)?.genres.includes('Indie') },
  ADDONS15: { description: '15% off DLC and edition upgrades', percent: 15, test: (line) => line.type === 'dlc' || line.type === 'upgrade' },
  BIG15: { description: '$15 off orders of $60 or more', amount: 15, minSpend: 60 },
  FIRSTPLAY: { description: '20% off, once per account', percent: 20, oncePerAccount: true },
}

// { ok, code, coupon, discount, shares } where shares[i] is the discount on lines[i],
// or { ok: false, message } explaining why the code doesn't apply.
// `formatMoney` formats minimum-spend amounts in the shopper's currency.
export function applyCoupon(input, lines, { usedCoupons = [], giftCodes = {}, formatMoney = (n) => `$${n}` } = {}) {
  const code = input.trim().toUpperCase()
  const coupon = COUPONS[code]
  if (!coupon) {
    if (giftCodes[code]) return { ok: false, message: 'That’s a gift card code. Redeem it in Settings → Wallet to add it to your balance.' }
    return { ok: false, message: 'That coupon code isn’t valid.' }
  }
  if (coupon.oncePerAccount && usedCoupons.includes(code)) return { ok: false, message: 'You’ve already used this coupon.' }

  const subtotal = lines.reduce((sum, line) => sum + line.price, 0)
  if (coupon.minSpend && subtotal < coupon.minSpend) {
    return { ok: false, message: `This coupon needs an order of ${formatMoney(coupon.minSpend)} or more.` }
  }
  const eligible = lines.map((line) => line.price > 0 && (!coupon.test || coupon.test(line)))
  const eligibleTotal = lines.reduce((sum, line, i) => sum + (eligible[i] ? line.price : 0), 0)
  if (eligibleTotal === 0) return { ok: false, message: `Nothing in your cart qualifies for ${coupon.description}.` }

  const discount = toCents(coupon.percent ? (eligibleTotal * coupon.percent) / 100 : Math.min(coupon.amount, eligibleTotal))
  // Split in proportion to each line's price; the last eligible line takes the rounding remainder
  const lastEligible = eligible.lastIndexOf(true)
  let allocated = 0
  const shares = lines.map((line, i) => {
    if (!eligible[i]) return 0
    const share = i === lastEligible ? toCents(discount - allocated) : toCents((discount * line.price) / eligibleTotal)
    allocated += share
    return share
  })
  return { ok: true, code, coupon, discount, shares }
}
