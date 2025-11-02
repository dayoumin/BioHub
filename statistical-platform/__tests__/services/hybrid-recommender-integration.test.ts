/**
 * HybridRecommender 통합 테스트
 *
 * 테스트 목적:
 * OllamaRecommender → HybridRecommender → UI 전체 플로우 검증
 */

import { HybridRecommender } from '@/lib/services/hybrid-recommender'
import type { StatisticalMethod, MethodWarning, MethodOrWarning } from '@/types/smart-flow'

// Mock OllamaRecommender - 실제 응답 형식 시뮬레이션
jest.mock('@/lib/services/ollama-recommender', () => ({
  OllamaRecommender: jest.fn().mockImplementation(() => ({
    checkHealth: jest.fn().mockResolvedValue(true),
    recommend: jest.fn().mockResolvedValue({
      methods: [
        {
          id: 't-test',
          name: '독립표본 t-검정',
          confidence: 0.95,
          reason: '두 그룹의 평균 차이를 검정하기에 적합합니다'
        },
        {
          id: 'mann-whitney',
          name: 'Mann-Whitney U 검정',
          confidence: 0.85,
          reason: '비모수 검정으로 정규분포 가정이 불필요합니다'
        }
      ],
      confidence: 0.9,
      clarification: undefined,
      fallback: false
    })
  }))
}))

// Mock KeywordBasedRecommender
jest.mock('@/lib/services/keyword-based-recommender', () => ({
  KeywordBasedRecommender: {
    recommendMethods: jest.fn().mockReturnValue([
      { id: 'correlation', name: 'Pearson 상관분석', description: '상관관계 분석', category: 'descriptive' }
    ])
  }
}))

describe('HybridRecommender 통합 테스트 (LLM → UI)', () => {
  let recommender: HybridRecommender

  beforeEach(() => {
    recommender = new HybridRecommender()
    jest.clearAllMocks()
  })

  it('LLM 응답 → StatisticalMethod 변환 → UI 렌더링 가능', async () => {
    const dataInfo = {
      rowCount: 100,
      columnCount: 2,
      missingRatio: 0
    }

    const result = await recommender.recommend('두 그룹 비교', dataInfo)

    // 1. final.methods가 StatisticalMethod[] 타입인지 확인
    expect(result.final.methods).toBeDefined()
    expect(Array.isArray(result.final.methods)).toBe(true)

    // 2. 각 메서드가 StatisticalMethod 구조를 가지는지 확인
    result.final.methods.forEach(method => {
      expect(method).toHaveProperty('id')
      expect(method).toHaveProperty('name')
      expect(method).toHaveProperty('description')
      expect(method).toHaveProperty('category')

      // UI에서 사용하지 않는 LLM 전용 필드가 제거되었는지 확인
      expect(method).not.toHaveProperty('confidence')
      expect(method).not.toHaveProperty('reason')
    })
  })

  it('StatisticalMethod vs MethodWarning 타입 가드 (UI 렌더링)', async () => {
    const dataInfo = {
      rowCount: 20, // 작은 샘플 → MethodWarning 생성
      columnCount: 2,
      missingRatio: 0.3 // 결측값 많음 → MethodWarning 생성
    }

    const result = await recommender.recommend('두 그룹 비교', dataInfo)

    // UI 렌더링 시뮬레이션: 타입 가드로 구분
    const methods: StatisticalMethod[] = []
    const warnings: MethodWarning[] = []

    result.final.methods.forEach((item: MethodOrWarning) => {
      if ('category' in item) {
        // StatisticalMethod
        methods.push(item)
        expect(['descriptive', 't-test', 'anova', 'regression', 'nonparametric', 'advanced']).toContain(item.category)
      } else if ('type' in item) {
        // MethodWarning
        warnings.push(item)
        expect(['warning', 'info', 'recommendation']).toContain(item.type)
      }
    })

    // 검증
    expect(methods.length).toBeGreaterThan(0) // 최소 1개의 메서드
    expect(warnings.length).toBeGreaterThan(0) // 최소 1개의 경고 (작은 샘플 + 결측값)

    console.log('\n=== UI 렌더링 시뮬레이션 ===')
    console.log('통계 메서드:', methods.map(m => m.name))
    console.log('경고:', warnings.map(w => w.name))
  })

  it('LLM 응답의 모든 필드가 올바르게 매핑됨', async () => {
    const result = await recommender.recommend('두 그룹 비교', {
      rowCount: 100,
      columnCount: 2,
      missingRatio: 0
    })

    // enhanced 결과 확인 (LLM 직접 응답)
    expect(result.enhanced).toBeDefined()
    expect(result.enhanced?.methods).toBeDefined()

    const llmMethods = result.enhanced!.methods

    llmMethods.forEach(method => {
      // LLM 응답이 StatisticalMethod로 변환되었는지 확인
      expect(method).toHaveProperty('id')
      expect(method).toHaveProperty('name')
      expect(method).toHaveProperty('description')
      expect(method).toHaveProperty('category')

      // description에 LLM의 reason이 매핑되었는지 확인
      if (method.id === 't-test') {
        expect(method.description).toContain('평균 차이')
      }
      if (method.id === 'mann-whitney') {
        expect(method.description).toContain('비모수')
      }
    })
  })

  it('카테고리 추론이 정확한지 확인', async () => {
    const result = await recommender.recommend('두 그룹 비교', {
      rowCount: 100,
      columnCount: 2,
      missingRatio: 0
    })

    const methods = result.enhanced!.methods.filter(m => 'category' in m) as StatisticalMethod[]

    const tTestMethod = methods.find(m => m.id === 't-test')
    const mannWhitneyMethod = methods.find(m => m.id === 'mann-whitney')

    expect(tTestMethod?.category).toBe('t-test')
    expect(mannWhitneyMethod?.category).toBe('nonparametric')
  })

  it('UI 컴포넌트 렌더링 예시 (타입 안전성)', async () => {
    const result = await recommender.recommend('두 그룹 비교', {
      rowCount: 20,
      columnCount: 2,
      missingRatio: 0.3
    })

    // React 컴포넌트 렌더링 시뮬레이션
    const renderMethodOrWarning = (item: MethodOrWarning) => {
      if ('category' in item) {
        // StatisticalMethod 렌더링
        return {
          type: 'method',
          title: item.name,
          badge: item.category,
          description: item.description
        }
      } else {
        // MethodWarning 렌더링
        return {
          type: 'warning',
          title: item.name,
          badge: item.type,
          description: item.description
        }
      }
    }

    // 모든 항목 렌더링 가능
    const rendered = result.final.methods.map(renderMethodOrWarning)

    expect(rendered.length).toBeGreaterThan(0)
    expect(rendered.some(r => r.type === 'method')).toBe(true)
    expect(rendered.some(r => r.type === 'warning')).toBe(true)

    console.log('\n=== UI 렌더링 결과 ===')
    rendered.forEach(item => {
      console.log(`[${item.badge}] ${item.title}`)
    })
  })
})
