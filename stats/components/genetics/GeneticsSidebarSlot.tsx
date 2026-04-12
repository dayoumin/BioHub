'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { GeneticsHistorySidebar } from './GeneticsHistorySidebar'

export function GeneticsSidebarSlot(): React.ReactElement | null {
  const pathname = usePathname()

  if (pathname === '/genetics') {
    return null
  }

  return (
    <Suspense>
      <GeneticsHistorySidebar />
    </Suspense>
  )
}
