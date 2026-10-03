import { Suspense } from 'react'
import AuthForm from '../../Components/Account/AuthForm'

export const metadata = {
  title: 'Create an account',
  description: 'Create an Ultimate Game Launcher account.',
}

export default function Register() {
  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  )
}
