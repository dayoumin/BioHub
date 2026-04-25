'use client'

import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react'
import { ArrowLeft, Eye, PenLine, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { usePlateEditor } from 'platejs/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  DOCUMENT_BLUEPRINTS_CHANGED_EVENT,
  type DocumentBlueprintsChangedDetail,
  DocumentBlueprintConflictError,
  loadDocumentBlueprint,
  saveDocumentBlueprint,
} from '@/lib/research/document-blueprint-storage'
import {
  applyReferencesSectionContent,
  reassembleDocument,
} from '@/lib/research/document-assembler'
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
  getDocumentSourceId,
  type DocumentWritingSectionStatus,
} from '@/lib/research/document-blueprint-types'
import type { DocumentBlueprint, DocumentSection } from '@/lib/research/document-blueprint-types'
import type {
  DocumentSectionSupportBinding,
  DocumentSectionSupportBindingDraft,
  DocumentSectionSupportRole,
} from '@/lib/research/document-support-asset-types'
import {
  DOCUMENT_SECTION_SUPPORT_ROLE_LABELS,
  getRecommendedDocumentSectionSupportRoles,
  inferDocumentSectionSupportRole,
  mergeDocumentSectionSupportBindings,
} from '@/lib/research/document-support-asset-types'
import { ensureDocumentWriting, retryDocumentWriting } from '@/lib/research/document-writing-orchestrator'
import type { HistoryRecord } from '@/lib/utils/storage-types'
import type { GraphProject } from '@/types/graph-studio'
import {
  buildAnalysisHistoryUrl,
  buildGraphStudioProjectUrl,
  buildProjectEntityNavigationUrl,
} from '@/lib/research/source-navigation'
import type { CitationRecord } from '@/lib/research/citation-types'
import { citationKey } from '@/lib/research/citation-types'
import {
  deleteCitation,
  listCitationsByProject,
  RESEARCH_PROJECT_CITATIONS_CHANGED_EVENT,
  type ResearchProjectCitationsChangedDetail,
} from '@/lib/research/citation-storage'
import {
  buildInlineCitationMarkdown,
  renderInlineCitation,
  resolveDocumentInlineCitations,
  resolveInlineCitationMarkdown,
} from '@/lib/research/citation-csl'
import { insertInlineCitationAtCursor } from '@/lib/research/inline-citation-insertion'
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
import { generateId } from '@/lib/utils/generate-id'

const ReactMarkdown = lazy(() => import('react-markdown'))

// ── Props ──

interface DocumentEditorProps {
  documentId: string
  initialSectionId?: string
  initialTableId?: string
  initialFigureId?: string
  initialAttachCitationKey?: string
  onBack: () => void
}

// ── 자동 저장 딜레이 ──

const AUTOSAVE_DELAY = 1500
const SCRATCH_PROJECT_TAG = 'system:papers-scratch'
const LOCAL_STORAGE_TOAST_KEY_PREFIX = 'papers-local-storage-toast'

