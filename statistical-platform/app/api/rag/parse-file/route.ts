/**
 * 파일 파싱 API
 *
 * POST /api/rag/parse-file
 *
 * 파일을 서버에서 파싱하여 텍스트 추출
 * - HWP/HWPX (hwp.js)
 * - PDF (Docling via Python)
 * - Markdown (.md, .txt)
 */

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink } from 'fs/promises'
import path from 'path'
import { defaultParserRegistry } from '@/lib/rag/parsers/parser-registry'

// Static export compatibility (API route not used in static build)
export const dynamic = 'error'

export async function POST(request: NextRequest) {
  try {
    // FormData에서 파일 추출
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: '파일이 제공되지 않았습니다' }, { status: 400 })
    }

    // 파일 확장자 확인
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    const supportedFormats = defaultParserRegistry.getSupportedFormats()

    if (!supportedFormats.includes(ext)) {
      return NextResponse.json(
        {
          error: `지원하지 않는 파일 형식입니다 (${ext})`,
          supportedFormats,
        },
        { status: 400 }
      )
    }

    // 파서 찾기
    const parser = defaultParserRegistry.getParser(ext)
    if (!parser) {
      return NextResponse.json({ error: `파서를 찾을 수 없습니다: ${ext}` }, { status: 500 })
    }

    // 임시 파일 저장 경로
    const tempDir = path.join(process.cwd(), 'temp')
    const timestamp = Date.now()
    const tempFilePath = path.join(tempDir, `${timestamp}_${file.name}`)

    try {
      // 파일을 임시 디렉토리에 저장
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // temp 디렉토리 생성 (없으면)
      const fs = await import('fs/promises')
      try {
        await fs.mkdir(tempDir, { recursive: true })
      } catch (error) {
        // 디렉토리가 이미 존재하는 경우 무시
      }

      await writeFile(tempFilePath, buffer)

      console.log(`[ParseFileAPI] 파일 저장: ${tempFilePath}`)

      // 파서로 텍스트 추출
      const text = await parser.parse(tempFilePath)

      console.log(`[ParseFileAPI] 파싱 완료: ${text.length} 문자`)

      // 임시 파일 삭제
      await unlink(tempFilePath)

      // 결과 반환
      return NextResponse.json({
        success: true,
        text,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: ext,
          parserName: parser.name,
          textLength: text.length,
        },
      })
    } catch (parseError) {
      // 파싱 에러 시 임시 파일 삭제 시도
      try {
        await unlink(tempFilePath)
      } catch {
        // 삭제 실패 무시
      }

      throw parseError
    }
  } catch (error) {
    console.error('[ParseFileAPI] 파싱 실패:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '파일 파싱 중 오류가 발생했습니다',
      },
      { status: 500 }
    )
  }
}

// GET 요청 시 지원 형식 반환
export async function GET() {
  const supportedFormats = defaultParserRegistry.getSupportedFormats()
  const parsers = defaultParserRegistry.getAllParsers()

  return NextResponse.json({
    supportedFormats,
    parsers: parsers.map((parser) => ({
      name: parser.name,
      formats: parser.supportedFormats,
    })),
  })
}
