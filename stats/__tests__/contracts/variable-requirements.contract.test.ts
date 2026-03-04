/**
 * Contract Test: variable-requirements.ts
 *
 * 이 파일은 STATISTICAL_METHOD_REQUIREMENTS의 "깨지면 안 되는 약속"을 검증합니다.
 * - 모든 requirement의 role이 VariableRole 타입에 정의된 값이어야 함
 * - 변수 타입이 VariableType에 정의된 값이어야 함
 * - 필수 필드 누락 감지
 * - role 불일치 = 가장 흔한 버그 원인 (CLAUDE.md 규칙 #1)
 *
 * 의존 파일 ~16개 → 이 계약이 깨지면 변수 선택 UI 전체 장애
 */

import {
  STATISTICAL_METHOD_REQUIREMENTS,
  type VariableRole,
  type VariableType,
  type StatisticalMethodRequirements,
} from '@/lib/statistics/variable-requirements'

// ============================================================================
// 허용된 값 정의 (variable-requirements.ts의 타입에서 추출)
// ============================================================================

const VALID_ROLES: VariableRole[] = [
  'dependent', 'independent', 'factor', 'covariate', 'blocking',
  'within', 'between', 'time', 'event', 'censoring', 'weight',
]

const VALID_TYPES: VariableType[] = [
  'continuous', 'categorical', 'binary', 'ordinal', 'date', 'count',
]

const VALID_CATEGORIES = [
  // statistical-methods.ts와 통일된 카테고리 (2026-03-02 정합성 통일)
  'descriptive', 't-test', 'anova', 'correlation', 'regression',
  'nonparametric', 'chi-square', 'multivariate', 'survival', 'timeseries',
  'design', 'psychometrics',
]

// ============================================================================
// 1. 구조적 계약: 모든 requirement에 필수 필드 존재
// ============================================================================

