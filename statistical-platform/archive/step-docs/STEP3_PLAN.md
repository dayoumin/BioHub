# Step 3 계획서 - 폴링 기반 실시간 동기화

**예상 소요 시간**: 3-4시간
**상태**: 📋 준비 완료 (Step 2 완료 후)
**시작 시점**: 사용자 승인 후

---

## 🎯 Step 3 목표

**목표**: 다중 탭 환경에서 BroadcastChannel + 폴링을 통한 실시간 세션 동기화 구현

### 현재 상태 (Step 2 완료 후)

- ✅ IndexedDB 기반 비동기 저장소 완성
- ✅ RAG 컴포넌트 완전 비동기화
- ✅ Race Condition 방지 (트랜잭션)
- ⏳ **실시간 동기화 미완성** (Step 3 목표)

### 문제점

현재 다중 탭 환경에서의 문제:

```
Tab A (사용자가 메시지 입력)
  ↓
IndexedDB에 저장
  ↓
BroadcastChannel 이벤트 발송
  ↓
Tab B (즉시 수신 불가!)
  ↓
2초마다 폴링으로 변경 감지

❌ 문제: 변경된 데이터를 즉시 가져오지 못함
```

### 해결책 (Step 3)

```
Tab A (메시지 입력)
  ↓
IndexedDB 저장 + BroadcastChannel 이벤트
  ↓
Tab B (2가지 방법으로 감지)
  1️⃣ BroadcastChannel으로 즉시 반영 (이벤트 기반)
  2️⃣ 폴링으로 누락된 변경 감지 (상태 기반)
  ↓
UI 자동 업데이트 ✅
```

---

## 📋 Step 3 구현 계획

### Phase 3-1: API 엔드포인트 생성

**파일**: `app/api/rag/state/route.ts` (신규)

```typescript
// 목적: 클라이언트가 현재 RAG 상태를 폴링으로 조회

export async function GET(request: Request) {
  // 요청 파라미터:
  // - lastUpdate: 마지막 업데이트 타임스탬프
  // - sessionId?: 특정 세션의 변경 확인

  // 응답:
  // {
  //   sessions: ChatSession[]
  //   lastUpdate: number
  //   hasChanges: boolean
  // }
}

// 구현 세부:
✅ /api/rag/state?lastUpdate=1234567890
✅ IndexedDB에서 모든 세션 조회
✅ lastUpdate 이후의 변경사항만 반환
✅ 성능 최적화 (변경된 항목만 반환)
✅ 에러 처리
```

**작업 예상 시간**: 30분

### Phase 3-2: useRealTimeSync Hook 구현

**파일**: `lib/hooks/use-real-time-sync.ts` (신규)

```typescript
// 목적: React Hook으로 폴링 기반 실시간 동기화

export function useRealTimeSync(sessionId?: string) {
  // 기능:
  // 1. 2초마다 /api/rag/state 폴링
  // 2. 변경사항 감지 시 콜백 실행
  // 3. 언마운트 시 폴링 중지
  // 4. 네트워크 에러 자동 복구

  return {
    isLoading: boolean
    error: Error | null
    onSessionsUpdate: (sessions: ChatSession[]) => void
    stop: () => void
  }
}

// 구현 세부:
✅ useEffect로 2초 폴링 관리
✅ AbortController로 요청 취소
✅ 네트워크 재시도 로직
✅ 메모리 누수 방지
✅ 타입 안전성 (TypeScript)
```

**작업 예상 시간**: 45분

### Phase 3-3: RAGAssistant와 RAGChatInterface 통합

**파일들**:
- `components/rag/rag-assistant.tsx` (수정)
- `components/rag/rag-chat-interface.tsx` (수정)

```typescript
// rag-assistant.tsx에 useRealTimeSync 통합

const RAGAssistant = ({ method, className, onNewMessage }: RAGAssistantProps) => {
  const sessions = useState<ChatSession[]>([])

  // ✅ 폴링 기반 실시간 동기화 추가
  useRealTimeSync((updatedSessions) => {
    setSessions(updatedSessions)  // UI 자동 업데이트
  })

  // ...rest of implementation
}

// rag-chat-interface.tsx에서도 동일하게 통합
```

**작업 예상 시간**: 30분

### Phase 3-4: BroadcastChannel과 폴링 통합

**파일**: 기존 files 수정

```typescript
// 목적: BroadcastChannel 이벤트와 폴링을 협력하도록 설정

// 흐름:
1️⃣ IndexedDB에 저장
   ↓
2️⃣ BroadcastChannel으로 같은 출처의 탭들에 이벤트 발송
   ↓
3️⃣ 폴링으로 백그라운드 탭의 변경 감지

// 최적화:
✅ BroadcastChannel 이벤트 리스너 등록
✅ 폴링 주기: 2초 (설정 가능)
✅ 중복 업데이트 방지 (타임스탬프 비교)
✅ 백그라운드 탭에서도 동작
```

