# Step 2 (분석 방법 선택) UI 디자인 리뷰 요청

## 목적

Step 2의 UI 디자인을 리팩토링 중이다. 전체 Step 간 일관성과 사용자 경험 관점에서 리뷰를 요청한다.

---

## 1. 프로젝트 배경

- **제품**: 전문가급 통계 분석 플랫폼 (PC 웹 + 데스크탑)
- **대상 사용자**: 생물학 연구자 (대학원생~교수)
- **UI 스택**: Next.js 15 + shadcn/ui + Tailwind CSS + Framer Motion
- **다크 모드**: 기본 (스크린샷 참조)
- **색상 체계**: OKLCH 기반, primary=과학 블루, success=초록(유의성), 분석별 고유 색상

---

## 2. 전체 분석 플로우 (4단계)

```
Step 1: 데이터 업로드 → Step 2: 방법 선택 → Step 3: 변수 설정 → Step 4: 결과
```

각 Step은 상단 StepIndicator로 현재 위치를 표시한다.

---

## 3. 다른 Step들의 UI 패턴 (일관성 기준)

### Step 1 (데이터 업로드)
- `StepHeader icon={ChartScatter} title="데이터 탐색"`
- 컨테이너: `space-y-6`
- 2열 레이아웃: `grid-cols-[1fr_280px]` (좌: 콘텐츠, 우: sticky 정보 패널)
- 뒤로 버튼: 없음 (첫 단계)

### Step 3 (변수 설정)
- StepHeader 미사용 — `Settings2 아이콘 + Badge(메서드명)` 간결 표시
- 컨테이너: `space-y-6`
- 1열 레이아웃, 전체 너비
- AI 감지 변수 배너 (아이콘+텍스트, `rounded-xl bg-muted/20`)
- 뒤로 버튼: 각 selector 내부

### Step 4 (결과)
- `StepHeader icon={BarChart3} title="결과" badge={메서드명} action={버튼들}`
- 컨테이너: `space-y-4` (더 타이트)
- 1열, Hero 카드 → Stats 그리드 → 차트 → AI 해석 순서
- 뒤로 버튼: 없음 (마지막)

### 공통 패턴 요약
| 항목 | 값 |
|------|---|
| 컨테이너 간격 | `space-y-6` (Step 4만 `space-y-4`) |
| 헤더 | StepHeader (icon + title), 또는 간결한 배지 |
| 너비 제어 | 부모 컨테이너 (px-6)가 제어, max-w 없음 |
| 카드 | `rounded-xl border shadow-sm` |
| 모션 | Framer Motion spring, prefers-reduced-motion 지원 |

---

## 4. Step 2 현재 구조 (리팩토링 진행 중)

### 변경 완료 (Phase 1)

**Before**: AI 채팅이 기본 화면, FilterToggle로 "AI 추천" / "직접 선택" 전환
**After**: CategorySelector(목적 카드 4개)가 기본 화면, AI 채팅은 보조 경로

```
Step 2 진입 → CategorySelector (기본)
               ├─ 목적 선택 → Subcategory → GuidedQuestions → Result
               ├─ "전체 목록에서 선택" → MethodBrowser
               └─ "AI에게 추천받기" → NaturalLanguageInput (AI 채팅)
```

FlowStateMachine step 값:
```
'category'     ← 기본 (목적 카테고리 4카드)
'subcategory'  ← 세부 선택
'questions'    ← Guided 조건 질문
'result'       ← 추천 결과
'browse'       ← 전체 메서드 목록
'ai-chat'      ← AI 채팅 (보조)
```

### 아직 미완료 (Phase 2 — 이 리뷰의 대상)

AI 채팅 뷰(NaturalLanguageInput)가 여전히 오래된 디자인:

---

## 5. 현재 문제점

### 5.1 AI 채팅 뷰의 챗봇 시대 패턴

| 패턴 | 문제 |
|------|------|
| 큰 중앙 정렬 제목 "어떤 분석을 하고 싶으신가요?" | StepHeader와 중복. 랜딩 페이지 패턴, 앱에 부적합 |
| 부제 "직접 선택 탭으로 전환하세요" | 탭을 제거했는데 여전히 참조 |
| 데이터 요약 배지 (15행×3열, 수치형 3개...) | AI 뷰에서만 표시. 모든 하위 뷰에서 보여야 함 |
| 예시 프롬프트 2열 그리드 | ChatGPT 스타일, max-w-2xl에 갇혀 좁음 |
| 채팅 입력 + 메시지 max-w-2xl | 부모 너비 대비 좁고, 추천 카드는 전체 너비 → 점프 |
| 하단 "단계별 가이드 \| 전체 목록" text-xs | 너무 작아서 발견 어려움 |
| 하단 거대한 빈 공간 | 콘텐츠가 상단에 몰림 |

