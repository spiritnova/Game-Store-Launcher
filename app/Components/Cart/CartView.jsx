'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { bundlePrice, cardImage, editionPrice, getBundle, getEdition, getGame } from '@/lib/games'
import { placeholderColor } from '@/lib/image-colors'
import { useDownloads } from '@/lib/downloads'
import { DEMO_USER, useStore } from '@/lib/store'
import Button from '../UI/Button'
import Skeleton from '../UI/Skeleton'
import styles from './CartView.module.css'

// Normalizes a cart item (single game or bundle) into what the cart displays and charges.
function describe(item, owns, profileOf) {
  if (item.type === 'game') {
    const game = getGame(item.slug)
    const edition = getEdition(game, item.edition)
    const editionLabel = edition.id === 'standard' ? game.publisher : edition.name
    return {
      id: item.id,
      title: game.title,
      subtitle: item.gift ? `Gift for ${profileOf(item.gift.to).displayName} · ${editionLabel}` : editionLabel,
      gift: item.gift,
      href: `/games/${game.slug}`,
      image: cardImage(game),
      original: edition.price,
      price: editionPrice(game, edition),
    }
  }
  const bundle = getBundle(item.slug)
  const price = bundlePrice(bundle, owns)
  const ownedCount = bundle.games.length - price.games.length
  return {
    id: item.id,
    title: bundle.title,
    subtitle: `Bundle · ${price.games.map((g) => g.title).join(', ')}${ownedCount ? ` (${ownedCount} already owned, not charged)` : ''}`,
    href: `/games/${bundle.games[0]}`,
    image: cardImage(getGame(bundle.games[0])),
    bundle: true,
    original: price.games.reduce((sum, game) => sum + game.price, 0),
    price: price.price,
  }
}

function OrderConfirmation({ order, autoInstalled }) {
  const { formatPrice, profileOf } = useStore()
  const bought = order.purchases.length
  return (
    <div className={styles.confirmation}>
      <CheckCircleIcon className={styles.check} />
      <h2>Thanks for your purchase!</h2>
      <p>
        {bought > 0 && <>{bought === 1 ? '1 game was' : `${bought} games were`} added to your library. </>}
        {order.gifts.length > 0 && <>{order.gifts.length === 1 ? '1 gift was' : `${order.gifts.length} gifts were`} sent. </>}
        Order total: {formatPrice(order.total)}.
        {autoInstalled && bought > 0 && ' Downloads have started.'}
      </p>
      <ul className={styles.purchased}>
        {order.purchases.map(({ game, edition }) => (
          <li key={game.slug}>
            {game.title}
            {edition.id !== 'standard' && ` · ${edition.name}`}
          </li>
        ))}
        {order.gifts.map(({ game, to }) => (
          <li key={`${game.slug}-${to}`}>
            <CardGiftcardIcon fontSize="inherit" /> {game.title} for {profileOf(to).displayName}
          </li>
        ))}
      </ul>
      <p className={styles.orderId}>Order {order.transactionId}</p>
      <div className={styles.confirmationActions}>
        {bought > 0 && <Button href={autoInstalled ? '/downloads' : '/library'}>{autoInstalled ? 'View downloads' : 'Go to your library'}</Button>}
        <Button href="/settings#purchases" variant="ghost">View receipt</Button>
        <Button href="/games" variant="ghost">Keep shopping</Button>
      </div>
    </div>
  )
}

