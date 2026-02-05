# UI 테스트 복원력 전략

> UI가 자주 바뀌는 프로젝트에서 테스트가 깨지지 않게 하는 방법

## 배경: 왜 UI 테스트가 깨지나

```
코드 변경 유형별 테스트 깨짐 확률:

  비즈니스 로직 변경   ████████████░░░░  75% (의도적 - 테스트가 잡아야 함)
  UI 텍스트 변경        ███████████████░  95% (불필요한 깨짐)
  레이아웃 변경         ██████████████░░  90% (불필요한 깨짐)
  컴포넌트 분리/합침    ████████████░░░░  80% (불필요한 깨짐)
  스타일 변경           ████░░░░░░░░░░░░  25% (거의 안 깨짐)
```

**핵심 문제**: "버튼 텍스트를 '확인'→'완료'로 바꿨을 뿐인데 테스트 10개가 깨짐"

---

## 해법: 3층 분리 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│  L3: E2E (Playwright/Cypress)                               │
│                                                             │
│  실제 브라우저에서 사용자 시나리오 검증                       │
│  UI 바뀌면 깨질 수 있음 → 그게 E2E의 역할                   │
│  수량: 적게 (핵심 플로우만)                                  │
├─────────────────────────────────────────────────────────────┤
│  L2: data-testid 기반 (Unit/Integration Test)               │
│                                                             │
│  "이 요소가 존재하는가?" 만 확인                             │
│  텍스트/스타일/위치와 무관                                   │
│  수량: 중간                                                 │
├─────────────────────────────────────────────────────────────┤
│  L1: Store/Logic (Unit Test)                                │
│                                                             │
│  순수 함수, 상태 전이, 비즈니스 로직                         │
│  UI가 완전히 바뀌어도 절대 안 깨짐                           │
│  수량: 많이 (핵심 로직 전부)                                 │
└─────────────────────────────────────────────────────────────┘
```

### 각 레이어별 역할 분담

| 검증 대상 | L1 | L2 | L3 |
|-----------|----|----|-----|
| 상태 전이 (A→B→C) | **여기서** | | |
| 조건부 렌더링 | **여기서** | 보조 | |
| 요소 존재 여부 | | **여기서** | |
| 사용자 인터랙션 | | | **여기서** |
| 전체 플로우 | | | **여기서** |

---

## 패턴별 상세

### L1: Store/Logic 테스트

**원칙**: UI를 전혀 렌더링하지 않고 로직만 검증

```typescript
// ✅ GOOD - Zustand 실제 store 직접 테스트
import { useMyStore } from '@/stores/my-store'

it('step 2에서 step 3으로 진행', () => {
  const { getState } = useMyStore
  act(() => getState().setCurrentStep(2))
  act(() => getState().goToNextStep())
  expect(getState().currentStep).toBe(3)
})

// ✅ GOOD - 순수 함수 테스트
import { decide } from '@/logic/decision-tree'

it('정규분포 + 2그룹 → t-검정 추천', () => {
  const result = decide({ normality: 'yes', groups: 2 })
  expect(result.method.id).toBe('t-test')
})
```

**핵심 테크닉: 실제 Store vs Mock Store**

```typescript
// ❌ BAD - Mock store (필드 추가할 때마다 깨짐)
(useStore as Mock).mockReturnValue({
  currentStep: 1,
  showHub: true,
  // ... 30개 필드를 전부 나열해야 함
  // 새 필드 추가되면 여기도 추가해야 함
})

// ✅ GOOD - 실제 store (자동으로 적응)
beforeEach(() => {
  act(() => useStore.getState().reset())
})

it('특정 상태 테스트', () => {
  act(() => useStore.getState().setCurrentStep(3))
  // 나머지 필드는 initialState 그대로 → 변경에 안전
})
```

**왜 실제 Store가 더 나은가:**
1. 새 필드 추가 시 mock 업데이트 불필요
2. Store 내부 로직 (computed values, side effects) 도 함께 테스트
3. 실제 앱과 동일한 상태 전이 보장

---

### L2: data-testid 기반 테스트

**원칙**: "요소가 존재하는가?"만 확인, 내용/스타일은 무시

```typescript
// ❌ BAD - 텍스트 의존 (번역/리워딩하면 깨짐)
screen.getByText('다음 단계로 진행')
screen.getByRole('button', { name: /제출하기/ })

