# PLAN: BlastRunner / GenericBlastRunner 통합

> 2026-03-27 작성 · 오케스트레이션 ~80% 중복 제거, `useBlastExecution` 훅 추출

## 현황

### 두 컴포넌트

| | BlastRunner | GenericBlastRunner |
|---|---|---|
| 파일 | `components/genetics/BlastRunner.tsx` (427줄) | `app/genetics/blast/BlastSearchContent.tsx` 내부 인라인 (~250줄) |
| 용도 | DNA 바코딩 종 판별 (marker 기반) | 범용 BLAST 서열 검색 (program/database/expect) |
| 소비자 | `BarcodingContent.tsx` | `BlastSearchContent.tsx` |

### 공유 유틸 (이미 존재)

- `lib/genetics/blast-utils.ts` (27줄) — 상수 5개 + `blastSleep()`
- `packages/types/src/blast.ts` (149줄) — 타입 정의

### 오케스트레이션 흐름 (동일)

```
submit(/api/blast/submit) → 429 retry
  → poll(/api/blast/status/:rid, 15초×40회)
  → fetch(/api/blast/result/:rid, 202 retry)
  → species enrichment(/api/ncbi/species)
  → done
```

캐시 히트 시: submit 응답에 hits 포함 → poll/fetch 스킵 → UX 딜레이 → enrichment

---

## 중복 vs 차이 분석

### 동일 로직 (~80%)

| 영역 | 줄 수 |
|------|-------|
| 상수 정의 | ~8줄 |
| AbortController + ref 패턴 | ~12줄 |
| 429 retry 루프 | ~20줄 |
| 비-JSON 응답 에러 처리 | ~10줄 |
| 폴링 루프 (READY/FAILED/UNKNOWN) | ~18줄 |
| 결과 fetch + 202 retry | ~12줄 |
| phase/elapsed 상태 관리 | ~25줄 |
| 4-segment progress bar UI | ~20줄 |
| step labels + 시간 표시 UI | ~20줄 |
| 취소 버튼 | ~8줄 |
| **소계** | **~153줄** |

### 차이점 (통합 시 분기/설정 필요)

| 차이 | BlastRunner | GenericBlastRunner | 통합 방향 |
|------|-------------|-------------------|-----------|
| Submit payload | `{ sequence, marker }` | `{ sequence, program, database, expect, hitlistSize, megablast }` | 훅 파라미터로 추상화 |
| `cleanSequence` 호출 | submit 직전 호출 | 안 함 (입력 컴포넌트에서 처리) | 소비자 책임으로 통일 |
| 결과 URL | `?hash=&marker=` | `URLSearchParams(hash, cacheKey)` | `buildResultUrl()` 유틸 |
| 캐시 딜레이 | 800ms + 800ms, species 병렬 | 600ms + 400ms, 순차 | 병렬 패턴 채택 (더 나은 UX) |
| Hit 변환 | 없음 (Record 그대로 전달) | `GenericBlastHit[]`로 명시 매핑 | 소비자 `transform`에서 처리 |
| onResult 시그니처 | `(data: unknown)` | `(hits: GenericBlastHit[], elapsed: number)` | 훅 `onComplete(result, elapsed)`로 통일 |
| onError 시그니처 | `(message, code: BlastErrorCode)` | `(message)` | `BlastErrorCode` 포함으로 통일 |
| 에러 클래스 | `BlastError` (code 포함) | 일반 `Error` | `BlastError` 채택 |
| 색상 체계 | 하드코딩 (`bg-blue-600`, `bg-white`) | 디자인 토큰 (`bg-primary`, `bg-card`) | 디자인 토큰으로 통일 |
| Species enrichment | 전체 1회, country/isBarcode 포함 | 50개 배치, db 분기, description 포함 | 별도 함수 유지 (아래 설명) |

### enrichHitsWithSpecies — 통합 불가, 별도 유지

응답 스키마가 다르고 배치 전략이 다르므로 무리한 통합은 config 복잡도만 증가:

| 필드 | BlastRunner | GenericBlastRunner |
|------|-------------|-------------------|
| species | O | O |
| taxid | O | O |
| country | O | X |
| isBarcode | O | X |
| description (meta.title) | X | O |
| 배치 | 전체 한번 | 50개씩 |
| db 파라미터 | 없음 | protein/nuccore 분기 |

**결정**: `blast-utils.ts`로 이동하되 `enrichBarcodeHits` / `enrichGenericHits`로 분리 유지.

---

## 구현 계획

### Step 0: BlastRunner → blast-utils 마이그레이션

**목표**: BlastRunner가 자체 정의한 상수/sleep을 `blast-utils.ts`로 교체

변경 파일:
- `components/genetics/BlastRunner.tsx` — 상수 5개 + `sleep()` 함수 제거, `blast-utils` import

