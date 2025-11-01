# 플로팅 챗봇 구현 계획서 (Intercom 스타일)

**작성일**: 2025-11-02
**업데이트**: 2025-11-02 (플로팅 버튼 방식으로 변경)
**목적**: 전역 플로팅 챗봇으로 통계 분석 도우미 제공
**예상 시간**: 2-3시간

---

## 📊 개요

### 목표
**ChatGPT 스타일 플로팅 챗봇**을 통해 모든 페이지에서 즉시 접근 가능한 통계 도우미 제공:
- ✅ 기존 RAG 시스템 100% 재사용
- ✅ 우측 하단 플로팅 버튼 (🤖)
- ✅ 클릭 시 팝업 (400×600px, 모바일 전체 화면)
- ✅ 세션 관리 (새 대화, 삭제, 즐겨찾기, 이름 변경)

### 기존 시스템 재사용
- **RAGService** (`lib/rag/rag-service.ts`): 완성 ✅
- **useRAGAssistant** Hook (`lib/rag/hooks/use-rag-assistant.ts`): 완성 ✅
- **RAGAssistant** 컴포넌트 (`components/rag/rag-assistant.tsx`): 완성 ✅
- **Vector Store**: 111개 통계 문서 임베딩 완료 ✅

→ **새 코드는 100줄만 추가!**

---

## 🎨 UI/UX 설계

### 플로팅 버튼 위치

```
                    통계 분석 페이지
┌─────────────────────────────────────────┐
│  Header: 통계 분석 플랫폼                │
├─────────────────────────────────────────┤
│                                         │
│  t-검정 결과                             │
│  ┌─────────────────┐                    │
│  │ 평균: 52.3      │                    │
│  │ p-value: 0.032  │                    │
│  └─────────────────┘                    │
│                                         │
│  [차트 표시 영역]                        │
│                                         │
│                                         │
│                                         │
│                              [🤖] ← 플로팅 버튼
└─────────────────────────────────────────┘
   우측 하단 고정 (bottom: 24px, right: 24px)
```

### 팝업 열린 상태 (데스크탑)

```
┌─────────────────────────────────────────┐
│  통계 분석 페이지                        │
│                                         │
│  t-검정 결과     ┌──────────────────┐  │
│  평균: 52.3      │ RAG 도우미    [X]│  │
│  p-value: 0.032  ├──────────────────┤  │
│                  │ 🤖 AI:           │  │
│                  │ p-value는 귀무가설│ │
│                  │ 을 기각할 확률... │  │
│                  │                  │  │
│                  │ 👤 사용자:       │  │
│                  │ p-value란?       │  │
│                  │                  │  │
│                  │ [💬 질문 입력]   │  │
│                  │                  │  │
│                  │ [⚙️] [⭐] [📋]   │  │
│                  └──────────────────┘  │
│                         [🤖] (숨김)     │
└─────────────────────────────────────────┘
        팝업 크기: 400px × 600px
```

### 팝업 상단 바 (액션 버튼)

```
┌──────────────────────────────────────┐
│ RAG 도우미              [⚙️] [⭐] [X] │
├──────────────────────────────────────┤
│                                      │
│  대화 내용 (스크롤 가능)              │
│                                      │
└──────────────────────────────────────┘

[⚙️] 설정: 모델 선택, Vector Store 선택
[⭐] 즐겨찾기: 현재 대화 즐겨찾기 토글
[X] 닫기
```

### 하단 입력창 (확장 기능)

```
┌──────────────────────────────────────┐
│                                      │
│  대화 내용                            │
│                                      │
├──────────────────────────────────────┤
│ [📎] [🗂️] [💬 질문 입력...]    [↑] │
└──────────────────────────────────────┘

[📎] 파일 업로드: CSV/Excel 데이터 분석
[🗂️] 세션 관리: 대화 목록, 즐겨찾기, 삭제
[↑] 전송 버튼
```

---

## 🔧 세션 관리 기능 (ChatGPT 스타일)

### 1. 세션 구조

```typescript
interface ChatSession {
  id: string                    // UUID
  title: string                 // "신약 효과 연구 설계" (첫 메시지 요약)
  messages: Message[]           // 대화 내역
  created: Date                 // 생성 시간
  updated: Date                 // 마지막 수정
  isFavorite: boolean           // ⭐ 즐겨찾기 여부
  isArchived: boolean           // 📦 아카이브 여부
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: SourceDocument[]    // AI 응답의 참조 문서
}
```

