/**
 * RAG 문서 관리 인터페이스
 *
 * 기능:
 * - 문서 목록 조회 (원본 DB + IndexedDB)
 * - 문서 추가/수정/삭제
 * - Vector Store 재구축 트리거
 *
 * 변경 사항 (Phase 2-2):
 * - API routes 제거 (Next.js static export 호환)
 * - RAGService 직접 호출 (브라우저에서)
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Save,
  X,
  FileText,
  Database,
  Upload,
} from 'lucide-react'
import { RAGService } from '@/lib/rag/rag-service'
import type { Document } from '@/lib/rag/providers/base-provider'
import { FileUploader } from './file-uploader'

interface DocumentWithSource extends Document {
  source: 'original' | 'user' // 원본 DB vs 사용자 추가
}

export function DocumentManager() {
  const [documents, setDocuments] = useState<DocumentWithSource[]>([])
  const [selectedDoc, setSelectedDoc] = useState<DocumentWithSource | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRebuilding, setIsRebuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFileUploader, setShowFileUploader] = useState(false)

  // Progress UI 상태
  const [rebuildProgress, setRebuildProgress] = useState({
    current: 0,
    total: 0,
    percentage: 0,
    currentDocTitle: '',
  })

  // Rebuild 에러 상태
  const [rebuildErrors, setRebuildErrors] = useState<Array<{ docId: string; error: string }>>([])

  // 폼 상태
  const [formData, setFormData] = useState({
    doc_id: '',
    title: '',
    library: '',
    category: '',
    content: '',
    summary: '',
  })

  // 문서 목록 로드
  const loadDocuments = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('[DocumentManager] RAGService 초기화 중...')
      const ragService = RAGService.getInstance()
      await ragService.initialize()

      // RAGService의 public 메서드로 문서 조회
      const allDocs = ragService.getAllDocuments()

      // source 필드 추가 (doc_id로 판단)
      const docsWithSource: DocumentWithSource[] = allDocs.map((doc) => ({
        ...doc,
        source: doc.doc_id.startsWith('user_') ? 'user' : 'original',
      }))

      setDocuments(docsWithSource)
      console.log(`[DocumentManager] 문서 ${docsWithSource.length}개 로드 완료`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류'
      setError(errorMessage)
      console.error('[DocumentManager] 문서 로드 실패:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  // 새 문서 추가 모드 (수동 입력)
  const handleNewDocument = useCallback(() => {
    setSelectedDoc(null)
    setIsEditing(true)
    setShowFileUploader(false)
    setFormData({
      doc_id: '',
      title: '',
      library: '',
      category: '',
      content: '',
      summary: '',
    })
  }, [])

  // 파일 업로드 모드
  const handleFileUpload = useCallback(() => {
    setSelectedDoc(null)
    setIsEditing(false)
    setShowFileUploader(true)
  }, [])

  // 파일 업로더로부터 문서 추가
  const handleDocumentFromFile = useCallback(
    async (doc: Document) => {
      try {
        console.log('[DocumentManager] 파일 업로드로 문서 추가:', doc.doc_id)

        const ragService = RAGService.getInstance()
        await ragService.initialize()

        // 문서 추가
        await ragService.addDocument(doc)

        console.log('[DocumentManager] 문서 추가 완료:', doc.doc_id)

        // 목록 새로고침
        await loadDocuments()

        // 파일 업로더 닫기
        setShowFileUploader(false)

        alert(`문서 "${doc.title}"이(가) 추가되었습니다.`)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류'
        setError(errorMessage)
        console.error('[DocumentManager] 파일 업로드 문서 추가 실패:', err)
        alert(`문서 추가 실패: ${errorMessage}`)
      }
    },
    [loadDocuments]
  )

  // 문서 선택
  const handleSelectDocument = useCallback((doc: DocumentWithSource) => {
    setSelectedDoc(doc)
    setIsEditing(false)
    setFormData({
      doc_id: doc.doc_id,
      title: doc.title,
      library: doc.library,
      category: doc.category || '',
      content: doc.content,
      summary: doc.summary || '',
    })
  }, [])

  // 편집 모드 진입
  const handleEditMode = useCallback(() => {
    setIsEditing(true)
  }, [])

  // 편집 취소
  const handleCancelEdit = useCallback(() => {
    if (selectedDoc) {
      setFormData({
        doc_id: selectedDoc.doc_id,
        title: selectedDoc.title,
        library: selectedDoc.library,
        category: selectedDoc.category || '',
        content: selectedDoc.content,
        summary: selectedDoc.summary || '',
      })
      setIsEditing(false)
    } else {
      setSelectedDoc(null)
      setIsEditing(false)
    }
  }, [selectedDoc])

  // 문서 추가
  const handleAddDocument = useCallback(async () => {
    setError(null)

    // 필수 필드 검증
    if (!formData.doc_id || !formData.title || !formData.library || !formData.content) {
      setError('필수 필드를 모두 입력해주세요 (문서 ID, 제목, 라이브러리, 내용)')
      return
    }

    try {
      console.log('[DocumentManager] 문서 추가 중:', formData.doc_id)

      const ragService = RAGService.getInstance()
      await ragService.initialize()

      // RAGService의 public 메서드로 문서 추가
      await ragService.addDocument({
        doc_id: formData.doc_id,
        title: formData.title,
        library: formData.library,
        category: formData.category || undefined,
        content: formData.content,
        summary: formData.summary || undefined,
      })

      console.log('[DocumentManager] 문서 추가 완료:', formData.doc_id)

      // 목록 새로고침
      await loadDocuments()

      // 상태 초기화
      setIsEditing(false)
      setFormData({
        doc_id: '',
        title: '',
        library: '',
        category: '',
        content: '',
        summary: '',
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류'
      setError(errorMessage)
      console.error('[DocumentManager] 문서 추가 실패:', err)
    }
  }, [formData, loadDocuments])

  // 문서 수정
  const handleUpdateDocument = useCallback(async () => {
    if (!selectedDoc) return

    setError(null)

    try {
      console.log('[DocumentManager] 문서 수정 중:', selectedDoc.doc_id)

      const ragService = RAGService.getInstance()
      await ragService.initialize()

      // RAGService의 public 메서드로 문서 수정
      const success = await ragService.updateDocument(selectedDoc.doc_id, {
        title: formData.title,
        content: formData.content,
        category: formData.category || undefined,
        summary: formData.summary || undefined,
      })

      if (!success) {
        throw new Error('문서 수정 실패')
      }

      console.log('[DocumentManager] 문서 수정 완료:', selectedDoc.doc_id)

      // 목록 새로고침
      await loadDocuments()

      setIsEditing(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류'
      setError(errorMessage)
      console.error('[DocumentManager] 문서 수정 실패:', err)
    }
  }, [selectedDoc, formData, loadDocuments])

  // 문서 삭제
  const handleDeleteDocument = useCallback(
    async (docId: string) => {
      if (!confirm(`문서 "${docId}"를 삭제하시겠습니까?`)) {
        return
      }

      setError(null)

      try {
        console.log('[DocumentManager] 문서 삭제 중:', docId)

        const ragService = RAGService.getInstance()
        await ragService.initialize()

        // RAGService의 public 메서드로 문서 삭제
        const success = await ragService.deleteDocument(docId)

        if (!success) {
          throw new Error('문서 삭제 실패')
        }

        console.log('[DocumentManager] 문서 삭제 완료:', docId)

        // 목록 새로고침
        await loadDocuments()

        // 선택 해제
        if (selectedDoc?.doc_id === docId) {
          setSelectedDoc(null)
          setIsEditing(false)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류'
        setError(errorMessage)
        console.error('[DocumentManager] 문서 삭제 실패:', err)
      }
    },
    [selectedDoc, loadDocuments]
  )

  // Vector Store 재구축
  const handleRebuildVectorStore = useCallback(async () => {
    if (!confirm('Vector Store를 재구축하시겠습니까? (시간이 소요될 수 있습니다)')) {
      return
    }

    setIsRebuilding(true)
    setError(null)
    setRebuildProgress({ current: 0, total: 0, percentage: 0, currentDocTitle: '' })
    setRebuildErrors([]) // 이전 에러 초기화

    try {
      console.log('[DocumentManager] Vector Store 재구축 시작')

      // RAGService의 public 메서드로 재구축
      const ragService = RAGService.getInstance()
      await ragService.initialize()

      // Progress 업데이트 최적화: Percentage-threshold 방식
      let lastUpdatePercentage = -1 // 초기값 -1로 설정 (첫 업데이트 보장)
      const PROGRESS_THRESHOLD = 5 // 5% 이상 변경 시에만 업데이트

      const result = await ragService.rebuildVectorStore({
        onProgress: (percentage: number, current: number, total: number, docTitle: string) => {
          // 첫 콜백은 항상 처리 (즉시 Progress UI 표시)
          // 이후 콜백은 임계값 이상 변경되거나 100%인 경우에만 업데이트
          const shouldUpdate =
            lastUpdatePercentage < 0 || // 첫 콜백 (Progress UI 즉시 표시)
            percentage === 100 || // 완료 시 항상 업데이트
            Math.abs(percentage - lastUpdatePercentage) >= PROGRESS_THRESHOLD

          if (shouldUpdate) {
            setRebuildProgress({
              current,
              total,
              percentage,
              currentDocTitle: docTitle,
            })
            lastUpdatePercentage = percentage
          }
        },
      })

      console.log('[DocumentManager] ✓ Vector Store 재구축 완료:', result)

      // 에러 저장 (실패한 문서가 있는 경우)
      if (result.errors.length > 0) {
        setRebuildErrors(result.errors)
      }

      // 완료 알림
      alert(
        `재구축 완료!\n\n` +
          `- 처리 문서: ${result.processedDocs}/${result.totalDocs}\n` +
          `- 생성 청크: ${result.totalChunks}개\n` +
          `- 성공: ${result.successDocs}개\n` +
          `- 실패: ${result.failedDocs}개` +
          (result.failedDocs > 0 ? '\n\n⚠️ 실패 상세는 하단 에러 패널을 확인하세요' : '')
      )
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류'
      setError(errorMessage)
      console.error('[DocumentManager] 재구축 실패:', err)
    } finally {
      setIsRebuilding(false)
      // Progress는 초기화하지만 에러는 유지 (사용자가 확인할 수 있도록)
      setRebuildProgress({ current: 0, total: 0, percentage: 0, currentDocTitle: '' })
    }
  }, [])

  return (
    <div className="flex h-full min-h-0 bg-background">
      {/* 좌측: 문서 목록 */}
      <aside className="w-80 border-r bg-muted/5 flex flex-col">
        <div className="p-4 border-b bg-background">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Database className="h-5 w-5" />
              문서 목록
            </h2>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleFileUpload} disabled={isLoading} variant="default">
                <Upload className="h-4 w-4 mr-1" />
                업로드
              </Button>
              <Button size="sm" onClick={handleNewDocument} disabled={isLoading} variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                수동 입력
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-2 rounded mb-2">
              {error}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            총 {documents.length}개 문서
          </div>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">로딩 중...</div>
          ) : documents.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">문서가 없습니다</div>
          ) : (
            <div className="p-2">
              {documents.map((doc) => (
                <Card
                  key={doc.doc_id}
                  className={`p-3 mb-2 cursor-pointer transition-colors ${
                    selectedDoc?.doc_id === doc.doc_id
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleSelectDocument(doc)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate flex items-center gap-1">
                        <FileText className="h-3 w-3 flex-shrink-0" />
                        {doc.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {doc.library}
                        {doc.category && ` | ${doc.category}`}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {doc.source === 'user' ? '🟢 사용자' : '⚪ 원본'}
                      </div>
                    </div>
                    {doc.source === 'user' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteDocument(doc.doc_id)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Vector Store 재구축 버튼 */}
        <div className="p-4 border-t bg-background space-y-3">
          <Button
            className="w-full"
            variant="outline"
            onClick={handleRebuildVectorStore}
            disabled={isRebuilding}
          >
            {isRebuilding ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                재구축 중...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Vector Store 재구축
              </>
            )}
          </Button>

          {/* Progress UI */}
          {isRebuilding && rebuildProgress.total > 0 && (
            <div className="space-y-2">
              {/* Progress Bar */}
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${rebuildProgress.percentage}%` }}
                />
              </div>

              {/* Progress Text */}
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>진행률: {rebuildProgress.percentage.toFixed(1)}%</span>
                  <span>
                    {rebuildProgress.current}/{rebuildProgress.total}
                  </span>
                </div>
                {rebuildProgress.currentDocTitle && (
                  <div className="truncate">처리 중: {rebuildProgress.currentDocTitle}</div>
                )}
              </div>
            </div>
          )}

          {/* Rebuild 에러 패널 */}
          {rebuildErrors.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-destructive">
                  재구축 실패 ({rebuildErrors.length}개)
                </h4>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2"
                  onClick={() => setRebuildErrors([])}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <ScrollArea className="max-h-32 bg-destructive/10 rounded p-2">
                <div className="space-y-2">
                  {rebuildErrors.map((err, i) => (
                    <div key={i} className="text-xs">
                      <div className="font-medium text-destructive truncate" title={err.docId}>
                        {err.docId}
                      </div>
                      <div className="text-muted-foreground text-[10px] mt-0.5">
                        {err.error}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </aside>

      {/* 우측: 문서 상세/편집/파일 업로드 */}
      <main className="flex-1 p-6 overflow-auto">
        {showFileUploader ? (
          <div className="max-w-4xl mx-auto">
            <FileUploader
              onDocumentAdded={handleDocumentFromFile}
              onClose={() => setShowFileUploader(false)}
            />
          </div>
        ) : selectedDoc || isEditing ? (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                {isEditing && !selectedDoc ? '새 문서 추가' : '문서 상세'}
              </h2>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button onClick={selectedDoc ? handleUpdateDocument : handleAddDocument}>
                      <Save className="h-4 w-4 mr-2" />
                      {selectedDoc ? '수정' : '추가'}
                    </Button>
                    <Button variant="outline" onClick={handleCancelEdit}>
                      <X className="h-4 w-4 mr-2" />
                      취소
                    </Button>
                  </>
                ) : (
                  selectedDoc?.source === 'user' && (
                    <Button variant="outline" onClick={handleEditMode}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      편집
                    </Button>
                  )
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">문서 ID</label>
                <Input
                  value={formData.doc_id}
                  onChange={(e) => setFormData({ ...formData, doc_id: e.target.value })}
                  disabled={!isEditing || !!selectedDoc}
                  placeholder="예: scipy_ttest_ind"
                />
              </div>

              <div>
                <label className="text-sm font-medium">제목 *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  disabled={!isEditing}
                  placeholder="예: scipy.stats.ttest_ind"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">라이브러리 *</label>
                  <Input
                    value={formData.library}
                    onChange={(e) => setFormData({ ...formData, library: e.target.value })}
                    disabled={!isEditing || !!selectedDoc}
                    placeholder="예: scipy, numpy, statsmodels"
                  />
                  {selectedDoc && (
                    <p className="text-xs text-muted-foreground mt-1">
                      라이브러리는 문서 생성 후 변경할 수 없습니다
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">카테고리</label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    disabled={!isEditing}
                    placeholder="예: hypothesis, descriptive"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">요약</label>
                <Textarea
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  disabled={!isEditing}
                  rows={3}
                  placeholder="문서의 간단한 요약을 입력하세요"
                />
              </div>

              <div>
                <label className="text-sm font-medium">내용 *</label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  disabled={!isEditing}
                  rows={20}
                  placeholder="문서의 전체 내용을 입력하세요"
                  className="font-mono text-sm"
                />
              </div>

              <div className="text-xs text-muted-foreground">
                * 필수 입력 필드
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <FileText className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg">좌측에서 문서를 선택하거나</p>
            <p className="text-lg">새 문서를 추가하세요</p>
          </div>
        )}
      </main>
    </div>
  )
}
