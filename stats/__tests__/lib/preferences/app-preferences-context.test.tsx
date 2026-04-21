import { renderHook, act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppPreferencesProvider } from '@/lib/preferences'
import { useAppPreferences } from '@/hooks/use-app-preferences'
import { getAvailableDomains } from '@/lib/preferences/app-preferences-context'

const storageState: Record<string, string> = {}

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (key: string) => storageState[key] ?? null,
    setItem: (key: string, value: string) => {
      storageState[key] = value
    },
    removeItem: (key: string) => {
      delete storageState[key]
    },
    clear: () => {
      Object.keys(storageState).forEach((key) => delete storageState[key])
    },
  },
  writable: true,
})

describe('AppPreferencesProvider', () => {
  beforeEach(() => {
    Object.keys(storageState).forEach((key) => delete storageState[key])
    document.documentElement.lang = 'ko'
  })

  it('hydrates language and domain independently from localStorage', async () => {
    storageState['app-language'] = 'en'
    storageState['terminology-domain'] = 'generic'

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AppPreferencesProvider>{children}</AppPreferencesProvider>
    )

    const { result } = renderHook(() => useAppPreferences(), { wrapper })

    await waitFor(() => {
      expect(result.current.currentLanguage).toBe('en')
      expect(result.current.currentDomain).toBe('generic')
      expect(result.current.locale).toBe('en-US')
    })

    expect(document.documentElement.lang).toBe('en')
  })

  it('persists language and domain updates separately', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AppPreferencesProvider>{children}</AppPreferencesProvider>
    )

    const { result } = renderHook(() => useAppPreferences(), { wrapper })

    act(() => {
      result.current.setLanguage('en')
      result.current.setDomain('generic')
    })

    expect(storageState['app-language']).toBe('en')
    expect(storageState['terminology-domain']).toBe('generic')
    expect(result.current.currentLanguage).toBe('en')
    expect(result.current.currentDomain).toBe('generic')
    expect(result.current.locale).toBe('en-US')
    expect(document.documentElement.lang).toBe('en')
  })

  it('ignores unsupported persisted domains and exposes only implemented domains', async () => {
    storageState['terminology-domain'] = 'medical'

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AppPreferencesProvider>{children}</AppPreferencesProvider>
    )

    const { result } = renderHook(() => useAppPreferences(), { wrapper })

    await waitFor(() => {
      expect(result.current.currentDomain).toBe('aquaculture')
    })

    expect(getAvailableDomains()).toEqual(['aquaculture', 'generic'])
  })
})
