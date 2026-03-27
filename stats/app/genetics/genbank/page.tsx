'use client'

import dynamic from 'next/dynamic'

const GenBankContent = dynamic(() => import('./GenBankContent'), { ssr: false })

export default function GenBankPage(): React.ReactElement {
  return <GenBankContent />
}
