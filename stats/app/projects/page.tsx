'use client'

import { Suspense, useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, FolderOpen, Archive, Trash2, Pencil, MoreHorizontal, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useResearchProjectStore,
  selectActiveProject,
} from '@/lib/stores/research-project-store'
import type { ResearchProject } from '@/lib/types/research'
import { toast } from 'sonner'
import { listProjectEntityRefs } from '@/lib/research/project-storage'
import { formatTimeAgo } from '@/lib/utils/format-time'
import { ProjectDetailContent } from '@/components/projects/ProjectDetailContent'

// ── 프로젝트 생성 다이얼로그 ──

function CreateProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const createProject = useResearchProjectStore(s => s.createProject)
  const setActiveProject = useResearchProjectStore(s => s.setActiveProject)

  const handleCreate = useCallback(() => {
    if (!name.trim()) return
    const project = createProject(name, {
      description: description.trim() || undefined,
    })
    setActiveProject(project.id)
    toast.success(`'${project.name}' 프로젝트가 생성되었습니다`)
    setName('')
    setDescription('')
    onOpenChange(false)
  }, [name, description, createProject, setActiveProject, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>새 연구 프로젝트</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label htmlFor="project-name" className="mb-1 block text-sm font-medium">
              프로젝트 이름
            </label>
            <Input
              id="project-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="예: 제주 해양 생태 조사 2026"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && name.trim()) handleCreate()
              }}
            />
          </div>
          <div>
            <label htmlFor="project-desc" className="mb-1 block text-sm font-medium">
              설명 <span className="font-normal text-muted-foreground">(선택)</span>
            </label>
            <Input
              id="project-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="프로젝트의 목적이나 범위"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            생성
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── 프로젝트 카드 ──

