/**
 * 스마트 분석 커버리지 테스트
 * 43개 통계 페이지가 method-mapping.ts에 모두 매핑되어 있는지 확인
 */

import { STATISTICAL_METHODS, QUESTION_TYPES, getMethodsByQuestionType } from '@/lib/statistics/method-mapping'

// 실제 43개 통계 페이지 목록 (app/(dashboard)/statistics/ 디렉토리 기준)
const STATISTICS_PAGES = [
  'ancova',
  'anova',
  'binomial-test',
  'chi-square',
  'chi-square-goodness',
  'chi-square-independence',
  'cluster',
  'cochran-q',
  'correlation',
  'descriptive',
  'discriminant',
  'dose-response',
  'explore-data',
  'factor-analysis',
  'friedman',
  'kruskal-wallis',
  'ks-test',
  'mann-kendall',
  'mann-whitney',
  'manova',
  'mcnemar',
  'means-plot',
  'mixed-model',
  'mood-median',
  'non-parametric',
  'normality-test',
  'one-sample-t',
  'ordinal-regression',
  'partial-correlation',
  'pca',
  'poisson',
  'power-analysis',
  'proportion-test',
  'regression',
  'reliability',
  'repeated-measures-anova',
  'response-surface',
  'runs-test',
  'sign-test',
  'stepwise',
  't-test',
  'welch-t',
  'wilcoxon'
]

// 페이지 → method-mapping ID 매핑 테이블
const PAGE_TO_METHOD_MAP: Record<string, string[]> = {
  'ancova': ['ancova'],
  'anova': ['one-way-anova', 'two-way-anova'],
  'binomial-test': ['binomial-test'],
  'chi-square': ['chi-square'],
  'chi-square-goodness': ['chi-square-goodness'],
  'chi-square-independence': ['chi-square-independence'],
  'cluster': ['k-means', 'hierarchical'],
  'cochran-q': ['cochran-q'],
  'correlation': ['correlation'],
  'descriptive': ['descriptive-stats'],
  'discriminant': ['discriminant'],
  'dose-response': ['dose-response'],
  'explore-data': ['explore-data'],
  'factor-analysis': ['factor-analysis'],
  'friedman': ['friedman'],
  'kruskal-wallis': ['kruskal-wallis'],
  'ks-test': ['ks-test'],
  'mann-kendall': ['mann-kendall'],
  'mann-whitney': ['mann-whitney'],
  'manova': ['manova'],
  'mcnemar': ['mcnemar'],
  'means-plot': ['means-plot'],
  'mixed-model': ['mixed-model'],
  'mood-median': ['mood-median'],
  'non-parametric': ['non-parametric'],
  'normality-test': ['normality-test'],
  'one-sample-t': ['one-sample-t'],
  'ordinal-regression': ['ordinal-regression'],
  'partial-correlation': ['partial-correlation'],
  'pca': ['pca'],
  'poisson': ['poisson-regression'],
  'power-analysis': ['power-analysis'],
  'proportion-test': ['proportion-test'],
  'regression': ['simple-regression', 'multiple-regression', 'logistic-regression'],
  'reliability': ['reliability-analysis'],
  'repeated-measures-anova': ['repeated-measures-anova'],
  'response-surface': ['response-surface'],
  'runs-test': ['runs-test'],
  'sign-test': ['sign-test'],
  'stepwise': ['stepwise-regression'],
  't-test': ['two-sample-t', 'paired-t'],
  'welch-t': ['welch-t'],
  'wilcoxon': ['wilcoxon']
}

