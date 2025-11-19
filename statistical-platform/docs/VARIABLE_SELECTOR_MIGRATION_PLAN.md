# 변수 선택 & 데이터 뷰어 통합 마이그레이션 계획

**생성일:** 2025-11-19
**상태:** 진행 중

---

## 목표

1. **변수 선택 통합**: DnD 제거 → 클릭 기반 Popover로 통일
2. **역할 정의 중앙화**: `variable-requirements.ts` 단일 진실 공급원
3. **데이터 뷰어 개선**: 가상화 스크롤 + 새 창 열기
4. **shadcn/ui 표준** 준수

---

## 현황 요약

### 변수 선택 컴포넌트 사용처

| 컴포넌트 | 사용 페이지 수 | 방식 |
|---------|---------------|------|
| `VariableSelectorModern` (DnD) | **15개** + Smart Flow | @dnd-kit 사용 |
| `VariableSelector` (3단) | 1개 (Smart Flow 탭) | 레거시 |
| `VariableSelectorPanel` (클릭) | 1개 (descriptive) | **목표 UI** |

### 마이그레이션 대상 페이지 (15개)

**통계 페이지 (13개):**
- [ ] chi-square-goodness
- [ ] chi-square-independence
- [ ] ancova
- [ ] manova
- [ ] mixed-model
- [ ] regression
- [ ] non-parametric
- [ ] pca
- [ ] ordinal-regression
- [ ] response-surface
- [ ] dose-response
- [ ] explore-data
- [ ] regression/page-old.tsx (삭제 검토)

**데이터 도구 (2개):**
- [ ] frequency-table
- [ ] cross-tabulation

**Smart Flow:**
- [ ] VariableSelectionStep.tsx

---

## Phase 0: 사전 준비

### 체크리스트

- [ ] **0-1.** 타입 호환성 유틸리티 생성 (`lib/utils/variable-type-mapper.ts`)
- [ ] **0-2.** 유틸리티 테스트 작성 (`__tests__/utils/variable-type-mapper.test.ts`)
- [ ] **0-3.** TypeScript 컴파일 확인

### 상세 작업

#### 0-1. 타입 호환성 유틸리티

**파일:** `lib/utils/variable-type-mapper.ts`

```typescript
import { VariableType } from '@/lib/statistics/variable-requirements'

const TYPE_MAPPING: Record<string, VariableType[]> = {
  'number': ['continuous', 'ordinal', 'count'],
  'string': ['categorical'],
  'boolean': ['binary', 'categorical'],
  'date': ['date'],
}

export function isTypeCompatible(
  columnType: 'number' | 'string' | 'date' | 'boolean',
  allowedTypes: VariableType[]
): boolean {
  const mappedTypes = TYPE_MAPPING[columnType] || []
  return allowedTypes.some(t => mappedTypes.includes(t))
}

export function variableTypeToUIType(type: VariableType): 'number' | 'string' | 'date' | 'boolean' {
  switch (type) {
    case 'continuous':
    case 'ordinal':
    case 'count':
      return 'number'
    case 'binary':
      return 'boolean'
    case 'date':
      return 'date'
    case 'categorical':
    default:
      return 'string'
  }
}
```

**예상 시간:** 1시간

---

## Phase 1: VariableSelectorPanel 개편

### 체크리스트

- [ ] **1-1.** Props 인터페이스 변경 (`methodId` 기반)
- [ ] **1-2.** `getMethodRequirements` 연동
- [ ] **1-3.** 타입 호환성 체크 수정 (`isTypeCompatible` 사용)
- [ ] **1-4.** `COMMON_ROLES` 제거
- [ ] **1-5.** 기존 테스트 업데이트
- [ ] **1-6.** descriptive 페이지 동작 확인

### 상세 작업

#### 1-1. Props 인터페이스 변경

**Before:**
```typescript
interface VariableSelectorPanelProps {
  roles: VariableRole[]
  // ...
}
```

**After:**
```typescript
interface VariableSelectorPanelProps {
  methodId: string
  data: Record<string, unknown>[]
  columns: string[]
  assignment?: VariableAssignment
  onAssignmentChange: (assignment: VariableAssignment) => void
  onComplete?: () => void
  columnTypes?: Record<string, 'number' | 'string' | 'date' | 'boolean'>
}
```

**예상 시간:** 2시간

---

## Phase 2: 개별 통계 페이지 마이그레이션

### 체크리스트

