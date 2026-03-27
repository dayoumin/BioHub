'use client'

import dynamic from 'next/dynamic'

const LiteratureSearchContent = dynamic(() => import('./LiteratureSearchContent'), { ssr: false })

export default function LiteraturePage(): React.ReactElement {
  return <LiteratureSearchContent />
}
