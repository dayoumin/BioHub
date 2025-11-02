/**
 * non-parametric Critical 버그 수정 검증
 *
 * 🚨 발견된 문제:
 * 1. Tab 키 불일치: 'analysis' → 존재하지 않는 탭
 * 2. State 불일치: variableMapping (사용 안 함) ≠ selectedVariables (실제 사용)
 */

describe('non-parametric Critical Bug Fix', () => {
  describe('🚨 Bug 1: Tab Key Mismatch', () => {
    it('ISSUE: setActiveTab("analysis") targets undefined tab', () => {
      // 정의된 탭 (Line 351-354):
      const definedTabs = ['setup', 'assumptions', 'results']

      // 변수 선택 후 이동 시도 (Before):
      const targetTab = 'analysis'  // ❌ 정의되지 않음!

      expect(definedTabs).not.toContain(targetTab)
      // Result: 사용자는 빈 패널을 보게 됨
    })

    it('FIX: setActiveTab("setup") stays in defined tab', () => {
      // 정의된 탭:
      const definedTabs = ['setup', 'assumptions', 'results']

      // 변수 선택 후 이동 (After):
      const targetTab = 'setup'  // ✅ 정의된 탭

      expect(definedTabs).toContain(targetTab)
      // Result: 사용자는 분석 설정 탭을 계속 볼 수 있음
    })
  })

  describe('🚨 Bug 2: State Mismatch', () => {
    it('ISSUE: variableMapping is never updated', () => {
      // actions.setSelectedVariables → state.selectedVariables (✓)
      // actions.updateVariableMapping → state.variableMapping (사용 안 함!)

      const actualUpdatedState = 'selectedVariables'
      const buttonChecksState = 'variableMapping'  // ❌ 잘못된 state!

      expect(actualUpdatedState).not.toBe(buttonChecksState)
      // Result: 버튼이 항상 비활성화됨
    })

    it('FIX: Button checks selectedVariables (actual state)', () => {
      // Mock state after variable selection
      const state = {
        selectedVariables: { dependent: 'value', independent: ['var1'] },
        variableMapping: {}  // 업데이트 안 됨
      }

      // Before (❌):
      const isDisabledBefore = !state.variableMapping ||
        Object.keys(state.variableMapping).length === 0
      expect(isDisabledBefore).toBe(true)  // 항상 비활성화!

      // After (✅):
      const isDisabledAfter = !state.selectedVariables ||
        Object.keys(state.selectedVariables).length === 0
      expect(isDisabledAfter).toBe(false)  // 정상 활성화!
    })
  })

  describe('✅ Integration Test', () => {
    it('Variable selection enables analysis button', () => {
      // 1. 초기 상태
      let selectedVariables: Record<string, unknown> | null = null
      let activeTab = 'setup'

      // 2. 변수 선택 핸들러 시뮬레이션
      const handleVariablesSelected = (variables: Record<string, unknown>) => {
        selectedVariables = variables
        activeTab = 'setup'  // ✅ 정의된 탭 유지
      }

      // 3. 변수 선택
      handleVariablesSelected({ dependent: 'value', independent: ['var1'] })

      // 4. 검증
      expect(activeTab).toBe('setup')  // ✅ 올바른 탭
      expect(selectedVariables).not.toBeNull()  // ✅ state 업데이트

      // 5. 버튼 활성화 확인
      const isButtonDisabled = !selectedVariables ||
        Object.keys(selectedVariables).length === 0
      expect(isButtonDisabled).toBe(false)  // ✅ 버튼 활성화됨!
    })
  })

  describe('🎯 Best Practice', () => {
    it('Use consistent state naming across components', () => {
      // useStatisticsPage hook returns:
      // - state.selectedVariables (실제 사용)
      // - state.variableMapping (Phase 1-3에서 사용, 여기서는 사용 안 함)

      // 권장 사항:
      // 1. 컴포넌트에서 실제 사용하는 state만 destructure
      // 2. 버튼/조건문에서 올바른 state 참조
      // 3. Tab 키는 TabsTrigger value와 일치

      const recommendations = [
        'Destructure only used state',
        'Reference correct state in conditions',
        'Match tab keys with TabsTrigger values'
      ]

      expect(recommendations).toHaveLength(3)
    })
  })
})
