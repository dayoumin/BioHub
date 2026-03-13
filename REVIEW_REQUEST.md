# Code Review Request: 결과 화면 통계 정확성 + AI 해석 캐싱 수정

**범위**: stats/ 하 10파일, unstaged changes
**근거**: 결과 화면(ResultsActionStep) 비판적 검토 → 통계값 표시 오류 5건 + AI 해석 매번 재호출 1건

---

## 1. 배경

통계 분석 결과 화면에서 (1) p-value/효과크기 포맷팅이 APA 7th 기준 미준수, (2) 효과크기 타입 매핑 누락, (3) AI 해석이 히스토리에 저장되지만 복원되지 않아 매번 API 재호출하는 문제 발견.
두 배치로 나누어 수정: Batch 1 = 통계 정확성 (5건), Batch 2 = AI 해석 캐싱 (1건).

---

## 2. Batch 1 — 통계 정확성 수정 (5건)

### B1-1. p-value APA 7th 포맷팅

| 파일 | 변경 |
|------|------|
| `results-helpers.ts` | `formatPValue()` 신규: APA 7th 준수 (선행 0 생략, `< .001` 예외, `p ≥ 1.0` 가드) |
| `formatters.ts` | `formatStatisticalResult()`: df 파라미터 optional화, `formatPValueAPA` 호출로 교체 |
| `ResultsActionStep.tsx` | APA 포맷 생성에서 `df === undefined` null-return 가드 제거 |
| `formatters.test.ts` | 테스트 기대값 APA 스타일로 갱신 + df-undefined/highly-significant 케이스 추가 |

**변경 전**: `p = 0.048` → `p < 0.05` (범주형)
**변경 후**: `p = 0.048` → `p = .048` (APA 정확값, 선행 0 생략)

**엣지 케이스**:
- `p = 0.0003` → `p < .001`
- `p = 1.0` → `p = 1.000` (선행 0 제거 시도 방지: `(1.0).toFixed(3).replace(/^0/, '')` = `"1.000"` 정상)
- `p = NaN` / `null` → `'-'`

### B1-2. 효과크기 해석 5단계 확장 (Cohen + Sawilowsky)

| 파일 | 변경 |
|------|------|
| `results-helpers.ts` | `getEffectSizeInterpretation()` 전면 재작성 |
| `terminology-types.ts` | `effectSizeLabels`에 `negligible?: string` 추가 |
| `domains/generic.ts` | `negligible: 'Negligible'` 추가 |
| `domains/aquaculture.ts` | `negligible: '무시할 수준'` 추가 |

기존 3단계(small/medium/large) → 5단계로 확장, 효과크기 타입별 다른 기준:

| 타입 | negligible | small | medium | large | veryLarge |
|------|-----------|-------|--------|-------|-----------|
| Cohen's d/g/Δ | < 0.2 | 0.2– | 0.5– | 0.8– | ≥ 1.2 |
| η²/η²ₚ/ω²/ε² | < 0.01 | 0.01– | 0.06– | 0.14– | ≥ 0.20 |
| r/φ/V/W | < 0.1 | 0.1– | 0.3– | 0.5– | ≥ 0.7 |
| R² | < 0.02 | 0.02– | 0.13– | 0.26– | ≥ 0.40 |

**리뷰 포인트**: `negligible` 키가 optional (`negligible?: string`)이고 fallback이 `labels.small`. 기존 도메인에서 `negligible` 미정의 시 silent degradation — 이 설계가 적절한가?

### B1-3. 효과크기 타입 매핑 강화

| 파일 | 변경 |
|------|------|
| `result-converter.ts` | typeMap 확장 (12 정규 타입 + 별칭 + 유니코드 기호 + executor 출력), 정규화 `.replace(/[\s\-']/g, '')` 추가 |
| `StatisticalResultCard.tsx` | effectSize type union에 12개 전체 타입 명시 |

**변경 전**: `"partial eta squared"`, `"η²ₚ"`, `"Spearman rho"` 등 → 매핑 실패 → `undefined` → 기본 Cohen's d 기준 적용
**변경 후**: 공백/하이픈/아포스트로피 제거 후 lookup → 정확한 타입 매칭

**executor 출력 타입 매핑 (리뷰 후 추가)**:

| executor 출력 | 정규화 | 매핑 | 해석 기준 |
|--------------|--------|------|-----------|
| `"rank-biserial r"` (nonparametric) | `rankbiserialr` | `'r'` | r 패밀리 |
| `"Spearman rho"` (correlation) | `spearmanrho` | `'r'` | r 패밀리 |
| `"Kendall tau"` (correlation) | `kendalltau` | `'r'` | r 패밀리 |
| `"Partial r"` (correlation) | `partialr` | `'r'` | r 패밀리 |
| `"epsilon-squared"` (nonparametric) | `epsilonsquared` | `'epsilonSquared'` | 이미 매핑됨 |
| `"Cohen's d"` (t-test) | `cohensd` | `'cohensD'` | 이미 매핑됨 |
| `"R-squared"` (regression) | `rsquared` | `'rSquared'` | 이미 매핑됨 |
| `"eta-squared"` (anova) | `etasquared` | `'etaSquared'` | 이미 매핑됨 |
| `"omega-squared"` (anova) | `omegasquared` | `'omegaSquared'` | 이미 매핑됨 |
| `"effect-size"` (advanced/power) | `effectsize` | 미매핑 → fallback `'cohensD'` | power analysis 결과로 해석 사용 드묾 |

