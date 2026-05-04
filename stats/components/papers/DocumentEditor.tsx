'use client'

import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react'
import { AlertTriangle, ArrowLeft, CheckCircle2, Eye, PenLine, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { usePlateEditor } from 'platejs/react'
import type { Value } from '@platejs/slate'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DOCUMENT_BLUEPRINTS_CHANGED_EVENT,
  DocumentBlueprintConflictError,
  type DocumentBlueprintsChangedDetail,
  loadDocumentBlueprint,
} from '@/lib/research/document-blueprint-storage'
import { reassembleDocument } from '@/lib/research/document-assembler'
import {
  type ResearchProjectEntityRefsChangedDetail,
  listProjectEntityRefs,
  loadResearchProject,
  RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT,
} from '@/lib/research/project-storage'
import { useHistoryStore } from '@/lib/stores/history-store'
import {
  type GraphProjectsChangedDetail,
  GRAPH_PROJECTS_CHANGED_EVENT,
  listProjects as listGraphProjects,
} from '@/lib/graph-studio/project-storage'
import { BIO_HISTORY_CHANGE_EVENT, loadBioToolHistory } from '@/lib/bio-tools/bio-tool-history'
import type {
  BoldHistoryEntry,
  PhylogenyHistoryEntry,
  ProteinHistoryEntry,
  SeqStatsHistoryEntry,
  SimilarityHistoryEntry,
  TranslationHistoryEntry,
} from '@/lib/genetics/analysis-history'
import {
  HISTORY_CHANGE_EVENT as GENETICS_HISTORY_CHANGE_EVENT,
  loadAnalysisHistory,
  loadGeneticsHistory,
} from '@/lib/genetics/analysis-history'
import {
  convertPaperTable,
  buildFigureRef,
  createDocumentSourceRef,
  getGraphPrimaryAnalysisId,
  type DocumentWritingSectionStatus,
} from '@/lib/research/document-blueprint-types'
import type { DocumentBlueprint, DocumentSection } from '@/lib/research/document-blueprint-types'
import {
  ensureDocumentWriting,
  retryDocumentWriting,
} from '@/lib/research/document-writing-orchestrator'
import { isDocumentSectionRegenerationSectionId } from '@/lib/research/document-section-regeneration-contract'
import type { HistoryRecord } from '@/lib/utils/storage-types'
import type { GraphProject } from '@/types/graph-studio'
import {
  buildAnalysisHistoryUrl,
  buildGraphStudioProjectUrl,
} from '@/lib/research/source-navigation'
import type { CitationRecord } from '@/lib/research/citation-types'
import {
  deleteCitation,
  RESEARCH_PROJECT_CITATIONS_CHANGED_EVENT,
  type ResearchProjectCitationsChangedDetail,
} from '@/lib/research/citation-storage'
import { MARKDOWN_CONFIG } from '@/lib/rag/config/markdown-config'
import { paperPlugins, EQUATION_KEY, INLINE_EQUATION_KEY } from './plate-plugins'
import { EquationElement, InlineEquationElement } from './equation-element'
import PlateEditor from './PlateEditor'
import DocumentSectionList from './DocumentSectionList'
import MaterialPalette from './MaterialPalette'
import DocumentExportBar from './DocumentExportBar'
import DocumentWritingHeaderStatus from './DocumentWritingHeaderStatus'
import SectionWritingBanner from './SectionWritingBanner'
import DocumentSectionRegenerationControls from './DocumentSectionRegenerationControls'
import DocumentArtifactLists from './DocumentArtifactLists'
import { cn } from '@/lib/utils'
import { generateFigurePatternSummary } from '@/lib/research/paper-package-assembler'
import { updateDocumentSectionWritingState } from '@/lib/research/document-writing'
import type { DocumentWritingSourceReadiness } from '@/lib/research/document-writing-source-readiness'
import { useDocumentSourceLinks } from './useDocumentSourceLinks'
import { useDocumentCitations } from './useDocumentCitations'
import { useDocumentSectionRegeneration } from './useDocumentSectionRegeneration'
import { useDocumentBlueprintSaveQueue } from './useDocumentBlueprintSaveQueue'
import DocumentRevisionHistorySheet from './DocumentRevisionHistorySheet'
import {
  createDocumentRevision,
  listDocumentRevisions,
  restoreDocumentRevision,
  type DocumentBlueprintRevision,
  type DocumentRevisionReason,
} from '@/lib/research/document-blueprint-revisions'

const ReactMarkdown = lazy(() => import('react-markdown'))

// ── Props ──

interface DocumentEditorProps {
  documentId: string
  initialSectionId?: string
  initialTableId?: string
  initialFigureId?: string
  onBack: () => void
}

// ── 자동 저장 딜레이 ──

const AUTOSAVE_DELAY = 1500
const SCRATCH_PROJECT_TAG = 'system:papers-scratch'
const LOCAL_STORAGE_TOAST_KEY_PREFIX = 'papers-local-storage-toast'
const EMPTY_EDITOR_VALUE: Value = [{ type: 'p', children: [{ text: '' }] }]

function clonePlateValue(value: unknown): Value | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null
  }

  try {
    return JSON.parse(JSON.stringify(value)) as Value
  } catch {
    return null
  }
}