function ProjectCard({
  project,
  isActive,
  refCount,
  onSelect,
  onOpen,
  onEdit,
  onArchive,
  onDelete,
}: {
  project: ResearchProject
  isActive: boolean
  refCount: number
  onSelect: () => void
  onOpen: () => void
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const emoji = project.presentation?.emoji

  return (
    <div
      className={`group relative rounded-lg border p-4 transition-colors hover:border-primary/30 ${
        isActive
          ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
          : 'border-border bg-card'
      }`}
    >
      <div className="flex items-start justify-between">
        <button
          onClick={onSelect}
          className="flex-1 text-left"
        >
          <div className="flex items-center gap-2">
            {emoji && <span className="text-lg">{emoji}</span>}
            <h3 className="font-medium leading-tight">{project.name}</h3>
            {isActive && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                활성
              </Badge>
            )}
            {project.status === 'archived' && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                보관됨
              </Badge>
            )}
          </div>
          {project.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{refCount}개 항목</span>
            <span>{formatDate(project.createdAt)}</span>
          </div>
        </button>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onOpen}
            title="열기"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onOpen}>
                <Eye className="mr-2 h-3.5 w-3.5" />
                열기
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                이름 수정
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="mr-2 h-3.5 w-3.5" />
                {project.status === 'archived' ? '보관 해제' : '보관'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

// ── 이름 수정 다이얼로그 ──

function RenameDialog({
  project,
  open,
  onOpenChange,
}: {
  project: ResearchProject | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState('')
  const updateProject = useResearchProjectStore(s => s.updateProject)

  useEffect(() => {
    if (project) setName(project.name)
  }, [project])

  const handleRename = useCallback(() => {
    if (!project || !name.trim()) return
    updateProject(project.id, { name: name.trim() })
    toast.success('프로젝트 이름이 변경되었습니다')
    onOpenChange(false)
  }, [project, name, updateProject, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>프로젝트 이름 수정</DialogTitle>
        </DialogHeader>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          onKeyDown={e => {
            if (e.key === 'Enter' && name.trim()) handleRename()
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleRename} disabled={!name.trim()}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── 메인 페이지 ──

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-8 animate-pulse"><div className="h-8 w-48 bg-muted rounded" /></div>}>
      <ProjectsPageInner />
    </Suspense>
  )
}

function ProjectsPageInner() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('id')

  if (projectId) {
    return <ProjectDetailContent projectId={projectId} />
  }

  return <ProjectsListView />
}

// ── 프로젝트 목록 뷰 ──

function ProjectsListView() {
  const router = useRouter()
  const projects = useResearchProjectStore(s => s.projects)
  const activeProject = useResearchProjectStore(selectActiveProject)
  const setActiveProject = useResearchProjectStore(s => s.setActiveProject)
  const clearActiveProject = useResearchProjectStore(s => s.clearActiveProject)
  const updateProject = useResearchProjectStore(s => s.updateProject)
  const removeProject = useResearchProjectStore(s => s.removeProject)
  const refreshProjects = useResearchProjectStore(s => s.refreshProjects)

  const [createOpen, setCreateOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<ResearchProject | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    refreshProjects()
  }, [refreshProjects])

  const activeProjects = projects.filter(p => p.status === 'active')
  const archivedProjects = projects.filter(p => p.status === 'archived')
  const displayedProjects = showArchived ? archivedProjects : activeProjects

  const refCountMap = useMemo(() => {
    const allRefs = listProjectEntityRefs()
    const counts = new Map<string, number>()
    for (const ref of allRefs) {
      counts.set(ref.projectId, (counts.get(ref.projectId) ?? 0) + 1)
    }
    return counts
  }, [projects])

  const handleSelect = useCallback(
    (project: ResearchProject) => {
      if (activeProject?.id === project.id) {
        clearActiveProject()
        toast.info('프로젝트 연결이 해제되었습니다')
      } else {
        setActiveProject(project.id)
        toast.success(`'${project.name}' 프로젝트가 활성화되었습니다`)
      }
    },
    [activeProject, setActiveProject, clearActiveProject],
  )

  const handleArchive = useCallback(
    (project: ResearchProject) => {
      const nextStatus = project.status === 'archived' ? 'active' : 'archived'
      updateProject(project.id, { status: nextStatus })
      toast.success(nextStatus === 'archived' ? '프로젝트가 보관되었습니다' : '프로젝트가 복원되었습니다')
    },
    [updateProject],
  )

  const handleDelete = useCallback(
    (project: ResearchProject) => {
      if (!window.confirm(`'${project.name}' 프로젝트를 삭제하시겠습니까? 연결된 항목 참조도 함께 삭제됩니다.`)) {
        return
      }
      removeProject(project.id)
      toast.success('프로젝트가 삭제되었습니다')
    },
    [removeProject],
  )

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">연구 프로젝트</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            분석, 그래프, 유전적 분석 등을 하나의 연구 단위로 묶어 관리합니다
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          새 프로젝트
        </Button>
      </div>

      {/* 탭 */}
      <div className="mb-4 flex items-center gap-4 border-b">
        <button
          onClick={() => setShowArchived(false)}
          className={`pb-2 text-sm font-medium transition-colors ${
            !showArchived
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          활성 ({activeProjects.length})
        </button>
        <button
          onClick={() => setShowArchived(true)}
          className={`pb-2 text-sm font-medium transition-colors ${
            showArchived
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          보관됨 ({archivedProjects.length})
        </button>
      </div>

      {/* 프로젝트 목록 */}
      {displayedProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {showArchived ? '보관된 프로젝트가 없습니다' : '프로젝트가 없습니다'}
          </p>
          {!showArchived && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              첫 프로젝트 만들기
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayedProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              isActive={activeProject?.id === project.id}
              refCount={refCountMap.get(project.id) ?? 0}
              onSelect={() => handleSelect(project)}
              onOpen={() => router.push(`/projects?id=${project.id}`)}
              onEdit={() => setRenameTarget(project)}
              onArchive={() => handleArchive(project)}
              onDelete={() => handleDelete(project)}
            />
          ))}
        </div>
      )}

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RenameDialog
        project={renameTarget}
        open={renameTarget !== null}
        onOpenChange={open => {
          if (!open) setRenameTarget(null)
        }}
      />
    </div>
  )
}

// ── 유틸 ──

function formatDate(iso: string): string {
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return ''
  return formatTimeAgo(ts, undefined, 7)
}
