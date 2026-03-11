/**
 * variable-detection-service 회귀 테스트
 *
 * extractDetectedVariables()는 PurposeInputStep(Step 2) + page.tsx(quickAnalysisMode) 공용.
 * 3순위 우선순위: LLM variableAssignments → legacy detectedVariables → heuristic
 */

import { describe, it, expect, vi } from 'vitest'
import { extractDetectedVariables, type DetectedVariablesResult } from '@/lib/services/variable-detection-service'
import type { ColumnStatistics, AIRecommendation, StatisticalMethod } from '@/types/smart-flow'

// ===== Test Helpers =====

function makeCol(name: string, type: 'numeric' | 'categorical' | 'mixed', overrides?: Partial<ColumnStatistics>): ColumnStatistics {
  return {
    name,
    type,
    numericCount: type === 'numeric' ? 100 : 0,
    textCount: type === 'categorical' ? 100 : 0,
    missingCount: 0,
    uniqueValues: type === 'categorical' ? 3 : 100,
    ...overrides,
  }
}

const NUMERIC_COLS = [makeCol('체중', 'numeric'), makeCol('체장', 'numeric'), makeCol('나이', 'numeric')]
const CATEGORICAL_COLS = [makeCol('성별', 'categorical'), makeCol('사료종류', 'categorical')]
const MIXED_DATA = { columns: [...CATEGORICAL_COLS, ...NUMERIC_COLS] }

function makeMethod(id: string, category: string): StatisticalMethod {
  return { id, name: id, category } as StatisticalMethod
}

function makeRecommendation(overrides: Partial<AIRecommendation>): AIRecommendation {
  return {
    method: makeMethod('independent-samples-t-test', 't-test'),
    confidence: 0.9,
    reasoning: ['test'],
    assumptions: [],
    ...overrides,
  }
}

// ===== Tests =====

