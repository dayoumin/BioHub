# RAG/채팅 시스템 리팩토링 - 보강된 상세 계획
**작성**: 2025-11-04 | **Version**: 1.0 Enhanced | **상태**: 실행 준비 완료

---

## 📋 목차
1. [전체 구조](#전체-구조)
2. [Phase별 상세 설계](#phase별-상세-설계)
3. [6가지 핵심 포인트 반영](#6가지-핵심-포인트-반영)
4. [실행 체크리스트](#실행-체크리스트)

---

## 전체 구조

### 기존 계획 vs 보강 계획

```
기존 계획 (11개 항목)
├─ Phase 1-1: 타입 통합
├─ Phase 1-2: UI 상수 중앙화
├─ Phase 1-3: 에러 핸들러
├─ Phase 2-1: useChatSession 훅
├─ Phase 2-2: ChatSourcesDisplay 컴포넌트
├─ Phase 3: 컴포넌트 리팩토링
├─ Phase 5: 버그 수정
└─ (최종 검증)

┌─ 보강 계획 (상세 설계 추가)
├─ Phase 1-1 체크리스트: ExtendedChatMessage 완전 제거 검증
├─ Phase 1-2 전략: 배럴 파일 구조 & import 경로 결정
├─ Phase 1-3 계약: handleRAGError 시그니처 & 메시지 포맷 규칙
├─ Phase 2-1 설계: 경계 상황 처리 (저장 중 중단, 중복 저장)
├─ Phase 2-2 문서: 스타일/토큰 목록화 (Phase 3용 참조)
└─ Phase 5-1 테스트: 회귀 테스트 계획 (버그 수정 후 검증)
```

---

## Phase별 상세 설계

### Phase 1-1: 타입 통합 + ExtendedChatMessage 제거 체크리스트

#### 1-1-A. ChatMessage 타입 확장 (lib/types/chat.ts)

**변경사항**:
```typescript
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number

  // 기존 필드
  sources?: ChatSource[]
  model?: {
    provider: string
    embedding?: string
    inference?: string
  }

  // 🆕 추가 필드 (RAGChatInterface 지원)
  response?: RAGResponse  // ExtendedChatMessage.response 통합
  metadata?: {
    method?: string       // 통계 메서드 컨텍스트
    isEdited?: boolean
    editedAt?: number
  }
}
```

**주의사항**:
- ✅ 필드는 모두 `optional` (하위 호환성 유지)
- ❌ 기존 필드 제거 금지
- ❌ 기존 필드 이름 변경 금지

#### 1-1-B. ExtendedChatMessage 제거 체크리스트

**Step 1: 참조 파일 완전 확인**
```bash
# rag-chat-interface.tsx에서만 사용하는지 검증
grep -r "ExtendedChatMessage" statistical-platform/
```

**예상 결과**:
```
components/rag/rag-chat-interface.tsx:54  (선언)
components/rag/rag-chat-interface.tsx:68  (useState)
components/rag/rag-chat-interface.tsx:83  (타입 캐스팅)
components/rag/rag-chat-interface.tsx:116 (생성)
components/rag/rag-chat-interface.tsx:155 (할당)
```

**Step 2: 제거 영향도 분석**
- [ ] 다른 파일에서 import 없음 확인
- [ ] 로컬 인터페이스로만 사용 확인
- [ ] 테스트에서 참조 없음 확인

**Step 3: 제거 절차**
1. rag-chat-interface.tsx에서 `ExtendedChatMessage` 인터페이스 삭제 (라인 54-56)
2. `useState<ExtendedChatMessage[]>` → `useState<ChatMessage[]>` 변경 (라인 68)
3. `session.messages as ExtendedChatMessage[]` → `session.messages as ChatMessage[]` 변경 (라인 83)
4. 모든 `ExtendedChatMessage` 타입 어노테이션을 `ChatMessage`로 교체

**Step 4: TypeScript 검증**
```bash
cd statistical-platform && npx tsc --noEmit
# 에러 0개 확인
```

---

### Phase 1-2: UI 상수 + 배럴 파일 전략

#### 1-2-A. 배럴 파일 구조 결정

**최종 결정**: 계층적 배럴 구조 (하이브리드)

```
lib/rag/config/
├─ index.ts                    (메인 배럴)
├─ ui-constants.ts            (UI 문구)
├─ markdown-config.ts          (마크다운 설정)
└─ [선택] error-constants.ts   (에러 메시지)

// Import 방식
// ✅ 추천: 구체적 import (향후 tree-shaking)
import { RAG_UI_CONFIG } from '@/lib/rag/config/ui-constants'
import { MARKDOWN_CONFIG } from '@/lib/rag/config/markdown-config'

// 또는
// ✅ 허용: 배럴 import (간편)
import { RAG_UI_CONFIG, MARKDOWN_CONFIG } from '@/lib/rag/config'
```

**근거**:
- 📦 모듈 크기 유지 (개별 파일 import 권장)
- 🔍 디버깅 용이 (경로 명확)
- 🚀 번들 최적화 (tree-shaking 가능)

#### 1-2-B. UI 상수 정의 (lib/rag/config/ui-constants.ts)

```typescript
export const RAG_UI_CONFIG = {
  // 제목
  titles: {
    assistant: '💬 RAG 도우미',
    chatInterface: '무엇을 도와드릴까요?',
  },

  // 플레이스홀더
  placeholders: {
    query: '질문을 입력하세요.',
  },

  // 메시지
  messages: {
    thinking: '생각 중...',
    errorDefault: '알 수 없는 오류',
    sessionEmpty: '질문을 입력해주세요.',
    noHistory: (showFavoritesOnly: boolean) =>
      showFavoritesOnly ? '즐겨찾기한 대화가 없습니다' : '대화 기록이 없습니다',
  },

  // 버튼 레이블
  buttons: {
    send: '전송',
    newChat: '새 대화',
    favorites: '즐겨찾기',
  },

  // 참조 문서
  sources: {
    title: '참조 문서',
    relevance: '관련도',
  },
}
```

**사용처**:
- RAGAssistant.tsx: 라인 326 `💬 RAG 도우미` 교체
- RAGChatInterface.tsx: 라인 527, 570 등 교체

#### 1-2-C. 마크다운 설정 (lib/rag/config/markdown-config.ts)

```typescript
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

export const MARKDOWN_CONFIG = {
  remarkPlugins: [remarkGfm, remarkBreaks, remarkMath],
  rehypePlugins: [rehypeKatex],
} as const
```

**사용처**:
- RAGAssistant.tsx: 라인 362-363
- RAGChatInterface.tsx: 라인 412-413

---

### Phase 1-3: 에러 핸들러 + 계약 정의

#### 1-3-A. handleRAGError 계약 (계약 먼저 정의!)

**문제**: 현재 에러 처리가 비일관적
```typescript
// RAGAssistant
catch (err) {
  setError(err instanceof Error ? err.message : '알 수 없는 오류')
}

// RAGChatInterface
catch (err) {
  const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류'
  setError(errorMessage)
  // + 에러도 저장
}
```

**해결**: 계약 확정

```typescript
// lib/rag/utils/error-handler.ts

export interface RAGErrorResult {
  message: string
  isNetworkError: boolean
  shouldRetry: boolean
  originalError: unknown
}

/**
 * RAG 에러 처리 표준 함수
 *
 * @returns RAGErrorResult - 일관된 형식의 에러 정보
 * @throws 절대 throw하지 않음 (항상 결과 반환)
 */
export function handleRAGError(error: unknown, context: string): RAGErrorResult {
  const isNetworkError = error instanceof TypeError &&
    error.message.includes('fetch') // 네트워크 에러 판별

  const shouldRetry = isNetworkError || (error instanceof Error &&
    error.message.includes('timeout'))

  let message: string
  if (error instanceof Error) {
    // 사용자 친화적 메시지 포맷팅
    message = formatUserMessage(error.message, context)
  } else {
    message = '알 수 없는 오류가 발생했습니다.'
  }

  // 개발 환경 로깅
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}] ${message}`, error)
  }

  return {
    message,
    isNetworkError,
    shouldRetry,
    originalError: error,
  }
}

/**
 * 사용자 친화적 메시지 생성
 */
function formatUserMessage(errorMessage: string, context: string): string {
  // 자동 감지 실패
  if (errorMessage.includes('not found')) {
    return 'AI 모델을 찾을 수 없습니다. 설정에서 모델을 선택해주세요.'
  }

  // 네트워크 오류
  if (errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED')) {
    return 'Ollama 서버에 연결할 수 없습니다. 서버를 실행해주세요.'
  }

  // 기타 오류
  return `${context}에서 오류가 발생했습니다: ${errorMessage}`
}
```

**Key Decision**:
- ✅ **절대 throw 하지 않음** (항상 결과 반환)
- ✅ **UI 저장 결정은 caller가 함** (책임 분리)
- ✅ **원본 에러 보존** (디버깅용)

#### 1-3-B. 사용 패턴 (Phase 3에서 적용)

```typescript
// ❌ Old (비일관적)
try {
  const response = await queryRAG(...)
  setAnswer(response.answer)
} catch (err) {
  setError(err instanceof Error ? err.message : '알 수 없는 오류')
}

// ✅ New (일관적)
try {
  const response = await queryRAG(...)
  setAnswer(response.answer)
} catch (err) {
  const errorResult = handleRAGError(err, 'queryRAG')
  setError(errorResult.message)

  // RAGChatInterface는 추가로 저장
  if (shouldSaveError) {
    await ChatStorageIndexedDB.addMessage(sessionId, {
      id: `${Date.now()}-error`,
      role: 'assistant',
      content: `오류: ${errorResult.message}`,
      timestamp: Date.now(),
    })
  }
}
```

---

### Phase 2-1: useChatSession 훅 + 경계 상황 설계

#### 2-1-A. 경계 상황 분석

**Scenario 1: 저장 중 중단 (네트워크 오류)**
```
사용자 질문 입력
  ↓
setMessages([...prev, userMessage])  // UI 즉시 업데이트
  ↓
ChatStorageIndexedDB.addMessage()     // 저장 시작
  ↓
네트워크 오류! (50% 확률)              // ⚠️ 경계 상황
  ↓
선택지:
  A. 재시도 (exponential backoff)
  B. 로컬만 유지 (나중에 동기화)
  C. 사용자에게 알림 (실패)
```

**Scenario 2: 중복 저장 (Race condition)**
```
ChatStorageIndexedDB.addMessage() 호출 1
  ↓
ChatStorageIndexedDB.addMessage() 호출 2 (동시)
  ↓
IndexedDB 트랜잭션 충돌!             // ⚠️ 경계 상황
  ↓
선택지:
  A. 배치 저장 (여러 메시지 한 번에)
  B. 순차 저장 (async/await 보장)
  C. 로컬 큐 (나중에 일괄 처리)
```

#### 2-1-B. useChatSession 훅 설계

```typescript
// lib/rag/hooks/use-chat-session.ts

interface UseChatSessionOptions {
  sessionId: string
  enableAutoSave?: boolean  // 기본: true
  autoSaveDelay?: number    // 기본: 1000ms (배치 저장)
}

interface UseChatSessionReturn {
  // 상태
  messages: ChatMessage[]
  isLoading: boolean

  // 메서드
  loadSession: () => Promise<void>
  addMessage: (message: ChatMessage) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>

  // 배치 저장 (성능 최적화)
  addMessages: (messages: ChatMessage[]) => Promise<void>
}

export function useChatSession(options: UseChatSessionOptions): UseChatSessionReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 🆕 큐 관리 (중복 저장 방지)
  const saveQueueRef = useRef<ChatMessage[]>([])
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * 배치 저장 로직
   * 여러 메시지를 큐에 모았다가 일괄 저장
   */
  const flushSaveQueue = useCallback(async () => {
    if (saveQueueRef.current.length === 0) return

    const messagesToSave = [...saveQueueRef.current]
    saveQueueRef.current = []

    try {
      // ✅ 배치 저장으로 Race condition 방지
      for (const msg of messagesToSave) {
        await ChatStorageIndexedDB.addMessage(options.sessionId, msg)
      }
    } catch (err) {
      // 실패 시 다시 큐에 추가 (재시도)
      saveQueueRef.current = [...messagesToSave, ...saveQueueRef.current]
      throw err
    }
  }, [options.sessionId])

  /**
   * 메시지 추가 (비동기)
   * - UI 즉시 업데이트 (낙관적)
   * - 저장은 나중에 배치 처리
   */
  const addMessage = useCallback(
    async (message: ChatMessage) => {
      // Step 1: UI 즉시 업데이트 (낙관적)
      setMessages((prev) => [...prev, message])

      // Step 2: 저장 큐에 추가
      saveQueueRef.current.push(message)

      // Step 3: 타이머 설정 (배치 저장)
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }

      saveTimerRef.current = setTimeout(
        () => void flushSaveQueue(),
        options.autoSaveDelay ?? 1000
      )
    },
    [flushSaveQueue, options.autoSaveDelay]
  )

  // 컴포넌트 언마운트 시 남은 메시지 저장
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      // ⚠️ cleanup에서는 대기 불가능 → 나머지는 IndexedDB에서 처리
    }
  }, [])

  return {
    messages,
    isLoading,
    loadSession,
    addMessage,
    deleteMessage,
    addMessages: flushSaveQueue, // 직접 배치 저장
  }
}
```

**핵심 설계**:
- ✅ 낙관적 UI 업데이트 (사용자 경험)
- ✅ 배치 저장 (성능, Race condition 방지)
- ✅ 자동 재시도 (복원력)
- ✅ cleanup 안전성 (메모리 누수 방지)

---

### Phase 2-2: ChatSourcesDisplay + 스타일 목록

#### 2-2-A. 스타일/토큰 목록화 (Phase 3용 참조)

**RAGAssistant (현재)**:
```typescript
// 라인 388-401: 참조 문서 렌더링
<div className="mt-3 space-y-1">
  {msg.response.sources.map((source, sourceIdx) => (
    <div key={sourceIdx} className="text-xs bg-muted/50 rounded p-2">
      <div className="font-medium">{source.title}</div>
      <div className="text-muted-foreground mt-1 line-clamp-2">
        {source.content}
      </div>
      <div className="text-muted-foreground mt-1">
        관련도: {(source.score * 100).toFixed(0)}%
      </div>
    </div>
  ))}