function getInitialEditorValue(section: DocumentSection | null): Value {
  const plateValue = clonePlateValue(section?.plateValue)
  if (plateValue) {
    return plateValue
  }

  if (section?.content) {
    return [{ type: 'p', children: [{ text: section.content }] }]
  }

  return EMPTY_EDITOR_VALUE
}

function getReadinessBadgeClass(readiness: DocumentWritingSourceReadiness): string {
  switch (readiness.status) {
    case 'ready':
      return 'bg-sky-100 text-sky-900'
    case 'stale':
      return 'bg-amber-100 text-amber-950'
    case 'review':
      return 'bg-surface-container-high text-muted-foreground'
  }
}

function SourceReadinessIcon({
  readiness,
}: {
  readiness: DocumentWritingSourceReadiness
}): React.ReactElement {
  if (readiness.status === 'ready') {
    return <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-700" />
  }

  if (readiness.status === 'stale') {
    return <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
  }

  return <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
}

export default function DocumentEditor({
  documentId,
  initialSectionId,
  initialTableId,
  initialFigureId,
  onBack,
}: DocumentEditorProps): React.ReactElement {
  const router = useRouter()
  const [doc, setDoc] = useState<DocumentBlueprint | null>(null)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [needsReassemble, setNeedsReassemble] = useState(false)
  const [sourceLinksRefreshKey, setSourceLinksRefreshKey] = useState(0)
  const [revisionHistoryOpen, setRevisionHistoryOpen] = useState(false)
  const [documentRevisions, setDocumentRevisions] = useState<DocumentBlueprintRevision[]>([])
  const [revisionHistoryLoading, setRevisionHistoryLoading] = useState(false)
  const [revisionActionPending, setRevisionActionPending] = useState(false)
  const [editorRenderKey, setEditorRenderKey] = useState(0)
  const [editorLoadRevision, setEditorLoadRevision] = useState(0)
  const { analysisHistory } = useHistoryStore()
  const docRef = useRef<DocumentBlueprint | null>(null)
  const pendingArtifactTargetRef = useRef<string | null>(null)
  const loadedSectionRef = useRef<string | null>(null)
  const {
    documentConflict,
    documentConflictRef,
    saveStatus,
    scheduleSave,
    scheduleImmediateSave,
    resetSavedDocumentState,
    markDocumentConflict,
    getLocalEditRevision,
    hasPendingSave,
    hasPendingSaveOrConflict,
    waitForSaveQueue,
    getLastSavedUpdatedAt,
    isSavedUpdateCurrent,
    hasLocalChanges,
  } = useDocumentBlueprintSaveQueue({
    autosaveDelay: AUTOSAVE_DELAY,
    documentRef: docRef,
  })
  const {
    citations,
    latestCitationsRef,
    pendingCitationReloadRef,
    reloadCitations,
    resetCitations,
  } = useDocumentCitations({
    projectId: doc?.projectId ?? null,
  })
  const currentProject = useMemo(
    () => (doc ? loadResearchProject(doc.projectId) : null),
    [doc],
  )
  const isScratchProject = (currentProject?.tags ?? []).includes(SCRATCH_PROJECT_TAG)
  const activeSection = doc?.sections.find((section) => section.id === activeSectionId) ?? null
  const editorInitialValue = useMemo(
    () => getInitialEditorValue(activeSection),
    [activeSectionId, editorLoadRevision],
  )

  // Plate 에디터 인스턴스 — DocumentEditor가 소유
  const editor = usePlateEditor({
    plugins: paperPlugins,
    value: editorInitialValue,
    override: {
      components: {
        [EQUATION_KEY]: EquationElement,
        [INLINE_EQUATION_KEY]: InlineEquationElement,
      },
    },
  }, [activeSectionId, editorLoadRevision])

  const serializeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const applyLoadedDocument = useCallback((loaded: DocumentBlueprint): void => {
    setDoc(loaded)
    docRef.current = loaded
    loadedSectionRef.current = null
    setEditorLoadRevision((current) => current + 1)
    resetSavedDocumentState(loaded)

    if (loaded.sections.length === 0) {
      setActiveSectionId(null)
      return
    }

    setActiveSectionId((currentSectionId) => {
      if (currentSectionId && loaded.sections.some((section) => section.id === currentSectionId)) {
        return currentSectionId
      }
      if (initialSectionId && loaded.sections.some((section) => section.id === initialSectionId)) {
        return initialSectionId
      }
      return loaded.sections[0]?.id ?? null
    })
  }, [initialSectionId, resetSavedDocumentState])

  const refreshDocumentRevisions = useCallback(async (targetDocumentId: string): Promise<void> => {
    setRevisionHistoryLoading(true)
    try {
      setDocumentRevisions(await listDocumentRevisions(targetDocumentId))
    } finally {
      setRevisionHistoryLoading(false)
    }
  }, [])

  const saveDocumentRevisionPoint = useCallback(async (
    reason: DocumentRevisionReason,
    label: string,
    targetDocument?: DocumentBlueprint,
    showToast = false,
  ): Promise<void> => {
    const revisionTarget = targetDocument ?? docRef.current
    if (!revisionTarget) return

    try {
      await createDocumentRevision(revisionTarget, { reason, label })
      if (showToast) {
        toast.success('문서 복원 지점을 저장했습니다')
      }
      if (revisionHistoryOpen) {
        await refreshDocumentRevisions(revisionTarget.id)
      }
    } catch {
      if (showToast) {
        toast.error('복원 지점을 저장하지 못했습니다')
      }
    }
  }, [refreshDocumentRevisions, revisionHistoryOpen])

  const handleRevisionHistoryOpenChange = useCallback((open: boolean): void => {
    setRevisionHistoryOpen(open)
    if (open) {
      void refreshDocumentRevisions(documentId)
    }
  }, [documentId, refreshDocumentRevisions])

  useEffect(() => {
    return () => {
      if (serializeTimerRef.current) {
        clearTimeout(serializeTimerRef.current)
        // 언마운트 시 serialize 호출 불가 — 에디터 인스턴스가 해체 중이라 실패 위험
        // 저장 큐 hook의 pending document에 최신 편집이 남아있으므로 데이터 손실 없음
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setDoc(null)
    docRef.current = null
    resetSavedDocumentState(null)
    setActiveSectionId(null)
    resetCitations()
    setNeedsReassemble(false)

    loadDocumentBlueprint(documentId).then(loaded => {
      if (cancelled) return
      if (loaded) {
        applyLoadedDocument(loaded)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [applyLoadedDocument, documentId, initialSectionId, resetCitations, resetSavedDocumentState])

  useEffect(() => {
    pendingArtifactTargetRef.current = initialTableId
      ? `table:${initialTableId}`
      : initialFigureId
        ? `figure:${initialFigureId}`
        : null
  }, [initialFigureId, initialTableId])

  useEffect(() => {
    if (!doc || typeof window === 'undefined') {
      return
    }

    const toastKey = `${LOCAL_STORAGE_TOAST_KEY_PREFIX}:${doc.id}`
    if (window.sessionStorage.getItem(toastKey) === 'shown') {
      return
    }

    toast.info('이 문서는 로컬에 자동 저장됩니다', {
      description: isScratchProject
        ? '현재는 임시 작업공간 문서입니다. 필요하면 프로젝트 관리에서 정식 연구과제로 정리할 수 있습니다.'
        : '현재 브라우저의 로컬 저장소에 보관됩니다.',
    })
    window.sessionStorage.setItem(toastKey, 'shown')
  }, [doc, isScratchProject])

  useEffect(() => {
    if (!doc || hasLocalChanges()) {
      return
    }

    if (!['collecting', 'drafting', 'patching'].includes(doc.writingState?.status ?? 'idle')) {
      return
    }

    void ensureDocumentWriting(doc.id)
  }, [doc, hasLocalChanges])

  useEffect((): (() => void) => {
    const handleDocumentChange = (event: Event): void => {
      if (!(event instanceof CustomEvent)) {
        return
      }

      const detail = event.detail as DocumentBlueprintsChangedDetail | undefined
      if (!detail || detail.documentId !== documentId || detail.action !== 'saved') {
        return
      }
      if (isSavedUpdateCurrent(detail.updatedAt)) {
        return
      }

      void loadDocumentBlueprint(documentId).then((latestDocument) => {
        if (!latestDocument) {
          return
        }
        if (isSavedUpdateCurrent(latestDocument.updatedAt)) {
          return
        }

        if (hasLocalChanges() || hasPendingSaveOrConflict()) {
          markDocumentConflict(latestDocument)
          return
        }

        applyLoadedDocument(latestDocument)
      })
    }

    window.addEventListener(DOCUMENT_BLUEPRINTS_CHANGED_EVENT, handleDocumentChange)
    return (): void => {
      window.removeEventListener(DOCUMENT_BLUEPRINTS_CHANGED_EVENT, handleDocumentChange)
    }
  }, [
    applyLoadedDocument,
    documentId,
    hasLocalChanges,
    hasPendingSaveOrConflict,
    isSavedUpdateCurrent,
    markDocumentConflict,
  ])

  useEffect((): (() => void) => {
    const handleEntityRefChange = (event: Event): void => {
      const currentDoc = docRef.current
      const currentProjectId = currentDoc?.projectId
      if (!currentProjectId) return
      if (event instanceof CustomEvent) {
        const detail = event.detail as ResearchProjectEntityRefsChangedDetail | undefined
        if (detail && !detail.projectIds.includes(currentProjectId)) {
          return
        }
        if (detail && Array.isArray(detail.entityIds) && detail.entityIds.length > 0) {
          const isCurrentDraftOnly = detail.entityIds.every((entityId) => entityId === currentDoc.id)
          if (isCurrentDraftOnly) {
            return
          }
        }
      }
      setNeedsReassemble(true)
    }

    const handleGraphProjectChange = (event: Event): void => {
      const currentProjectId = docRef.current?.projectId
      if (!currentProjectId) return
      if (event instanceof CustomEvent) {
        const detail = event.detail as GraphProjectsChangedDetail | undefined
        if (detail) {
          const currentFigureIds = new Set(
            listProjectEntityRefs(currentProjectId)
              .filter(ref => ref.entityKind === 'figure')
              .map(ref => ref.entityId),
          )
          if (!detail.projectIds.some((graphId: string) => currentFigureIds.has(graphId))) {
            return
          }
        }
      }
      setNeedsReassemble(true)
    }

    const handleCitationChange = (event: Event): void => {
      const currentProjectId = docRef.current?.projectId
      if (!currentProjectId) return
      if (event instanceof CustomEvent) {
        const detail = event.detail as ResearchProjectCitationsChangedDetail | undefined
        if (detail && detail.projectId !== currentProjectId) {
          return
        }
      }
      setNeedsReassemble(true)
      void reloadCitations(currentProjectId)
    }

    const handleSupplementaryHistoryChange = (): void => {
      const currentDoc = docRef.current
      if (!currentDoc) return

      const hasSupplementarySource = currentDoc.sections.some((section) => (
        section.sourceRefs.some((sourceRef) => sourceRef.kind === 'supplementary')
      ))
      if (!hasSupplementarySource) return

      setSourceLinksRefreshKey((current) => current + 1)
      setNeedsReassemble(true)
    }

    window.addEventListener(RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT, handleEntityRefChange)
    window.addEventListener(GRAPH_PROJECTS_CHANGED_EVENT, handleGraphProjectChange)
    window.addEventListener(RESEARCH_PROJECT_CITATIONS_CHANGED_EVENT, handleCitationChange)
    window.addEventListener(BIO_HISTORY_CHANGE_EVENT, handleSupplementaryHistoryChange)
    window.addEventListener(GENETICS_HISTORY_CHANGE_EVENT, handleSupplementaryHistoryChange)

    return (): void => {
      window.removeEventListener(RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT, handleEntityRefChange)
      window.removeEventListener(GRAPH_PROJECTS_CHANGED_EVENT, handleGraphProjectChange)
      window.removeEventListener(RESEARCH_PROJECT_CITATIONS_CHANGED_EVENT, handleCitationChange)
      window.removeEventListener(BIO_HISTORY_CHANGE_EVENT, handleSupplementaryHistoryChange)
      window.removeEventListener(GENETICS_HISTORY_CHANGE_EVENT, handleSupplementaryHistoryChange)
    }
  }, [reloadCitations])

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

  const shouldTakeOwnershipForWritingSection = useCallback((sectionId: string): boolean => {
    const currentDoc = docRef.current
    if (!currentDoc) {
      return false
    }
    if (!['collecting', 'drafting', 'patching'].includes(currentDoc.writingState?.status ?? 'idle')) {
      return false
    }

    const section = currentDoc.sections.find((item) => item.id === sectionId)
    if (!section || section.generatedBy === 'user') {
      return false
    }

    const sectionStatus = currentDoc.writingState?.sectionStates[sectionId]?.status
    return sectionStatus === 'drafting'
  }, [])

  const takeSectionOwnershipForEditing = useCallback((sectionId: string, plateValue: unknown): void => {
    setDoc((prev) => {
      if (!prev) {
        return prev
      }

      const nextSections = prev.sections.map((section) => (
        section.id === sectionId
          ? {
              ...section,
              plateValue,
              generatedBy: 'user' as const,
            }
          : section
      ))

      const updatedBase: DocumentBlueprint = {
        ...prev,
        sections: nextSections,
        updatedAt: new Date().toISOString(),
      }
      const updated = updateDocumentSectionWritingState(updatedBase, sectionId, 'skipped', {
        message: '사용자 편집이 시작되어 자동 초안을 중단했습니다.',
      })
      scheduleImmediateSave(updated)
      return updated
    })
  }, [scheduleImmediateSave])

  const skipSectionWriting = useCallback((sectionId: string, message: string): void => {
    setDoc((prev) => {
      if (!prev) {
        return prev
      }

      const nextSections = prev.sections.map((section) => (
        section.id === sectionId
          ? {
              ...section,
              generatedBy: 'user' as const,
            }
          : section
      ))

      const updatedBase: DocumentBlueprint = {
        ...prev,
        sections: nextSections,
        updatedAt: new Date().toISOString(),
      }
      const updated = updateDocumentSectionWritingState(updatedBase, sectionId, 'skipped', {
        message,
      })
      scheduleImmediateSave(updated)
      return updated
    })
  }, [scheduleImmediateSave])

  const reassembleCurrentDocument = useCallback((baseDoc?: DocumentBlueprint): DocumentBlueprint | null => {
    const targetDoc = baseDoc ?? docRef.current
    if (!targetDoc) return null

    const entityRefs = listProjectEntityRefs(targetDoc.projectId)
    const allGraphProjects = listGraphProjects()
    const blastHistory = loadAnalysisHistory()
    const bioToolHistory = loadBioToolHistory()

    const reassembled = reassembleDocument(targetDoc, {
      entityRefs,
      allHistory: analysisHistory as unknown as HistoryRecord[],
      allGraphProjects,
      blastHistory,
      bioToolHistory,
      proteinHistory: loadGeneticsHistory('protein') as ProteinHistoryEntry[],
      seqStatsHistory: loadGeneticsHistory('seq-stats') as SeqStatsHistoryEntry[],
      similarityHistory: loadGeneticsHistory('similarity') as SimilarityHistoryEntry[],
      phylogenyHistory: loadGeneticsHistory('phylogeny') as PhylogenyHistoryEntry[],
      boldHistory: loadGeneticsHistory('bold') as BoldHistoryEntry[],
      translationHistory: loadGeneticsHistory('translation') as TranslationHistoryEntry[],
      citations: latestCitationsRef.current,
    })
    setDoc(reassembled)
    scheduleSave(reassembled)
    loadedSectionRef.current = null
    setNeedsReassemble(false)
    return reassembled
  }, [analysisHistory, scheduleSave])

  // serialize 타이머 flush — 섹션 전환/언마운트 전에 현재 content 확정
  const pendingSerializeSectionRef = useRef<string | null>(null)
  const flushSerialize = useCallback((fallbackSectionId?: string) => {
    if (serializeTimerRef.current) {
      clearTimeout(serializeTimerRef.current)
      serializeTimerRef.current = null
    }
    const sectionId = pendingSerializeSectionRef.current ?? fallbackSectionId
    if (!sectionId) return null
    pendingSerializeSectionRef.current = null
    try {
      const currentDoc = docRef.current
      if (!currentDoc) return null
      const markdown = editor.api.markdown.serialize()
      const plateValue = editor.api.markdown.deserialize(markdown)
      const newSections = currentDoc.sections.map((section) => (
        section.id === sectionId ? { ...section, content: markdown, plateValue } : section
      ))
      const updated = {
        ...currentDoc,
        sections: newSections,
        updatedAt: new Date().toISOString(),
      }
      setDoc(updated)
      scheduleSave(updated)
      return updated
    } catch {
      // serialize 실패 시 무시
      return null
    }
  }, [editor, scheduleSave])

  const prepareDocumentForExport = useCallback(async (): Promise<DocumentBlueprint | undefined> => {
    await pendingCitationReloadRef.current

    const flushed = flushSerialize(activeSectionId ?? undefined)
    const currentDoc = flushed ?? docRef.current
    if (!currentDoc) return undefined
    await saveDocumentRevisionPoint(
      'before-export',
      '내보내기 전 자동 저장 지점',
      currentDoc,
    )

    return needsReassemble ? (reassembleCurrentDocument(currentDoc) ?? currentDoc) : currentDoc
  }, [activeSectionId, flushSerialize, needsReassemble, reassembleCurrentDocument, saveDocumentRevisionPoint])

  const handleCreateManualRevision = useCallback((): void => {
    setRevisionActionPending(true)
    void saveDocumentRevisionPoint(
      'manual',
      '사용자 저장 지점',
      flushSerialize(activeSectionId ?? undefined) ?? docRef.current ?? undefined,
      true,
    ).finally(() => setRevisionActionPending(false))
  }, [activeSectionId, flushSerialize, saveDocumentRevisionPoint])

  const handleRestoreRevision = useCallback((revisionId: string): void => {
    if (revisionActionPending) return
    if (documentConflictRef.current !== null) {
      toast.warning('문서 충돌을 먼저 해결한 뒤 복원하세요')
      return
    }

    setRevisionActionPending(true)
    void (async (): Promise<void> => {
      const latestDocument = flushSerialize(activeSectionId ?? undefined) ?? docRef.current
      if (!latestDocument) {
        toast.error('현재 문서를 찾을 수 없습니다')
        return
      }

      if (hasPendingSave()) {
        await scheduleImmediateSave(latestDocument)
      } else {
        await waitForSaveQueue()
      }

      if (documentConflictRef.current !== null) {
        toast.warning('다른 저장과 충돌했습니다. 최신 버전을 확인한 뒤 다시 복원하세요')
        return
      }

      await saveDocumentRevisionPoint(
        'before-restore',
        '복원 전 자동 저장 지점',
        latestDocument,
      )
      const restored = await restoreDocumentRevision(revisionId, {
        expectedUpdatedAt: getLastSavedUpdatedAt() ?? undefined,
      })
      if (!restored) {
        toast.error('복원 기록을 찾을 수 없습니다')
        return
      }
      applyLoadedDocument(restored)
      await refreshDocumentRevisions(restored.id)
      setRevisionHistoryOpen(false)
      toast.success('문서를 선택한 복원 기록으로 되돌렸습니다')
    })().catch((error: unknown) => {
      if (error instanceof DocumentBlueprintConflictError) {
        markDocumentConflict(error.latestDocument)
        toast.warning('다른 저장과 충돌했습니다. 최신 버전을 확인한 뒤 다시 복원하세요')
        return
      }
      toast.error('문서를 복원하지 못했습니다')
    }).finally(() => setRevisionActionPending(false))
  }, [
    applyLoadedDocument,
    activeSectionId,
    documentConflictRef,
    flushSerialize,
    getLastSavedUpdatedAt,
    hasPendingSave,
    markDocumentConflict,
    refreshDocumentRevisions,
    revisionActionPending,
    saveDocumentRevisionPoint,
    scheduleImmediateSave,
    waitForSaveQueue,
  ])

  const handleTakeSectionOwnership = useCallback((): void => {
    if (!activeSectionId) {
      return
    }
    setPreviewMode(false)
    takeSectionOwnershipForEditing(activeSectionId, editor.children)
  }, [activeSectionId, editor.children, takeSectionOwnershipForEditing])

  const handleCancelSectionWriting = useCallback((): void => {
    if (!activeSectionId) {
      return
    }
    skipSectionWriting(activeSectionId, '사용자가 자동 작성을 중단했습니다.')
  }, [activeSectionId, skipSectionWriting])

  const persistLatestDocumentBeforeSectionRegeneration = useCallback(async (): Promise<boolean> => {
    const flushed = flushSerialize(activeSectionId ?? undefined)
    const latestDocument = flushed ?? docRef.current
    if (!latestDocument) {
      return false
    }
    await saveDocumentRevisionPoint(
      'before-section-regeneration',
      '섹션 재생성 전 자동 저장 지점',
      latestDocument,
    )

    if (documentConflictRef.current !== null) {
      return false
    }

    if (hasPendingSave() || flushed) {
      await scheduleImmediateSave(latestDocument)
    } else {
      await waitForSaveQueue()
    }

    return documentConflictRef.current === null
  }, [
    activeSectionId,
    documentConflictRef,
    flushSerialize,
    hasPendingSave,
    saveDocumentRevisionPoint,
    scheduleImmediateSave,
    waitForSaveQueue,
  ])

  const getCurrentDocumentIdForSectionRegeneration = useCallback((): string | null => (
    docRef.current?.id ?? null
  ), [])

  const applyRegeneratedDocument = useCallback((updated: DocumentBlueprint): void => {
    loadedSectionRef.current = null
    applyLoadedDocument(updated)
  }, [applyLoadedDocument])

  const {
    sectionRegenerationMode,
    sectionRegenerationModeRef,
    refreshActiveSectionSources: refreshActiveSectionSources,
    regenerateActiveSection: regenerateActiveSection,
  } = useDocumentSectionRegeneration({
    documentId,
    activeSectionId,
    getCurrentDocumentId: getCurrentDocumentIdForSectionRegeneration,
    getLocalEditRevision,
    hasPendingSaveOrConflict,
    persistLatestDocument: persistLatestDocumentBeforeSectionRegeneration,
    applyRegeneratedDocument,
  })

  const handleRefreshActiveSectionSources = useCallback(async (): Promise<void> => {
    await refreshActiveSectionSources()
  }, [refreshActiveSectionSources])

  const handleRegenerateActiveSection = useCallback(async (): Promise<void> => {
    await regenerateActiveSection()
  }, [regenerateActiveSection])

  // Plate 에디터 변경 → plateValue 즉시 저장, serialize는 디바운스 (입력 성능 보호)
  const handlePlateChange = useCallback(() => {
    if (!activeSectionId) return
    if (sectionRegenerationModeRef.current !== null) return
    const plateValue = editor.children
    if (shouldTakeOwnershipForWritingSection(activeSectionId)) {
      takeSectionOwnershipForEditing(activeSectionId, plateValue)
    } else {
      updateSection(activeSectionId, { plateValue, generatedBy: 'user' })
    }

    pendingSerializeSectionRef.current = activeSectionId
    if (serializeTimerRef.current) clearTimeout(serializeTimerRef.current)
    serializeTimerRef.current = setTimeout(() => {
      serializeTimerRef.current = null
      // ref에서 섹션 ID를 읽음 — closure의 activeSectionId는 stale할 수 있음
      const targetSection = pendingSerializeSectionRef.current
      pendingSerializeSectionRef.current = null
      if (!targetSection) return
      try {
        const markdown = editor.api.markdown.serialize()
        updateSection(targetSection, {
          content: markdown,
          plateValue: editor.api.markdown.deserialize(markdown),
        })
      } catch {
        // serialize 실패 시 무시
      }
    }, 500)
  }, [activeSectionId, editor, sectionRegenerationModeRef, shouldTakeOwnershipForWritingSection, takeSectionOwnershipForEditing, updateSection])

  // 섹션 전환 시 Plate 에디터에 content 로드
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
    setEditorRenderKey((current) => current + 1)
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

  // 섹션 제목 변경
  const handleRenameSection = useCallback((sectionId: string, newTitle: string) => {
    updateSection(sectionId, { title: newTitle })
  }, [updateSection])

  const handleSelectSection = useCallback((sectionId: string): void => {
    if (sectionId === activeSectionId) {
      return
    }
    flushSerialize(activeSectionId ?? undefined)
    setActiveSectionId(sectionId)
  }, [activeSectionId, flushSerialize])

  // 섹션 추가
  const handleAddSection = useCallback(() => {
    flushSerialize(activeSectionId ?? undefined)
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
  }, [activeSectionId, flushSerialize, scheduleSave])

  // 재조립
  const handleReassemble = useCallback(async () => {
    await pendingCitationReloadRef.current
    const syncedDoc = flushSerialize(activeSectionId ?? undefined)
    const revisionTarget = syncedDoc ?? docRef.current
    if (revisionTarget) {
      await saveDocumentRevisionPoint(
        'before-reassemble',
        '재조립 전 자동 저장 지점',
        revisionTarget,
      )
    }
    reassembleCurrentDocument(syncedDoc ?? undefined)
  }, [activeSectionId, flushSerialize, reassembleCurrentDocument, saveDocumentRevisionPoint])

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
          ...(draft.tables?.map(t => convertPaperTable(t, {
            sourceAnalysisId: record.id,
            sourceAnalysisLabel: methodName,
          })) ?? []),
        ]
        return {
          ...s,
          tables: newTables.length > 0 ? newTables : undefined,
          sourceRefs: [
            ...s.sourceRefs,
            createDocumentSourceRef('analysis', record.id, {
              label: methodName,
            }),
          ],
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
    const relatedAnalysisId = getGraphPrimaryAnalysisId(graph)
    const linkedAnalysis = relatedAnalysisId
      ? analysisHistory.find((record) => record.id === relatedAnalysisId)
      : undefined
    const figRef = buildFigureRef(graph, existingFigureCount, {
      relatedAnalysisId,
      relatedAnalysisLabel: linkedAnalysis?.method?.name ?? linkedAnalysis?.name,
      patternSummary: linkedAnalysis
        ? generateFigurePatternSummary(graph, linkedAnalysis as unknown as HistoryRecord)
        : undefined,
    })

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
          sourceRefs: [
            ...s.sourceRefs,
            createDocumentSourceRef('figure', graph.id, {
              label: graph.name,
            }),
          ],
          generatedBy: 'user' as const,
        }
      })
      const updated: DocumentBlueprint = { ...prev, sections: newSections, updatedAt: new Date().toISOString() }
      scheduleSave(updated)
      return updated
    })
  }, [activeSectionId, analysisHistory, doc, scheduleSave])

  const handleDeleteCitation = useCallback(async (id: string) => {
    await deleteCitation(id)
  }, [])

  const handleOpenArtifactAnalysis = useCallback((analysisId: string): void => {
    router.push(buildAnalysisHistoryUrl(analysisId))
  }, [router])

  const handleOpenArtifactFigure = useCallback((figureId: string): void => {
    router.push(buildGraphStudioProjectUrl(figureId))
  }, [router])

  const documentWritingState = doc?.writingState
  const activeSectionWritingState = activeSection
    ? documentWritingState?.sectionStates[activeSection.id]
    : undefined
  const writingStatusLabel = useMemo((): string | null => {
    switch (documentWritingState?.status) {
      case 'collecting':
        return '자료 수집 중'
      case 'drafting':
        return '초안 작성 중'
      case 'patching':
        return '문서 반영 중'
      case 'completed':
        return '작성 완료'
      case 'failed':
        return '작성 실패'
      default:
        return null
    }
  }, [documentWritingState?.status])
  const sectionWritingStatusLabel = useMemo((): string | null => {
    switch (activeSectionWritingState?.status as DocumentWritingSectionStatus | undefined) {
      case 'drafting':
        return '섹션 작성 중'
      case 'patched':
        return '섹션 반영 완료'
      case 'skipped':
        return '섹션 보존'
      case 'failed':
        return '섹션 반영 실패'
      default:
        return null
    }
  }, [activeSectionWritingState?.status])
  const canRegenerateActiveSection = activeSection
    ? isDocumentSectionRegenerationSectionId(activeSection.id)
    : false
  const isActiveSectionDrafting = activeSectionWritingState?.status === 'drafting'
  const hasActiveDocumentWritingJob = ['collecting', 'drafting', 'patching'].includes(documentWritingState?.status ?? 'idle')
  const isSectionRegenerationPending = sectionRegenerationMode !== null
  const isSectionRegenerationDisabled = (
    isActiveSectionDrafting
    || isSectionRegenerationPending
    || documentConflict !== null
    || hasActiveDocumentWritingJob
  )
  const handleRetryWriting = useCallback((): void => {
    if (!doc) {
      return
    }
    void retryDocumentWriting(doc.id)
  }, [doc])
  const activeSectionSourceLinks = useDocumentSourceLinks({
    projectId: doc?.projectId ?? null,
    activeSection,
    analysisHistory,
    needsReassemble,
    refreshKey: sourceLinksRefreshKey,
  })
  const activeSectionReviewSourceCount = activeSectionSourceLinks.filter((link) => link.readiness.status !== 'ready').length

  useEffect(() => {
    const target = pendingArtifactTargetRef.current
    if (!target || !activeSectionId) {
      return
    }

    const element = document.querySelector<HTMLElement>(`[data-doc-target="${target}"]`)
    if (!element) {
      return
    }

    pendingArtifactTargetRef.current = null
    element.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [activeSectionId, doc, previewMode])

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
        <DocumentWritingHeaderStatus
          saveStatus={saveStatus}
          writingStatusLabel={writingStatusLabel}
          writingStatus={documentWritingState?.status}
          onRetry={handleRetryWriting}
        />
        <DocumentRevisionHistorySheet
          open={revisionHistoryOpen}
          currentDocument={doc}
          revisions={documentRevisions}
          loading={revisionHistoryLoading}
          actionPending={revisionActionPending}
          disabled={documentConflict !== null}
          onOpenChange={handleRevisionHistoryOpenChange}
          onCreateSnapshot={handleCreateManualRevision}
          onRestoreRevision={handleRestoreRevision}
        />
        <Button
          variant={needsReassemble ? 'secondary' : 'outline'}
          size="sm"
          onClick={handleReassemble}
          className="gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {needsReassemble ? '재조립 필요' : '재조립'}
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
            onClick={() => { flushSerialize(activeSectionId ?? undefined); setPreviewMode(true) }}
            className="gap-1 rounded-l-none"
          >
            <Eye className="w-3.5 h-3.5" />
            미리보기
          </Button>
        </div>
      </div>

      {isScratchProject && (
        <div className="shrink-0 border-b bg-surface-container-low px-4 py-3">
          <div className="flex flex-col gap-3 rounded-xl bg-surface-container px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-foreground">
                현재 문서는 임시 작업공간에 저장 중입니다.
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                내용은 이 브라우저의 로컬 저장소에만 보관됩니다. 계속 사용할 문서라면 프로젝트 관리에서 연구과제를 정리해 두는 편이 안전합니다.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push('/projects')}
            >
              프로젝트 관리 열기
            </Button>
          </div>
        </div>
      )}

      {needsReassemble && (
        <div className="shrink-0 px-4 py-3 bg-surface-container-low">
          <div className="flex items-start gap-3 rounded-xl bg-surface-container px-4 py-3">
            <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-foreground">
                프로젝트 분석 또는 그래프가 변경되었습니다.
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                Methods/Results 섹션과 표·그림 메타데이터가 최신화 대상입니다. 내보내기 시에는 최신 내용이 자동 반영되며,
                편집 화면에서 먼저 확인하려면 <span className="font-medium text-foreground">재조립</span>을 눌러 주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {documentConflict && (
        <div className="shrink-0 px-4 py-3 bg-amber-50">
          <div className="flex items-start gap-3 rounded-xl bg-amber-100 px-4 py-3 text-amber-950">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium">
                다른 탭에서 이 문서가 먼저 저장되었습니다.
              </p>
              <p className="text-xs leading-5 text-amber-900">
                현재 화면의 변경 내용은 로컬에 남아 있지만 자동 저장은 중단되었습니다. 최신 버전을 불러와 비교한 뒤 다시 반영해야 합니다.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => applyLoadedDocument(documentConflict)}
            >
              최신 버전 불러오기
            </Button>
          </div>
        </div>
      )}

      {/* 메인 영역 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측: 섹션 목록 */}
        <div className="w-56 shrink-0 border-r p-3 overflow-y-auto">
          <DocumentSectionList
            sections={doc.sections}
            activeSectionId={activeSectionId}
            onSelectSection={handleSelectSection}
            onReorder={handleReorder}
            onDeleteSection={handleDeleteSection}
            onRenameSection={handleRenameSection}
            onAddSection={handleAddSection}
          />
        </div>

        {/* 중앙: 편집/프리뷰 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection ? (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold">{activeSection.title}</h2>
                {sectionWritingStatusLabel && (
                  <Badge
                    variant={activeSectionWritingState?.status === 'failed' ? 'destructive' : 'secondary'}
                    className="text-[10px]"
                  >
                    {sectionWritingStatusLabel}
                  </Badge>
                )}
                {canRegenerateActiveSection && (
                  <DocumentSectionRegenerationControls
                    sectionTitle={activeSection.title}
                    disabled={isSectionRegenerationDisabled}
                    pendingMode={sectionRegenerationMode}
                    reviewSourceCount={activeSectionReviewSourceCount}
                    hasChangedSources={needsReassemble}
                    onRefreshLinkedSources={handleRefreshActiveSectionSources}
                    onRegenerateSection={handleRegenerateActiveSection}
                  />
                )}
              </div>

              <SectionWritingBanner
                visible={activeSectionWritingState?.status === 'drafting' && activeSection.generatedBy !== 'user'}
                onCancel={handleCancelSectionWriting}
                onTakeOwnership={handleTakeSectionOwnership}
              />

              {activeSectionSourceLinks.length > 0 && (
                <div className="rounded-2xl bg-surface-container-low p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-foreground">원본 자료 자동 작성 범위</p>
                      <p className="text-[11px] leading-4 text-muted-foreground">
                        source별로 자동 반영 가능한 범위와 사용자 확인이 필요한 부분을 표시합니다.
                      </p>
                    </div>
                    {needsReassemble && (
                      <Badge variant="secondary" className="text-[10px]">
                        소스 변경 감지
                      </Badge>
                    )}
                  </div>

                  <div className="mt-3 grid gap-2">
                    {activeSectionSourceLinks.map((link) => (
                      <div
                        key={link.key}
                        className="flex items-start gap-3 rounded-xl bg-surface-container-lowest px-3 py-2"
                      >
                        <SourceReadinessIcon readiness={link.readiness} />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto min-w-0 gap-1 px-0 py-0 text-xs font-medium hover:bg-transparent"
                              onClick={() => router.push(link.href)}
                            >
                              <span>{link.kindLabel}</span>
                              <span className="max-w-52 truncate">{link.label}</span>
                            </Button>
                            <Badge
                              variant="secondary"
                              className={cn('text-[10px]', getReadinessBadgeClass(link.readiness))}
                            >
                              {link.readiness.label}
                            </Badge>
                          </div>
                          <p className="text-[11px] leading-4 text-muted-foreground">
                            {link.readiness.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sectionRegenerationMode !== null ? (
                <div className="min-h-[400px] rounded-lg bg-surface-container-low p-6 text-sm text-muted-foreground">
                  섹션 작업이 진행 중입니다. 수동 편집 충돌을 막기 위해 편집기를 잠시 비활성화했습니다.
                </div>
              ) : previewMode ? (
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
                <PlateEditor
                  key={`${activeSectionId ?? 'none'}:${editorRenderKey}`}
                  editor={editor}
                  onChange={handlePlateChange}
                />
              )}

              <DocumentArtifactLists
                tables={activeSection.tables}
                figures={activeSection.figures}
                onOpenAnalysis={handleOpenArtifactAnalysis}
                onOpenFigure={handleOpenArtifactFigure}
              />
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
            citations={citations}
            onDeleteCitation={handleDeleteCitation}
          />
        </div>
      </div>

      {/* 하단: 내보내기 */}
      <div className="shrink-0 px-4 pb-3">
        <DocumentExportBar document={doc} onBeforeExport={prepareDocumentForExport} />
      </div>
    </div>
  )
}
