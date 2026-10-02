import { DEMO_PLAYERS, getPlayer } from '@/lib/players'
import ProfileView from '@/app/Components/Profile/ProfileView'

// Demo players are generated at build time; accounts created in the browser render on request
// (their data only exists in that browser, so the page fills in on the client).
export function generateStaticParams() {
  return DEMO_PLAYERS.map((player) => ({ username: player.username }))
}

export function generateMetadata({ params }) {
  const username = decodeURIComponent(params.username)
  const player = getPlayer(username)
  return {
    title: player ? `${player.displayName}’s profile` : `@${username}`,
    description: player?.bio ?? 'A player profile on Ultimate Game Launcher.',
  }
}

export default function Profile({ params }) {
  return (
    <main className="container">
      <ProfileView username={decodeURIComponent(params.username).toLowerCase()} />
    </main>
  )
}
