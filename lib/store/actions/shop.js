import { formatMoney } from '@/lib/currency'
import { bundlePrice, formatShortDate, getBundle, getDlc, getEdition, getGame, isReleased, releaseTime } from '@/lib/games'
import { playerOwns } from '@/lib/players'
import { ownedDlc, priceCart, refundCheck } from '../commerce'
import { completeStep, libraryEntry, notification, pushNotification, toCents, transactionId } from '../records'
import { GIFT_CODES } from '../settings'

// Cart, checkout, refunds, wallet and wishlist.
// `ctx` holds the state setters, refs and helpers shared by all actions (built in index.js).
export function shopActions({ dataRef, setData, toast, accountOf, owned, username, updateAccount, findUser, promptSignIn, playingRef, stopPlaying }) {
  function refundDlc(slug, dlcId, check) {
    const dlc = getDlc(getGame(slug), dlcId)
    const now = Date.now()
    const record = { id: transactionId(), type: 'refund', createdAt: now, method: check.method, refundOf: check.transaction.id, items: [{ ...check.item }], total: check.amount }
    updateAccount((acc) => {
      const { [dlcId]: _removed, ...rest } = acc.dlc[slug] ?? {}
      return pushNotification(
        {
          ...acc,
          dlc: { ...acc.dlc, [slug]: rest },
          transactions: [
            record,
            ...acc.transactions.map((t) =>
              t.id === check.transaction.id ? { ...t, items: t.items.map((i) => (i.slug === slug && i.dlc === dlcId && !i.refunded ? { ...i, refunded: now } : i)) } : t
            ),
          ],
          wallet: check.method === 'wallet' ? { balance: toCents(acc.wallet.balance + check.amount) } : acc.wallet,
        },
        notification('refund', {
          slug,
          title: `Refund issued for ${dlc.title}`,
          body: `${formatMoney(check.amount, dataRef.current.prefs.currency)} was returned to your ${check.method === 'wallet' ? 'wallet' : 'card'}.`,
          href: '/settings#purchases',
        })
      )
    })
    toast({ message: `${dlc.title} was refunded.`, href: '/settings#purchases', actionLabel: 'View purchases' })
  }

  return {
    // ---------- Cart & checkout ----------
    addToCart(game, editionId = 'standard') {
      if (owned(game.slug)) return
      const coveredBy = dataRef.current.cart.find((item) => item.type === 'bundle' && getBundle(item.slug).games.includes(game.slug))
      if (coveredBy) {
        toast({ message: `${game.title} is already in your cart as part of ${getBundle(coveredBy.slug).title}.`, href: '/cart', actionLabel: 'View cart' })
        return
      }
      const edition = getEdition(game, editionId)
      setData((d) => ({
        ...d,
        cart: [
          ...d.cart.filter((item) => item.id !== `game:${game.slug}`),
          { id: `game:${game.slug}`, type: 'game', slug: game.slug, edition: edition.id, addedAt: Date.now() },
        ],
      }))
      const label = edition.id === 'standard' ? game.title : `${game.title} (${edition.name})`
      toast({ message: `${label} was added to your cart.`, href: '/cart', actionLabel: 'View cart' })
    },
    // Returns { ok, message } so the gift form can show what went wrong.
    addGiftToCart(game, editionId, to, message = '') {
      if (!username()) return { ok: false, message: 'Sign in to send gifts.' }
      const recipient = findUser(to)
      if (!recipient) return { ok: false, message: `No player called “${to.trim()}” was found.` }
      if (recipient.username === username()) return { ok: false, message: 'Gifts are for other players. Add the game to your cart instead.' }
      if (accountOf(dataRef.current).blocked.some((b) => b.username === recipient.username)) return { ok: false, message: `You blocked ${recipient.displayName}. Unblock them to send a gift.` }
      if (recipient.local && dataRef.current.accounts[recipient.username].blocked.some((b) => b.username === username())) {
        return { ok: false, message: `You can’t send gifts to ${recipient.displayName}.` }
      }
      const theyOwn = recipient.local
        ? dataRef.current.accounts[recipient.username].library.some((e) => e.slug === game.slug)
        : playerOwns(recipient.username, game.slug)
      if (theyOwn) return { ok: false, message: `${recipient.displayName} already owns ${game.title}.` }
      const edition = getEdition(game, editionId)
      const id = `gift:${game.slug}:${recipient.username}`
      setData((d) => ({
        ...d,
        cart: [
          ...d.cart.filter((item) => item.id !== id),
          { id, type: 'game', slug: game.slug, edition: edition.id, gift: { to: recipient.username, message: message.trim() }, addedAt: Date.now() },
        ],
      }))
      toast({ message: `${game.title} was added to your cart as a gift for ${recipient.displayName}.`, href: '/cart', actionLabel: 'View cart' })
      return { ok: true }
    },
    addBundleToCart(bundle) {
      if (bundlePrice(bundle, owned).games.length === 0) return
      setData((d) => ({
        ...d,
        cart: [
          // The bundle replaces any of its games already in the cart
          ...d.cart.filter((item) => !(item.type === 'game' && !item.gift && bundle.games.includes(item.slug)) && item.id !== `bundle:${bundle.slug}`),
          { id: `bundle:${bundle.slug}`, type: 'bundle', slug: bundle.slug, addedAt: Date.now() },
        ],
      }))
      toast({ message: `${bundle.title} was added to your cart.`, href: '/cart', actionLabel: 'View cart' })
    },
    addDlcToCart(game, dlcId) {
      const dlc = getDlc(game, dlcId)
      if (!dlc || ownedDlc(accountOf(dataRef.current), game.slug).all.includes(dlcId)) return
      const id = `dlc:${game.slug}:${dlcId}`
      setData((d) => ({ ...d, cart: [...d.cart.filter((item) => item.id !== id), { id, type: 'dlc', slug: game.slug, dlc: dlcId, addedAt: Date.now() }] }))
      toast({ message: `${dlc.title} was added to your cart.`, href: '/cart', actionLabel: 'View cart' })
    },
    addUpgradeToCart(game, editionId) {
      const entry = accountOf(dataRef.current)?.library.find((e) => e.slug === game.slug)
      const edition = getEdition(game, editionId)
      if (!entry || getEdition(game, entry.edition).price >= edition.price) return
      const id = `upgrade:${game.slug}`
      setData((d) => ({ ...d, cart: [...d.cart.filter((item) => item.id !== id), { id, type: 'upgrade', slug: game.slug, edition: edition.id, addedAt: Date.now() }] }))
      toast({ message: `The ${edition.name} upgrade for ${game.title} was added to your cart.`, href: '/cart', actionLabel: 'View cart' })
    },
    // Returns { ok, message }
    applyCouponCode(input) {
      const result = priceCart({ ...dataRef.current, coupon: input.trim().toUpperCase() }).coupon
      if (!result?.ok) return { ok: false, message: result?.message ?? 'That coupon code isn’t valid.' }
      setData((d) => ({ ...d, coupon: result.code }))
      return { ok: true, message: `${result.code} applied: ${result.coupon.description}.` }
    },
    removeCoupon() {
      setData((d) => ({ ...d, coupon: null }))
    },
    removeFromCart(itemId) {
      setData((d) => ({ ...d, cart: d.cart.filter((item) => item.id !== itemId) }))
    },
    // Buys everything in the cart with `method` ('card' or 'wallet').
    // Returns { purchases, gifts, total, transactionId }, { error } when the wallet is short, or null when signed out.
    checkout(method = 'card') {
      const d = dataRef.current
      const me = accountOf(d)
      if (!me) return null
      const { items, purchases, gifts, dlcBought, upgrades, coupon, total } = priceCart(d)
      if (method === 'wallet' && me.wallet.balance + 0.001 < total) return { error: 'Your wallet balance is too low for this order.' }
      const now = Date.now()
      const record = { id: transactionId(), type: 'purchase', createdAt: now, method: total === 0 ? 'free' : method, items, total, ...(coupon?.ok ? { coupon: coupon.code } : {}) }
      const bought = new Set(purchases.map((p) => p.game.slug))
      const sender = d.session.username

      setData((current) => {
        const accounts = { ...current.accounts }
        const mine = accounts[sender]
        const dlc = { ...mine.dlc }
        for (const { game, dlc: item } of dlcBought) {
          const playtime = mine.library.find((e) => e.slug === game.slug)?.playtimeMinutes ?? 0
          dlc[game.slug] = { ...dlc[game.slug], [item.id]: { purchasedAt: now, playtimeAtPurchase: playtime } }
        }
        const upgraded = new Map(upgrades.map((u) => [u.game.slug, u.to.id]))
        let updated = {
          ...mine,
          dlc,
          usedCoupons: coupon?.ok ? [...new Set([...mine.usedCoupons, coupon.code])] : mine.usedCoupons,
          library: [
            ...mine.library.map((e) => (upgraded.has(e.slug) ? { ...e, edition: upgraded.get(e.slug) } : e)),
            ...purchases.map((p) => libraryEntry(p.game.slug, { edition: p.edition.id, purchasedAt: now, preordered: !isReleased(p.game, now) })),
          ],
          wishlist: mine.wishlist.filter((entry) => !bought.has(entry.slug)),
          transactions: [record, ...mine.transactions],
          wallet: method === 'wallet' ? { balance: toCents(mine.wallet.balance - total) } : mine.wallet,
        }
        if (purchases.length > 0) updated = completeStep(updated, 'buy')
        if (purchases.some((p) => !isReleased(p.game, now))) updated = completeStep(updated, 'preorder')
        accounts[sender] = updated
        // Gifts to local accounts land in their library straight away
        for (const gift of gifts) {
          const them = accounts[gift.to]
          if (!them) continue
          accounts[gift.to] = pushNotification(
            { ...them, library: [...them.library, libraryEntry(gift.game.slug, { edition: gift.edition.id, purchasedAt: now, giftFrom: sender, preordered: !isReleased(gift.game, now) })], wishlist: them.wishlist.filter((w) => w.slug !== gift.game.slug) },
            notification('gift', {
              slug: gift.game.slug,
              title: `${mine.profile.displayName} sent you ${gift.game.title}`,
              body: gift.message || (isReleased(gift.game, now) ? 'It’s in your library, ready to install.' : `It’s a pre-order that unlocks on ${formatShortDate(releaseTime(gift.game))}.`),
              href: `/games/${gift.game.slug}`,
            })
          )
        }
        return { ...current, accounts, cart: [], coupon: null }
      })
      return { purchases, gifts, dlc: dlcBought, upgrades, total, transactionId: record.id }
    },

    refund(slug, dlcId = null) {
      const me = accountOf(dataRef.current)
      const check = refundCheck(me, slug, dlcId)
      if (!check?.eligible) return
      if (dlcId) return refundDlc(slug, dlcId, check)
      if (playingRef.current?.slug === slug) stopPlaying({ quiet: true })
      const game = getGame(slug)
      const now = Date.now()
      const record = { id: transactionId(), type: 'refund', createdAt: now, method: check.method, refundOf: check.transaction.id, items: [{ ...check.item }], total: check.amount }
      // Each upgrade is refunded to whatever paid for it
      const upgradeRecords = check.upgrades.map((u) => ({ id: transactionId(), type: 'refund', createdAt: now, method: u.transaction.method, refundOf: u.transaction.id, items: [{ ...u.item }], total: u.item.price }))
      const toWallet = [record, ...upgradeRecords].filter((r) => r.method === 'wallet').reduce((sum, r) => sum + r.total, 0)
      const upgradeTx = new Set(check.upgrades.map((u) => u.transaction.id))
      updateAccount((acc) =>
        pushNotification(
          {
            ...acc,
            library: acc.library.filter((e) => e.slug !== slug),
            collections: acc.collections.map((c) => ({ ...c, slugs: c.slugs.filter((s) => s !== slug) })),
            transactions: [
              ...upgradeRecords,
              record,
              ...acc.transactions.map((t) => {
                if (t.id !== check.transaction.id && !upgradeTx.has(t.id)) return t
                return { ...t, items: t.items.map((i) => (i.slug === slug && !i.dlc && !i.giftTo && !i.refunded ? { ...i, refunded: now } : i)) }
              }),
            ],
            wallet: toWallet > 0 ? { balance: toCents(acc.wallet.balance + toWallet) } : acc.wallet,
          },
          notification('refund', {
            slug,
            title: `Refund issued for ${game.title}`,
            body: `${formatMoney(check.total, dataRef.current.prefs.currency)} was returned to your ${check.method === 'wallet' ? 'wallet' : 'card'}.`,
            href: '/settings#purchases',
          })
        )
      )
      toast({ message: `${game.title} was refunded and removed from your library.`, href: '/settings#purchases', actionLabel: 'View purchases' })
    },

    // ---------- Wallet ----------
    addFunds(amount) {
      if (!username()) return
      const record = { id: transactionId(), type: 'funds', createdAt: Date.now(), method: 'card', items: [{ title: 'Wallet funds', original: amount, price: amount }], total: amount }
      updateAccount((acc) => ({ ...acc, wallet: { balance: toCents(acc.wallet.balance + amount) }, transactions: [record, ...acc.transactions] }))
      toast({ message: `${formatMoney(amount, dataRef.current.prefs.currency)} was added to your wallet.` })
    },
    // Returns { ok, message }
    redeemCode(input) {
      const me = accountOf(dataRef.current)
      if (!me) return { ok: false, message: 'Sign in to redeem a code.' }
      const code = input.trim().toUpperCase()
      const value = GIFT_CODES[code]
      if (!value) return { ok: false, message: 'That code isn’t valid. Check it and try again.' }
      if (me.redeemedCodes.includes(code)) return { ok: false, message: 'You have already redeemed this code.' }
      const record = { id: transactionId(), type: 'funds', createdAt: Date.now(), method: 'code', items: [{ title: `Gift card ${code}`, original: value, price: value }], total: value }
      updateAccount((acc) => ({
        ...acc,
        wallet: { balance: toCents(acc.wallet.balance + value) },
        redeemedCodes: [...acc.redeemedCodes, code],
        transactions: [record, ...acc.transactions],
      }))
      const message = `${formatMoney(value, dataRef.current.prefs.currency)} was added to your wallet.`
      toast({ message })
      return { ok: true, message }
    },

    // ---------- Wishlist ----------
    toggleWishlist(game) {
      const acc = accountOf(dataRef.current)
      if (!acc) return promptSignIn('Sign in to save games to your wishlist.')
      if (acc.wishlist.some((entry) => entry.slug === game.slug)) {
        updateAccount((a) => ({ ...a, wishlist: a.wishlist.filter((entry) => entry.slug !== game.slug) }))
        toast({ message: `Removed ${game.title} from your wishlist.` })
      } else {
        updateAccount((a) => ({ ...a, wishlist: [...a.wishlist, { slug: game.slug, addedAt: Date.now() }] }))
        toast({ message: `Added ${game.title} to your wishlist.`, href: '/wishlist', actionLabel: 'View wishlist' })
      }
    },

  }
}
