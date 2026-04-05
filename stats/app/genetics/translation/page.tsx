'use client'

import dynamic from 'next/dynamic'

const TranslationContent = dynamic(() => import('./TranslationContent'), { ssr: false })

export default function TranslationPage(): React.ReactElement {
  return <TranslationContent />
}
