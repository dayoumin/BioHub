# Step 2 - RAG 컴포넌트 비동기 전환 가이드

**시작**: 2025-11-04
**목표**: RAG 컴포넌트를 ChatStorageIndexedDB 기반 비동기로 전환
**예상 시간**: 4-6시간
**상태**: 📋 계획 단계

---

## 📋 개요

### 변경 이유

IndexedDB는 비동기 API이므로, RAG 컴포넌트의 동기 localStorage 호출을 모두 비동기로 변환해야 합니다.

**Before:**
```typescript
// 동기 - localStorage 사용
const session = ChatStorage.loadSession(sessionId)
setMessages(session?.messages || [])
```

**After:**
```typescript
// 비동기 - IndexedDB 사용
useEffect(() => {
  const load = async () => {
    const session = await ChatStorageIndexedDB.loadSession(sessionId)
    if (session) {
      setMessages(session.messages as ExtendedChatMessage[])
    }
  }
  load()
}, [sessionId])
```

---

## 🎯 작업 범위

### 수정 대상 파일

#### 1. `components/rag/rag-chat-interface.tsx` (주요)

**현재 동기 호출 위치:**

| 줄 번호 | 작업 | 현재 코드 | 변경 필요 |
|--------|------|---------|----------|
| 76-81 | 세션 로드 | `ChatStorage.loadSession()` | ✅ async로 변환 |
| ~130 | 메시지 추가 | `ChatStorage.addMessage()` | ✅ await 추가 |
| ~200 | 메시지 삭제 | `ChatStorage.deleteMessage()` | ✅ await 추가 |

**변경 항목:**
- [ ] import 경로 변경 (ChatStorage → ChatStorageIndexedDB)
- [ ] 세션 로드 useEffect 비동기화
- [ ] 메시지 추가 함수 비동기화
- [ ] 메시지 삭제 함수 비동기화
- [ ] 로딩 상태 UI 추가 (로드 중 스피너)
- [ ] 에러 상태 UI 추가 (에러 메시지)

#### 2. `components/rag/rag-assistant.tsx` (주요)

**현재 동기 호출 위치:**

| 줄 번호 | 작업 | 현재 코드 | 변경 필요 |
|--------|------|---------|----------|
| ~50 | 세션 목록 로드 | `ChatStorage.loadSessions()` | ✅ async로 변환 |
| ~90 | 세션 저장 | `ChatStorage.saveSession()` | ✅ await 추가 |

**변경 항목:**
- [ ] import 경로 변경
- [ ] 세션 목록 로드 비동기화
- [ ] 세션 저장 비동기화
- [ ] 로딩 상태 UI 추가

---

## 💻 Step 2-1: rag-chat-interface.tsx 수정

### 1단계: Import 변경

**파일**: `components/rag/rag-chat-interface.tsx`

**현재 (Line 36):**
```typescript
import { ChatStorage } from '@/lib/services/chat-storage'
```

**변경:**
```typescript
import { ChatStorageIndexedDB } from '@/lib/services/storage/chat-storage-indexed-db'
```

---

### 2단계: 세션 로드 비동기화

**위치**: Line 76-81

**현재:**
```typescript
useEffect(() => {
  const session = ChatStorage.loadSession(sessionId)
  if (session) {
    setMessages(session.messages as ExtendedChatMessage[])
  }
}, [sessionId])
```

**변경:**
```typescript
useEffect(() => {
  const loadSession = async () => {
    setIsLoading(true)
    try {
      const session = await ChatStorageIndexedDB.loadSession(sessionId)
      if (session) {
        setMessages(session.messages as ExtendedChatMessage[])
      }
    } catch (err) {
      setError('세션 로드 실패')
      console.error('Failed to load session:', err)
    } finally {
      setIsLoading(false)
    }
  }

  loadSession()
}, [sessionId])
```

---

### 3단계: 메시지 추가 비동기화

**위치**: 메시지 전송 함수 (약 Line 100-150)

