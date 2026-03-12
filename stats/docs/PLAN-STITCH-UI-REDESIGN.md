# STITCH 시안 기반 Smart Flow UI 리디자인

**상태**: Phase 1 완료, Phase 2 대기
**최종 업데이트**: 2026-03-11
**STITCH 시안**: 4개 화면 (Step 1, Step 3, Step 4)

---

## 원칙

1. **정보 구조 유지** — Step 계약(1=업로드, 2=방법, 3=변수, 4=결과) 변경 없음
2. **디자인 언어 적용** — STITCH 시안의 시각 패턴을 현재 Step 구조 위에 입힘
3. **점진적 기능 추가** — 옵션 설정(가설/유의수준)은 Step 3 내 섹션으로 도입
4. **Phase별 독립 커밋** — 각 Phase는 이전 Step 계약을 깨뜨리지 않음

---

## 디자인 언어 (시안 공통 패턴)

| 요소 | 패턴 |
|------|------|
| 스텝 인디케이터 | 원형 번호 + 연결선 + 하단 라벨 |
| 레이아웃 | 메인 + 사이드 패널 2-column |
| 카드 | 둥근 모서리, 미묘한 그림자 |
| 업로드 영역 | 점선 테두리, 중앙 정렬 |
| 변수 슬롯 | 색상 코드 (파란=종속, 초록=독립, 주황=공변량) |
| 데이터 값 | tabular-nums 모노스페이스 |
| 액션 버튼 | 상단 우측 정렬 |

---

## Phase 0: 스텝 인디케이터 교체

현재 FloatingStepIndicator(pill + 아이콘)를 시안 스타일로 교체.

```
현재:  [📊 탐색] ─ [🎯 방법] ─ [📋 변수] ─ [📈 분석]

시안:  (1)────(2)────(3)────(4)
       데이터   방법   변수   결과
       업로드   선택   설정
```

- 원형 번호: 완료=✓파란, 현재=파란배경, 미래=회색테두리, 스킵=✓회색
- 연결선: 완료=파란, 미완=회색
- 하단 텍스트 라벨 (terminology 기반)
- 클릭으로 스텝 이동 (기존 canNavigateToStep 로직 유지)

**파일**: `SmartFlowLayout.tsx` 내 FloatingStepIndicator 교체
**Step 계약 영향**: 없음 (렌더링만 변경)

---

## Phase 1: Step 1 (데이터 업로드) 스타일

### 2-column 레이아웃 도입

```
┌─────────────────────────┬──────────────────┐
│ 업로드 완료 카드          │ 컬럼 정보 패널    │
│ (점선, 파일명, 변경 버튼) │                  │
│                          │ 수치형: 3개       │
│ 데이터 미리보기           │ 범주형: 1개       │
│ (테이블 + "N행" 배지)    │ 결측: 0건         │
│                          │                  │
│ [▸ 상세 분석 펼치기]     │ (메서드 선택 후   │
│                          │  변수 지정 가능)  │
└─────────────────────────┴──────────────────┘
```

- 좌: 업로드 완료 UI (점선 카드) + 데이터 미리보기 테이블
- 우: 컬럼 요약 패널 (타입별 개수, 결측 정보)
- EDA 기능(분포차트, 히트맵): "상세 분석" 접이식 섹션으로 이동
- quickAnalysisMode + selectedMethod 시: 우측 패널을 변수 역할 지정으로 교체

**파일**: `DataExplorationStep.tsx`
**Step 계약 영향**: 없음

---

## Phase 2: Step 3 (변수 선택) — 통합 슬롯 UI + 옵션 섹션

### 현황 분석

**현재 구조**: `VariableSelectionStep.tsx`(462줄) → SELECTOR_MAP으로 8개 셀렉터 + 1 레거시 분기
**문제점**: 8가지 다른 UI 경험, 변수 전체 목록 한눈에 안 보임, 클릭 토글은 구식
**기존 셀렉터**: 삭제 안 함 (레거시 `/statistics/*` 페이지에서 사용 중)

### 목표 레이아웃 (STITCH 시안 기반)

