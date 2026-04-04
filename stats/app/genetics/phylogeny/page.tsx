'use client'

import dynamic from 'next/dynamic'

const PhylogenyContent = dynamic(() => import('./PhylogenyContent'), { ssr: false })

export default function PhylogenyPage() {
  return <PhylogenyContent />
}
