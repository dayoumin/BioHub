# Regression-Demo UX 분석 및 개선 방향 (2025-11-15)

**분석 대상**: `regression-demo/page.tsx` + `ThreePanelLayout.tsx`

**현재 상태**: 3-Panel 레이아웃 (좌측 사이드바 | 메인 콘텐츠 | 우측 패널)

---

## 🔍 현재 UX 문제점 분석

### 1️⃣ **우측 패널 vs 하단 배치** (사용자 제안)

#### 현재 상태: 우측 패널 (40% 너비)

**장점**:
- ✅ 데이터와 작업 영역을 **동시에 볼 수 있음**
- ✅ 큰 모니터에서 공간 활용 효율적
- ✅ SPSS/R Studio 같은 전문 통계 도구 레이아웃과 유사

**단점**:
- ❌ 좁은 화면(1366px 이하)에서 메인 콘텐츠 영역이 좁아짐
- ❌ 변수 선택 시 Badge가 많으면 스크롤 필요
- ❌ Step 3에서 데이터를 보면서 변수 선택하는 게 어려움

#### 제안: 하단 패널 (100% 너비)

**장점**:
- ✅ 메인 콘텐츠 영역이 넓어짐 (변수 선택 UI 여유로움)
- ✅ 데이터 테이블을 가로로 넓게 볼 수 있음
- ✅ 세로 스크롤만 필요 (좌우 스크롤 불필요)

**단점**:
- ❌ 데이터를 보려면 **아래로 스크롤** 필요 (동시에 볼 수 없음)
- ❌ 세로 공간을 많이 차지함 (Step이 길어지면 스크롤 과다)
- ❌ 전문 통계 도구와 다른 레이아웃 (학습 곡선 증가)

**권장**: **우측 패널 유지 + 반응형 개선**
- 큰 화면(≥1440px): 우측 패널 (현재 방식)
- 작은 화면(<1440px): 하단 패널로 자동 전환 (Tabs로 "데이터" / "결과" 구분)

---

### 2️⃣ **좌측 사이드바 네비게이션 제한** (Critical Issue!)

#### 현재 문제:
```typescript
// ThreePanelLayout.tsx Line 75
const isClickable = onStepChange && (step.id <= currentStep || isCompleted)
```

**시나리오**:
1. Step 1 → Step 2 → Step 3 → Step 4 (분석 완료)
2. Step 4에서 "Step 3 (변수 선택)" 클릭 → ✅ 이동 가능
3. Step 3에서 "Step 4 (분석 결과)" 클릭 → ❌ **이동 불가능!**

**원인**:
- `isClickable` 조건이 `step.id <= currentStep` 이므로
- Step 3에서는 Step 4 (id=4 > currentStep=3)가 비활성화됨

**해결 방법**:
```typescript
// Step 완료 상태를 추적하는 로직 필요
const isClickable = onStepChange && (
  step.id <= currentStep ||  // 현재 단계 이전
  isCompleted ||              // 완료된 단계
  (results && step.id === 4)  // 결과가 있으면 Step 4 이동 가능
)
```

---

### 3️⃣ **변수 선택 UI 문제** (스케일링 이슈)

#### 현재 코드:
```typescript
// regression-demo/page.tsx Line 389-444
<Card>
  <CardHeader>
    <CardTitle className="text-lg">변수 할당</CardTitle>  {/* ← 불필요? */}
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="flex flex-wrap gap-2">
      {uploadedData.columns.map((header: string) => (
        <Badge>{header}</Badge>  {/* ← 10~15개면 2줄, 긴 이름이면? */}
      ))}
    </div>
  </CardContent>
</Card>
```

#### 문제점:

**1) "변수 할당" 제목 불필요**
- "독립변수(X)" / "종속변수(Y)" 라벨이 이미 명확함
- CardTitle이 추가 공간을 차지함

**2) 변수가 많을 때 (10~15개)**
```
현재: Badge가 flex-wrap으로 2~3줄로 자동 줄바꿈 ✅
문제 없음
```

**3) 변수명이 긴 경우 (예: "student_satisfaction_score_2024")**
```
현재: Badge가 전체 너비를 차지하며 1줄에 1~2개만 표시
문제: 가독성 떨어짐, 스크롤 과다
```

