'use client'

import { useDownloads } from '@/lib/downloads'
import { useStore } from '@/lib/store'
import Button from '../UI/Button'

export default function ResetDemoButton() {
  const { hydrated, resetDemo } = useStore()
  const downloads = useDownloads()

  return (
    <Button variant="ghost" onClick={() => { downloads.reset(); resetDemo() }} disabled={!hydrated}>
      Reset demo data
    </Button>
  )
}