```
┌────────────────────────────────────────────────┬──────────────────┐
│ [변수 설정]                    [이전] [다음]    │                  │
│                                                │ LIVE DATA        │
│ ┌──────────────┐  ┌──────────────────────────┐ │ SUMMARY          │
│ │ 사용 가능한   │  │ 종속 변수 (Y) [필수]      │ │                  │
│ │ 변수          │  │ ┌─────────────────────┐  │ │ 종속: 체중(g)    │
│ │               │  │ │ 최종체중 연속형  ✕   │  │ │ 그룹: 성별       │
│ │ ⠿ 개체ID 범주 │  │ └─────────────────────┘  │ │ n = 15 + 15      │
│ │ ⠿ 그룹   범주 │  ├──────────────────────────┤ │ Total N = 30     │
│ │ ⠿ 초기체중 연속│  │ 독립/그룹 변수 (X) [필수] │ │                  │
│ │ ⠿ 최종체중 연속│  │ ┌─────────────────────┐  │ │                  │
│ │ ⠿ 섭취량  연속 │  │ │ 그룹     범주형  ✕   │  │ │                  │
│ │               │  │ └─────────────────────┘  │ │                  │
│ │               │  ├──────────────────────────┤ │                  │
│ │               │  │ 공변량 [선택]             │ │                  │
│ │               │  │   + 여기에 변수 드롭      │ │                  │
│ └──────────────┘  └──────────────────────────┘ │                  │
│                                                │                  │
│ ─── 분석 옵션 ──────────────────────────────── │                  │
│ 유의수준: [0.05 ▾]  가정검정: [ON]  효과크기: [✓]│                  │
└────────────────────────────────────────────────┴──────────────────┘
```

### 아키텍처 결정

#### 인터랙션: 클릭 기본 + 드래그 향상

**사용 실태**: AI가 변수를 이미 감지 → 대부분 확인 or 1-2개 변경
- **기본**: 변수 클릭 → 첫 번째 빈 필수 슬롯에 배치, 칩 ✕ → 풀로 복귀
- **향상**: @dnd-kit 드래그&드롭 (변수 5개+ 처음부터 배치 시 유용)
- 클릭 없이 DnD만 있으면 안 됨. 클릭만으로 전체 워크플로우 완료 가능해야 함.

#### 슬롯 설정 = SelectorType별 직접 정의

~~`variable-requirements.ts` 직접 활용~~ → ID 불일치 문제로 불가 (SELECTOR_MAP ID ↔ variable-requirements ID 다름)

**방식**: SELECTOR_MAP의 SelectorType(7개 패턴)별 기본 슬롯을 `slot-configs.ts`에 직접 정의
**참고**: `variable-requirements.ts`는 역할 매핑 테이블 참조용으로만 사용

```
SelectorType별 슬롯 구성:
┌──────────────────┬────────────────────────────────────────────┐
│ group-comparison  │ dependent(1,연속) + factor(1,범주) + covariate?(N,연속) │
│ correlation       │ variables(N,연속, min2 max10)                          │
│ multiple-regression│ dependent(1,연속) + independent(N,연속+범주)           │
│ paired            │ variables(2,연속)                                      │
│ one-sample        │ dependent(1,연속)  ← testValue는 AnalysisOptions.testValue로 │
│ chi-square        │ independent(1,범주) + dependent(1,범주)                │
│ two-way-anova     │ dependent(1,연속) + factor(2,범주)                     │
│ default           │ dependent(1) + independent(1)                          │
└──────────────────┴────────────────────────────────────────────┘
```

#### 역할 매핑 (role → VariableMapping key → 색상)

| role | mappingKey | 색상 |
|---|---|---|
| dependent | dependentVar | 파란 (info) |
| independent | independentVar | 보라 (highlight) |
| factor | groupVar | 초록 (success) |
| covariate | covariate | 회색 (muted) |
| variables | variables | 보라 (highlight) |

> within/between/time/event/censoring/weight/blocking → AutoConfirmSelector 영역 (Phase 2 범위 밖)

#### AutoConfirmSelector 유지

복잡한 메서드 11개(repeated-measures, manova, arima 등)는 기존 AutoConfirmSelector 유지.

