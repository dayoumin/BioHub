# Code Review 요청: 세션 품질 수정 (2026-03-25)

**리뷰 대상**: 이 세션에서 수정한 코드 중 복잡도가 높거나 설계 판단이 필요한 3건
**작성자**: Claude Opus 4.6
**자체 검토**: /simplify 3회 수행 (3-agent parallel review × 3)

---

## 리뷰 항목 1: Hub Chat Intent별 LLM 토큰 경량화

### 변경 파일
- `lib/services/hub-chat-service.ts` — 컨텍스트 빌더 연결
- `lib/services/openrouter-recommender.ts` — `dataContextOverride` 옵션 추가

### 배경
Hub Chat에서 LLM 호출 시 `validationResults` 전체를 항상 `buildDataContextMarkdown()`으로 변환하여 전달.
intent별로 필요한 데이터 양이 다름에도 동일 크기 전송:
- `data-consultation`: 전체 통계 필요 (~1300 토큰)
- `visualization`: 변수 범위+타입만 (~400 토큰)
- `experiment-design`: 행/열+변수명만 (~120 토큰)

### 변경 내용
`data-context-builder.ts`에 **이미 구현되어 있던** `buildContextForIntent(track, validationResults)` 함수를 hub-chat-service에서 호출하도록 연결.

```typescript
// hub-chat-service.ts (변경 후)
const dataContextMarkdown = hasData
  ? buildContextForIntent(intent.track, dataContext.validationResults)
  : undefined

const result = await openRouterRecommender.recommendWithSystemPrompt(
  userMessage, systemPrompt,
  hasData ? dataContext.validationResults : null,  // validColumnNames 검증용 (별도 용도)
  null, null,
  { chatHistory: flowHistory, dataContextOverride: dataContextMarkdown }
)
```

```typescript
// openrouter-recommender.ts (변경 후)
private buildUserPrompt(
  userInput: string,
  validationResults: ValidationResults | null,
  assumptionResults: StatisticalAssumptions | null,
  dataContextOverride?: string          // ← 새 파라미터
): string {
  const dataContext = dataContextOverride ?? this.buildDataContext(validationResults)
  // ...
}
```

### 리뷰 포인트

1. **`validationResults`를 여전히 전달하는 이유**: 프롬프트 빌드용이 아니라 `validColumnNames` 추출용 (LLM 응답에서 허위 변수명 필터링). 두 가지 용도가 한 함수에 혼재 — 괜찮은가?

2. **`dataContextOverride` 패턴 판단**: options 객체에 override string 추가 vs track 파라미터를 recommender에 전달하는 방식. 현재 방식은 recommender가 intent를 모르게 유지. 이것이 맞는 방향인지?

3. **현재 Hub Chat에서 `data-consultation` track만 LLM 호출됨** (`ChatCentricHub.tsx`에서 다른 track은 즉시 라우팅). 따라서 실질적으로 항상 full context가 전송됨. 향후 다른 track에서도 LLM을 호출하게 되면 경량화 효과 발생. **지금은 기반 작업**인 점.

4. **`buildContextForIntent()` 함수 자체의 switch 분기가 올바른지**:
   ```typescript
   case 'direct-analysis':
   case 'data-consultation':
     return buildDataContextMarkdown(validationResults)     // 전체
   case 'visualization':
     return buildVisualizationContext(validationResults)     // 경량
   case 'experiment-design':
     return buildConsultationContext(validationResults)      // 최소
   ```

---

## 리뷰 항목 2: Intent Router 테스트 임계값 0.7→0.6 반영

### 변경 파일
- `__tests__/services/intent-router-critical.test.ts` — 5개 테스트 + 시나리오 테이블 수정

### 배경
이전 세션에서 intent-router의 키워드 confidence 임계값이 0.7→0.6으로 조정됨.
테스트는 0.7 기준으로 작성되어 3개 실패:
- consultation 키워드 1개 → confidence 0.65 → 이전: `< 0.7` LLM 호출 / 현재: `>= 0.6` 키워드 반환

### 핵심 변경: "Low keyword" 시나리오 소멸

임계값 0.6에서는 **모든 키워드 매칭이 confidence >= 0.65** (consultation 최소값 = 0.5 + 1×0.15 = 0.65).
따라서 "키워드 Low + LLM 호출" 시나리오가 불가능해짐.

**변경 전 시나리오 매트릭스**:
```
| 키워드 | LLM       | 결과              |
| High   | -         | 키워드 (LLM 생략)  |
| Low    | 성공      | LLM               |   ← 불가능해짐
| Low    | null      | 키워드 (3차)       |   ← 불가능해짐
| 없음   | 성공      | LLM               |
| 없음   | null      | 최종 fallback     |
```

**변경 후**:
```
| 키워드 | LLM       | 결과                       |
| 매칭됨 | -         | 키워드 (LLM 생략, >= 0.6)  |
| 없음   | 성공      | LLM                        |
| 없음   | null      | 최종 fallback              |
```

### 리뷰 포인트

1. **시나리오 2 (J.2) 변경**: 기존 "Low + LLM 성공 → LLM" → "키워드 매칭 → LLM 미호출". LLM mock을 설정하지만 호출되지 않는 것이 의도적 (mock이 설정되어도 short-circuit됨을 증명). 이 테스트 설계가 명확한지?

