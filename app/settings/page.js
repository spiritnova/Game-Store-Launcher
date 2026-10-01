import SettingsView from '../Components/Settings/SettingsView'

export const metadata = {
  title: 'Profile & settings',
  description: 'Edit your profile, appearance and download settings.',
}

export default function Settings() {
  return (
    <main className="container">
      <SettingsView />
    </main>
  )
}
