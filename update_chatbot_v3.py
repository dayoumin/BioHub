import re

file_path = "d:/Projects/Statics/statistical-platform/app/chatbot/page.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 헤더 부분 교체 - 더 정확한 패턴 사용
old_header = """            {/* 헤더 */}
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

new_header = """            {/* 헤더 */}
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

content = content.replace(old_header, new_header)

# 2. 사이드바 토글 버튼 추가
old_aside_end = """      </aside>

      {/* 메인 채팅 영역 */}"""

new_aside_end = """      </aside>

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

      {/* 메인 채팅 영역 */}"""

content = content.replace(old_aside_end, new_aside_end)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Step 2: Header and toggle button updates completed!")
