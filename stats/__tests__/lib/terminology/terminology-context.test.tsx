import { renderHook, act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppPreferencesProvider } from '@/lib/preferences'
import { TerminologyProvider, getAvailableDomains } from '@/lib/terminology/terminology-context'
import { useTerminology, useTerminologyContext } from '@/hooks/use-terminology'

describe('TerminologyProvider compatibility', () => {
  it('exposes domain and language from AppPreferencesProvider while preserving dictionary access', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AppPreferencesProvider initialLanguage="ko" initialDomain="aquaculture">
        <TerminologyProvider initialDomain="aquaculture">{children}</TerminologyProvider>
      </AppPreferencesProvider>
    )

    const { result } = renderHook(() => ({
      terminology: useTerminology(),
      context: useTerminologyContext(),
    }), { wrapper })

    expect(result.current.terminology.domain).toBe('aquaculture')
    expect(result.current.context.currentLanguage).toBe('ko')
    expect(result.current.context.locale).toBe('ko-KR')

    act(() => {
      result.current.context.setDomain('generic')
      result.current.context.setLanguage('en')
    })

    expect(result.current.terminology.domain).toBe('generic')
    expect(result.current.context.currentDomain).toBe('generic')
    expect(result.current.context.currentLanguage).toBe('en')
    expect(result.current.context.locale).toBe('en-US')
  })

  it('does not expose incomplete built-in domains by default', () => {
    expect(getAvailableDomains()).toEqual(['aquaculture', 'generic'])
  })
})
