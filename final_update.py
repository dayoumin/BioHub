#!/usr/bin/env python3
import re

file_path = "d:/Projects/Statics/statistical-platform/app/chatbot/page.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Import 수정 - Star 제거, 새 아이콘 추가
content = re.sub(
    r"import { Plus, Star, Sparkles } from 'lucide-react'",
    "import { Plus, Sparkles, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react'",
    content
)

# 2. 상태 추가 - expandedProjectIds 이후
old_states = "  // 모달 상태 (Phase 4에서 구현)"
new_states = """  // 사이드바 상태
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // 세션 이름 변경 상태
  const [isRenamingSessionId, setIsRenamingSessionId] = useState<string | null>(null)
  const [renamingText, setRenamingText] = useState('')

  // 모달 상태 (Phase 4에서 구현)"""

content = content.replace(old_states, new_states)

# 3. 핸들러 함수 추가
handlers_insert_point = "  // 프로젝트 토글"
new_handlers = """  // 세션 이름 변경
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

  // 프로젝트 토글"""

content = content.replace(handlers_insert_point, new_handlers)

# 4. aside 태그 수정 - 동적 너비
content = re.sub(
    r'<aside className="w-64 border-r bg-muted/10 flex flex-col">',
    '<aside className={`${sidebarCollapsed ? \'w-0\' : \'w-64\'} border-r bg-muted/10 flex flex-col transition-all duration-300 overflow-hidden`}>',
    content
)

# 5. 사이드바 헤더 flex-shrink 추가
content = re.sub(
    r'<div className="p-4 border-b">\s*<h2 className="text-lg font-semibold mb-3">대화 목록</h2>',
    '<div className="p-4 border-b flex-shrink-0">\n          <h2 className="text-lg font-semibold mb-3">대화 목록</h2>',
    content
)

# 6. 사이드바 검색 flex-shrink 추가
content = re.sub(
    r'<div className="px-4 py-3">\s*<SidebarSearch',
    '<div className="px-4 py-3 flex-shrink-0">\n          <SidebarSearch',
    content
)

# 7. 사이드바 푸터 flex-shrink 추가
content = re.sub(
    r'<div className="p-4 border-t text-xs text-muted-foreground">\s*<kbd',
    '<div className="p-4 border-t text-xs text-muted-foreground flex-shrink-0">\n          <kbd',
    content
)

# 8. 헤더 부분 - Star → 핀 이모지
content = re.sub(
    r'{currentSession\.isFavorite && \(\s*<Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />\s*\)}',
    '{currentSession.isFavorite && (\n                  <span className="text-muted-foreground">📌</span>\n                )}',
    content
)

# 9. 전체 헤더 섹션 교체
old_header = """            <div className="p-4 border-b flex items-center justify-between">
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

new_header = """            <div className="p-4 border-b flex items-center justify-between">
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

content = content.replace(old_header, new_header)

# 10. 사이드바 토글 버튼 추가
sidebar_close = "      </aside>"
toggle_section = """      </aside>

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

content = content.replace(sidebar_close, toggle_section)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("All updates completed successfully!")