### 2. 세션 관리 UI (🗂️ 버튼 클릭 시)

**모달 레이아웃**:

```
┌────────────────────────────────────────┐
│ 대화 관리                         [X]  │
├────────────────────────────────────────┤
│ [+ 새 대화]            [즐겨찾기 ▼]    │
├────────────────────────────────────────┤
│                                        │
│ ⭐ 즐겨찾기 (2)                        │
│ ┌────────────────────────────────┐    │
│ │ 📌 신약 효과 연구 설계         │ ...│
│ │    2025-11-02 14:30           │    │
│ └────────────────────────────────┘    │
│ ┌────────────────────────────────┐    │
│ │ 📌 ANOVA 가정 검증 방법        │ ...│
│ │    2025-11-01 09:15           │    │
│ └────────────────────────────────┘    │
│                                        │
│ 📅 최근 대화 (5)                       │
│ ┌────────────────────────────────┐    │
│ │ t-test p-value 해석            │ ...│
│ │    2025-11-02 10:20           │    │
│ └────────────────────────────────┘    │
│ ┌────────────────────────────────┐    │
│ │ 정규성 검정 방법               │ ...│
│ │    2025-11-01 16:45           │    │
│ └────────────────────────────────┘    │
│                                        │
│ 📦 아카이브 (12)                  [→] │
└────────────────────────────────────────┘
```

### 3. 세션 카드 액션 (... 버튼 클릭 시)

```
┌────────────────────────────┐
│ ✏️  이름 변경              │
│ ⭐  즐겨찾기 토글          │
│ 📦  아카이브               │
│ 🗑️  삭제                  │
└────────────────────────────┘
```

### 4. 세션 관리 기능 목록

| 기능 | 아이콘 | 설명 | 단축키 |
|------|--------|------|--------|
| **새 대화** | ➕ | 현재 세션 저장 후 빈 대화 시작 | Ctrl+N |
| **세션 로드** | 📄 | 저장된 대화 불러오기 | - |
| **이름 변경** | ✏️ | 세션 제목 수정 (기본: 첫 메시지 요약) | - |
| **즐겨찾기** | ⭐ | 중요한 대화 별도 표시 | - |
| **아카이브** | 📦 | 오래된 대화 보관 (목록에서 숨김) | - |
| **삭제** | 🗑️ | 세션 영구 삭제 (확인 모달) | - |
| **검색** | 🔍 | 세션 제목/내용 검색 | Ctrl+F |

---

## 🛠️ 구현 계획 (2-3시간)

### Phase 1: 플로팅 버튼 + 기본 팝업 (1시간)

#### Step 1: FloatingChatbot 컴포넌트 생성 (30분)

**새 파일**: `components/rag/floating-chatbot.tsx`

```tsx
'use client'

import { useState } from 'react'
import { MessageCircle, X, Settings, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RAGAssistant } from './rag-assistant'
import { cn } from '@/lib/utils'

export function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* 팝업 (Intercom 스타일) */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-50 shadow-2xl rounded-lg overflow-hidden border bg-background",
            "bottom-24 right-6 w-96 h-[600px]",           // 데스크탑
            "max-md:inset-0 max-md:w-full max-md:h-full max-md:bottom-0 max-md:right-0 max-md:rounded-none" // 모바일
          )}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold">RAG 도우미</h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" title="설정">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="즐겨찾기">
                <Star className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 기존 RAGAssistant 재사용! */}
          <div className="h-[calc(100%-64px)]">
            <RAGAssistant className="h-full" />
          </div>
        </div>
      )}

      {/* 플로팅 버튼 (우측 하단) */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
          size="icon"
          title="RAG 도우미 열기"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}
    </>
  )
}
```

#### Step 2: Layout에 통합 (10분)

**파일**: `app/layout.tsx`

```tsx
import { FloatingChatbot } from '@/components/rag/floating-chatbot'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        {children}

        {/* 전역 플로팅 챗봇 */}
        <FloatingChatbot />
      </body>
    </html>
  )
}
```

#### Step 3: 초기 테스트 (20분)

