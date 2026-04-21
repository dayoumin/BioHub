import { describe, expect, it } from 'vitest'
import {
  DOMAIN_OWNED_TERMINOLOGY_KEYS,
  getTerminologySectionOwner,
  LANGUAGE_OWNED_TERMINOLOGY_KEYS,
  MIXED_OWNED_TERMINOLOGY_KEYS,
  TERMINOLOGY_SECTION_OWNERSHIP,
} from '@/lib/terminology/packs/pack-section-keys'
import { resolveTerminologyDictionary } from '@/lib/terminology/resolve-terminology-dictionary'

describe('terminology pack ownership keys', () => {
  it('keeps language, mixed, and domain-owned groups disjoint', () => {
    const allKeys = [
      ...LANGUAGE_OWNED_TERMINOLOGY_KEYS,
      ...MIXED_OWNED_TERMINOLOGY_KEYS,
      ...DOMAIN_OWNED_TERMINOLOGY_KEYS,
    ]

    expect(new Set(allKeys).size).toBe(allKeys.length)
  })

  it('classifies validation/success/selector UI as explicit mixed-owned sections', () => {
    expect(MIXED_OWNED_TERMINOLOGY_KEYS).toEqual([
      'validation',
      'success',
      'selectorUI',
    ])
    expect(getTerminologySectionOwner('validation')).toBe('mixed')
  })

  it('covers every pack-owned terminology section explicitly', () => {
    const dictionary = resolveTerminologyDictionary('ko', 'aquaculture')
    const packKeys = Object.keys(dictionary).filter((key) => key !== 'domain' && key !== 'language').sort()
    const ownedKeys = Object.keys(TERMINOLOGY_SECTION_OWNERSHIP).sort()

    expect(packKeys.every((key) => ownedKeys.includes(key))).toBe(true)
    expect(getTerminologySectionOwner('methods')).toBe('domain')
  })

  it('preserves mixed-owned overrides for cross combinations', () => {
    const genericKo = resolveTerminologyDictionary('ko', 'generic')
    const aquacultureEn = resolveTerminologyDictionary('en', 'aquaculture')

    expect(genericKo.validation.groupRequired).toBe('그룹 변수가 필요합니다')
    expect(genericKo.success.readyForAnalysis).toBe('분석 준비 완료')
    expect(genericKo.selectorUI.titles.groupComparison).toBe('집단 비교 변수 선택')

    expect(aquacultureEn.validation.groupRequired).toBe('An experimental group variable is required')
    expect(aquacultureEn.success.readyForAnalysis).toBe('Ready for analysis')
    expect(aquacultureEn.selectorUI.titles.groupComparison).toBe('Experimental Group Comparison Setup')
  })
})