**작업 예상 시간**: 45분

### Phase 3-5: 테스트 및 성능 검증

**작업 항목**:

1. **단위 테스트** (45분)
   - useRealTimeSync Hook 테스트
   - API 응답 mocking
   - 폴링 타이밍 검증
   - 에러 처리 검증

2. **통합 테스트** (60분)
   - 다중 탭 시나리오
   - BroadcastChannel + 폴링 협력
   - 성능 측정 (CPU, 메모리)
   - 네트워크 에러 시나리오

3. **성능 최적화** (30분)
   - 폴링 주기 최적화
   - 캐싱 전략
   - 네트워크 요청 최소화

**작업 예상 시간**: 135분 (2시간 15분)

---

## 📊 Step 3 전체 작업 시간표

| Phase | 작업 | 예상 시간 |
|-------|------|---------|
| 3-1 | API 엔드포인트 생성 | 30분 |
| 3-2 | useRealTimeSync Hook | 45분 |
| 3-3 | RAG 컴포넌트 통합 | 30분 |
| 3-4 | BroadcastChannel 통합 | 45분 |
| 3-5 | 테스트 및 검증 | 135분 |
| - | **총계** | **4시간 5분** |

**예상 소요 시간**: 3.5-4시간 (예비 15분 포함)

---

## 🔧 Step 3 구현 상세

### API 엔드포인트 상세 설계

```typescript
// GET /api/rag/state

// 요청:
{
  lastUpdate?: number  // 마지막 업데이트 타임스탬프 (옵션)
  sessionId?: string   // 특정 세션만 조회 (옵션)
}

// 성공 응답 (200):
{
  sessions: ChatSession[]  // 변경된 세션들
  projects: ChatProject[]  // 변경된 프로젝트들
  lastUpdate: number       // 현재 타임스탬프
  hasChanges: boolean      // 변경사항 유무
}

// 에러 응답 (500):
{
  error: string
  message: string
}

// 구현 로직:
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lastUpdate = searchParams.get('lastUpdate') ?
    Number(searchParams.get('lastUpdate')) : 0

  try {
    // IndexedDB에서 모든 세션 조회
    const sessions = await ChatStorageIndexedDB.loadSessions()

    // lastUpdate 이후의 변경사항만 필터링
    const changedSessions = sessions.filter(
      s => s.updatedAt > lastUpdate
    )

    // 응답
    return Response.json({
      sessions: changedSessions,
      lastUpdate: Date.now(),
      hasChanges: changedSessions.length > 0
    })
  } catch (error) {
    return Response.json(
      { error: 'Failed to load sessions', message: error.message },
      { status: 500 }
    )
  }
}
```

### useRealTimeSync Hook 상세 설계

```typescript
interface UseRealTimeSyncOptions {
  pollingInterval?: number  // 기본값: 2000ms
  onSessionsUpdate?: (sessions: ChatSession[]) => void
  onError?: (error: Error) => void
  sessionId?: string  // 특정 세션만 폴링 (옵션)
}

export function useRealTimeSync(options: UseRealTimeSyncOptions = {}) {
  const {
    pollingInterval = 2000,
    onSessionsUpdate,
    onError,
    sessionId
  } = options

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastUpdateRef = useRef<number>(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const poll = async () => {
      try {
        setIsLoading(true)

        // API 호출
        const response = await fetch(
          `/api/rag/state?lastUpdate=${lastUpdateRef.current}${sessionId ? `&sessionId=${sessionId}` : ''}`,
          {
            signal: abortControllerRef.current?.signal
          }
        )

        if (!response.ok) throw new Error('Polling failed')

        const data = await response.json()

        // 변경사항이 있을 때만 콜백 실행
        if (data.hasChanges && onSessionsUpdate) {
          onSessionsUpdate(data.sessions)
        }

        lastUpdateRef.current = data.lastUpdate
        setError(null)
      } catch (err) {
        if (err.name !== 'AbortError') {
          const error = new Error(`Polling error: ${err.message}`)
          setError(error)
          onError?.(error)
        }
      } finally {
        setIsLoading(false)
      }
    }

    // 폴링 시작
    intervalRef.current = setInterval(poll, pollingInterval)

    // 초기 실행
    poll()

    // 정리
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      abortControllerRef.current?.abort()
    }
  }, [pollingInterval, sessionId, onSessionsUpdate, onError])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    abortControllerRef.current?.abort()
  }, [])

  return { isLoading, error, stop }
}
```

### RAGAssistant 통합 예제