**현재 (대략적):**
```typescript
const handleSendMessage = useCallback(async () => {
  // ... 메시지 생성 ...

  ChatStorage.addMessage(sessionId, userMessage)  // ❌ await 없음

  // ... RAG 질의 ...
})
```

**변경:**
```typescript
const handleSendMessage = useCallback(async () => {
  // ... 메시지 생성 ...

  try {
    await ChatStorageIndexedDB.addMessage(sessionId, userMessage)  // ✅ await 추가
  } catch (err) {
    console.error('Failed to save user message:', err)
    setError('메시지 저장 실패')
  }

  // ... RAG 질의 ...
}, [sessionId])
```

---

### 4단계: 메시지 삭제 비동기화

**위치**: 메시지 삭제 함수 (약 Line 200-250)

**현재 (대략적):**
```typescript
const handleDeleteMessage = useCallback((messageId: string) => {
  ChatStorage.deleteMessage(sessionId, messageId)  // ❌ await 없음
  setMessages(prev => prev.filter(m => m.id !== messageId))
}, [sessionId])
```

**변경:**
```typescript
const handleDeleteMessage = useCallback(async (messageId: string) => {
  try {
    await ChatStorageIndexedDB.deleteMessage(sessionId, messageId)  // ✅ await 추가
    setMessages(prev => prev.filter(m => m.id !== messageId))
  } catch (err) {
    console.error('Failed to delete message:', err)
    setError('메시지 삭제 실패')
  }
}, [sessionId])
```

---

### 5단계: 로딩 상태 UI 추가 (선택)

**초기 로드 시 스피너 표시:**

```typescript
// messages 상태 초기화 시 로딩 표시
if (isLoading && messages.length === 0) {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      <span className="ml-2 text-muted-foreground">메시지를 불러오는 중...</span>
    </div>
  )
}
```

---

## 💻 Step 2-2: rag-assistant.tsx 수정

### 개요

`RAGAssistant` 컴포넌트에서 세션 목록을 로드하고 관리하는 부분을 비동기화합니다.

### 1단계: Import 변경

**파일**: `components/rag/rag-assistant.tsx`

**현재:**
```typescript
import { ChatStorage } from '@/lib/services/chat-storage'
```

**변경:**
```typescript
import { ChatStorageIndexedDB } from '@/lib/services/storage/chat-storage-indexed-db'
```

---

### 2단계: 세션 목록 로드 비동기화

**위치**: 초기 로드 useEffect (약 Line 40-60)

**현재 (대략적):**
```typescript
useEffect(() => {
  const sessions = ChatStorage.loadSessions()
  setSessions(sessions || [])
}, [])
```

**변경:**
```typescript
useEffect(() => {
  const loadSessions = async () => {
    try {
      const loadedSessions = await ChatStorageIndexedDB.loadSessions()
      setSessions(loadedSessions)
    } catch (err) {
      console.error('Failed to load sessions:', err)
      setSessions([])
    }
  }

  loadSessions()
}, [])
```

---

### 3단계: 세션 저장 비동기화

**위치**: 세션 저장 함수 (약 Line 80-120)

**현재 (대략적):**
```typescript
const saveSession = useCallback((session: ChatSession) => {
  ChatStorage.saveSession(session)  // ❌ await 없음
}, [])
```

**변경:**
```typescript
const saveSession = useCallback(async (session: ChatSession) => {
  try {
    await ChatStorageIndexedDB.saveSession(session)  // ✅ await 추가
  } catch (err) {
    console.error('Failed to save session:', err)
  }
}, [])
```

---

### 4단계: 다른 세션 조작 함수들

마찬가지로 다음 함수들도 비동기화:

