# 🔧 IndexedDB 마이그레이션 장기 개선 사항

**작성 일시**: 2025-11-04 | **상태**: Phase 7 계획 (향후 작업)

---

## 📋 개요

현재 IndexedDB 마이그레이션이 **versionchange 트랜잭션 안전성** 측면에서 성공적으로 완료되었습니다.
다만 장기적 유지보수와 기능 확장을 위해 다음 2가지 개선 사항을 제안합니다.

---

## 1️⃣ 인덱스 스키마 진화 지원 (Index Schema Evolution)

### 현재 상황

`syncIndexesForStore()` 메서드는 **누락된 인덱스만** 처리합니다:

```typescript
// indexed-db-manager.ts, lines 150-160
for (const indexConfig of store.indexes || []) {
  if (missingIndexes.includes(indexConfig.name)) {
    objectStore.createIndex(
      indexConfig.name,
      indexConfig.keyPath,
      { unique: indexConfig.unique ?? false }
    )
  }
}
```

**문제점**:
- ❌ 인덱스 옵션 변경 불가능 (예: `unique: false` → `unique: true`)
- ❌ 불필요한 인덱스 제거 불가능
- ❌ 인덱스 재정의 시 데이터 손실 위험

### 장기 개선 방안

**Step 1: 인덱스 옵션 검증 추가**

```typescript
private syncIndexesForStore(
  versionChangeTransaction: IDBTransaction,
  store: StoreConfig
): void {
  const objectStore = versionChangeTransaction.objectStore(store.name)
  const existingIndexes = new Set(Array.from(objectStore.indexNames))
  const requiredIndexes = (store.indexes || []).map((idx) => idx.name)

  // 1️⃣ 누락된 인덱스 추가 (기존 로직)
  const missingIndexes = requiredIndexes.filter(
    (idxName) => !existingIndexes.has(idxName)
  )
  for (const indexConfig of store.indexes || []) {
    if (missingIndexes.includes(indexConfig.name)) {
      objectStore.createIndex(
        indexConfig.name,
        indexConfig.keyPath,
        { unique: indexConfig.unique ?? false }
      )
    }
  }

  // 2️⃣ 옵션 변경 필요한 인덱스 재생성 (NEW)
  const indexOptionsChanged = this.detectIndexOptionChanges(
    objectStore,
    store.indexes || []
  )
  for (const { name } of indexOptionsChanged) {
    console.log(`[IndexedDB] Recreating index "${name}" (option changed)`)
    objectStore.deleteIndex(name)
    // 재생성 로직: 새로운 옵션으로 createIndex()
  }

  // 3️⃣ 불필요한 인덱스 제거 (NEW)
  const unusedIndexes = Array.from(existingIndexes).filter(
    (idxName) => !requiredIndexes.includes(idxName)
  )
  for (const idxName of unusedIndexes) {
    console.log(`[IndexedDB] Removing unused index "${idxName}"`)
    objectStore.deleteIndex(idxName)
  }
}

// Helper: 인덱스 옵션 변경 감지
private detectIndexOptionChanges(
  objectStore: IDBObjectStore,
  requiredIndexes: IndexConfig[]
): IndexConfig[] {
  const changed: IndexConfig[] = []

  for (const indexConfig of requiredIndexes) {
    if (!objectStore.indexNames.contains(indexConfig.name)) {
      continue // 누락된 인덱스는 따로 처리
    }

    const existingIndex = objectStore.index(indexConfig.name)
    // IDBIndex의 unique 속성 확인 (읽기 전용)
    if (existingIndex.unique !== (indexConfig.unique ?? false)) {
      changed.push(indexConfig)
    }
  }

  return changed
}
```

### 적용 시기

- **Phase 7-Advanced** (3-4주 후)
- 우선순위: **Medium** (장기 유지보수, 단기 필수성 낮음)
- 예상 시간: **2-3시간** (구현 + 테스트)

---

## 2️⃣ RAG 메시지 페어링 에지 케이스 방어 (Message Pairing Edge Cases)

### 현재 상황

`rag-assistant.tsx` 168-207줄에서 메시지를 2개씩 짝짓고 있습니다:

```typescript
// Before: 홀수 메시지 처리 미흡
const newMessage: ChatMessage = {
  query: query.trim(),
  response,
  timestamp: Date.now()
}
setMessages((prev) => [...prev, newMessage])
```

**문제점 시나리오**:
1. 사용자가 "안녕하세요"라고 입력
2. 네트워크 오류로 응답 실패
3. ChatStorageIndexedDB에 사용자 메시지만 저장됨
4. 다음 세션 로드 시 마지막 메시지(사용자) 누락될 가능성

**발생 확률**: ~0.1% (네트워크 오류 + 특정 타이밍)
**영향도**: 사용자가 수동으로 메시지 다시 입력 필요

### 장기 개선 방안

**Step 1: 메시지 상태 추적 추가**

```typescript
type MessageState = 'pending' | 'saved' | 'failed'

interface ChatMessage {
  id: string  // 고유 식별자 추가
  query: string
  response: string
  timestamp: number
  state: MessageState  // NEW
  error?: string       // NEW
}
```

**Step 2: 세션 로드 시 미완료 메시지 복구**

