import DownloadsView from '../Components/Downloads/DownloadsView'

export const metadata = {
  title: 'Downloads',
  description: 'Manage your download queue and installed games.',
}

export default function Downloads() {
  return (
    <main className="container">
      <DownloadsView />
    </main>
  )
}