```typescript
// 즐겨찾기 토글
const toggleFavorite = useCallback(async (sessionId: string) => {
  try {
    await ChatStorageIndexedDB.toggleFavorite(sessionId)
    // UI 업데이트 로직
  } catch (err) {
    console.error('Failed to toggle favorite:', err)
  }
}, [])

// 보관 토글
const toggleArchive = useCallback(async (sessionId: string) => {
  try {
    await ChatStorageIndexedDB.toggleArchive(sessionId)
    // UI 업데이트 로직
  } catch (err) {
    console.error('Failed to toggle archive:', err)
  }
}, [])

// 세션 이름 변경
const renameSession = useCallback(async (sessionId: string, newTitle: string) => {
  try {
    await ChatStorageIndexedDB.renameSession(sessionId, newTitle)
    // UI 업데이트 로직
  } catch (err) {
    console.error('Failed to rename session:', err)
  }
}, [])

// 세션 삭제
const deleteSession = useCallback(async (sessionId: string) => {
  try {
    await ChatStorageIndexedDB.deleteSession(sessionId)
    setSessions(prev => prev.filter(s => s.id !== sessionId))
  } catch (err) {
    console.error('Failed to delete session:', err)
  }
}, [])
```

---

## ✅ 변경 체크리스트

### rag-chat-interface.tsx
- [ ] ChatStorage → ChatStorageIndexedDB import 변경
- [ ] 세션 로드 useEffect 비동기화 (setIsLoading 추가)
- [ ] 메시지 추가 함수에 await 추가
- [ ] 메시지 삭제 함수에 await 추가
- [ ] 메시지 수정(Edit) 함수에 await 추가 (있는 경우)
- [ ] 에러 처리 추가 (setError)
- [ ] 로딩 상태 UI 추가 (선택)
- [ ] TypeScript 검증 (0 에러)
- [ ] 브라우저 테스트 (기능 동작 확인)

### rag-assistant.tsx
- [ ] ChatStorage → ChatStorageIndexedDB import 변경
- [ ] 세션 로드 useEffect 비동기화
- [ ] 세션 저장 비동기화
- [ ] 즐겨찾기 토글 비동기화
- [ ] 보관 토글 비동기화
- [ ] 이름 변경 비동기화
- [ ] 세션 삭제 비동기화
- [ ] 에러 처리 추가
- [ ] TypeScript 검증 (0 에러)
- [ ] 브라우저 테스트 (기능 동작 확인)

### 최종 검증
- [ ] TypeScript 컴파일 (0 에러)
  ```bash
  npx tsc --noEmit
  ```
- [ ] 개발 서버 실행
  ```bash
  npm run dev
  ```
- [ ] RAG 채팅 기능 테스트:
  - [ ] 메시지 입력 및 전송
  - [ ] 메시지 저장 확인
  - [ ] 메시지 삭제
  - [ ] 세션 새로 열기 (저장된 메시지 로드)
- [ ] 다중 탭 동기화 테스트:
  - [ ] 두 탭에서 채팅
  - [ ] 한 탭에서 메시지 추가하면 다른 탭에 반영되는지 확인

---

## 🔧 주의사항

### 1. useCallback 의존성

모든 콜백 함수에 올바른 의존성을 설정하세요:

```typescript
// ✅ 올바름
const handleSendMessage = useCallback(async () => {
  // ...
}, [sessionId])  // sessionId 의존성 필수

// ❌ 틀림
const handleSendMessage = useCallback(async () => {
  // ...
}, [])  // sessionId 변경 감지 안됨
```

---

### 2. Race Condition 방지

동시에 여러 저장 작업이 일어나지 않도록:

```typescript
// ✅ 올바름
const [isSaving, setIsSaving] = useState(false)

const saveMessage = useCallback(async () => {
  if (isSaving) return  // 저장 중이면 중복 방지

  setIsSaving(true)
  try {
    await ChatStorageIndexedDB.addMessage(sessionId, message)
  } finally {
    setIsSaving(false)
  }
}, [sessionId, isSaving])
```

---

### 3. 에러 처리

모든 비동기 작업에 에러 처리를 추가하세요:

```typescript
// ✅ 올바름
try {
  await ChatStorageIndexedDB.loadSession(sessionId)
} catch (err) {
  setError('세션 로드 실패')
  console.error('Load error:', err)
}

// ❌ 틀림
const session = await ChatStorageIndexedDB.loadSession(sessionId)  // 에러 처리 없음
```

---

### 4. Cleanup 함수

필요한 경우 cleanup 함수를 추가하세요:

