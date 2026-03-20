/**
 * AI 챗봇 전용 페이지 (Grok 스타일)
 *
 * 기능:
 * - Grok 스타일 사이드바 (검색, 즐겨찾기, 프로젝트, 히스토리)
 * - 프로젝트 관리 (생성, 편집, 삭제)
 * - 세션 이동 (프로젝트 간)
 * - 키보드 단축키 (Ctrl+N: 새 대화)
 */

'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, ChevronLeft, Edit2, MoreVertical, Pin, MapPin, FolderInput, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatStorageIndexedDB } from '@/lib/services/storage/chat-storage-indexed-db'
import type { ChatSession, ChatProject } from '@/lib/types/chat'
import { SidebarSearch } from '@/components/chatbot/SidebarSearch'
import { FavoritesSection } from '@/components/chatbot/FavoritesSection'
import { ProjectsSection } from '@/components/chatbot/ProjectsSection'
import { HistorySection } from '@/components/chatbot/HistorySection'
import { ProjectDialog } from '@/components/chatbot/ProjectDialog'
import { MoveSessionDialog } from '@/components/chatbot/MoveSessionDialog'
import { DeleteConfirmDialog } from '@/components/chatbot/DeleteConfirmDialog'

export default function ChatbotPage() {
  // 클라이언트 마운트 상태
  const [isMounted, setIsMounted] = useState(false)

  // 세션 상태
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [projects, setProjects] = useState<ChatProject[]>([])

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

  // 데이터 로드 (useMemo로 성능 최적화, 클라이언트에서만)
  const { searchedProjects, searchedSessions } = useMemo(() => {
    if (!isMounted) {
      return {
        searchedProjects: [],
        searchedSessions: [],
      }
    }

    if (!searchQuery.trim()) {
      return {
        searchedProjects: projects,
        searchedSessions: sessions,
      }
    }

    // 검색 필터링 (클라이언트 사이드)
    const query = searchQuery.toLowerCase()
    return {
      searchedProjects: projects.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
      ),
      searchedSessions: sessions.filter(s =>
        s.title.toLowerCase().includes(query)
      ),
    }
  }, [searchQuery, sessions, projects, isMounted])

  // 즐겨찾기 세션 (검색 필터 적용, 클라이언트에서만)
  const favoriteSessions = useMemo(() => {
    if (!isMounted) return []

    const favorites = sessions.filter(s => s.isFavorite && !s.isArchived)
    if (!searchQuery.trim()) return favorites

    const query = searchQuery.toLowerCase()
    return favorites.filter(session =>
      session.title.toLowerCase().includes(query)
    )
  }, [searchQuery, sessions, isMounted])

  // 히스토리 (프로젝트 미속 세션, 검색 필터 적용, 클라이언트에서만)
  const unorganizedSessions = useMemo(() => {
    if (!isMounted) return []

    const unorganized = sessions.filter(s => !s.projectId && !s.isArchived)
    if (!searchQuery.trim()) return unorganized

    const query = searchQuery.toLowerCase()
    return unorganized.filter(session =>
      session.title.toLowerCase().includes(query)
    )
  }, [searchQuery, sessions, isMounted])

  // 현재 세션 (클라이언트에서만)
  const currentSession = useMemo(() => {
    if (!isMounted || !currentSessionId) return null
    return sessions.find(s => s.id === currentSessionId) ?? null
  }, [currentSessionId, sessions, isMounted])

  // IndexedDB에서 데이터 다시 로드
  const reloadData = useCallback(async () => {
    const [loadedSessions, loadedProjects] = await Promise.all([
      ChatStorageIndexedDB.loadSessions(),
      ChatStorageIndexedDB.loadProjects(),
    ])
    setSessions(loadedSessions)
    setProjects(loadedProjects)
  }, [])

  // 새 대화
  const handleNewChat = useCallback(async () => {
    const newSession = await ChatStorageIndexedDB.createNewSession()
    setCurrentSessionId(newSession.id)
    await reloadData()
  }, [reloadData])

  // IndexedDB 초기화 및 데이터 로드
  useEffect(() => {
    const initializeData = async () => {
      try {
        await ChatStorageIndexedDB.initialize()
        const [loadedSessions, loadedProjects] = await Promise.all([
          ChatStorageIndexedDB.loadSessions(),
          ChatStorageIndexedDB.loadProjects(),
        ])
        setSessions(loadedSessions)
        setProjects(loadedProjects)

        // 첫 세션 자동 선택 또는 새 세션 생성
        if (loadedSessions.length > 0) {
          setCurrentSessionId(loadedSessions[0].id)
        } else {
          const newSession = await ChatStorageIndexedDB.createNewSession()
          setCurrentSessionId(newSession.id)
          setSessions([newSession])
        }

        setIsMounted(true)
      } catch (error) {
        console.error('Failed to initialize chatbot page:', error)
        setIsMounted(true)
      }
    }

    void initializeData()
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
    async (sessionId: string) => {
      await ChatStorageIndexedDB.toggleFavorite(sessionId)
      await reloadData()
    },
    [reloadData]
  )

  // 세션 이동 (모달로 위임 - Phase 4)
  const handleMoveSession = useCallback((sessionId: string) => {
    setMoveDialogSessionId(sessionId)
    setIsMoveDialogOpen(true)
  }, [])

  // 세션 제목 변경 시작
  const handleRenameSession = useCallback(async (sessionId: string) => {
    const session = await ChatStorageIndexedDB.loadSession(sessionId)
    if (session) {
      setIsRenamingSessionId(sessionId)
      setRenamingText(session.title)
    }
  }, [])

  // 세션 제목 저장
  const handleSaveRename = useCallback(async (sessionId: string) => {
    if (renamingText.trim()) {
      await ChatStorageIndexedDB.renameSession(sessionId, renamingText.trim())
      await reloadData()
    }
    setIsRenamingSessionId(null)
    setRenamingText('')
  }, [renamingText, reloadData])

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
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return

    if (deleteTarget.type === 'session') {
      await ChatStorageIndexedDB.deleteSession(deleteTarget.id)
      // 삭제한 세션이 현재 세션이면 새 세션 생성
      if (currentSessionId === deleteTarget.id) {
        await handleNewChat()
      } else {
        await reloadData()
      }
    } else {
      // 프로젝트 삭제: 하위 세션들의 projectId 제거 후 프로젝트 삭제
      const allSessions = await ChatStorageIndexedDB.loadAllSessions()
      const projectSessions = allSessions.filter(s => s.projectId === deleteTarget.id)

      // 각 세션의 projectId 제거
      for (const session of projectSessions) {
        await ChatStorageIndexedDB.saveSession({
          ...session,
          projectId: undefined,
        })
      }

      // IndexedDB에서 프로젝트 삭제
      await ChatStorageIndexedDB.deleteProject(deleteTarget.id)

      // 삭제한 프로젝트가 현재 프로젝트면 해제
      if (currentProjectId === deleteTarget.id) {
        setCurrentProjectId(null)
      }

      await reloadData()
    }

    setIsDeleteDialogOpen(false)
    setDeleteTarget(null)
  }, [deleteTarget, currentSessionId, currentProjectId, handleNewChat, reloadData])

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

  // 클라이언트 마운트 전에는 로딩 표시
  if (!isMounted) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Grok 스타일 사이드바 */}
      <aside className={`${sidebarCollapsed ? 'w-0' : 'w-72'} border-r bg-muted/10 flex-col transition-all duration-300 overflow-hidden hidden md:flex`}>
        {/* 헤더 - 새 대화 버튼만 */}
        <div className="h-16 px-4 flex items-center flex-shrink-0">
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
          <ChevronLeft className={cn(
            "h-4 w-4 transition-transform",
            sidebarCollapsed && "rotate-180"
          )} />
        </Button>
      </div>

      {/* 메인 영역 - 대화만 표시 (Grok 스타일) */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentSession ? (
          <>
            {/* 헤더 - 현재 대화 제목 + 3점 메뉴 */}
            <div className="px-4 h-16 border-b flex items-center justify-between gap-3 relative">
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

            {/* 채팅 인터페이스 (RAG 제거됨 — 추후 재구현 예정) */}
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              AI 챗봇 기능 준비 중
            </div>
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
        onComplete={() => void reloadData()}
      />

      <MoveSessionDialog
        open={isMoveDialogOpen}
        onOpenChange={setIsMoveDialogOpen}
        sessionId={moveDialogSessionId}
        onComplete={() => void reloadData()}
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
