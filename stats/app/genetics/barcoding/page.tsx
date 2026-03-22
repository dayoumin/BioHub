'use client'

import dynamic from 'next/dynamic'

/** useSearchParams() 사용 컴포넌트를 dynamic import — static export prerender 우회 */
const BarcodingContent = dynamic(() => import('./BarcodingContent'), { ssr: false })

export default function BarcodingPage(): React.ReactElement {
  return <BarcodingContent />
}
