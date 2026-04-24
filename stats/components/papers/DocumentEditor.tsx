'use client'

import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react'
import { ArrowLeft, Eye, PenLine, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { usePlateEditor } from 'platejs/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DOCUMENT_BLUEPRINTS_CHANGED_EVENT,
  type DocumentBlueprintsChangedDetail,
  DocumentBlueprintConflictError,
  loadDocumentBlueprint,
  saveDocumentBlueprint,
} from '@/lib/research/document-blueprint-storage'
import { reassembleDocument } from '@/lib/research/document-assembler'
import {
  type ResearchProjectEntityRefsChangedDetail,
  listProjectEntityRefs,
  loadResearchProject,
  RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT,
} from '@/lib/research/project-storage'
import { getTabEntry } from '@/lib/research/entity-tab-registry'
import { useHistoryStore } from '@/lib/stores/history-store'
import {
  type GraphProjectsChangedDetail,
  GRAPH_PROJECTS_CHANGED_EVENT,
  listProjects as listGraphProjects,
} from '@/lib/graph-studio/project-storage'
import { loadBioToolHistory } from '@/lib/bio-tools/bio-tool-history'
import type {
  BoldHistoryEntry,
  PhylogenyHistoryEntry,
  ProteinHistoryEntry,
  SeqStatsHistoryEntry,
  SimilarityHistoryEntry,
  TranslationHistoryEntry,
} from '@/lib/genetics/analysis-history'
import { loadAnalysisHistory, loadGeneticsHistory } from '@/lib/genetics/analysis-history'
import {
  convertPaperTable,
  buildFigureRef,
  createDocumentSourceRef,
  getGraphPrimaryAnalysisId,
  getDocumentSourceId,
  type DocumentWritingSectionStatus,
} from '@/lib/research/document-blueprint-types'
import type { DocumentBlueprint, DocumentSection } from '@/lib/research/document-blueprint-types'
import { ensureDocumentWriting, retryDocumentWriting } from '@/lib/research/document-writing-orchestrator'
import type { HistoryRecord } from '@/lib/utils/storage-types'
import type { GraphProject } from '@/types/graph-studio'
import {
  buildAnalysisHistoryUrl,
  buildGraphStudioProjectUrl,
  buildProjectEntityNavigationUrl,
} from '@/lib/research/source-navigation'
import type { CitationRecord } from '@/lib/research/citation-types'
import {
  deleteCitation,
  listCitationsByProject,
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
import { cn } from '@/lib/utils'
import { generateFigurePatternSummary } from '@/lib/research/paper-package-assembler'
import { updateDocumentSectionWritingState } from '@/lib/research/document-writing'

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
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'conflict'>('saved')
  const [loading, setLoading] = useState(true)
  const [citations, setCitations] = useState<CitationRecord[]>([])
  const [needsReassemble, setNeedsReassemble] = useState(false)
  const [documentConflict, setDocumentConflict] = useState<DocumentBlueprint | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { analysisHistory } = useHistoryStore()
  const docRef = useRef<DocumentBlueprint | null>(null)
  const latestCitationsRef = useRef<CitationRecord[]>([])
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const latestScheduledSaveRevisionRef = useRef(0)
  const pendingSaveRevisionRef = useRef<number | null>(null)
  const lastSavedUpdatedAtRef = useRef<string | null>(null)
  const hasLocalChangesRef = useRef(false)
  const citationRequestSeqRef = useRef(0)
  const pendingCitationReloadRef = useRef<Promise<void> | null>(null)
  const pendingArtifactTargetRef = useRef<string | null>(null)
  const currentProject = useMemo(
    () => (doc ? loadResearchProject(doc.projectId) : null),
    [doc],
  )
  const isScratchProject = (currentProject?.tags ?? []).includes(SCRATCH_PROJECT_TAG)

  // Plate 에디터 인스턴스 — DocumentEditor가 소유
  const editor = usePlateEditor({
    plugins: paperPlugins,
    override: {
      components: {
        [EQUATION_KEY]: EquationElement,
        [INLINE_EQUATION_KEY]: InlineEquationElement,
      },
    },
  })

  // 언마운트 시 미저장 변경 즉시 flush + 타이머 정리
  const pendingDocRef = useRef<DocumentBlueprint | null>(null)
  const serializeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isDocumentConflictError = useCallback((error: unknown): error is DocumentBlueprintConflictError => (
    error instanceof DocumentBlueprintConflictError
    || (
      error instanceof Error
      && error.name === 'DocumentBlueprintConflictError'
      && 'latestDocument' in error
    )
  ), [])

  const applyLoadedDocument = useCallback((loaded: DocumentBlueprint): void => {
    setDoc(loaded)
    docRef.current = loaded
    lastSavedUpdatedAtRef.current = loaded.updatedAt
    hasLocalChangesRef.current = false
    pendingDocRef.current = null
    pendingSaveRevisionRef.current = null
    latestScheduledSaveRevisionRef.current = 0
    setDocumentConflict(null)
    setSaveStatus('saved')

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
  }, [initialSectionId])

  const markDocumentConflict = useCallback((latestDocument: DocumentBlueprint): void => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    pendingSaveRevisionRef.current = null
    setDocumentConflict(latestDocument)
    setSaveStatus('conflict')
  }, [])

  const queueDocumentSave = useCallback((updated: DocumentBlueprint, revision: number): Promise<void> => {
    const saveTask = async (): Promise<void> => {
      if (latestScheduledSaveRevisionRef.current === revision) {
        setSaveStatus('saving')
      }

      try {
        const saved = await saveDocumentBlueprint(updated, {
          expectedUpdatedAt: lastSavedUpdatedAtRef.current ?? undefined,
        })
        lastSavedUpdatedAtRef.current = saved.updatedAt

        if (pendingSaveRevisionRef.current === revision) {
          pendingDocRef.current = null
          pendingSaveRevisionRef.current = null
          hasLocalChangesRef.current = false
        }

        if (latestScheduledSaveRevisionRef.current === revision) {
          setSaveStatus('saved')
        }
      } catch (error) {
        if (isDocumentConflictError(error)) {
          markDocumentConflict(error.latestDocument)
          return
        }
        throw error
      }
    }

    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(saveTask)

    return saveQueueRef.current
  }, [isDocumentConflictError, markDocumentConflict])

  useEffect(() => {
    return () => {
      if (serializeTimerRef.current) {
        clearTimeout(serializeTimerRef.current)
        // 언마운트 시 serialize 호출 불가 — 에디터 인스턴스가 해체 중이라 실패 위험
        // pendingDocRef의 plateValue에 최신 편집이 남아있으므로 데이터 손실 없음
      }
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }

      const pendingDoc = pendingDocRef.current
      const pendingRevision = pendingSaveRevisionRef.current
      if (pendingDoc && pendingRevision !== null) {
        void queueDocumentSave(pendingDoc, pendingRevision)
      }
    }
  }, [queueDocumentSave])

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setDoc(null)
    docRef.current = null
    lastSavedUpdatedAtRef.current = null
    hasLocalChangesRef.current = false
    setActiveSectionId(null)
    setCitations([])
    setNeedsReassemble(false)
    setDocumentConflict(null)
    setSaveStatus('saved')

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
  }, [applyLoadedDocument, documentId, initialSectionId])

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
    latestCitationsRef.current = citations
  }, [citations])

  useEffect(() => {
    if (!doc || hasLocalChangesRef.current) {
      return
    }

    if (!['collecting', 'drafting', 'patching'].includes(doc.writingState?.status ?? 'idle')) {
      return
    }

    void ensureDocumentWriting(doc.id)
  }, [doc])

  useEffect((): (() => void) => {
    const handleDocumentChange = (event: Event): void => {
      if (!(event instanceof CustomEvent)) {
        return
      }

      const detail = event.detail as DocumentBlueprintsChangedDetail | undefined
      if (!detail || detail.documentId !== documentId || detail.action !== 'saved') {
        return
      }
      if (detail.updatedAt && detail.updatedAt === lastSavedUpdatedAtRef.current) {
        return
      }

      void loadDocumentBlueprint(documentId).then((latestDocument) => {
        if (!latestDocument) {
          return
        }
        if (latestDocument.updatedAt === lastSavedUpdatedAtRef.current) {
          return
        }

        if (hasLocalChangesRef.current || pendingSaveRevisionRef.current !== null) {
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
  }, [applyLoadedDocument, documentId, markDocumentConflict])

  const reloadCitations = useCallback(async (projectId: string, requestSeq?: number): Promise<void> => {
    const seq = requestSeq ?? ++citationRequestSeqRef.current
    let task: Promise<void> | null = null

    task = (async () => {
      try {
        const records = await listCitationsByProject(projectId)
        if (citationRequestSeqRef.current === seq && docRef.current?.projectId === projectId) {
          latestCitationsRef.current = records
          setCitations(records)
        }
      } catch {
        if (citationRequestSeqRef.current === seq && docRef.current?.projectId === projectId) {
          latestCitationsRef.current = []
          setCitations([])
        }
      }
    })().finally(() => {
      if (pendingCitationReloadRef.current === task) {
        pendingCitationReloadRef.current = null
      }
    })

    pendingCitationReloadRef.current = task
    await task
  }, [])

  useEffect(() => {
    const projectId = doc?.projectId
    citationRequestSeqRef.current += 1
    const requestSeq = citationRequestSeqRef.current

    if (!projectId) {
      latestCitationsRef.current = []
      setCitations([])
      return () => {
        citationRequestSeqRef.current += 1
      }
    }

    latestCitationsRef.current = []
    setCitations([])
    void reloadCitations(projectId, requestSeq)

    return () => {
      citationRequestSeqRef.current += 1
    }
  }, [doc?.projectId, reloadCitations])

  useEffect((): (() => void) => {
    const handleEntityRefChange = (event: Event): void => {
      const currentProjectId = docRef.current?.projectId
      if (!currentProjectId) return
      if (event instanceof CustomEvent) {
        const detail = event.detail as ResearchProjectEntityRefsChangedDetail | undefined
        if (detail && !detail.projectIds.includes(currentProjectId)) {
          return
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

    window.addEventListener(RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT, handleEntityRefChange)
    window.addEventListener(GRAPH_PROJECTS_CHANGED_EVENT, handleGraphProjectChange)
    window.addEventListener(RESEARCH_PROJECT_CITATIONS_CHANGED_EVENT, handleCitationChange)

    return (): void => {
      window.removeEventListener(RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT, handleEntityRefChange)
      window.removeEventListener(GRAPH_PROJECTS_CHANGED_EVENT, handleGraphProjectChange)
      window.removeEventListener(RESEARCH_PROJECT_CITATIONS_CHANGED_EVENT, handleCitationChange)
    }
  }, [reloadCitations])

  const scheduleSave = useCallback((updated: DocumentBlueprint) => {
    docRef.current = updated
    pendingDocRef.current = updated
    hasLocalChangesRef.current = true
    setDocumentConflict(null)
    const revision = latestScheduledSaveRevisionRef.current + 1
    latestScheduledSaveRevisionRef.current = revision
    pendingSaveRevisionRef.current = revision
    setSaveStatus('unsaved')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void queueDocumentSave(updated, revision)
    }, AUTOSAVE_DELAY)
  }, [queueDocumentSave])

  const scheduleImmediateSave = useCallback((updated: DocumentBlueprint) => {
    docRef.current = updated
    pendingDocRef.current = updated
    hasLocalChangesRef.current = true
    setDocumentConflict(null)
    const revision = latestScheduledSaveRevisionRef.current + 1
    latestScheduledSaveRevisionRef.current = revision
    pendingSaveRevisionRef.current = revision
    setSaveStatus('unsaved')
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    void queueDocumentSave(updated, revision)
  }, [queueDocumentSave])

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

  const prepareDocumentForExport = useCallback(async (): Promise<DocumentBlueprint | undefined> => {
    await pendingCitationReloadRef.current

    const currentDoc = docRef.current
    if (!currentDoc) return undefined

    if (serializeTimerRef.current) {
      clearTimeout(serializeTimerRef.current)
      serializeTimerRef.current = null
    }

    const sectionId = pendingSerializeSectionRef.current
    if (!sectionId) {
      return needsReassemble ? (reassembleCurrentDocument(currentDoc) ?? currentDoc) : currentDoc
    }

    pendingSerializeSectionRef.current = null
    try {
      const markdown = editor.api.markdown.serialize()
      const newSections = currentDoc.sections.map((section) => (
        section.id === sectionId ? { ...section, content: markdown } : section
      ))
      const updated = {
        ...currentDoc,
        sections: newSections,
        updatedAt: new Date().toISOString(),
      }
      setDoc(updated)
      scheduleSave(updated)
      return needsReassemble ? (reassembleCurrentDocument(updated) ?? updated) : updated
    } catch {
      return needsReassemble ? (reassembleCurrentDocument(currentDoc) ?? currentDoc) : currentDoc
    }
  }, [editor, needsReassemble, reassembleCurrentDocument, scheduleSave])

  // serialize 타이머 flush — 섹션 전환/언마운트 전에 현재 content 확정
  const pendingSerializeSectionRef = useRef<string | null>(null)
  const flushSerialize = useCallback(() => {
    if (serializeTimerRef.current) {
      clearTimeout(serializeTimerRef.current)
      serializeTimerRef.current = null
    }
    const sectionId = pendingSerializeSectionRef.current
    if (!sectionId) return null
    pendingSerializeSectionRef.current = null
    try {
      const currentDoc = docRef.current
      if (!currentDoc) return null
      const markdown = editor.api.markdown.serialize()
      const newSections = currentDoc.sections.map((section) => (
        section.id === sectionId ? { ...section, content: markdown } : section
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

  // Plate 에디터 변경 → plateValue 즉시 저장, serialize는 디바운스 (입력 성능 보호)
  const handlePlateChange = useCallback(() => {
    if (!activeSectionId) return
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
        updateSection(targetSection, { content: markdown })
      } catch {
        // serialize 실패 시 무시
      }
    }, 500)
  }, [editor, shouldTakeOwnershipForWritingSection, takeSectionOwnershipForEditing, updateSection])

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

  // 섹션 제목 변경
  const handleRenameSection = useCallback((sectionId: string, newTitle: string) => {
    updateSection(sectionId, { title: newTitle })
  }, [updateSection])

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
  const handleReassemble = useCallback(async () => {
    await pendingCitationReloadRef.current
    const syncedDoc = flushSerialize()
    reassembleCurrentDocument(syncedDoc ?? undefined)
  }, [flushSerialize, reassembleCurrentDocument])

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

  const activeSection = doc?.sections.find((section) => section.id === activeSectionId) ?? null
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
  const handleRetryWriting = useCallback((): void => {
    if (!doc) {
      return
    }
    void retryDocumentWriting(doc.id)
  }, [doc])
  const activeSectionSourceLinks = useMemo(() => {
    if (!doc || !activeSection) return []

    const projectRefs = listProjectEntityRefs(doc.projectId)
    const refByEntityId = new Map(projectRefs.map((ref) => [ref.entityId, ref] as const))
    const historyById = new Map(analysisHistory.map((record) => [record.id, record]))
    const graphById = new Map(listGraphProjects().map((graph) => [graph.id, graph]))
    const bioToolById = new Map(loadBioToolHistory().map((entry) => [entry.id, entry] as const))
    const geneticsById = new Map(loadGeneticsHistory().map((entry) => [entry.id, entry] as const))
    const links = new Map<string, {
      key: string
      label: string
      href: string
      kind: 'analysis' | 'figure' | 'supplementary'
      kindLabel: string
    }>()

    const inferSupplementaryEntityKind = (sourceId: string): typeof projectRefs[number]['entityKind'] | null => {
      if (bioToolById.has(sourceId)) {
        return 'bio-tool-result'
      }
      const geneticsEntry = geneticsById.get(sourceId)
      if (!geneticsEntry) {
        return null
      }
      switch (geneticsEntry.type) {
        case 'seq-stats':
          return 'seq-stats-result'
        case 'similarity':
          return 'similarity-result'
        case 'phylogeny':
          return 'phylogeny-result'
        case 'bold':
          return 'bold-result'
        case 'translation':
          return 'translation-result'
        case 'protein':
          return 'protein-result'
        default:
          return 'blast-result'
      }
    }

    for (const sourceRef of activeSection.sourceRefs) {
      const sourceId = getDocumentSourceId(sourceRef)
      const entityRef = refByEntityId.get(sourceId)
      const entityKind = entityRef?.entityKind ?? inferSupplementaryEntityKind(sourceId)
      if (entityKind === 'analysis' || historyById.has(sourceId)) {
        const record = historyById.get(sourceId)
        links.set(`analysis:${sourceId}`, {
          key: `analysis:${sourceId}`,
          label: record?.method?.name ?? record?.name ?? '원본 분석',
          href: buildAnalysisHistoryUrl(sourceId),
          kind: 'analysis',
          kindLabel: '통계',
        })
        continue
      }

      if (entityKind === 'figure' || graphById.has(sourceId)) {
        const graph = graphById.get(sourceId)
        links.set(`figure:${sourceId}`, {
          key: `figure:${sourceId}`,
          label: graph?.name ?? 'Graph Studio',
          href: buildGraphStudioProjectUrl(sourceId),
          kind: 'figure',
          kindLabel: '그래프',
        })
        continue
      }

      if (entityKind) {
        const bioToolEntry = bioToolById.get(sourceId)
        const geneticsEntry = geneticsById.get(sourceId)
        const href = buildProjectEntityNavigationUrl(entityKind, sourceId, {
          bioToolId: bioToolEntry?.toolId,
        })
        if (!href) {
          continue
        }
        const tabEntry = getTabEntry(entityKind)
        const entryLabel = geneticsEntry && 'analysisName' in geneticsEntry
          ? geneticsEntry.analysisName
          : geneticsEntry && 'sampleName' in geneticsEntry
            ? geneticsEntry.sampleName
            : bioToolEntry?.toolNameKo ?? bioToolEntry?.toolNameEn

        links.set(`supplementary:${sourceId}`, {
          key: `supplementary:${sourceId}`,
          label: sourceRef.label ?? entityRef?.label ?? entryLabel ?? sourceId,
          href,
          kind: 'supplementary',
          kindLabel: tabEntry?.label ?? '보조 결과',
        })
      }
    }

    return Array.from(links.values())
  }, [activeSection, analysisHistory, doc, needsReassemble])

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
            onClick={() => { flushSerialize(); setPreviewMode(true) }}
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
            onSelectSection={setActiveSectionId}
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
              </div>

              <SectionWritingBanner
                visible={activeSectionWritingState?.status === 'drafting' && activeSection.generatedBy !== 'user'}
                onCancel={handleCancelSectionWriting}
                onTakeOwnership={handleTakeSectionOwnership}
              />

              {activeSectionSourceLinks.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/30 px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">원본</span>
                  {activeSectionSourceLinks.map((link) => (
                    <Button
                      key={link.key}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => router.push(link.href)}
                    >
                      <span>{link.kindLabel}</span>
                      <span className="max-w-40 truncate">{link.label}</span>
                    </Button>
                  ))}
                  {needsReassemble && (
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      소스 변경 감지
                    </Badge>
                  )}
                </div>
              )}

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
                  {activeSection.tables.map((table, i) => {
                    const sourceAnalysisId = table.sourceAnalysisId

                    return (
                    <div
                      key={table.id ?? i}
                      data-doc-target={table.id ? `table:${table.id}` : undefined}
                      className="border rounded-lg overflow-hidden"
                    >
                      <div className="flex items-center gap-2 bg-muted/50 p-2">
                        <p className="min-w-0 flex-1 text-xs font-medium">{table.caption}</p>
                        {sourceAnalysisId && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => router.push(buildAnalysisHistoryUrl(sourceAnalysisId))}
                          >
                            통계 열기
                          </Button>
                        )}
                      </div>
                      {table.sourceAnalysisLabel && (
                        <div className="px-2 pb-2 text-xs text-muted-foreground">
                          관련 분석: {table.sourceAnalysisLabel}
                        </div>
                      )}
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
                  )})}
                </div>
              )}

              {/* Figure 목록 */}
              {activeSection.figures && activeSection.figures.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">그림</h3>
                  {activeSection.figures.map(fig => {
                    const relatedAnalysisId = fig.relatedAnalysisId

                    return (
                    <div
                      key={fig.entityId}
                      data-doc-target={`figure:${fig.entityId}`}
                      className="rounded border bg-muted/20 p-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{fig.label}</span>
                        <span className="text-muted-foreground">{fig.caption}</span>
                        <div className="ml-auto flex items-center gap-2">
                          {relatedAnalysisId && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => router.push(buildAnalysisHistoryUrl(relatedAnalysisId))}
                            >
                              통계 열기
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => router.push(buildGraphStudioProjectUrl(fig.entityId))}
                          >
                            Graph Studio
                          </Button>
                        </div>
                      </div>
                      {(fig.relatedAnalysisLabel || fig.patternSummary) && (
                        <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                          {fig.relatedAnalysisLabel && (
                            <p>관련 분석: {fig.relatedAnalysisLabel}</p>
                          )}
                          {fig.patternSummary && (
                            <p>패턴 요약: {fig.patternSummary}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )})}
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
