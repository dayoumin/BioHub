/**
 * RAG 스트리밍 API 엔드포인트
 *
 * POST /api/rag/stream
 * - 사용자 질문을 받아 RAG 시스템에서 스트리밍 응답 반환
 * - Server-Sent Events (SSE) 형식의 JSON Lines 스트림
 */

import { NextRequest, NextResponse } from 'next/server'
import { queryRAGStream } from '@/lib/rag/rag-service'
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

    // RAG 컨텍스트 생성
    const context: RAGContext = {
      query: query.trim(),
      searchMode: (searchMode || 'hybrid') as 'fts5' | 'vector' | 'hybrid',
    }

    // 스트리밍 응답 생성
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller: ReadableStreamDefaultController) {
        try {
          let metadataSent = false

          // queryRAGStream 사용 (단일 검색/생성)
          await queryRAGStream(
            context,
            // onChunk: 텍스트 조각 전송
            (chunk: string) => {
              if (chunk) {
                const chunkMessage = { chunk }
                controller.enqueue(
                  encoder.encode(JSON.stringify(chunkMessage) + '\n')
                )
              }
            },
            // onSources: 메타데이터 전송 (검색 완료 시 1회)
            (sources) => {
              if (!metadataSent) {
                metadataSent = true
                const metadataChunk = {
                  type: 'metadata',
                  sources,
                  model: process.env.NEXT_PUBLIC_OLLAMA_INFERENCE_MODEL || 'qwen2.5:7b',
                }
                controller.enqueue(
                  encoder.encode(JSON.stringify(metadataChunk) + '\n')
                )
              }
            }
          )

          // 완료 신호
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
