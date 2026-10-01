'use client'

import { ToastProvider } from './UI/Toast'
import { StoreProvider } from '@/lib/store'

export default function Providers({ children }) {
  return (
    <ToastProvider>
      <StoreProvider>{children}</StoreProvider>
    </ToastProvider>
  )
}
