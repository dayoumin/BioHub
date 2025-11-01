# 플로팅 챗봇 구현 계획서 (실용 버전)

**작성일**: 2025-11-02
**최종 업데이트**: 2025-11-02
**목적**: 전역 플로팅 챗봇으로 통계 분석 도우미 제공
**예상 시간**: 3-4시간 (핵심 기능만)

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

→ **새 코드는 약 600줄만 추가!**

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
│                  │                  │  │
│                  │ [제안 프롬프트]   │  │
│                  │ • p-value란?     │  │
│                  │ • t-test 가정    │  │
│                  │                  │  │
│                  │ 🤖 AI:           │  │
│                  │ p-value는...     │  │
│                  │                  │  │
│                  │ 👤 사용자:       │  │
│                  │ p-value란?       │  │
│                  │                  │  │
│                  │ [💬 질문 입력]   │  │
│                  │                  │  │
│                  │ [🗂️] [⭐] [⚙️]   │  │
│                  └──────────────────┘  │
│                         [🤖] (숨김)     │
└─────────────────────────────────────────┘
        팝업 크기: 400px × 600px
```

### 팝업 구성 요소

```
┌──────────────────────────────────────┐
│ RAG 도우미         [🗂️] [⭐] [⚙️] [X] │ ← 헤더
├──────────────────────────────────────┤
│                                      │
│ [빈 상태 or 대화 내용]                │ ← 메인 영역
│                                      │
│ • 빈 상태: 제안 프롬프트 4개          │
│ • 대화 중: 메시지 목록 (스크롤)       │
│                                      │
├──────────────────────────────────────┤
│ [💬 질문 입력...]               [↑] │ ← 입력창
└──────────────────────────────────────┘

[🗂️] 세션 관리: 대화 목록, 새 대화, 삭제
[⭐] 즐겨찾기: 현재 대화 즐겨찾기 토글
[⚙️] 설정: 모델 선택
[X] 닫기
```

---

## 🔧 핵심 기능 (Must-Have Only)

### 1. 플로팅 버튼 + 팝업
- 우측 하단 고정 버튼
- 클릭 시 팝업 토글
- 모바일: 전체 화면 모달
- 애니메이션: 부드러운 fade-in/out

### 2. 빈 상태 (Empty State)
- 제안 프롬프트 4개 버튼
  - "p-value가 뭔가요?"
  - "t-검정 가정은?"
  - "정규성 검정 방법"
  - "표본 크기 계산"
- 첫 메시지 전송 후 자동 숨김

### 3. 세션 관리
- **새 대화**: 현재 세션 저장 → 빈 대화 시작
- **세션 목록**: 최근 10개 표시
- **즐겨찾기**: ⭐ 토글, 상단 고정
- **삭제**: 확인 모달 후 삭제
- **이름 변경**: 프롬프트 입력
- **자동 제목**: 첫 메시지 50자 요약

### 4. 메시지 복사
- 개별 메시지에 복사 버튼 (hover 시 표시)
- 클립보드 API 사용

### 5. 에러 핸들링
- Ollama 서버 연결 실패 안내
- 네트워크 타임아웃 (30초)
- 에러 메시지 Alert 표시

### 6. 키보드 단축키
- `Esc`: 팝업 닫기
- `Enter`: 메시지 전송
- `Shift+Enter`: 줄바꿈
- `Ctrl+N`: 새 대화

### 7. 모바일 최적화
- 작은 화면: 자동 전체 화면 전환
- iOS Safari 100vh 이슈 해결 (`100dvh`)
- 키보드 높이 자동 대응

### 8. LocalStorage 용량 관리
- 5MB 제한 처리
- 용량 초과 시 오래된 세션 자동 삭제 (최근 20개만 유지)

---

## 🛠️ 구현 계획 (3-4시간)

### Phase 1: 플로팅 버튼 + 기본 팝업 (1.5시간)

#### Step 1: FloatingChatbot 컴포넌트 (1시간)

**파일**: `components/rag/floating-chatbot.tsx`

```tsx
'use client'

import { useState } from 'react'
import { MessageCircle, X, Settings, Star, Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RAGAssistant } from './rag-assistant'
import { cn } from '@/lib/utils'