// ❌ BAD - CSS 선택자 (리팩토링하면 깨짐)
container.querySelector('.header > .nav-item:nth-child(2)')

// ✅ GOOD - data-testid (UI 변경과 무관)
screen.getByTestId('submit-button')
screen.getByTestId('navigation-menu')
```

**자식 컴포넌트 Stub 패턴:**

```typescript
// 복잡한 하위 컴포넌트를 data-testid stub으로 대체
vi.mock('@/components/ComplexForm', () => ({
  ComplexForm: () => <div data-testid="complex-form" />
}))

// 테스트에서는 존재 여부만 확인
it('폼이 렌더링됨', () => {
  render(<Page />)
  expect(screen.getByTestId('complex-form')).toBeInTheDocument()
})
```

**주의: data-testid를 실제 코드에 유지해야 함**

```tsx
// 실제 컴포넌트에 data-testid 추가
export function ComplexForm() {
  return <form data-testid="complex-form">...</form>
}
```

프로덕션 빌드에서 제거하려면 babel 플러그인 사용:
```json
// babel.config.js (프로덕션만)
["react-remove-properties", { "properties": ["data-testid"] }]
```

---

### L3: E2E 테스트

**원칙**: 실제 유저 시나리오를 브라우저에서 검증

```typescript
// Playwright 예시
test('데이터 업로드 → 분석 실행 플로우', async ({ page }) => {
  await page.goto('/smart-flow')
  await page.setInputFiles('[data-testid="file-upload"]', 'test-data.csv')
  await page.click('[data-testid="next-step-button"]')
  await expect(page.locator('[data-testid="results-panel"]')).toBeVisible()
})
```

E2E에서도 가능한 한 data-testid를 선택자로 사용.
텍스트 기반 선택자는 최후의 수단.

---

## 실전 의사결정 가이드

### "이 테스트를 어느 레이어에 넣을까?"

```
Q: DOM 렌더링이 필요한가?
├── 아니오 → L1 (Store/Logic)
│   예: 상태 전이, 계산 로직, 데이터 변환, 추천 알고리즘
│
└── 예 → DOM이 필요함
    │
    Q: 사용자 인터랙션 시뮬레이션이 필요한가?
    ├── 아니오 → L2 (data-testid)
    │   예: 조건부 렌더링, 컴포넌트 존재 확인
    │
    └── 예 → 인터랙션 필요
        │
        Q: 여러 페이지에 걸친 플로우인가?
        ├── 아니오 → L2 (fireEvent + data-testid)
        │   예: 버튼 클릭 → 콜백 호출 확인
        │
        └── 예 → L3 (Playwright E2E)
            예: 로그인 → 데이터 업로드 → 분석 → 결과 확인
```

### "getByText를 써도 되는 경우"

```
✅ 허용: 에러 메시지 텍스트 (사용자에게 보여야 하는 정확한 문구)
✅ 허용: 접근성 라벨 (aria-label, role)
❌ 금지: 버튼 라벨 (자주 바뀜)
❌ 금지: 헤딩/타이틀 (디자인 변경에 취약)
❌ 금지: 안내 문구 (리워딩 자주 발생)
```

---

## 흔한 함정과 해결법

### 함정 1: Mock Store가 실제 Store와 괴리

```typescript
// ❌ 함정: Mock에 새 필드 누락
vi.mock('@/stores/store', () => ({
  useStore: vi.fn(() => ({ step: 1 })) // showHub 없음!
}))
// 실제 store에 showHub 추가 → 테스트는 undefined로 동작 → 미묘한 버그

// ✅ 해결: 실제 store 사용
import { useStore } from '@/stores/store'
beforeEach(() => act(() => useStore.getState().reset()))
```

### 함정 2: Portal 컴포넌트 (Sheet, Dialog, Dropdown)

```typescript
// ❌ 함정: Radix UI Portal → JSDOM에서 렌더링 안 됨
render(<Sheet open><SheetContent>Hello</SheetContent></Sheet>)
screen.getByText('Hello') // 찾을 수 없음!

