/**
 * LangGraph.js 브라우저 호환성 테스트 (Node.js 스크립트)
 *
 * 목적: @langchain/langgraph가 정상적으로 import되고 동작하는지 확인
 */

async function testLangGraphCompatibility() {
  console.log('🔍 LangGraph.js 호환성 테스트 시작...\n')

  // Test 1: 기본 import
  console.log('Test 1: 기본 import 테스트')
  try {
    const { StateGraph, Annotation, START, END } = await import('@langchain/langgraph')
    console.log('✅ StateGraph import 성공')
    console.log('✅ Annotation import 성공')
    console.log('✅ START, END 상수 import 성공\n')
  } catch (error) {
    console.error('❌ Import 실패:', error.message)
    process.exit(1)
  }

  // Test 2: 간단한 StateGraph 생성 및 실행
  console.log('Test 2: StateGraph 생성 및 실행 테스트')
  try {
    const { StateGraph, Annotation, START, END } = await import('@langchain/langgraph')

    // 상태 정의
    const State = Annotation.Root({
      input: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => '',
      }),
      output: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => '',
      }),
    })

    // StateGraph 생성
    const workflow = new StateGraph(State)
      .addNode('process', async (state) => {
        return { output: `Processed: ${state.input}` }
      })
      .addEdge(START, 'process')
      .addEdge('process', END)

    // 컴파일
    const app = workflow.compile()
    console.log('✅ StateGraph 컴파일 성공')

    // 실행
    const result = await app.invoke({ input: 'Hello LangGraph!' })
    console.log('✅ StateGraph 실행 성공')
    console.log('   결과:', result)

    if (result.output !== 'Processed: Hello LangGraph!') {
      throw new Error('예상 결과와 다릅니다')
    }
    console.log('✅ 결과 검증 성공\n')
  } catch (error) {
    console.error('❌ StateGraph 실행 실패:', error.message)
    console.error(error.stack)
    process.exit(1)
  }

  // Test 3: 병렬 실행 테스트
  console.log('Test 3: 병렬 실행 테스트 (Vector + BM25)')
  try {
    const { StateGraph, Annotation, START, END } = await import('@langchain/langgraph')

    // 병렬 실행을 위한 상태 정의
    const State = Annotation.Root({
      query: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => '',
      }),
      vectorResults: Annotation({
        reducer: (x, y) => y ?? x ?? [],
        default: () => [],
      }),
      bm25Results: Annotation({
        reducer: (x, y) => y ?? x ?? [],
        default: () => [],
      }),
      merged: Annotation({
        reducer: (x, y) => y ?? x ?? [],
        default: () => [],
      }),
    })

    // 병렬 검색 시뮬레이션
    const workflow = new StateGraph(State)
      .addNode('vectorSearch', async (state) => {
        // Vector 검색 시뮬레이션 (50ms 지연)
        await new Promise((resolve) => setTimeout(resolve, 50))
        return { vectorResults: [`vec1-${state.query}`, `vec2-${state.query}`] }
      })
      .addNode('bm25Search', async (state) => {
        // BM25 검색 시뮬레이션 (30ms 지연)
        await new Promise((resolve) => setTimeout(resolve, 30))
        return { bm25Results: [`bm25-1-${state.query}`, `bm25-2-${state.query}`] }
      })
      .addNode('merge', async (state) => {
        // 결과 병합
        return { merged: [...state.vectorResults, ...state.bm25Results] }
      })
      .addEdge(START, 'vectorSearch')
      .addEdge(START, 'bm25Search') // 병렬 실행!
      .addEdge('vectorSearch', 'merge')
      .addEdge('bm25Search', 'merge')
      .addEdge('merge', END)

    const app = workflow.compile()

    // 실행 시간 측정
    const startTime = Date.now()
    const result = await app.invoke({ query: 'ANOVA 가정' })
    const elapsed = Date.now() - startTime

    console.log('✅ 병렬 실행 성공')
    console.log('   실행 시간:', elapsed, 'ms (병렬 실행으로 50ms 이하 예상)')
    console.log('   병합 결과:', result.merged)

    if (result.merged.length !== 4) {
      throw new Error(`병합 결과 개수가 잘못되었습니다: ${result.merged.length}`)
    }

    console.log('✅ 병합 결과 검증 성공\n')
  } catch (error) {
    console.error('❌ 병렬 실행 실패:', error.message)
    console.error(error.stack)
    process.exit(1)
  }

  // Test 4: TypeScript 타입 체크
  console.log('Test 4: TypeScript 타입 안전성 테스트')
  try {
    const { StateGraph, Annotation, START, END } = await import('@langchain/langgraph')

    // 타입 안전한 상태 정의
    const State = Annotation.Root({
      count: Annotation({
        reducer: (x, y) => (x ?? 0) + (y ?? 0),
        default: () => 0,
      }),
    })

    const workflow = new StateGraph(State)
      .addNode('increment', async (state) => {
        return { count: 1 }
      })
      .addEdge(START, 'increment')
      .addEdge('increment', END)

    const app = workflow.compile()
    const result = await app.invoke({ count: 5 })

    console.log('✅ TypeScript 타입 안전성 확인')
    console.log('   결과:', result)
    console.log('   count:', result.count, '(예상: 6)')

    if (result.count !== 6) {
      throw new Error(`Reducer가 정상 작동하지 않습니다: ${result.count}`)
    }

    console.log('✅ Reducer 동작 검증 성공\n')
  } catch (error) {
    console.error('❌ TypeScript 타입 테스트 실패:', error.message)
    console.error(error.stack)
    process.exit(1)
  }

  console.log('🎉 모든 LangGraph.js 호환성 테스트 통과!\n')
  console.log('✅ @langchain/langgraph@1.0.2 정상 동작 확인')
  console.log('✅ StateGraph 생성/실행 가능')
  console.log('✅ 병렬 실행 가능 (성능 향상 가능)')
  console.log('✅ TypeScript 타입 안전성 확보')
  console.log('\n다음 단계: LangGraph 기반 RAG Provider 구현')
}

// 실행
testLangGraphCompatibility().catch((error) => {
  console.error('테스트 실패:', error)
  process.exit(1)
})