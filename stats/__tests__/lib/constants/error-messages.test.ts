import { describe, expect, it } from 'vitest'
import {
  getLocalizedErrorMessage,
  resolveLocalizedErrorMessage,
} from '@/lib/constants/error-messages'

describe('getLocalizedErrorMessage', () => {
  it('prefers the provided fallback over leaking unknown English errors', () => {
    expect(
      getLocalizedErrorMessage(
        'Unhandled worker exception',
        'en',
        'Analysis failed. Check the data and selected method, then try again.',
      ),
    ).toBe('Analysis failed. Check the data and selected method, then try again.')
  })

  it('still returns unknown English errors when no fallback is provided', () => {
    expect(getLocalizedErrorMessage('Unhandled worker exception', 'en')).toBe(
      'Unhandled worker exception',
    )
  })

  it('reports whether a message was mapped or fell back', () => {
    expect(resolveLocalizedErrorMessage('Pyodide 계산 오류', 'en')).toMatchObject({
      message: 'Analysis failed. Check the data and selected method, then try again.',
      kind: 'mapped',
      matchedKey: 'Pyodide 계산 오류',
    })

    expect(
      resolveLocalizedErrorMessage('Unhandled worker exception', 'en', {
        fallback: 'Analysis failed. Check the data and selected method, then try again.',
      }),
    ).toMatchObject({
      message: 'Analysis failed. Check the data and selected method, then try again.',
      kind: 'fallback',
    })
  })
})
