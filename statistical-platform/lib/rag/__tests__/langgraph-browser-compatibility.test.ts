/**
 * LangGraph.js 브라우저 호환성 테스트
 *
 * 목적: @langchain/langgraph/web 엔트리 포인트가 브라우저 환경에서 동작하는지 확인
 */

import { describe, it, expect } from '@jest/globals'

describe('LangGraph.js 브라우저 호환성', () => {
  it('should import StateGraph from /web entry point', async () => {
    // 브라우저 환경 시뮬레이션 (window 객체 존재)
    const originalWindow = global.window

    try {
      // @ts-expect-error - 테스트를 위한 window 객체 모킹
      global.window = {} as Window & typeof globalThis

      // LangGraph.js 브라우저 엔트리 포인트 import 시도
      const { StateGraph, Annotation } = await import('@langchain/langgraph/web')

      // StateGraph가 정상적으로 import되었는지 확인
      expect(StateGraph).toBeDefined()
      expect(typeof StateGraph).toBe('function')

      // Annotation이 정상적으로 import되었는지 확인
      expect(Annotation).toBeDefined()
      expect(typeof Annotation).toBe('object')
      expect(typeof Annotation.Root).toBe('function')

      console.log('✅ LangGraph.js 브라우저 엔트리 포인트 정상 작동')
    } finally {
      // 원래 window 객체 복원
      global.window = originalWindow
    }
  })

  it('should create a simple StateGraph', async () => {
    const originalWindow = global.window

    try {
      // @ts-expect-error - 테스트를 위한 window 객체 모킹
      global.window = {} as Window & typeof globalThis

      const { StateGraph, Annotation, START, END } = await import('@langchain/langgraph/web')

      // 간단한 상태 정의
      const State = Annotation.Root({
        input: Annotation<string>(),
        output: Annotation<string>(),
      })

      // StateGraph 생성
      const workflow = new StateGraph(State)
        .addNode('process', async (state: { input: string }) => {
          return { output: `Processed: ${state.input}` }
        })
        .addEdge(START, 'process')
        .addEdge('process', END)

      // 컴파일
      const app = workflow.compile()

      // 실행 테스트
      const result = await app.invoke({ input: 'Hello LangGraph!' })

      expect(result).toBeDefined()
      expect(result.output).toBe('Processed: Hello LangGraph!')

      console.log('✅ StateGraph 생성 및 실행 성공:', result)
    } finally {
      global.window = originalWindow
    }
  })

  it('should support parallel execution with multiple edges', async () => {
    const originalWindow = global.window

    try {
      // @ts-expect-error - 테스트를 위한 window 객체 모킹
      global.window = {} as Window & typeof globalThis

      const { StateGraph, Annotation, START, END } = await import('@langchain/langgraph/web')

      // 병렬 실행을 위한 상태 정의
      const State = Annotation.Root({
        query: Annotation<string>(),
        vectorResults: Annotation<string[]>(),
        bm25Results: Annotation<string[]>(),
        merged: Annotation<string[]>(),
      })

      // 병렬 검색 시뮬레이션
      const workflow = new StateGraph(State)
        .addNode('vectorSearch', async (state: { query: string }) => {
          // Vector 검색 시뮬레이션
          return { vectorResults: [`vec1-${state.query}`, `vec2-${state.query}`] }
        })
        .addNode('bm25Search', async (state: { query: string }) => {
          // BM25 검색 시뮬레이션
          return { bm25Results: [`bm25-1-${state.query}`, `bm25-2-${state.query}`] }
        })
        .addNode('merge', async (state: { vectorResults: string[]; bm25Results: string[] }) => {
          // 결과 병합
          return { merged: [...state.vectorResults, ...state.bm25Results] }
        })
        .addEdge(START, 'vectorSearch')
        .addEdge(START, 'bm25Search')  // 병렬 실행!
        .addEdge('vectorSearch', 'merge')
        .addEdge('bm25Search', 'merge')
        .addEdge('merge', END)

      const app = workflow.compile()

      // 실행
      const result = await app.invoke({ query: 'test' })

      expect(result.merged).toBeDefined()
      expect(result.merged.length).toBe(4)
      expect(result.merged).toContain('vec1-test')
      expect(result.merged).toContain('bm25-1-test')

      console.log('✅ 병렬 실행 성공:', result.merged)
    } finally {
      global.window = originalWindow
    }
  })
})