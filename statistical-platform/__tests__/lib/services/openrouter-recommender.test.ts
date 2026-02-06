/**
 * Unit Tests for OpenRouterRecommender - LLM Enhanced Recommendation
 *
 * Test Coverage:
 * - filterInvalidVariables: 환각 방지 변수 필터링
 * - parseResponse: 확장 필드 (variableAssignments, suggestedSettings, warnings, etc.)
 * - buildDataContext: 왜도 + topCategories + PII 필터링
 * - buildAssumptionContext: 가정 검정 컨텍스트 포맷팅
 */

import { OpenRouterRecommender } from '@/lib/services/openrouter-recommender'
import type { ValidationResults, ColumnStatistics } from '@/types/smart-flow'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- private 메서드 접근 (TypeScript private은 compile-time only)
type AnyRecommender = Record<string, any>

describe('OpenRouterRecommender', () => {
  let recommender: AnyRecommender

  beforeEach(() => {
    // 싱글톤 대신 fresh 인스턴스 (테스트 격리)
    recommender = new OpenRouterRecommender() as unknown as AnyRecommender
  })

  // ==========================================
  // filterInvalidVariables
  // ==========================================
  describe('filterInvalidVariables', () => {
    const validNames = new Set(['sepal_length', 'sepal_width', 'petal_length', 'species'])

    it('유효한 변수명만 유지한다', () => {
      const assignments = {
        dependent: ['sepal_length'],
        independent: ['sepal_width', 'petal_length'],
        factor: ['species']
      }
      const result = recommender.filterInvalidVariables(assignments, validNames)

      expect(result).toEqual({
        dependent: ['sepal_length'],
        independent: ['sepal_width', 'petal_length'],
        factor: ['species']
      })
    })

    it('환각된 변수명을 필터링한다', () => {
      const assignments = {
        dependent: ['sepal_length'],
        independent: ['fake_column', 'hallucinated_var'],
        factor: ['species']
      }
      const result = recommender.filterInvalidVariables(assignments, validNames)

      expect(result).toEqual({
        dependent: ['sepal_length'],
        factor: ['species']
      })
      // independent는 모두 무효 → 키 자체가 없어야 함
      expect(result?.independent).toBeUndefined()
    })

    it('모든 변수가 무효면 undefined를 반환한다', () => {
      const assignments = {
        dependent: ['nonexistent'],
        independent: ['also_fake']
      }
      const result = recommender.filterInvalidVariables(assignments, validNames)

      expect(result).toBeUndefined()
    })

    it('빈 역할 배열은 undefined 처리', () => {
      const assignments = {
        dependent: ['sepal_length'],
        independent: [] as string[]
      }
      const result = recommender.filterInvalidVariables(assignments, validNames)

      expect(result).toEqual({
        dependent: ['sepal_length']
      })
      expect(result?.independent).toBeUndefined()
    })

    it('within/between 역할도 필터링한다', () => {
      const assignments = {
        within: ['sepal_length', 'nonexistent'],
        between: ['species']
      }
      const result = recommender.filterInvalidVariables(assignments, validNames)

      expect(result).toEqual({
        within: ['sepal_length'],
        between: ['species']
      })
    })

    it('undefined 역할은 건너뛴다', () => {
      const assignments = {
        dependent: ['sepal_length'],
        covariate: undefined
      }
      const result = recommender.filterInvalidVariables(assignments, validNames)

      expect(result).toEqual({
        dependent: ['sepal_length']
      })
      expect(result?.covariate).toBeUndefined()
    })
  })

  // ==========================================
  // parseResponse - 확장 필드
  // ==========================================
  describe('parseResponse - LLM Enhanced fields', () => {
    it('모든 확장 필드를 올바르게 파싱한다', () => {
      const content = `추천 설명입니다.

\`\`\`json
{
  "methodId": "one-way-anova",
  "methodName": "일원분산분석",
  "confidence": 0.85,
  "reasoning": ["정규성 충족", "3개 이상 그룹"],
  "variableAssignments": {
    "dependent": ["sepal_length"],
    "factor": ["species"]
  },
  "suggestedSettings": {
    "alpha": 0.05,
    "postHoc": "tukey",
    "alternative": "two-sided"
  },
  "warnings": ["표본 크기가 그룹당 30 미만"],
  "dataPreprocessing": ["결측치 제거 권장"],
  "ambiguityNote": "종류 간 비교인지 상관관계인지 모호함",
  "alternatives": [
    { "id": "kruskal-wallis", "name": "크루스칼-월리스", "description": "이 관점에서 보면: 비모수적 비교" }
  ]
}
\`\`\``
      const result = recommender.parseResponse(content)

      expect(result).not.toBeNull()
      expect(result!.method.id).toBe('one-way-anova')
      expect(result!.variableAssignments).toEqual({
        dependent: ['sepal_length'],
        factor: ['species']
      })
      expect(result!.suggestedSettings).toEqual({
        alpha: 0.05,
        postHoc: 'tukey',
        alternative: 'two-sided'
      })
      expect(result!.warnings).toEqual(['표본 크기가 그룹당 30 미만'])
      expect(result!.dataPreprocessing).toEqual(['결측치 제거 권장'])
      expect(result!.ambiguityNote).toBe('종류 간 비교인지 상관관계인지 모호함')
    })

    it('확장 필드가 없으면 undefined로 처리한다', () => {
      const content = `\`\`\`json
{
  "methodId": "t-test",
  "methodName": "독립표본 t-검정",
  "confidence": 0.9,
  "reasoning": ["두 그룹 비교"]
}
\`\`\``
      const result = recommender.parseResponse(content)

      expect(result).not.toBeNull()
      expect(result!.variableAssignments).toBeUndefined()
      expect(result!.suggestedSettings).toBeUndefined()
      expect(result!.warnings).toBeUndefined()
      expect(result!.dataPreprocessing).toBeUndefined()
      expect(result!.ambiguityNote).toBeUndefined()
    })

    it('warnings가 배열이 아니면 무시한다', () => {
      const content = `\`\`\`json
{
  "methodId": "t-test",
  "methodName": "t-검정",
  "confidence": 0.8,
  "reasoning": [],
  "warnings": "문자열 경고"
}
\`\`\``
      const result = recommender.parseResponse(content)

      expect(result).not.toBeNull()
      expect(result!.warnings).toBeUndefined()
    })

    it('ambiguityNote가 문자열이 아니면 무시한다', () => {
      const content = `\`\`\`json
{
  "methodId": "t-test",
  "methodName": "t-검정",
  "confidence": 0.7,
  "reasoning": [],
  "ambiguityNote": 123
}
\`\`\``
      const result = recommender.parseResponse(content)

      expect(result).not.toBeNull()
      expect(result!.ambiguityNote).toBeUndefined()
    })

    it('코드 블록 없이 순수 JSON도 파싱한다', () => {
      const content = `{
  "methodId": "pearson-correlation",
  "methodName": "피어슨 상관분석",
  "confidence": 0.88,
  "reasoning": ["수치형 변수 2개"],
  "suggestedSettings": { "alpha": 0.01 }
}`
      const result = recommender.parseResponse(content)

      expect(result).not.toBeNull()
      expect(result!.method.id).toBe('pearson-correlation')
      expect(result!.suggestedSettings).toEqual({ alpha: 0.01 })
    })

    it('잘못된 JSON이면 null을 반환한다', () => {
      const content = '이것은 JSON이 아닙니다.'
      const result = recommender.parseResponse(content)
      expect(result).toBeNull()
    })

    it('필수 필드(methodId, methodName) 누락 시 null 반환', () => {
      const content = `\`\`\`json
{ "confidence": 0.9, "reasoning": ["이유"] }
\`\`\``
      const result = recommender.parseResponse(content)
      expect(result).toBeNull()
    })
  })

  // ==========================================
  // buildDataContext - 왜도 + topCategories + PII
  // ==========================================
  describe('buildDataContext', () => {
    const baseValidation: ValidationResults = {
      totalRows: 150,
      columnCount: 2,
      missingValues: 0,
      dataType: 'csv',
      variables: ['sepal_length', 'species'],
      warnings: [],
      isValid: true,
      errors: [],
      columns: [
        {
          name: 'sepal_length',
          type: 'numeric',
          mean: 5.84,
          std: 0.83,
          min: 4.3,
          max: 7.9,
          skewness: 0.31,
          missingCount: 0,
          uniqueValues: 35
        } as ColumnStatistics,
        {
          name: 'species',
          type: 'categorical',
          missingCount: 0,
          uniqueValues: 3,
          topCategories: [
            { value: 'setosa', count: 50 },
            { value: 'versicolor', count: 50 },
            { value: 'virginica', count: 50 }
          ]
        } as ColumnStatistics
      ]
    }

    it('왜도(skewness) 열이 포함된다', () => {
      const context = recommender.buildDataContext(baseValidation)
      // 헤더에 왜도 열 존재
      expect(context).toContain('왜도')
      // sepal_length의 왜도 0.31
      expect(context).toContain('0.31')
    })

    it('topCategories가 범주형 변수 상세에 표시된다', () => {
      const context = recommender.buildDataContext(baseValidation)
      expect(context).toContain('## 범주형 변수 상세')
      expect(context).toContain('setosa(50)')
      expect(context).toContain('versicolor(50)')
    })

    it('ID 컬럼의 topCategories는 제외된다 (PII 필터)', () => {
      const validationWithId: ValidationResults = {
        ...baseValidation,
        columns: [
          ...baseValidation.columns!,
          {
            name: 'student_id',
            type: 'categorical',
            missingCount: 0,
            uniqueValues: 150,
            topCategories: [
              { value: 'STU001', count: 1 },
              { value: 'STU002', count: 1 }
            ],
            idDetection: { isId: true, reason: 'unique values match row count' }
          } as ColumnStatistics
        ]
      }

      const context = recommender.buildDataContext(validationWithId)
      // species의 topCategories는 포함
      expect(context).toContain('setosa(50)')
      // student_id의 topCategories는 제외
      expect(context).not.toContain('STU001')
    })

    it('모든 범주형이 ID이면 범주형 상세 섹션 자체가 없다', () => {
      const validationAllId: ValidationResults = {
        ...baseValidation,
        columns: [
          baseValidation.columns![0], // sepal_length (numeric)
          {
            name: 'id',
            type: 'categorical',
            missingCount: 0,
            uniqueValues: 150,
            topCategories: [{ value: 'ID001', count: 1 }],
            idDetection: { isId: true, reason: 'unique' }
          } as ColumnStatistics
        ]
      }

      const context = recommender.buildDataContext(validationAllId)
      expect(context).not.toContain('## 범주형 변수 상세')
    })

    it('데이터가 없으면 안내 메시지 반환', () => {
      const context = recommender.buildDataContext(null)
      expect(context).toContain('데이터가 업로드되지 않았습니다')
    })

    it('skewness가 없으면 "-"로 표시', () => {
      const noSkew: ValidationResults = {
        ...baseValidation,
        columns: [{
          name: 'col1',
          type: 'numeric',
          mean: 1.0,
          std: 0.5,
          min: 0,
          max: 2,
          missingCount: 0,
          uniqueValues: 10
          // skewness 없음
        } as ColumnStatistics]
      }
      const context = recommender.buildDataContext(noSkew)
      // 왜도 열에 '-' 표시
      expect(context).toMatch(/col1.*numeric.*-/)
    })

    it('20개 초과 컬럼은 절단 메시지 표시', () => {
      const manyColumns: ValidationResults = {
        totalRows: 100,
        columnCount: 25,
        missingValues: 0,
        dataType: 'csv',
        variables: Array.from({ length: 25 }, (_, i) => `col_${i}`),
        warnings: [],
        isValid: true,
        errors: [],
        columns: Array.from({ length: 25 }, (_, i) => ({
          name: `col_${i}`,
          type: 'numeric' as const,
          mean: i,
          std: 1,
          min: 0,
          max: i * 2,
          missingCount: 0,
          uniqueValues: 50
        })) as ColumnStatistics[]
      }

      const context = recommender.buildDataContext(manyColumns)
      expect(context).toContain('외 5개 변수 생략')
    })
  })

  // ==========================================
  // buildAssumptionContext
  // ==========================================
  describe('buildAssumptionContext', () => {
    it('정규성+등분산성 결과를 포맷한다', () => {
      const assumptions = {
        normality: {
          shapiroWilk: { statistic: 0.98, pValue: 0.15, isNormal: true }
        },
        homogeneity: {
          levene: { statistic: 1.2, pValue: 0.28, equalVariance: true }
        }
      }
      const context = recommender.buildAssumptionContext(assumptions)
      expect(context).toContain('충족')
      expect(context).toContain('0.150')
      expect(context).toContain('0.280')
    })

    it('null이면 미실시 메시지', () => {
      const context = recommender.buildAssumptionContext(null)
      expect(context).toContain('가정 검정 미실시')
    })
  })
})