**알려진 한계**: `"Spearman rho"` → `'r'` → symbol `'r'`로 표시. 학술적으로 `rₛ`가 정확하지만, 해석 기준(r 패밀리)은 동일하므로 우선 통합 매핑.

**리뷰 포인트**: 단일 문자 별칭 `"d"`, `"g"`, `"r"`, `"v"` 가 다른 문맥에서 충돌 가능한가?

### B1-4. 가정검정 없을 때 경고 표시 누락 수정

| 파일 | 변경 |
|------|------|
| `ResultsChartsSection.tsx` | 경고(warnings) 표시 조건에서 `assumptionTests.length === 0` 제거 |

**변경 전**: `assumptionTests.length > 0`인 경우에만 warnings 표시 → 가정검정 없는 분석에서 경고 무시
**변경 후**: warnings가 있으면 항상 표시

### B1-5. formatEffectSizeSymbol 완전 매핑

| 파일 | 변경 |
|------|------|
| `results-helpers.ts` | 12개 효과크기 타입 → 기호 매핑 완성 (기존: 부분적) |

---

## 3. Batch 2 — AI 해석 히스토리 복원 (A-1)

### 문제

AI 해석 결과는 `saveToHistory()`에서 IndexedDB `aiInterpretation` 필드로 저장됨. 그러나 `loadFromHistory()`에서 후속 Q&A(`interpretationChat`)만 복원하고 **해석 본문은 복원하지 않음**. 결과: 히스토리에서 분석을 다시 열 때마다 LLM API 재호출 (비용 + 지연 + 결과 불일치).

### 수정

| 파일 | 변경 |
|------|------|
| `smart-flow-store.ts` | `loadedAiInterpretation: string \| null` 필드 추가 (interface, initialState, resetSession) |
| `smart-flow-store.ts` | `loadFromHistory()`에서 `record.aiInterpretation ?? null` 복원 |
| `ResultsActionStep.tsx` | `getHistory` import 추가 (IndexedDB 직접 조회용) |
| `ResultsActionStep.tsx` | 히스토리 전환 effect에서 `getState()` 동기 읽기 + `interpretedResultRef` 센티널 설정 |
| `ResultsActionStep.tsx` | 첫 마운트(새로고침) 경로에서 IndexedDB 비동기 로드 + 동기 가드 |
| `ResultsActionStep.tsx` | auto-trigger에 `interpretedResultRef.current === null` 이중 가드 추가 |
| `ResultsActionStep.tsx` | 별도 useEffect로 `loadedAiInterpretation` → local state 복원 + cache key + store 소비 |

### 복원 경로 (2가지)

**경로 A: 히스토리 내비게이션 (같은 세션)**
```
loadFromHistory(id) → store.loadedAiInterpretation = "텍스트"
  → currentHistoryId 변경 → 전환 effect 실행
    → getState().loadedAiInterpretation 동기 읽기
    → setInterpretation(cached)
    → interpretedResultRef.current = '__restored__'  ← 동기 센티널
  → auto-trigger effect 실행
    → interpretedResultRef.current !== null → SKIP  ← state batching 무관
  → loadedAiInterpretation effect: cache key 설정 + store 소비
```

**경로 B: 페이지 새로고침**
```
sessionStorage → results, currentHistoryId 복원 (loadedAiInterpretation은 미포함)
  → 첫 마운트 guard 실행
    → currentHistoryId 있음 + interpretation null
    → interpretedResultRef.current = '__loading__'  ← 동기 센티널
    → getHistory(id) 비동기 호출
  → auto-trigger effect 실행
    → interpretedResultRef.current !== null ('__loading__') → SKIP
  → IndexedDB 응답 도착
    → 해석 있음: setInterpretation(text), ref = '__restored__'
    → 해석 없음: ref = null (사용자 수동 요청 가능)
```

### Race condition 방어: `interpretedResultRef` 동기 가드

핵심 문제: React state batching으로 `setInterpretation(value)`가 다음 렌더까지 반영되지 않아, auto-trigger effect의 `interpretation === null` 체크가 stale closure를 봄.

해결: **ref 기반 이중 가드**. auto-trigger 조건을 `interpretedResultRef.current === null && interpretation === null`로 변경. ref는 동기 갱신이므로 batching과 무관하게 즉시 차단.

```typescript
// 히스토리 전환 effect (동기)
interpretedResultRef.current = cached ? '__restored__' : null

// auto-trigger effect
if (results && interpretedResultRef.current === null && interpretation === null && !isInterpreting) {
  handleInterpretation()
}
```

### 추가 경로: 재분석

