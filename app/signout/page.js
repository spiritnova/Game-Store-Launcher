import { Suspense } from 'react'
import SignOutView from '../Components/Account/SignOutView'

export const metadata = {
  title: 'Sign out',
  description: 'Sign out of Ultimate Game Launcher.',
}

export default function SignOut() {
  return (
    <main className="container">
      {/* SignOutView reads ?next= from the URL, which requires a Suspense boundary for static rendering */}
      <Suspense>
        <SignOutView />
      </Suspense>
    </main>
  )
}