describe('extractDetectedVariables', () => {

  // ─── 3순위: Heuristic (recommendation = null) ───

  describe('3순위: heuristic 추론 (quickAnalysisMode 주 경로)', () => {

    it('independent-samples-t-test: groupVariable=첫 번째 categorical, dependent=첫 번째 numeric', () => {
      const result = extractDetectedVariables('independent-samples-t-test', MIXED_DATA, null)

      expect(result.groupVariable).toBe('성별')
      expect(result.dependentCandidate).toBe('체중')
      expect(result.numericVars).toEqual(['체중', '체장', '나이'])
    })

    it('paired-t-test: pairedVars=첫 2개 numeric', () => {
      const result = extractDetectedVariables('paired-t-test', MIXED_DATA, null)

      expect(result.pairedVars).toEqual(['체중', '체장'])
    })

    it('wilcoxon-signed-rank: pairedVars=첫 2개 numeric', () => {
      const result = extractDetectedVariables('wilcoxon-signed-rank', MIXED_DATA, null)

      expect(result.pairedVars).toEqual(['체중', '체장'])
    })

    it('two-way-anova: factors=첫 2개 categorical', () => {
      const result = extractDetectedVariables('two-way-anova', MIXED_DATA, null)

      expect(result.factors).toEqual(['성별', '사료종류'])
    })

    it('pearson-correlation: numericVars=전체 numeric', () => {
      const result = extractDetectedVariables('pearson-correlation', MIXED_DATA, null)

      expect(result.numericVars).toEqual(['체중', '체장', '나이'])
      // 상관분석은 dependent/group 불필요 — 2순위 fallback에서 설정됨
      expect(result.dependentCandidate).toBe('체중')
    })

    it('kaplan-meier: binary(0/1) 컬럼 → eventVariable, 나머지 numeric → dependent', () => {
      const survivalData = {
        columns: [
          makeCol('생존시간', 'numeric', { min: 1, max: 365 }),
          makeCol('사건', 'numeric', { uniqueValues: 2, min: 0, max: 1 }),
          makeCol('치료군', 'categorical'),
        ]
      }
      const result = extractDetectedVariables('kaplan-meier', survivalData, null)

      expect(result.eventVariable).toBe('사건')
      // dependentCandidate: 2순위 fallback에서 numericCols[0]='생존시간'
      expect(result.dependentCandidate).toBe('생존시간')
      expect(result.groupVariable).toBe('치료군')
    })

    it('kaplan-meier: ID 컬럼이 첫 번째여도 건너뛰고 비-ID categorical 선택', () => {
      const survivalData = {
        columns: [
          makeCol('시간', 'numeric', { min: 1, max: 100 }),
          makeCol('사건', 'numeric', { uniqueValues: 2, min: 0, max: 1 }),
          makeCol('환자ID', 'categorical', { idDetection: { isId: true, reason: 'name', confidence: 0.9, source: 'name' as const } }),
          makeCol('치료군', 'categorical'),
        ]
      }
      const result = extractDetectedVariables('kaplan-meier', survivalData, null)

      // ID 컬럼 건너뛰고 '치료군' 선택
      expect(result.groupVariable).toBe('치료군')
    })

    it('kaplan-meier: 모든 categorical이 ID면 groupVariable=undefined', () => {
      const survivalData = {
        columns: [
          makeCol('시간', 'numeric', { min: 1, max: 100 }),
          makeCol('사건', 'numeric', { uniqueValues: 2, min: 0, max: 1 }),
          makeCol('환자ID', 'categorical', { idDetection: { isId: true, reason: 'name', confidence: 0.9, source: 'name' as const } }),
        ]
      }
      const result = extractDetectedVariables('kaplan-meier', survivalData, null)

      expect(result.groupVariable).toBeUndefined()
    })

    it('kaplan-meier: categorical이 없으면 groupVariable=undefined', () => {
      const survivalData = {
        columns: [
          makeCol('시간', 'numeric', { min: 1, max: 100 }),
          makeCol('사건', 'numeric', { uniqueValues: 2, min: 0, max: 1 }),
        ]
      }
      const result = extractDetectedVariables('kaplan-meier', survivalData, null)

      expect(result.groupVariable).toBeUndefined()
    })

    it('numeric 컬럼만 있으면 groupVariable=undefined', () => {
      const numericOnly = { columns: NUMERIC_COLS }
      const result = extractDetectedVariables('independent-samples-t-test', numericOnly, null)

      expect(result.groupVariable).toBeUndefined()
      expect(result.dependentCandidate).toBe('체중')
    })

    it('빈 데이터: 모든 필드 undefined', () => {
      const result = extractDetectedVariables('independent-samples-t-test', null, null)

      expect(result.groupVariable).toBeUndefined()
      expect(result.dependentCandidate).toBeUndefined()
      expect(result.numericVars).toEqual([])
    })
  })

  // ─── 1순위: LLM variableAssignments ───

  describe('1순위: LLM variableAssignments', () => {

    it('유효한 dependent + independent 매핑', () => {
      const rec = makeRecommendation({
        variableAssignments: {
          dependent: ['체중'],
          independent: ['체장', '나이'],
        }
      })
      const result = extractDetectedVariables('multiple-regression', MIXED_DATA, rec)

      expect(result.dependentCandidate).toBe('체중')
      expect(result.independentVars).toEqual(['체장', '나이'])
      expect(result.numericVars).toEqual(['체중', '체장', '나이'])
    })

    it('factor 1개 → groupVariable, factor 2개 → factors 배열', () => {
      const rec1 = makeRecommendation({
        variableAssignments: { dependent: ['체중'], factor: ['성별'] }
      })
      const result1 = extractDetectedVariables('one-way-anova', MIXED_DATA, rec1)
      expect(result1.groupVariable).toBe('성별')
      expect(result1.factors).toBeUndefined()

      const rec2 = makeRecommendation({
        variableAssignments: { dependent: ['체중'], factor: ['성별', '사료종류'] }
      })
      const result2 = extractDetectedVariables('two-way-anova', MIXED_DATA, rec2)
      expect(result2.factors).toEqual(['성별', '사료종류'])
      expect(result2.groupVariable).toBeUndefined()
    })

    it('within 2개 → pairedVars', () => {
      const rec = makeRecommendation({
        variableAssignments: { within: ['체중', '체장'] }
      })
      const result = extractDetectedVariables('paired-t-test', MIXED_DATA, rec)

      expect(result.pairedVars).toEqual(['체중', '체장'])
    })

    it('그룹 비교 메서드: categorical independent → groupVariable 자동 전환', () => {
      const rec = makeRecommendation({
        method: makeMethod('independent-samples-t-test', 't-test'),
        variableAssignments: {
          dependent: ['체중'],
          independent: ['성별'],
        }
      })
      const result = extractDetectedVariables('independent-samples-t-test', MIXED_DATA, rec)

      expect(result.groupVariable).toBe('성별')
      expect(result.independentVars).toEqual(['성별'])
    })

    it('비-그룹 비교 메서드: independent → groupVariable 전환 안 됨', () => {
      const rec = makeRecommendation({
        method: makeMethod('multiple-regression', 'regression'),
        variableAssignments: {
          dependent: ['체중'],
          independent: ['성별'],
        }
      })
      const result = extractDetectedVariables('multiple-regression', MIXED_DATA, rec)

      expect(result.groupVariable).toBeUndefined()
      expect(result.independentVars).toEqual(['성별'])
    })

    it('event + time (생존분석)', () => {
      const survivalData = {
        columns: [
          makeCol('생존시간', 'numeric'),
          makeCol('사건', 'numeric'),
          makeCol('치료군', 'categorical'),
        ]
      }
      const rec = makeRecommendation({
        variableAssignments: {
          time: ['생존시간'],
          event: ['사건'],
          between: ['치료군'],
        }
      })
      const result = extractDetectedVariables('kaplan-meier', survivalData, rec)

      expect(result.eventVariable).toBe('사건')
      // time은 dependentCandidate로 매핑되고, dependent가 override 가능
      expect(result.dependentCandidate).toBe('생존시간')
      expect(result.groupVariable).toBe('치료군')
    })

    it('covariate (ANCOVA)', () => {
      const rec = makeRecommendation({
        variableAssignments: {
          dependent: ['체중'],
          factor: ['성별'],
          covariate: ['나이'],
        }
      })
      const result = extractDetectedVariables('ancova', MIXED_DATA, rec)

      expect(result.covariates).toEqual(['나이'])
    })
  })

  // ─── 할루시네이션 필터링 ───

  describe('할루시네이션 필터링', () => {

    it('데이터에 없는 변수명 → filteredOutVars에 기록', () => {
      const rec = makeRecommendation({
        variableAssignments: {
          dependent: ['체중'],          // 존재
          independent: ['환상변수'],    // 존재하지 않음
        }
      })
      const result = extractDetectedVariables('multiple-regression', MIXED_DATA, rec)

      expect(result.filteredOutVars).toContain('환상변수')
      expect(result.dependentCandidate).toBe('체중')
      // 필터된 independent는 결과에 포함되지 않음
      expect(result.independentVars).toBeUndefined()
    })

    it('모든 변수가 할루시네이션 → 2순위 fallback으로 전환', () => {
      const rec = makeRecommendation({
        variableAssignments: {
          dependent: ['없는변수1'],
          independent: ['없는변수2'],
        }
      })
      const result = extractDetectedVariables('independent-samples-t-test', MIXED_DATA, rec)

      expect(result.filteredOutVars).toEqual(['없는변수1', '없는변수2'])
      // 2순위 fallback
      expect(result.groupVariable).toBe('성별')
      expect(result.dependentCandidate).toBe('체중')
    })
  })

  // ─── 2순위: legacy detectedVariables ───

  describe('2순위: legacy detectedVariables', () => {

    it('legacy groupVariable + dependentVariables 매핑', () => {
      const rec = makeRecommendation({
        detectedVariables: {
          groupVariable: { name: '사료종류', uniqueValues: ['A', 'B', 'C'], count: 3 },
          dependentVariables: ['체장'],
        }
      })
      const result = extractDetectedVariables('one-way-anova', MIXED_DATA, rec)

      expect(result.groupVariable).toBe('사료종류')
      expect(result.dependentCandidate).toBe('체장')
    })

    it('legacy 변수가 데이터에 없으면 fallback', () => {
      const rec = makeRecommendation({
        detectedVariables: {
          groupVariable: { name: '없는컬럼', uniqueValues: [], count: 0 },
          dependentVariables: ['없는변수'],
        }
      })
      const result = extractDetectedVariables('independent-samples-t-test', MIXED_DATA, rec)

      // fallback to first categorical/numeric
      expect(result.groupVariable).toBe('성별')
      expect(result.dependentCandidate).toBe('체중')
    })
  })

  // ─── 우선순위 검증 ───

  describe('우선순위', () => {

    it('1순위(variableAssignments)가 2순위(detectedVariables)보다 우선', () => {
      const rec = makeRecommendation({
        variableAssignments: {
          dependent: ['체장'],
          factor: ['사료종류'],
        },
        detectedVariables: {
          groupVariable: { name: '성별', uniqueValues: ['M', 'F'], count: 2 },
          dependentVariables: ['체중'],
        }
      })
      const result = extractDetectedVariables('one-way-anova', MIXED_DATA, rec)

      // 1순위 결과 사용
      expect(result.dependentCandidate).toBe('체장')
      expect(result.groupVariable).toBe('사료종류')
    })

    it('1순위 결과가 모두 무효 → 2순위 사용', () => {
      const rec = makeRecommendation({
        variableAssignments: {
          dependent: ['할루시네이션'],
        },
        detectedVariables: {
          groupVariable: { name: '성별', uniqueValues: ['M', 'F'], count: 2 },
          dependentVariables: ['체중'],
        }
      })
      const result = extractDetectedVariables('independent-samples-t-test', MIXED_DATA, rec)

      // 2순위 결과 사용
      expect(result.groupVariable).toBe('성별')
      expect(result.dependentCandidate).toBe('체중')
    })
  })

  // ─── 엣지 케이스 ───

  describe('엣지 케이스', () => {

    it('validationResults가 undefined여도 크래시 없음', () => {
      expect(() => extractDetectedVariables('independent-samples-t-test', undefined, null)).not.toThrow()
    })

    it('columns가 빈 배열이면 빈 결과', () => {
      const result = extractDetectedVariables('independent-samples-t-test', { columns: [] }, null)

      expect(result.groupVariable).toBeUndefined()
      expect(result.dependentCandidate).toBeUndefined()
    })

    it('between이 groupVariable을 설정하되, 이미 있으면 덮어쓰지 않음', () => {
      const rec = makeRecommendation({
        variableAssignments: {
          dependent: ['체중'],
          factor: ['성별'],        // → groupVariable
          between: ['사료종류'],   // 이미 groupVariable 있으므로 무시
        }
      })
      const result = extractDetectedVariables('one-way-anova', MIXED_DATA, rec)

      expect(result.groupVariable).toBe('성별')
    })

    it('columnStats만 있는 persisted state도 정상 동작 (backward-compat)', () => {
      const legacyData = { columnStats: [...CATEGORICAL_COLS, ...NUMERIC_COLS] }
      const result = extractDetectedVariables('independent-samples-t-test', legacyData, null)

      expect(result.groupVariable).toBe('성별')
      expect(result.dependentCandidate).toBe('체중')
      expect(result.numericVars).toEqual(['체중', '체장', '나이'])
    })

    it('columns가 있으면 columnStats보다 우선', () => {
      const bothData = {
        columns: [makeCol('A', 'numeric')],
        columnStats: [makeCol('B', 'numeric')],
      }
      const result = extractDetectedVariables('pearson-correlation', bothData, null)

      expect(result.numericVars).toEqual(['A'])
    })

    it('within이 2개가 아니면 1순위에서 pairedVars 미설정 → 3순위 heuristic fallback', () => {
      const rec = makeRecommendation({
        variableAssignments: { within: ['체중'] }  // 1개만 → 1순위 무효
      })
      const result = extractDetectedVariables('paired-t-test', MIXED_DATA, rec)

      // 1순위 유효 결과 없음 → 2순위 → 3순위 paired-t-test heuristic이 설정
      expect(result.pairedVars).toEqual(['체중', '체장'])
    })
  })
})