#### DnD 구현

- **라이브러리**: @dnd-kit/core ^6.3.1 (이미 설치됨), @dnd-kit/sortable 추가 설치 필요
- **인터랙션**: DndContext + useDraggable(칩) + useDroppable(슬롯)
- **타입 제약**: 슬롯 accepts에 맞지 않는 타입은 드롭 거부 (시각 피드백: 빨간 테두리)
- **SSR**: 'use client' 컴포넌트이므로 별도 dynamic import 불필요 (static export)

#### 분석 옵션 = 별도 스토어 상태 (VariableMapping 오염 금지)

`VariableMapping`은 변수 매핑 전용. 분석 파라미터는 분리:
- SmartFlowStore에 `analysisOptions: AnalysisOptions` 추가
- `interface AnalysisOptions { alpha: number; showAssumptions: boolean; showEffectSize: boolean; testValue?: number }`
- **전달 경로**: 기존 `suggestedSettings` 채널 활용 — `AnalysisExecutionStep`에서 `suggestedSettings`에 사용자 override를 병합하여 `executor.executeMethod(method, data, variables, mergedSettings)` 4번째 인자로 전달
- ~~`{ ...variableMapping, ...analysisOptions }` 병합~~ ← 실제 코드는 settings를 별도 인자로 전달하므로 이 방식 불가

#### 알려진 슬롯 한계 (기존 미스매치 보존)

7개 슬롯 패턴은 **현재 8개 셀렉터의 동작을 보존**하는 것이 목표.
아래는 통합 셀렉터에서 발생하는 알려진 기능 차이:
- `partial-correlation` → correlation 슬롯 (공변량 UI 없음 — 기존 CorrelationSelector도 동일)
- `explore-data` → correlation 슬롯 (선택적 그룹 없음 — 기존도 동일)
- `chi-square-goodness` → chi-square 슬롯 2변수 (레거시는 goodness 모드로 1변수만 사용 — **기능 회귀**)
- `proportion-test` → chi-square 슬롯 (레거시는 nullProportion 입력 UI 제공 — **기능 회귀**)
- `one-sample-t` → testValue 입력 없음 (레거시는 μ₀ 입력 제공 — Phase 2b AnalysisOptions에서 해결 예정)
- 이 불일치 해소는 Phase 2 범위 밖 (메서드별 세분화 필요, testValue는 Phase 2b)

### 구현 단계 (3 서브 Phase)

#### Phase 2a: 통합 셀렉터 (핵심)

이것만으로 STITCH 시안의 변수 설정 화면 달성.

**P2a-1: 타입 + 슬롯 설정**

`stats/components/smart-flow/variable-selector/slot-configs.ts` (신규)
```typescript
interface SlotConfig {
  id: string                    // 'dependent', 'factor', 'covariate', ...
  label: string                 // "종속 변수 (Y)"
  description: string           // "분석하고자 하는 결과 변수..."
  required: boolean
  accepts: ('numeric' | 'categorical')[]
  multiple: boolean
  maxCount?: number
  colorScheme: 'info' | 'success' | 'highlight' | 'muted'
  mappingKey: keyof VariableMapping
}

function getSlotConfigs(selectorType: SelectorType): SlotConfig[]
```

7개 패턴 × 1-3개 슬롯 = ~20줄 테이블. variable-requirements 의존 없음.

**P2a-2: UnifiedVariableSelector 컴포넌트**

`stats/components/smart-flow/variable-selector/UnifiedVariableSelector.tsx` (신규)

초기 구현은 **하나의 파일**에 모든 UI:
- 좌: 사용 가능한 변수 패널 (변수명 + 타입 배지, 배치된 변수 흐리게)
- 우: 슬롯 목록 (점선 테두리, 칩, ✕ 제거)
- DndContext 래퍼
- 클릭 배치/제거 로직
- 검증 + onComplete(VariableMapping)

300줄 넘으면 VariableChip, RoleSlot, VariablePool로 추출.

**P2a-3: VariableSelectionStep 교체 + 검증**

