/**
 * RAG 스트리밍 API 엔드포인트
 *
 * POST /api/rag/stream
 * - 사용자 질문을 받아 RAG 시스템에서 스트리밍 응답 반환
 * - Server-Sent Events (SSE) 형식의 JSON Lines 스트림
 */

import { NextRequest, NextResponse } from 'next/server'
import { RAGService } from '@/lib/rag/rag-service'
import type { RAGContext } from '@/lib/rag/providers/base-provider'

interface StreamRequest {
  query: string
  sessionId?: string
  searchMode?: 'fts5' | 'vector' | 'hybrid'
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body: unknown = await request.json()

    // 타입 검증
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: '요청 본문이 유효하지 않습니다' },
        { status: 400 }
      )
    }

    const { query, searchMode } = body as StreamRequest

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'query는 필수 문자열입니다' },
        { status: 400 }
      )
    }

    // RAG 서비스 초기화
    const ragService = RAGService.getInstance()
    await ragService.initialize()

    // RAG 컨텍스트 생성
    const context: RAGContext = {
      query: query.trim(),
      searchMode: (searchMode || 'hybrid') as 'fts5' | 'vector' | 'hybrid',
    }

    // Ollama Provider 가져오기
    const provider = (ragService as any).provider
    if (!provider || !provider.streamGenerateAnswer) {
      console.error('[stream] Provider가 스트리밍을 지원하지 않습니다')
      return NextResponse.json(
        { error: '스트리밍을 지원하지 않습니다' },
        { status: 500 }
      )
    }

    // 스트리밍 응답 생성
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 먼저 RAG 쿼리 실행 (컨텍스트 생성)
          const ragResponse = await ragService.query(context)

          // 1. RAG 메타데이터 전송
          const metadataChunk = {
            type: 'metadata',
            sources: ragResponse.sources,
            model: ragResponse.model,
          }
          controller.enqueue(
            encoder.encode(JSON.stringify(metadataChunk) + '\n')
          )

          // 2. 스트리밍 시작
          // RAG 응답의 컨텍스트 텍스트 재생성
          const searchResults = ragResponse.sources.map((source) => ({
            doc_id: source.title,
            title: source.title,
            content: source.content,
            library: 'rag',
            category: 'assistant',
            score: source.score,
          }))

          const contextText = (provider as any).buildContext(
            searchResults,
            context
          )

          // 3. 스트리밍 응답 생성
          for await (const chunk of provider.streamGenerateAnswer(
            contextText,
            context.query
          )) {
            if (chunk) {
              const chunkMessage = { chunk }
              controller.enqueue(
                encoder.encode(JSON.stringify(chunkMessage) + '\n')
              )
            }
          }

          // 4. 완료 신호
          const doneMessage = { done: true }
          controller.enqueue(
            encoder.encode(JSON.stringify(doneMessage) + '\n')
          )

          controller.close()
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
          console.error('[stream] 스트리밍 오류:', error)

          const errorChunk = {
            error: errorMessage,
          }
          controller.enqueue(
            encoder.encode(JSON.stringify(errorChunk) + '\n')
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[stream] 요청 처리 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