### 5.2 디자인 시스템 불일치

| 항목 | 다른 Step들 | Step 2 AI 채팅 |
|------|------------|---------------|
| 헤더 | StepHeader (좌측 정렬) | 중앙 정렬 큰 텍스트 (별도) |
| 너비 | 부모 컨테이너 일관 | max-w-2xl → 전체 너비 점프 |
| 카드 | rounded-xl border shadow-sm | gradient from-primary/5 to-primary/10 |
| 배지 | bg-amber-500/90 (추천) | bg-green-500/20 (신뢰도) — 비표준 |
| 정보 밀도 | 콤팩트 (p-3, gap-2) | 상단 sparse, 하단 dense |

### 5.3 CategorySelector 기본 뷰

현재 잘 동작하지만, 다른 Step과의 일관성 개선 여지:
- 제목 "무엇을 알고 싶으신가요?" — 중앙 정렬 (다른 Step은 StepHeader 좌측 정렬)
- 데이터 요약 없음 (AI 뷰에만 있음)
- 하단 보조 경로 ("전체 목록에서 선택 | AI에게 추천받기") — 이미 추가됨, 적절

---

## 6. 제안하는 구조

### 6.1 Step 2 공통 레이아웃 (모든 하위 뷰 공유)

```
┌─────────────────────────────────────────────────┐
│ ◎ 분석 방법 선택               📊 15행×3열 #3 ◇0 │  ← StepHeader + 데이터 요약
├─────────────────────────────────────────────────┤
│ ← 뒤로                                          │  ← 'category'가 아닌 step에서만
├─────────────────────────────────────────────────┤
│                                                 │
│              [하위 뷰 콘텐츠]                      │  ← 각 step별 UI
│                                                 │
└─────────────────────────────────────────────────┘
```

- StepHeader: `icon={Target} title="분석 방법 선택"` + 우측에 데이터 요약 배지
- 뒤로 버튼: `flowState.step !== 'category'`일 때만 표시
- 하위 뷰: 부모 너비 그대로 사용 (max-w 없음)

### 6.2 CategorySelector (기본 화면)

```
◎ 분석 방법 선택               📊 15행×3열 #3 ◇0

    무엇을 알고 싶으신가요?
    분석 목적에 맞는 카테고리를 선택해주세요

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 그룹 비교  │ │ 관계 분석  │ │ 예측 모델  │ │ 분포/기술  │
│           │ │           │ │           │ │           │
│ t-검정 +3  │ │ 상관분석 +2│ │ 회귀분석 +3│ │ 정규성 +4  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

       전체 목록에서 선택  |  AI에게 추천받기
```

- 제목/설명은 CategorySelector 내부 (현재와 동일)
- 데이터 요약은 StepHeader 우측으로 이동
- 4카드 그리드 (현재와 동일)
- 하단 보조 경로 (현재와 동일)

### 6.3 AI 채팅 뷰 (보조 경로)

**Before (현재)**:
```
◎ 분석 방법 선택

    어떤 분석을 하고 싶으신가요?              ← 중복 제목
    연구 목표를 자유롭게 설명하세요...          ← 불필요한 부제
    📊 15행×3열 #3 ◇0                       ← AI에서만 보이는 데이터 요약

    [========= 입력창 (max-w-2xl) =========]

    예시:
    ┌───────────────────┐ ┌───────────────────┐
    │ 두 그룹 평균 비교    │ │ 상관관계 분석       │   ← 2열 그리드 (넓음)
    │                   │ │                   │
    ┌───────────────────┐ ┌───────────────────┐
    │ 시계열 추세 분석     │ │ 여러 그룹 비교      │
    └───────────────────┘ └───────────────────┘

              단계별 가이드 | 전체 목록 보기      ← text-xs, 거의 안 보임

              (거대한 빈 공간)
```

