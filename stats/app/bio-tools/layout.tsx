import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bio-Tools | BioHub',
  description: '생물학 전문 분석 도구 모음',
}

interface BioToolsLayoutProps {
  children: React.ReactNode
}

export default function BioToolsLayout({ children }: BioToolsLayoutProps): React.ReactElement {
  return (
    <div className="flex flex-col h-full min-h-0">
      {children}
    </div>
  )
}
