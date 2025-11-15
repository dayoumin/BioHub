/**
 * RAG 파일 업로더 컴포넌트
 *
 * 기능:
 * - HWP, PDF, Markdown 파일 업로드
 * - 파일 파싱 및 텍스트 추출
 * - 메타데이터 자동 생성 (파일명 기반)
 * - 문서 DB 자동 추가
 *
 * 지원 파일 형식:
 * - HWP/HWPX (hwp.js)
 * - PDF (Docling)
 * - Markdown (.md, .txt)
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Upload, FileText, Loader2, CheckCircle2, XCircle, X } from 'lucide-react'
import { defaultParserRegistry } from '@/lib/rag/parsers/parser-registry'
import type { Document } from '@/lib/rag/providers/base-provider'

interface FileUploadState {
  file: File
  status: 'pending' | 'parsing' | 'success' | 'error'
  parsedText?: string
  error?: string
  metadata: {
    doc_id: string
    title: string
    library: string
    category: string
    summary: string
  }
}

interface FileUploaderProps {
  onDocumentAdded: (doc: Document) => void
  onClose: () => void
}

export function FileUploader({ onDocumentAdded, onClose }: FileUploaderProps) {
  const [uploadState, setUploadState] = useState<FileUploadState | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 지원 파일 형식
  const supportedFormats = defaultParserRegistry.getSupportedFormats()
  const acceptedExtensions = supportedFormats.join(',')

  /**
   * 파일명에서 메타데이터 자동 추출
   */
  const extractMetadata = useCallback((file: File): FileUploadState['metadata'] => {
    const fileName = file.name
    const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '')

    // 파일명 패턴: {library}-{category}-{title}.ext
    // 예: scipy-hypothesis-ttest_ind.pdf
    const parts = fileNameWithoutExt.split('-')

    let library = 'custom'
    let category = 'general'
    let title = fileNameWithoutExt

    if (parts.length >= 3) {
      library = parts[0]
      category = parts[1]
      title = parts.slice(2).join('-')
    } else if (parts.length === 2) {
      library = parts[0]
      title = parts[1]
    }

    // doc_id: user_{timestamp}_{filename}
    const timestamp = Date.now()
    const doc_id = `user_${timestamp}_${fileNameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_')}`

    return {
      doc_id,
      title,
      library,
      category,
      summary: '', // 사용자가 직접 입력
    }
  }, [])

  /**
   * 파일 선택 핸들러
   */
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      // 파일 확장자 확인
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!supportedFormats.includes(ext)) {
        alert(
          `지원하지 않는 파일 형식입니다.\n\n지원 형식: ${supportedFormats.join(', ')}`
        )
        return
      }

      setIsProcessing(true)

      try {
        // 1. 메타데이터 자동 추출
        const metadata = extractMetadata(file)

        // 2. 초기 상태 설정
        setUploadState({
          file,
          status: 'parsing',
          metadata,
        })

        // 3. 파일 파싱
        const parser = defaultParserRegistry.getParser(ext)
        if (!parser) {
          throw new Error(`파서를 찾을 수 없습니다: ${ext}`)
        }

        // 파일을 임시 경로에 저장 후 파싱 (브라우저 환경에서는 File 객체 직접 전달)
        // TODO: 서버 사이드 파싱 구현 필요
        const text = await parseFileInBrowser(file, parser.name)

        // 4. 파싱 성공
        setUploadState((prev) =>
          prev
            ? {
                ...prev,
                status: 'success',
                parsedText: text,
              }
            : null
        )
      } catch (error) {
        // 5. 파싱 실패
        console.error('[FileUploader] 파일 파싱 실패:', error)
        setUploadState((prev) =>
          prev
            ? {
                ...prev,
                status: 'error',
                error: error instanceof Error ? error.message : '알 수 없는 오류',
              }
            : null
        )
      } finally {
        setIsProcessing(false)
      }
    },
    [supportedFormats, extractMetadata]
  )

  /**
   * 서버 사이드 파일 파싱
   */
  async function parseFileInBrowser(file: File, parserName: string): Promise<string> {
    // Markdown/Text 파일은 직접 읽기 (빠른 처리)
    if (parserName === 'markdown-parser') {
      return await file.text()
    }

    // HWP/PDF는 서버 사이드 API 호출
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/rag/parse-file', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '파일 파싱 실패')
    }

    const result = await response.json()
    if (!result.success || !result.text) {
      throw new Error('파일 파싱 결과가 없습니다')
    }

    return result.text
  }

  /**
   * 메타데이터 업데이트
   */
  const updateMetadata = useCallback(
    (field: keyof FileUploadState['metadata'], value: string) => {
      setUploadState((prev) =>
        prev
          ? {
              ...prev,
              metadata: {
                ...prev.metadata,
                [field]: value,
              },
            }
          : null
      )
    },
    []
  )

  /**
   * 문서 추가 핸들러
   */
  const handleAddDocument = useCallback(async () => {
    if (!uploadState || !uploadState.parsedText) return

    // 필수 필드 검증
    if (
      !uploadState.metadata.doc_id ||
      !uploadState.metadata.title ||
      !uploadState.metadata.library
    ) {
      alert('필수 필드를 모두 입력해주세요 (문서 ID, 제목, 라이브러리)')
      return
    }

    try {
      setIsProcessing(true)

      // 문서 객체 생성
      const document: Document = {
        doc_id: uploadState.metadata.doc_id,
        title: uploadState.metadata.title,
        library: uploadState.metadata.library,
        category: uploadState.metadata.category || undefined,
        content: uploadState.parsedText,
        summary: uploadState.metadata.summary || undefined,
      }

      // 부모 컴포넌트에 전달
      onDocumentAdded(document)

      // 상태 초기화
      setUploadState(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('[FileUploader] 문서 추가 실패:', error)
      alert(`문서 추가 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setIsProcessing(false)
    }
  }, [uploadState, onDocumentAdded])

  /**
   * 취소 핸들러
   */
  const handleCancel = useCallback(() => {
    setUploadState(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* 헤더 */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Upload className="h-5 w-5" />
            파일 업로드
          </h3>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 파일 선택 */}
        {!uploadState && (
          <div className="space-y-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept={acceptedExtensions}
              onChange={handleFileSelect}
              disabled={isProcessing}
            />
            <div className="text-xs text-muted-foreground">
              지원 형식: {supportedFormats.join(', ')}
            </div>
          </div>
        )}

        {/* 파싱 상태 */}
        {uploadState && (
          <div className="space-y-4">
            {/* 파일 정보 */}
            <Card className="p-3 bg-muted/50">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{uploadState.file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(uploadState.file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                {uploadState.status === 'parsing' && (
                  <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
                )}
                {uploadState.status === 'success' && (
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                )}
                {uploadState.status === 'error' && (
                  <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                )}
              </div>

              {uploadState.status === 'parsing' && (
                <div className="mt-2 text-sm text-muted-foreground">파일 파싱 중...</div>
              )}

              {uploadState.status === 'error' && (
                <div className="mt-2 text-sm text-destructive">{uploadState.error}</div>
              )}

              {uploadState.status === 'success' && (
                <div className="mt-2 text-sm text-green-600">
                  파싱 완료 ({uploadState.parsedText?.length.toLocaleString()} 문자)
                </div>
              )}
            </Card>

            {/* 메타데이터 입력 */}
            {uploadState.status === 'success' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">문서 ID *</label>
                  <Input
                    value={uploadState.metadata.doc_id}
                    onChange={(e) => updateMetadata('doc_id', e.target.value)}
                    placeholder="예: scipy_ttest_ind"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">제목 *</label>
                  <Input
                    value={uploadState.metadata.title}
                    onChange={(e) => updateMetadata('title', e.target.value)}
                    placeholder="예: scipy.stats.ttest_ind"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">라이브러리 *</label>
                    <Input
                      value={uploadState.metadata.library}
                      onChange={(e) => updateMetadata('library', e.target.value)}
                      placeholder="예: scipy, numpy"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">카테고리</label>
                    <Input
                      value={uploadState.metadata.category}
                      onChange={(e) => updateMetadata('category', e.target.value)}
                      placeholder="예: hypothesis"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">요약</label>
                  <Textarea
                    value={uploadState.metadata.summary}
                    onChange={(e) => updateMetadata('summary', e.target.value)}
                    rows={3}
                    placeholder="문서의 간단한 요약을 입력하세요"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">파싱된 내용 (미리보기)</label>
                  <Textarea
                    value={uploadState.parsedText?.slice(0, 1000) + '...'}
                    disabled
                    rows={8}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddDocument} disabled={isProcessing} className="flex-1">
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        처리 중...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        문서 추가
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleCancel} disabled={isProcessing}>
                    취소
                  </Button>
                </div>
              </div>
            )}

            {/* 에러 시 재시도 버튼 */}
            {uploadState.status === 'error' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1"
                >
                  다시 시도
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