**After (제안)**:
```
◎ 분석 방법 선택               📊 15행×3열 #3 ◇0

← 뒤로

  분석 목적을 자유롭게 설명해주세요

  [===================== 입력창 (부모 너비) =====================]

  예시: [두 그룹 비교] [상관관계] [시계열 추세] [여러 그룹 비교]    ← flex-wrap 태그

  채팅 메시지들...
  추천 카드...
```

변경점:
1. 중복 제목 제거 (StepHeader가 이미 표시)
2. 데이터 요약 제거 (StepHeader 우측으로 이동)
3. 부제 → 간결한 한 줄 안내
4. 입력창 너비 → 부모 컨테이너 따름
5. 예시 → 2열 그리드 대신 flex-wrap 인라인 태그
6. 하단 네비게이션 제거 → "뒤로" 버튼이 대체
7. 빈 공간 해소 (콘텐츠가 자연스럽게 채움)

---

## 7. 리뷰 질문

### 디자인 구조
1. Step 2 공통 레이아웃(StepHeader + 데이터 요약 + 뒤로 버튼 + 하위 뷰)이 다른 Step과 일관적인가?
2. CategorySelector의 중앙 정렬 제목이 StepHeader 좌측 정렬과 충돌하는가? 통일해야 하나?
3. AI 채팅 뷰의 예시를 2열 그리드에서 flex-wrap 태그로 바꾸는 것이 적절한가?

### 사용자 경험
4. "뒤로" 버튼이 하단 네비게이션("단계별 가이드 | 전체 목록")을 충분히 대체하는가?
5. AI 채팅에서 추천 카드가 나왔을 때, 입력 영역과 카드의 너비가 동일해야 하는가?
6. 데이터 요약 배지의 최적 위치는? (StepHeader 우측 vs 별도 행 vs 하위 뷰 내부)

### 기술적
7. CategorySelector 내부 제목 "무엇을 알고 싶으신가요?"를 유지할 것인가, StepHeader 부제로 올릴 것인가?
8. NaturalLanguageInput에서 제거해야 할 요소: 제목, 부제, 데이터 요약, 하단 네비게이션 — 모두 맞는가?

---

## 8. 참고: 현재 NaturalLanguageInput 구조

```tsx
<div className="space-y-5">
  {/* 1. 헤더 — 중앙 정렬 제목 + 부제 + 데이터 요약 */}
  <div className="text-center space-y-3">
    <h2>어떤 분석을 하고 싶으신가요?</h2>
    <p>연구 목표를 자유롭게 설명하세요...</p>
    {dataSummary && <div>📊 15행×3열...</div>}
  </div>

  {/* 2. 입력 바 — max-w-2xl mx-auto */}
  <div className="relative max-w-2xl mx-auto">
    <Textarea />
    <Button />  {/* 전송 */}
  </div>

  {/* 3. 예시 — max-w-2xl, grid-cols-2 */}
  {!hasMessages && <div className="max-w-2xl mx-auto">
    <div className="grid grid-cols-2 gap-2">
      {examplePrompts.map(...)}
    </div>
  </div>}

  {/* 4. 에러 */}

  {/* 5. 채팅 스레드 — max-w-2xl, max-h-[320px] */}

  {/* 6. 추천 결과 카드 — 전체 너비 (max-w 없음) */}

  {/* 7. 하단 네비게이션 — text-xs */}
  <div className="flex items-center justify-center gap-1 pt-3">
    <button>단계별 가이드</button>
    <span>|</span>
    <button>전체 목록 보기</button>
  </div>
</div>
```

---

## 9. 참고: CategorySelector 구조

```tsx
<div className="space-y-6">
  {/* 제목 (중앙 정렬) */}
  <div className="text-center">
    <h2 className="text-2xl font-bold">무엇을 알고 싶으신가요?</h2>
    <p>분석 목적에 맞는 카테고리를 선택해주세요</p>
  </div>

  {/* 4카드 그리드 */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {categories.map(cat => (
      <button className="p-6 rounded-xl border-2">
        {/* 추천 배지, 아이콘, 제목, 설명, 중분류 미리보기 */}
      </button>
    ))}
  </div>

  {/* 하단 보조 경로 */}
  <div className="flex items-center justify-center gap-3 pt-2">
    <SecondaryLink icon={List} label="전체 목록에서 선택" />
    <span>|</span>
    <SecondaryLink icon={MessageSquare} label="AI에게 추천받기" />
  </div>
</div>
```