function buildCitationSupportBinding(
  sectionId: string,
  record: CitationRecord,
  role?: DocumentSectionSupportRole,
): DocumentSectionSupportBindingDraft {
  return {
    sourceKind: 'citation-record',
    sourceId: record.id,
    role: role ?? inferDocumentSectionSupportRole(sectionId),
    label: record.item.title,
    summary: record.item.abstract?.slice(0, 180),
    citationIds: [record.id],
    origin: 'user',
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function removeInlineCitationMarkdown(content: string, citationId: string): string {
  const citationLinkPattern = new RegExp(`\\[([^\\]]*?)\\]\\(citation:${escapeRegExp(citationId)}\\)`, 'g')
  return content.replace(citationLinkPattern, '$1')
}

interface CleanPlateValueResult {
  value: unknown
  changed: boolean
}

function removeInlineCitationFromPlateValue(value: unknown, citationId: string): CleanPlateValueResult {
  const citationUrl = `citation:${citationId}`

  if (typeof value === 'string') {
    const nextValue = removeInlineCitationMarkdown(value, citationId)
    return {
      value: nextValue,
      changed: nextValue !== value,
    }
  }

  if (Array.isArray(value)) {
    let changed = false
    const nextValue = value.flatMap((item) => {
      const cleaned = removeInlineCitationFromPlateValue(item, citationId)
      if (cleaned.changed) {
        changed = true
      }
      return Array.isArray(cleaned.value) ? cleaned.value : [cleaned.value]
    })
    return {
      value: changed ? nextValue : value,
      changed,
    }
  }

  if (typeof value !== 'object' || value === null) {
    return {
      value,
      changed: false,
    }
  }

  const node = value as Record<string, unknown>
  const children = node.children
  const hasCitationUrl = node.url === citationUrl || node.href === citationUrl
  if (hasCitationUrl && Array.isArray(children)) {
    const cleanedChildren = removeInlineCitationFromPlateValue(children, citationId)
    return {
      value: cleanedChildren.value,
      changed: true,
    }
  }

  let changed = false
  const nextNode: Record<string, unknown> = {}
  for (const [key, fieldValue] of Object.entries(node)) {
    const cleaned = key === 'text' || key === 'children'
      ? removeInlineCitationFromPlateValue(fieldValue, citationId)
      : { value: fieldValue, changed: false }
    nextNode[key] = cleaned.value
    changed = changed || cleaned.changed
  }

  return {
    value: changed ? nextNode : value,
    changed,
  }
}

function removeCitationFromSupportBindings(
  bindings: DocumentSectionSupportBinding[] | undefined,
  citationId: string,
): DocumentSectionSupportBinding[] | undefined {
  if (!bindings) {
    return bindings
  }

  let didChange = false
  const nextBindings = bindings.flatMap((binding) => {
    if (binding.sourceKind === 'citation-record' && binding.sourceId === citationId) {
      didChange = true
      return []
    }

    if ((binding.citationIds ?? []).includes(citationId)) {
      didChange = true
      return [{
        ...binding,
        citationIds: binding.citationIds?.filter((id) => id !== citationId),
      }]
    }

    return [binding]
  })

  if (!didChange) {
    return bindings
  }

  return nextBindings.length > 0 ? nextBindings : undefined
}

function documentHasSupplementarySources(document: DocumentBlueprint | null): boolean {
  if (!document) {
    return false
  }

  return document.sections.some((section) => (
    (section.sourceRefs ?? []).some((sourceRef) => sourceRef.kind === 'supplementary')
  ))
}

export default function DocumentEditor({
  documentId,
  initialSectionId,
  initialTableId,
  initialFigureId,
  initialAttachCitationKey,
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
  const documentConflictRef = useRef<DocumentBlueprint | null>(null)
  const citationRequestSeqRef = useRef(0)
  const pendingCitationReloadRef = useRef<Promise<void> | null>(null)
  const pendingArtifactTargetRef = useRef<string | null>(null)
  const initialCitationAttachmentHandledRef = useRef(false)
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
    documentConflictRef.current = null
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
    documentConflictRef.current = latestDocument
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

    const handleSupplementaryHistoryChange = (): void => {
      if (!documentHasSupplementarySources(docRef.current)) {
        return
      }
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

  const scheduleSave = useCallback((updated: DocumentBlueprint) => {
    docRef.current = updated
    pendingDocRef.current = updated
    hasLocalChangesRef.current = true
    setDocumentConflict(null)
    documentConflictRef.current = null
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
    documentConflictRef.current = null
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

  const updateSectionSupportBindings = useCallback((
    sectionId: string,
    updater: (currentBindings: DocumentSectionSupportBinding[] | undefined) => DocumentSectionSupportBinding[] | undefined,
  ): void => {
    setDoc((prev) => {
      if (!prev) {
        return prev
      }

      let didChange = false
      const newSections = prev.sections.map((section) => {
        if (section.id !== sectionId) {
          return section
        }

        const nextBindings = updater(section.sectionSupportBindings)
        if (nextBindings === section.sectionSupportBindings) {
          return section
        }

        didChange = true
        return { ...section, sectionSupportBindings: nextBindings }
      })
      if (!didChange) {
        return prev
      }
      const updated = applyReferencesSectionContent({
        ...prev,
        sections: newSections,
        updatedAt: new Date().toISOString(),
      }, latestCitationsRef.current)
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

  const interruptDocumentWriting = useCallback((
    document: DocumentBlueprint,
    sectionId: string,
    options: {
      message: string
      plateValue?: unknown
    },
  ): DocumentBlueprint => {
    const interruptedAt = new Date().toISOString()
    const previousJobId = document.writingState?.jobId
    const interruptionJobId = generateId('docjob')

    const nextSections = document.sections.map((section) => (
      section.id === sectionId
        ? {
            ...section,
            plateValue: options.plateValue ?? section.plateValue,
            generatedBy: 'user' as const,
          }
        : section
    ))

    let updatedDocument: DocumentBlueprint = {
      ...document,
      sections: nextSections,
      updatedAt: interruptedAt,
    }

    updatedDocument = {
      ...updatedDocument,
      writingState: {
        ...updatedDocument.writingState,
        status: 'completed',
        jobId: interruptionJobId,
        startedAt: updatedDocument.writingState?.startedAt,
        updatedAt: interruptedAt,
        errorMessage: undefined,
        sectionStates: {
          ...(updatedDocument.writingState?.sectionStates ?? {}),
        },
      },
    }

    for (const section of document.sections) {
      const currentStatus = document.writingState?.sectionStates[section.id]?.status
      const currentJobId = document.writingState?.sectionStates[section.id]?.jobId ?? previousJobId
      const shouldInterruptSection = (
        section.id === sectionId
        || (currentStatus === 'drafting' && currentJobId === previousJobId)
      )

      if (!shouldInterruptSection) {
        continue
      }

      updatedDocument = updateDocumentSectionWritingState(updatedDocument, section.id, 'skipped', {
        jobId: interruptionJobId,
        updatedAt: interruptedAt,
        message: section.id === sectionId
          ? options.message
          : '사용자가 자동 작성을 중단했습니다.',
      })
    }

    return updatedDocument
  }, [])

  const takeSectionOwnershipForEditing = useCallback((sectionId: string, plateValue: unknown): void => {
    setDoc((prev) => {
      if (!prev) {
        return prev
      }
      const updated = interruptDocumentWriting(prev, sectionId, {
        message: '사용자 편집이 시작되어 자동 초안을 중단했습니다.',
        plateValue,
      })
      scheduleImmediateSave(updated)
      return updated
    })
  }, [interruptDocumentWriting, scheduleImmediateSave])

  const skipSectionWriting = useCallback((sectionId: string, message: string): void => {
    setDoc((prev) => {
      if (!prev) {
        return prev
      }
      const updated = interruptDocumentWriting(prev, sectionId, { message })
      scheduleImmediateSave(updated)
      return updated
    })
  }, [interruptDocumentWriting, scheduleImmediateSave])

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
      const exportDoc = needsReassemble ? (reassembleCurrentDocument(currentDoc) ?? currentDoc) : currentDoc
      return resolveDocumentInlineCitations(
        applyReferencesSectionContent(exportDoc, latestCitationsRef.current),
        latestCitationsRef.current,
      )
    }

    pendingSerializeSectionRef.current = null
    try {
      const markdown = editor.api.markdown.serialize()
      const newSections = currentDoc.sections.map((section) => (
        section.id === sectionId ? { ...section, content: markdown } : section
      ))
      const updated = applyReferencesSectionContent({
        ...currentDoc,
        sections: newSections,
        updatedAt: new Date().toISOString(),
      }, latestCitationsRef.current)
      setDoc(updated)
      scheduleSave(updated)
      const exportDoc = needsReassemble ? (reassembleCurrentDocument(updated) ?? updated) : updated
      return resolveDocumentInlineCitations(
        applyReferencesSectionContent(exportDoc, latestCitationsRef.current),
        latestCitationsRef.current,
      )
    } catch {
      const exportDoc = needsReassemble ? (reassembleCurrentDocument(currentDoc) ?? currentDoc) : currentDoc
      return resolveDocumentInlineCitations(
        applyReferencesSectionContent(exportDoc, latestCitationsRef.current),
        latestCitationsRef.current,
      )
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

  const flushPendingWrites = useCallback(async (): Promise<void> => {
    flushSerialize()

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }

    const pendingDoc = pendingDocRef.current
    const pendingRevision = pendingSaveRevisionRef.current

    if (pendingDoc && pendingRevision !== null) {
      await queueDocumentSave(pendingDoc, pendingRevision)
      return
    }

    await saveQueueRef.current.catch(() => undefined)
  }, [flushSerialize, queueDocumentSave])

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
  }, [activeSectionId, editor, shouldTakeOwnershipForWritingSection, takeSectionOwnershipForEditing, updateSection])

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
    const remainingCitations = latestCitationsRef.current.filter((record) => record.id !== id)
    latestCitationsRef.current = remainingCitations
    setCitations(remainingCitations)

    const cleanedActivePlateValue = activeSectionId
      ? removeInlineCitationFromPlateValue(editor.children, id)
      : { value: null, changed: false }
    if (activeSectionId && cleanedActivePlateValue.changed) {
      editor.tf.setValue(cleanedActivePlateValue.value as typeof editor.children)
    }

    setDoc((prev) => {
      if (!prev) {
        return prev
      }

      let didChange = false
      const nextSections = prev.sections.map((section) => {
        const nextContent = removeInlineCitationMarkdown(section.content, id)
        const nextBindings = removeCitationFromSupportBindings(section.sectionSupportBindings, id)
        const nextPlateValue = section.id === activeSectionId && cleanedActivePlateValue.changed
          ? cleanedActivePlateValue.value
          : section.plateValue
            ? removeInlineCitationFromPlateValue(section.plateValue, id).value
            : section.plateValue
        if (
          nextContent === section.content
          && nextBindings === section.sectionSupportBindings
          && nextPlateValue === section.plateValue
        ) {
          return section
        }

        didChange = true
        return {
          ...section,
          content: nextContent,
          plateValue: nextPlateValue,
          sectionSupportBindings: nextBindings,
        }
      })

      if (!didChange) {
        return prev
      }

      const updated = applyReferencesSectionContent({
        ...prev,
        sections: nextSections,
        updatedAt: new Date().toISOString(),
      }, remainingCitations)
      scheduleSave(updated)
      return updated
    })
    toast.success('문헌을 삭제하고 연결된 섹션 근거를 정리했습니다.')
  }, [activeSectionId, editor, scheduleSave])

  const handleAttachCitationToSection = useCallback((
    record: CitationRecord,
    role?: DocumentSectionSupportRole,
  ): void => {
    if (!activeSectionId) {
      return
    }

    const bindingDraft = buildCitationSupportBinding(activeSectionId, record, role)
    updateSectionSupportBindings(activeSectionId, (currentBindings) => {
      const alreadyAttached = (currentBindings ?? []).some((binding) => (
        binding.sourceKind === 'citation-record'
        && binding.sourceId === record.id
        && binding.role === bindingDraft.role
      ))
      if (alreadyAttached) {
        return currentBindings
      }
      return mergeDocumentSectionSupportBindings(currentBindings, [bindingDraft])
    })
    setNeedsReassemble(true)
    toast.success(`${DOCUMENT_SECTION_SUPPORT_ROLE_LABELS[bindingDraft.role]} 문헌으로 연결했습니다.`)
  }, [activeSectionId, updateSectionSupportBindings])

  const handleInsertInlineCitation = useCallback((
    record: CitationRecord,
    role?: DocumentSectionSupportRole,
  ): void => {
    if (!activeSectionId) {
      return
    }

    const citationMarkdown = buildInlineCitationMarkdown(record)
    const strategy = insertInlineCitationAtCursor(editor, citationMarkdown)
    if (strategy !== 'noop') {
      return
    }
    try {
      const citationNodes = editor.api.markdown.deserialize(citationMarkdown)
      if (Array.isArray(citationNodes) && citationNodes.length > 0) {
        editor.tf.insertNodes(citationNodes)
        return
      }
    } catch {
      // markdown link deserialize 실패 시 plain text fallback
    }
    editor.tf.insertNodes([
      { type: 'p', children: [{ text: renderInlineCitation(record) }] },
    ])
    toast.success(`${DOCUMENT_SECTION_SUPPORT_ROLE_LABELS[role ?? inferDocumentSectionSupportRole(activeSectionId)]} 본문 인용을 삽입했습니다.`)
  }, [activeSectionId, editor])

  const handleUpdateSupportBindingRole = useCallback((
    bindingId: string,
    role: DocumentSectionSupportRole,
  ): void => {
    if (!activeSectionId) {
      return
    }

    updateSectionSupportBindings(activeSectionId, (currentBindings) => {
      const existing = (currentBindings ?? []).find((binding) => binding.id === bindingId)
      if (!existing || existing.role === role) {
        return currentBindings
      }

      const remainingBindings = (currentBindings ?? []).filter((binding) => binding.id !== bindingId)
      return mergeDocumentSectionSupportBindings(remainingBindings, [{
        ...existing,
        role,
      }])
    })
    setNeedsReassemble(true)
    toast.success(`문헌 역할을 ${DOCUMENT_SECTION_SUPPORT_ROLE_LABELS[role]}로 바꿨습니다.`)
  }, [activeSectionId, updateSectionSupportBindings])

  const handleDetachSupportBinding = useCallback((bindingId: string): void => {
    if (!activeSectionId) {
      return
    }

    updateSectionSupportBindings(activeSectionId, (currentBindings) => {
      const nextBindings = (currentBindings ?? []).filter((binding) => binding.id !== bindingId)
      return nextBindings.length > 0 ? nextBindings : undefined
    })
    setNeedsReassemble(true)
    toast.success('현재 섹션에서 문헌 연결을 해제했습니다.')
  }, [activeSectionId, updateSectionSupportBindings])

  const handleDetachCitationRoleFromSection = useCallback((
    record: CitationRecord,
    role: DocumentSectionSupportRole,
  ): void => {
    if (!activeSectionId) {
      return
    }

    let removedCount = 0
    updateSectionSupportBindings(activeSectionId, (currentBindings) => {
      const nextBindings = (currentBindings ?? []).filter((binding) => {
        const matchesCitation = binding.sourceKind === 'citation-record'
          && (
            binding.sourceId === record.id
            || (binding.citationIds ?? []).includes(record.id)
          )
        const shouldRemove = matchesCitation && binding.role === role
        if (shouldRemove) {
          removedCount += 1
        }
        return !shouldRemove
      })

      return nextBindings.length > 0 ? nextBindings : undefined
    })

    if (removedCount > 0) {
      setNeedsReassemble(true)
      toast.success(
        removedCount > 1
          ? `${DOCUMENT_SECTION_SUPPORT_ROLE_LABELS[role]} 문헌 메모 ${removedCount}건을 현재 섹션에서 해제했습니다.`
          : `${DOCUMENT_SECTION_SUPPORT_ROLE_LABELS[role]} 문헌 연결을 현재 섹션에서 해제했습니다.`,
      )
    }
  }, [activeSectionId, updateSectionSupportBindings])

  const handleDuplicateSupportBinding = useCallback((bindingId: string): void => {
    if (!activeSectionId) {
      return
    }

    updateSectionSupportBindings(activeSectionId, (currentBindings) => {
      const existing = (currentBindings ?? []).find((binding) => binding.id === bindingId)
      if (!existing) {
        return currentBindings
      }

      return mergeDocumentSectionSupportBindings(currentBindings, [{
        ...existing,
        id: generateId('dsb'),
        summary: undefined,
        excerpt: undefined,
      }])
    })
    toast.success('같은 문헌으로 새 메모 카드를 추가했습니다.')
  }, [activeSectionId, updateSectionSupportBindings])

  const handleUpdateSupportBindingNotes = useCallback((
    bindingId: string,
    updates: {
      summary?: string
      excerpt?: string
    },
  ): void => {
    if (!activeSectionId) {
      return
    }

    updateSectionSupportBindings(activeSectionId, (currentBindings) => {
      const existing = (currentBindings ?? []).find((binding) => binding.id === bindingId)
      if (!existing) {
        return currentBindings
      }

      const nextSummary = updates.summary?.trim() || undefined
      const nextExcerpt = updates.excerpt?.trim() || undefined
      if (existing.summary === nextSummary && existing.excerpt === nextExcerpt) {
        return currentBindings
      }

      const remainingBindings = (currentBindings ?? []).filter((binding) => binding.id !== bindingId)
      return mergeDocumentSectionSupportBindings(remainingBindings, [{
        ...existing,
        summary: nextSummary,
        excerpt: nextExcerpt,
      }])
    })
  }, [activeSectionId, updateSectionSupportBindings])

  const activeSection = doc?.sections.find((section) => section.id === activeSectionId) ?? null
  const activeSectionSupportBindings = activeSection?.sectionSupportBindings?.filter((binding) => binding.included !== false) ?? []
  const activeSectionSupportRoleOptions = useMemo(
    () => getRecommendedDocumentSectionSupportRoles(activeSectionId),
    [activeSectionId],
  )
  const activeSectionPreviewContent = useMemo(() => (
    resolveInlineCitationMarkdown(activeSection?.content || '*내용 없음*', citations)
  ), [activeSection?.content, citations])
  const activeSectionAttachedCitationRoleCounts = useMemo(() => {
    const roleMap = new Map<string, Map<DocumentSectionSupportRole, number>>()
    for (const binding of activeSectionSupportBindings) {
      const targets = binding.sourceKind === 'citation-record'
        ? [binding.sourceId, ...(binding.citationIds ?? [])]
        : []
      for (const citationId of targets) {
        const roleCounts = roleMap.get(citationId) ?? new Map<DocumentSectionSupportRole, number>()
        roleCounts.set(binding.role, (roleCounts.get(binding.role) ?? 0) + 1)
        roleMap.set(citationId, roleCounts)
      }
    }
    return roleMap
  }, [activeSectionSupportBindings])
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
  useEffect(() => {
    initialCitationAttachmentHandledRef.current = false
  }, [documentId, initialAttachCitationKey])

  useEffect(() => {
    if (!initialAttachCitationKey || initialCitationAttachmentHandledRef.current || !activeSectionId) {
      return
    }

    const matchingCitation = citations.find((record) => (
      citationKey(record.item) === initialAttachCitationKey
    ))
    if (!matchingCitation) {
      return
    }

    initialCitationAttachmentHandledRef.current = true
    handleAttachCitationToSection(matchingCitation)
  }, [activeSectionId, citations, handleAttachCitationToSection, initialAttachCitationKey])
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
  const handleRetryWriting = useCallback(async (): Promise<void> => {
    if (!doc) {
      return
    }
    if (documentConflictRef.current) {
      return
    }

    try {
      await flushPendingWrites()
    } catch (error) {
      console.error('[DocumentEditor] failed to flush local changes before retry:', error)
      toast.error('문서 재시도를 준비하지 못했습니다.')
      return
    }

    if (documentConflictRef.current || pendingSaveRevisionRef.current !== null) {
      return
    }

    try {
      await retryDocumentWriting(doc.id)
    } catch (error) {
      console.error('[DocumentEditor] failed to retry writing:', error)
      toast.error('문서 재시도에 실패했습니다.')
    }
  }, [doc, flushPendingWrites])
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
    <div className="flex h-[calc(100vh-64px)] flex-col bg-surface">
      {/* 상단 바 */}
      <div className="shrink-0 px-6 pt-6">
        <div className="flex flex-wrap items-center gap-3 rounded-[28px] bg-surface-container-lowest px-5 py-4 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
            <ArrowLeft className="w-4 h-4" />
            목록
          </Button>
          <Separator orientation="vertical" className="h-5 bg-outline/30" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Writing Workspace
            </p>
            <h1 className="truncate text-sm font-semibold text-on-surface">{doc.title}</h1>
          </div>
          <DocumentWritingHeaderStatus
            saveStatus={saveStatus}
            writingStatusLabel={writingStatusLabel}
            writingStatus={documentWritingState?.status}
            onRetry={handleRetryWriting}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReassemble}
            className="gap-1 rounded-full bg-surface-container-high px-3"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {needsReassemble ? '재조립 필요' : '재조립'}
          </Button>
          <div className="flex rounded-full bg-surface-container p-1">
            <Button
              variant={previewMode ? 'ghost' : 'secondary'}
              size="sm"
              onClick={() => setPreviewMode(false)}
              className="gap-1 rounded-full"
            >
              <PenLine className="w-3.5 h-3.5" />
              편집
            </Button>
            <Button
              variant={previewMode ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => { flushSerialize(); setPreviewMode(true) }}
              className="gap-1 rounded-full"
            >
              <Eye className="w-3.5 h-3.5" />
              미리보기
            </Button>
          </div>
        </div>
      </div>

      {isScratchProject && (
        <div className="shrink-0 px-6 pt-4">
          <div className="flex flex-col gap-3 rounded-[24px] bg-surface-container px-4 py-4 md:flex-row md:items-center md:justify-between">
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
              variant="secondary"
              size="sm"
              onClick={() => router.push('/projects')}
              className="bg-surface-container-lowest"
            >
              프로젝트 관리 열기
            </Button>
          </div>
        </div>
      )}

      {needsReassemble && (
        <div className="shrink-0 px-6 pt-4">
          <div className="flex items-start gap-3 rounded-[24px] bg-surface-container px-4 py-4">
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
        <div className="shrink-0 px-6 pt-4">
          <div className="flex items-start gap-3 rounded-[24px] bg-amber-100 px-4 py-4 text-amber-950">
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
              variant="secondary"
              onClick={() => applyLoadedDocument(documentConflict)}
              className="bg-white/80 text-amber-950 hover:bg-white"
            >
              최신 버전 불러오기
            </Button>
          </div>
        </div>
      )}

      {/* 메인 영역 */}
      <div className="flex min-h-0 flex-1 gap-4 px-6 py-4">
        {/* 좌측: 섹션 목록 */}
        <div className="w-[280px] shrink-0 overflow-y-auto rounded-[28px] bg-surface-container-low p-4">
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
        <div className="min-w-0 flex-1 overflow-y-auto rounded-[32px] bg-surface-container-lowest px-8 py-7">
          {activeSection ? (
            <div className="mx-auto max-w-3xl space-y-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    현재 섹션
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {doc.sections.findIndex((section) => section.id === activeSection.id) + 1} / {doc.sections.length}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-on-surface">{activeSection.title}</h2>
                  <Badge
                    variant="secondary"
                    className="rounded-full bg-surface-container px-2.5 py-1 text-[10px] font-medium text-on-surface-variant"
                  >
                    {activeSection.generatedBy === 'llm'
                      ? 'AI 작성'
                      : activeSection.generatedBy === 'template'
                        ? '자동 구조'
                        : '직접 작성'}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="rounded-full bg-surface-container px-2.5 py-1 text-[10px] font-medium text-on-surface-variant"
                  >
                    원본 {activeSection.sourceRefs.length}
                  </Badge>
                  {activeSectionSupportBindings.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="rounded-full bg-surface-container px-2.5 py-1 text-[10px] font-medium text-on-surface-variant"
                    >
                      문헌 {activeSectionSupportBindings.length}
                    </Badge>
                  )}
                  {(activeSection.tables?.length ?? 0) > 0 && (
                    <Badge
                      variant="secondary"
                      className="rounded-full bg-surface-container px-2.5 py-1 text-[10px] font-medium text-on-surface-variant"
                    >
                      표 {activeSection.tables?.length ?? 0}
                    </Badge>
                  )}
                  {(activeSection.figures?.length ?? 0) > 0 && (
                    <Badge
                      variant="secondary"
                      className="rounded-full bg-surface-container px-2.5 py-1 text-[10px] font-medium text-on-surface-variant"
                    >
                      그림 {activeSection.figures?.length ?? 0}
                    </Badge>
                  )}
                </div>
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
                <div className="rounded-[24px] bg-surface px-4 py-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      연결된 원본
                    </span>
                    <span className="text-xs text-muted-foreground">
                      이 섹션이 참조하는 원본으로 바로 이동합니다.
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                  {activeSectionSourceLinks.map((link) => (
                    <Button
                      key={link.key}
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 gap-1 rounded-full bg-surface-container px-3 text-xs"
                      onClick={() => router.push(link.href)}
                    >
                      <span>{link.kindLabel}</span>
                      <span className="max-w-40 truncate">{link.label}</span>
                    </Button>
                  ))}
                  {needsReassemble && (
                    <Badge
                      variant="secondary"
                      className="ml-auto rounded-full bg-secondary-container px-2.5 py-1 text-[10px] font-medium text-secondary"
                    >
                      소스 변경 감지
                    </Badge>
                  )}
                  </div>
                </div>
              )}

              {activeSectionSupportBindings.length > 0 && (
                <div className="rounded-[24px] bg-surface px-4 py-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      섹션 작성 근거
                    </span>
                    <span className="text-xs text-muted-foreground">
                      이 섹션 작성에 연결된 문헌과 해석 근거입니다.
                    </span>
                  </div>
                  <div className="space-y-2">
                    {activeSectionSupportBindings.map((binding) => {
                      const matchedCitation = citations.find((record) => record.id === binding.sourceId)
                        ?? citations.find((record) => (binding.citationIds ?? []).includes(record.id))
                      return (
                        <div
                          key={binding.id}
                          className="rounded-2xl bg-surface-container px-3 py-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="secondary"
                              className="rounded-full bg-surface-container-high px-2.5 py-1 text-[10px] font-medium text-on-surface-variant"
                            >
                              {DOCUMENT_SECTION_SUPPORT_ROLE_LABELS[binding.role]}
                            </Badge>
                            {matchedCitation && (
                              <span className="text-xs text-muted-foreground">
                                {renderInlineCitation(matchedCitation)}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm font-medium text-on-surface">
                            {binding.label ?? matchedCitation?.item.title ?? binding.sourceId}
                          </p>
                          <div className="mt-3 space-y-2">
                            <div className="space-y-1">
                              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                핵심 메모
                              </p>
                              <Textarea
                                key={`${binding.id}:summary:${binding.summary ?? ''}`}
                                defaultValue={binding.summary ?? ''}
                                placeholder="이 문헌에서 이 섹션에 쓸 핵심 주장이나 요약을 적어두세요."
                                aria-label="핵심 메모"
                                className="min-h-[72px] resize-none border-0 bg-surface px-3 py-2 text-xs leading-relaxed shadow-none"
                                onBlur={(event) => {
                                  handleUpdateSupportBindingNotes(binding.id, {
                                    summary: event.currentTarget.value,
                                    excerpt: binding.excerpt,
                                  })
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                발췌 메모
                              </p>
                              <Textarea
                                key={`${binding.id}:excerpt:${binding.excerpt ?? ''}`}
                                defaultValue={binding.excerpt ?? ''}
                                placeholder="초록이나 PDF 원문에서 남겨둘 문장, 비교 포인트, 인용 메모를 적어두세요."
                                aria-label="발췌 메모"
                                className="min-h-[72px] resize-none border-0 bg-surface px-3 py-2 text-xs leading-relaxed shadow-none"
                                onBlur={(event) => {
                                  handleUpdateSupportBindingNotes(binding.id, {
                                    summary: binding.summary,
                                    excerpt: event.currentTarget.value,
                                  })
                                }}
                              />
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            {Array.from(new Set([binding.role, ...activeSectionSupportRoleOptions])).map((roleOption) => (
                              <Button
                                key={`${binding.id}-${roleOption}`}
                                type="button"
                                variant="secondary"
                                size="sm"
                                className={cn(
                                  'h-7 rounded-full px-2.5 text-[11px]',
                                  roleOption === binding.role
                                    ? 'bg-surface-container-high text-on-surface'
                                    : 'bg-surface text-on-surface-variant',
                                )}
                                onClick={() => handleUpdateSupportBindingRole(binding.id, roleOption)}
                                disabled={roleOption === binding.role}
                              >
                                {DOCUMENT_SECTION_SUPPORT_ROLE_LABELS[roleOption]}
                              </Button>
                            ))}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 rounded-full px-2.5 text-[11px] text-muted-foreground hover:bg-surface"
                              onClick={() => handleDuplicateSupportBinding(binding.id)}
                            >
                              같은 문헌 근거 추가
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ml-auto h-7 rounded-full px-2.5 text-[11px] text-muted-foreground hover:bg-surface"
                              onClick={() => handleDetachSupportBinding(binding.id)}
                            >
                              섹션에서 해제
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {previewMode ? (
                <div className="prose max-w-none rounded-[24px] bg-surface px-6 py-5">
                  <Suspense fallback={<p className="text-muted-foreground">로딩 중...</p>}>
                    <ReactMarkdown
                      remarkPlugins={MARKDOWN_CONFIG.remarkPlugins}
                      rehypePlugins={MARKDOWN_CONFIG.rehypePlugins}
                    >
                      {activeSectionPreviewContent}
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
                      className="overflow-hidden rounded-[24px] bg-surface"
                    >
                      <div className="flex items-center gap-2 bg-surface-container px-3 py-3">
                        <p className="min-w-0 flex-1 text-xs font-medium">{table.caption}</p>
                        {sourceAnalysisId && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-7 rounded-full bg-surface-container-high px-3 text-xs"
                            onClick={() => router.push(buildAnalysisHistoryUrl(sourceAnalysisId))}
                          >
                            통계 열기
                          </Button>
                        )}
                      </div>
                      {table.sourceAnalysisLabel && (
                        <div className="px-3 pb-3 text-xs text-muted-foreground">
                          관련 분석: {table.sourceAnalysisLabel}
                        </div>
                      )}
                      {table.htmlContent ? (
                        <div
                          className="overflow-x-auto px-3 pb-3 text-sm"
                          dangerouslySetInnerHTML={{ __html: table.htmlContent }}
                        />
                      ) : (
                        <div className="overflow-x-auto px-3 pb-3">
                          <table className="w-full text-xs tabular-nums">
                            <thead>
                              <tr>
                                {table.headers.map((h, hi) => (
                                  <th
                                    key={hi}
                                    className="bg-surface-container px-3 py-2 text-left font-medium text-on-surface-variant"
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {table.rows.map((row, ri) => (
                                <tr key={ri} className={ri % 2 === 0 ? 'bg-surface-container-low/60' : ''}>
                                  {row.map((cell, ci) => (
                                    <td key={ci} className="px-3 py-2">{cell}</td>
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
                      className="rounded-[24px] bg-surface px-4 py-4 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{fig.label}</span>
                        <span className="text-muted-foreground">{fig.caption}</span>
                        <div className="ml-auto flex items-center gap-2">
                          {relatedAnalysisId && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-7 rounded-full bg-surface-container px-3 text-xs"
                              onClick={() => router.push(buildAnalysisHistoryUrl(relatedAnalysisId))}
                            >
                              통계 열기
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-7 rounded-full bg-surface-container px-3 text-xs"
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
            <div className="flex h-full items-center justify-center rounded-[24px] bg-surface text-muted-foreground">
              좌측에서 섹션을 선택하세요
            </div>
          )}
        </div>

        {/* 우측: 재료 팔레트 */}
        <div className="w-[340px] shrink-0 overflow-y-auto rounded-[28px] bg-surface-container-low p-4">
          <MaterialPalette
            projectId={doc.projectId}
            documentId={doc.id}
            activeSectionId={activeSectionId}
            activeSectionTitle={activeSection?.title ?? null}
            onInsertAnalysis={handleInsertAnalysis}
            onInsertFigure={handleInsertFigure}
            citations={citations}
            onDeleteCitation={handleDeleteCitation}
            onAttachCitationToSection={handleAttachCitationToSection}
            onDetachCitationFromSection={handleDetachCitationRoleFromSection}
            onInsertInlineCitation={handleInsertInlineCitation}
            attachedCitationRoleCounts={activeSectionAttachedCitationRoleCounts}
          />
        </div>
      </div>

      {/* 하단: 내보내기 */}
      <div className="shrink-0 px-6 pb-6">
        <div className="rounded-[24px] bg-surface-container px-4 py-3">
          <DocumentExportBar document={doc} onBeforeExport={prepareDocumentForExport} />
        </div>
      </div>
    </div>
  )
}
