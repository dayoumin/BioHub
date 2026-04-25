'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText, Loader2, Plus, ArrowRight, Clock,
  BookOpen, PenTool, Package, HardDriveDownload, Search, Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { useHistoryStore } from '@/lib/stores/history-store'
import { useResearchProjectStore, selectActiveProject } from '@/lib/stores/research-project-store'
import { useModeStore } from '@/lib/stores/mode-store'
import {
  loadEntityHistories,
  resolveEntities,
  listProjectEntityRefs,
  type ResolvedEntity,
} from '@/lib/research'
import {
  DOCUMENT_BLUEPRINTS_CHANGED_EVENT,
  loadDocumentBlueprints,
} from '@/lib/research/document-blueprint-storage'
import {
  listPackages,
  PAPER_PACKAGES_CHANGED_EVENT,
  type PaperPackagesChangedDetail,
} from '@/lib/research/paper-package-storage'
import { PRESET_REGISTRY } from '@/lib/research/document-preset-registry'
import type { DocumentBlueprint } from '@/lib/research/document-blueprint-types'
import type { PaperPackage } from '@/lib/research/paper-package-types'
import {
  canCreateDocumentWritingSessionForEntityKind,
  createDocumentWritingSession,
  startWritingSession,
} from '@/lib/research/document-writing-session'
import { BIO_HISTORY_CHANGE_EVENT } from '@/lib/bio-tools/bio-tool-history'
import { HISTORY_CHANGE_EVENT as GENETICS_HISTORY_CHANGE_EVENT } from '@/lib/genetics/analysis-history'
import { RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT } from '@/lib/research/project-storage'
import DocumentAssemblyDialog from './DocumentAssemblyDialog'
import { formatTimeAgo } from '@/lib/utils/format-time'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/common/EmptyState'
import { getTabEntry } from '@/lib/research/entity-tab-registry'
import { toast } from 'sonner'
import StartWritingButton from './StartWritingButton'
import WritingEntrySurface from './WritingEntrySurface'

const SCRATCH_PROJECT_TAG = 'system:papers-scratch'

// ── 프리셋 라벨 매핑 ──

const PRESET_LABELS: Record<string, string> = Object.fromEntries(
  PRESET_REGISTRY.map(p => [p.id, p.label.ko]),
)

// ── 문서 카드 ──

interface DocumentCardProps {
  doc: DocumentBlueprint
  onClick: () => void
}

function DocumentCard({ doc, onClick }: DocumentCardProps): React.ReactElement {
  const sectionCount = doc.sections.filter(s => s.content).length
  const totalSections = doc.sections.length

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-[24px] bg-surface-container-lowest px-4 py-4 text-left',
        'transition-colors duration-200 hover:bg-surface active:scale-[0.99]',
      )}
    >
      <div className="shrink-0 rounded-2xl bg-surface-container-high px-3 py-3 text-on-surface">
        <BookOpen className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm truncate">{doc.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-[10px]">
            {PRESET_LABELS[doc.preset] ?? doc.preset}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {sectionCount}/{totalSections} 섹션 작성
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        <Clock className="w-3 h-3" />
        {formatTimeAgo(new Date(doc.updatedAt))}
      </div>
    </button>
  )
}

// ── 히스토리 카드 (기존 보존) ──

interface DraftHistoryCardProps {
  name: string
  method: string
  timestamp: Date
  onWrite: () => void
  disabled?: boolean
}

function DraftHistoryCard({
  name,
  method,
  timestamp,
  onWrite,
  disabled = false,
}: DraftHistoryCardProps): React.ReactElement {
  return (
    <div
      className={cn(
        'flex w-full items-start gap-3 rounded-[24px] bg-surface-container-lowest px-4 py-4 text-left',
        'transition-colors duration-200',
        disabled ? 'opacity-60' : 'hover:bg-surface',
      )}
    >
      <div className="shrink-0 rounded-2xl bg-surface-container-high px-3 py-3 text-on-surface">
        <FileText className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm truncate">{method}</p>
        <p className="text-xs text-muted-foreground truncate">{name}</p>
        <div className="mt-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onWrite}
            disabled={disabled}
            className="h-8 gap-2"
          >
            {disabled ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenTool className="h-3.5 w-3.5" />}
            문서 초안 만들기
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        <Clock className="w-3 h-3" />
        {formatTimeAgo(timestamp)}
      </div>
    </div>
  )
}

interface PackageCardProps {
  pkg: PaperPackage
  onClick: () => void
}

