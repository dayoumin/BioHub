'use client'

import dynamic from 'next/dynamic'

const SimilarityContent = dynamic(() => import('./SimilarityContent'), { ssr: false })

export default function SimilarityPage() {
  return <SimilarityContent />
}
