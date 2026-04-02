'use client'

import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react'
import { ArrowLeft, Eye, PenLine, RefreshCw } from 'lucide-react'
import { usePlateEditor } from 'platejs/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  loadDocumentBlueprint,
  saveDocumentBlueprint,
} from '@/lib/research/document-blueprint-storage'
import { reassembleDocument } from '@/lib/research/document-assembler'
import { listProjectEntityRefs } from '@/lib/research/project-storage'
import { useHistoryStore } from '@/lib/stores/history-store'
import { listProjects as listGraphProjects } from '@/lib/graph-studio/project-storage'
import { loadAnalysisHistory } from '@/lib/genetics/analysis-history'
import { convertPaperTable, buildFigureRef } from '@/lib/research/document-blueprint-types'
import type { DocumentBlueprint, DocumentSection } from '@/lib/research/document-blueprint-types'
import type { HistoryRecord } from '@/lib/utils/storage-types'
import type { GraphProject } from '@/types/graph-studio'
import { MARKDOWN_CONFIG } from '@/lib/rag/config/markdown-config'
import { paperPlugins } from './plate-plugins'
import PlateEditor from './PlateEditor'
import DocumentSectionList from './DocumentSectionList'
import MaterialPalette from './MaterialPalette'
import DocumentExportBar from './DocumentExportBar'
import { cn } from '@/lib/utils'

const ReactMarkdown = lazy(() => import('react-markdown'))

// ── Props ──

interface DocumentEditorProps {
  documentId: string
  onBack: () => void
}

// ── 자동 저장 딜레이 ──

const AUTOSAVE_DELAY = 1500

