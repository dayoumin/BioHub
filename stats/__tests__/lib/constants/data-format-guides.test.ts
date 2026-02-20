/**
 * data-format-guides 단위 테스트
 *
 * 가이드 조회, 범용 가이드, 매핑 일관성 검증
 */

import {
  getDataFormatGuide,
  getGenericGuide,
  DATA_FORMAT_GUIDES,
  GENERIC_GUIDE,
  type DataFormatGuideInfo,
} from '@/lib/constants/data-format-guides'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'

describe('data-format-guides', () => {
  // ================================================================
  // 1. 가이드 조회
  // ================================================================
  describe('getDataFormatGuide', () => {
    it('등록된 methodId로 가이드를 조회할 수 있다', () => {
      const guide = getDataFormatGuide('t-test')
      expect(guide).not.toBeNull()
      expect(guide!.methodId).toBe('t-test')
    })

    it('미등록 methodId는 null을 반환한다', () => {
      expect(getDataFormatGuide('non-existent-method')).toBeNull()
    })

    it.each([
      'one-sample-t', 't-test', 'paired-t', 'welch-t',
      'anova', 'two-way-anova', 'repeated-measures-anova',
      'chi-square', 'regression', 'correlation',
      'mann-whitney', 'wilcoxon', 'kruskal-wallis',
      'kaplan-meier', 'cox-regression',
      'pca', 'factor-analysis', 'cluster',
    ])('"%s" 가이드가 존재하고 필수 필드를 가진다', (methodId) => {
      const guide = getDataFormatGuide(methodId)
      expect(guide).not.toBeNull()
      expect(guide!.summary).toBeTruthy()
      expect(guide!.instructions.length).toBeGreaterThan(0)
      expect(guide!.example.headers.length).toBeGreaterThan(0)
      expect(guide!.example.rows.length).toBeGreaterThan(0)
    })
  })

  // ================================================================
  // 2. 범용 가이드
  // ================================================================
  describe('getGenericGuide', () => {
    it('범용 가이드를 반환한다', () => {
      const guide = getGenericGuide()
      expect(guide).toBeDefined()
      expect(guide.methodId).toBe('generic')
    })

    it('범용 가이드는 필수 필드를 모두 가진다', () => {
      const guide = getGenericGuide()
      expect(guide.summary).toBeTruthy()
      expect(guide.instructions.length).toBeGreaterThanOrEqual(3)
      expect(guide.example.headers.length).toBeGreaterThanOrEqual(2)
      expect(guide.example.rows.length).toBeGreaterThanOrEqual(2)
    })

    it('범용 가이드에 방법 선택 후 안내가 있다는 경고가 있다', () => {
      const guide = getGenericGuide()
      expect(guide.warnings).toBeDefined()
      expect(guide.warnings!.length).toBeGreaterThan(0)
    })
  })

  // ================================================================
  // 3. 가이드 구조 일관성
  // ================================================================
  describe('가이드 구조 일관성', () => {
    const allGuides = Object.entries(DATA_FORMAT_GUIDES)

    it('모든 가이드는 DataFormatGuideInfo 형태를 따른다', () => {
      for (const [key, guide] of allGuides) {
        expect(typeof guide.methodId).toBe('string')
        expect(typeof guide.summary).toBe('string')
        expect(Array.isArray(guide.instructions)).toBe(true)
        expect(guide.example).toBeDefined()
        expect(Array.isArray(guide.example.headers)).toBe(true)
        expect(Array.isArray(guide.example.rows)).toBe(true)

        // 예시 행의 열 수가 헤더 수와 일치해야 함
        for (const row of guide.example.rows) {
          expect(row.length).toBe(guide.example.headers.length)
        }
      }
    })

    it('각 가이드는 서로 다른 객체이다 (공유 가이드 없음)', () => {
      const guideObjects = Object.values(DATA_FORMAT_GUIDES)
      const uniqueGuides = new Set(guideObjects.map(g => g.methodId))
      // 동일 methodId가 여러 키에 매핑될 수 있지만, 각 가이드 자체는 고유 참조여야 함
      // 예: 'anova'와 'one-way-anova' → 같은 ONE_WAY_ANOVA 참조 (이건 OK)
      // 하지만 'seasonal-decompose'가 ARIMA를 공유하면 안 됨
      const timeSeries = [
        DATA_FORMAT_GUIDES['arima'],
        DATA_FORMAT_GUIDES['seasonal-decompose'],
        DATA_FORMAT_GUIDES['mann-kendall'],
        DATA_FORMAT_GUIDES['stationarity-test'],
      ]
      // 모두 서로 다른 methodId
      const tsMethodIds = timeSeries.map(g => g.methodId)
      expect(new Set(tsMethodIds).size).toBe(4)

      const survival = [
        DATA_FORMAT_GUIDES['kaplan-meier'],
        DATA_FORMAT_GUIDES['cox-regression'],
      ]
      expect(survival[0].methodId).not.toBe(survival[1].methodId)
    })

    it('등록된 가이드 수가 30개 이상이다', () => {
      expect(Object.keys(DATA_FORMAT_GUIDES).length).toBeGreaterThanOrEqual(30)
    })
  })

  // ================================================================
  // 4. STATISTICAL_METHODS와의 교차 검증
  // ================================================================
  describe('STATISTICAL_METHODS 커버리지', () => {
    it('주요 통계 방법은 가이드가 존재한다', () => {
      const criticalMethods = [
        't-test', 'paired-t', 'one-sample-t',
        'anova', 'two-way-anova',
        'chi-square', 'regression',
        'correlation', 'mann-whitney',
      ]
      for (const methodId of criticalMethods) {
        expect(getDataFormatGuide(methodId)).not.toBeNull()
      }
    })

    it('STATISTICAL_METHODS에 있는 ID 중 가이드 미등록 비율이 30% 이하다', () => {
      const allMethodIds = Object.keys(STATISTICAL_METHODS)
      const missing = allMethodIds.filter(id => !DATA_FORMAT_GUIDES[id])
      const missingRate = missing.length / allMethodIds.length
      // 일부 특수 방법(logistic 등)은 가이드 없을 수 있음
      expect(missingRate).toBeLessThanOrEqual(0.3)
    })
  })
})
