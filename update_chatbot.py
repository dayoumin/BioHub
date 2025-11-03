import re

file_path = "d:/Projects/Statics/statistical-platform/app/chatbot/page.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Import 수정
content = re.sub(
    r"import { Plus, Star, Sparkles } from 'lucide-react'",
    "import { Plus, Sparkles, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react'",
    content
)

# 2. 상태 추가 (expandedProjectIds 다음에)
expanded_state = "  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(new Set())"
new_states = """  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(new Set())

  // 사이드바 상태
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // 세션 이름 변경 상태
  const [isRenamingSessionId, setIsRenamingSessionId] = useState<string | null>(null)
  const [renamingText, setRenamingText] = useState('')"""
content = content.replace(expanded_state, new_states)

# 3. 세션 이름 변경 핸들러 추가 (handleMoveSession 다음에)
handle_move = """  // 세션 이동 (모달로 위임 - Phase 4)
  const handleMoveSession = useCallback((sessionId: string) => {
    setMoveDialogSessionId(sessionId)
    setIsMoveDialogOpen(true)
  }, [])"""

new_handlers = """  // 세션 이동 (모달로 위임 - Phase 4)
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
  }, [renamingText, triggerUpdate])"""

content = content.replace(handle_move, new_handlers)

# 4. 사이드바 너비 수정
content = re.sub(
    r'<aside className="w-64 border-r bg-muted/10 flex flex-col">',
    '<aside className={`${sidebarCollapsed ? \'w-0\' : \'w-64\'} border-r bg-muted/10 flex flex-col transition-all duration-300 overflow-hidden`}>',
    content
)

# 5. 새 대화 버튼 스타일 개선
content = re.sub(
    r'<Button onClick={handleNewChat} className="w-full" size="sm">',
    '<Button onClick={handleNewChat} className="w-full bg-slate-700 hover:bg-slate-800 text-white" size="sm">',
    content
)

# 6. 헤더 Star 아이콘 → 핀 이모지로 변경
content = re.sub(
    r'{currentSession\.isFavorite && \(\s*<Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />\s*\)}',
    '{currentSession.isFavorite && (\n                  <span className="text-muted-foreground">📌</span>\n                )}',
    content
)

# 7. 제목 입력 및 수정 버튼 추가
header_section = """            {/* 헤더 */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">{currentSession.title}</h1>
                {currentSession.isFavorite && (
                  <span className="text-muted-foreground">📌</span>
                )}
              </div>
              <Badge variant="outline">
                {currentSession.messages.length}개 메시지
              </Badge>
            </div>"""

new_header_section = """            {/* 헤더 */}
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
                      <span className="text-muted-foreground flex-shrink-0">📌</span>
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
            </div>"""

content = content.replace(header_section, new_header_section)

# 8. 사이드바 토글 버튼 추가 (aside 다음에)
sidebar_end = "      </aside>"
toggle_button = """      </aside>

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
      </div>"""

content = content.replace(sidebar_end, toggle_button)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("File updated successfully!")
