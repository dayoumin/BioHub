'use client'

import { Fragment, useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react'
import { ArrowLeft, Eye, Info, PenLine, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { usePlateEditor } from 'platejs/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
  type TargetJournalStylePreset,
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
import type { ProjectEntityKind } from '@/lib/types/research'
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
import DocumentPreflightPanel from './DocumentPreflightPanel'
import DocumentSectionRegenerationControls from './DocumentSectionRegenerationControls'
import DocumentRevisionHistorySheet from './DocumentRevisionHistorySheet'
import DocumentReviewRequestsSheet from './DocumentReviewRequestsSheet'
import type { DocumentReviewRequestBaselinePreview } from './DocumentReviewRequestsSheet'
import { cn } from '@/lib/utils'
import { generateFigurePatternSummary } from '@/lib/research/paper-package-assembler'
import { updateDocumentSectionWritingState } from '@/lib/research/document-writing'
import { isDocumentSectionRegenerationSectionId } from '@/lib/research/document-section-regeneration-contract'
import { useDocumentSectionRegeneration } from './useDocumentSectionRegeneration'
import { useDocumentSourceLinks } from './useDocumentSourceLinks'
import {
  createDocumentRevision,
  deleteDocumentRevision,
  listDocumentRevisions,
  loadDocumentRevision,
  restoreDocumentRevision,
  type DocumentBlueprintRevision,
  type DocumentRevisionReason,
} from '@/lib/research/document-blueprint-revisions'
import {
  canPersistDocumentReviewRequests,
  createDocumentReviewRequest,
  listDocumentReviewRequests,
  updateDocumentReviewRequestStatus,
  type DocumentReviewRequest,
  type DocumentReviewRequestStatus,
} from '@/lib/research/document-review-requests'
import { generateId } from '@/lib/utils/generate-id'
import {
  getDocumentQualityFreshness,
  type DocumentQualityFreshness,
  type DocumentQualityReport,
  type DocumentReviewFindingStatus,
} from '@/lib/research/document-quality-types'
import { applyDocumentFindingSuggestionToSection } from '@/lib/research/document-quality-suggestion-apply'
import {
  DOCUMENT_QUALITY_REPORTS_CHANGED_EVENT,
  getLatestDocumentQualityReport,
  saveDocumentQualityReport,
  updateDocumentQualityFindingStatus,
  type DocumentQualityReportsChangedDetail,
} from '@/lib/research/document-quality-storage'
import {
  createDocumentReviewJobState,
  DOCUMENT_REVIEW_JOBS_CHANGED_EVENT,
  getLatestDocumentReviewJobState,
  saveDocumentReviewJobState,
  updateDocumentReviewJobPhase,
  type DocumentReviewJobsChangedDetail,
  type DocumentReviewJobState,
} from '@/lib/research/document-review-job-storage'
import {
  buildSourceEvidenceIndex,
  buildSourceSnapshotHashes,
  type SourceEvidenceIndex,
} from '@/lib/research/document-source-evidence'
import {
  createTargetJournalProfileSnapshot,
  getDocumentTargetJournalProfileSnapshot,
  getDocumentTargetJournalProfileVersion,
} from '@/lib/research/document-journal-profile'
import {
  DOCUMENT_PREFLIGHT_RULE_ENGINE_VERSION,
  runDocumentPreflightRules,
} from '@/lib/research/document-preflight-rules'
import { runDocumentLlmReview } from '@/lib/research/document-llm-review-runner'
import { getDocumentNumericClaims } from '@/lib/research/document-claim-evidence'

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
const REVIEW_JOB_RUNNING_STALE_MS = 10 * 60 * 1000
const JOURNAL_STYLE_OPTIONS: Array<{ value: TargetJournalStylePreset; label: string }> = [
  { value: 'imrad', label: 'IMRAD' },
  { value: 'apa', label: 'APA' },
  { value: 'kci', label: 'KCI' },
  { value: 'general', label: 'General' },
  { value: 'manual', label: 'Manual' },
]

function buildSectionEditorSnapshot(section: DocumentSection): string {
  return JSON.stringify({
    content: section.content,
    generatedBy: section.generatedBy,
    plateValue: section.plateValue ?? null,
  })
}

function buildDocumentPreflightSourceSnapshot(
  document: DocumentBlueprint,
): { evidenceIndex: SourceEvidenceIndex; sourceSnapshotHashes: Record<string, string> } {
  const evidenceIndex = buildSourceEvidenceIndex(document)
  return {
    evidenceIndex,
    sourceSnapshotHashes: buildSourceSnapshotHashes(evidenceIndex),
  }
}

function isRunningReviewJobStale(job: DocumentReviewJobState, now = Date.now()): boolean {
  if (job.status !== 'running') {
    return false
  }
  const updatedAt = Date.parse(job.updatedAt)
  if (!Number.isFinite(updatedAt)) {
    return true
  }
  return now - updatedAt > REVIEW_JOB_RUNNING_STALE_MS
}

async function resolveRestoredReviewJobState(
  job: DocumentReviewJobState | null,
): Promise<DocumentReviewJobState | null> {
  if (!job || !isRunningReviewJobStale(job)) {
    return job
  }

  const discardedAt = new Date().toISOString()
  return saveDocumentReviewJobState(updateDocumentReviewJobPhase(job, job.activePhase ?? 'llm', {
    status: 'discarded',
    completedAt: discardedAt,
    message: 'Discarded because the review job was restored after its running timeout.',
  }, {
    status: 'discarded',
    activePhase: null,
    updatedAt: discardedAt,
    completedAt: discardedAt,
  }))
}

interface JournalProfilePanelProps {
  document: DocumentBlueprint
  disabled: boolean
  onUpdate: (stylePreset: TargetJournalStylePreset, targetJournal: string) => void
}

function JournalProfilePanel({
  document,
  disabled,
  onUpdate,
}: JournalProfilePanelProps): React.ReactElement {
  const profile = getDocumentTargetJournalProfileSnapshot(document)
  const defaultStylePreset: TargetJournalStylePreset = profile?.stylePreset ?? 'imrad'
  const defaultTargetJournal = profile?.targetJournal ?? ''
  const [stylePreset, setStylePreset] = useState<TargetJournalStylePreset>(defaultStylePreset)
  const [targetJournal, setTargetJournal] = useState(defaultTargetJournal)

  useEffect(() => {
    setStylePreset(defaultStylePreset)
    setTargetJournal(defaultTargetJournal)
  }, [defaultStylePreset, defaultTargetJournal, profile?.version])

  const hasChanged = stylePreset !== defaultStylePreset
    || targetJournal.trim() !== defaultTargetJournal

  return (
    <section className="rounded-[24px] bg-surface px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Journal Profile
          </p>
          <h3 className="text-sm font-semibold text-on-surface">투고/스타일 기준</h3>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full text-muted-foreground"
                aria-label="투고 기준 설명"
              >
                <Info className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-64 text-xs leading-relaxed">
              초안 작성과 preflight가 같은 저널/스타일 기준을 사용합니다.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {JOURNAL_STYLE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => setStylePreset(option.value)}
            className={cn(
              'h-8 rounded-full px-3 text-xs',
              stylePreset === option.value
                ? 'bg-surface-container-high text-on-surface'
                : 'bg-surface-container text-on-surface-variant',
            )}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        <Label htmlFor="document-target-journal" className="text-xs text-on-surface-variant">
          Target journal
        </Label>
        <Input
          id="document-target-journal"
          value={targetJournal}
          disabled={disabled}
          onChange={(event) => setTargetJournal(event.target.value)}
          placeholder="Optional"
          className="h-9 bg-surface-container"
        />
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled || !hasChanged}
        onClick={() => onUpdate(stylePreset, targetJournal)}
        className="mt-3 w-full rounded-full bg-surface-container-high"
      >
        기준 저장
      </Button>
    </section>
  )
}

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

function documentHasReassemblyTargets(document: DocumentBlueprint | null): boolean {
  if (!document) {
    return false
  }

  const metadata = document.metadata as {
    authoringPlan?: { sources?: unknown[] }
    generatedArtifacts?: unknown[]
  }

  return (
    (metadata.authoringPlan?.sources?.length ?? 0) > 0
    || (metadata.generatedArtifacts?.length ?? 0) > 0
    || document.sections.some((section) => (
      (section.sourceRefs?.length ?? 0) > 0
      || (section.sectionSupportBindings?.length ?? 0) > 0
      || (section.tables?.length ?? 0) > 0
      || (section.figures?.length ?? 0) > 0
    ))
  )
}

function collectPlateVisibleText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => collectPlateVisibleText(item)).join(' ')
  }
  if (typeof value !== 'object' || value === null) {
    return ''
  }
  const record = value as Record<string, unknown>
  if (typeof record.text === 'string') {
    return record.text
  }
  return collectPlateVisibleText(record.children)
}