- [ ] **2-1.** chi-square-goodness
- [ ] **2-2.** chi-square-independence
- [ ] **2-3.** ancova
- [ ] **2-4.** manova
- [ ] **2-5.** mixed-model
- [ ] **2-6.** regression
- [ ] **2-7.** non-parametric
- [ ] **2-8.** pca
- [ ] **2-9.** ordinal-regression
- [ ] **2-10.** response-surface
- [ ] **2-11.** dose-response
- [ ] **2-12.** explore-data
- [ ] **2-13.** frequency-table
- [ ] **2-14.** cross-tabulation
- [ ] **2-15.** Smart Flow VariableSelectionStep

### 마이그레이션 패턴

```typescript
// Before
import { VariableSelectorModern } from '@/components/variable-selection/VariableSelectorModern'

<VariableSelectorModern
  methodId={methodId}
  data={data}
  onVariablesSelected={handleVariablesSelected}
  onBack={handleBack}
/>

// After
import { VariableSelectorPanel } from '@/components/variable-selection/VariableSelectorPanel'

<VariableSelectorPanel
  methodId={methodId}
  data={data}
  columns={Object.keys(data[0] || {})}
  assignment={assignment}
  onAssignmentChange={setAssignment}
  onComplete={handleComplete}
/>
```

**예상 시간:** 4시간 (15개 × 15분)

---

## Phase 3: DnD 컴포넌트 삭제

### 체크리스트

- [ ] **3-1.** `VariableSelectorModern.tsx` 삭제
- [ ] **3-2.** `VariableSelector.tsx` 삭제
- [ ] **3-3.** `draggable/` 폴더 전체 삭제
- [ ] **3-4.** 관련 테스트 파일 삭제
- [ ] **3-5.** import 정리 확인
- [ ] **3-6.** TypeScript 컴파일 확인
- [ ] **3-7.** 빌드 테스트

### 삭제 대상

```
components/variable-selection/
├── VariableSelectorModern.tsx        → 삭제
├── VariableSelector.tsx              → 삭제
├── draggable/
│   ├── DraggableVariable.tsx         → 삭제
│   ├── DroppableRoleZone.tsx         → 삭제
│   └── __tests__/                    → 삭제
└── __tests__/
    ├── VariableSelectorModern.*.tsx  → 삭제
    └── VariableSelector.test.tsx     → 삭제
```

**예상 시간:** 30분

---

## Phase 4: DataTableViewer 개선

### 체크리스트

- [ ] **4-1.** `@tanstack/react-virtual` 설치
- [ ] **4-2.** 가상화 스크롤 구현
- [ ] **4-3.** 셀 내용 truncate 처리
- [ ] **4-4.** 새 창 열기 버튼 추가
- [ ] **4-5.** sessionStorage 관리 (저장/제거)
- [ ] **4-6.** 팝업 차단 대안 UX
- [ ] **4-7.** `/data-viewer` 라우트 생성
- [ ] **4-8.** DataPreviewPanel 동적 임포트
- [ ] **4-9.** 성능 테스트 (10,000행)

### 가상화 스크롤 구현

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

const rowVirtualizer = useVirtualizer({
  count: sortedData.length,
  getScrollElement: () => tableContainerRef.current,
  estimateSize: () => 35,
  overscan: 20,
})
```

**예상 시간:** 2시간

---

## Phase 5: 패키지 정리 및 최종 검증

### 체크리스트

- [ ] **5-1.** 전체 테스트 실행 (`npm test`)
- [ ] **5-2.** DnD 패키지 제거 (`npm uninstall @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`)
- [ ] **5-3.** TypeScript 최종 확인
- [ ] **5-4.** 빌드 최종 확인
- [ ] **5-5.** 번들 크기 확인

### framer-motion 결정

**사용처:** 12개 파일 (StatisticsPageLayout, MethodSelectionCard, StepIndicator 등)
**결정:** **유지** (광범위 사용)

**예상 시간:** 1시간

---

## 총 예상 일정

| Phase | 작업 | 예상 시간 | 상태 |
|-------|------|----------|------|
| 0 | 사전 준비 | 1시간 | 진행 중 |
| 1 | VariableSelectorPanel 개편 | 2시간 | 대기 |
| 2 | 15개 페이지 마이그레이션 | 4시간 | 대기 |
| 3 | DnD 컴포넌트 삭제 | 30분 | 대기 |
| 4 | DataTableViewer 개선 | 2시간 | 대기 |
| 5 | 패키지 정리 & 검증 | 1시간 | 대기 |
| **총계** | | **10.5시간** | |

---

## 진행 기록

### 2025-11-19

- [x] 마이그레이션 계획 문서 생성
- [ ] Phase 0 시작

---

## 참고 문서

- [STATISTICS_CODING_STANDARDS.md](./STATISTICS_CODING_STANDARDS.md)
- [variable-requirements.ts](../lib/statistics/variable-requirements.ts)