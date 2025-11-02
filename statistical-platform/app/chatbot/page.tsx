/**
 * AI 챗봇 전용 페이지
 *
 * 기능:
 * - 세션 관리 사이드바 (새 대화, 삭제, 즐겨찾기, 이름 변경)
 * - RAG 챗봇 통합
 * - 퀵 프롬프트 (빈 상태)
 * - 키보드 단축키 (Ctrl+N: 새 대화)
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus,
  Star,
  Trash2,
  Edit2,
  Archive,
  MessageSquare,
  Sparkles,
  Check,
  X,
} from 'lucide-react'
import { ChatStorage } from '@/lib/services/chat-storage'
import type { ChatSession } from '@/lib/types/chat'
import { RAGChatInterface } from '@/components/rag/rag-chat-interface'
import { cn } from '@/lib/utils'
import { createNewChatSession, sortSessionsByFavoriteAndRecent } from '@/lib/utils/session-sorter'

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
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [archivedSessions, setArchivedSessions] = useState<ChatSession[]>([])

  // 세션 로드
  useEffect(() => {
    const loadedSessions = ChatStorage.loadSessions()
    const archived = ChatStorage.loadArchivedSessions()
    setSessions(loadedSessions)
    setArchivedSessions(archived)

    // 첫 세션 자동 선택 또는 새 세션 생성
    if (loadedSessions.length > 0) {
      setCurrentSessionId(loadedSessions[0].id)
    } else {
      const newSession = ChatStorage.createNewSession()
      setSessions([newSession])
      setCurrentSessionId(newSession.id)
    }
  }, [])

  // 현재 세션
  const currentSession = sessions.find((s) => s.id === currentSessionId) ?? null

  // 새 대화
  const handleNewChat = useCallback(() => {
    const { sessions: sortedSessions, newSessionId } = createNewChatSession()
    setSessions(sortedSessions)
    setCurrentSessionId(newSessionId)
  }, [])

  // 세션 선택
  const handleSelectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId)
    setEditingSessionId(null)
  }, [])

  // 세션 삭제
  const handleDeleteSession = useCallback((sessionId: string) => {
    ChatStorage.deleteSession(sessionId)
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))

    // 삭제한 세션이 현재 세션이면 다른 세션 선택
    if (currentSessionId === sessionId) {
      const remaining = sessions.filter((s) => s.id !== sessionId)
      if (remaining.length > 0) {
        setCurrentSessionId(remaining[0].id)
      } else {
        const newSession = ChatStorage.createNewSession()
        setSessions([newSession])
        setCurrentSessionId(newSession.id)
      }
    }
  }, [currentSessionId, sessions])

  // 즐겨찾기 토글
  const handleToggleFavorite = useCallback((sessionId: string) => {
    ChatStorage.toggleFavorite(sessionId)
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === sessionId ? { ...s, isFavorite: !s.isFavorite } : s
      )
      // 즐겨찾기 순으로 재정렬
      return sortSessionsByFavoriteAndRecent(updated)
    })
  }, [])

  // 이름 변경 시작
  const handleStartRename = useCallback((session: ChatSession) => {
    setEditingSessionId(session.id)
    setEditTitle(session.title)
  }, [])

  // 이름 변경 완료
  const handleConfirmRename = useCallback(() => {
    if (!editingSessionId) return

    ChatStorage.renameSession(editingSessionId, editTitle)
    setSessions((prev) =>
      prev.map((s) =>
        s.id === editingSessionId ? { ...s, title: editTitle.trim() || '제목 없음' } : s
      )
    )
    setEditingSessionId(null)
    setEditTitle('')
  }, [editingSessionId, editTitle])

  // 이름 변경 취소
  const handleCancelRename = useCallback(() => {
    setEditingSessionId(null)
    setEditTitle('')
  }, [])

  // 세션 보관
  const handleArchiveSession = useCallback((sessionId: string) => {
    ChatStorage.toggleArchive(sessionId)
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    setArchivedSessions((prev) => {
      const archived = ChatStorage.loadArchivedSessions()
      return archived
    })

    // 보관한 세션이 현재 세션이면 다른 세션 선택
    if (currentSessionId === sessionId) {
      const remaining = sessions.filter((s) => s.id !== sessionId)
      if (remaining.length > 0) {
        setCurrentSessionId(remaining[0].id)
      } else {
        const newSession = ChatStorage.createNewSession()
        setSessions([newSession])
        setCurrentSessionId(newSession.id)
      }
    }
  }, [currentSessionId, sessions])

  // 보관된 세션 복구
  const handleRestoreSession = useCallback((sessionId: string) => {
    ChatStorage.toggleArchive(sessionId)
    setArchivedSessions((prev) => prev.filter((s) => s.id !== sessionId))
    // 복구된 세션을 목록에 추가
    const restored = ChatStorage.loadSession(sessionId)
    if (restored) {
      setSessions((prev) => [restored, ...prev])
      setCurrentSessionId(sessionId)
    }
  }, [])

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
      {/* 세션 관리 사이드바 */}
      <aside className="w-64 border-r bg-muted/10 flex flex-col">
        <div className="p-4 border-b">
          <Button onClick={handleNewChat} className="w-full" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            새 대화
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <p>대화 내역이 없습니다.</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    'group relative rounded-md transition-colors',
                    currentSessionId === session.id
                      ? 'bg-primary/10'
                      : 'hover:bg-muted/50'
                  )}
                >
                  {editingSessionId === session.id ? (
                    // 이름 변경 모드
                    <div className="flex items-center gap-1 p-2">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleConfirmRename()
                          } else if (e.key === 'Escape') {
                            handleCancelRename()
                          }
                        }}
                        className="h-7 text-sm"
                        autoFocus
                      />
                      <Button
                        onClick={handleConfirmRename}
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={handleCancelRename}
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    // 일반 모드
                    <div
                      onClick={() => handleSelectSession(session.id)}
                      className="flex items-center gap-2 p-2 cursor-pointer"
                    >
                      <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {session.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {session.messages.length}개 메시지
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleFavorite(session.id)
                          }}
                          title={session.isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
                        >
                          <Star
                            className={cn(
                              'h-3.5 w-3.5',
                              session.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                            )}
                          />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStartRename(session)
                          }}
                          title="이름 변경"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleArchiveSession(session.id)
                          }}
                          title="보관"
                        >
                          <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteSession(session.id)
                          }}
                          title="삭제"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* 보관함 섹션 */}
        {archivedSessions.length > 0 && (
          <div className="border-t p-2 space-y-1">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="w-full text-left text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5"
            >
              📦 보관함 ({archivedSessions.length})
            </button>

            {showArchived && (
              <div className="space-y-1 px-1">
                {archivedSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-1 p-1.5 rounded text-xs hover:bg-muted/30 group"
                  >
                    <Archive className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="flex-1 min-w-0 truncate text-muted-foreground">
                      {session.title}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100"
                      onClick={() => handleRestoreSession(session.id)}
                      title="복구"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-4 border-t text-xs text-muted-foreground">
          <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Ctrl+N</kbd>{' '}
          새 대화
        </div>
      </aside>

      {/* 메인 채팅 영역 */}
      <main className="flex-1 flex flex-col">
        {currentSession ? (
          <>
            {/* 헤더 */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">{currentSession.title}</h1>
                {currentSession.isFavorite && (
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                )}
              </div>
              <Badge variant="outline">
                {currentSession.messages.length}개 메시지
              </Badge>
            </div>

            {/* 채팅 인터페이스 */}
            <div className="flex-1 overflow-hidden">
              {currentSession.messages.length === 0 ? (
                // 빈 상태: 퀵 프롬프트
                <div className="h-full flex flex-col items-center justify-center p-8">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">
                      무엇을 도와드릴까요?
                    </h2>
                    <p className="text-muted-foreground">
                      통계 분석에 대해 궁금한 점을 물어보세요
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 max-w-2xl w-full">
                    {QUICK_PROMPTS.map((prompt, idx) => (
                      <Card
                        key={idx}
                        className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleQuickPrompt(prompt.prompt)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">{prompt.icon}</div>
                          <div>
                            <div className="font-medium mb-1">{prompt.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {prompt.prompt}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                // 채팅 인터페이스
                <RAGChatInterface
                  sessionId={currentSession.id}
                  onSessionUpdate={(updatedSession) => {
                    setSessions((prev) =>
                      prev.map((s) =>
                        s.id === updatedSession.id ? updatedSession : s
                      )
                    )
                  }}
                />
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            세션을 선택하거나 새 대화를 시작하세요
          </div>
        )}
      </main>
    </div>
  )
}
