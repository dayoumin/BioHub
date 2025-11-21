# Smart Flow UX 재설계 계획서

**작성일**: 2025-11-21
**작성자**: Claude Code
**목적**: 스마트 통계 분석 플로우의 사용자 경험 근본적 개선

---

## 📋 목차

1. [현재 상황 분석](#1-현재-상황-분석)
2. [핵심 문제점](#2-핵심-문제점)
3. [개선 목표](#3-개선-목표)
4. [새로운 플로우 설계](#4-새로운-플로우-설계)
5. [UI/UX 트렌드 적용](#5-uiux-트렌드-적용)
6. [구현 계획](#6-구현-계획)
7. [마일스톤](#7-마일스톤)

---

## 1. 현재 상황 분석

### 현재 플로우 (6단계)

```
Step 1: 데이터 업로드
  - 파일 선택 및 업로드
  - 즉시 Step 2로 이동

Step 2: 데이터 검증 ⚠️ 문제 발생!
  - 기본 검증 (행/열/결측치)
  - 엄청난 양의 분석 결과 한번에 표시:
    ✓ 데이터 품질 요약
    ✓ 기초통계 (전체 변수)
    ✓ 통계적 가정 검정 (정규성, 등분산성, 독립성)
    ✓ 탐색적 시각화 (히스토그램, 박스플롯, 상관관계 히트맵, Q-Q plot)
  - ❌ 애니메이션 없음
  - ❌ 로딩 피드백 부족
  - ❌ 정보 과부하 (Information Overload)

Step 3: 분석 목적 입력 ⚠️ 논리적 단절!
  - 텍스트 입력 또는 방법 선택
  - ❌ Step 2에서 이미 "권장 분석 방법" 제시했는데?
  - ❌ 사용자 혼란: "이미 추천받았는데 왜 또 선택?"

Step 4: 변수 선택
  - 변수 역할 매핑 (독립/종속/공변량 등)

Step 5: 통계 분석 실행
  - Python Worker로 분석

Step 6: 결과 및 액션
  - 결과 표시, 리포트 생성
```

### 기술 스택
- **프론트**: Next.js 15, React, TypeScript, shadcn/ui
- **상태관리**: Zustand (smart-flow-store)
- **분석엔진**: Pyodide (Python Workers)
- **통계**: SciPy, statsmodels, pingouin

---

## 2. 핵심 문제점

### 2.1 정보 과부하 (Step 2)
```
❌ 현재: 데이터 검증 = 기본 검증 + 상세 통계 + 가정 검정 + 시각화 (모두 한꺼번에)
✅ 개선: 점진적 노출 (Progressive Disclosure)
```

**문제**:
- 사용자가 한 번에 너무 많은 정보를 받음
- 스크롤이 엄청나게 김
- 어디서부터 봐야 할지 모름
- 애니메이션 없이 갑자기 나타남 (뚝 떨어지는 느낌)

**증상**:
```typescript
// DataValidationStep.tsx Line 118-190
// 백그라운드에서 엄청난 분석 수행 중이지만 사용자는 모름
useEffect(() => {
  // 1. 데이터 특성 분석
  // 2. 정규성 검정 (Shapiro, Anderson, D'Agostino)
  // 3. 등분산성 검정 (Levene, Bartlett)
  // 4. 상관관계 계산
  // 5. 이상치 탐지
  // ... 모두 동시에!
}, [data, validationResults, pyodideLoaded])
```

### 2.2 논리적 흐름 단절 (Step 2 → Step 3)
```
Step 2: "모수 검정 가능합니다! t-test, ANOVA 추천"
  ↓
Step 3: "분석 목적을 선택하세요" (???)
```

**문제**:
- Step 2에서 이미 분석 방법 추천했는데
- Step 3에서 다시 분석 방법 선택
- 중복되고 혼란스러움
- 사용자: "이미 추천받았는데 왜 또 물어봐?"

### 2.3 UX 트렌드 미반영
- ❌ 스켈레톤 로딩 없음
- ❌ 애니메이션 없음 (fade-in, slide-in)
- ❌ 프로그레스 인디케이터 부족
- ❌ Decision Tree 방식 미사용
- ❌ 접기/펼치기 (Accordion) 미사용

### 2.4 성능 문제
- 모든 분석을 동시에 수행 (블로킹)
- Pyodide Worker 활용 미흡
- 불필요한 재계산

---

## 3. 개선 목표

### 3.1 사용자 경험 (UX)
1. **점진적 정보 노출**: 필요한 만큼만, 단계별로
2. **명확한 피드백**: 로딩 상태, 진행률 표시
3. **부드러운 전환**: 애니메이션, Skeleton Loading
4. **논리적 흐름**: Step 간 자연스러운 연결
5. **선택의 명확성**: Decision Tree 방식

### 3.2 성능
1. **지연 로딩**: 필요한 분석만 수행
2. **백그라운드 작업**: Web Worker 활용
3. **캐싱**: 중복 계산 방지

### 3.3 최신 트렌드 반영
- **Linear.app** 스타일: 깔끔한 카드, Stagger Animation
- **Vercel**: 프로그레스 바, Skeleton Loading
- **Notion**: Decision Tree, Expandable Cards
- **Perplexity**: AI 분석 중... (타이핑 효과)

---

## 4. 새로운 플로우 설계

### 4.1 전체 플로우 (6단계 → 5단계)

```
┌────────────────────────────────────────────────────────────┐
│ Step 1: 데이터 업로드                                        │
│   - 파일 드래그 앤 드롭                                       │
│   - 즉시 검증 (파일 형식, 크기)                               │
│   - ✅ 업로드 완료 → 자동 Step 2 이동                        │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ Step 2: 빠른 데이터 검증 (3초 이내) ⭐ 단순화                 │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│   [Skeleton Loading 1초]                                   │
│     ↓                                                      │
│   [Fade-in Animation]                                      │
│   ✅ 데이터 준비 완료                                        │
│                                                            │
│   📊 요약 카드 (간결)                                       │
│   ┌────────────────────────────────────┐                  │
│   │ 표본 크기: 30                       │                  │
│   │ 변수: 수치형 3개, 범주형 2개        │                  │
│   │ 데이터 품질: 양호 (결측 0%)         │                  │
│   └────────────────────────────────────┘                  │
│                                                            │
│   [분석 시작하기 →] 버튼                                    │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                            │
│   💡 상세 정보는 Step 3 이후 필요시 제공                    │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ Step 3: 분석 목적 선택 (Decision Tree) 🌳 ⭐ 핵심 개선       │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│   "데이터로 무엇을 하고 싶으신가요?"                         │
│                                                            │
│   [카드 선택 UI - Notion 스타일]                            │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│   │ 👥 그룹 비교 │  │ 📈 관계 분석 │  │ 📊 분포 분석 │      │
│   │ 두 집단의   │  │ 변수 간     │  │ 빈도, 평균  │      │
│   │ 평균 비교   │  │ 상관관계    │  │ 등 확인     │      │
│   └─────────────┘  └─────────────┘  └─────────────┘      │
│                                                            │
│   사용자가 "그룹 비교" 선택                                  │
│     ↓                                                      │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│   [AI 분석 중... 프로그레스 바]                             │
│   🤖 데이터 특성 분석 중... (1초)                           │
│   🧪 통계 가정 검정 중... (2초)                             │
│   💡 최적 방법 추천 중... (0.5초)                           │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│     ↓                                                      │
│   [Stagger Animation으로 순차 표시]                        │
│                                                            │
│   🎯 AI 추천 결과                                           │
│   ┌────────────────────────────────────────────┐          │
│   │ 💡 최적 분석 방법: Independent t-test       │          │
│   │                                            │          │
│   │ ✅ 데이터 적합도: 95%                       │          │
│   │   - ✓ 정규분포: p=0.234 (충족)             │          │
│   │   - ✓ 등분산성: p=0.456 (충족)             │          │
│   │   - ✓ 샘플 크기: 30개 (충분)               │          │
│   │                                            │          │
│   │ 📖 설명: 두 집단의 평균을 비교하는 가장    │          │
│   │         적합한 방법입니다.                  │          │
│   │                                            │          │
│   │ [이 방법으로 분석하기 →]                   │          │
│   └────────────────────────────────────────────┘          │
│                                                            │
│   [Accordion - 접힘 상태]                                   │
│   📊 기초통계 보기 ▼                                        │
│   🔬 통계 가정 상세 ▼                                       │
│   📈 데이터 시각화 ▼                                        │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ Step 4: 변수 매핑 (자동 완료 + 확인) ⭐ AI 자동화             │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│   🤖 AI가 자동으로 변수를 할당했습니다                       │
│                                                            │
│   [변수 매핑 카드]                                          │
│   ┌────────────────────────────────────┐                  │
│   │ 그룹 변수: Treatment ✓              │                  │
│   │   (자동 감지: 2개 그룹)             │                  │
│   │                                    │                  │
│   │ 측정 변수: Score ✓                  │                  │
│   │   (수치형, 정규분포 확인)           │                  │
│   │                                    │                  │
│   │ [수정하기 ✏️]  [확인 ✓]            │                  │
│   └────────────────────────────────────┘                  │
│                                                            │
│   [분석 실행 →] 버튼                                        │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ Step 5: 결과 및 리포트                                       │
│   - 분석 결과 표시                                          │
│   - APA 형식 리포트 생성                                    │
│   - 시각화 차트                                             │
└────────────────────────────────────────────────────────────┘
```

### 4.2 핵심 변경사항 요약

| 항목 | 기존 (As-Is) | 개선 (To-Be) |
|------|--------------|--------------|
| **Step 수** | 6단계 | 5단계 (통합) |
| **Step 2** | 엄청난 분석 결과 | 빠른 검증만 (3초) |
| **Step 3** | 텍스트 입력 | Decision Tree 선택 → AI 분석 → 추천 |
| **정보 노출** | 한번에 모두 | 점진적 노출 (Progressive) |
| **애니메이션** | 없음 | Skeleton, Fade-in, Stagger |
| **상세 정보** | 항상 표시 | Accordion (접기/펼치기) |
| **AI 역할** | 수동 선택 | 자동 분석 + 추천 + 변수 매핑 |

---

## 5. UI/UX 트렌드 적용

### 5.1 Progressive Disclosure (점진적 노출)

**원칙**: 사용자가 필요한 정보만 단계별로 제공

```tsx
// ❌ 기존: 모든 정보를 한번에
<div>
  <DataQualitySummary />
  <NumericStatsTable />
  <OutlierAnalysis />
  <CategoricalFrequency />
  <NormalityTests />
  <HomogeneityTests />
  <CorrelationHeatmap />
  <QQPlots />
  {/* ... 엄청나게 길어짐 */}
</div>

// ✅ 개선: 점진적 노출
<div>
  {/* 1단계: 요약만 */}
  <DataSummaryCard />

  {/* 2단계: AI 추천 (필요시) */}
  {selectedPurpose && <AIRecommendation />}

  {/* 3단계: 상세 (접힘 상태) */}
  <Accordion>
    <AccordionItem value="details">
      <AccordionTrigger>상세 통계 보기</AccordionTrigger>
      <AccordionContent>
        {/* 펼쳤을 때만 로드 */}
        <LazyLoad>
          <DetailedStats />
        </LazyLoad>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
</div>
```

### 5.2 Skeleton Loading + Stagger Animation

**참고**: Linear.app, Vercel, GitHub

```tsx
// Skeleton Loading (로딩 중)
<div className="space-y-4">
  <Skeleton className="h-20 w-full" />
  <Skeleton className="h-40 w-full" />
</div>

// Stagger Animation (순차 등장)
<div className="space-y-4">
  {/* 0ms */}
  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
    <SummaryCard />
  </div>

  {/* 150ms delay */}
  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
    <AssumptionCard />
  </div>

  {/* 300ms delay */}
  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
    <RecommendationCard />
  </div>
</div>
```

### 5.3 Decision Tree UI

**참고**: Notion, Miro, Figma

```tsx
// 목적 선택 카드
<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
  <PurposeCard
    icon={<Users className="w-8 h-8" />}
    title="그룹 간 차이 비교"
    description="두 집단의 평균을 비교하고 싶어요"
    examples="예: 치료군 vs 대조군"
    onClick={() => handlePurposeSelect('compare')}
    selected={purpose === 'compare'}
  />

  <PurposeCard
    icon={<TrendingUp className="w-8 h-8" />}
    title="변수 간 관계 분석"
    description="두 변수 간 상관관계를 알고 싶어요"
    examples="예: 키와 몸무게의 관계"
    onClick={() => handlePurposeSelect('correlation')}
    selected={purpose === 'correlation'}
  />

  {/* ... 더 많은 옵션 */}
</div>
```

### 5.4 AI 분석 프로그레스

**참고**: Perplexity.ai, ChatGPT

```tsx
// AI 분석 중 상태
<Card>
  <CardContent className="py-8">
    <div className="space-y-4">
      {/* 프로그레스 바 */}
      <Progress value={progress} className="h-2" />

      {/* 단계별 메시지 */}
      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          {progress >= 30 ? <Check className="w-4 h-4 text-success" /> : <Loader2 className="w-4 h-4 animate-spin" />}
          <span>데이터 특성 분석 중...</span>
        </div>
        <div className="flex items-center gap-2">
          {progress >= 60 ? <Check className="w-4 h-4 text-success" /> : <Loader2 className="w-4 h-4 animate-spin" />}
          <span>통계 가정 검정 중...</span>
        </div>
        <div className="flex items-center gap-2">
          {progress >= 100 ? <Check className="w-4 h-4 text-success" /> : <Loader2 className="w-4 h-4 animate-spin" />}
          <span>최적 방법 추천 중...</span>
        </div>
      </div>
    </div>
  </CardContent>
</Card>
```

### 5.5 Accordion (접기/펼치기)

**참고**: shadcn/ui, Radix UI

```tsx
<Accordion type="multiple" defaultValue={["summary"]}>
  {/* 기본적으로 요약만 펼침 */}
  <AccordionItem value="summary">
    <AccordionTrigger>
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4" />
        <span>요약 정보</span>
      </div>
    </AccordionTrigger>
    <AccordionContent>
      <SummaryInfo />
    </AccordionContent>
  </AccordionItem>

  {/* 상세는 접힘 상태 */}
  <AccordionItem value="stats">
    <AccordionTrigger>
      <div className="flex items-center gap-2">
        <TableIcon className="w-4 h-4" />
        <span>기초 통계</span>
        <Badge variant="outline">8개 변수</Badge>
      </div>
    </AccordionTrigger>
    <AccordionContent>
      {/* 펼쳤을 때만 렌더링 */}
      <LazyLoad>
        <DetailedStatsTable />
      </LazyLoad>
    </AccordionContent>
  </AccordionItem>

  {/* ... 더 많은 섹션 */}
</Accordion>
```

---

## 6. 구현 계획

### 6.1 Phase 1: Step 2 단순화 (1-2일)

**목표**: 데이터 검증을 빠르고 간결하게

**작업**:
1. DataValidationStep.tsx 리팩토링
   - 무거운 분석 제거 (Step 3로 이동)
   - 기본 검증만 유지 (행/열/결측치/타입)
   - Skeleton Loading 추가
   - Fade-in 애니메이션 추가

```typescript
// DataValidationStep.tsx (간소화)
export function DataValidationStep() {
  const [isValidating, setIsValidating] = useState(true)

  useEffect(() => {
    // 빠른 검증만
    const validate = async () => {
      await new Promise(r => setTimeout(r, 1000)) // 1초 딜레이
      setIsValidating(false)
    }
    validate()
  }, [data])

  if (isValidating) {
    return <SkeletonLoading />
  }

  return (
    <div className="animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            데이터 준비 완료
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 간단한 요약만 */}
          <DataSummaryCard />

          <Button onClick={onNext} className="mt-4">
            분석 시작하기 →
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

**성공 기준**:
- [ ] Step 2 로딩 시간 < 3초
- [ ] 화면 스크롤 < 1 페이지
- [ ] Skeleton → Fade-in 애니메이션 작동

---

### 6.2 Phase 2: Step 3 재설계 (Decision Tree) (3-4일)

**목표**: 분석 목적 선택 → AI 분석 → 추천 플로우 구축

**핵심 원칙** (다른 AI 검토 반영):
1. ❌ **텍스트 입력 제거** - textarea 완전 삭제
2. ❌ **방법 선택 즉시 변수 매핑 팝업 금지** - autoMapVariables 호출 제거
3. ✅ **dataProfile UI 노출** - Step 2 결과를 시각적으로 표시
4. ✅ **isAnalyzing 상태 추가** - setTimeout 대신 명시적 상태 관리
5. ✅ **"이 방법으로 분석하기" 버튼** - Step 4로 명확히 분리

**작업**:

#### 2.1 PurposeCard 컴포넌트 생성
```typescript
// components/smart-flow/steps/purpose/PurposeCard.tsx
interface PurposeCardProps {
  icon: React.ReactNode
  title: string
  description: string
  examples: string
  onClick: () => void
  selected: boolean
}

export function PurposeCard({
  icon, title, description, examples, onClick, selected
}: PurposeCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg",
        selected && "border-primary border-2 bg-primary/5"
      )}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            {icon}
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {selected && <Check className="w-4 h-4 text-primary" />}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground mt-2">{examples}</p>
      </CardContent>
    </Card>
  )
}
```

#### 2.2 DataProfile UI 노출 (Step 2 결과 연계)
```typescript
// PurposeInputStep.tsx 상단에 추가
export function PurposeInputStep() {
  const { dataCharacteristics, assumptionResults } = useSmartFlowStore()

  return (
    <div className="space-y-6">
      {/* Step 2 결과 요약 카드 - 명시적 노출 */}
      <div className="animate-in fade-in duration-500">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              데이터 검증 완료
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">표본 크기</p>
                <p className="text-lg font-semibold">{dataCharacteristics?.sampleSize || 0}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">변수</p>
                <p className="text-sm font-semibold">
                  수치형 {dataProfile?.numericVars}개, 범주형 {dataProfile?.categoricalVars}개
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">데이터 품질</p>
                <p className="text-lg font-semibold">양호</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">권장 분석</p>
                <p className="text-sm font-semibold">
                  {assumptionResults?.summary?.canUseParametric ? '모수적' : '비모수적'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 이후 목적 선택 UI */}
      {/* ... */}
    </div>
  )
}
```

#### 2.3 AI 분석 플로우 (isAnalyzing 명시적 관리)
```typescript
// PurposeInputStep.tsx (재설계)
export function PurposeInputStep() {
  const [purpose, setPurpose] = useState<AnalysisPurpose | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false) // ✅ 명시적 상태
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null)

  const handlePurposeSelect = async (selectedPurpose: AnalysisPurpose) => {
    setPurpose(selectedPurpose)
    setIsAnalyzing(true) // ✅ 로딩 시작
    setAnalysisProgress(0)

    // AI 분석 단계별 실행 (setTimeout 사용 안함!)
    try {
      // 1단계: 데이터 특성 분석 (30%)
      setAnalysisProgress(10)
      const characteristics = await analyzeDataCharacteristics(data)
      setAnalysisProgress(30)

      // 2단계: 통계 가정 검정 (60%)
      setAnalysisProgress(40)
      const assumptions = await checkStatisticalAssumptions(data, selectedPurpose)
      setAnalysisProgress(60)

      // 3단계: 최적 방법 추천 (100%)
      setAnalysisProgress(80)
      const recommended = await recommendMethod(
        selectedPurpose,
        characteristics,
        assumptions
      )
      setAnalysisProgress(100)

      // 결과 표시 (300ms 완료 애니메이션만)
      await new Promise(r => setTimeout(r, 300))
      setRecommendation(recommended)
      setIsAnalyzing(false) // ✅ 로딩 종료
    } catch (error) {
      console.error('AI 분석 실패:', error)
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 목적 선택 */}
      {!purpose && (
        <div className="animate-in fade-in duration-500">
          <h2 className="text-xl font-semibold mb-4">
            데이터로 무엇을 하고 싶으신가요?
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <PurposeCard
              icon={<Users />}
              title="그룹 간 차이 비교"
              description="두 집단의 평균을 비교하고 싶어요"
              examples="예: 치료군 vs 대조군"
              onClick={() => handlePurposeSelect('compare')}
              selected={false}
            />
            {/* ... 더 많은 카드 */}
          </div>
        </div>
      )}

      {/* AI 분석 중 */}
      {isAnalyzing && (
        <AIAnalysisProgress progress={analysisProgress} />
      )}

      {/* AI 추천 결과 */}
      {recommendation && (
        <div className="space-y-4">
          {/* Stagger Animation */}
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI 추천 결과
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 추천 방법 */}
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <h3 className="font-semibold text-lg mb-2">
                      💡 최적 분석 방법: {recommendation.method.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {recommendation.reasoning.join(', ')}
                    </p>

                    {/* 적합도 */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-medium">데이터 적합도:</span>
                      <Badge variant={recommendation.confidence >= 80 ? "default" : "secondary"}>
                        {recommendation.confidence}%
                      </Badge>
                    </div>

                    {/* 가정 검정 결과 */}
                    <div className="space-y-1">
                      {recommendation.assumptions.map((assumption, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          {assumption.passed ? (
                            <CheckCircle className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-error" />
                          )}
                          <span>{assumption.name}</span>
                          {assumption.pValue && (
                            <span className="text-muted-foreground">
                              (p={assumption.pValue.toFixed(3)})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* ✅ 핵심: "이 방법으로 분석하기" 버튼 (Step 4로 이동) */}
                    <Button
                      className="w-full mt-4"
                      size="lg"
                      onClick={() => {
                        setSelectedMethodInStore(recommendation.method)
                        onNext() // Step 4로 이동 (변수 매핑)
                      }}
                    >
                      이 방법으로 분석하기 →
                    </Button>
                  </div>

                  {/* 대안 방법 */}
                  {recommendation.alternatives && recommendation.alternatives.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        다른 방법 보기 ({recommendation.alternatives.length}개)
                      </summary>
                      <div className="mt-2 space-y-2">
                        {recommendation.alternatives.map((alt, idx) => (
                          <div key={idx} className="p-2 border rounded">
                            {alt.name}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Accordion - 상세 정보 (접힘 상태) */}
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
            <Accordion type="multiple">
              <AccordionItem value="stats">
                <AccordionTrigger>📊 기초통계 보기</AccordionTrigger>
                <AccordionContent>
                  <LazyLoad>
                    <BasicStatsTable />
                  </LazyLoad>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="assumptions">
                <AccordionTrigger>🔬 통계 가정 상세</AccordionTrigger>
                <AccordionContent>
                  <LazyLoad>
                    <AssumptionDetailsTable />
                  </LazyLoad>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="viz">
                <AccordionTrigger>📈 데이터 시각화</AccordionTrigger>
                <AccordionContent>
                  <LazyLoad>
                    <DataVisualization />
                  </LazyLoad>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      )}
    </div>
  )
}
```

#### 2.3 분석 목적 타입 정의
```typescript
// types/smart-flow.ts
export type AnalysisPurpose =
  | 'compare'       // 그룹 간 차이 비교
  | 'relationship'  // 변수 간 관계 분석
  | 'distribution'  // 분포와 빈도 분석
  | 'prediction'    // 예측 모델링
  | 'timeseries'    // 시계열 분석

export interface AIRecommendation {
  method: StatisticalMethod
  confidence: number // 0-100
  reasoning: string[]
  assumptions: {
    name: string
    passed: boolean
    pValue?: number
  }[]
  alternatives?: StatisticalMethod[]
}
```

**성공 기준**:
- [ ] 목적 선택 카드 UI 완성
- [ ] AI 분석 프로그레스 작동
- [ ] 추천 결과 표시 (95% 일치도)
- [ ] Accordion으로 상세 정보 접기/펼치기

---

### 6.3 Phase 3: 애니메이션 및 UX 개선 (2일)

**작업**:
1. Tailwind CSS 애니메이션 설정
2. Skeleton 컴포넌트 구현
3. Stagger Animation 적용
4. Lazy Loading 구현

```typescript
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      keyframes: {
        "fade-in": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        "slide-in-from-bottom": {
          "0%": { transform: "translateY(20px)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out",
        "slide-in": "slide-in-from-bottom 0.5s ease-out",
      },
    },
  },
}
```

**성공 기준**:
- [ ] 모든 카드에 Fade-in 적용
- [ ] Stagger 효과 (150ms 간격)
- [ ] Skeleton Loading 작동

---

### 6.4 Phase 4: Step 4 자동화 (1일)

**목표**: 변수 매핑 AI 자동화

**작업**:
```typescript
// 자동 변수 매핑 강화
export async function autoMapVariables(
  data: DataRow[],
  method: StatisticalMethod,
  purpose: AnalysisPurpose
): Promise<VariableMapping> {
  // 목적에 따라 변수 역할 추론
  switch (purpose) {
    case 'compare':
      return {
        groupVariable: detectGroupVariable(data),
        measureVariable: detectMeasureVariable(data),
        confidence: 0.95
      }
    // ...
  }
}
```

**성공 기준**:
- [ ] 자동 매핑 정확도 > 90%
- [ ] 사용자 확인/수정 UI

---

### 6.5 Phase 5: 테스트 및 최적화 (2일)

**작업**:
1. E2E 테스트 (Playwright)
2. 성능 측정 (Lighthouse)
3. 사용자 테스트
4. 버그 수정

**성공 기준**:
- [ ] 전체 플로우 완료 시간 < 30초
- [ ] Lighthouse 점수 > 90
- [ ] 테스트 커버리지 > 80%

---

## 7. 마일스톤

### Milestone 1: Step 2 단순화 (1주차)
- [x] 계획 문서 작성
- [ ] DataValidationStep 리팩토링
- [ ] Skeleton Loading 구현
- [ ] 애니메이션 적용

### Milestone 2: Step 3 재설계 (2주차)
- [ ] PurposeCard 컴포넌트
- [ ] Decision Tree UI
- [ ] AI 분석 플로우
- [ ] Accordion 구현

### Milestone 3: 통합 및 테스트 (3주차)
- [ ] Step 4 자동화
- [ ] E2E 테스트
- [ ] 성능 최적화
- [ ] 문서 업데이트

### Milestone 4: 배포 (4주차)
- [ ] QA 테스트
- [ ] 사용자 피드백
- [ ] 버그 수정
- [ ] 프로덕션 배포

---

## 8. 기술 스택 및 의존성

### 새로 추가할 라이브러리

```json
{
  "dependencies": {
    "@radix-ui/react-accordion": "^1.1.2",  // Accordion
    "@radix-ui/react-progress": "^1.0.3",   // Progress Bar
    "react-intersection-observer": "^9.5.3" // Lazy Loading
  }
}
```

### 기존 활용
- shadcn/ui (Card, Button, Badge, Skeleton)
- Tailwind CSS (애니메이션)
- Zustand (상태 관리)
- Pyodide (통계 계산)

---

## 9. 리스크 및 대응 방안

### 리스크 1: AI 추천 정확도 부족
**대응**:
- Rule-based + ML hybrid 방식
- 사용자 피드백 루프
- "다른 방법 보기" 옵션 제공

### 리스크 2: 성능 저하
**대응**:
- Web Worker로 백그라운드 처리
- Lazy Loading 적극 활용
- 캐싱 강화

### 리스크 3: 사용자 혼란
**대응**:
- 사용자 테스트 진행
- 툴팁 및 가이드 추가
- "도움말" 버튼 제공

---

## 10. 성공 지표 (KPI)

| 지표 | 현재 | 목표 |
|------|------|------|
| Step 2 로딩 시간 | ~10초 | < 3초 |
| 전체 플로우 완료 시간 | ~60초 | < 30초 |
| 사용자 만족도 (NPS) | ? | > 8/10 |
| 분석 방법 선택 정확도 | ~70% | > 90% |
| 페이지 스크롤 길이 | ~5 페이지 | < 2 페이지 |

---

## 11. 다음 단계 (Next Steps)

### 즉시 시작 가능한 작업
1. ✅ 계획 문서 검토 및 승인
2. [ ] DataValidationStep.tsx 백업 생성
3. [ ] Phase 1 브랜치 생성 (`feature/smart-flow-ux-step2`)
4. [ ] Skeleton 컴포넌트 구현
5. [ ] 첫 번째 커밋

### 사용자 확인 필요 사항
- [ ] 새로운 플로우 (5단계) 승인?
- [ ] Decision Tree 방식 동의?
- [ ] Accordion (접기/펼치기) 사용 승인?
- [ ] 예상 개발 기간 (3-4주) 합의?

---

## 부록 A: 참고 자료

- **UI 트렌드**: [linear.app](https://linear.app), [vercel.com](https://vercel.com)
- **Decision Tree**: [Notion](https://notion.so), [Miro](https://miro.com)
- **AI UX**: [Perplexity.ai](https://perplexity.ai), [ChatGPT](https://chat.openai.com)
- **Accordion**: [shadcn/ui Accordion](https://ui.shadcn.com/docs/components/accordion)
- **Animation**: [Tailwind CSS Animate](https://tailwindcss.com/docs/animation)

---

**마지막 업데이트**: 2025-11-21
**문서 버전**: v1.0
**상태**: 초안 (Draft) → 검토 대기 중