`stats/components/smart-flow/steps/VariableSelectionStep.tsx` (수정)
- `renderSelector()`: auto → AutoConfirmSelector, **나머지 전부** → UnifiedVariableSelector
- initialSelection → 슬롯 초기 배치 변환
- AI 감지 변수 배너 유지
- tsc 통과 확인
- **테스트 재작성** (기존 테스트는 8개 셀렉터별 testid를 직접 검증 → 통합 셀렉터로 교체 시 전부 깨짐)
  - mock 대상: 8개 셀렉터 → UnifiedVariableSelector + AutoConfirmSelector 2개
  - 검증 내용: SelectorType별 올바른 컴포넌트 렌더, onComplete 호출, validation alert
  - AI 감지 배지 테스트는 유지

**커밋 단위**: P2a 전체 = 1 커밋

#### Phase 2b: 분석 옵션 섹션

`stats/components/smart-flow/variable-selector/AnalysisOptions.tsx` (신규)
- 유의수준 (alpha): Select [0.01, 0.05, 0.10] — Worker 즉시 연결
- 가설 방향 (alternative): RadioGroup — disabled + "준비 중" 툴팁 (Worker 미지원)
- 가정검정 토글: Switch (ON 기본)
- 효과크기 토글: Switch (ON 기본)
- CollapsibleSection 감싸기

`stats/lib/stores/smart-flow-store.ts` (수정)
- `analysisOptions: AnalysisOptions` 상태 추가
- `setAnalysisOptions` 액션 추가
- persist 파티션에 `analysisOptions` 포함

`stats/components/smart-flow/steps/AnalysisExecutionStep.tsx` (수정)
- `analysisOptions`를 스토어에서 구독
- `executor.executeMethod()` 호출 전 `suggestedSettings`에 사용자 override 병합:
  ```typescript
  const mergedSettings = { ...suggestedSettings, ...analysisOptions }
  ```

**커밋 단위**: Phase 2b = 1 커밋

#### Phase 2c: Live Data Summary 패널

`stats/components/smart-flow/panels/LiveDataSummary.tsx` (신규)
- 우측 고정 패널 (Phase 1의 컬럼 요약 패널과 동일 패턴)
- 선택된 변수 요약: 변수명, 타입, N, 결측
- 그룹 변수 시: 그룹별 n
- Total N
- 실시간 업데이트

**커밋 단위**: Phase 2c = 1 커밋

### 파일 목록 (신규 4 + 수정 3)

| 파일 | Phase | 작업 |
|------|-------|------|
| `variable-selector/slot-configs.ts` | 2a | 신규 — SlotConfig 타입 + 패턴별 슬롯 정의 |
| `variable-selector/UnifiedVariableSelector.tsx` | 2a | 신규 — 통합 셀렉터 (Pool + Slot + Chip 포함) |
| `steps/VariableSelectionStep.tsx` | 2a | 수정 — 렌더러 교체 |
| `variable-selector/AnalysisOptions.tsx` | 2b | 신규 — 옵션 섹션 (testValue 포함) |
| `lib/stores/smart-flow-store.ts` | 2b | 수정 — analysisOptions 추가 |
| `steps/AnalysisExecutionStep.tsx` | 2b | 수정 — suggestedSettings에 analysisOptions 병합 |
| `panels/LiveDataSummary.tsx` | 2c | 신규 — 우측 요약 |

### 구현 순서

```
Phase 2a  슬롯 설정 → UnifiedVariableSelector → Step 교체 → 커밋
  ↓
Phase 2b  AnalysisOptions + store 확장 → 커밋
  ↓
Phase 2c  LiveDataSummary → 커밋
```

### 테스트 전략

| 대상 | 도구 | 테스트 내용 |
|------|------|------------|
| `getSlotConfigs()` | Vitest | SelectorType별 올바른 슬롯 반환 |
| 슬롯 배치/제거 로직 (순수 함수) | Vitest | 클릭 배치, 타입 제약, VariableMapping 생성 |
| DnD 인터랙션 | **Playwright** (Phase 2 밖 가능) | 드래그&드롭 전체 흐름 |
| VariableSelectionStep 통합 | Vitest | **테스트 재작성** — mock 2개(Unified+Auto)로 SelectorType 분기 검증 |

