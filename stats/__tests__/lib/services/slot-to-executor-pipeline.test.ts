/**
 * TD-2 통합 시뮬레이션: 슬롯 → buildMapping → normalize → handler 기대 키 검증
 *
 * 사용자가 UnifiedVariableSelector에서 변수를 드래그/클릭하면:
 * 1. getSlotConfigs(selectorType) → 슬롯 정의
 * 2. buildMappingFromSlots(slots, assignments) → VariableMapping
 * 3. normalizeSlotMapping(mapping, methodId) → executor/handler 기대 키
 *
 * 이 테스트는 3단계 전체를 시뮬레이션하여
 * handler가 읽는 키에 올바른 값이 들어있는지 before/after 방식으로 검증합니다.
 */

import { describe, it, expect } from 'vitest'
import { getSlotConfigs, buildMappingFromSlots } from '@/components/analysis/variable-selector/slot-configs'
import { normalizeSlotMapping } from '@/lib/services/statistical-executor'

/** 파이프라인 헬퍼: 슬롯 선택 → 빌드 → 정규화 */
function simulatePipeline(
  selectorType: Parameters<typeof getSlotConfigs>[0],
  assignments: Record<string, string[]>,
  methodId: string
): Record<string, unknown> {
  const slots = getSlotConfigs(selectorType)
  const mapping = buildMappingFromSlots(slots, assignments)
  return normalizeSlotMapping(mapping as Record<string, unknown>, methodId)
}