검증: 기존 동작 변경 없음 (import 경로만 변경)

### Step 1: blast-utils.ts 확장

**목표**: 공유 유틸리티 중앙화

추가할 것:
- `BlastError` 클래스 + `BlastErrorCode` 타입 (BlastRunner.tsx에서 이동)
- `BlastPhase` 타입
- `fetchBlastResult(url, signal)` — 202 retry 로직 통합
- `buildResultUrl(rid, params)` — URL 구성 통합
- `enrichBarcodeHits(hits, signal)` — BlastRunner의 enrichHitsWithSpecies 이동
- `enrichGenericHits(hits, program, signal)` — GenericBlastRunner의 enrichHitsWithSpecies 이동
- `STEP_LABELS` 상수

변경 파일:
- `lib/genetics/blast-utils.ts` — 위 항목 추가
- `components/genetics/BlastRunner.tsx` — 해당 코드 제거, import 교체
- `app/genetics/blast/BlastSearchContent.tsx` — 해당 코드 제거, import 교체

### Step 2: BlastProgressUI 프레젠테이셔널 컴포넌트

**목표**: 두 Runner의 동일한 UI 부분 추출

```typescript
// components/genetics/BlastProgressUI.tsx

interface BlastProgressUIProps {
  phase: BlastPhase
  currentStep: number        // 0-3
  elapsed: number
  estimatedTime: number
  stepLabels: readonly string[]
  errorMessage?: string
  onCancel: () => void
}

export function BlastProgressUI({ ... }: BlastProgressUIProps): React.ReactElement
```

포함:
- 4-segment progress bar (디자인 토큰 사용)
- Step labels (체크마크 + 번호)
- 경과/예상 시간 표시
- 에러 표시
- 취소 버튼
- "페이지 유지" 안내문
- 120초 초과 경고

**색상**: GenericBlastRunner의 디자인 토큰 패턴 채택 (dark mode 지원)

```
bg-card, bg-primary, bg-destructive/30, text-foreground,
text-muted-foreground, text-green-600 dark:text-green-400
```

### Step 3: useBlastExecution 훅

**목표**: submit → poll → fetch 오케스트레이션 로직 추출

#### 인터페이스 설계 원칙

**`transform` + `onComplete` 분리** — `onRawResult` 단일 콜백의 문제점:
- 소비자가 `onRawResult` 안에서 부모의 `onResult`를 호출하면,
  캐시 히트 시 UX 딜레이가 끝나기 전에 부모 상태가 `result`로 전이 → 진행 UI 스킵
- 현재 BlastRunner는 enrichment만 병렬이고 `onResult`는 딜레이+enrich 모두 완료 후 호출
- 따라서 훅이 **최종 결과 전달 시점을 소유**해야 함

```typescript
// hooks/use-blast-execution.ts

interface BlastSubmitPayload {
  sequence: string
  marker?: BlastMarker
  program?: BlastProgram
  database?: BlastDatabase
  expect?: number
  hitlistSize?: number
  megablast?: boolean
}

interface UseBlastExecutionOptions<T> {
  payload: BlastSubmitPayload

  /**
   * rawHits → 최종 결과 변환 (enrichment + 타입 매핑).
   * 순수 후처리 전용 — 이 안에서 부모 콜백을 호출하면 안 됨.
   * 반환값이 onComplete로 전달됨.
   *
   * 캐시 경로: UX 딜레이와 병렬 실행 (먼저 끝나면 딜레이 완료까지 대기)
   * 일반 경로: fetch 완료 후 순차 실행
   */
  transform: (
    rawHits: Array<Record<string, unknown>>,
    signal: AbortSignal,
  ) => Promise<T>

  /**
   * transform 완료 + UX 딜레이 완료 후 훅이 호출.
   * 이 시점에 phase='done'으로 전이됨.
   * elapsed는 훅이 계산하여 전달 — 소비자가 별도 타이머 불필요.
   */
  onComplete: (result: T, elapsedSec: number) => void

  onError: (message: string, code: BlastErrorCode) => void
  onCancel: () => void
}

interface UseBlastExecutionReturn {
  phase: BlastPhase
  currentStep: number         // 0-3 (phase + elapsed 기반 계산)
  elapsed: number
  estimatedTime: number
  errorMessage: string
  cancel: () => void          // AbortController.abort() + onCancel
}
```

#### 훅 내부 동작

1. 마운트 시 자동 실행 (useEffect)
2. **StrictMode 방어**: abort-on-cleanup이 1차 방어. 추가로 `submittedRef`
   플래그로 cleanup 후 재실행 시 이전 abort 완료를 보장 (아래 상세)