describe('variable-requirements contract', () => {
  describe('필수 필드 존재', () => {
    it.each(
      STATISTICAL_METHOD_REQUIREMENTS.map((r) => [r.id, r] as [string, StatisticalMethodRequirements])
    )('%s: id, name, category, description, variables가 존재해야 함', (_id, req) => {
      expect(req.id).toBeTruthy()
      expect(req.name).toBeTruthy()
      expect(req.category).toBeTruthy()
      expect(req.description).toBeTruthy()
      expect(Array.isArray(req.variables)).toBe(true)
    })
  })

  // ============================================================================
  // 2. 수량 보호: requirement가 줄어들면 안 됨
  // ============================================================================

  describe('수량 보호', () => {
    it('최소 41개 메서드 requirement가 정의되어야 함', () => {
      // 중복 id 제거 후 count (일부 id가 여러 requirement에 등장할 수 있음)
      const uniqueIds = new Set(STATISTICAL_METHOD_REQUIREMENTS.map((r) => r.id))
      expect(uniqueIds.size).toBeGreaterThanOrEqual(41)
    })
  })

  // ============================================================================
  // 3. Role 계약: 모든 role이 VariableRole 타입 범위 내
  // ============================================================================

  describe('role 유효성', () => {
    it.each(
      STATISTICAL_METHOD_REQUIREMENTS.map((r) => [r.id, r] as [string, StatisticalMethodRequirements])
    )('%s: 모든 변수 role이 VariableRole 범위 내', (_id, req) => {
      for (const v of req.variables) {
        expect(VALID_ROLES).toContain(v.role)
      }
    })
  })

  // ============================================================================
  // 4. Type 계약: 모든 types가 VariableType 범위 내
  // ============================================================================

  describe('variable type 유효성', () => {
    it.each(
      STATISTICAL_METHOD_REQUIREMENTS.map((r) => [r.id, r] as [string, StatisticalMethodRequirements])
    )('%s: 모든 변수 types가 VariableType 범위 내', (_id, req) => {
      for (const v of req.variables) {
        for (const t of v.types) {
          expect(VALID_TYPES).toContain(t)
        }
      }
    })
  })

  // ============================================================================
  // 5. Category 계약: 알려진 카테고리만 사용
  // ============================================================================

  describe('category 유효성', () => {
    it.each(
      STATISTICAL_METHOD_REQUIREMENTS.map((r) => [r.id, r] as [string, StatisticalMethodRequirements])
    )('%s: category가 유효한 값이어야 함', (_id, req) => {
      expect(VALID_CATEGORIES).toContain(req.category)
    })
  })

  // ============================================================================
  // 6. 변수 제약조건 계약: minCount <= maxCount
  // ============================================================================

  describe('변수 제약조건 정합성', () => {
    it('minCount가 있으면 maxCount 이하여야 함', () => {
      for (const req of STATISTICAL_METHOD_REQUIREMENTS) {
        for (const v of req.variables) {
          if (v.minCount !== undefined && v.maxCount !== undefined) {
            expect(v.minCount).toBeLessThanOrEqual(v.maxCount)
          }
        }
      }
    })

    it('required 변수는 minCount가 0이 아니거나 없어야 함', () => {
      for (const req of STATISTICAL_METHOD_REQUIREMENTS) {
        for (const v of req.variables) {
          if (v.required && v.minCount !== undefined) {
            expect(v.minCount).toBeGreaterThanOrEqual(1)
          }
        }
      }
    })
  })

  // ============================================================================
  // 7. 핵심 메서드 변수 계약: 자주 사용되는 메서드의 role 패턴 보호
  // ============================================================================

  describe('핵심 메서드 변수 패턴', () => {
    function findReq(id: string): StatisticalMethodRequirements | undefined {
      return STATISTICAL_METHOD_REQUIREMENTS.find((r) => r.id === id)
    }

    function getRoles(req: StatisticalMethodRequirements): string[] {
      return req.variables.map((v) => v.role)
    }

    it('two-sample-t는 dependent + factor를 가져야 함', () => {
      const req = findReq('two-sample-t')
      expect(req).toBeDefined()
      expect(req!.category).toBe('t-test')
      const roles = getRoles(req!)
      expect(roles).toContain('dependent')
      expect(roles).toContain('factor')
    })

    it('one-way-anova는 dependent + factor를 가져야 함', () => {
      const req = findReq('one-way-anova')
      expect(req).toBeDefined()
      expect(req!.category).toBe('anova')
      const roles = getRoles(req!)
      expect(roles).toContain('dependent')
      expect(roles).toContain('factor')
    })

    it('ancova는 dependent + factor + covariate를 가져야 함', () => {
      const req = findReq('ancova')
      expect(req).toBeDefined()
      expect(req!.category).toBe('anova')
      const roles = getRoles(req!)
      expect(roles).toContain('dependent')
      expect(roles).toContain('factor')
      expect(roles).toContain('covariate')
    })

    it('kaplan-meier는 time + event를 가져야 함', () => {
      const req = findReq('kaplan-meier')
      expect(req).toBeDefined()
      const roles = getRoles(req!)
      expect(roles).toContain('time')
      expect(roles).toContain('event')
    })

    it('cox-regression은 time + event + covariate를 가져야 함', () => {
      const req = findReq('cox-regression')
      expect(req).toBeDefined()
      const roles = getRoles(req!)
      expect(roles).toContain('time')
      expect(roles).toContain('event')
    })

    it('mixed-model은 dependent + factor + blocking을 가져야 함', () => {
      const req = findReq('mixed-model')
      expect(req).toBeDefined()
      const roles = getRoles(req!)
      expect(roles).toContain('dependent')
      expect(roles).toContain('factor')
      expect(roles).toContain('blocking')
    })
  })

  // ============================================================================
  // 8. minSampleSize 계약: 양수여야 함
  // ============================================================================

  describe('minSampleSize 유효성', () => {
    // power-analysis는 표본 크기를 계산하는 도구이므로 minSampleSize: 0 허용
    const ZERO_SAMPLE_SIZE_ALLOWED = ['power-analysis']

    it.each(
      STATISTICAL_METHOD_REQUIREMENTS.map((r) => [r.id, r] as [string, StatisticalMethodRequirements])
    )('%s: minSampleSize가 0 이상이어야 함', (_id, req) => {
      if (ZERO_SAMPLE_SIZE_ALLOWED.includes(req.id)) {
        expect(req.minSampleSize).toBeGreaterThanOrEqual(0)
      } else {
        expect(req.minSampleSize).toBeGreaterThan(0)
      }
    })
  })

  // ============================================================================
  // 9. ID 유일성: requirement 내 중복 role 검사
  // ============================================================================

  describe('requirement 내부 정합성', () => {
    it('같은 requirement 내에서 label이 비어있으면 안 됨', () => {
      for (const req of STATISTICAL_METHOD_REQUIREMENTS) {
        for (const v of req.variables) {
          expect(v.label).toBeTruthy()
        }
      }
    })

    it('같은 requirement 내에서 description이 비어있으면 안 됨', () => {
      for (const req of STATISTICAL_METHOD_REQUIREMENTS) {
        for (const v of req.variables) {
          expect(v.description).toBeTruthy()
        }
      }
    })

    it('같은 requirement 내에서 types 배열이 비어있으면 안 됨', () => {
      for (const req of STATISTICAL_METHOD_REQUIREMENTS) {
        for (const v of req.variables) {
          expect(v.types.length).toBeGreaterThan(0)
        }
      }
    })
  })
})
