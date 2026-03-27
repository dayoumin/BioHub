'use client'

import dynamic from 'next/dynamic'

const BlastSearchContent = dynamic(() => import('./BlastSearchContent'), { ssr: false })

export default function BlastSearchPage(): React.ReactElement {
  return <BlastSearchContent />
}
