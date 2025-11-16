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

export const dynamic = 'force-dynamic'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, ChevronLeft, ChevronRight, Edit2, MoreVertical, Pin, MapPin, FolderInput, Trash2 } from 'lucide-react'
import { ChatStorage } from '@/lib/services/chat-storage'
import { RAGChatInterface } from '@/components/rag/rag-chat-interface'
import { SidebarSearch } from '@/components/chatbot/SidebarSearch'
import { FavoritesSection } from '@/components/chatbot/FavoritesSection'
import { ProjectsSection } from '@/components/chatbot/ProjectsSection'
import { HistorySection } from '@/components/chatbot/HistorySection'
import { ProjectDialog } from '@/components/chatbot/ProjectDialog'
import { MoveSessionDialog } from '@/components/chatbot/MoveSessionDialog'
import { DeleteConfirmDialog } from '@/components/chatbot/DeleteConfirmDialog'
import { DocumentManagerDialog } from '@/components/chatbot/document-manager-dialog'

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

  // 제목 편집 상태
  const [isRenamingSessionId, setIsRenamingSessionId] = useState<string | null>(null)
  const [renamingText, setRenamingText] = useState('')

  // 드롭다운 메뉴 상태
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 모달 상태
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false)
  const [moveDialogSessionId, setMoveDialogSessionId] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'session' | 'project'; id: string } | null>(null)
  const [isDocManagerOpen, setIsDocManagerOpen] = useState(false)

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
    setForceUpdate((prev) => (prev + 1) % 1000)
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

  // 세션 제목 변경 시작
  const handleRenameSession = useCallback((sessionId: string) => {
    const session = ChatStorage.loadSession(sessionId)
    if (session) {
      setIsRenamingSessionId(sessionId)
      setRenamingText(session.title)
    }
  }, [])

  // 세션 제목 저장
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

  // 드롭다운 메뉴 외부 클릭 처리
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isMenuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMenuOpen])

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
        {/* 헤더 - 새 대화 버튼만 */}
        <div className="p-4 flex-shrink-0">
          <Button onClick={handleNewChat} variant="ghost" size="sm" className="w-full justify-start text-slate-600 hover:text-slate-800 hover:bg-transparent gap-2">
            <Plus className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">새 대화</span>
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
      </aside>

      {/* 사이드바 토글 버튼 */}
      <div className="w-8 flex items-center justify-center group hover:bg-muted/10 transition-colors">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-60 group-hover:opacity-100 transition-opacity"
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

      {/* 메인 영역 - 3-탭 구조 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <ChatbotTabs
          conversationsContent={
            currentSession ? (
              <>
                {/* 헤더 - 현재 대화 제목 + 3점 메뉴 */}
                <div className="px-4 py-3 border-b flex items-center justify-between gap-3 relative">
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
                      className="flex-1 px-2 py-1 text-sm border rounded bg-background"
                      autoFocus
                    />
                  ) : (
                    <>
                      <span className="text-sm text-muted-foreground flex-1 truncate">
                        {currentSession.title}
                      </span>

                      {/* 3점 메뉴 버튼 */}
                      <div ref={menuRef} className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={() => setIsMenuOpen(!isMenuOpen)}
                          title="옵션"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>

                        {/* 드롭다운 메뉴 */}
                        {isMenuOpen && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-popover border rounded-md shadow-lg z-50 py-1">
                            {/* 즐겨찾기 토글 */}
                            <button
                              type="button"
                              onClick={() => {
                                handleToggleFavorite(currentSession.id)
                                setIsMenuOpen(false)
                              }}
                              className="w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors flex items-center gap-2"
                            >
                              {currentSession.isFavorite ? (
                                <>
                                  <Pin className="h-4 w-4" />
                                  <span>즐겨찾기 해제</span>
                                </>
                              ) : (
                                <>
                                  <MapPin className="h-4 w-4" />
                                  <span>즐겨찾기 추가</span>
                                </>
                              )}
                            </button>

                            {/* 이름 변경 */}
                            <button
                              type="button"
                              onClick={() => {
                                handleRenameSession(currentSession.id)
                                setIsMenuOpen(false)
                              }}
                              className="w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors flex items-center gap-2"
                            >
                              <Edit2 className="h-4 w-4" />
                              <span>이름 변경</span>
                            </button>

                            {/* 프로젝트 이동 */}
                            <button
                              type="button"
                              onClick={() => {
                                handleMoveSession(currentSession.id)
                                setIsMenuOpen(false)
                              }}
                              className="w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors flex items-center gap-2"
                            >
                              <FolderInput className="h-4 w-4" />
                              <span>프로젝트 이동</span>
                            </button>

                            {/* 삭제 */}
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteSession(currentSession.id)
                                setIsMenuOpen(false)
                              }}
                              className="w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors flex items-center gap-2 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>삭제</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* 채팅 인터페이스 */}
                <RAGChatInterface
                  sessionId={currentSession.id}
                  onSessionUpdate={() => {
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
            )
          }
          documentsContent={
            <div className="h-full">
              <DocumentManager />
            </div>
          }
          settingsContent={<SettingsTab />}
        />
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
