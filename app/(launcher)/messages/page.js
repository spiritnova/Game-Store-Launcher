import { Suspense } from 'react'
import MessagesView from '../../Components/Messages/MessagesView'
import Skeleton from '../../Components/UI/Skeleton'

export const metadata = {
  title: 'Messages',
  description: 'Chat with your friends and plan your next co-op session.',
}

export default function Messages() {
  return (
    <main className="container">
      <Suspense fallback={<Skeleton height="480px" radius="14px" />}>
        <MessagesView />
      </Suspense>
    </main>
  )
}