- [ ] 브라우저에서 🤖 버튼 표시 확인
- [ ] 버튼 클릭 → 팝업 열림
- [ ] 질문 입력 → Ollama 응답
- [ ] 모바일 크기로 축소 → 전체 화면 전환

---

### Phase 2: 세션 관리 UI (1.5시간)

#### Step 1: ChatStorage 클래스 구현 (30분)

**새 파일**: `lib/rag/chat-storage.ts`

```typescript
interface ChatSession {
  id: string
  title: string
  messages: Message[]
  created: Date
  updated: Date
  isFavorite: boolean
  isArchived: boolean
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: string[]
}

export class ChatStorage {
  private static STORAGE_KEY = 'rag-chat-sessions'
  private static CURRENT_SESSION_KEY = 'rag-current-session-id'

  /**
   * 모든 세션 로드 (아카이브 제외)
   */
  static loadSessions(): ChatSession[] {
    const data = localStorage.getItem(this.STORAGE_KEY)
    if (!data) return []

    const sessions: ChatSession[] = JSON.parse(data)
    return sessions
      .filter(s => !s.isArchived)
      .sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())
  }

  /**
   * 즐겨찾기 세션만 로드
   */
  static loadFavorites(): ChatSession[] {
    return this.loadSessions().filter(s => s.isFavorite)
  }

  /**
   * 아카이브 세션 로드
   */
  static loadArchived(): ChatSession[] {
    const data = localStorage.getItem(this.STORAGE_KEY)
    if (!data) return []

    const sessions: ChatSession[] = JSON.parse(data)
    return sessions
      .filter(s => s.isArchived)
      .sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())
  }

  /**
   * 세션 저장
   */
  static saveSession(session: ChatSession): void {
    const sessions = this.loadAllSessions()
    const index = sessions.findIndex(s => s.id === session.id)

    if (index >= 0) {
      sessions[index] = session
    } else {
      sessions.push(session)
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions))
  }

  /**
   * 세션 삭제
   */
  static deleteSession(id: string): void {
    const sessions = this.loadAllSessions().filter(s => s.id !== id)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions))

    // 현재 세션이었다면 초기화
    if (this.getCurrentSessionId() === id) {
      localStorage.removeItem(this.CURRENT_SESSION_KEY)
    }
  }

  /**
   * 즐겨찾기 토글
   */
  static toggleFavorite(id: string): void {
    const sessions = this.loadAllSessions()
    const session = sessions.find(s => s.id === id)
    if (session) {
      session.isFavorite = !session.isFavorite
      session.updated = new Date()
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions))
    }
  }

  /**
   * 아카이브 토글
   */
  static toggleArchive(id: string): void {
    const sessions = this.loadAllSessions()
    const session = sessions.find(s => s.id === id)
    if (session) {
      session.isArchived = !session.isArchived
      session.updated = new Date()
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions))
    }
  }

  /**
   * 세션 이름 변경
   */
  static renameSession(id: string, newTitle: string): void {
    const sessions = this.loadAllSessions()
    const session = sessions.find(s => s.id === id)
    if (session) {
      session.title = newTitle
      session.updated = new Date()
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions))
    }
  }

  /**
   * 현재 세션 ID 가져오기
   */
  static getCurrentSessionId(): string | null {
    return localStorage.getItem(this.CURRENT_SESSION_KEY)
  }

  /**
   * 현재 세션 ID 설정
   */
  static setCurrentSessionId(id: string): void {
    localStorage.setItem(this.CURRENT_SESSION_KEY, id)
  }

  /**
   * 세션 제목 자동 생성 (첫 메시지 요약)
   */
  static generateTitle(firstMessage: string): string {
    // 첫 50자만 사용
    const title = firstMessage.slice(0, 50).trim()
    return title.length < firstMessage.length ? `${title}...` : title
  }

  /**
   * 세션 검색
   */
  static searchSessions(query: string): ChatSession[] {
    const sessions = this.loadAllSessions()
    const lowerQuery = query.toLowerCase()

    return sessions.filter(session =>
      session.title.toLowerCase().includes(lowerQuery) ||
      session.messages.some(msg => msg.content.toLowerCase().includes(lowerQuery))
    )
  }

  /**
   * 모든 세션 로드 (아카이브 포함)
   */
  private static loadAllSessions(): ChatSession[] {
    const data = localStorage.getItem(this.STORAGE_KEY)
    return data ? JSON.parse(data) : []
  }
}
```

