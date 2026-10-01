import Skeleton, { CardGridSkeleton } from './Components/UI/Skeleton'

// Shown instantly while the next page loads, so sidebar navigation always responds right away.
export default function Loading() {
  return (
    <main className="container" aria-busy="true" aria-label="Loading page">
      <div style={{ paddingTop: '2.5rem', marginBottom: '2rem' }}>
        <Skeleton width="220px" height="2rem" />
        <Skeleton width="140px" height="1rem" />
      </div>
      <CardGridSkeleton count={6} />
    </main>
  )
}
