'use client'

import { ReactNode } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { MemoryMonitor } from '@/components/memory-monitor'
import { ServiceWorkerProvider } from './ServiceWorkerProvider'

interface ClientProvidersProps {
  children: ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ServiceWorkerProvider />
      <MemoryMonitor />
      {children}
    </NextThemesProvider>
  )
}