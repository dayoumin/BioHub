# 📋 IndexedDB 마이그레이션 + 폴링 동기화 구현 계획

**작성일**: 2025-11-04
**목표**: 1, 2순위 개선 사항 구현
**총 소요시간**: 24-33시간 (3-4일)

---

## ✅ 완료된 사항

### 1. IndexedDB 기반 저장소 구현
```
✅ indexed-db-manager.ts (175줄)
   - 저수준 데이터베이스 작업
   - CRUD 함수 (put, get, getAll, query, delete, clear)
   - 트랜잭션 기반 처리

✅ chat-storage-indexed-db.ts (400줄+)
   - localStorage와 호환하는 API
   - 자동 마이그레이션 (localStorage → IndexedDB)
   - BroadcastChannel 기반 다중 탭 동기화
   - 인덱싱: projectId, isFavorite, isArchived, updatedAt
```

### 2. 타입 안전성 검증
```
✅ TypeScript: 0 errors
✅ 모든 메서드 완전 타입 정의
✅ async/await 패턴 사용
```

---

## 🚀 다음 단계 (진행 예정)

### Step 2: 기존 RAG 컴포넌트 비동기 전환 (4-6시간)

#### 2.1 rag-chat-interface.tsx 수정

```typescript
// 현재 (동기)
const session = ChatStorage.loadSession(sessionId)
setMessages(session?.messages || [])

// 변경 (비동기)
useEffect(() => {
  const loadSession = async () => {
    const session = await ChatStorageIndexedDB.loadSession(sessionId)
    if (session) {
      setMessages(session.messages as ExtendedChatMessage[])
    }
  }
  loadSession()
}, [sessionId])
```

#### 2.2 rag-assistant.tsx 수정

```typescript
// 세션 로드 비동기 전환
useEffect(() => {
  const loadSessions = async () => {
    const loadedSessions = await ChatStorageIndexedDB.loadSessions()
    setSessions(loadedSessions)
  }
  loadSessions()
}, [])
```

#### 2.3 메시지 저장 비동기 전환

```typescript
// addMessage 호출
await ChatStorageIndexedDB.addMessage(sessionId, userMessage)
```

**예상 시간**: 4-6시간
**영향 범위**: RAG 채팅 관련 2개 파일

---

### Step 3: 폴링 기반 실시간 동기화 (3-4시간)

#### 3.1 RAG 상태 API 엔드포인트

```typescript
// app/api/rag/state/route.ts (신규)
export async function GET(request: NextRequest) {
  const sessionId = request.headers.get('X-Session-Id')

  return NextResponse.json({
    sessionCount: await getSessionCount(),
    lastUpdated: Date.now(),
    // 필요한 상태 정보
  })
}
```

**시간**: 1-2시간

#### 3.2 useRealTimeSync Hook 구현

```typescript
// hooks/useRealTimeSync.ts (신규)
export function useRealTimeSync(sessionId: string) {
  useEffect(() => {
    const interval = setInterval(async () => {
      const state = await fetch(`/api/rag/state?sessionId=${sessionId}`)
        .then(r => r.json())

      // 상태 업데이트 처리
      handleStateUpdate(state)
    }, 2000) // 2초 폴링

    return () => clearInterval(interval)
  }, [sessionId])
}
```

**시간**: 1-2시간

#### 3.3 컴포넌트에 적용

```typescript
// rag-chat-interface.tsx 또는 별도 wrapper
export function RAGChatInterfaceWithSync() {
  const { sessionId } = useParams()
  useRealTimeSync(sessionId)

  return <RAGChatInterface />
}
```

**시간**: 1시간

---

## 📅 구현 일정 (예상)

```
Day 1 (Mon-Tue): Step 2 - 비동기 전환
├─ 2.1 rag-chat-interface 수정    (1.5h)
├─ 2.2 rag-assistant 수정          (1.5h)
├─ 2.3 메시지 저장 로직            (1h)
├─ 테스트 및 버그 수정             (2-3h)
└─ TypeScript 검증                 (0.5h)
   = 6-8시간

Day 2 (Wed): Step 3 - 폴링 동기화
├─ API 엔드포인트 구현             (1-2h)
├─ useRealTimeSync Hook            (1-2h)
├─ 컴포넌트 통합                    (1h)
└─ 테스트                           (1-2h)
   = 4-7시간

Day 3 (Thu-Fri): 통합 테스트 + 배포
├─ 통합 테스트                      (2-3h)
├─ 성능 벤치마크                    (1-2h)
├─ 버그 수정                        (1-2h)
└─ 문서화 + 커밋                    (1-2h)
   = 5-9시간

총 일정: 15-24시간 (2-3일)
```

---

## 🔍 변경 영향 분석

### 영향받는 파일

