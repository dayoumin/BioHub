'use client'

import { ReactNode } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { MultiTabWarning } from '@/components/multi-tab-warning'
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
      <PyodidePreloader />
      <MultiTabWarning />
      {children}
    </NextThemesProvider>
  )
}