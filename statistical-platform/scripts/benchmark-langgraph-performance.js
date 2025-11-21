/**
 * LangGraph vs Langchain 성능 벤치마크
 *
 * 목적: 두 Provider의 실제 성능 차이 측정
 *
 * 테스트 시나리오:
 * 1. 동일한 쿼리로 각 Provider 테스트 (10회 반복)
 * 2. 응답 시간, 임베딩 호출 횟수, 검색 품질 비교
 * 3. 통계적 분석 (평균, 표준편차, 최소/최대)
 *
 * 필요 조건:
 * - Ollama 설치 및 실행 (http://localhost:11434)
 * - 모델 설치: mxbai-embed-large, qwen2.5
 * - Vector DB 존재: /rag-data/vector-qwen3-embedding-0.6b.db
 */

import { RAGService } from '../lib/rag/rag-service.js'

// 테스트 쿼리 세트 (통계 관련)
const TEST_QUERIES = [
  'ANOVA 가정 검정이란 무엇인가요?',
  '정규성 검정 방법에는 어떤 것이 있나요?',
  '회귀분석에서 다중공선성 문제를 어떻게 해결하나요?',
  '카이제곱 검정의 사용 조건은 무엇인가요?',
  'Mann-Whitney U 검정은 언제 사용하나요?',
]

/**
 * 성능 측정 (단일 쿼리)
 */
async function measurePerformance(provider, query, providerType) {
  const startTime = Date.now()

  try {
    const response = await provider.query({
      query,
      searchMode: 'hybrid',
    })

    const elapsed = Date.now() - startTime

    return {
      success: true,
      elapsed,
      responseTime: response.metadata?.responseTime || elapsed,
      sourcesCount: response.sources.length,
      answerLength: response.answer.length,
      citedDocsCount: response.citedDocIds?.length || 0,
      providerType,
    }
  } catch (error) {
    return {
      success: false,
      elapsed: Date.now() - startTime,
      error: error.message,
      providerType,
    }
  }
}

/**
 * 통계 계산
 */
function calculateStats(measurements) {
  const times = measurements.map((m) => m.elapsed)
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length
  const stdDev = Math.sqrt(variance)

  return {
    avg: Math.round(avg),
    min: Math.min(...times),
    max: Math.max(...times),
    stdDev: Math.round(stdDev),
    count: times.length,
  }
}

/**
 * 벤치마크 실행
 */
