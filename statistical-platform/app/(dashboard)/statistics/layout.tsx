'use client'

import React from 'react'
import { PyodideProvider } from '@/components/providers/PyodideProvider'

export default function StatisticsLayout({
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
