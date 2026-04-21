import React from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import {
  AppPreferencesProvider,
  type AppLanguageCode,
  type AppTerminologyDomain,
} from '@/lib/preferences'

interface AppPreferencesWrapperOptions {
  language?: AppLanguageCode
  domain?: AppTerminologyDomain
}

interface AppPreferencesRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  language?: AppLanguageCode
  domain?: AppTerminologyDomain
}

export function createAppPreferencesWrapper({
  language = 'ko',
  domain = 'aquaculture',
}: AppPreferencesWrapperOptions = {}) {
  return function AppPreferencesWrapper({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
      <AppPreferencesProvider initialLanguage={language} initialDomain={domain}>
        {children}
      </AppPreferencesProvider>
    )
  }
}

export function renderWithAppPreferences(
  ui: React.ReactElement,
  {
    language = 'ko',
    domain = 'aquaculture',
    ...options
  }: AppPreferencesRenderOptions = {},
) {
  return render(ui, {
    wrapper: createAppPreferencesWrapper({ language, domain }),
    ...options,
  })
}