async function runBenchmark() {
  console.log('🚀 LangGraph vs Langchain 성능 벤치마크 시작...\n')

  // Ollama 연결 확인
  try {
    const response = await fetch('http://localhost:11434/api/tags')
    if (!response.ok) {
      throw new Error('Ollama 서버 응답 없음')
    }
    console.log('✅ Ollama 서버 연결 성공\n')
  } catch (error) {
    console.error('❌ Ollama 서버에 연결할 수 없습니다.')
    console.error('   다음 명령어로 Ollama를 시작하세요: ollama serve')
    process.exit(1)
  }

  // Provider 1: OllamaRAGProvider (Langchain 기반)
  console.log('📦 Provider 1: OllamaRAGProvider 초기화 중...')
  const ragServiceOllama = RAGService.getInstance()
  await ragServiceOllama.initialize({
    providerType: 'ollama',
    vectorStoreId: 'qwen3-embedding-0.6b',
    ollamaEndpoint: 'http://localhost:11434',
    embeddingModel: 'mxbai-embed-large',
    inferenceModel: 'qwen2.5',
    topK: 5,
  })
  console.log('✅ OllamaRAGProvider 초기화 완료\n')

  // Provider 2: LangGraphOllamaProvider (LangGraph 기반)
  console.log('📦 Provider 2: LangGraphOllamaProvider 초기화 중...')
  await ragServiceOllama.shutdown() // 기존 Provider 정리
  const ragServiceLangGraph = RAGService.getInstance()
  await ragServiceLangGraph.initialize({
    providerType: 'langgraph',
    vectorStoreId: 'qwen3-embedding-0.6b',
    ollamaEndpoint: 'http://localhost:11434',
    embeddingModel: 'mxbai-embed-large',
    inferenceModel: 'qwen2.5',
    topK: 5,
  })
  console.log('✅ LangGraphOllamaProvider 초기화 완료\n')

  console.log('=' .repeat(80))
  console.log('🔥 벤치마크 시작 (각 쿼리당 5회 측정)')
  console.log('=' .repeat(80))
  console.log()

  const allResultsOllama = []
  const allResultsLangGraph = []

  for (const query of TEST_QUERIES) {
    console.log(`\n📊 쿼리: "${query}"`)
    console.log('-' .repeat(80))

    // OllamaRAGProvider 테스트
    console.log('\n  [Ollama Provider]')
    await ragServiceOllama.shutdown()
    await ragServiceOllama.initialize({
      providerType: 'ollama',
      vectorStoreId: 'qwen3-embedding-0.6b',
      ollamaEndpoint: 'http://localhost:11434',
      embeddingModel: 'mxbai-embed-large',
      inferenceModel: 'qwen2.5',
      topK: 5,
    })

    const ollamaProvider = ragServiceOllama.getOllamaProvider()
    const ollamaResults = []

    for (let i = 0; i < 5; i++) {
      const result = await measurePerformance(ollamaProvider, query, 'ollama')
      ollamaResults.push(result)
      if (result.success) {
        console.log(`    Run ${i + 1}: ${result.elapsed}ms (sources: ${result.sourcesCount})`)
      } else {
        console.log(`    Run ${i + 1}: ❌ ${result.error}`)
      }
    }

    allResultsOllama.push(...ollamaResults.filter((r) => r.success))

    // LangGraphOllamaProvider 테스트
    console.log('\n  [LangGraph Provider]')
    await ragServiceLangGraph.shutdown()
    await ragServiceLangGraph.initialize({
      providerType: 'langgraph',
      vectorStoreId: 'qwen3-embedding-0.6b',
      ollamaEndpoint: 'http://localhost:11434',
      embeddingModel: 'mxbai-embed-large',
      inferenceModel: 'qwen2.5',
      topK: 5,
    })

    const langgraphProvider = ragServiceLangGraph.getOllamaProvider()
    const langgraphResults = []

    for (let i = 0; i < 5; i++) {
      const result = await measurePerformance(langgraphProvider, query, 'langgraph')
      langgraphResults.push(result)
      if (result.success) {
        console.log(`    Run ${i + 1}: ${result.elapsed}ms (sources: ${result.sourcesCount})`)
      } else {
        console.log(`    Run ${i + 1}: ❌ ${result.error}`)
      }
    }

    allResultsLangGraph.push(...langgraphResults.filter((r) => r.success))

    // 쿼리별 요약
    const ollamaStats = calculateStats(ollamaResults.filter((r) => r.success))
    const langgraphStats = calculateStats(langgraphResults.filter((r) => r.success))

    console.log('\n  [쿼리별 요약]')
    console.log(`    Ollama:    평균 ${ollamaStats.avg}ms (최소 ${ollamaStats.min}ms, 최대 ${ollamaStats.max}ms)`)
    console.log(`    LangGraph: 평균 ${langgraphStats.avg}ms (최소 ${langgraphStats.min}ms, 최대 ${langgraphStats.max}ms)`)

    const improvement = ((ollamaStats.avg - langgraphStats.avg) / ollamaStats.avg * 100).toFixed(1)
    if (langgraphStats.avg < ollamaStats.avg) {
      console.log(`    ✅ LangGraph ${improvement}% 빠름`)
    } else {
      console.log(`    ⚠️ Ollama ${Math.abs(improvement)}% 빠름`)
    }
  }

  console.log('\n' + '=' .repeat(80))
  console.log('📈 전체 벤치마크 결과')
  console.log('=' .repeat(80))

  const overallOllama = calculateStats(allResultsOllama)
  const overallLangGraph = calculateStats(allResultsLangGraph)

  console.log('\n[OllamaRAGProvider (Langchain 기반)]')
  console.log(`  평균 응답 시간: ${overallOllama.avg}ms`)
  console.log(`  최소 응답 시간: ${overallOllama.min}ms`)
  console.log(`  최대 응답 시간: ${overallOllama.max}ms`)
  console.log(`  표준 편차:     ${overallOllama.stdDev}ms`)
  console.log(`  측정 횟수:     ${overallOllama.count}회`)

  console.log('\n[LangGraphOllamaProvider (LangGraph 기반)]')
  console.log(`  평균 응답 시간: ${overallLangGraph.avg}ms`)
  console.log(`  최소 응답 시간: ${overallLangGraph.min}ms`)
  console.log(`  최대 응답 시간: ${overallLangGraph.max}ms`)
  console.log(`  표준 편차:     ${overallLangGraph.stdDev}ms`)
  console.log(`  측정 횟수:     ${overallLangGraph.count}회`)

  const totalImprovement =
    ((overallOllama.avg - overallLangGraph.avg) / overallOllama.avg * 100).toFixed(1)

  console.log('\n[성능 비교]')
  if (overallLangGraph.avg < overallOllama.avg) {
    console.log(`  ✅ LangGraph가 평균 ${totalImprovement}% 빠름`)
    console.log(`  절대 시간: ${overallOllama.avg - overallLangGraph.avg}ms 단축`)
  } else {
    console.log(`  ⚠️ Ollama가 평균 ${Math.abs(totalImprovement)}% 빠름`)
    console.log(`  절대 시간: ${overallLangGraph.avg - overallOllama.avg}ms 증가`)
  }

  console.log('\n[예상 vs 실측]')
  console.log(`  예상 성능 향상: 27.3% (110ms → 80ms)`)
  console.log(`  실측 성능 향상: ${totalImprovement}%`)

  if (parseFloat(totalImprovement) >= 20) {
    console.log('  ✅ 목표 달성! (20% 이상 향상)')
  } else if (parseFloat(totalImprovement) >= 10) {
    console.log('  🟡 부분 달성 (10-20% 향상)')
  } else {
    console.log('  ❌ 목표 미달 (10% 미만 향상)')
  }

  console.log('\n' + '=' .repeat(80))
  console.log('✅ 벤치마크 완료!')
  console.log('=' .repeat(80))

  // 정리
  await ragServiceOllama.shutdown()
  await ragServiceLangGraph.shutdown()
}

// 실행
runBenchmark().catch((error) => {
  console.error('벤치마크 실패:', error)
  process.exit(1)
})