**해결 방법**:
```typescript
// 옵션 A: 긴 이름 자르기 (Truncate)
<Badge className="max-w-[200px] truncate" title={header}>
  {header}
</Badge>

// 옵션 B: Select 드롭다운으로 변경 (10개 이상일 때)
{columns.length > 10 ? (
  <Select>
    <SelectTrigger>
      <SelectValue placeholder="변수 선택" />
    </SelectTrigger>
    <SelectContent>
      {columns.map(col => (
        <SelectItem value={col}>{col}</SelectItem>
      ))}
    </SelectContent>
  </Select>
) : (
  // 기존 Badge 방식
)}

// 옵션 C: 가상 스크롤 리스트 (50개 이상일 때)
<ScrollArea className="h-[300px]">
  <div className="grid grid-cols-2 gap-2">
    {columns.map(col => (
      <Badge>{col}</Badge>
    ))}
  </div>
</ScrollArea>
```

---

### 4️⃣ **Step 3 데이터 미리보기 부재**

#### 현재 문제:
- Step 2: 우측 패널에 DataPreviewPanel 표시 ✅
- Step 3: 우측 패널에 "데이터를 업로드하면..." 메시지만 표시 ❌
- **사용자는 변수를 선택하면서 데이터를 볼 수 없음!**

#### 해결 방법:
```typescript
// Step 3에서도 DataPreviewPanel 표시
{currentStep === 3 && uploadedData && (
  <DataPreviewPanel
    data={uploadedData.data}
    columns={uploadedData.columns}
    fileName={uploadedData.fileName}
  />
)}
```

---

## 🎯 개선 방향 우선순위

### ⭐ 우선순위 1: Critical (즉시 수정 필요)

#### 1-1. 좌측 사이드바 네비게이션 수정
**문제**: Step 3 → Step 4 이동 불가능
**영향**: UX 심각하게 저하
**작업 시간**: 30분

**수정 파일**:
- `ThreePanelLayout.tsx` (Line 75)
- `regression-demo/page.tsx` (onStepChange 로직)

**구현**:
```typescript
// 1. completed 상태를 외부에서 전달받도록 수정
const isClickable = onStepChange && (
  step.id <= currentStep ||
  step.completed  // 완료된 단계는 항상 클릭 가능
)

// 2. regression-demo/page.tsx에서 completed 설정
const STEPS = [
  { id: 1, label: '회귀 유형 선택', completed: !!regressionType },
  { id: 2, label: '데이터 업로드', completed: !!uploadedData },
  { id: 3, label: '변수 선택', completed: !!selectedVariables },
  { id: 4, label: '분석 결과', completed: !!results }
]
```

---

#### 1-2. Step 3 데이터 미리보기 추가
**문제**: 변수 선택 시 데이터를 볼 수 없음
**영향**: 사용자가 어떤 변수를 선택해야 할지 모름
**작업 시간**: 15분

**구현**:
```typescript
// regression-demo/page.tsx
rightPanel={{
  mode: currentStep === 4 ? 'results' : 'preview',
  previewData: uploadedData?.data,  // Step 2, 3 모두 표시
  results
}}
```

---

### ⭐ 우선순위 2: High (1주일 내)

#### 2-1. "변수 할당" 제목 제거
**문제**: 불필요한 공간 차지
**영향**: 작음
**작업 시간**: 5분

**구현**:
```typescript
// CardHeader 전체 제거
<CardContent className="space-y-4">
  <div className="space-y-2">
    <Label>독립변수 (X)</Label>
    ...
  </div>
</CardContent>
```

---

#### 2-2. 긴 변수명 처리 (Truncate)
**문제**: 긴 변수명이 UI를 깨뜨림
**영향**: 중간
**작업 시간**: 20분

**구현**:
```typescript
<Badge
  className={cn(
    "max-w-[200px] truncate cursor-pointer",
    selected && "bg-primary text-primary-foreground"
  )}
  title={header}  // Hover 시 전체 이름 표시
>
  {header}
</Badge>
```

---

### ⭐ 우선순위 3: Medium (2주일 내)

#### 3-1. 반응형 레이아웃 (우측 패널 → 하단 패널)
**문제**: 작은 화면에서 메인 콘텐츠 영역이 좁음
**영향**: 중간
**작업 시간**: 2시간

