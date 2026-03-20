# 사전 인프라 정리 (개별 UX 작업 전 선행)

**작성**: 2026-03-20
**목적**: 디자인/UX 개별 작업의 교차 의존성 해소. 먼저 만들어야 개별 작업에서 중복 구현 방지.

---

## 1. 에러 복구 패턴 (`useErrorRecovery` 훅)

### 의존 작업 (3건)
- AI 해석 실패 시 graceful degradation (2회 retry 후 대안)
- 변수 자동감지 실패 시 토스트
- Hub 채팅 에러 시 이전 메시지 복원

### 현재 상태
- `InlineError.tsx`에 `onRetry` 콜백만 존재. retry 카운트/소진 로직 없음
- 3개 작업이 각자 retry 로직을 구현하면 최대 횟수, 소진 UI, 리셋 타이밍이 제각각

### 만들 것
- `lib/utils/error-recovery.ts` — retry 카운트, 최대 횟수, 소진 판정, 리셋
- `hooks/use-error-recovery.ts` — React 훅 래퍼

```typescript
// 사용 예시
const { retry, retryCount, isExhausted, reset } = useErrorRecovery({ maxRetries: 2 })

// AI 해석 실패 시
if (isExhausted) {
  showFallbackInterpretation()  // 대안 표시
} else {
  retry(() => handleInterpretation())  // 재시도
}
```

### 설계 포인트
- `maxRetries` 기본값 2 (프로젝트 전체 통일)
- `isExhausted` 상태에서 대안 UI 표시는 각 컴포넌트가 결정
- 컴포넌트 언마운트 시 자동 리셋
- `raceWithTimeout` (이미 추출됨, `lib/utils/promise-utils.ts`)과 조합 가능

---

## 2. 토스트 메시지 상수

### 의존 작업
- 변수감지 실패 토스트, 실행 에러 배너, 모든 에러/성공 알림

### 현재 상태
- 19+곳에 한국어 인라인 문자열 (`toast.error('CSV 파싱 오류: ...')`)
- `TerminologyDictionary`에 `ResultsText.toast` 섹션은 있으나, Hub/Variables 섹션 없음
- `lib/constants/error-messages.ts`에 41개 기술→사용자 매핑 존재 (별개 용도)

### 만들 것
- `lib/constants/toast-messages.ts` — 카테고리별 메시지 상수

```typescript
export const TOAST = {
  analysis: {
    executionError: '분석 실행 중 오류가 발생했습니다.',
    retrySuccess: '재시도 성공.',
    completionWithWarnings: '분석이 완료되었으나 일부 경고가 있습니다.',
  },
  variables: {
    detectionFailed: '변수 자동감지에 실패했습니다. 수동으로 선택해주세요.',
    selectionInvalid: '선택한 변수 조합이 유효하지 않습니다.',
  },
  data: {
    uploadFailed: '파일 업로드에 실패했습니다.',
    csvParseError: (msg: string) => `CSV 파싱 오류: ${msg}`,
    emptyData: '데이터가 비어 있습니다.',
    loadSuccess: (name: string) => `${name} 로드 완료`,
  },
  hub: {
    classificationError: '분류 중 오류가 발생했습니다.',
    csvOnlySupport: '현재 허브에서는 CSV 파일만 지원합니다.',
  },
  export: {
    copySuccess: '결과를 클립보드에 복사했습니다.',
    downloadSuccess: '파일이 다운로드되었습니다.',
  },
} as const
```

### 마이그레이션 전략
- 새 작업에서는 반드시 `TOAST.xxx` 사용
- 기존 19곳은 점진적 마이그레이션 (한 번에 안 해도 됨)
- 향후 영문 지원 시 이 파일만 확장

---

## 3. Focus ring 표준 상수

### 의존 작업 (접근성 3건)
- ChatThread 버튼에 focus ring 추가
- TrackSuggestions 버튼에 focus ring 추가
- QuickAnalysisPills raw button → Button 전환

### 현재 상태 (5가지 변형 공존)

| 파일 | 패턴 |
|------|------|
| ChatInput | `focus:ring-2 focus:ring-primary/30` (`focus` 사용) |
| QuickAnalysisPills | `focus-visible:ring-2 focus-visible:ring-primary/40` |
| DataUploadStep | `focus-visible:ring-2 focus-visible:ring-primary/50` |
| CategorySelector | `focus-visible:ring-2 focus-visible:ring-primary ring-offset-2` |
| card-styles actionCardBase | `focus-visible:ring-2 focus-visible:ring-primary/40` |

### 만들 것
- `card-styles.ts`에 상수 1개 추가 (새 파일 불필요)

```typescript
/** 표준 focus ring — 모든 인터랙티브 요소에 사용 */
export const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
```

### 표준 선택 근거
- `focus-visible` (`focus` 아님) — 키보드 탐색 시에만 표시, 마우스 클릭 시 안 보임
- `primary/40` — QuickAnalysisPills + card-styles에서 이미 가장 많이 사용
- `ring-offset` 없음 — 대부분의 요소에서 불필요, 필요 시 개별 추가

### 마이그레이션
- 접근성 작업 시 이 상수를 import해서 사용
- 기존 5가지 변형은 점진적으로 교체

---

## 불필요 확인 (사전 작업 불요)

| 항목 | 판단 |
|------|------|
| ChatBubble 추출 | 독립 진행 가능. 다른 TODO에 의존하지 않음 |
| Button 표준화 | raw button 4곳 모두 의도적. 추가 인프라 불필요 |
| LoadingIndicator | TypingIndicator 이미 존재. 개별 작업 시 처리 |
| 라우팅 | 22개 라우트 안정. 추가 정리 불필요 |
| I18n 체계 | TerminologyDictionary 시스템 존재. 새 메시지만 추가 |

---

## 진행 순서

```
1. Focus ring 상수 (5분) → card-styles.ts에 1줄 추가
2. 토스트 메시지 상수 (30분) → 새 파일 + 기존 일부 마이그레이션
3. useErrorRecovery 훅 (1시간) → 유틸 + 훅 + 테스트
── 여기까지 선행 ──
4. 이후 디자인/UX 개별 작업 진행
```
