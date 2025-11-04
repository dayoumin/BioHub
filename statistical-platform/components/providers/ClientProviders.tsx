'use client'

import { ReactNode } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { MultiTabWarning } from '@/components/multi-tab-warning'

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
      <MultiTabWarning />
      {children}
    </NextThemesProvider>
  )
}