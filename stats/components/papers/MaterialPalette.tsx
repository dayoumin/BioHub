'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart3, BookOpen, FileText, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useHistoryStore } from '@/lib/stores/history-store'
import {
  type ResearchProjectEntityRefsChangedDetail,
  listProjectEntityRefs,
  RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT,
} from '@/lib/research/project-storage'
import {
  type GraphProjectsChangedDetail,
  GRAPH_PROJECTS_CHANGED_EVENT,
  listProjects as listGraphProjects,
} from '@/lib/graph-studio/project-storage'
import type { HistoryRecord } from '@/lib/utils/storage-types'
import type { GraphProject } from '@/types/graph-studio'
import type { CitationRecord } from '@/lib/research/citation-types'
import { buildCitationString } from '@/lib/research/citation-apa-formatter'
import type { DocumentSectionSupportRole } from '@/lib/research/document-support-asset-types'
import {
  DOCUMENT_SECTION_SUPPORT_ROLE_LABELS,
  getRecommendedDocumentSectionSupportRoles,
  inferDocumentSectionSupportRole,
} from '@/lib/research/document-support-asset-types'
import { cn } from '@/lib/utils'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'

interface MaterialPaletteProps {
  projectId: string
  documentId?: string
  activeSectionId?: string | null
  activeSectionTitle?: string | null
  onInsertAnalysis: (record: HistoryRecord) => void
  onInsertFigure: (graph: GraphProject) => void
  citations: CitationRecord[]
  onDeleteCitation: (id: string) => void
  onAttachCitationToSection: (record: CitationRecord, role: DocumentSectionSupportRole) => void
  onDetachCitationFromSection?: (record: CitationRecord, role: DocumentSectionSupportRole) => void
  onInsertInlineCitation: (record: CitationRecord, role: DocumentSectionSupportRole) => void
  attachedCitationRoleCounts?: Map<string, Map<DocumentSectionSupportRole, number>>
}

type MaterialTab = 'analyses' | 'figures' | 'citations'