---

#### Step 2: SessionManager 컴포넌트 (40분)

**새 파일**: `components/rag/session-manager.tsx`

```tsx
'use client'

import { useState } from 'react'
import { Plus, Star, Archive, Trash2, MoreVertical, Search, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChatStorage } from '@/lib/rag/chat-storage'

interface SessionManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectSession: (id: string) => void
  onNewSession: () => void
}

export function SessionManager({ open, onOpenChange, onSelectSession, onNewSession }: SessionManagerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const favorites = ChatStorage.loadFavorites()
  const recentSessions = ChatStorage.loadSessions().slice(0, 10)
  const archivedSessions = ChatStorage.loadArchived()

  const filteredSessions = searchQuery
    ? ChatStorage.searchSessions(searchQuery)
    : recentSessions

  const handleDelete = (id: string) => {
    if (confirm('이 대화를 삭제하시겠습니까?')) {
      ChatStorage.deleteSession(id)
      onOpenChange(false)
    }
  }

  const handleRename = (id: string) => {
    const newTitle = prompt('새 제목을 입력하세요:')
    if (newTitle) {
      ChatStorage.renameSession(id, newTitle)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>대화 관리</DialogTitle>
        </DialogHeader>

        {/* 액션 바 */}
        <div className="flex items-center gap-2">
          <Button onClick={onNewSession} className="flex-1">
            <Plus className="h-4 w-4 mr-2" />
            새 대화
          </Button>
          <Button variant="outline" onClick={() => setShowArchived(!showArchived)}>
            <Archive className="h-4 w-4 mr-2" />
            아카이브 {showArchived ? '숨기기' : '보기'}
          </Button>
        </div>

        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="대화 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 세션 목록 */}
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* 즐겨찾기 */}
          {!searchQuery && favorites.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                즐겨찾기 ({favorites.length})
              </h3>
              <div className="space-y-2">
                {favorites.map(session => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onSelect={() => onSelectSession(session.id)}
                    onDelete={() => handleDelete(session.id)}
                    onRename={() => handleRename(session.id)}
                    onToggleFavorite={() => ChatStorage.toggleFavorite(session.id)}
                    onToggleArchive={() => ChatStorage.toggleArchive(session.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 최근 대화 */}
          {!showArchived && (
            <div>
              <h3 className="text-sm font-semibold mb-2">
                {searchQuery ? `검색 결과 (${filteredSessions.length})` : `최근 대화 (${recentSessions.length})`}
              </h3>
              <div className="space-y-2">
                {filteredSessions.map(session => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onSelect={() => onSelectSession(session.id)}
                    onDelete={() => handleDelete(session.id)}
                    onRename={() => handleRename(session.id)}
                    onToggleFavorite={() => ChatStorage.toggleFavorite(session.id)}
                    onToggleArchive={() => ChatStorage.toggleArchive(session.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 아카이브 */}
          {showArchived && (
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Archive className="h-4 w-4" />
                아카이브 ({archivedSessions.length})
              </h3>
              <div className="space-y-2">
                {archivedSessions.map(session => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onSelect={() => onSelectSession(session.id)}
                    onDelete={() => handleDelete(session.id)}
                    onRename={() => handleRename(session.id)}
                    onToggleFavorite={() => ChatStorage.toggleFavorite(session.id)}
                    onToggleArchive={() => ChatStorage.toggleArchive(session.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface SessionCardProps {
  session: ChatSession
  onSelect: () => void
  onDelete: () => void
  onRename: () => void
  onToggleFavorite: () => void
  onToggleArchive: () => void
}

function SessionCard({ session, onSelect, onDelete, onRename, onToggleFavorite, onToggleArchive }: SessionCardProps) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer group"
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {session.isFavorite && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />}
          <p className="font-medium truncate">{session.title}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(session.updated).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }}>
            <Edit2 className="h-4 w-4 mr-2" />
            이름 변경
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}>
            <Star className="h-4 w-4 mr-2" />
            {session.isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleArchive(); }}>
            <Archive className="h-4 w-4 mr-2" />
            {session.isArchived ? '아카이브 해제' : '아카이브'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
```

---

#### Step 3: FloatingChatbot에 세션 관리 통합 (20분)