const QUICK_PROMPTS = [
  'p-value가 뭔가요?',
  't-검정 가정은?',
  '정규성 검정 방법',
  '표본 크기 계산'
]

export function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [showSessionManager, setShowSessionManager] = useState(false)

  return (
    <>
      {/* 팝업 */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-50 shadow-2xl rounded-lg overflow-hidden border bg-background",
            "bottom-24 right-6 w-96 h-[600px]",
            "max-md:inset-0 max-md:w-full max-md:h-full max-md:bottom-0 max-md:right-0 max-md:rounded-none"
          )}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false)
          }}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold">RAG 도우미</h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                title="세션 관리 (Ctrl+N)"
                onClick={() => setShowSessionManager(true)}
              >
                <Folder className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="즐겨찾기">
                <Star className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="설정">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 메인 영역 */}
          <div className="h-[calc(100%-64px)]">
            <RAGAssistant
              className="h-full"
              quickPrompts={QUICK_PROMPTS}
            />
          </div>
        </div>
      )}

      {/* 플로팅 버튼 */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
          size="icon"
          title="RAG 도우미 열기"
          aria-label="RAG 도우미 열기"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}
    </>
  )
}
```

#### Step 2: RAGAssistant 컴포넌트 수정 (30분)

**파일**: `components/rag/rag-assistant.tsx` (기존 파일 수정)

**추가 기능**:
1. `quickPrompts` prop 추가
2. Empty State 구현
3. 메시지 복사 버튼 추가

```tsx
// 수정 예시
interface RAGAssistantProps {
  className?: string
  quickPrompts?: string[] // 신규 추가
}

export function RAGAssistant({ className, quickPrompts = [] }: RAGAssistantProps) {
  const { messages, ask, isLoading } = useRAGAssistant()

  // Empty State
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Bot className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">무엇을 도와드릴까요?</h3>
        <p className="text-sm text-muted-foreground text-center mb-6">
          통계 분석에 대해 무엇이든 물어보세요
        </p>
        <div className="grid grid-cols-2 gap-2 w-full">
          {quickPrompts.map(prompt => (
            <Button
              key={prompt}
              variant="outline"
              size="sm"
              className="text-left justify-start h-auto py-3"
              onClick={() => ask(prompt)}
            >
              {prompt}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  // 기존 대화 UI
  return (
    <div className={className}>
      {/* 메시지 목록 + 복사 버튼 */}
      {/* ... 기존 코드 ... */}
    </div>
  )
}
```

---

### Phase 2: 세션 관리 (2시간)

#### Step 1: ChatStorage 클래스 (45분)

**파일**: `lib/rag/chat-storage.ts`

```typescript
interface ChatSession {
  id: string
  title: string
  messages: Message[]
  created: Date
  updated: Date
  isFavorite: boolean
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
  private static MAX_SIZE = 4_500_000 // 4.5MB
  private static MAX_SESSIONS = 20

  /**
   * 모든 세션 로드 (즐겨찾기 우선, 최신순)
   */
  static loadSessions(): ChatSession[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      if (!data) return []

      const sessions: ChatSession[] = JSON.parse(data)
      return sessions.sort((a, b) => {
        // 즐겨찾기 우선
        if (a.isFavorite && !b.isFavorite) return -1
        if (!a.isFavorite && b.isFavorite) return 1
        // 날짜순
        return new Date(b.updated).getTime() - new Date(a.updated).getTime()
      })
    } catch (err) {
      console.error('Failed to load sessions:', err)
      return []
    }
  }

  /**
   * 세션 저장 (용량 관리 포함)
   */
  static saveSession(session: ChatSession): void {
    try {
      const sessions = this.loadSessions()
      const index = sessions.findIndex(s => s.id === session.id)

      if (index >= 0) {
        sessions[index] = session
      } else {
        sessions.push(session)
      }

      // 용량 체크
      const data = JSON.stringify(sessions)
      if (new Blob([data]).size > this.MAX_SIZE) {
        // 오래된 세션 삭제 (즐겨찾기 제외)
        const recentSessions = sessions
          .filter(s => s.isFavorite)
          .concat(sessions.filter(s => !s.isFavorite).slice(0, this.MAX_SESSIONS))

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recentSessions))
        console.warn('LocalStorage 용량 초과, 오래된 세션 삭제됨')
      } else {
        localStorage.setItem(this.STORAGE_KEY, data)
      }
    } catch (err) {
      console.error('Failed to save session:', err)
    }
  }

  /**
   * 세션 삭제
   */
  static deleteSession(id: string): void {
    const sessions = this.loadSessions().filter(s => s.id !== id)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions))
  }

  /**
   * 즐겨찾기 토글
   */
  static toggleFavorite(id: string): void {
    const sessions = this.loadSessions()
    const session = sessions.find(s => s.id === id)
    if (session) {
      session.isFavorite = !session.isFavorite
      session.updated = new Date()
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions))
    }
  }

  /**
   * 세션 이름 변경
   */
  static renameSession(id: string, newTitle: string): void {
    const sessions = this.loadSessions()
    const session = sessions.find(s => s.id === id)
    if (session) {
      session.title = newTitle
      session.updated = new Date()
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions))
    }
  }

  /**
   * 세션 제목 자동 생성
   */
  static generateTitle(firstMessage: string): string {
    const title = firstMessage.slice(0, 50).trim()
    return title.length < firstMessage.length ? `${title}...` : title
  }
}
```

---

#### Step 2: SessionManager 컴포넌트 (1시간)

**파일**: `components/rag/session-manager.tsx`

```tsx
'use client'