export default function MaterialPalette({
  projectId,
  documentId,
  activeSectionId,
  activeSectionTitle,
  onInsertAnalysis,
  onInsertFigure,
  citations,
  onDeleteCitation,
  onAttachCitationToSection,
  onDetachCitationFromSection,
  onInsertInlineCitation,
  attachedCitationRoleCounts,
}: MaterialPaletteProps): React.ReactElement {
  const { analysisHistory } = useHistoryStore()
  const [projectAnalyses, setProjectAnalyses] = useState<HistoryRecord[]>([])
  const [projectGraphs, setProjectGraphs] = useState<GraphProject[]>([])
  const [selectedRolesByCitation, setSelectedRolesByCitation] = useState<Record<string, DocumentSectionSupportRole>>({})
  const [activeTab, setActiveTab] = useState<MaterialTab>('citations')

  const refreshMaterials = useCallback((): void => {
    const refs = listProjectEntityRefs(projectId)
    const analysisIds = new Set(
      refs.filter(r => r.entityKind === 'analysis').map(r => r.entityId),
    )
    const figureIds = new Set(
      refs.filter(r => r.entityKind === 'figure').map(r => r.entityId),
    )

    setProjectAnalyses(analysisHistory.filter(h => analysisIds.has(h.id)) as unknown as HistoryRecord[])
    setProjectGraphs(listGraphProjects().filter(g => figureIds.has(g.id)))
  }, [projectId, analysisHistory])

  useEffect(() => {
    refreshMaterials()
  }, [refreshMaterials])

  useEffect(() => {
    setSelectedRolesByCitation({})
  }, [activeSectionId])

  useEffect(() => {
    if (citations.length > 0) {
      setActiveTab('citations')
      return
    }
    if (projectGraphs.length > 0) {
      setActiveTab('figures')
      return
    }
    if (projectAnalyses.length > 0) {
      setActiveTab('analyses')
    }
  }, [citations.length, projectAnalyses.length, projectGraphs.length])

  useEffect((): (() => void) => {
    const isCurrentProjectEntityRefChange = (event: Event): boolean => {
      if (!(event instanceof CustomEvent)) return true
      const detail = event.detail as ResearchProjectEntityRefsChangedDetail | undefined
      return detail?.projectIds.includes(projectId) ?? true
    }

    const isCurrentProjectGraphChange = (event: Event): boolean => {
      if (!(event instanceof CustomEvent)) return true
      const detail = event.detail as GraphProjectsChangedDetail | undefined
      const figureIds = new Set(
        listProjectEntityRefs(projectId)
          .filter(ref => ref.entityKind === 'figure')
          .map(ref => ref.entityId),
      )
      return detail?.projectIds.some((graphId: string) => figureIds.has(graphId)) ?? true
    }

    const handleRefsChange = (event: Event): void => {
      if (!isCurrentProjectEntityRefChange(event)) return
      refreshMaterials()
    }

    const handleGraphProjectsChange = (event: Event): void => {
      if (!isCurrentProjectGraphChange(event)) return
      refreshMaterials()
    }

    const handleStorage = (event: StorageEvent): void => {
      if (event.key !== STORAGE_KEYS.graphStudio.projects) return
      refreshMaterials()
    }

    window.addEventListener(RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT, handleRefsChange)
    window.addEventListener(GRAPH_PROJECTS_CHANGED_EVENT, handleGraphProjectsChange)
    window.addEventListener('storage', handleStorage)

    return (): void => {
      window.removeEventListener(RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT, handleRefsChange)
      window.removeEventListener(GRAPH_PROJECTS_CHANGED_EVENT, handleGraphProjectsChange)
      window.removeEventListener('storage', handleStorage)
    }
  }, [projectId, refreshMaterials])

  const literatureSearchHref = useCallback((): string => {
    const params = new URLSearchParams({
      tab: 'literature',
      project: projectId,
    })
    if (documentId) {
      params.set('documentId', documentId)
    }
    if (activeSectionId) {
      params.set('sectionId', activeSectionId)
    }
    if (activeSectionTitle) {
      params.set('sectionTitle', activeSectionTitle)
    }
    return `/papers?${params.toString()}`
  }, [activeSectionId, activeSectionTitle, documentId, projectId])

  const openLiteratureSearch = useCallback((): void => {
    const href = literatureSearchHref()
    window.history.pushState({}, '', href)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, [literatureSearchHref])

  const roleOptions = getRecommendedDocumentSectionSupportRoles(activeSectionId)
  const defaultRole = inferDocumentSectionSupportRole(activeSectionId)

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MaterialTab)} className="gap-3">
      <TabsList className="grid h-9 w-full grid-cols-3 rounded-full bg-surface-container p-1">
        <TabsTrigger value="analyses" className="rounded-full text-[11px]">
          <FileText className="h-3.5 w-3.5" />
          <span className="sr-only">분석</span>
          <span aria-hidden="true">{projectAnalyses.length}</span>
        </TabsTrigger>
        <TabsTrigger value="figures" className="rounded-full text-[11px]">
          <BarChart3 className="h-3.5 w-3.5" />
          <span className="sr-only">그래프</span>
          <span aria-hidden="true">{projectGraphs.length}</span>
        </TabsTrigger>
        <TabsTrigger value="citations" className="rounded-full text-[11px]">
          <BookOpen className="h-3.5 w-3.5" />
          <span className="sr-only">문헌</span>
          <span aria-hidden="true">{citations.length}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="analyses" className="space-y-1">
        {projectAnalyses.length === 0 && (
          <p className="py-2 text-xs text-muted-foreground/70">
            프로젝트에 연결된 분석이 없습니다.{' '}
            <Link href="/" className="text-primary hover:underline">분석 실행하기</Link>
          </p>
        )}
        {projectAnalyses.map(record => (
          <button
            key={record.id}
            type="button"
            onClick={() => onInsertAnalysis(record)}
            className={cn(
              'flex w-full items-center gap-2 rounded-xl p-2 text-left',
              'text-xs transition-colors hover:bg-surface-container',
            )}
          >
            <div className="min-w-0 flex-1 truncate">
              {record.method?.name ?? record.name}
            </div>
            <Plus className="w-3 h-3 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </TabsContent>

      <TabsContent value="figures" className="space-y-1">
        {projectGraphs.length === 0 && (
          <p className="py-2 text-xs text-muted-foreground/70">연결된 그래프가 없습니다</p>
        )}
        {projectGraphs.map(graph => (
          <button
            key={graph.id}
            type="button"
            onClick={() => onInsertFigure(graph)}
            className={cn(
              'flex w-full items-center gap-2 rounded-xl p-2 text-left',
              'text-xs transition-colors hover:bg-surface-container',
            )}
          >
            <div className="min-w-0 flex-1 truncate">{graph.name}</div>
            <Badge variant="secondary" className="shrink-0 rounded-full bg-surface-container px-2 text-[10px]">
              {graph.chartSpec?.chartType ?? 'chart'}
            </Badge>
            <Plus className="w-3 h-3 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </TabsContent>

      <TabsContent value="citations" className="space-y-1">
        {activeSectionId && (
          <p className="rounded-xl bg-surface-container px-2 py-1.5 text-[11px] text-muted-foreground/80">
            현재 섹션: <span className="font-medium text-foreground">{activeSectionTitle ?? activeSectionId}</span>
          </p>
        )}
        {citations.length === 0 && (
          <p className="py-2 text-xs text-muted-foreground/70">
            저장된 인용이 없습니다.{' '}
            <button
              type="button"
              onClick={openLiteratureSearch}
              className="text-primary hover:underline"
            >
              문헌 검색에서 추가
            </button>
          </p>
        )}
        {citations.map(record => (
          (() => {
            const selectedRole = selectedRolesByCitation[record.id] ?? defaultRole
            const attachedRoleCounts = attachedCitationRoleCounts?.get(record.id)
            const selectedRoleAttachmentCount = attachedRoleCounts?.get(selectedRole) ?? 0
            const isSelectedRoleAttached = selectedRoleAttachmentCount > 0
            const canDetachSelectedRole = Boolean(activeSectionId && onDetachCitationFromSection && isSelectedRoleAttached)

            return (
              <div key={record.id} className="group rounded-xl bg-surface-container-low px-2 py-2">
                <div
                  className="text-xs px-1 py-1 truncate"
                  title={buildCitationString(record.item)}
                >
                  <span className="font-medium">
                    {record.item.authors[0] ?? '저자 미상'}
                    {record.item.year ? ` (${record.item.year})` : ''}
                  </span>
                  <span className="text-muted-foreground ml-1 truncate">
                    {record.item.title}
                  </span>
                </div>
                {activeSectionId && (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {roleOptions.map((role) => (
                      <Button
                        key={`${record.id}-${role}`}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className={cn(
                          'h-7 rounded-full px-2.5 text-[11px]',
                          selectedRole === role
                            ? 'bg-surface text-on-surface'
                            : 'bg-surface-container text-on-surface-variant',
                        )}
                        onClick={() => {
                          setSelectedRolesByCitation((prev) => ({
                            ...prev,
                            [record.id]: role,
                          }))
                        }}
                      >
                        {DOCUMENT_SECTION_SUPPORT_ROLE_LABELS[role]}
                      </Button>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 rounded-full bg-surface px-2.5 text-[11px]"
                    onClick={() => onAttachCitationToSection(record, selectedRole)}
                    disabled={!activeSectionId || isSelectedRoleAttached}
                  >
                    {isSelectedRoleAttached
                      ? `${DOCUMENT_SECTION_SUPPORT_ROLE_LABELS[selectedRole]} 근거로 연결됨${selectedRoleAttachmentCount > 1 ? ` (${selectedRoleAttachmentCount})` : ''}`
                      : `${DOCUMENT_SECTION_SUPPORT_ROLE_LABELS[selectedRole]} 근거로 연결`}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 rounded-full bg-surface px-2.5 text-[11px]"
                    onClick={() => onInsertInlineCitation(record, selectedRole)}
                    disabled={!activeSectionId}
                  >
                    본문 인용 삽입
                  </Button>
                  {canDetachSelectedRole && onDetachCitationFromSection && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-full px-2.5 text-[11px] text-muted-foreground hover:bg-surface"
                      onClick={() => onDetachCitationFromSection(record, selectedRole)}
                    >
                      {DOCUMENT_SECTION_SUPPORT_ROLE_LABELS[selectedRole]} 근거 해제
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDeleteCitation(record.id)}
                    className="ml-auto rounded p-1 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10"
                    title="문헌 목록에서 삭제"
                    aria-label="문헌 목록에서 삭제"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })()
        ))}
        {citations.length > 0 && (
          <button
            type="button"
            onClick={openLiteratureSearch}
            className="flex items-center gap-1 pt-1 text-xs text-primary hover:underline"
          >
            <Plus className="w-3 h-3" /> 더 추가
          </button>
        )}
      </TabsContent>
    </Tabs>
  )
}
