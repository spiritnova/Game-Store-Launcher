import FriendsView from '../Components/Friends/FriendsView'

export const metadata = {
  title: 'Friends',
  description: 'See which friends are online, what they’re playing, and add new friends.',
}

export default function Friends() {
  return (
    <main className="container">
      <FriendsView />
    </main>
  )
}