// ✅ 해결: Portal 컴포넌트를 일반 div로 mock
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }) => open ? <div>{children}</div> : null,
  SheetContent: ({ children }) => <div>{children}</div>,
}))
```

### 함정 3: Props 전달 검증 누락

```typescript
// ❌ 함정: 자식을 stub으로 만들면 props 검증 불가
vi.mock('@/components/Layout', () => ({
  Layout: ({ children }) => <div>{children}</div>
  // currentStep, onStepChange 등이 올바르게 전달되는지 모름
}))

// ✅ 해결 1: Props를 캡처하는 mock
const layoutProps = vi.fn()
vi.mock('@/components/Layout', () => ({
  Layout: (props) => { layoutProps(props); return <div>{props.children}</div> }
}))
it('step이 올바르게 전달됨', () => {
  render(<Page />)
  expect(layoutProps).toHaveBeenCalledWith(
    expect.objectContaining({ currentStep: 1 })
  )
})

// ✅ 해결 2: data attribute로 props 노출
vi.mock('@/components/Layout', () => ({
  Layout: (props) => (
    <div data-testid="layout" data-step={props.currentStep}>
      {props.children}
    </div>
  )
}))
```

### 함정 4: 텍스트 기반 어설션의 유혹

```typescript
// ❌ 처음엔 편해 보이지만 나중에 반드시 깨짐
expect(screen.getByText('분석 방법 선택')).toBeInTheDocument()

// ✅ data-testid 기반
expect(screen.getByTestId('step-header')).toBeInTheDocument()

// ✅ 또는 텍스트가 중요하면 상수로 관리
import { LABELS } from '@/constants/labels'
expect(screen.getByText(LABELS.STEP_HEADER)).toBeInTheDocument()
// 라벨 바뀌면 상수 파일 하나만 수정 → 테스트 자동 적응
```

### 함정 5: spy 타이밍 문제

```typescript
// ❌ 함정: getState()는 매번 새 참조를 줄 수 있음
const spy = vi.spyOn(useStore.getState(), 'loadData')
render(<Page />) // 내부에서 useStore.getState().loadData() 호출
expect(spy).toHaveBeenCalled() // 다른 참조라 잡히지 않을 수 있음

// ✅ 해결: store 프로토타입이나 subscribe로 검증
const store = useStore.getState()
const originalLoadData = store.loadData
let called = false
useStore.setState({ loadData: () => { called = true; return originalLoadData() } })
render(<Page />)
expect(called).toBe(true)
```

---

## 체크리스트: UI 수정 시

UI를 수정할 때 다음을 확인:

```markdown
- [ ] 기존 data-testid 속성을 제거하지 않았는가?
- [ ] 새로 추가한 핵심 요소에 data-testid를 부여했는가?
- [ ] 비즈니스 로직을 변경했다면 L1 테스트를 수정했는가?
- [ ] 컴포넌트 파일명/경로를 변경했다면 mock import를 수정했는가?
- [ ] `pnpm test --run` 으로 깨짐을 확인했는가?
```

## 체크리스트: 새 테스트 작성 시

```markdown
- [ ] 이 테스트가 어느 레이어(L1/L2/L3)인지 명확한가?
- [ ] L1으로 충분한 것을 L2로 작성하고 있진 않은가?
- [ ] getByText 대신 getByTestId를 사용했는가?
- [ ] Mock store 대신 실제 store를 사용할 수 있는가?
- [ ] Portal 컴포넌트(Sheet, Dialog)를 mock 했는가?
```

---

## 프레임워크별 적용

### React + Zustand (이 프로젝트)
- L1: `useStore.getState()` 직접 조작
- L2: `@testing-library/react` + `data-testid`
- L3: Playwright

### Vue + Pinia
- L1: `const store = useSomeStore(); store.action()`
- L2: `@vue/test-utils` + `[data-testid]` 선택자
- L3: Playwright/Cypress

### Angular + NgRx
- L1: `store.dispatch(action)` + `store.select(selector)`
- L2: `TestBed` + `By.css('[data-testid]')`
- L3: Playwright/Cypress

---

## 참고 자료

- [Testing Library - Queries Priority](https://testing-library.com/docs/queries/about/#priority)
- [Kent C. Dodds - Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details)
- [Zustand Testing](https://docs.pmnd.rs/zustand/guides/testing)

---

*작성: 2026-02-05 | 프로젝트: NIFS Statistical Platform*
*적용 사례: 28개 실패 → 0개로 복구하며 정립한 전략*
