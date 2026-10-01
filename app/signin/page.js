import { Suspense } from 'react'
import SignInForm from '../Components/Account/SignInForm'

export const metadata = {
  title: 'Sign in',
  description: 'Sign in to Ultimate to buy games and manage your library.',
}

export default function SignIn() {
  return (
    <main className="container">
      {/* SignInForm reads ?next= from the URL, which requires a Suspense boundary for static rendering */}
      <Suspense>
        <SignInForm />
      </Suspense>
    </main>
  )
}