3. AbortController 생성/관리
4. submit + 429 retry (MAX_SUBMIT_RETRIES)
5. **캐시 히트 경로**:
   ```
   Promise.all([
     sleep(800) + sleep(800),      // UX 딜레이
     transform(rawHits, signal),   // enrichment (병렬)
   ])
   → onComplete(result, elapsed)   // 둘 다 완료 후
   → phase = 'done'
   ```
6. **일반 경로**: poll → fetch → transform → onComplete → phase='done'
7. 에러 시 `BlastError.code` 추출 → onError
8. 언마운트 시 abort
9. elapsed 타이머 (1초 간격, phase가 done/error가 아닌 동안)
10. currentStep 계산 (phase + elapsed/estimatedTime 기반)

**의존성 배열**: `[payload]` — payload 객체가 변경되면 재실행
- 소비자는 `useMemo`로 payload를 안정화해야 함

#### React StrictMode 이중 실행 방어

`reactStrictMode: true` (next.config.ts:125) 에서 useEffect는 mount→cleanup→mount 실행됨.

**방어 전략** (2중):
1. **abort-on-cleanup** (1차) — cleanup에서 `ctrl.abort()` → 첫 실행의 모든 fetch/sleep이 AbortError로 중단
2. **submittedRef guard** (2차) — 첫 fetch가 서버에 도달한 후 abort되는 edge case 방어

```typescript
// 훅 내부 구현 스케치
const submittedRef = useRef(false)

useEffect(() => {
  const ctrl = new AbortController()
  const { signal } = ctrl

  async function run(): Promise<void> {
    // StrictMode 2차 방어: cleanup에서 abort된 후 재실행 시
    // 이전 실행의 서버 요청이 이미 전송되었을 수 있음.
    // abort-on-cleanup이 응답 처리를 차단하므로 중복 결과는 없지만,
    // NCBI에 불필요한 RID가 생성될 수 있음 (무해 — idempotent).

    if (signal.aborted) return

    // ... submit → poll → fetch → transform → onComplete
  }

  run()
  return () => { ctrl.abort() }
}, [payload])
```

NCBI BLAST submit은 idempotent (동일 서열 → 동일 RID 또는 캐시)이므로,
abort-on-cleanup만으로 충분. 단, 개발 모드에서 Network 탭 확인 권장.

### Step 4: BlastRunner 리팩토링

**목표**: 훅 + UI 컴포넌트 사용으로 전환

```typescript
// components/genetics/BlastRunner.tsx — 리팩토링 후 ~80줄

type BarcodeResult = { hits: Array<Record<string, unknown>> }

export function BlastRunner({ sequence, marker, onResult, onError, onCancel }: BlastRunnerProps) {
  const payload = useMemo(() => ({
    sequence: cleanSequence(sequence),
    marker,
  }), [sequence, marker])

  // transform: enrichment만 수행, 최종 결과 객체 반환
  // onResult는 여기서 호출하지 않음 — 훅의 onComplete가 담당
  const transform = useCallback(async (
    rawHits: Array<Record<string, unknown>>,
    signal: AbortSignal,
  ): Promise<BarcodeResult> => {
    await enrichBarcodeHits(rawHits, signal)
    return { hits: rawHits }
  }, [])

  const onCompleteRef = useRef(onResult)
  onCompleteRef.current = onResult
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  const { phase, currentStep, elapsed, estimatedTime, errorMessage, cancel } =
    useBlastExecution({
      payload,
      transform,
      // 훅이 UX 딜레이 + transform 완료 후 호출
      onComplete: (result, _elapsed) => onCompleteRef.current(result),
      onError: (msg, code) => onErrorRef.current(msg, code),
      onCancel,
    })

  return (
    <BlastProgressUI
      phase={phase}
      currentStep={currentStep}
      elapsed={elapsed}
      estimatedTime={estimatedTime}
      stepLabels={STEP_LABELS}
      errorMessage={errorMessage}
      onCancel={cancel}
    />
  )
}
```

- `BlastErrorCode` export는 유지 (BarcodingContent가 import)
- `cleanSequence`는 payload 생성 시 호출 (소비자 책임)
- `transform` 안에서 `onResult` 호출 금지 — 캐시 경로 레이스 방지

### Step 5: GenericBlastRunner 리팩토링

**목표**: 인라인 GenericBlastRunner를 훅 + UI로 전환

