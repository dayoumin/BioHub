import re

file_path = "d:/Projects/Statics/statistical-platform/app/chatbot/page.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 리스트로 라인별로 처리
result_lines = []
skip_until_modal = False

for i, line in enumerate(lines):
    # 1. Import 줄 수정
    if "import { Plus, Star, Sparkles } from 'lucide-react'" in line:
        line = line.replace("import { Plus, Star, Sparkles }", "import { Plus, Sparkles, ChevronLeft, ChevronRight, Edit2 }")
    
    # 2. expandedProjectIds 다음에 새로운 상태 추가
    if "const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(new Set())" in line:
        result_lines.append(line)
        result_lines.append("\n")
        result_lines.append("  // 사이드바 상태\n")
        result_lines.append("  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)\n")
        result_lines.append("\n")
        result_lines.append("  // 세션 이름 변경 상태\n")
        result_lines.append("  const [isRenamingSessionId, setIsRenamingSessionId] = useState<string | null>(null)\n")
        result_lines.append("  const [renamingText, setRenamingText] = useState('')\n")
        continue
    
    # 3. 새 대화 버튼 스타일 개선
    if '<Button onClick={handleNewChat} className="w-full" size="sm">' in line:
        line = line.replace('<Button onClick={handleNewChat} className="w-full" size="sm">', '<Button onClick={handleNewChat} className="w-full bg-slate-700 hover:bg-slate-800 text-white" size="sm">')
    
    # 4. 즐겨찾기 Star 아이콘 → 핀 이모지
    if '<Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />' in line:
        line = line.replace('<Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />', '<span className="text-muted-foreground">📌</span>')
    
    # 5. aside 태그 동적 클래스 수정
    if '<aside className="w-64 border-r bg-muted/10 flex flex-col">' in line:
        line = line.replace('<aside className="w-64 border-r bg-muted/10 flex flex-col">', '<aside className={`${sidebarCollapsed ? \'w-0\' : \'w-64\'} border-r bg-muted/10 flex flex-col transition-all duration-300 overflow-hidden`}>')
    
    result_lines.append(line)
    
    # 6. handleMoveSession 다음에 핸들러 함수 추가
    if "}, [])" in line and i > 0:
        # handleMoveSession 인지 확인
        prev_context = ''.join(lines[max(0, i-5):i+1])
        if "handleMoveSession" in prev_context and "handleRenameSession" not in prev_context:
            result_lines.append("\n")
            result_lines.append("  // 세션 이름 변경\n")
            result_lines.append("  const handleRenameSession = useCallback((sessionId: string) => {\n")
            result_lines.append("    const session = ChatStorage.loadSession(sessionId)\n")
            result_lines.append("    if (session) {\n")
            result_lines.append("      setIsRenamingSessionId(sessionId)\n")
            result_lines.append("      setRenamingText(session.title)\n")
            result_lines.append("    }\n")
            result_lines.append("  }, [])\n")
            result_lines.append("\n")
            result_lines.append("  // 세션 이름 저장\n")
            result_lines.append("  const handleSaveRename = useCallback((sessionId: string) => {\n")
            result_lines.append("    if (renamingText.trim()) {\n")
            result_lines.append("      const session = ChatStorage.loadSession(sessionId)\n")
            result_lines.append("      if (session) {\n")
            result_lines.append("        session.title = renamingText.trim()\n")
            result_lines.append("        session.updatedAt = Date.now()\n")
            result_lines.append("        ChatStorage.saveSession(session)\n")
            result_lines.append("        triggerUpdate()\n")
            result_lines.append("      }\n")
            result_lines.append("    }\n")
            result_lines.append("    setIsRenamingSessionId(null)\n")
            result_lines.append("    setRenamingText('')\n")
            result_lines.append("  }, [renamingText, triggerUpdate])\n")

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(result_lines)

print("Step 1: Basic updates completed!")