**구현**:
```typescript
// ThreePanelLayout.tsx
const [layout, setLayout] = useState<'side' | 'bottom'>('side')

useEffect(() => {
  const handleResize = () => {
    setLayout(window.innerWidth < 1440 ? 'bottom' : 'side')
  }
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])

return layout === 'side' ? (
  // 현재 3-Panel 레이아웃
) : (
  // 2-Panel 레이아웃 (우측 패널을 하단으로 이동)
)
```

---

#### 3-2. 변수 선택 UI 개선 (10개 이상 시 Select)
**문제**: 변수가 많으면 가독성 떨어짐
**영향**: 중간
**작업 시간**: 1시간

**구현**:
```typescript
{columns.length > 10 ? (
  <Select
    value={selectedVariables?.independent?.[0]}
    onValueChange={(value) => handleVariableSelect({ ...selectedVariables, independent: [value] })}
  >
    <SelectTrigger>
      <SelectValue placeholder="독립변수 선택" />
    </SelectTrigger>
    <SelectContent>
      {columns.map(col => (
        <SelectItem key={col} value={col}>{col}</SelectItem>
      ))}
    </SelectContent>
  </Select>
) : (
  // 기존 Badge 방식
)}
```

---

## 📊 개선 효과 예측

### Before (현재)
```
Step 1 → Step 2 → Step 3 → Step 4
         ↓        ↓        ↓
         ↑        ↑        ❌ (Step 4로 이동 불가능)

Step 3:
- 우측 패널: "데이터를 업로드하면..." 메시지만 표시
- 변수 선택: Badge 2~3줄, 긴 이름은 줄바꿈
- "변수 할당" 제목으로 공간 낭비
```

### After (개선 후)
```
Step 1 ↔ Step 2 ↔ Step 3 ↔ Step 4
(모든 완료된 단계 간 자유로운 이동 가능)

Step 3:
- 우측 패널: DataPreviewPanel (데이터 미리보기)
- 변수 선택: Badge max-w-[200px] truncate (깔끔)
- "변수 할당" 제목 제거 (공간 절약)
```

**UX 개선 효과**:
- ✅ 네비게이션 자유도: 50% → 100% (+100%)
- ✅ 데이터 가시성: 0% → 100% (Step 3에서 데이터 볼 수 있음)
- ✅ 공간 효율: +20px (CardHeader 제거)
- ✅ 가독성: 긴 변수명 처리 (title tooltip)

---

## 🚀 실행 계획

### Phase 1: Critical 수정 (오늘, 1시간)
1. ✅ 좌측 사이드바 네비게이션 수정 (30분)
   - ThreePanelLayout.tsx: `completed` 상태 활용
   - regression-demo/page.tsx: STEPS에 completed 추가

2. ✅ Step 3 데이터 미리보기 추가 (15분)
   - rightPanel.mode 조건 수정
   - Step 2, 3 모두 DataPreviewPanel 표시

3. ✅ "변수 할당" 제목 제거 (5분)
   - CardHeader 제거

4. ✅ 긴 변수명 처리 (10분)
   - Badge에 max-w-[200px] truncate 추가

### Phase 2: 테스트 및 검증 (30분)
1. TypeScript 컴파일 확인
2. 브라우저 수동 테스트
   - Step 1 → 2 → 3 → 4 → 3 → 4 (자유로운 이동)
   - Step 3에서 우측 패널 데이터 확인
   - 긴 변수명 hover 시 전체 이름 표시

### Phase 3: 커밋 및 문서화 (15분)
1. Git 커밋 3개
   - 네비게이션 수정
   - Step 3 데이터 미리보기
   - 변수 선택 UI 개선
2. 테스트 결과 문서화

---

## 📝 추가 고려 사항

### 1. 다른 42개 통계 페이지 마이그레이션
- 현재 regression-demo는 **템플릿 역할**
- 개선 사항을 다른 페이지에도 적용 필요
- Phase 7-3에서 일괄 적용 예정

### 2. Pyodide 실제 연동
- 현재 데모 데이터 사용 중
- Phase 7-2에서 실제 Pyodide 연동
- `lib/statistics/groups/regression.ts` 사용

### 3. 모바일 반응형 (우선순위 낮음)
- 통계 플랫폼은 **데스크탑 우선**
- 모바일은 Tauri 앱으로 대응 (Phase 11)

---

**작성일**: 2025-11-15
**작성자**: Claude Code
**다음 리뷰**: Phase 1 완료 후 (1시간 후)