'use client'

import dynamic from 'next/dynamic'

const PapersContent = dynamic(() => import('./PapersContent'), { ssr: false })

export default function PapersPage(): React.ReactElement {
  return <PapersContent />
}