export default function DocumentEditor({ documentId, onBack }: DocumentEditorProps): React.ReactElement {
  const [doc, setDoc] = useState<DocumentBlueprint | null>(null)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [loading, setLoading] = useState(true)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { analysisHistory } = useHistoryStore()

  // Plate 에디터 인스턴스 — DocumentEditor가 소유
  const editor = usePlateEditor({ plugins: paperPlugins })

  // 언마운트 시 미저장 변경 즉시 flush + 타이머 정리
  const pendingDocRef = useRef<DocumentBlueprint | null>(null)
  const serializeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      // serialize 타이머가 있으면 flush하여 content 확정
      if (serializeTimerRef.current) {
        clearTimeout(serializeTimerRef.current)
        // 언마운트 시에는 flushSerialize 호출 불가 (ref 의존) — pendingDoc에 반영됨
      }
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        if (pendingDocRef.current) {
          saveDocumentBlueprint(pendingDocRef.current)
        }
      }
    }
  }, [])

  useEffect(() => {
    loadDocumentBlueprint(documentId).then(loaded => {
      if (loaded) {
        setDoc(loaded)
        if (loaded.sections.length > 0) {
          setActiveSectionId(loaded.sections[0].id)
        }
      }
      setLoading(false)
    })
  }, [documentId])

  const scheduleSave = useCallback((updated: DocumentBlueprint) => {
    pendingDocRef.current = updated
    setSaveStatus('unsaved')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      await saveDocumentBlueprint(updated)
      pendingDocRef.current = null
      setSaveStatus('saved')
    }, AUTOSAVE_DELAY)
  }, [])

  const updateSection = useCallback((sectionId: string, updates: Partial<DocumentSection>) => {
    setDoc(prev => {
      if (!prev) return prev
      const newSections = prev.sections.map(s =>
        s.id === sectionId ? { ...s, ...updates } : s,
      )
      const updated = { ...prev, sections: newSections, updatedAt: new Date().toISOString() }
      scheduleSave(updated)
      return updated
    })
  }, [scheduleSave])

  // serialize 타이머 flush — 섹션 전환/언마운트 전에 현재 content 확정
  const pendingSerializeSectionRef = useRef<string | null>(null)
  const flushSerialize = useCallback(() => {
    if (serializeTimerRef.current) {
      clearTimeout(serializeTimerRef.current)
      serializeTimerRef.current = null
    }
    const sectionId = pendingSerializeSectionRef.current
    if (!sectionId) return
    pendingSerializeSectionRef.current = null
    try {
      const markdown = editor.api.markdown.serialize()
      updateSection(sectionId, { content: markdown })
    } catch {
      // serialize 실패 시 무시
    }
  }, [editor, updateSection])

  // Plate 에디터 변경 → plateValue 즉시 저장, serialize는 디바운스 (입력 성능 보호)
  const handlePlateChange = useCallback(() => {
    if (!activeSectionId) return
    const plateValue = editor.children
    updateSection(activeSectionId, { plateValue, generatedBy: 'user' })

    pendingSerializeSectionRef.current = activeSectionId
    if (serializeTimerRef.current) clearTimeout(serializeTimerRef.current)
    serializeTimerRef.current = setTimeout(() => {
      serializeTimerRef.current = null
      pendingSerializeSectionRef.current = null
      try {
        const markdown = editor.api.markdown.serialize()
        updateSection(activeSectionId, { content: markdown })
      } catch {
        // serialize 실패 시 무시
      }
    }, 500)
  }, [activeSectionId, editor, updateSection])

  // 섹션 전환 시 Plate 에디터에 content 로드
  const loadedSectionRef = useRef<string | null>(null)
  useEffect(() => {
    if (!activeSectionId || !doc) return
    if (loadedSectionRef.current === activeSectionId) return

    // 이전 섹션의 serialize 타이머가 있으면 즉시 flush (내용 오염 방지)
    flushSerialize()
    loadedSectionRef.current = activeSectionId

    const section = doc.sections.find(s => s.id === activeSectionId)
    if (!section) return

    try {
      // plateValue가 있으면 그대로 사용, 없으면 마크다운에서 역직렬화
      if (section.plateValue && Array.isArray(section.plateValue) && section.plateValue.length > 0) {
        editor.tf.setValue(section.plateValue as typeof editor.children)
      } else if (section.content) {
        const nodes = editor.api.markdown.deserialize(section.content)
        editor.tf.setValue(nodes)
      } else {
        editor.tf.setValue([{ type: 'p', children: [{ text: '' }] }])
      }
    } catch {
      editor.tf.setValue([{ type: 'p', children: [{ text: '' }] }])
    }
  }, [activeSectionId, doc, editor])

  // 섹션 순서 변경
  const handleReorder = useCallback((newSections: DocumentSection[]) => {
    setDoc(prev => {
      if (!prev) return prev
      const updated = { ...prev, sections: newSections, updatedAt: new Date().toISOString() }
      scheduleSave(updated)
      return updated
    })
  }, [scheduleSave])

  // 섹션 삭제
  const handleDeleteSection = useCallback((sectionId: string) => {
    setDoc(prev => {
      if (!prev) return prev
      const newSections = prev.sections.filter(s => s.id !== sectionId)
      const updated = { ...prev, sections: newSections, updatedAt: new Date().toISOString() }
      if (activeSectionId === sectionId) {
        setActiveSectionId(newSections[0]?.id ?? null)
      }
      scheduleSave(updated)
      return updated
    })
  }, [activeSectionId, scheduleSave])

  // 섹션 추가
  const handleAddSection = useCallback(() => {
    setDoc(prev => {
      if (!prev) return prev
      const newId = `section-${Date.now()}`
      const newSection: DocumentSection = {
        id: newId,
        title: '새 섹션',
        content: '',
        sourceRefs: [],
        editable: true,
        generatedBy: 'user',
      }
      const updated = {
        ...prev,
        sections: [...prev.sections, newSection],
        updatedAt: new Date().toISOString(),
      }
      setActiveSectionId(newId)
      scheduleSave(updated)
      return updated
    })
  }, [scheduleSave])

  // 재조립
  const handleReassemble = useCallback(() => {
    if (!doc) return
    const entityRefs = listProjectEntityRefs(doc.projectId)
    const allGraphProjects = listGraphProjects()
    const blastHistory = loadAnalysisHistory()

    const reassembled = reassembleDocument(doc, {
      entityRefs,
      allHistory: analysisHistory as unknown as HistoryRecord[],
      allGraphProjects,
      blastHistory,
    })
    setDoc(reassembled)
    scheduleSave(reassembled)
    // 활성 섹션 에디터 값 새로고침 강제
    loadedSectionRef.current = null
  }, [doc, analysisHistory, scheduleSave])

  // 분석 삽입 — Plate API로 노드 삽입 + sidecar 테이블 유지
  const handleInsertAnalysis = useCallback((record: HistoryRecord) => {
    if (!activeSectionId) return
    const draft = record.paperDraft
    if (!draft) return

    const methodName = record.method?.name ?? record.name
    const text = draft.results ?? draft.methods ?? ''

    // Plate 에디터에 노드 삽입
    editor.tf.insertNodes([
      { type: 'h3', children: [{ text: methodName }] },
      ...text.split('\n\n').filter(Boolean).map(p => ({ type: 'p' as const, children: [{ text: p }] })),
    ])

    // sidecar 배열 + sourceRef 업데이트 (Plate 외부 상태)
    setDoc(prev => {
      if (!prev) return prev
      const newSections = prev.sections.map(s => {
        if (s.id !== activeSectionId) return s
        const newTables = [
          ...(s.tables ?? []),
          ...(draft.tables?.map(t => convertPaperTable(t)) ?? []),
        ]
        return {
          ...s,
          tables: newTables.length > 0 ? newTables : undefined,
          sourceRefs: [...s.sourceRefs, record.id],
          generatedBy: 'user' as const,
        }
      })
      const updated: DocumentBlueprint = { ...prev, sections: newSections, updatedAt: new Date().toISOString() }
      scheduleSave(updated)
      return updated
    })
  }, [activeSectionId, editor, scheduleSave])

  // 그래프 삽입 — Plate API로 노드 삽입 + sidecar figure 유지
  const handleInsertFigure = useCallback((graph: GraphProject) => {
    if (!activeSectionId || !doc) return

    const existingFigureCount = doc.sections.reduce(
      (acc, s) => acc + (s.figures?.length ?? 0), 0,
    )
    const figRef = buildFigureRef(graph, existingFigureCount)

    // Plate 에디터에 Figure 참조 삽입
    editor.tf.insertNodes([
      { type: 'p', children: [{ text: `${figRef.label}: ${figRef.caption}`, italic: true }] },
    ])

    // sidecar figure 배열 + sourceRef 업데이트
    setDoc(prev => {
      if (!prev) return prev
      const newSections = prev.sections.map(s => {
        if (s.id !== activeSectionId) return s
        return {
          ...s,
          figures: [...(s.figures ?? []), figRef],
          sourceRefs: [...s.sourceRefs, graph.id],
          generatedBy: 'user' as const,
        }
      })
      const updated: DocumentBlueprint = { ...prev, sections: newSections, updatedAt: new Date().toISOString() }
      scheduleSave(updated)
      return updated
    })
  }, [activeSectionId, doc, scheduleSave])

  // ── 렌더링 ──

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">문서 로드 중...</p>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">문서를 찾을 수 없습니다</p>
        <Button variant="outline" onClick={onBack}>돌아가기</Button>
      </div>
    )
  }

  const activeSection = doc.sections.find(s => s.id === activeSectionId)

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* 상단 바 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="w-4 h-4" />
          목록
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <h1 className="text-sm font-semibold truncate flex-1">{doc.title}</h1>
        <Badge variant="outline" className="text-[10px]">
          {saveStatus === 'saved' && '저장됨'}
          {saveStatus === 'saving' && '저장 중...'}
          {saveStatus === 'unsaved' && '변경됨'}
        </Badge>
        <Button variant="outline" size="sm" onClick={handleReassemble} className="gap-1">
          <RefreshCw className="w-3.5 h-3.5" />
          재조립
        </Button>
        <div className="flex border rounded-md">
          <Button
            variant={previewMode ? 'ghost' : 'secondary'}
            size="sm"
            onClick={() => setPreviewMode(false)}
            className="gap-1 rounded-r-none"
          >
            <PenLine className="w-3.5 h-3.5" />
            편집
          </Button>
          <Button
            variant={previewMode ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPreviewMode(true)}
            className="gap-1 rounded-l-none"
          >
            <Eye className="w-3.5 h-3.5" />
            미리보기
          </Button>
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측: 섹션 목록 */}
        <div className="w-56 shrink-0 border-r p-3 overflow-y-auto">
          <DocumentSectionList
            sections={doc.sections}
            activeSectionId={activeSectionId}
            onSelectSection={setActiveSectionId}
            onReorder={handleReorder}
            onDeleteSection={handleDeleteSection}
            onAddSection={handleAddSection}
          />
        </div>

        {/* 중앙: 편집/프리뷰 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection ? (
            <div className="max-w-3xl mx-auto space-y-4">
              <h2 className="text-xl font-bold">{activeSection.title}</h2>

              {previewMode ? (
                <div className="prose dark:prose-invert max-w-none">
                  <Suspense fallback={<p className="text-muted-foreground">로딩 중...</p>}>
                    <ReactMarkdown
                      remarkPlugins={MARKDOWN_CONFIG.remarkPlugins}
                      rehypePlugins={MARKDOWN_CONFIG.rehypePlugins}
                    >
                      {activeSection.content || '*내용 없음*'}
                    </ReactMarkdown>
                  </Suspense>
                </div>
              ) : (
                <PlateEditor editor={editor} onChange={handlePlateChange} />
              )}

              {/* 표 목록 */}
              {activeSection.tables && activeSection.tables.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">표</h3>
                  {activeSection.tables.map((table, i) => (
                    <div key={table.id ?? i} className="border rounded-lg overflow-hidden">
                      <p className="text-xs font-medium p-2 bg-muted/50">{table.caption}</p>
                      {table.htmlContent ? (
                        <div
                          className="p-2 text-sm overflow-x-auto"
                          dangerouslySetInnerHTML={{ __html: table.htmlContent }}
                        />
                      ) : (
                        <div className="p-2 overflow-x-auto">
                          <table className="text-xs w-full">
                            <thead>
                              <tr>
                                {table.headers.map((h, hi) => (
                                  <th key={hi} className="border px-2 py-1 bg-muted/30 text-left">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {table.rows.map((row, ri) => (
                                <tr key={ri}>
                                  {row.map((cell, ci) => (
                                    <td key={ci} className="border px-2 py-1">{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Figure 목록 */}
              {activeSection.figures && activeSection.figures.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">그림</h3>
                  {activeSection.figures.map(fig => (
                    <div key={fig.entityId} className="flex items-center gap-2 p-2 rounded border bg-muted/20 text-sm">
                      <span className="font-medium">{fig.label}</span>
                      <span className="text-muted-foreground">{fig.caption}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              좌측에서 섹션을 선택하세요
            </div>
          )}
        </div>

        {/* 우측: 재료 팔레트 */}
        <div className="w-52 shrink-0 border-l p-3 overflow-y-auto">
          <MaterialPalette
            projectId={doc.projectId}
            onInsertAnalysis={handleInsertAnalysis}
            onInsertFigure={handleInsertFigure}
          />
        </div>
      </div>

      {/* 하단: 내보내기 */}
      <div className="shrink-0 px-4 pb-3">
        <DocumentExportBar document={doc} />
      </div>
    </div>
  )
}