```typescript
useEffect(() => {
  let isMounted = true  // 언마운트 감지

  const loadData = async () => {
    const data = await ChatStorageIndexedDB.loadSession(sessionId)
    if (isMounted) {  // 언마운트 후 상태 업데이트 방지
      setMessages(data?.messages || [])
    }
  }

  loadData()

  return () => {
    isMounted = false  // cleanup
  }
}, [sessionId])
```

---

## 📊 변경 영향 분석

### 성능 영향

| 항목 | 변경 전 | 변경 후 | 영향 |
|------|--------|--------|------|
| **세션 로드** | ~0ms (메모리) | ~5-10ms (비동기) | 무시할 수 있는 수준 |
| **메시지 저장** | ~0ms | ~5-10ms | 무시할 수 있는 수준 |
| **용량** | 5MB 제한 | 50MB+ | ✅ 개선 |
| **다중 탭** | Race condition | 트랜잭션 안전 | ✅ 개선 |

### 호환성

- ✅ 기존 ChatSession 타입 호환
- ✅ 기존 ChatMessage 타입 호환
- ✅ 기존 RAGResponse 타입 호환

---

## 📝 테스트 시나리오

### 1. 기본 채팅 플로우

```
1. RAG 채팅 페이지 열기
2. 메시지 입력 (예: "안녕하세요")
3. 전송 클릭
4. RAG 응답 대기
5. 메시지 저장 확인 (브라우저 DevTools > Application > IndexedDB)
6. 페이지 새로고침
7. 메시지가 여전히 표시되는지 확인 ✅
```

### 2. 메시지 삭제

```
1. 저장된 메시지에서 삭제 버튼 클릭
2. 메시지 즉시 제거 확인
3. 페이지 새로고침
4. 메시지가 삭제된 상태 유지 확인 ✅
```

### 3. 다중 탭 동기화

```
1. 탭 A에서 새 메시지 추가
2. 탭 B 관찰
3. 탭 B에서도 메시지 표시되는지 확인 ✅ (BroadcastChannel)
```

### 4. 세션 관리

```
1. RAG Assistant에서 새 세션 생성
2. 메시지 추가
3. 다른 세션으로 전환
4. 원래 세션 다시 열기
5. 메시지가 여전히 있는지 확인 ✅
```

---

## 🚀 실행 명령어

### 개발 서버 실행

```bash
cd statistical-platform
npm run dev
```

브라우저에서 http://localhost:3000 열기

### TypeScript 검증

```bash
npx tsc --noEmit
```

### 빌드 테스트

```bash
npm run build
```

---

## 📞 문제 해결

### Q: "ChatStorageIndexedDB is not defined" 에러

**A:** import 경로를 확인하세요:
```typescript
// ❌ 잘못된 경로
import { ChatStorageIndexedDB } from '@/lib/services/chat-storage-indexed-db'

// ✅ 올바른 경로
import { ChatStorageIndexedDB } from '@/lib/services/storage/chat-storage-indexed-db'
```

### Q: "await only in async function" 에러

**A:** 콜백 함수를 async로 선언하세요:
```typescript
// ❌ 틀림
const handleClick = () => {
  await ChatStorageIndexedDB.loadSession()  // 에러!
}

// ✅ 올바름
const handleClick = async () => {
  await ChatStorageIndexedDB.loadSession()
}
```

### Q: IndexedDB 데이터가 보이지 않음

**A:** 브라우저 DevTools 확인:
1. F12 (DevTools 열기)
2. Application 탭
3. IndexedDB > StatisticalPlatformDB > sessions
4. 데이터가 있는지 확인

---

## ✅ 완료 기준

- [x] 모든 파일 수정 완료
- [x] TypeScript 컴파일 0 에러
- [x] 기본 채팅 플로우 동작
- [x] 메시지 저장/로드 동작
- [x] 다중 탭 동기화 동작 (또는 Step 3에서)
- [x] 에러 처리 완전

---

**상태**: 📋 계획 완료, 구현 준비 완료
**다음 단계**: Step 3 - 폴링 기반 실시간 동기화
