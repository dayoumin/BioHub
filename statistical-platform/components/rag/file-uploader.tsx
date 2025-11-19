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

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileText, Loader2, CheckCircle2, XCircle, X, AlertTriangle, Settings } from 'lucide-react'
import type { Document } from '@/lib/rag/providers/base-provider'
import { checkDoclingAvailable } from '@/lib/utils/environment-detector'
import { DoclingSetupDialog } from './docling-setup-dialog'

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
  // ✅ Bug Fix 2: 기본값으로 초기화 (API 응답 전에도 작동)
  // ✅ Bug Fix 4: .text, .markdown 추가 (getParserType과 일치)
  const [supportedFormats, setSupportedFormats] = useState<string[]>([
    '.hwp',
    '.pdf',
    '.md',
    '.txt',
    '.text',
    '.markdown',
  ])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Docling 상태 관리
  const [doclingAvailable, setDoclingAvailable] = useState<boolean | null>(null)
  const [showDoclingWarning, setShowDoclingWarning] = useState(false)
  const [doclingDialogOpen, setDoclingDialogOpen] = useState(false)
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null)

  // 지원 파일 형식을 API에서 가져오기 (Server-Side Parser Registry)
  useEffect(() => {
    fetch('/api/rag/supported-formats')
      .then((res) => {
        // ✅ Bug Fix 3: HTTP 에러 체크
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        // ✅ Bug Fix 3: 데이터 검증 후 업데이트
        if (Array.isArray(data.supportedFormats) && data.supportedFormats.length > 0) {
          setSupportedFormats(data.supportedFormats)
        }
      })
      .catch((error) => {
        console.error('[FileUploader] Failed to fetch supported formats:', error)
        // ✅ Fallback은 이미 초기값으로 설정됨
      })
  }, [])

  // Docling 가용성 체크
  useEffect(() => {
    checkDoclingAvailable().then(setDoclingAvailable)
  }, [])

  const acceptedExtensions = supportedFormats.join(',')

  /**
   * 확장자 기반 파서 타입 결정 (Client-side)
   */
  function getParserType(ext: string): 'markdown' | 'server' {
    const markdownExts = ['.md', '.txt', '.text', '.markdown']
    return markdownExts.includes(ext) ? 'markdown' : 'server'
  }

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
    const sanitized = fileNameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_')

    // 한글 등 비ASCII 문자가 대부분인 경우 UUID 사용
    const meaningfulChars = sanitized.replace(/[_-]/g, '')
    let doc_id: string

    if (meaningfulChars.length < 3) {
      // 의미 있는 문자가 3개 미만 → UUID 사용
      const uuid = Math.random().toString(36).substring(2, 10) // 8자 랜덤 문자열
      doc_id = `user_${timestamp}_${uuid}`
    } else {
      doc_id = `user_${timestamp}_${sanitized}`
    }

    return {
      doc_id,
      title,
      library,
      category,
      summary: '', // 사용자가 직접 입력
    }
  }, [])

  /**
   * 파일 파싱 처리 (공통 로직)
   */
  const processFile = useCallback(
    async (file: File) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()

      setIsProcessing(true)
      setShowDoclingWarning(false)

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
        const parserType = getParserType(ext)
        const text = await parseFile(file, parserType)

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
        setPendingPdfFile(null)
      }
    },
    [extractMetadata]
  )

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

      // 파일 크기 제한 (50MB)
      const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
      if (file.size > MAX_FILE_SIZE) {
        alert(
          `파일 크기가 너무 큽니다.\n\n` +
            `현재 크기: ${(file.size / 1024 / 1024).toFixed(1)}MB\n` +
            `최대 크기: ${MAX_FILE_SIZE / 1024 / 1024}MB`
        )
        return
      }

      // PDF 파일이고 Docling이 없으면 경고 표시
      // doclingAvailable이 null(체크 중) 또는 false(미설치)일 때 경고
      if (ext === '.pdf' && doclingAvailable !== true) {
        setPendingPdfFile(file)
        setShowDoclingWarning(true)
        // 파일 input 초기화 (같은 파일 재선택 가능하도록)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }

      // 파일 처리 진행
      await processFile(file)
    },
    [supportedFormats, doclingAvailable, processFile]
  )

  /**
   * 파일 파싱 (Client + Server)
   */
  async function parseFile(
    file: File,
    parserType: 'markdown' | 'server'
  ): Promise<string> {
    // Markdown/Text 파일은 직접 읽기 (빠른 처리)
    if (parserType === 'markdown') {
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
        {!uploadState && !showDoclingWarning && (
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

        {/* Docling 경고 배너 */}
        {showDoclingWarning && pendingPdfFile && (
          <div className="space-y-3">
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <div className="space-y-2">
                  <p className="font-medium">
                    {doclingAvailable === null
                      ? 'Docling 상태를 확인할 수 없습니다'
                      : 'PDF 고품질 파싱을 위해 Docling 설정이 필요합니다'}
                  </p>
                  <p className="text-sm">
                    Docling 없이도 기본 파서로 처리할 수 있지만, 표/이미지 등이 제대로 추출되지 않을 수 있습니다.
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (pendingPdfFile) {
                    processFile(pendingPdfFile)
                  }
                }}
              >
                기본 파서로 진행
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={() => setDoclingDialogOpen(true)}
              >
                <Settings className="h-4 w-4" />
                Docling 설정하기
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setShowDoclingWarning(false)
                setPendingPdfFile(null)
                if (fileInputRef.current) {
                  fileInputRef.current.value = ''
                }
              }}
            >
              취소
            </Button>
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
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
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
                <div className="mt-2 text-sm text-success">
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

      {/* Docling 설정 다이얼로그 */}
      <DoclingSetupDialog
        open={doclingDialogOpen}
        onOpenChange={setDoclingDialogOpen}
        onRetry={async () => {
          // Docling 재확인 후 파일 처리
          const available = await checkDoclingAvailable()
          setDoclingAvailable(available)
          if (available && pendingPdfFile) {
            processFile(pendingPdfFile)
          }
        }}
      />
    </Card>
  )
}