describe('TD-2 슬롯→executor 파이프라인 시뮬레이션', () => {

  // ═══════════════════════════════════════════════════════════════
  // Kaplan-Meier: handler는 data.variables.dependentVar + event 읽음
  // ═══════════════════════════════════════════════════════════════

  describe('Kaplan-Meier (survival → handler)', () => {
    it('시간·사건·그룹 선택 → handler가 기대하는 키 구조 생성', () => {
      const result = simulatePipeline('survival', {
        time: ['duration'],
        event: ['status'],
        factor: ['treatment'],
        covariate: [],
      }, 'kaplan-meier')

      // handler: data.variables?.dependent || data.variables?.dependentVar
      expect(result.dependentVar).toBe('duration')
      // handler: data.variables?.event
      expect(result.event).toBe('status')
      // handler: data.variables?.factor || data.variables?.group || data.variables?.groupVar
      expect(result.groupVar).toBe('treatment')
      // timeVar는 정규화 후 제거되어야 함
      expect(result.timeVar).toBeUndefined()
    })

    it('그룹 없이 시간·사건만 선택해도 동작', () => {
      const result = simulatePipeline('survival', {
        time: ['survival_months'],
        event: ['dead'],
        factor: [],
        covariate: [],
      }, 'kaplan-meier')

      expect(result.dependentVar).toBe('survival_months')
      expect(result.event).toBe('dead')
      expect(result.groupVar).toBeUndefined()
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Cox Regression: handler는 dependentVar + event + independentVar(배열) 읽음
  // ═══════════════════════════════════════════════════════════════

  describe('Cox Regression (survival → handler)', () => {
    it('시간·사건·공변량 선택 → independentVar가 배열로 변환', () => {
      const result = simulatePipeline('survival', {
        time: ['time'],
        event: ['event'],
        factor: [],
        covariate: ['age', 'stage', 'grade'],
      }, 'cox-regression')

      // handler: depVar = data.variables?.dependent || data.variables?.dependentVar
      expect(result.dependentVar).toBe('time')
      expect(result.timeVar).toBeUndefined()
      // handler: data.variables?.event
      expect(result.event).toBe('event')
      // handler: indVars = data.variables?.independent || data.variables?.independentVar
      // slot의 multipleFormat='comma' → 'age,stage,grade' → normalize에서 split
      expect(result.independentVar).toEqual(['age', 'stage', 'grade'])
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Repeated-Measures ANOVA: handler는 data.arrays.within + data.variables.within 읽음
  // ═══════════════════════════════════════════════════════════════

  describe('Repeated-Measures ANOVA (repeated-measures → handler)', () => {
    it('반복측정 변수 3개 선택 → within[]으로 변환', () => {
      const result = simulatePipeline('repeated-measures', {
        variables: ['baseline', 'week4', 'week8'],
        group: [],
      }, 'repeated-measures-anova')

      // handler (handle-anova.ts:390): data.arrays.within + data.variables.within
      expect(result.within).toEqual(['baseline', 'week4', 'week8'])
      // variables 키는 제거되어야 함 (prepareData의 variables 분기 안 타도록)
      expect(result.variables).toBeUndefined()
    })

    it('그룹 변수 포함 시 groupVar 유지', () => {
      const result = simulatePipeline('repeated-measures', {
        variables: ['pre', 'post'],
        group: ['treatment'],
      }, 'repeated-measures-anova')

      expect(result.within).toEqual(['pre', 'post'])
      expect(result.groupVar).toBe('treatment')
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Friedman: handler는 variables → independent로 변환하지만,
  //           prepareData의 friedman 특수 분기가 처리함
  //           normalize는 variables → within으로 변환해서 안전하게 처리
  // ═══════════════════════════════════════════════════════════════

  describe('Friedman (repeated-measures → handler)', () => {
    it('3개 조건 선택 → variables[] 유지 (prepareData friedman 특수 분기)', () => {
      const result = simulatePipeline('repeated-measures', {
        variables: ['cond_a', 'cond_b', 'cond_c'],
        group: [],
      }, 'friedman')

      // prepareData의 friedman 분기가 variablesArray → arrays.independent 변환
      expect(result.variables).toEqual(['cond_a', 'cond_b', 'cond_c'])
      expect(result.within).toBeUndefined()
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // ROC-Curve: handler는 dependentVar=실제 클래스, independentVar=예측 점수
  // ═══════════════════════════════════════════════════════════════

  describe('ROC-Curve (roc-curve → handler)', () => {
    it('상태(이진) + 예측 점수(연속) → handler 기대 키', () => {
      const result = simulatePipeline('roc-curve', {
        state: ['outcome'],
        test: ['score'],
      }, 'roc-curve')

      // handler: depVar = data.variables?.dependent || data.variables?.dependentVar → 실제 클래스
      expect(result.dependentVar).toBe('outcome')
      // handler: indVar = data.variables?.independent || data.variables?.independentVar → 예측 점수
      expect(result.independentVar).toBe('score')
      // groupVar는 설정되지 않음
      expect(result.groupVar).toBeUndefined()
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // MANOVA: handler는 data.variables.dependent(배열) + data.variables.group 읽음
  // ═══════════════════════════════════════════════════════════════

  describe('MANOVA (manova → handler)', () => {
    it('종속 변수 3개 + 그룹 선택 → handler 기대 키 구조', () => {
      const result = simulatePipeline('manova', {
        variables: ['length', 'width', 'depth'],
        factor: ['species'],
      }, 'manova')

      // handler (handle-anova.ts:468): data.variables.dependent as string[]
      expect(result.dependent).toEqual(['length', 'width', 'depth'])
      expect(result.variables).toBeUndefined()
      // handler (handle-anova.ts:469): data.variables.group
      expect(result.group).toBe('species')
      expect(result.groupVar).toBeUndefined()
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // 비대상 메서드: normalize가 건드리지 않는 기존 흐름 확인
  // ═══════════════════════════════════════════════════════════════

  describe('기존 메서드 (비대상) — pass-through 확인', () => {
    it('t-test: group-comparison 슬롯 그대로 통과', () => {
      const result = simulatePipeline('group-comparison', {
        dependent: ['score'],
        factor: ['group'],
        covariate: [],
      }, 'two-sample-t')

      expect(result.dependentVar).toBe('score')
      expect(result.groupVar).toBe('group')
    })

    it('correlation: variables 배열 그대로 유지', () => {
      const result = simulatePipeline('correlation', {
        variables: ['height', 'weight', 'age'],
      }, 'correlation')

      expect(result.variables).toEqual(['height', 'weight', 'age'])
    })

    it('multiple-regression: 기존 comma 포맷 유지', () => {
      const result = simulatePipeline('multiple-regression', {
        dependent: ['y'],
        independent: ['x1', 'x2', 'x3'],
      }, 'multiple-regression')

      expect(result.dependentVar).toBe('y')
      expect(result.independentVar).toBe('x1,x2,x3')
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // 회귀 방지: 이전 버그 재현 시나리오
  // ═══════════════════════════════════════════════════════════════

  describe('회귀 방지 — 이전 버그 시나리오 재현', () => {

    it('BUG-I1 재현: repeated-measures variables가 within으로 변환 안 되면 one-way ANOVA 분기', () => {
      // 정규화 전 상태 시뮬레이션 (버그 상태)
      const slots = getSlotConfigs('repeated-measures')
      const bugMapping = buildMappingFromSlots(slots, {
        variables: ['t1', 't2', 't3'],
        group: ['group'],
      })

      // 버그 상태: within 키 없음 → handler 진입 실패
      expect(bugMapping.within).toBeUndefined()
      expect(bugMapping.variables).toEqual(['t1', 't2', 't3'])

      // 정규화 후: within 키 존재 → handler 진입 성공
      const fixed = normalizeSlotMapping(
        bugMapping as Record<string, unknown>,
        'repeated-measures-anova'
      )
      expect(fixed.within).toEqual(['t1', 't2', 't3'])
      expect(fixed.variables).toBeUndefined()
    })

    it('BUG-I2 재현: survival timeVar가 dependentVar로 변환 안 되면 handler 실패', () => {
      const slots = getSlotConfigs('survival')
      const bugMapping = buildMappingFromSlots(slots, {
        time: ['duration'],
        event: ['status'],
        factor: ['group'],
        covariate: [],
      })

      // 버그 상태: timeVar는 있지만 dependentVar 없음
      expect(bugMapping.timeVar).toBe('duration')
      expect(bugMapping.dependentVar).toBeUndefined()
      expect(bugMapping.dependent).toBeUndefined()

      // 정규화 후: dependentVar 존재
      const fixed = normalizeSlotMapping(
        bugMapping as Record<string, unknown>,
        'kaplan-meier'
      )
      expect(fixed.dependentVar).toBe('duration')
      expect(fixed.timeVar).toBeUndefined()
    })

    it('BUG-S3 재현: MANOVA variables가 dependent로 변환 안 되면 "종속변수 2개 필요" 에러', () => {
      const slots = getSlotConfigs('manova')
      const bugMapping = buildMappingFromSlots(slots, {
        variables: ['y1', 'y2', 'y3'],
        factor: ['treatment'],
      })

      // 버그 상태: dependent 없음, variables만 있음
      expect(bugMapping.dependent).toBeUndefined()
      expect(bugMapping.dependentVar).toBeUndefined()
      expect(bugMapping.variables).toEqual(['y1', 'y2', 'y3'])

      // 정규화 후: dependent 존재 + group 존재
      const fixed = normalizeSlotMapping(
        bugMapping as Record<string, unknown>,
        'manova'
      )
      expect(fixed.dependent).toEqual(['y1', 'y2', 'y3'])
      expect(fixed.variables).toBeUndefined()
      expect(fixed.group).toBe('treatment')
      expect(fixed.groupVar).toBeUndefined()
    })

    it('BUG-ROC 재현: 슬롯이 test→dependentVar, state→groupVar로 매핑되면 handler "dependent+independent 필요" 에러', () => {
      // 수정 전 슬롯 구조를 수동 시뮬레이션 (test→dependentVar, state→groupVar)
      const bugMapping = { dependentVar: 'score', groupVar: 'outcome' }

      // handler는 dependentVar(=실제 클래스) + independentVar(=예측 점수) 기대
      // → groupVar에 넣은 outcome은 independentVar로 읽히지 않음
      expect(bugMapping.dependentVar).toBe('score')    // 잘못: 예측 점수가 dependent에
      expect((bugMapping as Record<string, unknown>).independentVar).toBeUndefined()  // 없음 → 에러

      // 수정 후 파이프라인: state→dependentVar, test→independentVar
      const fixed = simulatePipeline('roc-curve', {
        state: ['outcome'],
        test: ['score'],
      }, 'roc-curve')

      expect(fixed.dependentVar).toBe('outcome')   // 실제 클래스 → dependent
      expect(fixed.independentVar).toBe('score')    // 예측 점수 → independent
      expect(fixed.groupVar).toBeUndefined()        // groupVar 미사용
    })

    it('BUG-FRIEDMAN 재현: variables→within 변환 시 prepareData friedman 분기 미진입', () => {
      const slots = getSlotConfigs('repeated-measures')
      const rawMapping = buildMappingFromSlots(slots, {
        variables: ['cond_a', 'cond_b', 'cond_c'],
        group: [],
      })

      // 슬롯 출력: variables[] 존재
      expect(rawMapping.variables).toEqual(['cond_a', 'cond_b', 'cond_c'])

      // repeated-measures-anova용 정규화 → within[] (올바름)
      const rmNormalized = normalizeSlotMapping(
        rawMapping as Record<string, unknown>,
        'repeated-measures-anova'
      )
      expect(rmNormalized.within).toEqual(['cond_a', 'cond_b', 'cond_c'])
      expect(rmNormalized.variables).toBeUndefined()

      // friedman용 정규화 → variables[] 유지 (prepareData friedman 분기가 처리)
      const frNormalized = normalizeSlotMapping(
        rawMapping as Record<string, unknown>,
        'friedman'
      )
      expect(frNormalized.variables).toEqual(['cond_a', 'cond_b', 'cond_c'])
      expect(frNormalized.within).toBeUndefined()

      // 핵심 검증: friedman에서 within이 생기면 prepareData의
      // variablesArray가 비어서 arrays.independent가 안 만들어짐
      // → handler(handle-nonparametric.ts:80)가 빈 배열로 호출됨
    })
  })
})
