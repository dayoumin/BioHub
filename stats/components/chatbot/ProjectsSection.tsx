/**
 * ProjectsSection - 프로젝트 폴더 섹션
 *
 * 기능:
 * - 프로젝트 목록 표시 (접기/펼치기)
 * - 각 프로젝트 헤더: 이모지 + 이름 + 세션 카운트 + 액션 버튼
 * - 펼쳤을 때: 하위 세션 목록
 * - 세션 없으면 안내 메시지
 */

import React from 'react'
import { Folder, Plus, ChevronDown, ChevronRight, Trash2, HelpCircle } from 'lucide-react'
import { SessionItem } from './SessionItem'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { ChatProject, ChatSession } from '@/lib/types/chat'

interface ProjectsSectionProps {
  projects: ChatProject[]
  sessions: ChatSession[]
  activeSessionId: string | null
  expandedProjectIds: Set<string>
  onToggleProject: (projectId: string) => void
  onSelectSession: (sessionId: string) => void
  onToggleFavorite: (sessionId: string) => void
  onDeleteSession: (sessionId: string) => void
  onMoveSession: (sessionId: string) => void
  onDeleteProject: (projectId: string) => void
  onCreateProject: () => void
}

export const ProjectsSection: React.FC<ProjectsSectionProps> = ({
  projects,
  sessions,
  activeSessionId,
  expandedProjectIds,
  onToggleProject,
  onSelectSession,
  onToggleFavorite,
  onDeleteSession,
  onMoveSession,
  onDeleteProject,
  onCreateProject,
}) => {
  // 섹션 전체 축소/펼침 상태
  const [isSectionExpanded, setIsSectionExpanded] = React.useState(true)

  // 프로젝트별 세션 그룹화
  const getProjectSessions = (projectId: string): ChatSession[] => {
    return sessions.filter((s) => s.projectId === projectId)
  }

  return (
    <TooltipProvider>
      <div className="border-b py-2">
        {/* 섹션 헤더 - 축소/펼침 가능 */}
        <div className="flex items-center gap-2 px-4 py-2 hover:bg-accent rounded-md transition-colors">
          <button
            onClick={() => setIsSectionExpanded(!isSectionExpanded)}
            className="flex items-center gap-2 flex-1"
            type="button"
          >
            {isSectionExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Folder className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold">주제별 채팅</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>특정 주제에 대한 채팅 내역을 모아서 관리할 수 있습니다.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={onCreateProject}
            title="새 주제 만들기"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* 프로젝트 목록 - 섹션 펼쳤을 때만 표시 */}
        {isSectionExpanded && (
          <div className="mt-1 space-y-1">
            {projects.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  주제별 채팅이 없습니다
                </p>
              </div>
            ) : (
              projects.map((project) => {
            const projectSessions = getProjectSessions(project.id)
            const isExpanded = expandedProjectIds.has(project.id)

            return (
              <div key={project.id}>
                {/* 프로젝트 헤더 */}
                <div className="group px-2">
                  <div
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent rounded-md transition-colors cursor-pointer"
                    onClick={() => onToggleProject(project.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onToggleProject(project.id)
                      }
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="text-lg flex-shrink-0 text-muted-foreground">
                      {project.emoji || '📁'}
                    </span>
                    <span className="text-sm font-medium truncate flex-1 text-left">
                      {project.name}
                    </span>
                    <Badge variant="secondary" className="flex-shrink-0">
                      {projectSessions.length}
                    </Badge>

                    {/* 호버 시 삭제 버튼 */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="hidden group-hover:inline-flex h-6 w-6 flex-shrink-0 text-destructive hover:text-destructive hover:bg-accent"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteProject(project.id)
                      }}
                      title="삭제"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* 하위 세션 목록 (펼쳤을 때) */}
                {isExpanded && (
                  <div className="ml-6 mr-2 mt-1 space-y-1">
                    {projectSessions.length === 0 ? (
                      <div className="px-3 py-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          대화가 없습니다
                        </p>
                      </div>
                    ) : (
                      projectSessions.map((session) => (
                        <SessionItem
                          key={session.id}
                          session={session}
                          isActive={session.id === activeSessionId}
                          onSelect={onSelectSession}
                          onToggleFavorite={onToggleFavorite}
                          onDelete={onDeleteSession}
                          onMove={onMoveSession}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