2. **시나리오 3 (J.3) 변경**: 기존 "Low + LLM null → 키워드 3차" → "없음 + LLM null → 최종 fallback". 이것은 기존 시나리오 5와 유사 (차이: LLM null vs throw). 중복 허용 판단이 맞는지?

3. **테스트 C.2 (line 184)**: 입력 `'분석 추천'` → consultation 0.65 >= 0.6 → 키워드 반환. LLM mock `null` 설정됨. **실제로는 LLM이 호출되지 않으므로 mock 무의미**. 하지만 "LLM이 null이어도 키워드가 short-circuit" 의미로 남겨둠. 정리 필요?

4. **임계값이 0.6 미만으로 재조정될 가능성**: 조정 시 "Low keyword" 시나리오가 부활. 현재 테스트가 그 경우를 쉽게 복원할 수 있는 구조인지?

---

## 리뷰 항목 3: Worker 9 (Genetics) 타입 시스템 전파

### 변경 파일
- `lib/constants/methods-registry.types.ts` — `WorkerNumber`, `WorkerKey`, 매핑, `Worker9Method`, `AllMethodNames`
- `lib/services/pyodide/core/pyodide-core.service.ts` — 인라인 유니온 5곳 → `WorkerNumber` 임포트
- `hooks/use-bio-tool-analysis.ts` — `methodName: string` → `AllMethodNames`
- `__tests__/lib/methods-registry-sync.test.ts` — Worker 9 추가

### 변경 내용

**Before**: Worker 번호가 `1 | 2 | 3 | 4 | 5 | 6 | 7 | 8` 인라인 유니온으로 5곳에 산재.
**After**: `WorkerNumber` 타입으로 단일 소스 통일 + Worker 9 포함.

```typescript
// methods-registry.types.ts
export type WorkerNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

// pyodide-core.service.ts (변경 후)
import type { WorkerNumber } from '@/lib/constants/methods-registry.types'

async callWorkerMethod<T>(workerNum: WorkerNumber, ...) // 이전: 1|2|...|8
async ensureWorkerLoaded(workerNumber: WorkerNumber)    // 이전: 1|2|...|8
private async callWorkerMethodViaWebWorker<T>(workerNum: WorkerNumber, ...)
private getWorkerFileName(workerNumber: WorkerNumber)   // 이전: number
private async loadAdditionalPackages(workerNumber: WorkerNumber) // 이전: number + cast
```

```typescript
// use-bio-tool-analysis.ts
runAnalysis: (methodName: AllMethodNames, params: Record<string, WorkerMethodParam>) => Promise<void>
// 이전: methodName: string
```

### 리뷰 포인트

1. **`AllMethodNames`가 너무 넓은지 (확인된 한계)**: 훅이 특정 Worker (예: Ecology=8)로 설정되어도 다른 Worker의 메서드명(예: `'descriptive_stats'`)을 타입 레벨에서 허용. per-worker 타입 제약은 conditional type 또는 generic overload 필요 — 현 단계에서는 `string` → `AllMethodNames`만으로 충분한 개선. 런타임 에러는 Python Worker에서 "method not found"로 즉시 표면화됨.

2. **`methods-registry.json`에 `worker9`가 이미 존재**: 다른 세션에서 추가됨. `Worker9Method = keyof typeof methodsRegistry.worker9.methods` → `'hardy_weinberg' | 'fst'`. JSON이 없었다면 타입 에러 발생했을 것. **JSON과 타입 파일의 동기화 의존성** 인지.

3. **`methods-registry-sync.test.ts`의 Worker 9 포함**: Python 파일 `worker9-genetics.py`와 JSON 레지스트리 간 함수명 동기화를 검증. Worker 9의 `hardy_weinberg`, `fst` 함수가 Python 파일에 실제 존재하는지 테스트가 자동으로 확인함.

4. **`callWorkerMethod`의 `methodName` 파라미터는 여전히 `string`**: 훅에서는 `AllMethodNames`로 제약하지만, core service에서는 `string` 유지. 레거시 래퍼 100+곳이 `string`으로 호출하므로 일괄 변경 시 영향 범위가 큼. 단계적 전환이 맞는지?

---

## 자체 검토 결과 (3회 /simplify)

| 라운드 | 발견 | 조치 |
|--------|------|------|
| 1차 | intent-router 테스트 헤더 "0.7" → "0.6" 미갱신, stale 주석 2곳 | 수정 완료 |
| 2차 | `WorkerNumber` 인라인 유니온 5곳, `loadAdditionalPackages` cast, JSDoc "1-4", registry-sync Worker 9 누락 | 모두 수정 |
| 3차 (token 경량화) | 이슈 없음 — 코드 깨끗 | - |

**tsc**: `.next/types/validator.ts` 제외 시 타입 에러 0개 (삭제된 barcoding 페이지 참조하는 빌드 아티팩트 — `next build` 또는 `.next` 삭제로 해소)
**Vitest**: 변경 파일 관련 테스트 모두 통과 (52 + 23 + 110 = 185개)