```typescript
// app/genetics/blast/BlastSearchContent.tsx 내부 — 리팩토링 후 ~60줄

function GenericBlastRunner({ params, onResult, onError, onCancel }: RunnerProps) {
  const payload = useMemo(() => ({
    sequence: params.sequence,
    program: params.program,
    database: params.database,
    expect: params.expect,
    hitlistSize: params.hitlistSize,
    megablast: params.megablast,
  }), [params])

  // transform: 타입 매핑 + enrichment. onResult 호출 금지.
  const transform = useCallback(async (
    rawHits: Array<Record<string, unknown>>,
    signal: AbortSignal,
  ): Promise<GenericBlastHit[]> => {
    const hits = mapToGenericHits(rawHits)
    await enrichGenericHits(hits, params.program, signal)
    return hits
  }, [params.program])

  const onResultRef = useRef(onResult)
  onResultRef.current = onResult
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  const { phase, currentStep, elapsed, estimatedTime, errorMessage, cancel } =
    useBlastExecution({
      payload,
      transform,
      // 훅이 elapsed를 계산하여 전달 — startRef 불필요
      onComplete: (hits, elapsedSec) => onResultRef.current(hits, elapsedSec),
      onError: (msg) => onErrorRef.current(msg),
      onCancel,
    })

  return (
    <BlastProgressUI
      phase={phase}
      currentStep={currentStep}
      elapsed={elapsed}
      estimatedTime={estimatedTime}
      stepLabels={STEP_LABELS}
      errorMessage={errorMessage}
      onCancel={cancel}
    />
  )
}
```

- `mapToGenericHits(rawHits)` — 기존 히트 변환 로직 (201-215줄) 추출
- `fetchResult()` 제거 (훅 내부 `fetchBlastResult` 사용)
- `startRef.current` 제거 — elapsed는 훅이 `onComplete(result, elapsedSec)`로 전달

### Step 6: 정리

- BlastRunner.tsx에서 제거된 코드 확인 (sleep, 상수, enrichHitsWithSpecies, fetchBlastResult)
- BlastSearchContent.tsx에서 제거된 코드 확인 (enrichHitsWithSpecies, fetchResult, 상수)
- `blast-utils.ts`에서 미사용 export 없는지 확인
- 기존 import 경로 정상 동작 확인 (`BlastErrorCode` re-export 등)

---

## 파일 변경 요약

| 파일 | 변경 |
|------|------|
| `lib/genetics/blast-utils.ts` | 27줄 → ~180줄 (타입, 에러, fetch, enrich, URL 빌더) |
| `hooks/use-blast-execution.ts` | **신규** ~120줄 |
| `components/genetics/BlastProgressUI.tsx` | **신규** ~80줄 |
| `components/genetics/BlastRunner.tsx` | 427줄 → ~80줄 |
| `app/genetics/blast/BlastSearchContent.tsx` | 408줄 → ~200줄 (GenericBlastRunner ~60줄 + 페이지 ~140줄) |

### 전후 비교

| | Before | After |
|---|---|---|
| 총 코드 | ~860줄 | ~660줄 |
| 중복 오케스트레이션 | 2벌 (~300줄) | 1벌 (~120줄) |
| 중복 UI | 2벌 (~160줄) | 1벌 (~80줄) |
| Dark mode | BlastRunner 미지원 | 전체 지원 |
| 새 Runner 추가 시 | ~250줄 복붙 | 훅 + UI 조합 ~50줄 |

---

## 검증 기준

### 기능 검증
- [ ] 바코딩 (/genetics/barcoding): 서열 입력 → 분석 실행 → 결과 표시 정상
- [ ] BLAST 검색 (/genetics/blast): 범용 검색 → 결과 표시 정상
- [ ] 캐시 히트 경로: UX 딜레이 동안 진행 UI가 표시되고, transform 완료 후 결과 화면 전이
- [ ] 캐시 히트 경로: transform이 딜레이보다 먼저 끝나도 진행 UI가 스킵되지 않음
- [ ] 일반 경로: poll → fetch → transform → onComplete 순서 정상
- [ ] 429 rate limit: retry 후 복구
- [ ] 취소: AbortController 정상 해제
- [ ] 10분 타임아웃: 에러 메시지 표시
- [ ] Dark mode: progress bar + step labels 정상 렌더링
- [ ] `BlastErrorCode` import: BarcodingContent.tsx 기존 코드 정상
- [ ] GenericBlastRunner 결과 카드에 올바른 elapsed 표시 (훅 제공 값)
- [ ] `pnpm tsc --noEmit` 통과

### StrictMode 검증
- [ ] 개발 모드에서 Network 탭 확인: submit 요청이 최대 2회 (StrictMode), 결과는 1회만 처리
- [ ] cleanup abort 후 재실행 시 이전 결과가 상태에 반영되지 않음

---

## 제외/후속

- GenericBlastRunner를 별도 파일로 분리 — 현재 인라인으로 충분 (~60줄)
- `mapToGenericHits` 를 타입 패키지로 이동 — 소비자가 1곳이므로 불필요
- species enrichment 완전 통합 — 스키마 차이로 인해 비용 > 이득
- Worker API 엔드포인트 변경 — 현재 리팩토링 범위 밖
