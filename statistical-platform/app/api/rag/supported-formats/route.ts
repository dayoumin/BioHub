/**
 * 지원 파일 형식 API
 *
 * GET /api/rag/supported-formats
 *
 * Parser Registry를 Server-Side로 분리하여
 * Client Component에서 Node.js 모듈 import 방지
 */

import { NextResponse } from 'next/server'
import { defaultParserRegistry } from '@/lib/rag/parsers/parser-registry'

// Static export compatibility (API route not used in static build)
export const dynamic = 'error'

export async function GET() {
  try {
    const supportedFormats = defaultParserRegistry.getSupportedFormats()
    const parsers = defaultParserRegistry.getAllParsers()

    return NextResponse.json({
      supportedFormats,
      parsers: parsers.map((parser) => ({
        name: parser.name,
        formats: parser.supportedFormats,
      })),
    })
  } catch (error) {
    console.error('[SupportedFormatsAPI] Error:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get supported formats',
      },
      { status: 500 }
    )
  }
}
