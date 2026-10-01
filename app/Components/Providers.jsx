'use client'

import { ToastProvider } from './UI/Toast'
import { StoreProvider } from '@/lib/store'
import { DownloadsProvider } from '@/lib/downloads'

export default function Providers({ children }) {
  return (
    <ToastProvider>
      <StoreProvider>
        <DownloadsProvider>{children}</DownloadsProvider>
      </StoreProvider>
    </ToastProvider>
  )
}