export default function CartView() {
  const { hydrated, session, settings, cart, owns, wallet, profileOf, removeFromCart, checkout, signIn, formatPrice, formatMoney } = useStore()
  const downloads = useDownloads()
  const [order, setOrder] = useState(null)
  const [method, setMethod] = useState(null)
  const [error, setError] = useState(null)

  const lines = cart.map((item) => describe(item, owns, profileOf))
  const subtotal = lines.reduce((sum, line) => sum + line.original, 0)
  const total = lines.reduce((sum, line) => sum + line.price, 0)
  const savings = subtotal - total
  const walletCovers = wallet.balance + 0.001 >= total
  // Pay from the wallet by default when it covers the order
  const payWith = method === 'wallet' && !walletCovers ? 'card' : method ?? (walletCovers ? 'wallet' : 'card')

  function purchase() {
    const result = checkout(payWith)
    if (!result) return
    if (result.error) return setError(result.error)
    if (settings.autoInstall) result.purchases.forEach(({ game }) => downloads.install(game))
    setOrder({ ...result, autoInstalled: settings.autoInstall })
  }

  return (
    <>
      <header className={styles.header}>
        <h1>Your cart</h1>
        {hydrated && !order && lines.length > 0 && (
          <p>{lines.length} {lines.length === 1 ? 'item' : 'items'}</p>
        )}
      </header>

      {!hydrated ? (
        <div className={styles.layout} aria-busy="true" aria-label="Loading">
          <Skeleton height="132px" radius="8px" />
          <Skeleton height="220px" radius="8px" />
        </div>
      ) : order ? (
        <OrderConfirmation order={order} autoInstalled={order.autoInstalled} />
      ) : lines.length === 0 ? (
        <div className={styles.empty}>
          <h2>Your cart is empty</h2>
          <p>Add games from the store and check out when you are ready.</p>
          <div className={styles.confirmationActions}>
            <Button href="/games">Browse games</Button>
            <Button href="/games?sale=1" variant="ghost">See current deals</Button>
          </div>
        </div>
      ) : (
        <div className={styles.layout}>
          <ul className={styles.items}>
            {lines.map((line) => (
              <li key={line.id} className={styles.item}>
                <Link
                  href={line.href}
                  className={styles.media}
                  tabIndex={-1}
                  aria-hidden="true"
                  style={{ backgroundColor: placeholderColor(line.image) }}
                >
                  <Image src={line.image} alt="" fill sizes="80px" />
                  {line.bundle && <span className={styles.bundleTag}>Bundle</span>}
                  {line.gift && <span className={styles.bundleTag}>Gift</span>}
                </Link>
                <div className={styles.info}>
                  <h2>
                    <Link href={line.href}>{line.title}</Link>
                  </h2>
                  <p>{line.subtitle}</p>
                  {line.gift?.message && <p className={styles.giftMessage}>“{line.gift.message}”</p>}
                </div>
                <div className={styles.price}>
                  {line.original > line.price && <s>{formatPrice(line.original)}</s>}
                  <span>{formatPrice(line.price)}</span>
                </div>
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => removeFromCart(line.id)}
                  aria-label={`Remove ${line.title} from cart`}
                  title="Remove"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </button>
              </li>
            ))}
          </ul>

          <aside className={styles.summary} aria-labelledby="summary-title">
            <h2 id="summary-title">Order summary</h2>
            <dl>
              <div>
                <dt>Subtotal</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              {savings > 0.004 && (
                <div className={styles.savings}>
                  <dt>Sale &amp; bundle discounts</dt>
                  <dd>−{formatPrice(savings)}</dd>
                </div>
              )}
              <div className={styles.total}>
                <dt>Total</dt>
                <dd>{formatPrice(total)}</dd>
              </div>
            </dl>

            {session ? (
              <>
                {total > 0 && (
                  <fieldset className={styles.payment}>
                    <legend>Pay with</legend>
                    <label className={styles.method}>
                      <input type="radio" name="payment" value="wallet" checked={payWith === 'wallet'} disabled={!walletCovers} onChange={() => { setMethod('wallet'); setError(null) }} />
                      <span>
                        <strong>Ultimate Wallet</strong>
                        <span>{formatMoney(wallet.balance)} available{!walletCovers && ', not enough for this order'}</span>
                      </span>
                    </label>
                    <label className={styles.method}>
                      <input type="radio" name="payment" value="card" checked={payWith === 'card'} onChange={() => { setMethod('card'); setError(null) }} />
                      <span>
                        <strong>Card ending 4242</strong>
                        <span>Simulated, nothing is charged</span>
                      </span>
                    </label>
                    {!walletCovers && <Link href="/settings#wallet" className={styles.addFunds}>Add funds to your wallet</Link>}
                  </fieldset>
                )}
                {error && <p className={styles.error} role="alert">{error}</p>}
                <Button size="large" onClick={purchase}>
                  {total === 0 ? 'Get for free' : `Purchase for ${formatPrice(total)}`}
                </Button>
              </>
            ) : (
              <div className={styles.signIn}>
                <p>Sign in to complete your purchase.</p>
                <Button size="large" onClick={() => signIn(DEMO_USER)}>Continue as demo player</Button>
                <Button href="/signin?next=%2Fcart" variant="ghost">Sign in</Button>
              </div>
            )}
            <p className={styles.note}>This is a demo store. No payment is taken.</p>
          </aside>
        </div>
      )}
    </>
  )
}
