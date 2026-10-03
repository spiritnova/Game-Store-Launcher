import { Suspense } from 'react'
import AuthForm from '../../Components/Account/AuthForm'

export const metadata = {
  title: 'Log in',
  description: 'Log in to Ultimate Game Launcher.',
}

export default function Login() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  )
}
