'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText, Plus, BarChart3, Table2, ArrowRight, Clock,
  BookOpen, FileOutput, PenTool, Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useHistoryStore } from '@/lib/stores/history-store'
import { useResearchProjectStore, selectActiveProject } from '@/lib/stores/research-project-store'
import { loadAndRestoreHistory } from '@/lib/stores/store-orchestration'
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
        'flex items-start gap-3 p-4 rounded-2xl border bg-card w-full text-left',
        'hover:shadow-sm hover:border-primary/30 active:scale-[0.98] transition-all duration-200',
      )}
    >
      <div className="shrink-0 bg-primary/10 text-primary p-2 rounded-lg">
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
  id: string
  name: string
  method: string
  timestamp: Date
  onClick: () => void
}

function DraftHistoryCard({ name, method, timestamp, onClick }: DraftHistoryCardProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-4 rounded-2xl border bg-card w-full text-left',
        'hover:shadow-sm hover:border-primary/30 active:scale-[0.98] transition-all duration-200',
      )}
    >
      <div className="shrink-0 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-2 rounded-lg">
        <FileText className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm truncate">{method}</p>
        <p className="text-xs text-muted-foreground truncate">{name}</p>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        <Clock className="w-3 h-3" />
        {formatTimeAgo(timestamp)}
      </div>
    </button>
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
        'flex items-start gap-3 p-4 rounded-2xl border bg-card w-full text-left',
        'hover:shadow-sm hover:border-primary/30 active:scale-[0.98] transition-all duration-200',
      )}
    >
      <div className="shrink-0 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 p-2 rounded-lg">
        <Package className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm truncate">{pkg.overview.title || '제목 없는 패키지'}</p>
        <p className="text-xs text-muted-foreground truncate">
          v{pkg.version} · {pkg.items.filter(item => item.included).length}개 항목 포함
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
        'flex items-start gap-3 p-4 rounded-2xl border bg-card w-full text-left',
        'hover:shadow-sm hover:border-primary/30 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100',
      )}
    >
      <div className="shrink-0 bg-primary/10 text-primary p-2 rounded-lg">
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

// ── 기능 소개 ──

