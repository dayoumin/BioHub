/**
 * mode-store 단위 테스트
 *
 * StepTrack / showHub / purposeInputMode / userQuery / lastAiRecommendation
 * 각 setter 및 resetMode 동작 검증.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useModeStore } from '@/lib/stores/mode-store'
import type { AiRecommendationContext } from '@/lib/utils/storage-types'

function makeAiRec(overrides: Partial<AiRecommendationContext> = {}): AiRecommendationContext {
  return {
    userQuery: '그룹 비교',
    confidence: 0.85,
    reasoning: ['수치형 변수'],
    provider: 'openrouter',
    alternatives: [],
    ...overrides,
  }
}

describe('mode-store', () => {
  beforeEach(() => {
    act(() => { useModeStore.getState().resetMode() })
  })

  // ===== 초기 상태 =====

  describe('초기 상태', () => {
    it('기본값이 올바르다', () => {
      const state = useModeStore.getState()
      expect(state.stepTrack).toBe('normal')
      expect(state.showHub).toBe(true)
      expect(state.purposeInputMode).toBe('ai')
      expect(state.userQuery).toBeNull()
      expect(state.lastAiRecommendation).toBeNull()
    })
  })

  // ===== StepTrack =====

  describe('setStepTrack()', () => {
    it.each<['normal' | 'quick' | 'reanalysis']>([
      ['normal'],
      ['quick'],
      ['reanalysis'],
    ])('"%s" 트랙으로 전환한다', (track) => {
      act(() => { useModeStore.getState().setStepTrack(track) })
      expect(useModeStore.getState().stepTrack).toBe(track)
    })
  })

  // ===== showHub =====

  describe('setShowHub()', () => {
    it('Hub 표시/숨김을 토글한다', () => {
      act(() => { useModeStore.getState().setShowHub(false) })
      expect(useModeStore.getState().showHub).toBe(false)

      act(() => { useModeStore.getState().setShowHub(true) })
      expect(useModeStore.getState().showHub).toBe(true)
    })
  })

  // ===== purposeInputMode =====

  describe('setPurposeInputMode()', () => {
    it('ai → browse 전환', () => {
      act(() => { useModeStore.getState().setPurposeInputMode('browse') })
      expect(useModeStore.getState().purposeInputMode).toBe('browse')
    })

    it('browse → ai 전환', () => {
      act(() => { useModeStore.getState().setPurposeInputMode('browse') })
      act(() => { useModeStore.getState().setPurposeInputMode('ai') })
      expect(useModeStore.getState().purposeInputMode).toBe('ai')
    })
  })

  // ===== userQuery =====

  describe('setUserQuery()', () => {
    it('쿼리를 설정한다', () => {
      act(() => { useModeStore.getState().setUserQuery('두 그룹 평균 비교') })
      expect(useModeStore.getState().userQuery).toBe('두 그룹 평균 비교')
    })

    it('null로 초기화한다', () => {
      act(() => { useModeStore.getState().setUserQuery('test') })
      act(() => { useModeStore.getState().setUserQuery(null) })
      expect(useModeStore.getState().userQuery).toBeNull()
    })
  })

  // ===== lastAiRecommendation =====

  describe('setLastAiRecommendation()', () => {
    it('AI 추천 결과를 저장한다', () => {
      const rec = makeAiRec()
      act(() => { useModeStore.getState().setLastAiRecommendation(rec) })

      const saved = useModeStore.getState().lastAiRecommendation
      expect(saved).not.toBeNull()
      expect(saved?.confidence).toBe(0.85)
      expect(saved?.provider).toBe('openrouter')
    })

    it('null로 초기화한다', () => {
      act(() => { useModeStore.getState().setLastAiRecommendation(makeAiRec()) })
      act(() => { useModeStore.getState().setLastAiRecommendation(null) })
      expect(useModeStore.getState().lastAiRecommendation).toBeNull()
    })
  })

  // ===== resetMode =====

  describe('resetMode()', () => {
    it('모든 상태를 초기값으로 되돌린다', () => {
      // 모든 상태를 변경
      act(() => {
        const store = useModeStore.getState()
        store.setStepTrack('reanalysis')
        store.setShowHub(false)
        store.setPurposeInputMode('browse')
        store.setUserQuery('test query')
        store.setLastAiRecommendation(makeAiRec())
      })

      // 변경 확인
      expect(useModeStore.getState().stepTrack).toBe('reanalysis')
      expect(useModeStore.getState().showHub).toBe(false)

      // 리셋
      act(() => { useModeStore.getState().resetMode() })

      // 초기값 확인
      const state = useModeStore.getState()
      expect(state.stepTrack).toBe('normal')
      expect(state.showHub).toBe(true)
      expect(state.purposeInputMode).toBe('ai')
      expect(state.userQuery).toBeNull()
      expect(state.lastAiRecommendation).toBeNull()
    })
  })
})