function PackageCard({ pkg, onClick }: PackageCardProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-[24px] bg-surface-container-lowest px-4 py-4 text-left',
        'transition-colors duration-200 hover:bg-surface active:scale-[0.99]',
      )}
    >
      <div className="shrink-0 rounded-2xl bg-surface-container-high px-3 py-3 text-on-surface">
        <Package className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm truncate">{pkg.overview.title || '제목 없는 패키지'}</p>
        <p className="text-xs text-muted-foreground truncate">
          AI 입력용 · v{pkg.version} · {pkg.items.filter(item => item.included).length}개 항목 포함
        </p>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        <Clock className="w-3 h-3" />
        {formatTimeAgo(new Date(pkg.updatedAt))}
      </div>
    </button>
  )
}

interface WritingSourceCardProps {
  entity: ResolvedEntity
  onClick: () => void
  disabled?: boolean
}

function WritingSourceCard({ entity, onClick, disabled = false }: WritingSourceCardProps): React.ReactElement {
  const tabEntry = getTabEntry(entity.ref.entityKind)

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-start gap-3 rounded-[24px] bg-surface-container-lowest px-4 py-4 text-left',
        'transition-colors duration-200 hover:bg-surface active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
      )}
    >
      <div className="shrink-0 rounded-2xl bg-surface-container-high px-3 py-3 text-on-surface">
        <span className="text-sm">{tabEntry?.icon ?? '📎'}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm truncate">{entity.summary.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {entity.summary.subtitle ?? tabEntry?.label ?? entity.ref.entityKind}
        </p>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        <Clock className="w-3 h-3" />
        {entity.summary.date}
      </div>
    </button>
  )
}

// ── 메인 ──

interface PapersHubProps {
  onOpenDocument: (id: string) => void
  onOpenPackage?: (id: string, projectId?: string) => void
  onOpenLiterature?: (projectId?: string) => void
}

interface SecondaryToolCardProps {
  icon: React.ElementType
  title: string
  description: string
  actionLabel: string
  onAction: () => void
  disabled?: boolean
}

function SecondaryToolCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  disabled = false,
}: SecondaryToolCardProps): React.ReactElement {
  return (
    <div className="rounded-3xl bg-surface-container-lowest p-5">
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-surface-container-high px-3 py-3 text-on-surface">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-on-surface">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-on-surface-variant">{description}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={onAction}
          disabled={disabled}
          className="w-full justify-between rounded-full bg-surface-container"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default function PapersHub({
  onOpenDocument,
  onOpenPackage,
  onOpenLiterature,
}: PapersHubProps): React.ReactElement {
  const router = useRouter()
  const { analysisHistory } = useHistoryStore()
  const setShowHub = useModeStore(s => s.setShowHub)
  const activeProject = useResearchProjectStore(selectActiveProject)
  const projects = useResearchProjectStore(s => s.projects)
  const createProject = useResearchProjectStore(s => s.createProject)
  const setActiveProject = useResearchProjectStore(s => s.setActiveProject)
  const [documents, setDocuments] = useState<DocumentBlueprint[]>([])
  const [packages, setPackages] = useState<PaperPackage[]>([])
  const [assemblyOpen, setAssemblyOpen] = useState(false)
  const [writingSources, setWritingSources] = useState<ResolvedEntity[]>([])
  const [creatingWritingEntityId, setCreatingWritingEntityId] = useState<string | null>(null)
  const [creatingHistoryId, setCreatingHistoryId] = useState<string | null>(null)
  const [isCreatingBlankDocument, setIsCreatingBlankDocument] = useState(false)

  useEffect(() => {
    useHistoryStore.getState().loadHistoryFromDB().catch((error: unknown) => {
      console.error('[PapersHub] failed to load analysis history:', error)
    })
  }, [])

  const reloadWritingSources = useCallback(async (projectId: string): Promise<void> => {
    try {
      const refs = listProjectEntityRefs(projectId).filter((ref) => (
        ref.entityKind !== 'analysis'
        && ref.entityKind !== 'figure'
        && canCreateDocumentWritingSessionForEntityKind(ref.entityKind)
      ))

      if (refs.length === 0) {
        setWritingSources([])
        return
      }

      const resolved = resolveEntities(refs, await loadEntityHistories(refs))
        .filter((entity) => entity.loaded)
        .sort((left, right) => right.summary.timestamp - left.summary.timestamp)
        .slice(0, 4)

      setWritingSources(resolved)
    } catch (error) {
      console.error('[PapersHub] failed to load writing sources:', error)
      setWritingSources([])
    }
  }, [])

  // 문서 목록 로드
  useEffect(() => {
    if (!activeProject) {
      setDocuments([])
      setPackages([])
      setWritingSources([])
      return
    }

    const reloadMaterials = (): void => {
      loadDocumentBlueprints(activeProject.id).then(setDocuments).catch(() => {
        setDocuments([])
      })
      setPackages(listPackages(activeProject.id).sort((left, right) => (
        right.updatedAt.localeCompare(left.updatedAt)
      )))
    }

    reloadMaterials()

    const handlePackageChange = (event: Event): void => {
      if (event instanceof CustomEvent) {
        const detail = event.detail as PaperPackagesChangedDetail | undefined
        if (detail && !detail.projectIds.includes(activeProject.id)) {
          return
        }
      }
      reloadMaterials()
    }

    window.addEventListener(PAPER_PACKAGES_CHANGED_EVENT, handlePackageChange)

    return (): void => {
      window.removeEventListener(PAPER_PACKAGES_CHANGED_EVENT, handlePackageChange)
    }
  }, [activeProject])

  useEffect(() => {
    if (!activeProject) {
      setWritingSources([])
      return
    }

    let cancelled = false

    const loadWritingSources = async (): Promise<void> => {
      await reloadWritingSources(activeProject.id)
      if (cancelled) {
        return
      }
    }

    void loadWritingSources()

    return () => {
      cancelled = true
    }
  }, [activeProject, reloadWritingSources])

  useEffect(() => {
    if (!activeProject) {
      return
    }

    const reloadCurrentProject = (): void => {
      void reloadWritingSources(activeProject.id)
    }

    const handleDocumentChange = (event: Event): void => {
      if (
        event instanceof CustomEvent
        && typeof event.detail === 'object'
        && event.detail !== null
        && 'projectId' in event.detail
        && event.detail.projectId !== activeProject.id
      ) {
        return
      }
      reloadCurrentProject()
    }

    const handleProjectRefsChange = (event: Event): void => {
      if (
        event instanceof CustomEvent
        && typeof event.detail === 'object'
        && event.detail !== null
        && 'projectIds' in event.detail
        && Array.isArray(event.detail.projectIds)
        && !event.detail.projectIds.includes(activeProject.id)
      ) {
        return
      }
      reloadCurrentProject()
    }

    window.addEventListener(DOCUMENT_BLUEPRINTS_CHANGED_EVENT, handleDocumentChange)
    window.addEventListener(RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT, handleProjectRefsChange)
    window.addEventListener(BIO_HISTORY_CHANGE_EVENT, reloadCurrentProject)
    window.addEventListener(GENETICS_HISTORY_CHANGE_EVENT, reloadCurrentProject)

    return (): void => {
      window.removeEventListener(DOCUMENT_BLUEPRINTS_CHANGED_EVENT, handleDocumentChange)
      window.removeEventListener(RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT, handleProjectRefsChange)
      window.removeEventListener(BIO_HISTORY_CHANGE_EVENT, reloadCurrentProject)
      window.removeEventListener(GENETICS_HISTORY_CHANGE_EVENT, reloadCurrentProject)
    }
  }, [activeProject, reloadWritingSources])

  const linkedAnalysisIds = useMemo(() => {
    if (!activeProject) {
      return new Set<string>()
    }
    return new Set(
      listProjectEntityRefs(activeProject.id)
        .filter((entityRef) => entityRef.entityKind === 'analysis')
        .map((entityRef) => entityRef.entityId),
    )
  }, [activeProject])

  const draftHistories = useMemo(() => (
    activeProject
      ? analysisHistory
        .filter((history) => history.projectId === activeProject.id)
        .filter((history) => history.results !== null)
        .filter((history) => linkedAnalysisIds.has(history.id))
        .slice(0, 6)
      : []
  ), [activeProject, analysisHistory, linkedAnalysisIds])

  const handleStartAnalysis = useCallback(() => {
    setShowHub(true)
    router.push('/')
  }, [router, setShowHub])

  const handleDocumentCreated = useCallback((doc: DocumentBlueprint) => {
    setAssemblyOpen(false)
    onOpenDocument(doc.id)
  }, [onOpenDocument])

  const handleCreateBlankDocument = useCallback(async () => {
    if (isCreatingBlankDocument) {
      return
    }

    setIsCreatingBlankDocument(true)
    try {
      let targetProject = activeProject
      if (!targetProject) {
        const existingScratchProject = projects.find((project) => (
          project.status === 'active'
          && (project.tags ?? []).includes(SCRATCH_PROJECT_TAG)
        ))

        targetProject = existingScratchProject ?? createProject('자료 작성 임시 공간', {
          description: '프로젝트 선택 없이 바로 작성할 때 사용하는 로컬 임시 작업공간',
          primaryDomain: 'general',
          tags: [SCRATCH_PROJECT_TAG],
          presentation: {
            emoji: '📝',
            color: 'slate',
          },
        })

        setActiveProject(targetProject.id)
      }

      const document = await startWritingSession({
        mode: 'manual-blank',
        projectId: targetProject.id,
        title: `${targetProject.name} 새 문서`,
      })
      onOpenDocument(document.id)
    } catch (error) {
      console.error('[PapersHub] failed to create blank writing document:', error)
      toast.error('빈 문서 생성에 실패했습니다.')
    } finally {
      setIsCreatingBlankDocument(false)
    }
  }, [activeProject, createProject, isCreatingBlankDocument, onOpenDocument, projects, setActiveProject])

  const handleCreateWritingFromEntity = useCallback(async (entity: ResolvedEntity) => {
    if (!activeProject || creatingWritingEntityId) {
      return
    }

    setCreatingWritingEntityId(entity.ref.entityId)
    try {
      const document = await createDocumentWritingSession({
        projectId: activeProject.id,
        title: `${entity.summary.title} 문서 초안`,
        sourceEntityIds: { entityIds: [entity.ref.entityId] },
      })
      onOpenDocument(document.id)
    } catch (error) {
      console.error('[PapersHub] failed to create writing document:', error)
      toast.error('문서 생성에 실패했습니다.')
    } finally {
      setCreatingWritingEntityId(null)
    }
  }, [activeProject, creatingWritingEntityId, onOpenDocument])

  const handleCreateWritingFromHistory = useCallback(async (historyId: string, title: string) => {
    if (!activeProject || creatingHistoryId) {
      return
    }

    setCreatingHistoryId(historyId)
    try {
      const document = await createDocumentWritingSession({
        projectId: activeProject.id,
        title: `${title} 문서 초안`,
        sourceEntityIds: {
          analysisIds: [historyId],
        },
      })
      onOpenDocument(document.id)
    } catch (error) {
      console.error('[PapersHub] failed to create writing document from history:', error)
      toast.error('문서 생성에 실패했습니다.')
    } finally {
      setCreatingHistoryId(null)
    }
  }, [activeProject, creatingHistoryId, onOpenDocument])

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-6 py-10">
      {/* Hero */}
      <div className="rounded-[32px] bg-surface-container px-6 py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-surface-container-highest px-3 py-1 text-xs font-medium text-on-surface-variant">
              <PenTool className="h-3.5 w-3.5" />
              논문·보고서 초안
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-on-surface">자료 작성</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
                {activeProject
                  ? `${activeProject.presentation?.emoji ?? ''} ${activeProject.name}의 분석 결과, 문헌, 그림을 섹션별 근거로 연결해 초안을 만듭니다.`
                  : '프로젝트를 고르지 않아도 새 문서를 열어 바로 작성할 수 있습니다. 내용은 이 기기에 로컬 저장됩니다.'}
              </p>
            </div>
            {!activeProject && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1">
                  <PenTool className="h-3.5 w-3.5" />
                  즉시 편집
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1">
                  <HardDriveDownload className="h-3.5 w-3.5" />
                  로컬 저장
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={!activeProject ? 0 : undefined}>
                  <StartWritingButton
                    onClick={() => {
                      void handleCreateBlankDocument()
                    }}
                    pending={isCreatingBlankDocument}
                    label={activeProject ? '새 문서' : '새 문서로 바로 시작'}
                    pendingLabel={!activeProject ? '임시 작업공간 준비 중...' : '빈 문서 생성 중...'}
                    className="gap-2"
                  />
                </span>
              </TooltipTrigger>
              {!activeProject && (
                <TooltipContent>임시 작업공간을 만들고 편집기를 엽니다</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          </div>
        </div>
      </div>

      {/* 문서 목록 */}
      {activeProject && documents.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-on-surface">
            <PenTool className="w-5 h-5" />
            내 문서
          </h2>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {documents.map(doc => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onClick={() => onOpenDocument(doc.id)}
              />
            ))}
          </div>
        </section>
      )}

      {activeProject && onOpenPackage && packages.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-on-surface">
            <Package className="w-5 h-5" />
            AI 입력 패키지
          </h2>
          <p className="text-sm text-muted-foreground">
            자료 작성 문서와 별도로, 외부 AI에 전달할 입력 묶음을 관리합니다.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {packages.map(pkg => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                onClick={() => onOpenPackage(pkg.id, activeProject.id)}
              />
            ))}
          </div>
        </section>
      )}

      {activeProject && writingSources.length > 0 && (
        <WritingEntrySurface
          title="바이오·유전 결과에서 바로 작성"
          description="프로젝트에 저장된 bio-tools와 유전 분석 결과를 문서 초안의 섹션 근거로 연결합니다."
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {writingSources.map((entity) => (
              <WritingSourceCard
                key={entity.ref.id}
                entity={entity}
                onClick={() => {
                  void handleCreateWritingFromEntity(entity)
                }}
                disabled={creatingWritingEntityId === entity.ref.entityId}
              />
            ))}
          </div>
        </WritingEntrySurface>
      )}

      {/* 빈 문서 목록 — 프로젝트 선택 + 문서 0개 */}
      {activeProject && documents.length === 0 && (
        <EmptyState
          icon={PenTool}
          title="아직 작성한 문서가 없습니다"
          description="빈 문서를 만들거나, 분석 결과를 연결해 초안을 시작할 수 있습니다."
          variant="inline"
          action={
            <StartWritingButton
              onClick={() => {
                void handleCreateBlankDocument()
              }}
              pending={isCreatingBlankDocument}
              label="첫 문서 만들기"
              pendingLabel="빈 문서 생성 중..."
              className="gap-2"
            />
          }
        />
      )}

      <section className="space-y-4 rounded-[28px] bg-surface-container p-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-surface-container-highest px-3 py-1 text-xs font-medium text-on-surface-variant">
            <Sparkles className="h-3.5 w-3.5" />
            보조 도구
          </div>
          <div>
            <h2 className="text-lg font-semibold text-on-surface">자료 준비 도구</h2>
            <p className="mt-1 text-sm leading-6 text-on-surface-variant">
              문헌 탐색, 외부 AI 입력 묶음, 프로젝트 결과 조립을 필요할 때만 열어 사용합니다.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SecondaryToolCard
            icon={Search}
            title="문헌 검색"
            description="초안에 연결할 문헌과 참고문헌 후보를 찾습니다."
            actionLabel="문헌 검색 열기"
            onAction={() => onOpenLiterature?.(activeProject?.id)}
            disabled={!onOpenLiterature}
          />
          <SecondaryToolCard
            icon={Package}
            title="AI 입력 패키지"
            description="외부 LLM에 전달할 분석·문헌 묶음을 따로 정리합니다."
            actionLabel="패키지 만들기"
            onAction={() => {
              if (activeProject && onOpenPackage) {
                onOpenPackage('new', activeProject.id)
              }
            }}
            disabled={!activeProject || !onOpenPackage}
          />
          <SecondaryToolCard
            icon={Plus}
            title="프로젝트 조립"
            description="프로젝트 결과를 선택해 문서 초안 재료로 묶습니다."
            actionLabel="조립 열기"
            onAction={() => setAssemblyOpen(true)}
            disabled={!activeProject}
          />
        </div>
      </section>

      {/* 프로젝트에 연결된 분석 결과 */}
      {draftHistories.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-on-surface">프로젝트 분석 결과에서 바로 작성</h2>
          <p className="text-sm text-muted-foreground">
            프로젝트에 저장된 통계 결과를 문서 초안의 재료로 연결합니다.
          </p>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {draftHistories.map(h => (
              <DraftHistoryCard
                key={h.id}
                name={h.name || h.dataFileName}
                method={h.method?.name ?? '분석'}
                timestamp={new Date(h.timestamp)}
                onWrite={() => {
                  void handleCreateWritingFromHistory(h.id, h.method?.name ?? h.name ?? h.dataFileName)
                }}
                disabled={creatingHistoryId === h.id}
              />
            ))}
          </div>
        </section>
      ) : activeProject ? (
        <EmptyState
          icon={FileText}
          title="바로 연결할 분석 결과가 없습니다"
          description="통계 분석 결과를 프로젝트에 저장하면 여기서 문서 초안 재료로 연결할 수 있습니다."
          variant="inline"
          action={
            <Button onClick={handleStartAnalysis} className="gap-2">
              분석 시작하기
              <ArrowRight className="w-4 h-4" />
            </Button>
          }
        />
      ) : null}

      {/* 조립 다이얼로그 */}
      {activeProject && (
        <DocumentAssemblyDialog
          open={assemblyOpen}
          onOpenChange={setAssemblyOpen}
          projectId={activeProject.id}
          projectName={activeProject.name}
          onCreated={handleDocumentCreated}
        />
      )}
    </div>
  )
}