describe('스마트 분석 커버리지', () => {
  describe('STATISTICAL_METHODS 기본 검증', () => {
    it('47개 이상의 통계 메서드가 정의되어 있어야 한다', () => {
      expect(STATISTICAL_METHODS.length).toBeGreaterThanOrEqual(47)
    })

    it('모든 메서드에 id, name, description, category가 있어야 한다', () => {
      STATISTICAL_METHODS.forEach(method => {
        expect(method.id).toBeDefined()
        expect(method.name).toBeDefined()
        expect(method.description).toBeDefined()
        expect(method.category).toBeDefined()
      })
    })

    it('중복 ID가 없어야 한다', () => {
      const ids = STATISTICAL_METHODS.map(m => m.id)
      const uniqueIds = [...new Set(ids)]
      expect(ids.length).toBe(uniqueIds.length)
    })
  })

  describe('43개 통계 페이지 커버리지', () => {
    it('모든 통계 페이지가 method-mapping에 매핑되어 있어야 한다', () => {
      const missingPages: string[] = []
      const methodIds = STATISTICAL_METHODS.map(m => m.id)

      STATISTICS_PAGES.forEach(page => {
        const expectedMethodIds = PAGE_TO_METHOD_MAP[page]
        if (!expectedMethodIds) {
          missingPages.push(`${page} (매핑 테이블에 없음)`)
          return
        }

        expectedMethodIds.forEach(methodId => {
          if (!methodIds.includes(methodId)) {
            missingPages.push(`${page} → ${methodId}`)
          }
        })
      })

      if (missingPages.length > 0) {
        console.log('누락된 페이지/메서드:', missingPages)
      }

      expect(missingPages).toHaveLength(0)
    })

    it('커버리지가 100%여야 한다', () => {
      const methodIds = STATISTICAL_METHODS.map(m => m.id)
      let coveredPages = 0

      STATISTICS_PAGES.forEach(page => {
        const expectedMethodIds = PAGE_TO_METHOD_MAP[page]
        if (expectedMethodIds && expectedMethodIds.every(id => methodIds.includes(id))) {
          coveredPages++
        }
      })

      const coverage = (coveredPages / STATISTICS_PAGES.length) * 100
      console.log(`커버리지: ${coverage.toFixed(1)}% (${coveredPages}/${STATISTICS_PAGES.length})`)

      expect(coverage).toBe(100)
    })
  })

  describe('추가된 6개 메서드 검증', () => {
    const newMethodIds = [
      'chi-square-independence',
      'factor-analysis',
      'ordinal-regression',
      'poisson-regression',
      'repeated-measures-anova',
      'non-parametric'
    ]

    newMethodIds.forEach(methodId => {
      it(`${methodId}가 STATISTICAL_METHODS에 있어야 한다`, () => {
        const method = STATISTICAL_METHODS.find(m => m.id === methodId)
        expect(method).toBeDefined()
      })
    })

    it('chi-square-independence는 chi-square 카테고리여야 한다', () => {
      const method = STATISTICAL_METHODS.find(m => m.id === 'chi-square-independence')
      expect(method?.category).toBe('chi-square')
    })

    it('factor-analysis는 pca 카테고리여야 한다', () => {
      const method = STATISTICAL_METHODS.find(m => m.id === 'factor-analysis')
      expect(method?.category).toBe('pca')
    })

    it('repeated-measures-anova는 anova 카테고리여야 한다', () => {
      const method = STATISTICAL_METHODS.find(m => m.id === 'repeated-measures-anova')
      expect(method?.category).toBe('anova')
    })

    it('poisson-regression은 regression 카테고리여야 한다', () => {
      const method = STATISTICAL_METHODS.find(m => m.id === 'poisson-regression')
      expect(method?.category).toBe('regression')
    })
  })

  describe('QUESTION_TYPES 연동', () => {
    it('모든 카테고리가 QUESTION_TYPES에 정의되어 있어야 한다', () => {
      const allCategories = QUESTION_TYPES.flatMap(q => q.methods)
      const usedCategories = [...new Set(STATISTICAL_METHODS.map(m => m.category))]

      const missingCategories = usedCategories.filter(cat => !allCategories.includes(cat))

      // 일부 카테고리는 의도적으로 advanced에 포함
      const allowedMissing = ['advanced', 'psychometrics', 'design', 'survival']
      const actualMissing = missingCategories.filter(cat => !allowedMissing.includes(cat))

      expect(actualMissing).toHaveLength(0)
    })

    it('getMethodsByQuestionType이 올바르게 필터링해야 한다', () => {
      const comparisonMethods = getMethodsByQuestionType('comparison')
      expect(comparisonMethods.length).toBeGreaterThan(0)

      // t-test, anova, nonparametric 카테고리만 포함
      comparisonMethods.forEach(method => {
        expect(['t-test', 'anova', 'nonparametric']).toContain(method.category)
      })
    })
  })

  describe('category 오류 회귀 방지', () => {
    // binomial-test/proportion-test/mcnemar/cochran-q가 'chi-square'로 잘못 분류되었던 버그 수정
    // executor는 method.category로 라우팅하므로 'chi-square' → executeChiSquareIndependence(오류)
    // 정상: 'nonparametric' → executeNonparametric의 각 case로 처리
    const shouldBeNonparametric = ['binomial-test', 'proportion-test', 'mcnemar', 'cochran-q']

    shouldBeNonparametric.forEach(methodId => {
      it(`${methodId}는 nonparametric 카테고리여야 한다 (chi-square 아님)`, () => {
        const method = STATISTICAL_METHODS.find(m => m.id === methodId)
        expect(method).toBeDefined()
        expect(method?.category).toBe('nonparametric')
        expect(method?.category).not.toBe('chi-square')
      })
    })
  })

  describe('requirements 구조 검증', () => {
    it('모든 메서드의 requirements가 올바른 구조를 가져야 한다', () => {
      STATISTICAL_METHODS.forEach(method => {
        if (method.requirements) {
          // minSampleSize는 숫자
          if (method.requirements.minSampleSize !== undefined) {
            expect(typeof method.requirements.minSampleSize).toBe('number')
            expect(method.requirements.minSampleSize).toBeGreaterThan(0)
          }

          // variableTypes는 배열
          if (method.requirements.variableTypes !== undefined) {
            expect(Array.isArray(method.requirements.variableTypes)).toBe(true)
          }

          // assumptions는 배열
          if (method.requirements.assumptions !== undefined) {
            expect(Array.isArray(method.requirements.assumptions)).toBe(true)
          }
        }
      })
    })
  })
})