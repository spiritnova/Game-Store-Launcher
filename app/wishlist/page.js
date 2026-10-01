import WishlistView from '../Components/Wishlist/WishlistView'

export const metadata = {
  title: 'Wishlist',
  description: 'Games you saved for later.',
}

export default function Wishlist() {
  return (
    <main className="container">
      <WishlistView />
    </main>
  )
}
