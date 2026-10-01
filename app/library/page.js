import LibraryView from '../Components/Library/LibraryView'

export const metadata = {
  title: 'Library',
  description: 'Install, launch and keep track of the games you own.',
}

export default function Library() {
  return (
    <main className="container">
      <LibraryView />
    </main>
  )
}