import { useState } from 'react'
import { Plus, Star, Trash2, Edit2, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChatStorage } from '@/lib/rag/chat-storage'

interface SessionManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectSession: (id: string) => void
  onNewSession: () => void
}

export function SessionManager({ open, onOpenChange, onSelectSession, onNewSession }: SessionManagerProps) {
  const [sessions, setSessions] = useState(ChatStorage.loadSessions())

  const handleDelete = (id: string) => {
    if (confirm('이 대화를 삭제하시겠습니까?')) {
      ChatStorage.deleteSession(id)
      setSessions(ChatStorage.loadSessions())
    }
  }

  const handleRename = (id: string, currentTitle: string) => {
    const newTitle = prompt('새 제목을 입력하세요:', currentTitle)
    if (newTitle && newTitle !== currentTitle) {
      ChatStorage.renameSession(id, newTitle)
      setSessions(ChatStorage.loadSessions())
    }
  }

  const handleToggleFavorite = (id: string) => {
    ChatStorage.toggleFavorite(id)
    setSessions(ChatStorage.loadSessions())
  }

  const favorites = sessions.filter(s => s.isFavorite)
  const recentSessions = sessions.filter(s => !s.isFavorite).slice(0, 10)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>대화 관리</DialogTitle>
        </DialogHeader>

        {/* 새 대화 버튼 */}
        <Button onClick={onNewSession} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          새 대화
        </Button>

        {/* 세션 목록 */}
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* 즐겨찾기 */}
          {favorites.length > 0 && (
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
                    onSelect={() => {
                      onSelectSession(session.id)
                      onOpenChange(false)
                    }}
                    onDelete={() => handleDelete(session.id)}
                    onRename={() => handleRename(session.id, session.title)}
                    onToggleFavorite={() => handleToggleFavorite(session.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 최근 대화 */}
          <div>
            <h3 className="text-sm font-semibold mb-2">
              최근 대화 ({recentSessions.length})
            </h3>
            <div className="space-y-2">
              {recentSessions.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onSelect={() => {
                    onSelectSession(session.id)
                    onOpenChange(false)
                  }}
                  onDelete={() => handleDelete(session.id)}
                  onRename={() => handleRename(session.id, session.title)}
                  onToggleFavorite={() => handleToggleFavorite(session.id)}
                />
              ))}
            </div>
          </div>
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
}

function SessionCard({ session, onSelect, onDelete, onRename, onToggleFavorite }: SessionCardProps) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer group"
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {session.isFavorite && (
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
          )}
          <p className="font-medium truncate">{session.title}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(session.updated).toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
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

#### Step 3: Layout에 통합 (15분)

**파일**: `app/layout.tsx`

