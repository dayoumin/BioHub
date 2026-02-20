---
name: test-strategy
description: UI 테스트 3층 아키텍처 (L1 Store, L2 data-testid, L3 E2E). 테스트 작성, UI 변경, data-testid 관련 작업 시 자동 적용.
user-invocable: false
---

# UI 테스트 3층 아키텍처

UI 구조 변경에도 테스트가 깨지지 않는 레이어 분리 전략.

## 레이어 요약

| 레이어 | 테스트 대상 | 방법 | UI 변경 시 |
|--------|-----------|------|-----------|
| **L1: Store/Logic** | 상태 전이, 비즈니스 로직 | Zustand store 직접 조작 | **안 깨짐** |
| **L2: data-testid** | 핵심 요소 존재 확인 | `data-testid` 속성 | **거의 안 깨짐** |
| **L3: E2E** | 실제 유저 플로우 | Playwright 브라우저 | 깨질 수 있음 |

## L1 패턴 (Store-level) — 우선 사용

```typescript
// 좋은 예: Store 상태 직접 검증 (UI 변경 무관)
it('재분석 시 데이터가 초기화된다', () => {
  const store = useSmartFlowStore.getState()
  store.setResults(null)
  store.setUploadedData(null)
  store.setIsReanalysisMode(true)
  store.setCurrentStep(1)
  expect(useSmartFlowStore.getState().isReanalysisMode).toBe(true)
  expect(useSmartFlowStore.getState().uploadedData).toBeNull()
})
```

## L2 패턴 (data-testid) — 렌더링 확인용

```typescript
// 좋은 예: data-testid로 존재 확인 (텍스트 무관)
expect(screen.getByTestId('results-action-step')).toBeInTheDocument()
```

## 금지 패턴

- `screen.getByText('특정 버튼 텍스트')` — 텍스트 변경 시 깨짐
- `screen.getByRole('button', { name: /특정 패턴/ })` — 라벨 변경 시 깨짐
- Radix UI Portal 내부 요소 클릭 (JSDOM 한계) — Store-level로 대체

## UI 수정 시 반드시

1. 기존 `data-testid` 속성 유지 (삭제/변경 금지)
2. 새 핵심 요소 추가 시 `data-testid` 부여
3. 비즈니스 로직 변경 시 L1 테스트 추가/수정
4. `pnpm test --run` 실행하여 깨짐 확인

## E2E Selector Registry

- 파일: `e2e/selectors.ts` — 모든 E2E용 `data-testid` 중앙 관리
- UI 컴포넌트와 E2E 테스트가 이 값을 공유
- **기존 testid 삭제/변경 절대 금지** (E2E 깨짐)
- 새 인터랙티브 요소 추가 시 여기에 등록
- E2E 실행: `pnpm build && npx playwright test --config=e2e/playwright-e2e.config.ts`

## 알려진 함정

- Portal 컴포넌트 (Radix Sheet/Dialog) → JSDOM에서 렌더링 안 됨 → mock 처리
- `getByText()` + 한국어 문자열 → 텍스트 변경마다 깨짐
- Real Zustand store > Mock store (자동으로 새 필드에 적응)