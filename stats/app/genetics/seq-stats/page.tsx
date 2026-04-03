// stats/app/genetics/seq-stats/page.tsx
'use client'

import dynamic from 'next/dynamic'

const SeqStatsContent = dynamic(() => import('./SeqStatsContent'), { ssr: false })

export default function SeqStatsPage(): React.ReactElement {
  return <SeqStatsContent />
}