```typescript
export const RAGAssistant = ({ method, className, onNewMessage }: RAGAssistantProps) => {
  const [sessions, setSessions] = useState<ChatSession[]>([])

  // 기존 코드: useEffect에서 초기 세션 로드
  useEffect(() => {
    const loadInitialSessions = async () => {
      try {
        const loadedSessions = await ChatStorageIndexedDB.loadSessions()
        setSessions(loadedSessions)
      } catch (err) {
        console.error('Failed to load sessions:', err)
      }
    }
    loadInitialSessions()
  }, [])

  // ✅ Step 3: 실시간 동기화 추가
  useRealTimeSync({
    pollingInterval: 2000,
    onSessionsUpdate: (updatedSessions) => {
      // 병합 로직: 로컬 상태와 서버 상태를 합침
      setSessions(prevSessions => {
        // 로컬에서 추가/수정된 항목 식별
        const localUpdates = new Map(
          prevSessions.map(s => [s.id, s])
        )

        // 서버에서 온 변경사항 적용
        updatedSessions.forEach(updated => {
          localUpdates.set(updated.id, updated)
        })

        return Array.from(localUpdates.values())
      })
    },
    onError: (error) => {
      console.error('Real-time sync error:', error)
      // 에러 UI 표시 (토스트 메시지 등)
    }
  })

  // ...rest of implementation
}
```

---

## ✅ Step 3 검증 체크리스트

### Phase 3-1 검증

- [ ] GET /api/rag/state 엔드포인트 작동
- [ ] 변경사항 필터링 로직 정상
- [ ] 에러 처리 정상
- [ ] 응답 형식 올바름
- [ ] TypeScript 타입 안전성

### Phase 3-2 검증

- [ ] useRealTimeSync Hook 정상 작동
- [ ] 폴링 주기 정확함
- [ ] 에러 처리 정상
- [ ] 메모리 누수 없음
- [ ] AbortController 정상 작동

### Phase 3-3 검증

- [ ] RAGAssistant와 통합 정상
- [ ] RAGChatInterface와 통합 정상
- [ ] UI 자동 업데이트 정상
- [ ] 상태 병합 로직 정상

### Phase 3-4 검증

- [ ] BroadcastChannel 이벤트 수신
- [ ] 폴링과 이벤트의 중복 제거
- [ ] 다중 탭 동기화 정상
- [ ] 성능 최적화 (중복 요청 방지)

### Phase 3-5 검증

- [ ] 단위 테스트 통과
- [ ] 통합 테스트 통과 (다중 탭)
- [ ] 성능 측정 (CPU < 5%, 메모리 < 20MB)
- [ ] 네트워크 에러 시나리오 통과
- [ ] TypeScript 컴파일 0 에러
- [ ] 빌드 성공

---

## 🎯 Step 3 완료 기준

### 필수 기준

- ✅ API 엔드포인트 완성 및 테스트
- ✅ useRealTimeSync Hook 완성 및 테스트
- ✅ RAG 컴포넌트 통합 완성
- ✅ BroadcastChannel + 폴링 통합 완성
- ✅ 포괄적 테스트 작성 및 통과
- ✅ TypeScript 0 에러
- ✅ 빌드 성공

### 선택 기준

- 🟡 성능 최적화 (캐싱, 요청 최소화)
- 🟡 UI 개선 (실시간 동기화 표시)

---

## 📈 전체 진도 (Step 3 완료 후)

```
Step 1: ✅✅✅ 100% (IndexedDB 저장소 구축)
Step 2: ✅✅✅ 100% (RAG 컴포넌트 비동기 전환)
Step 3: ✅✅✅ 100% (폴링 기반 실시간 동기화) ← 예정

────────────────────────────
전체:   100% (3/3 완료) 🎉
```

---

## 🚀 다음 단계

Step 3 완료 후 예정된 작업:

### Phase 4: localStorage → IndexedDB 마이그레이션 (선택)

**목적**: 기존 로컬 데이터를 IndexedDB로 자동 마이그레이션

**예상 시간**: 2-3시간

**작업 내용**:
- localStorage 데이터 읽기
- IndexedDB로 변환 및 저장
- 마이그레이션 완료 표시
- 마이그레이션 실패 시 복구

### Phase 5: 배포 및 모니터링 (선택)

**예상 시간**: 2-3시간

---

## 📞 준비 상태

```
✅ 기술 스택 검토 완료
✅ 아키텍처 설계 완료
✅ 코드 예제 작성 완료
✅ 테스트 전략 수립 완료
✅ 성능 최적화 계획 완료

🚀 Step 3 시작 준비 완료!
```

---

**작성**: 2025-11-04
**상태**: 📋 계획 완료, 구현 대기 중
**다음 액션**: 사용자 승인 후 Step 3 시작

