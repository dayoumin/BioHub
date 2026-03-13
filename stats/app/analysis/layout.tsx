'use client'

import { PyodideProvider } from '@/components/providers/PyodideProvider'

export default function AnalysisLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PyodideProvider>
      {children}
    </PyodideProvider>
  )
}