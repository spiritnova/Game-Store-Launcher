'use client'

import { useStore } from '@/lib/store'
import Button from '../UI/Button'

export default function ResetDemoButton() {
  const { hydrated, resetDemo } = useStore()

  return (
    <Button variant="ghost" onClick={resetDemo} disabled={!hydrated}>
      Reset demo data
    </Button>
  )
}
