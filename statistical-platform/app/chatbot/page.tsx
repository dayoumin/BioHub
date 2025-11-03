/**
 * AI 챗봇 전용 페이지 (Grok 스타일)
 *
 * 기능:
 * - Grok 스타일 사이드바 (검색, 즐겨찾기, 프로젝트, 히스토리)
 * - 프로젝트 관리 (생성, 편집, 삭제)
 * - 세션 이동 (프로젝트 간)
 * - RAG 챗봇 통합
 * - 퀵 프롬프트 (빈 상태)
 * - 키보드 단축키 (Ctrl+N: 새 대화)
 */

'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Sparkles, ChevronLeft, ChevronRight, Edit2, Pin } from 'lucide-react'
import { ChatStorage } from '@/lib/services/chat-storage'
import { RAGChatInterface } from '@/components/rag/rag-chat-interface'
import { SidebarSearch } from '@/components/chatbot/SidebarSearch'
import { FavoritesSection } from '@/components/chatbot/FavoritesSection'
import { ProjectsSection } from '@/components/chatbot/ProjectsSection'
import { HistorySection } from '@/components/chatbot/HistorySection'
import { ProjectDialog } from '@/components/chatbot/ProjectDialog'
import { MoveSessionDialog } from '@/components/chatbot/MoveSessionDialog'
import { DeleteConfirmDialog } from '@/components/chatbot/DeleteConfirmDialog'

const QUICK_PROMPTS = [
  {
    icon: '📊',
    title: 't-test 사용법',
    prompt: 't-test는 언제 사용하나요? 가정과 해석 방법을 알려주세요.',
  },
  {
    icon: '📈',
    title: 'ANOVA vs Regression',
    prompt: 'ANOVA와 회귀분석의 차이점은 무엇인가요?',
  },
  {
    icon: '🔍',
    title: '정규성 검정',
    prompt: '정규성 검정은 왜 필요하고 어떻게 해석하나요?',
  },
  {
    icon: '💡',
    title: '표본 크기 계산',
    prompt: '적절한 표본 크기는 어떻게 계산하나요?',
  },
]

