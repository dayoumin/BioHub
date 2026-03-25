'use client'

import { Suspense } from 'react'
import { BioToolWorkspace } from '@/components/bio-tools/BioToolWorkspace'

/** useSearchParams를 사용하므로 Suspense 래핑 필요 (Next.js App Router) */
export default function BioToolsPage(): React.ReactElement {
  return (
    <Suspense>
      <BioToolWorkspace />
    </Suspense>
  )
}