const FEATURES = [
  {
    icon: Table2,
    title: '통계 결과 표',
    desc: '기술통계, 검정 결과, 사후검정 표를 자동 생성',
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    icon: BarChart3,
    title: '분석 그래프',
    desc: '분석 차트를 그대로 삽입, PNG 저장',
    color: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400',
  },
  {
    icon: FileText,
    title: '결과 해석 텍스트',
    desc: 'APA 형식 Methods & Results 자동 작성',
    color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
] as const

// ── 메인 ──

interface PapersHubProps {
  onOpenDocument: (id: string) => void
  onOpenPackage?: (id: string, projectId?: string) => void
}

export default function PapersHub({ onOpenDocument, onOpenPackage }: PapersHubProps): React.ReactElement {
  const router = useRouter()
  const { analysisHistory } = useHistoryStore()
  const setShowHub = useModeStore(s => s.setShowHub)
  const activeProject = useResearchProjectStore(selectActiveProject)
  const [documents, setDocuments] = useState<DocumentBlueprint[]>([])
  const [packages, setPackages] = useState<PaperPackage[]>([])
  const [assemblyOpen, setAssemblyOpen] = useState(false)
  const [writingSources, setWritingSources] = useState<ResolvedEntity[]>([])
  const [creatingWritingEntityId, setCreatingWritingEntityId] = useState<string | null>(null)
  const [isCreatingBlankDocument, setIsCreatingBlankDocument] = useState(false)

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

  const draftHistories = analysisHistory
    .filter(h => h.results !== null)
    .slice(0, 6)

  const handleHistoryClick = useCallback(async (historyId: string) => {
    await loadAndRestoreHistory(historyId)
    setShowHub(false)
    router.push('/')
  }, [router, setShowHub])

  const handleStartAnalysis = useCallback(() => {
    setShowHub(true)
    router.push('/')
  }, [router, setShowHub])

  const handleDocumentCreated = useCallback((doc: DocumentBlueprint) => {
    setAssemblyOpen(false)
    onOpenDocument(doc.id)
  }, [onOpenDocument])

  const handleCreateBlankDocument = useCallback(async () => {
    if (!activeProject || isCreatingBlankDocument) {
      return
    }

    setIsCreatingBlankDocument(true)
    try {
      const document = await startWritingSession({
        mode: 'manual-blank',
        projectId: activeProject.id,
        title: `${activeProject.name} 새 문서`,
      })
      onOpenDocument(document.id)
    } catch (error) {
      console.error('[PapersHub] failed to create blank writing document:', error)
      toast.error('빈 문서 생성에 실패했습니다.')
    } finally {
      setIsCreatingBlankDocument(false)
    }
  }, [activeProject, isCreatingBlankDocument, onOpenDocument])

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

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
      {/* Hero */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">자료 작성</h1>
          <p className="text-muted-foreground mt-1">
            {activeProject
              ? `${activeProject.presentation?.emoji ?? ''} ${activeProject.name}`
              : '프로젝트를 선택하면 문서를 만들 수 있습니다'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeProject && onOpenPackage && (
            <Button
              variant="outline"
              onClick={() => onOpenPackage('new', activeProject.id)}
              className="gap-2"
            >
              <Package className="w-4 h-4" />
              AI 패키지 조립
            </Button>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={!activeProject ? 0 : undefined}>
                  <StartWritingButton
                    onClick={() => {
                      void handleCreateBlankDocument()
                    }}
                    disabled={!activeProject}
                    pending={isCreatingBlankDocument}
                    label="새 문서"
                    pendingLabel="빈 문서 생성 중..."
                    className="gap-2"
                  />
                </span>
              </TooltipTrigger>
              {!activeProject && (
                <TooltipContent>프로젝트를 먼저 선택하세요</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={!activeProject ? 0 : undefined}>
                  <Button
                    variant="outline"
                    onClick={() => setAssemblyOpen(true)}
                    disabled={!activeProject}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    프로젝트 조립
                  </Button>
                </span>
              </TooltipTrigger>
              {!activeProject && (
                <TooltipContent>프로젝트를 먼저 선택하세요</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* 문서 목록 */}
      {activeProject && documents.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <PenTool className="w-5 h-5" />
            내 문서
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Package className="w-5 h-5" />
            패키지
          </h2>
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
          description="프로젝트에 저장된 bio-tools와 유전 분석 결과를 바로 문서 초안으로 연결합니다"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
          description="분석 결과를 조립하여 논문 초안을 만들어 보세요"
          variant="inline"
          action={
            <div className="flex items-center gap-2">
              <StartWritingButton
                onClick={() => {
                  void handleCreateBlankDocument()
                }}
                pending={isCreatingBlankDocument}
                label="첫 문서 만들기"
                pendingLabel="빈 문서 생성 중..."
                className="gap-2"
              />
              <Button variant="outline" onClick={() => setAssemblyOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                프로젝트 조립
              </Button>
            </div>
          }
        />
      )}

      {/* 프로젝트 미선택 가드 */}
      {!activeProject && (
        <Card>
          <CardContent className="flex flex-col items-center py-10">
            <BookOpen className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm mb-1">
              프로젝트를 먼저 선택하세요
            </p>
            <p className="text-xs text-muted-foreground/60">
              좌측 사이드바에서 프로젝트를 선택하면 문서를 만들 수 있습니다
            </p>
          </CardContent>
        </Card>
      )}

      {/* 기능 소개 */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <FileOutput className="w-5 h-5" />
          지원 기능
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="flex flex-col items-center text-center p-5 rounded-2xl border bg-card">
              <div className={cn('p-3 rounded-xl mb-3', f.color)}>
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 기존: 이전 분석 결과 (보존) */}
      {draftHistories.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">이전 분석 결과</h2>
          <p className="text-sm text-muted-foreground">
            분석 결과를 선택하면 결과 정리 패널을 열 수 있습니다
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {draftHistories.map(h => (
              <DraftHistoryCard
                key={h.id}
                id={h.id}
                name={h.name || h.dataFileName}
                method={h.method?.name ?? '분석'}
                timestamp={new Date(h.timestamp)}
                onClick={() => handleHistoryClick(h.id)}
              />
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          icon={FileText}
          title="아직 분석 결과가 없습니다"
          description="통계 분석을 먼저 실행하면 여기서 결과를 정리할 수 있습니다"
          variant="inline"
          action={
            <Button onClick={handleStartAnalysis} className="gap-2">
              분석 시작하기
              <ArrowRight className="w-4 h-4" />
            </Button>
          }
        />
      )}

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
