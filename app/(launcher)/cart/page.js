import CartView from '../../Components/Cart/CartView'

export const metadata = {
  title: 'Cart',
  description: 'Review the games in your cart and check out.',
}

export default function Cart() {
  return (
    <main className="container">
      <CartView />
    </main>
  )
}