</div>
```

**RAGChatInterface (현재)**:
```typescript
// 라인 460-486: 참조 문서 렌더링 (더 정교함)
<div className="mt-3 space-y-2">
  {(msg.response?.sources || msg.sources)?.map((source, sourceIdx) => (
    <div
      key={sourceIdx}
      className="text-xs bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-3 border border-primary/20"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-semibold text-foreground">{source.title}</div>
          <div className="text-muted-foreground mt-1.5 leading-relaxed">
            {source.content}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-primary/10">
        <span className="text-muted-foreground">관련도:</span>
        <div className="flex-1 h-1.5 bg-primary/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${source.score * 100}%` }}
          />
        </div>
        <span className="font-semibold text-primary">
          {(source.score * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  ))}
</div>
```

**스타일 목록화**:

| 요소 | RAGAssistant | RAGChatInterface | 선택 스타일 |
|-----|------------|-----------------|----------|
| 컨테이너 | `bg-muted/50 rounded p-2` | `bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-3 border border-primary/20` | RAGChatInterface (더 정교) |
| 제목 | `font-medium` | `font-semibold text-foreground` | RAGChatInterface |
| 내용 | `text-muted-foreground mt-1 line-clamp-2` | `text-muted-foreground mt-1.5 leading-relaxed` | RAGChatInterface |
| 관련도 섹션 | 텍스트만 | 프로그레스 바 | RAGChatInterface |
| 프로그레스 바 | 없음 | `h-1.5 bg-primary/20 rounded-full` | RAGChatInterface |

**의사결정**: RAGChatInterface 스타일 채택 (더 나음)
- ✅ 그래디언트 배경
- ✅ 프로그레스 바 시각화
- ✅ 더 높은 contrast

---

### Phase 5-1: 버그 수정 + 회귀 테스트

#### 5-1-A. 메시지 변환 버그 (RAGAssistant:99-101)

**현재 코드 (버그)**:
```typescript
const convertedMessages: ChatMessage[] = []
for (let i = 0; i < session.messages.length; i += 2) {
  const userMsg = session.messages[i]
  const assistantMsg = session.messages[i + 1]
  if (userMsg && assistantMsg && userMsg.role === 'user') {
    // 변환...
  }
}
// ⚠️ 문제: 홀수 개 메시지(user만 저장됨)는 무시됨
```

**개선 코드**:
```typescript
const convertedMessages = session.messages
  .reduce<ChatMessage[]>((acc, msg, idx, arr) => {
    if (msg.role === 'user' && idx + 1 < arr.length && arr[idx + 1].role === 'assistant') {
      // 사용자-어시스턴트 쌍만 변환
      acc.push({
        query: msg.content,
        response: {
          answer: arr[idx + 1].content,
          sources: arr[idx + 1].sources || [],
          model: arr[idx + 1].model || { provider: 'unknown' },
        },
        timestamp: msg.timestamp,
      })
    }
    return acc
  }, [])
```

#### 5-1-B. 회귀 테스트 (Phase 3 후 재실행)

**테스트 파일**: `components/rag/__tests__/rag-assistant.test.tsx`

```typescript
describe('RAGAssistant - Message Conversion', () => {
  // Phase 5-1 수정 후 추가
  it('should handle message conversion with odd number of messages', () => {
    const session: ChatSession = {
      id: '1',
      title: 'Test',
      messages: [
        { id: '1', role: 'user', content: 'Q1', timestamp: 1 },
        { id: '2', role: 'assistant', content: 'A1', timestamp: 2 },
        { id: '3', role: 'user', content: 'Q2', timestamp: 3 },
        // ⚠️ assistant 없음 (홀수)
      ],
      createdAt: 0,
      updatedAt: 0,
      isFavorite: false,
      isArchived: false,
    }

    // 변환 로직 테스트
    const converted = convertMessages(session)

    // 결과: 2개만 변환 (Q1-A1), Q2는 무시
    expect(converted).toHaveLength(2)
    expect(converted[0].query).toBe('Q1')
    expect(converted[1].query).toBe('Q2')
  })

  // Phase 3 후 재실행 (회귀 테스트)
  it('should maintain message conversion after Phase 3 refactoring', () => {
    // 동일 테스트 실행 (리팩토링 후에도 동작해야 함)
    expect(converted).toHaveLength(2)
  })
})
```

**회귀 테스트 체크리스트**:
- [ ] Phase 1-1 완료 후: `npx tsc --noEmit` (0 errors)
- [ ] Phase 1-2 완료 후: UI 상수 import 검증
- [ ] Phase 5-1 완료 후: 메시지 변환 테스트 통과
- [ ] **Phase 3-1 완료 후: 동일 테스트 재실행** (회귀 검증)

---

## 6가지 핵심 포인트 반영

| # | 포인트 | 반영 위치 | 상세 |
|---|-------|---------|------|
| 1 | ExtendedChatMessage 제거 체크리스트 | Phase 1-1-B | 4단계 체크리스트 작성 |
| 2 | UI/Markdown 설정 import 경로 | Phase 1-2-A | 배럴 파일 구조 결정 |
| 3 | handleRAGError 반환/throw 방식 | Phase 1-3-A | 계약(contract) 확정 |
| 4 | useChatSession 경계 상황 설계 | Phase 2-1-A/B | 배치 저장 + 큐 관리 설계 |
| 5 | ChatSourcesDisplay 스타일 목록화 | Phase 2-2-A | 스타일 테이블 작성 |
| 6 | Phase 5-1 버그 수정 + 회귀 테스트 | Phase 5-1-B | 테스트 코드 + 체크리스트 |

---

## 실행 체크리스트

### 📋 전체 실행 순서 (의존성 고려)

#### 1️⃣ **사전 설계 (실행 전 완료)**
- [ ] Phase 1-1-B: ExtendedChatMessage 참조 완전 확인
- [ ] Phase 1-2-A: 배럴 파일 구조 합의
- [ ] Phase 1-3-A: handleRAGError 계약 확정
- [ ] Phase 2-1-A: 경계 상황 설계 검토
- [ ] Phase 2-2-A: 스타일 목록 작성
- [ ] Phase 5-1-B: 테스트 코드 작성

#### 2️⃣ **기초 설정 (Phase 1)**
- [ ] Phase 1-1: 타입 통합 (체크리스트 포함)
- [ ] Phase 1-2: UI 상수 중앙화 (배럴 파일 구조 준수)
- [ ] Phase 1-3: 에러 핸들러 (계약 준수)
- [ ] 검증: `npx tsc --noEmit`

#### 3️⃣ **공통 추상화 (Phase 2)**
- [ ] Phase 2-1: useChatSession 훅 (배치 저장 + 큐 관리)
- [ ] Phase 2-2: ChatSourcesDisplay (스타일 목록 참조)
- [ ] 검증: 컴포넌트 렌더링

#### 4️⃣ **버그 수정 (Phase 5)**
- [ ] Phase 5-1: RAGAssistant 메시지 변환 버그 (테스트 추가)
- [ ] Phase 5-2: RAGChatInterface CSS 검증
- [ ] 검증: 단위 테스트 통과

#### 5️⃣ **컴포넌트 리팩토링 (Phase 3)**
- [ ] Phase 3-1: RAGAssistant 리팩토링 (새 요소 활용)
- [ ] Phase 3-2: RAGChatInterface 리팩토링
- [ ] 검증: 통합 테스트 + 브라우저 테스트

#### 6️⃣ **회귀 테스트 (최종)**
- [ ] Phase 5-1 테스트 재실행 (Phase 3 후)
- [ ] TypeScript 컴파일: 0 errors
- [ ] 브라우저 테스트: 모든 기능 정상

---

## 🎯 핵심 결정사항

### 결정 1: 배럴 파일 vs 직접 import
**결정**: 계층적 배럴 구조 (메인 배럴 + 개별 import)
```typescript
// ✅ 추천
import { RAG_UI_CONFIG } from '@/lib/rag/config/ui-constants'

// 또는
import { RAG_UI_CONFIG, MARKDOWN_CONFIG } from '@/lib/rag/config'
```

### 결정 2: handleRAGError throw vs return
**결정**: 절대 throw 하지 않음 (항상 결과 반환)
- 일관된 에러 처리
- UI 저장 결정은 caller가 함

### 결정 3: useChatSession 저장 방식
**결정**: 배치 저장 + 큐 관리
- 낙관적 UI 업데이트
- Race condition 방지
- 자동 재시도

### 결정 4: ChatSourcesDisplay 스타일
**결정**: RAGChatInterface 스타일 채택
- 그래디언트 배경
- 프로그레스 바 시각화

---

## 📝 참고사항

### 테스트 실행 명령어
```bash
# TypeScript 검증
cd statistical-platform && npx tsc --noEmit

# 테스트 실행
npm test -- rag

# 빌드
npm run build

# 개발 서버
npm run dev
```

### 커밋 메시지 패턴
```
feat(rag): Phase 1-1 타입 통합 - ExtendedChatMessage 제거

- ChatMessage에 response 필드 추가 (optional)
- ExtendedChatMessage 타입 제거
- 체크리스트: 다른 파일 참조 확인됨

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

**Version History**:
- 1.0 Enhanced (2025-11-04): 6가지 포인트 반영, 상세 설계 추가
