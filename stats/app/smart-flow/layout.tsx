'use client'

import { PyodideProvider } from '@/components/providers/PyodideProvider'

export default function SmartFlowLayout({
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