```
직접 수정 (마이그레이션 필수):
├─ components/rag/rag-chat-interface.tsx
├─ components/rag/rag-assistant.tsx
├─ app/api/rag/stream/route.ts
└─ hooks/ (신규)

테스트 필요:
├─ RAG 채팅 전체 플로우
├─ 메시지 저장/로드
├─ 세션 관리
└─ 다중 탭 동기화

호환성:
├─ localStorage fallback (마이그레이션 중)
├─ BroadcastChannel 미지원 처리
└─ 폴링 실패 시 fallback
```

### 호환성 전략

```typescript
// ChatStorage (래퍼 클래스) 생성
// - localStorage와 IndexedDB 양쪽 지원
// - 마이그레이션 자동 처리
// - 기존 코드 변경 최소화

export class ChatStorage {
  // localStorage 사용 (기존)
  static loadSession(id: string) { ... }

  // 또는 IndexedDB 사용 (신규)
  // 자동으로 IndexedDB 시도 → 실패 시 localStorage
}
```

---

## ⚠️ 주의사항

### 1. 비동기 변환 시 고려사항

```typescript
// ❌ 절대 금지: useEffect 내에서 await 없이 사용
useEffect(() => {
  const session = ChatStorageIndexedDB.loadSession(id) // 실패!
}, [])

// ✅ 권장: async 함수로 감싸기
useEffect(() => {
  const load = async () => {
    const session = await ChatStorageIndexedDB.loadSession(id)
  }
  load()
}, [])
```

### 2. Race Condition 방지

```typescript
// 여러 탭에서 동시에 저장할 때
// IndexedDB 트랜잭션이 자동으로 처리
// + BroadcastChannel로 다른 탭에 알림
```

### 3. 마이그레이션 검증

```typescript
// 마이그레이션 후 localStorage 데이터 삭제 전에
// 1. 전체 데이터 로드 성공 확인
// 2. 개수 일치 확인
// 3. IndexedDB 쿼리 성공 확인
```

---

## 🧪 테스트 계획

### 단위 테스트

```typescript
// lib/services/storage/__tests__/chat-storage-indexed-db.test.ts
describe('ChatStorageIndexedDB', () => {
  it('should initialize database')
  it('should save and load session')
  it('should handle migration from localStorage')
  it('should create indexes correctly')
  it('should query by indexes')
})
```

### 통합 테스트

```typescript
// RAG 채팅 전체 플로우
1. 새 세션 생성
2. 메시지 추가
3. 다른 탭에서 세션 로드 (동기화 확인)
4. 세션 삭제
5. 복구 가능성 확인
```

### 성능 테스트

```
지표:
- 메모리 사용량: localStorage 동적 증가 vs IndexedDB 고정
- 조회 속도: O(n) vs O(log n)
- 다중 탭 동기화 지연: <100ms
```

---

## 📝 커밋 전략

### Commit 1: IndexedDB 기반 저장소 추가
```
feat: IndexedDB 기반 채팅 저장소 추가

- IndexedDBManager 저수준 API 추가
- ChatStorageIndexedDB 호환성 인터페이스
- localStorage에서 자동 마이그레이션
- BroadcastChannel 기반 다중 탭 동기화
- 인덱싱으로 성능 향상 (O(n) → O(log n))
```

### Commit 2: RAG 컴포넌트 비동기 전환
```
refactor: RAG 컴포넌트를 IndexedDB 기반 비동기로 전환

- rag-chat-interface 비동기 로드
- rag-assistant 비동기 로드
- 메시지 저장/삭제 비동기 처리
- async/await 패턴 적용
```

### Commit 3: 폴링 기반 실시간 동기화
```
feat: 폴링 기반 실시간 상태 동기화 추가

- /api/rag/state 엔드포인트 추가
- useRealTimeSync Hook 구현
- 2초 폴링으로 상태 동기화
- BroadcastChannel과 통합
```

---

## 🎯 성공 기준

### 기능 테스트
- [x] 세션 저장/로드 성공
- [x] 메시지 추가/삭제 성공
- [x] 다중 탭 동기화 작동
- [ ] 폴링 업데이트 감지
- [ ] localStorage 마이그레이션 완료

### 성능 지표
- [ ] 용량: 5MB → 50MB+ 확인
- [ ] 조회 속도: 10배 이상 개선
- [ ] 다중 탭 지연: <100ms

### 코드 품질
- [ ] TypeScript: 0 errors
- [ ] 테스트 커버리지: >80%
- [ ] 번들 크기 영향: <5KB 증가

---

## 🔗 참고 자료

### 기술 문서
- MDN IndexedDB API
- IndexedDB Browser Support
- BroadcastChannel API
- useEffect Best Practices

### 프로젝트 파일
- Current: d:\Projects\Statics\FUTURE_IMPROVEMENTS.md
- Types: lib/types/chat.ts
- Existing: lib/rag/indexeddb-storage.ts

---

**다음 액션**: Step 2 (RAG 컴포넌트 비동기 전환) 시작