function getReviewSectionText(section: DocumentSection | undefined): string {
  if (!section) return ''
  const plateText = collectPlateVisibleText(section.plateValue).replace(/\s+/g, ' ').trim()
  if (plateText) return plateText
  return section.content.replace(/\s+/g, ' ').trim()
}

function getReviewSectionExcerpt(section: DocumentSection | undefined): string {
  const text = getReviewSectionText(section)
  if (!text) return '본문이 없습니다.'
  return text.length > 100 ? `${text.slice(0, 100)}...` : text
}

function cloneDocumentSection(section: DocumentSection): DocumentSection {
  return JSON.parse(JSON.stringify(section)) as DocumentSection
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
  const [qualityReport, setQualityReport] = useState<DocumentQualityReport | null>(null)
  const [preflightJobState, setPreflightJobState] = useState<DocumentReviewJobState | null>(null)
  const [preflightInMemoryPending, setPreflightInMemoryPending] = useState(false)
  const [sourceLinksRefreshKey, setSourceLinksRefreshKey] = useState(0)
  const [revisionHistoryOpen, setRevisionHistoryOpen] = useState(false)
  const [documentRevisions, setDocumentRevisions] = useState<DocumentBlueprintRevision[]>([])
  const [reviewRequests, setReviewRequests] = useState<DocumentReviewRequest[]>([])
  const [reviewRequestBaselinePreviews, setReviewRequestBaselinePreviews] = useState<Record<string, DocumentReviewRequestBaselinePreview>>({})
  const [revisionHistoryLoading, setRevisionHistoryLoading] = useState(false)
  const [revisionActionPending, setRevisionActionPending] = useState(false)
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
  const preflightRunSeqRef = useRef(0)
  const activeReviewJobIdRef = useRef<string | null>(null)
  const citationRequestSeqRef = useRef(0)
  const pendingCitationReloadRef = useRef<Promise<void> | null>(null)
  const pendingArtifactTargetRef = useRef<string | null>(null)
  const initialCitationAttachmentHandledRef = useRef(false)
  const currentProject = useMemo(
    () => (doc ? loadResearchProject(doc.projectId) : null),
    [doc],
  )
  const isScratchProject = (currentProject?.tags ?? []).includes(SCRATCH_PROJECT_TAG)
  const preflightPending = preflightInMemoryPending || preflightJobState?.status === 'running'
  const preflightPendingLabel = preflightJobState?.activePhase === 'llm'
    ? 'LLM review running...'
    : preflightJobState?.activePhase === 'deterministic'
      ? 'Preflight running...'
      : undefined

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
  const loadedSectionRef = useRef<string | null>(null)
  const loadedSectionSnapshotRef = useRef<string | null>(null)
  const isApplyingRemoteValueRef = useRef(false)
  const remoteValueGuardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    loadedSectionRef.current = null
    loadedSectionSnapshotRef.current = null

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

  const refreshDocumentRevisions = useCallback(async (targetDocumentId: string): Promise<void> => {
    setRevisionHistoryLoading(true)
    try {
      setDocumentRevisions(await listDocumentRevisions(targetDocumentId))
    } finally {
      setRevisionHistoryLoading(false)
    }
  }, [])

  const refreshReviewRequests = useCallback((targetDocumentId: string): void => {
    setReviewRequests(listDocumentReviewRequests(targetDocumentId))
  }, [])

  const saveDocumentRevisionPoint = useCallback(async (
    reason: DocumentRevisionReason,
    label: string,
    targetDocument?: DocumentBlueprint,
    showToast = false,
    requireSuccess = false,
  ): Promise<boolean> => {
    const revisionTarget = targetDocument ?? docRef.current
    if (!revisionTarget) return false

    try {
      await createDocumentRevision(revisionTarget, { reason, label })
      if (showToast) {
        toast.success('문서 복원 지점을 저장했습니다')
      }
      if (revisionHistoryOpen) {
        await refreshDocumentRevisions(revisionTarget.id)
      }
      return true
    } catch {
      if (showToast) {
        toast.error('복원 지점을 저장하지 못했습니다')
      }
      if (requireSuccess) {
        throw new Error('복원 지점을 저장하지 못해 작업을 중단했습니다.')
      }
      return false
    }
  }, [refreshDocumentRevisions, revisionHistoryOpen])

  const handleRevisionHistoryOpenChange = useCallback((open: boolean): void => {
    setRevisionHistoryOpen(open)
    if (open) {
      void refreshDocumentRevisions(documentId)
    }
  }, [documentId, refreshDocumentRevisions])

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
      if (remoteValueGuardTimerRef.current) {
        clearTimeout(remoteValueGuardTimerRef.current)
        remoteValueGuardTimerRef.current = null
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
    setDocumentRevisions([])
    setReviewRequests([])
    setReviewRequestBaselinePreviews({})
    setQualityReport(null)
    setPreflightJobState(null)
    setPreflightInMemoryPending(false)
    activeReviewJobIdRef.current = null
    setDocumentConflict(null)
    setSaveStatus('saved')
    loadedSectionRef.current = null
    loadedSectionSnapshotRef.current = null

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
    refreshReviewRequests(documentId)
  }, [documentId, refreshReviewRequests])

  useEffect(() => {
    let cancelled = false

    void (async (): Promise<void> => {
      const currentDocument = docRef.current
      if (!currentDocument) {
        if (!cancelled) setReviewRequestBaselinePreviews({})
        return
      }

      const entries = await Promise.all(reviewRequests.map(async (request) => {
        if (!request.baselineRevisionId || !request.sectionId) {
          return [request.id, undefined] as const
        }

        const revision = await loadDocumentRevision(request.baselineRevisionId)
        const baselineSection = revision?.snapshot.sections.find((section) => section.id === request.sectionId)
        const currentSection = currentDocument.sections.find((section) => section.id === request.sectionId)

        if (!revision || !baselineSection) {
          return [request.id, {
            currentExcerpt: '',
            baselineExcerpt: '',
            changed: false,
            unavailableReason: '기준 저장 지점에서 이 섹션을 찾지 못했습니다.',
          } satisfies DocumentReviewRequestBaselinePreview] as const
        }
        if (!currentSection) {
          return [request.id, {
            currentExcerpt: '',
            baselineExcerpt: getReviewSectionExcerpt(baselineSection),
            changed: false,
            unavailableReason: '현재 문서에서 대상 섹션을 찾지 못했습니다.',
          } satisfies DocumentReviewRequestBaselinePreview] as const
        }

        return [request.id, {
          currentExcerpt: getReviewSectionExcerpt(currentSection),
          baselineExcerpt: getReviewSectionExcerpt(baselineSection),
          changed: getReviewSectionText(currentSection) !== getReviewSectionText(baselineSection),
        } satisfies DocumentReviewRequestBaselinePreview] as const
      }))

      if (cancelled) return
      setReviewRequestBaselinePreviews(Object.fromEntries(
        entries.filter((entry): entry is readonly [string, DocumentReviewRequestBaselinePreview] => entry[1] !== undefined),
      ))
    })()

    return () => {
      cancelled = true
    }
  }, [doc, reviewRequests])

  useEffect(() => {
    if (!doc?.id) {
      setQualityReport(null)
      return
    }

    let cancelled = false
    setQualityReport(null)
    getLatestDocumentQualityReport(doc.id)
      .then((report) => {
        if (!cancelled) {
          setQualityReport(report)
        }
      })
      .catch((error: unknown) => {
        console.error('[DocumentEditor] failed to load document quality report:', error)
      })

    return () => {
      cancelled = true
    }
  }, [doc?.id])

  useEffect(() => {
    if (!doc?.id) {
      setPreflightJobState(null)
      return
    }

    let cancelled = false
    setPreflightJobState(null)
    getLatestDocumentReviewJobState(doc.id)
      .then((job) => resolveRestoredReviewJobState(job))
      .then((job) => {
        if (!cancelled) {
          setPreflightJobState(job)
        }
      })
      .catch((error: unknown) => {
        console.error('[DocumentEditor] failed to load document review job:', error)
      })

    return () => {
      cancelled = true
    }
  }, [doc?.id])

  useEffect(() => {
    if (!doc?.id) {
      return
    }

    const handleQualityReportChange = (event: Event): void => {
      const detail = (event as CustomEvent<DocumentQualityReportsChangedDetail>).detail
      if (!detail || detail.documentId !== doc.id || detail.projectId !== doc.projectId) {
        return
      }

      getLatestDocumentQualityReport(doc.id)
        .then((report) => {
          setQualityReport(report)
        })
        .catch((error: unknown) => {
          console.error('[DocumentEditor] failed to reload document quality report:', error)
        })
    }

    window.addEventListener(DOCUMENT_QUALITY_REPORTS_CHANGED_EVENT, handleQualityReportChange)
    return (): void => {
      window.removeEventListener(DOCUMENT_QUALITY_REPORTS_CHANGED_EVENT, handleQualityReportChange)
    }
  }, [doc?.id, doc?.projectId])

  useEffect(() => {
    if (!doc?.id) {
      return
    }

    const handleReviewJobChange = (event: Event): void => {
      const detail = (event as CustomEvent<DocumentReviewJobsChangedDetail>).detail
      if (!detail || detail.documentId !== doc.id || detail.projectId !== doc.projectId) {
        return
      }

      getLatestDocumentReviewJobState(doc.id)
        .then((job) => resolveRestoredReviewJobState(job))
        .then((job) => {
          setPreflightJobState(job)
        })
        .catch((error: unknown) => {
          console.error('[DocumentEditor] failed to reload document review job:', error)
        })
    }

    window.addEventListener(DOCUMENT_REVIEW_JOBS_CHANGED_EVENT, handleReviewJobChange)
    return (): void => {
      window.removeEventListener(DOCUMENT_REVIEW_JOBS_CHANGED_EVENT, handleReviewJobChange)
    }
  }, [doc?.id, doc?.projectId])


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

  const handleUpdateJournalProfile = useCallback((
    stylePreset: TargetJournalStylePreset,
    targetJournal: string,
  ): void => {
    setDoc((prev) => {
      if (!prev) {
        return prev
      }
      if (prev.preset !== 'paper') {
        return prev
      }

      const normalizedTargetJournal = targetJournal.trim()
      const currentProfile = getDocumentTargetJournalProfileSnapshot(prev)
      const profile = createTargetJournalProfileSnapshot({
        stylePreset,
        label: normalizedTargetJournal || currentProfile?.label || `${stylePreset.toUpperCase()} manuscript`,
        targetJournal: normalizedTargetJournal || undefined,
        articleType: currentProfile?.articleType ?? 'research article',
        abstractWordLimit: currentProfile?.abstractWordLimit,
        mainTextWordLimit: currentProfile?.mainTextWordLimit,
        referenceStyle: currentProfile?.referenceStyle,
        requiredStatements: currentProfile?.requiredStatements,
        figureTableRequirements: currentProfile?.figureTableRequirements,
        manualRequirements: currentProfile?.manualRequirements,
      })
      const updated: DocumentBlueprint = {
        ...prev,
        metadata: {
          ...prev.metadata,
          targetJournal: normalizedTargetJournal || undefined,
          targetJournalProfile: profile,
        },
        updatedAt: new Date().toISOString(),
      }
      scheduleSave(updated)
      toast.success('투고 기준을 저장했습니다.')
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

  const interruptSectionWriting = useCallback((
    document: DocumentBlueprint,
    sectionId: string,
    options: {
      message: string
      plateValue?: unknown
    },
  ): DocumentBlueprint => {
    const interruptedAt = new Date().toISOString()
    const currentWritingState = document.writingState
    const currentJobId = currentWritingState?.jobId

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

    updatedDocument = updateDocumentSectionWritingState(updatedDocument, sectionId, 'skipped', {
      jobId: currentJobId,
      updatedAt: interruptedAt,
      message: options.message,
    })

    const hasOtherDraftingSections = document.sections.some((section) => (
      section.id !== sectionId
      && document.writingState?.sectionStates[section.id]?.status === 'drafting'
    ))

    if (!hasOtherDraftingSections && currentWritingState) {
      return {
        ...updatedDocument,
        writingState: {
          ...updatedDocument.writingState,
          status: 'completed',
          jobId: currentJobId,
          startedAt: currentWritingState.startedAt,
          updatedAt: interruptedAt,
          errorMessage: undefined,
          sectionStates: updatedDocument.writingState?.sectionStates ?? {},
        },
      }
    }

    return updatedDocument
  }, [])

  const takeSectionOwnershipForEditing = useCallback((sectionId: string, plateValue: unknown): void => {
    setDoc((prev) => {
      if (!prev) {
        return prev
      }
      const updated = interruptSectionWriting(prev, sectionId, {
        message: '사용자 편집이 시작되어 자동 초안을 중단했습니다.',
        plateValue,
      })
      scheduleImmediateSave(updated)
      return updated
    })
  }, [interruptSectionWriting, scheduleImmediateSave])

  const skipSectionWriting = useCallback((sectionId: string, message: string): void => {
    setDoc((prev) => {
      if (!prev) {
        return prev
      }
      const updated = interruptSectionWriting(prev, sectionId, { message })
      scheduleImmediateSave(updated)
      return updated
    })
  }, [interruptSectionWriting, scheduleImmediateSave])

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
      await saveDocumentRevisionPoint(
        'before-export',
        '내보내기 전 자동 저장 지점',
        currentDoc,
      )
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
      await saveDocumentRevisionPoint(
        'before-export',
        '내보내기 전 자동 저장 지점',
        updated,
      )
      const exportDoc = needsReassemble ? (reassembleCurrentDocument(updated) ?? updated) : updated
      return resolveDocumentInlineCitations(
        applyReferencesSectionContent(exportDoc, latestCitationsRef.current),
        latestCitationsRef.current,
      )
    } catch {
      await saveDocumentRevisionPoint(
        'before-export',
        '내보내기 전 자동 저장 지점',
        currentDoc,
      )
      const exportDoc = needsReassemble ? (reassembleCurrentDocument(currentDoc) ?? currentDoc) : currentDoc
      return resolveDocumentInlineCitations(
        applyReferencesSectionContent(exportDoc, latestCitationsRef.current),
        latestCitationsRef.current,
      )
    }
  }, [editor, needsReassemble, reassembleCurrentDocument, saveDocumentRevisionPoint, scheduleSave])

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

  const handleRunPreflight = useCallback(async (): Promise<void> => {
    if (preflightPending || documentConflictRef.current) {
      return
    }

    setPreflightInMemoryPending(true)
    let activeJob: DocumentReviewJobState | null = null
    try {
      await flushPendingWrites()
      if (documentConflictRef.current) {
        return
      }
      const currentDoc = needsReassemble
        ? (reassembleCurrentDocument(docRef.current ?? undefined) ?? docRef.current)
        : docRef.current
      if (!currentDoc) {
        return
      }

      const runSeq = preflightRunSeqRef.current + 1
      preflightRunSeqRef.current = runSeq
      const runDocumentUpdatedAt = currentDoc.updatedAt
      const generatedAt = new Date().toISOString()
      const reportId = generateId('dqreport')
      const jobId = generateId('dqjob')
      activeReviewJobIdRef.current = jobId
      activeJob = await saveDocumentReviewJobState(createDocumentReviewJobState({
        id: jobId,
        documentId: currentDoc.id,
        projectId: currentDoc.projectId,
        reportId,
        documentUpdatedAt: runDocumentUpdatedAt,
        generatedAt,
      }))
      setPreflightJobState(activeJob)

      const { evidenceIndex, sourceSnapshotHashes } = buildDocumentPreflightSourceSnapshot(currentDoc)
      const deterministicReport = runDocumentPreflightRules(currentDoc, {
        reportId,
        generatedAt,
        evidenceIndex,
        numericClaims: getDocumentNumericClaims(currentDoc, {
          evidenceIndex,
          includeFreeText: true,
        }),
        sourceSnapshotHashes,
        targetJournalProfileVersion: getDocumentTargetJournalProfileVersion(currentDoc),
      })
      const deterministicCompletedAt = new Date().toISOString()
      activeJob = await saveDocumentReviewJobState(updateDocumentReviewJobPhase(activeJob, 'deterministic', {
        status: 'completed',
        completedAt: deterministicCompletedAt,
      }, {
        activePhase: 'llm',
        updatedAt: deterministicCompletedAt,
      }))
      activeJob = await saveDocumentReviewJobState(updateDocumentReviewJobPhase(activeJob, 'llm', {
        status: 'running',
        startedAt: deterministicCompletedAt,
      }, {
        activePhase: 'llm',
        updatedAt: deterministicCompletedAt,
      }))
      setPreflightJobState(activeJob)

      const report = await runDocumentLlmReview(currentDoc, deterministicReport, { generatedAt })
      if (
        preflightRunSeqRef.current !== runSeq
        || docRef.current?.id !== currentDoc.id
        || docRef.current?.updatedAt !== runDocumentUpdatedAt
      ) {
        const discardedAt = new Date().toISOString()
        activeJob = await saveDocumentReviewJobState(updateDocumentReviewJobPhase(activeJob, 'llm', {
          status: 'discarded',
          completedAt: discardedAt,
          message: 'Discarded because the document changed before review completion.',
        }, {
          status: 'discarded',
          activePhase: null,
          updatedAt: discardedAt,
          completedAt: discardedAt,
        }))
        if (docRef.current?.id === currentDoc.id) {
          setPreflightJobState(activeJob)
        }
        return
      }
      const completedAt = new Date().toISOString()
      const finalJobStatus = report.status === 'partial' ? 'partial' : 'completed'
      activeJob = await saveDocumentReviewJobState(updateDocumentReviewJobPhase(activeJob, 'llm', {
        status: finalJobStatus,
        completedAt,
        message: report.status === 'partial'
          ? 'LLM review finished partially; deterministic findings were preserved.'
          : undefined,
      }, {
        status: finalJobStatus,
        activePhase: null,
        updatedAt: completedAt,
        completedAt,
      }))
      setPreflightJobState(activeJob)
      const savedReport = await saveDocumentQualityReport(report)
      setQualityReport(savedReport)
      toast.success(report.status === 'partial' ? '문서 점검이 부분 완료되었습니다.' : '문서 점검이 완료되었습니다.')
    } catch (error: unknown) {
      if (activeJob) {
        try {
          const failedAt = new Date().toISOString()
          const phase = activeJob.activePhase ?? 'llm'
          const errorMessage = error instanceof Error ? error.message : 'Document review failed.'
          const failedJob = await saveDocumentReviewJobState(updateDocumentReviewJobPhase(activeJob, phase, {
            status: 'failed',
            completedAt: failedAt,
            message: errorMessage,
          }, {
            status: 'failed',
            activePhase: null,
            updatedAt: failedAt,
            completedAt: failedAt,
            errorMessage,
          }))
          setPreflightJobState(failedJob)
        } catch (jobError: unknown) {
          console.error('[DocumentEditor] failed to save failed review job state:', jobError)
        }
      }
      console.error('[DocumentEditor] failed to run document preflight:', error)
      toast.error('문서 점검에 실패했습니다.')
    } finally {
      setPreflightInMemoryPending(false)
      activeReviewJobIdRef.current = null
    }
  }, [flushPendingWrites, needsReassemble, preflightPending, reassembleCurrentDocument])

  const getLocalEditRevision = useCallback((): number => (
    latestScheduledSaveRevisionRef.current
  ), [])

  const hasPendingSaveOrConflict = useCallback((): boolean => (
    documentConflictRef.current !== null
    || pendingSaveRevisionRef.current !== null
    || hasLocalChangesRef.current
  ), [])

  const persistLatestDocumentBeforeSectionRegeneration = useCallback(async (): Promise<boolean> => {
    const flushed = flushSerialize()
    const latestDocument = flushed ?? docRef.current
    if (!latestDocument) {
      return false
    }
    await saveDocumentRevisionPoint(
      'before-section-regeneration',
      '섹션 재생성 전 자동 저장 지점',
      latestDocument,
      false,
      true,
    )

    if (documentConflictRef.current !== null) {
      return false
    }

    if (pendingSaveRevisionRef.current !== null || flushed) {
      scheduleImmediateSave(latestDocument)
    }
    await saveQueueRef.current.catch(() => undefined)

    return documentConflictRef.current === null
  }, [flushSerialize, saveDocumentRevisionPoint, scheduleImmediateSave])

  const getCurrentDocumentIdForSectionRegeneration = useCallback((): string | null => (
    docRef.current?.id ?? null
  ), [])

  const applyRegeneratedDocument = useCallback((updated: DocumentBlueprint): void => {
    loadedSectionRef.current = null
    applyLoadedDocument(updated)
    setNeedsReassemble(false)
  }, [applyLoadedDocument])

  const {
    sectionRegenerationMode,
    sectionRegenerationModeRef,
    refreshActiveSectionSources,
    regenerateActiveSection,
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
    if (isApplyingRemoteValueRef.current) return
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
        updateSection(targetSection, { content: markdown })
      } catch {
        // serialize 실패 시 무시
      }
    }, 500)
  }, [activeSectionId, editor, sectionRegenerationModeRef, shouldTakeOwnershipForWritingSection, takeSectionOwnershipForEditing, updateSection])

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
  useEffect(() => {
    if (!activeSectionId || !doc) {
      loadedSectionRef.current = null
      loadedSectionSnapshotRef.current = null
      return
    }
    const section = doc.sections.find(s => s.id === activeSectionId)
    if (!section) return
    const nextSnapshot = buildSectionEditorSnapshot(section)
    const isSameSection = loadedSectionRef.current === activeSectionId

    if (isSameSection && loadedSectionSnapshotRef.current === nextSnapshot) return
    if (
      isSameSection
      && (
        hasLocalChangesRef.current
        || pendingSaveRevisionRef.current !== null
        || pendingSerializeSectionRef.current === activeSectionId
      )
    ) {
      return
    }

    if (!isSameSection) {
      // 이전 섹션의 serialize 타이머가 있으면 즉시 flush (내용 오염 방지)
      flushSerialize()
    }

    isApplyingRemoteValueRef.current = true
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
    } finally {
      loadedSectionRef.current = activeSectionId
      loadedSectionSnapshotRef.current = nextSnapshot
      if (remoteValueGuardTimerRef.current) {
        clearTimeout(remoteValueGuardTimerRef.current)
      }
      remoteValueGuardTimerRef.current = setTimeout(() => {
        isApplyingRemoteValueRef.current = false
        remoteValueGuardTimerRef.current = null
      }, 0)
    }
  }, [activeSectionId, doc, editor, flushSerialize])

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
    const revisionTarget = syncedDoc ?? docRef.current
    if (revisionTarget) {
      try {
        await saveDocumentRevisionPoint(
          'before-reassemble',
          '재조립 전 자동 저장 지점',
          revisionTarget,
          false,
          true,
        )
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : '재조립 전 복원 지점을 저장하지 못했습니다')
        return
      }
    }
    reassembleCurrentDocument(syncedDoc ?? undefined)
  }, [flushSerialize, reassembleCurrentDocument, saveDocumentRevisionPoint])

  const handleCreateManualRevision = useCallback((): void => {
    setRevisionActionPending(true)
    void saveDocumentRevisionPoint(
      'manual',
      '사용자 저장 지점',
      flushSerialize() ?? docRef.current ?? undefined,
      true,
    ).finally(() => setRevisionActionPending(false))
  }, [flushSerialize, saveDocumentRevisionPoint])

  const handleCreateReviewRequest = useCallback(async (input: {
    sectionId: string | null
    note: string
  }): Promise<void> => {
    const latestDocument = flushSerialize() ?? docRef.current
    if (!latestDocument) {
      toast.error('현재 문서를 찾을 수 없습니다')
      throw new Error('Current document is unavailable')
    }
    if (documentConflictRef.current !== null) {
      toast.warning('문서 충돌을 먼저 해결한 뒤 수정 요청을 추가하세요')
      throw new Error('Document conflict must be resolved before adding a review request')
    }
    if (!canPersistDocumentReviewRequests()) {
      toast.error('로컬 저장이 꺼져 있어 수정 요청을 저장할 수 없습니다')
      throw new Error('Local review request storage is disabled')
    }

    try {
      const targetSection = input.sectionId
        ? latestDocument.sections.find((section) => section.id === input.sectionId) ?? null
        : null
      const baselineRevision = await createDocumentRevision(latestDocument, {
        reason: 'review-request-baseline',
        label: '수정 요청 접수 전 저장 지점',
      })
      const request = createDocumentReviewRequest({
        documentId: latestDocument.id,
        projectId: latestDocument.projectId,
        sectionId: input.sectionId,
        sectionTitle: targetSection?.title ?? null,
        note: input.note,
        baselineRevisionId: baselineRevision.id,
      })
      if (!request) {
        await deleteDocumentRevision(baselineRevision.id)
        throw new Error('Failed to persist review request')
      }
      refreshReviewRequests(latestDocument.id)
      if (revisionHistoryOpen) {
        await refreshDocumentRevisions(latestDocument.id)
      }
      toast.success('수정 요청을 추가하고 기준 저장 지점을 남겼습니다')
    } catch (error: unknown) {
      toast.error('수정 요청을 추가하지 못했습니다')
      throw error
    }
  }, [
    flushSerialize,
    refreshDocumentRevisions,
    refreshReviewRequests,
    revisionHistoryOpen,
  ])

  const handleUpdateReviewRequestStatus = useCallback((
    requestId: string,
    status: DocumentReviewRequestStatus,
  ): void => {
    const updated = updateDocumentReviewRequestStatus(requestId, status)
    if (!updated) {
      toast.error('수정 요청 상태를 바꾸지 못했습니다')
      return
    }
    refreshReviewRequests(updated.documentId)
  }, [refreshReviewRequests])

  const handleRestoreReviewRequestBaselineSection = useCallback((requestId: string): void => {
    if (documentConflictRef.current !== null) {
      toast.warning('문서 충돌을 먼저 해결한 뒤 섹션을 복원하세요')
      return
    }

    void (async (): Promise<void> => {
      const latestDocument = flushSerialize() ?? docRef.current
      if (!latestDocument) {
        toast.error('현재 문서를 찾을 수 없습니다')
        return
      }

      const request = reviewRequests.find((item) => item.id === requestId)
      if (!request?.baselineRevisionId || !request.sectionId) {
        toast.error('복원할 섹션 기준 지점을 찾지 못했습니다')
        return
      }

      const revision = await loadDocumentRevision(request.baselineRevisionId)
      const baselineSection = revision?.snapshot.sections.find((section) => section.id === request.sectionId)
      if (!baselineSection) {
        toast.error('기준 저장 지점에서 대상 섹션을 찾지 못했습니다')
        return
      }
      if (!latestDocument.sections.some((section) => section.id === request.sectionId)) {
        toast.error('현재 문서에서 대상 섹션을 찾지 못했습니다')
        return
      }

      await saveDocumentRevisionPoint(
        'before-restore',
        `${request.sectionTitle ?? '섹션'} 부분 복원 전 저장 지점`,
        latestDocument,
        false,
        true,
      )

      const restoredSection = cloneDocumentSection(baselineSection)
      const updatedDocument: DocumentBlueprint = {
        ...latestDocument,
        sections: latestDocument.sections.map((section) => (
          section.id === request.sectionId ? restoredSection : section
        )),
        updatedAt: new Date().toISOString(),
      }

      setDoc(updatedDocument)
      scheduleImmediateSave(updatedDocument)
      await saveQueueRef.current.catch(() => undefined)
      if (documentConflictRef.current !== null) {
        const conflictDocument = documentConflictRef.current
        setDoc(conflictDocument)
        docRef.current = conflictDocument
        pendingDocRef.current = null
        pendingSaveRevisionRef.current = null
        hasLocalChangesRef.current = false
        lastSavedUpdatedAtRef.current = conflictDocument.updatedAt
        loadedSectionRef.current = null
        toast.warning('다른 저장과 충돌했습니다. 최신 버전을 확인한 뒤 다시 복원하세요')
        return
      }

      loadedSectionRef.current = null
      setActiveSectionId(request.sectionId)
      if (revisionHistoryOpen) {
        await refreshDocumentRevisions(updatedDocument.id)
      }
      toast.success('대상 섹션을 기준 저장 지점으로 복원했습니다')
    })().catch(() => {
      toast.error('대상 섹션을 복원하지 못했습니다')
    })
  }, [
    flushSerialize,
    refreshDocumentRevisions,
    reviewRequests,
    revisionHistoryOpen,
    saveDocumentRevisionPoint,
    scheduleImmediateSave,
  ])

  const handleRestoreRevision = useCallback((revisionId: string): void => {
    if (revisionActionPending) return
    if (documentConflictRef.current !== null) {
      toast.warning('문서 충돌을 먼저 해결한 뒤 복원하세요')
      return
    }

    setRevisionActionPending(true)
    void (async (): Promise<void> => {
      await flushPendingWrites()
      if (documentConflictRef.current !== null) {
        toast.warning('문서 충돌을 먼저 해결한 뒤 복원하세요')
        return
      }

      const latestDocument = docRef.current
      if (!latestDocument) {
        toast.error('현재 문서를 찾을 수 없습니다')
        return
      }

      await saveDocumentRevisionPoint(
        'before-restore',
        '복원 전 자동 저장 지점',
        latestDocument,
        false,
        true,
      )
      const restored = await restoreDocumentRevision(revisionId, {
        expectedUpdatedAt: lastSavedUpdatedAtRef.current ?? undefined,
      })
      if (!restored) {
        toast.error('복원할 문서 저장 지점을 찾지 못했습니다')
        return
      }

      applyLoadedDocument(restored)
      await refreshDocumentRevisions(restored.id)
      setRevisionHistoryOpen(false)
      toast.success('문서를 선택한 복원 기록으로 되돌렸습니다')
    })().catch((error: unknown) => {
      if (isDocumentConflictError(error)) {
        markDocumentConflict(error.latestDocument)
        toast.warning('다른 저장과 충돌했습니다. 최신 버전을 확인한 뒤 다시 복원하세요')
        return
      }
      toast.error('문서를 복원하지 못했습니다')
    }).finally(() => setRevisionActionPending(false))
  }, [
    applyLoadedDocument,
    flushPendingWrites,
    isDocumentConflictError,
    markDocumentConflict,
    refreshDocumentRevisions,
    revisionActionPending,
    saveDocumentRevisionPoint,
  ])

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
  const preflightFreshness = useMemo<DocumentQualityFreshness>(() => {
    if (!doc || !qualityReport || qualityReport.documentId !== doc.id) {
      return 'missing'
    }

    if (needsReassemble) {
      return 'stale'
    }

    const { sourceSnapshotHashes } = buildDocumentPreflightSourceSnapshot(doc)
    return getDocumentQualityFreshness(doc, qualityReport, {
      ruleEngineVersion: DOCUMENT_PREFLIGHT_RULE_ENGINE_VERSION,
      sourceSnapshotHashes,
      targetJournalProfileVersion: getDocumentTargetJournalProfileVersion(doc),
    })
  }, [doc, needsReassemble, qualityReport])
  const handleSelectPreflightSection = useCallback((sectionId: string): void => {
    if (!doc?.sections.some((section) => section.id === sectionId)) {
      return
    }
    setActiveSectionId(sectionId)
  }, [doc?.sections])
  const resolvePreflightEvidenceSourceHref = useCallback((sourceKind: string, sourceId: string): string | undefined => {
    const trimmedSourceId = sourceId.trim()
    const trimmedSourceKind = sourceKind.trim()
    if (!trimmedSourceId) {
      return undefined
    }

    if (trimmedSourceKind === 'analysis') {
      return buildAnalysisHistoryUrl(trimmedSourceId)
    }

    if (trimmedSourceKind === 'figure') {
      return buildGraphStudioProjectUrl(trimmedSourceId)
    }

    const supportedEntityKinds = new Set<ProjectEntityKind>([
      'analysis',
      'figure',
      'draft',
      'bio-tool-result',
      'blast-result',
      'seq-stats-result',
      'similarity-result',
      'phylogeny-result',
      'bold-result',
      'translation-result',
      'protein-result',
    ])

    let entityKind = supportedEntityKinds.has(trimmedSourceKind as ProjectEntityKind)
      ? trimmedSourceKind as ProjectEntityKind
      : undefined

    if (trimmedSourceKind === 'supplementary') {
      const entityRef = doc
        ? listProjectEntityRefs(doc.projectId).find((ref) => ref.entityId === trimmedSourceId)
        : undefined
      if (entityRef && supportedEntityKinds.has(entityRef.entityKind)) {
        entityKind = entityRef.entityKind
      } else {
        const bioToolEntry = loadBioToolHistory().find((entry) => entry.id === trimmedSourceId)
        if (bioToolEntry) {
          entityKind = 'bio-tool-result'
        } else {
          const geneticsEntry = [
            ...loadGeneticsHistory('protein'),
            ...loadGeneticsHistory('seq-stats'),
            ...loadGeneticsHistory('similarity'),
            ...loadGeneticsHistory('phylogeny'),
            ...loadGeneticsHistory('bold'),
            ...loadGeneticsHistory('translation'),
            ...loadAnalysisHistory(),
          ].find((entry) => entry.id === trimmedSourceId)

          if (geneticsEntry && 'type' in geneticsEntry) {
            switch (geneticsEntry.type) {
              case 'seq-stats':
                entityKind = 'seq-stats-result'
                break
              case 'similarity':
                entityKind = 'similarity-result'
                break
              case 'phylogeny':
                entityKind = 'phylogeny-result'
                break
              case 'bold':
                entityKind = 'bold-result'
                break
              case 'translation':
                entityKind = 'translation-result'
                break
              case 'protein':
                entityKind = 'protein-result'
                break
              default:
                entityKind = 'blast-result'
                break
            }
          }
        }
      }
    }

    if (!entityKind) {
      return undefined
    }

    const bioToolEntry = loadBioToolHistory().find((entry) => entry.id === trimmedSourceId)
    return buildProjectEntityNavigationUrl(entityKind, trimmedSourceId, {
      bioToolId: bioToolEntry?.toolId,
    })
  }, [doc])
  const canOpenPreflightEvidenceSource = useCallback((sourceKind: string, sourceId: string): boolean => (
    Boolean(resolvePreflightEvidenceSourceHref(sourceKind, sourceId))
  ), [resolvePreflightEvidenceSourceHref])
  const handleOpenPreflightEvidenceSource = useCallback((sourceKind: string, sourceId: string): void => {
    const href = resolvePreflightEvidenceSourceHref(sourceKind, sourceId)
    if (!href) {
      toast.info('이 근거는 바로 열 수 있는 원본 경로가 없습니다.')
      return
    }

    router.push(href)
  }, [resolvePreflightEvidenceSourceHref, router])
  const handleUpdatePreflightFindingStatus = useCallback(async (
    findingId: string,
    status: DocumentReviewFindingStatus,
  ): Promise<void> => {
    if (!qualityReport || preflightPending || documentConflictRef.current || preflightFreshness !== 'fresh') {
      return
    }

    try {
      const savedReport = await updateDocumentQualityFindingStatus(qualityReport.id, findingId, status, {
        ignoredReason: status === 'ignored' ? '사용자가 이번 점검에서 예외로 표시했습니다.' : undefined,
      })
      setQualityReport(savedReport)
    } catch (error: unknown) {
      console.error('[DocumentEditor] failed to update document preflight finding:', error)
      toast.error('점검 항목 상태를 저장하지 못했습니다.')
    }
  }, [preflightFreshness, preflightPending, qualityReport])
  const handleApplyPreflightSuggestion = useCallback((findingId: string): void => {
    if (!doc || !qualityReport || preflightPending || documentConflictRef.current || preflightFreshness !== 'fresh') {
      return
    }

    const finding = qualityReport.findings.find((item) => item.id === findingId)
    if (!finding || !finding.sectionId) {
      toast.info('적용할 섹션을 찾을 수 없습니다.')
      return
    }

    if (finding.suggestion?.requiresUserConfirmation) {
      const confirmed = window.confirm('이 제안을 현재 문서에 적용할까요? 적용 후 기존 점검 결과는 오래된 결과가 됩니다.')
      if (!confirmed) {
        return
      }
    }

    setDoc((prev) => {
      if (!prev) {
        return prev
      }

      const section = prev.sections.find((item) => item.id === finding.sectionId)
      const result = applyDocumentFindingSuggestionToSection(section, finding)
      if (!result.ok) {
        toast.error('제안을 적용할 수 없습니다. 문서를 다시 점검해 주세요.')
        return prev
      }

      const updated: DocumentBlueprint = {
        ...prev,
        sections: prev.sections.map((item) => (
          item.id === result.section.id ? result.section : item
        )),
        updatedAt: new Date().toISOString(),
      }

      scheduleSave(updated)
      setNeedsReassemble(false)
      if (activeSectionId === result.section.id) {
        try {
          const nodes = editor.api.markdown.deserialize(result.content)
          isApplyingRemoteValueRef.current = true
          editor.tf.setValue(nodes)
          loadedSectionRef.current = result.section.id
          loadedSectionSnapshotRef.current = buildSectionEditorSnapshot(result.section)
          if (remoteValueGuardTimerRef.current) {
            clearTimeout(remoteValueGuardTimerRef.current)
          }
          remoteValueGuardTimerRef.current = setTimeout(() => {
            isApplyingRemoteValueRef.current = false
            remoteValueGuardTimerRef.current = null
          }, 0)
        } catch {
          loadedSectionRef.current = null
          loadedSectionSnapshotRef.current = null
        }
      }
      toast.success('제안을 적용했습니다. 문서를 다시 점검해 주세요.')
      return updated
    })
  }, [activeSectionId, doc, editor, preflightFreshness, preflightPending, qualityReport, scheduleSave])
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
  const writingSectionSummary = useMemo(() => {
    const currentSectionIds = new Set((doc?.sections ?? []).map((section) => section.id))
    const states = Object.entries(documentWritingState?.sectionStates ?? {})
      .filter(([sectionId]) => currentSectionIds.has(sectionId))
      .map(([, state]) => state)
    const trackedStates = states.filter((state) => state.status !== 'idle')

    return {
      total: trackedStates.length,
      patched: trackedStates.filter((state) => state.status === 'patched').length,
      skipped: trackedStates.filter((state) => state.status === 'skipped').length,
      failed: trackedStates.filter((state) => state.status === 'failed').length,
    }
  }, [doc?.sections, documentWritingState?.sectionStates])
  const writingStatusLabel = useMemo((): string | null => {
    switch (documentWritingState?.status) {
      case 'collecting':
        return '자료 수집 중'
      case 'drafting':
        return '초안 작성 중'
      case 'patching':
        return '문서 반영 중'
      case 'completed':
        if (writingSectionSummary.failed > 0 && writingSectionSummary.total > 0) {
          return `\uC77C\uBD80 \uC2E4\uD328 (${writingSectionSummary.patched}/${writingSectionSummary.total} \uBC18\uC601)`
        }
        if (writingSectionSummary.skipped > 0 && writingSectionSummary.patched > 0 && writingSectionSummary.total > 0) {
          return `\uC77C\uBD80 \uBC18\uC601 (${writingSectionSummary.patched}/${writingSectionSummary.total})`
        }
        if (writingSectionSummary.skipped > 0 && writingSectionSummary.total > 0) {
          return `\uC77C\uBD80 \uBCF4\uC874 (${writingSectionSummary.skipped}/${writingSectionSummary.total})`
        }
        return '작성 완료'
      case 'failed':
        if (writingSectionSummary.patched > 0 && writingSectionSummary.total > 0) {
          return `\uC77C\uBD80 \uC2E4\uD328 (${writingSectionSummary.patched}/${writingSectionSummary.total} \uBC18\uC601)`
        }
        return '작성 실패'
      default:
        return null
    }
  }, [documentWritingState?.status, writingSectionSummary.failed, writingSectionSummary.patched, writingSectionSummary.skipped, writingSectionSummary.total])
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
  const activeSectionSourceLinks = useDocumentSourceLinks({
    projectId: doc?.projectId ?? null,
    activeSection,
    analysisHistory,
    needsReassemble,
    refreshKey: sourceLinksRefreshKey,
  })
  const activeSectionReviewSourceCount = activeSectionSourceLinks.filter((link) => link.readiness.status !== 'ready').length
  const canRegenerateActiveSection = activeSection
    ? isDocumentSectionRegenerationSectionId(activeSection.id)
    : false
  const isActiveSectionDrafting = activeSectionWritingState?.status === 'drafting'
  const hasActiveDocumentWritingJob = ['collecting', 'drafting', 'patching'].includes(documentWritingState?.status ?? 'idle')
  const isSectionRegenerationPending = sectionRegenerationMode !== null
  const canReassembleDocument = needsReassemble || documentHasReassemblyTargets(doc)
  const isSectionRegenerationDisabled = (
    isActiveSectionDrafting
    || isSectionRegenerationPending
    || documentConflict !== null
    || hasActiveDocumentWritingJob
  )

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
          <DocumentReviewRequestsSheet
            sections={doc.sections}
            activeSectionId={activeSectionId}
            requests={reviewRequests}
            baselinePreviews={reviewRequestBaselinePreviews}
            disabled={documentConflict !== null}
            onCreateRequest={handleCreateReviewRequest}
            onUpdateStatus={handleUpdateReviewRequestStatus}
            onRestoreBaselineSection={handleRestoreReviewRequestBaselineSection}
          />
          {canReassembleDocument && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReassemble}
              className="gap-1 rounded-full bg-surface-container-high px-3"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {needsReassemble ? '재조립 필요' : '재조립'}
            </Button>
          )}
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
            sectionStates={documentWritingState?.sectionStates}
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
                    Section {doc.sections.findIndex((section) => section.id === activeSection.id) + 1} / {doc.sections.length}
                  </p>
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
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      연결된 원본
                    </span>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" aria-label="섹션 원본 바로가기" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                  {activeSectionSourceLinks.map((link) => (
                    <Fragment key={link.key}>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8 gap-1 rounded-full bg-surface-container px-3 text-xs"
                        onClick={() => router.push(link.href)}
                      >
                        <span>{link.kindLabel}</span>
                        <span className="max-w-40 truncate">{link.label}</span>
                      </Button>
                      <Badge
                        variant="secondary"
                        className="rounded-full bg-surface-container-high px-2.5 py-1 text-[10px] font-medium text-on-surface-variant"
                      >
                        {link.readiness.label}
                      </Badge>
                    </Fragment>
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
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      섹션 작성 근거
                    </span>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" aria-label="섹션 작성 근거" />
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

              {sectionRegenerationMode !== null ? (
                <div className="min-h-[400px] rounded-[24px] bg-surface px-6 py-5 text-sm text-muted-foreground">
                  섹션 작업이 진행 중입니다. 수동 편집 충돌을 막기 위해 편집기를 잠시 비활성화했습니다.
                </div>
              ) : previewMode ? (
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
          <div className="space-y-3">
            <DocumentPreflightPanel
              report={qualityReport}
              freshness={preflightFreshness}
              pending={preflightPending}
              pendingLabel={preflightPendingLabel}
              disabled={Boolean(documentConflict)}
              actionsDisabled={Boolean(documentConflict)}
              onRun={handleRunPreflight}
              onSelectSection={handleSelectPreflightSection}
              canOpenEvidenceSource={canOpenPreflightEvidenceSource}
              onOpenEvidenceSource={handleOpenPreflightEvidenceSource}
              onUpdateFindingStatus={handleUpdatePreflightFindingStatus}
              onApplySuggestion={handleApplyPreflightSuggestion}
            />
            {doc.preset === 'paper' ? (
              <details className="rounded-[24px] bg-surface-container" open>
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-on-surface">
                  투고 기준
                </summary>
                <div className="px-0 pb-0">
                  <JournalProfilePanel
                    document={doc}
                    disabled={Boolean(documentConflict)}
                    onUpdate={handleUpdateJournalProfile}
                  />
                </div>
              </details>
            ) : null}
            <details className="rounded-[24px] bg-surface-container" open>
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-on-surface">
                재료
              </summary>
              <div className="px-4 pb-4">
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
            </details>
          </div>
        </div>
      </div>

      {/* 하단: 내보내기 */}
      <div className="shrink-0 px-6 pb-6">
        <div className="rounded-[24px] bg-surface-container px-4 py-3">
          <DocumentExportBar
            document={doc}
            onBeforeExport={prepareDocumentForExport}
            qualityReport={qualityReport}
            preflightFreshness={preflightFreshness}
            preflightPending={preflightPending}
            preflightPendingLabel={preflightPendingLabel}
            onRunPreflight={handleRunPreflight}
          />
        </div>
      </div>
    </div>
  )
}
