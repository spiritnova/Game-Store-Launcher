import { Suspense } from 'react'
import BrowseGames from '../Components/Browse/BrowseGames'
import { CardGridSkeleton } from '../Components/UI/Skeleton'

export const metadata = {
  title: 'Browse games',
  description: 'Search and filter every game in the Ultimate store by genre, price and discount.',
}

export default function Games() {
  return (
    <main className="container">
      {/* BrowseGames reads the URL's search params, which requires a Suspense boundary for static rendering */}
      <Suspense fallback={<CardGridSkeleton />}>
        <BrowseGames />
      </Suspense>
    </main>
  )
}
