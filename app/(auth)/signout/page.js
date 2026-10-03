import { Suspense } from 'react'
import SignOutView from '../../Components/Account/SignOutView'

export const metadata = {
  title: 'Sign out',
  description: 'Sign out of Ultimate Game Launcher.',
}

export default function SignOut() {
  return (
    <Suspense>
      <SignOutView />
    </Suspense>
  )
}