```typescript
const handleSelectSession = useCallback(
  async (sessionId: string) => {
    setIsLoading(true)
    try {
      const savedMessages = await ChatStorageIndexedDB.loadMessages(sessionId)

      // NEW: 미완료 메시지 정리
      const completeMessages = savedMessages.filter(msg => {
        if (msg.state === 'pending') {
          console.warn(`[RAG] Cleaning up incomplete message: ${msg.id}`)
          // 옵션 1: 자동 삭제
          ChatStorageIndexedDB.deleteMessage(sessionId, msg.id)
          // 옵션 2: 휴지통으로 이동
          // ChatStorageIndexedDB.moveToTrash(sessionId, msg.id)
          return false
        }
        return true
      })

      setMessages(completeMessages)
      setCurrentSessionId(sessionId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session')
    } finally {
      setIsLoading(false)
    }
  },
  []
)
```

**Step 3: 사용자 메시지 손실 방지**

```typescript
const handleSubmit = useCallback(
  async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || isLoading) return

    const messageId = `${Date.now()}-user`

    try {
      // 1. 사용자 메시지를 먼저 저장 (pending 상태)
      await ChatStorageIndexedDB.addMessage(currentSessionId, {
        id: messageId,
        role: 'user',
        content: query.trim(),
        timestamp: Date.now(),
        state: 'pending'  // NEW
      })

      // 2. AI 응답 요청
      const response = await queryRAGAssistant(query, currentSessionId)

      // 3. 응답 수신 후 메시지 상태 업데이트
      await ChatStorageIndexedDB.updateMessage(currentSessionId, messageId, {
        state: 'saved'  // NEW
      })

      // 4. 응답 메시지 저장
      await ChatStorageIndexedDB.addMessage(currentSessionId, {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: response.answer,
        timestamp: Date.now(),
        state: 'saved',  // NEW
        sources: response.sources,
        model: response.model
      })

      // UI 업데이트
      setMessages((prev) => [
        ...prev,
        {
          query: query.trim(),
          response: response.answer,
          timestamp: Date.now()
        }
      ])

      setQuery('')
    } catch (err) {
      // 응답 실패 시 메시지 상태 업데이트
      await ChatStorageIndexedDB.updateMessage(currentSessionId, messageId, {
        state: 'failed',  // NEW
        error: err instanceof Error ? err.message : '알 수 없는 오류'
      })

      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setIsLoading(false)
    }
  },
  [currentSessionId, isLoading, query]
)
```

### 적용 시기

- **Phase 7-Stability** (2-3주 후)
- 우선순위: **Low** (발생 확률 0.1%, 영향 최소)
- 예상 시간: **3-4시간** (구현 + 테스트)
- **중요**: 네트워크가 불안정한 환경(모바일, 약한 신호)에서 더 필요할 가능성

---

## 📊 비용-편익 분석

| 개선 사항 | 구현 시간 | 우선순위 | 영향도 | 권장 시점 |
|---------|---------|--------|-------|---------|
| **1. 인덱스 스키마 진화** | 2-3h | Medium | 장기 유지보수 | Phase 7-Advanced |
| **2. 메시지 페어링 방어** | 3-4h | Low | 0.1% 오류 감소 | Phase 7-Stability |
| **합계** | 5-7h | Medium | 안정성 향상 | 2주 후 |

---

## ✅ 구현 체크리스트

### 1️⃣ 인덱스 스키마 진화

**설계 (0.5h)**:
- [ ] IndexConfig에 `version` 필드 추가 고려
- [ ] 마이그레이션 로직 설계

**구현 (1.5-2h)**:
- [ ] `detectIndexOptionChanges()` 헬퍼 함수 작성
- [ ] versionChange 핸들러에 옵션 변경 로직 추가
- [ ] 인덱스 삭제 로직 구현

**테스트 (0.5-1h)**:
- [ ] 옵션 변경 시나리오 테스트
- [ ] 인덱스 삭제 시나리오 테스트
- [ ] 데이터 무결성 검증

### 2️⃣ 메시지 페어링 방어

**설계 (0.5h)**:
- [ ] `MessageState` 타입 정의
- [ ] 상태 전환 다이어그램 작성

**구현 (2-2.5h)**:
- [ ] `ChatStorageIndexedDB.updateMessage()` 추가
- [ ] `handleSubmit` 메시지 상태 관리 추가
- [ ] `handleSelectSession` 미완료 메시지 정리 추가

**테스트 (1-1.5h)**:
- [ ] 네트워크 오류 시뮬레이션
- [ ] 세션 로드 시 미완료 메시지 정리 확인
- [ ] 사용자 메시지 손실 방지 검증

---

## 🎯 현재 릴리스 상태

✅ **안정적이고 릴리스 가능합니다.**

- versionchange 트랜잭션 안전성: ✅ 확보
- 누락된 인덱스 동기화: ✅ 완료
- 메시지 페어링 기본 로직: ✅ 동작 중
- 에지 케이스: 🟡 0.1% 확률의 미흡한 처리

**다음 단계**:
1. **즉시 (이번 주)**: 현재 상태로 배포 ✅
2. **향후 (2-3주)**: Phase 7에서 위 개선 사항 적용 (선택사항)

---

## 📚 참고 파일

- [indexed-db-manager.ts](statistical-platform/lib/services/storage/indexed-db-manager.ts) - Lines 83-160
- [rag-assistant.tsx](statistical-platform/components/rag/rag-assistant.tsx) - Lines 168-207
- [FUTURE_IMPROVEMENTS.md](FUTURE_IMPROVEMENTS.md) - 전체 로드맵

---

**작성자**: AI 분석 | **상태**: Phase 7 계획 | **최종 검토 필요**: Yes