```
히스토리에서 로드 (ref = '__restored__') → 재분석 클릭
  → handleReanalyze(): interpretedResultRef.current = null  ← ★ 리뷰 후 추가
  → step 1~3 진행 → 새 results 도착 → step 4
  → auto-trigger: ref === null && interpretation === null → handleInterpretation()
```

### 리뷰 포인트

1. **`getState()` 동기 접근**: Zustand에서는 안전. effect 내에서 사용하여 state batching 회피. 이 패턴의 유지보수성?
2. **`getHistory()` import 경로**: `@/lib/utils/storage` facade 사용 (Hybrid/Turso 모드 포함). store의 `loadFromHistory`와 동일 계층.
3. **`handleInterpretationRef`**: 비동기 context(Promise.then)에서 최신 `handleInterpretation`을 안전하게 호출하기 위한 ref 패턴. 렌더 후 즉시 갱신.

---

## 4. 검증 상태

```bash
cd stats
pnpm tsc --noEmit    # 통과 (에러 0)
pnpm test --run      # 통과 (1건 간헐적 실패 = 기존 환경 의존 문제, 이번 변경 무관)
```

---

## 5. 변경 파일 목록 (10파일)

```
# Batch 1 — 통계 정확성
stats/components/smart-flow/steps/results/results-helpers.ts      # formatPValue, getEffectSizeInterpretation, formatEffectSizeSymbol
stats/lib/statistics/formatters.ts                                # formatStatisticalResult df optional화
stats/lib/statistics/result-converter.ts                          # effect size typeMap 확장 + 정규화
stats/components/smart-flow/steps/ResultsActionStep.tsx           # APA 포맷 가드 제거 + AI 해석 복원
stats/components/smart-flow/steps/results/ResultsChartsSection.tsx # warnings 표시 조건 수정
stats/components/statistics/common/StatisticalResultCard.tsx      # effectSize type union 확장
stats/lib/terminology/terminology-types.ts                        # negligible 키 추가
stats/lib/terminology/domains/generic.ts                          # negligible 라벨
stats/lib/terminology/domains/aquaculture.ts                      # negligible 라벨
stats/__tests__/lib/statistics/formatters.test.ts                 # APA 포맷 테스트 갱신

# Batch 2 — AI 해석 캐싱
stats/lib/stores/smart-flow-store.ts                              # loadedAiInterpretation 필드
stats/components/smart-flow/steps/ResultsActionStep.tsx           # 복원 로직 (위와 동일 파일)
```

---

## 6. 전체 리뷰 포인트 요약

| # | 영역 | 질문 |
|---|------|------|
| 1 | B1-2 | `negligible` optional + fallback `labels.small` — silent degradation 적절한가? |
| 2 | B1-3 | 단일 문자 별칭 `"d"`, `"g"` 등의 충돌 가능성? |
| 3 | B1-1 | `formatPValue`(APA, 선행 0 생략) vs `formatPValueAPA`(formatters.ts) 이중화 — 통합 가능? |
| 4 | B2 | `getState()` 동기 접근 + `interpretedResultRef` 센티널 패턴의 유지보수성? |
| 5 | B2 | `getHistory()` 컴포넌트 직접 import — store를 거치지 않는 레이어 위반? |
| 6 | B2 | 새로고침 + 해석 없는 히스토리: auto-trigger 미발동 (수동 요청 필요) — 허용 가능? |

### 리뷰 후 수정 이력

**1차 리뷰:**

| 지적 | 심각도 | 수정 |
|------|--------|------|
| auto-trigger stale closure로 히스토리 복원 시 재호출 | High | `interpretedResultRef` 동기 센티널 + auto-trigger에 ref 이중 가드 |
| executor 효과크기 타입 6건 미매핑 | Medium | typeMap에 `spearmanrho`, `kendalltau`, `partialr`, `rankbiserialr` 추가 |
| 새로고침 후 캐시 복원 경로 누락 | Medium | 첫 마운트 시 `getHistory()` 비동기 로드 + `'__loading__'` 동기 가드 |

**2차 리뷰:**

| 지적 | 심각도 | 수정 |
|------|--------|------|
| 재분석 시 ref 미초기화 → 새 결과 AI 해석 차단 | High | `handleReanalyze()`에 `interpretedResultRef.current = null` 추가 |
| 새로고침+해석없는 히스토리 = 막힌 화면 (버튼도 없음) | Medium | `handleInterpretationRef` 추가, IndexedDB miss 시 직접 호출로 해석 자동 시작 |
| raw IndexedDB 직접 import → storage facade 우회 | Medium | `@/lib/utils/indexeddb` → `@/lib/utils/storage` facade로 교체 |

**3차 리뷰:**

| 지적 | 심각도 | 수정 |
|------|--------|------|
| 히스토리 전환 시 cache miss → auto-trigger stale closure로 해석 미시작 | Medium | 전환 경로에서 `cached` 없으면 `handleInterpretationRef.current?.()` 직접 호출 |
| 새로고침 getHistory() stale 응답이 현재 화면 덮어쓸 수 있음 | Medium | `requestedId` 캡처 + `.then()`/`.catch()`에서 `prevHistoryIdRef.current !== requestedId` 가드 |