> dnd-kit은 jsdom에서 포인터 이벤트 + getBoundingClientRect 의존 → Vitest DnD 테스트 불가.
> 클릭 인터랙션은 Vitest에서 테스트 가능.

### 리스크 / 주의

| 리스크 | 대응 |
|--------|------|
| @dnd-kit/sortable 미설치 | `pnpm add @dnd-kit/sortable` (복수 변수 슬롯에 필요) |
| 기존 테스트 깨짐 | 테스트 재작성 필요 (8개 셀렉터 mock → 2개로 변경, testid 검증 업데이트) |
| 70개 메서드 전부 검증 불가 | 주요 5개(t-test, anova, correlation, regression, chi-square) 우선 검증 |
| 번들 사이즈 | variable-requirements.ts(5000줄) 미import, slot-configs.ts는 수십 줄 |

### 제외 범위 (Phase 2 밖)

- Worker Python 코드 변경 (alternative/postHoc)
- 메서드 ID 정규화 (variable-requirements ↔ statistical-methods)
- AutoConfirmSelector → UnifiedSelector 전환 (11개 복잡 메서드)
- 모바일 반응형
- 기존 8개 셀렉터 삭제 (레거시 페이지 사용 중)
- Playwright E2E DnD 테스트

---

## Phase 3: Step 4 (결과) 스타일

### Hero 컴팩트화

```
현재: 큰 p값 카드 + 결론 박스 + APA + 메타데이터
시안: [📊] 독립표본 t-검정  ✅ p=0.003 (유의함)  ✓ d=0.85 (큰 효과)
```

### 통계량 4-column

```
현재: 3-column (statistic, p, effect)
시안: 4-column (t통계량, 자유도, 평균차이, 95%CI)
```

### 차트 + 가정검정 2-column

```
현재: 1-column 순차
시안: 좌(차트) + 우(가정검정 + 기술통계)
```

### 액션 버튼 정리

```
현재: 상단 Copy+Save, 하단 5개 버튼
시안: 상단 "템플릿 저장" + "내보내기 ▾"
```

- Phase 애니메이션: 유지 (시안에 없지만 기존 UX 가치 있음)
- AI 해석: 기능 유지, 초기 표시만 간결하게

**파일**: `ResultsActionStep.tsx`
**Step 계약 영향**: 없음

---

## Phase 4: Step 2 (방법 선택) + 공통 마무리

- 시안 없음 → 동일 디자인 언어(카드, 타이포, 간격) 적용
- 사이드바 스타일 통일 (항목 변경 없음, 시각만)
- terminology 리소스 업데이트 (stepShortLabels)

**파일**: `PurposeInputStep.tsx`, `app-sidebar.tsx`, terminology 파일
**Step 계약 영향**: 없음

---

## 구현 순서

```
Phase 0  스텝 인디케이터 교체 ← 지금
   ↓
Phase 1  Step 1 스타일 (2-column + 업로드 UI)
   ↓
Phase 2  Step 3 스타일 (칩 UI + 옵션 섹션 + Live Summary)
   ↓
Phase 3  Step 4 스타일 (Hero + 4-col + 2-column)
   ↓
Phase 4  Step 2 + 공통 마무리
```

각 Phase: 코드 수정 → tsc → 테스트 → 커밋. Step 계약 변경 없음.

---

## 후속 작업 (이 계획서 범위 밖)

| 작업 | 선행 조건 |
|------|----------|
| `alternative` Worker 실행 지원 | 43개 메서드 Python 코드 수정 |
| 메서드 ID 정규화 (variable-requirements ↔ statistical-methods) | 매핑 레이어 설계 |
| Step 1 변수 패널 (quickAnalysisMode) | Phase 2 완료 + VariableRolePanel 안정화 |
| Hub 리디자인 | 별도 STITCH 시안 필요 |

---

## 제외 범위

- Step 계약 변경 (canProceedToNext, navigateToStep)
- Worker Python 코드 변경
- 메서드 ID 정규화
- ChatCentricHub, Bio-Tools
- 모바일 반응형
