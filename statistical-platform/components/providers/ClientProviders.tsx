'use client'

import { ReactNode } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { MemoryMonitor } from '@/components/memory-monitor'
import { ServiceWorkerProvider } from './ServiceWorkerProvider'
import { PyodidePreloader } from './PyodidePreloader'

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
      <PyodidePreloader />
      {children}
    </NextThemesProvider>
  )
}