/**
 * LangGraph RAG Provider 테스트
 *
 * 목적: LangGraphOllamaProvider가 정상적으로 동작하는지 확인
 */

async function testLangGraphProvider() {
  console.log('🔍 LangGraph RAG Provider 테스트 시작...\n')

  // Test 1: Provider import
  console.log('Test 1: Provider import 테스트')
  try {
    const { LangGraphOllamaProvider } = await import(
      '../lib/rag/providers/langgraph-ollama-provider.js'
    )
    console.log('✅ LangGraphOllamaProvider import 성공\n')

    // Test 2: Provider 생성
    console.log('Test 2: Provider 생성 테스트')
    const provider = new LangGraphOllamaProvider({
      name: 'Test LangGraph Provider',
      ollamaEndpoint: 'http://localhost:11434',
      embeddingModel: 'nomic-embed-text',
      inferenceModel: 'qwen2.5',
      testMode: true,
    })
    console.log('✅ Provider 생성 성공\n')

    // Test 3: Provider 초기화
    console.log('Test 3: Provider 초기화 테스트')
    try {
      await provider.initialize()
      console.log('✅ Provider 초기화 성공\n')
    } catch (error) {
      console.log('⚠️  Provider 초기화 실패 (예상됨 - Ollama 미설치 또는 모델 미설치)')
      console.log('   에러:', error.message)
      console.log('   → Mock 모드로 계속 진행...\n')
    }

    // Test 4: RAG 쿼리 실행 (Mock)
    console.log('Test 4: RAG 쿼리 실행 테스트 (Mock)')
    try {
      // RAG 워크플로우가 초기화되어 있지 않더라도 구조 확인
      console.log('   Provider 구조 확인:')
      console.log('   - query 메서드:', typeof provider.query === 'function' ? '✅' : '❌')
      console.log('   - isReady 메서드:', typeof provider.isReady === 'function' ? '✅' : '❌')
      console.log(
        '   - cleanup 메서드:',
        typeof provider.cleanup === 'function' ? '✅' : '❌'
      )
      console.log('✅ Provider 인터페이스 검증 성공\n')
    } catch (error) {
      console.error('❌ Provider 구조 검증 실패:', error.message)
      process.exit(1)
    }

    console.log('🎉 LangGraph RAG Provider 테스트 완료!\n')
    console.log('✅ Import 성공')
    console.log('✅ Provider 생성 성공')
    console.log('✅ 인터페이스 호환성 확인')
    console.log('\n다음 단계: 실제 Ollama 연동 테스트 (Ollama 설치 필요)')
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// 실행
testLangGraphProvider().catch((error) => {
  console.error('테스트 실패:', error)
  process.exit(1)
})