```tsx
import { FloatingChatbot } from '@/components/rag/floating-chatbot'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, interactive-widget=resizes-content"
        />
      </head>
      <body>
        <ClientProviders>
          {children}
          <FloatingChatbot />
        </ClientProviders>
      </body>
    </html>
  )
}
```

---

### Phase 3: 테스트 및 최적화 (30분)

#### 체크리스트

**기능 테스트**:
- [ ] 플로팅 버튼 클릭 → 팝업 열림
- [ ] Empty State → 제안 프롬프트 4개 표시
- [ ] 질문 입력 → Ollama 응답
- [ ] 메시지 복사 버튼 동작
- [ ] 새 대화 → 자동 제목 생성 + 저장
- [ ] 세션 목록 → 최신순 정렬
- [ ] 즐겨찾기 토글 → 상단 고정
- [ ] 세션 삭제 → 확인 모달
- [ ] 이름 변경 → 프롬프트 입력

**키보드 단축키**:
- [ ] `Esc` → 팝업 닫기
- [ ] `Enter` → 메시지 전송
- [ ] `Shift+Enter` → 줄바꿈

**모바일 테스트**:
- [ ] 작은 화면 → 전체 화면 모달
- [ ] iOS Safari → 100dvh 정상 동작
- [ ] 키보드 열림 → 입력창 가려지지 않음

**에러 핸들링**:
- [ ] Ollama 서버 다운 → 안내 메시지
- [ ] 네트워크 타임아웃 → 에러 Alert

**TypeScript**:
- [ ] `npx tsc --noEmit` → 0 에러

---

## 📊 최종 파일 목록

### 신규 파일 (3개)

| 파일 | 라인 수 | 설명 |
|------|---------|------|
| `components/rag/floating-chatbot.tsx` | ~150 | 플로팅 버튼 + 팝업 |
| `components/rag/session-manager.tsx` | ~200 | 세션 관리 UI |
| `lib/rag/chat-storage.ts` | ~200 | LocalStorage 세션 관리 |

**총 신규 코드**: ~550줄

### 수정 파일 (2개)

| 파일 | 변경 내용 |
|------|----------|
| `app/layout.tsx` | Viewport meta tag + `<FloatingChatbot />` (2줄) |
| `components/rag/rag-assistant.tsx` | Empty State + 메시지 복사 버튼 (~50줄) |

### 재사용 파일 (기존)

- `lib/rag/rag-service.ts` ✅
- `lib/rag/hooks/use-rag-assistant.ts` ✅
- `components/ui/*` (shadcn/ui) ✅

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

## 📝 제외된 기능 (나중에 추가 가능)

다음 기능들은 초기 버전에서 제외하고, 사용자 피드백 후 추가 검토:

- ~~스트리밍 응답~~ (현재 일반 fetch로 충분)
- ~~메시지 재생성~~ (우선순위 낮음)
- ~~답변 피드백 (👍 👎)~~ (우선순위 낮음)
- ~~메시지 가상화~~ (일반 사용 시 성능 문제 없음)
- ~~코드 블록 실행~~ (복잡도 높음)
- ~~파일 업로드~~ (별도 기능으로 구현 예정)
- ~~음성 입력~~ (우선순위 낮음)
- ~~다국어 지원~~ (한국어 전용)

---

## ✅ 최종 체크리스트

### 구현 완료 기준

- [ ] 플로팅 버튼이 모든 페이지에 표시됨
- [ ] 팝업 열기/닫기 정상 동작
- [ ] Empty State 제안 프롬프트 4개 표시
- [ ] Ollama 질문/답변 정상 동작
- [ ] 세션 자동 저장 (LocalStorage)
- [ ] 세션 목록 로드 (최신순)
- [ ] 즐겨찾기 토글 동작
- [ ] 세션 삭제 (확인 모달)
- [ ] 이름 변경 (프롬프트)
- [ ] 메시지 복사 버튼 (hover)
- [ ] 키보드 단축키 (Esc, Enter)
- [ ] 모바일 전체 화면 모달
- [ ] TypeScript 컴파일 0 에러
- [ ] Ollama 서버 에러 핸들링

---

**작성자**: Claude (AI Assistant)
**최종 수정**: 2025-11-02
**버전**: 3.0 (Practical Edition)
**예상 시간**: 3-4시간