**업데이트**: `components/rag/floating-chatbot.tsx`

```tsx
import { Folder } from 'lucide-react'
import { SessionManager } from './session-manager'

export function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [showSessionManager, setShowSessionManager] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  const handleNewSession = () => {
    setCurrentSessionId(null)
    setShowSessionManager(false)
    // RAGAssistant 초기화 로직 필요
  }

  const handleSelectSession = (id: string) => {
    setCurrentSessionId(id)
    setShowSessionManager(false)
    // RAGAssistant에 세션 로드 로직 필요
  }

  return (
    <>
      {/* 팝업 */}
      {isOpen && (
        <div className="...">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold">RAG 도우미</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                title="세션 관리"
                onClick={() => setShowSessionManager(true)}
              >
                <Folder className="h-4 w-4" />
              </Button>
              {/* ... 다른 버튼들 ... */}
            </div>
          </div>

          <RAGAssistant className="h-[calc(100%-64px)]" />
        </div>
      )}

      {/* 세션 관리 모달 */}
      <SessionManager
        open={showSessionManager}
        onOpenChange={setShowSessionManager}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
      />

      {/* 플로팅 버튼 */}
      {!isOpen && <Button onClick={() => setIsOpen(true)}>...</Button>}
    </>
  )
}
```

---

### Phase 3: 테스트 및 최적화 (30분)

#### 체크리스트

- [ ] **세션 생성**: 새 대화 → 자동 제목 생성
- [ ] **세션 저장**: 메시지 전송 → LocalStorage 저장
- [ ] **세션 로드**: 세션 클릭 → 대화 내역 복원
- [ ] **즐겨찾기**: ⭐ 클릭 → 상단에 표시
- [ ] **아카이브**: 📦 클릭 → 목록에서 숨김
- [ ] **삭제**: 🗑️ 클릭 → 확인 후 삭제
- [ ] **이름 변경**: ✏️ 클릭 → prompt 입력
- [ ] **검색**: 제목/내용 검색 동작
- [ ] **모바일**: 작은 화면에서 정상 동작
- [ ] **TypeScript**: 컴파일 에러 0개

---

## 📊 최종 파일 목록

### 신규 파일 (3개)

| 파일 | 라인 수 | 설명 |
|------|---------|------|
| `components/rag/floating-chatbot.tsx` | ~150 | 플로팅 버튼 + 팝업 |
| `components/rag/session-manager.tsx` | ~200 | 세션 관리 UI |
| `lib/rag/chat-storage.ts` | ~200 | LocalStorage 세션 관리 |

**총 신규 코드**: ~550줄

### 수정 파일 (1개)

| 파일 | 변경 내용 |
|------|----------|
| `app/layout.tsx` | `<FloatingChatbot />` 추가 (1줄) |

### 재사용 파일 (4개)

- `lib/rag/rag-service.ts` (기존)
- `lib/rag/hooks/use-rag-assistant.ts` (기존)
- `components/rag/rag-assistant.tsx` (기존)
- `components/ui/*` (shadcn/ui 기존 컴포넌트)

---

## 🎯 완성 후 기능

### 사용자 시나리오

1. **빠른 질문**:
   - 통계 페이지에서 결과 확인 → 🤖 버튼 클릭 → "p-value란?" 질문 → 즉시 답변

2. **세션 관리**:
   - 여러 주제 대화 → 🗂️ 버튼 → 세션 목록 확인 → 이전 대화 다시 열기

3. **즐겨찾기**:
   - 유용한 답변 → ⭐ 즐겨찾기 → 나중에 빠르게 찾기

4. **모바일**:
   - 작은 화면 → 자동 전체 화면 전환 → 편안한 대화

---

## 📝 업데이트 내역

- **2025-11-02**: 플로팅 챗봇 방식으로 변경
  - 3-Column 레이아웃 제거
  - Intercom 스타일 팝업 (400×600px)
  - 세션 관리 기능 추가 (새 대화, 삭제, 즐겨찾기, 이름 변경, 아카이브, 검색)
  - LocalStorage 기반 영구 저장
  - 모바일 반응형 (전체 화면 모달)

---

**작성자**: Claude (AI Assistant)
**최종 수정**: 2025-11-02
**버전**: 2.0 (Floating Chatbot)
**상태**: 구현 준비 완료
