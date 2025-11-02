/**
 * LLM 응답 변환 로직 테스트
 *
 * 테스트 목적:
 * OllamaRecommender의 응답이 StatisticalMethod 타입으로 올바르게 변환되는지 확인
 */

describe('LLM 응답 → StatisticalMethod 변환', () => {
  // 타입 정의 (테스트용)
  interface StatisticalMethod {
    id: string
    name: string
    description: string
    category: 'descriptive' | 't-test' | 'anova' | 'regression' | 'nonparametric' | 'advanced'
  }

  // 실제 HybridRecommender의 변환 로직 복사
  function convertLLMMethodsToStatisticalMethods(llmMethods: any[]): StatisticalMethod[] {
    return llmMethods.map(method => ({
      id: method.id || 'unknown',
      name: method.name || '알 수 없는 메서드',
      description: method.reason || method.description || '',
      category: inferCategory(method.id)
    }))
  }

  function inferCategory(methodId: string | undefined): StatisticalMethod['category'] {
    if (!methodId) return 'descriptive' // 기본값

    const id = methodId.toLowerCase()

    if (id.includes('t-test') || id.includes('ttest')) return 't-test'
    if (id.includes('anova')) return 'anova'
    if (id.includes('regression') || id.includes('회귀')) return 'regression'
    if (id.includes('mann-whitney') || id.includes('kruskal') || id.includes('wilcoxon') || id.includes('friedman')) return 'nonparametric'
    if (id.includes('correlation') || id.includes('상관')) return 'descriptive'
    if (id.includes('chi-square') || id.includes('카이제곱')) return 'advanced'

    return 'descriptive' // 기본값
  }

  it('LLM 응답(confidence, reason 포함) → StatisticalMethod 변환', () => {
    // LLM 응답 예시
    const llmMethods = [
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
    ]

    const converted = convertLLMMethodsToStatisticalMethods(llmMethods)

    // 변환 결과 검증
    expect(converted).toHaveLength(2)

    // 첫 번째 메서드
    expect(converted[0].id).toBe('t-test')
    expect(converted[0].name).toBe('독립표본 t-검정')
    expect(converted[0].description).toBe('두 그룹의 평균 차이를 검정하기에 적합합니다')
    expect(converted[0].category).toBe('t-test')

    // 두 번째 메서드
    expect(converted[1].id).toBe('mann-whitney')
    expect(converted[1].name).toBe('Mann-Whitney U 검정')
    expect(converted[1].description).toBe('비모수 검정으로 정규분포 가정이 불필요합니다')
    expect(converted[1].category).toBe('nonparametric')

    // confidence는 제거됨 (StatisticalMethod에 없음)
    expect('confidence' in converted[0]).toBe(false)
  })

  it('카테고리 추론 로직 검증', () => {
    const testCases: Array<[string, StatisticalMethod['category']]> = [
      ['t-test', 't-test'],
      ['independent-ttest', 't-test'],
      ['one-way-anova', 'anova'],
      ['repeated-measures-anova', 'anova'],
      ['linear-regression', 'regression'],
      ['multiple-regression', 'regression'],
      ['mann-whitney', 'nonparametric'],
      ['kruskal-wallis', 'nonparametric'],
      ['wilcoxon', 'nonparametric'],
      ['friedman', 'nonparametric'],
      ['pearson-correlation', 'descriptive'],
      ['chi-square', 'advanced'],
      ['unknown-method', 'descriptive'] // 기본값
    ]

    testCases.forEach(([methodId, expectedCategory]) => {
      expect(inferCategory(methodId)).toBe(expectedCategory)
    })
  })

  it('필드 누락 시 기본값 처리', () => {
    const llmMethods = [
      {
        // id 누락
        name: '테스트 메서드'
        // reason, description 모두 누락
      }
    ]

    const converted = convertLLMMethodsToStatisticalMethods(llmMethods)

    expect(converted[0].id).toBe('unknown')
    expect(converted[0].name).toBe('테스트 메서드')
    expect(converted[0].description).toBe('')
    expect(converted[0].category).toBe('descriptive') // 기본값
  })

  it('빈 배열 처리', () => {
    const converted = convertLLMMethodsToStatisticalMethods([])
    expect(converted).toEqual([])
  })
})