export default function ChatbotPage() {
  // 세션 상태
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [forceUpdate, setForceUpdate] = useState(0)

  // 검색 상태
  const [searchQuery, setSearchQuery] = useState('')

  // 프로젝트 상태
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(new Set())

  // 사이드바 상태
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // 세션 이름 변경 상태
  const [isRenamingSessionId, setIsRenamingSessionId] = useState<string | null>(null)
  const [renamingText, setRenamingText] = useState('')

  // 모달 상태 (Phase 4에서 구현)
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false)
  const [moveDialogSessionId, setMoveDialogSessionId] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'session' | 'project'; id: string } | null>(null)

  // 데이터 로드 (useMemo로 성능 최적화)
  const { searchedProjects, searchedSessions } = useMemo(() => {
    if (!searchQuery.trim()) {
      return {
        searchedProjects: ChatStorage.getProjects(),
        searchedSessions: ChatStorage.loadSessions(),
      }
    }
    const result = ChatStorage.globalSearch(searchQuery)
    return {
      searchedProjects: result.projects,
      searchedSessions: result.sessions,
    }
  }, [searchQuery, forceUpdate])

  // 즐겨찾기 세션 (검색 필터 적용)
  const favoriteSessions = useMemo(() => {
    const favorites = ChatStorage.getFavoriteSessions()
    if (!searchQuery.trim()) return favorites

    const query = searchQuery.toLowerCase()
    return favorites.filter(session =>
      session.title.toLowerCase().includes(query)
    )
  }, [searchQuery, forceUpdate])

  // 히스토리 (프로젝트 미속 세션, 검색 필터 적용)
  const unorganizedSessions = useMemo(() => {
    const unorganized = ChatStorage.getUnorganizedSessions()
    if (!searchQuery.trim()) return unorganized

    const query = searchQuery.toLowerCase()
    return unorganized.filter(session =>
      session.title.toLowerCase().includes(query)
    )
  }, [searchQuery, forceUpdate])

  // 현재 세션
  const currentSession = useMemo(() => {
    if (!currentSessionId) return null
    return ChatStorage.loadSession(currentSessionId)
  }, [currentSessionId, forceUpdate])

  // 리렌더 트리거 (localStorage 변경 후 호출)
  const triggerUpdate = useCallback(() => {
    setForceUpdate((prev) => prev + 1)
  }, [])

  // 새 대화
  const handleNewChat = useCallback(() => {
    const newSession = ChatStorage.createNewSession()
    setCurrentSessionId(newSession.id)
    triggerUpdate()
  }, [triggerUpdate])

  // 세션 로드 후 초기 업데이트
  useEffect(() => {
    const loadedSessions = ChatStorage.loadSessions()

    // 첫 세션 자동 선택 또는 새 세션 생성
    if (loadedSessions.length > 0) {
      setCurrentSessionId(loadedSessions[0].id)
    } else {
      const newSession = ChatStorage.createNewSession()
      setCurrentSessionId(newSession.id)
      // 새로운 세션 생성 후 sidebar 업데이트 강제 (메모 재계산)
      setForceUpdate((prev) => prev + 1)
    }
  }, [])

  // 세션 선택
  const handleSelectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId)
  }, [])

  // 세션 삭제 (모달로 위임 - Phase 4)
  const handleDeleteSession = useCallback((sessionId: string) => {
    setDeleteTarget({ type: 'session', id: sessionId })
    setIsDeleteDialogOpen(true)
  }, [])

  // 즐겨찾기 토글
  const handleToggleFavorite = useCallback(
    (sessionId: string) => {
      ChatStorage.toggleFavorite(sessionId)
      triggerUpdate()
    },
    [triggerUpdate]
  )

  // 세션 이동 (모달로 위임 - Phase 4)
  const handleMoveSession = useCallback((sessionId: string) => {
    setMoveDialogSessionId(sessionId)
    setIsMoveDialogOpen(true)
  }, [])

  // 세션 이름 변경
  const handleRenameSession = useCallback((sessionId: string) => {
    const session = ChatStorage.loadSession(sessionId)
    if (session) {
      setIsRenamingSessionId(sessionId)
      setRenamingText(session.title)
    }
  }, [])

  // 세션 이름 저장
  const handleSaveRename = useCallback((sessionId: string) => {
    if (renamingText.trim()) {
      const session = ChatStorage.loadSession(sessionId)
      if (session) {
        session.title = renamingText.trim()
        session.updatedAt = Date.now()
        ChatStorage.saveSession(session)
        triggerUpdate()
      }
    }
    setIsRenamingSessionId(null)
    setRenamingText('')
  }, [renamingText, triggerUpdate])

  // 프로젝트 토글
  const handleToggleProject = useCallback((projectId: string) => {
    setExpandedProjectIds((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }, [])

  // 프로젝트 생성
  const handleCreateProject = useCallback(() => {
    setEditingProjectId(null)
    setIsProjectDialogOpen(true)
  }, [])

  // 프로젝트 편집
  const handleEditProject = useCallback((projectId: string) => {
    setEditingProjectId(projectId)
    setIsProjectDialogOpen(true)
  }, [])

  // 프로젝트 삭제 (모달로 위임 - Phase 4)
  const handleDeleteProject = useCallback((projectId: string) => {
    setDeleteTarget({ type: 'project', id: projectId })
    setIsDeleteDialogOpen(true)
  }, [])

  // 삭제 확인
  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return

    if (deleteTarget.type === 'session') {
      ChatStorage.deleteSession(deleteTarget.id)
      // 삭제한 세션이 현재 세션이면 새 세션 생성
      if (currentSessionId === deleteTarget.id) {
        handleNewChat()
      }
    } else {
      // 프로젝트 삭제 시: 현재 세션이 해당 프로젝트에 속했는지 확인
      const deletedProjectSessions = ChatStorage.getSessionsByProject(deleteTarget.id)
      ChatStorage.deleteProject(deleteTarget.id)

      // 현재 세션이 삭제된 프로젝트에 속했으면 루트로 이동되었으므로 UI 갱신만 필요
      // (세션 자체는 삭제되지 않고 projectId만 제거됨)
      const wasCurrentSessionInProject = deletedProjectSessions.some(s => s.id === currentSessionId)
      if (wasCurrentSessionInProject) {
        // triggerUpdate()로 UI가 갱신되면 자동으로 루트(히스토리)로 이동
      }
    }

    setIsDeleteDialogOpen(false)
    setDeleteTarget(null)
    triggerUpdate()
  }, [deleteTarget, currentSessionId, handleNewChat, triggerUpdate])

  // 키보드 단축키 (Ctrl+N: 새 대화)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        handleNewChat()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNewChat])

  // 퀵 프롬프트 클릭
  const handleQuickPrompt = useCallback((prompt: string) => {
    // RAGChatInterface에 전달할 초기 메시지로 사용
    // 실제 구현은 RAGChatInterface에서 처리
    console.log('Quick prompt:', prompt)
  }, [])

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Grok 스타일 사이드바 */}
      <aside className={`${sidebarCollapsed ? 'w-0' : 'w-64'} border-r bg-muted/10 flex flex-col transition-all duration-300 overflow-hidden`}>
        {/* 헤더 */}
        <div className="p-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold mb-3">대화 목록</h2>
          <Button onClick={handleNewChat} className="w-full bg-slate-700 hover:bg-slate-800 text-white" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            새 대화
          </Button>
        </div>

        {/* 검색 */}
        <div className="px-4 py-3 flex-shrink-0">
          <SidebarSearch
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
          />
        </div>

        {/* 스크롤 영역 */}
        <ScrollArea className="flex-1">
          {/* 즐겨찾기 섹션 */}
          <FavoritesSection
            sessions={favoriteSessions}
            activeSessionId={currentSessionId}
            onSelectSession={handleSelectSession}
            onToggleFavorite={handleToggleFavorite}
            onDeleteSession={handleDeleteSession}
            onMoveSession={handleMoveSession}
          />

          {/* 프로젝트 섹션 */}
          <ProjectsSection
            projects={searchedProjects}
            sessions={searchedSessions}
            activeSessionId={currentSessionId}
            expandedProjectIds={expandedProjectIds}
            onToggleProject={handleToggleProject}
            onSelectSession={handleSelectSession}
            onToggleFavorite={handleToggleFavorite}
            onDeleteSession={handleDeleteSession}
            onMoveSession={handleMoveSession}
            onEditProject={handleEditProject}
            onDeleteProject={handleDeleteProject}
            onCreateProject={handleCreateProject}
          />

          {/* 히스토리 섹션 */}
          <HistorySection
            sessions={unorganizedSessions}
            activeSessionId={currentSessionId}
            onSelectSession={handleSelectSession}
            onToggleFavorite={handleToggleFavorite}
            onDeleteSession={handleDeleteSession}
            onMoveSession={handleMoveSession}
          />
        </ScrollArea>

        {/* 푸터 */}
        <div className="p-4 border-t text-xs text-muted-foreground flex-shrink-0">
          <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Ctrl+N</kbd>{' '}
          새 대화
        </div>
      </aside>

      {/* 사이드바 토글 버튼 */}
      <div className="w-8 bg-muted/5 border-r flex items-center justify-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? '사이드바 열기' : '사이드바 닫기'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* 메인 채팅 영역 */}
      <main className="flex-1 flex flex-col">
        {currentSession ? (
          <>
            {/* 헤더 */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {isRenamingSessionId === currentSession.id ? (
                  <input
                    type="text"
                    value={renamingText}
                    onChange={(e) => setRenamingText(e.target.value)}
                    onBlur={() => handleSaveRename(currentSession.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveRename(currentSession.id)
                      } else if (e.key === 'Escape') {
                        setIsRenamingSessionId(null)
                      }
                    }}
                    className="flex-1 px-2 py-1 text-lg font-semibold border rounded bg-background"
                    autoFocus
                  />
                ) : (
                  <>
                    <h1 className="text-lg font-semibold truncate">{currentSession.title}</h1>
                    {currentSession.isFavorite && (
                      <Pin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </>
                )}
              </div>

              {/* 제목 변경 버튼 */}
              {isRenamingSessionId !== currentSession.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 ml-2"
                  onClick={() => handleRenameSession(currentSession.id)}
                  title="제목 변경"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}

              <Badge variant="outline" className="ml-auto flex-shrink-0">
                {currentSession.messages.length}개 메시지
              </Badge>
            </div>

            {/* 채팅 인터페이스 - 항상 표시, 빈 상태에서만 웰컴 문구 위에 퀵프롬프트 추가 표시 */}
            <RAGChatInterface
              sessionId={currentSession.id}
              onSessionUpdate={() => {
                // localStorage 업데이트 후 리렌더 트리거
                triggerUpdate()
              }}
              quickPrompts={currentSession.messages.length === 0 ? QUICK_PROMPTS : undefined}
              onQuickPrompt={handleQuickPrompt}
            />
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            세션을 선택하거나 새 대화를 시작하세요
          </div>
        )}
      </main>

      {/* 모달들 */}
      <ProjectDialog
        open={isProjectDialogOpen}
        onOpenChange={setIsProjectDialogOpen}
        projectId={editingProjectId}
        onComplete={triggerUpdate}
      />

      <MoveSessionDialog
        open={isMoveDialogOpen}
        onOpenChange={setIsMoveDialogOpen}
        sessionId={moveDialogSessionId}
        onComplete={triggerUpdate}
      />

      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        target={deleteTarget}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
