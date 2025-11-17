# 스마트 분석 개선 계획서 V2 (Smart Analysis Improvement Plan - Updated)

**작성일**: 2025-01-17 (업데이트)
**작성자**: Claude Code
**목적**: 스마트 분석(Smart Flow) 시스템의 현황 재점검 및 개선 로드맵 업데이트

---

## 📊 현황 분석 업데이트 (As-Is, 2025-11-17 기준)

### 1. 통계 페이지 현황 (업데이트)

#### 전체 통계 페이지
- **총 개수**: **44개** (통계 42개 + 데이터 도구 2개)
  - **통계 페이지**: 42개 (기존 43개에서 1개 변경)
  - **데이터 도구**: 2개 (frequency-table, cross-tabulation - `/data-tools/`로 이동)
- **TwoPanelLayout 적용**: **43개/44개 (98%)**
- **Legacy UI**: **1개 (2%)** - `page.tsx` (통계 메뉴 인덱스 페이지)

#### 주요 변경 사항 (V1 대비)
- ✅ **regression-demo 여전히 존재** (제거 예정이었으나 보류)
- ✅ **TwoPanelLayout 대규모 마이그레이션 완료** (23개 페이지, 2025-11-16)
- ✅ **PyodideCore 표준화** (40/42 = 95%) - Phase 9 진행 중
- ✅ **통계 신뢰성 확보** (SciPy, statsmodels, sklearn 100% 사용)

#### 통계 페이지 목록 (42개)
```
✅ PyodideCore 사용 (40개):
1. ancova                    22. mcnemar
2. anova                     23. means-plot
3. binomial-test             24. mixed-model
4. chi-square-independence   25. mood-median
5. chi-square-goodness       26. normality-test
6. cochran-q                 27. one-sample-t
7. correlation               28. ordinal-regression
8. descriptive               29. partial-correlation
9. discriminant              30. poisson
10. dose-response            31. power-analysis
11. explore-data             32. proportion-test
12. factor-analysis          33. reliability
13. friedman                 34. response-surface
14. kruskal-wallis           35. runs-test
15. ks-test                  36. sign-test
16. mann-kendall             37. stepwise
17. mann-whitney             38. t-test
18. manova                   39. welch-t
19. wilcoxon                 40. cluster
20. pca                      41. chi-square
21. regression-demo          42. regression

❌ PyodideCore 미사용 (2개, 5%):
1. non-parametric (부분 사용 - 일부 메서드만)
2. regression (Legacy - TwoPanelLayout 적용 예정)
```

---

### 2. 스마트 분석 커버리지 (업데이트)

#### method-mapping.ts 분석
- **정의된 메서드**: **32개** (V1과 동일)
- **실제 통계 페이지**: **42개** (V1: 43개)
- **커버율**: **76%** (32/42) - V1: 74% (32/43)

#### 매핑 현황

##### ✅ 커버됨 (32개)
```typescript
// 기술통계 (3개)
1. descriptive-stats → descriptive
2. normality-test → normality-test
3. homogeneity-test → (검증 단계에서 자동 실행)

// T-검정 (4개)
4. one-sample-t → one-sample-t
5. two-sample-t → t-test
6. paired-t → t-test (옵션)
7. welch-t → welch-t

// ANOVA & 사후검정 (5개)
8. one-way-anova → anova
9. two-way-anova → anova (옵션)
10. tukey-hsd → anova (사후검정)
11. bonferroni → anova (사후검정)
12. games-howell → anova (사후검정)

// 회귀 & 상관 (4개)
13. simple-regression → regression
14. multiple-regression → regression
15. logistic-regression → regression (옵션)
16. correlation → correlation

// 비모수 검정 (5개)
17. mann-whitney → mann-whitney
18. wilcoxon → wilcoxon
19. kruskal-wallis → kruskal-wallis
20. dunn-test → kruskal-wallis (사후검정)
21. chi-square → chi-square-independence

// 고급 분석 (6개)
22. pca → pca
23. k-means → cluster
24. hierarchical → cluster
25. time-decomposition → (미구현)
26. arima → (미구현)
27. kaplan-meier → (미구현)

// 기타 검정 (5개)
28. proportion-test → proportion-test
29. binomial-test → binomial-test
30. sign-test → sign-test
31. runs-test → runs-test
32. ks-test → ks-test
```

##### ❌ 미커버 (10개) - **CRITICAL GAP** (V1: 11개)
```
1. ancova              (공분산분석)
2. chi-square-goodness (적합도 검정)
3. cochran-q           (코크란 Q)
4. discriminant        (판별분석)
5. dose-response       (용량-반응)
6. friedman            (프리드만 검정)
7. mann-kendall        (만-켄달 추세)
8. manova              (다변량 분산분석)
9. mcnemar             (맥니마 검정)
10. mixed-model        (혼합효과모형)

// 제거: ordinal-regression (이미 logistic-regression으로 커버 가능)
```

**추가 필요** (8개 - V1과 동일):
- `explore-data`: 탐색적 데이터 분석 (기술통계 확장)
- `means-plot`: 평균 그림 (시각화 전용)
- `partial-correlation`: 편상관 (correlation 확장)
- `stepwise`: 단계적 회귀 (regression 확장)
- `mood-median`: Mood's Median (비모수)
- `response-surface`: 반응표면분석 (고급)
- `reliability`: 신뢰도 분석 (psychometrics)
- `power-analysis`: 검정력 분석 (실험 설계)

---

## 🚨 주요 문제점 업데이트 (Critical Issues)

### 1. **워크플로우 단절** ⚠️ (여전히 존재)

#### 현재 상황
```
사용자: "ANCOVA 분석하고 싶어요"
→ 스마트 분석 진입 (/smart-flow)
→ Step 3: 분석 목적 입력
→ 추천 방법 목록에 ANCOVA 없음! ❌
→ 사용자 이탈 또는 혼란
```

**영향도**: **HIGH** - 24% 통계 방법이 스마트 분석에서 접근 불가 (10/42)

**개선 상태**: ❌ **미해결** (V1과 동일)

---

### 2. **UI 패턴 일관성** 🔄 (80% 개선됨!)

#### 현재 UI 패턴
```
1. 스마트 분석 (Smart Flow) - /smart-flow
   └ 6단계 워크플로우
   └ 데이터 업로드 → 검증 → 목적 → 변수 → 분석 → 결과

2. TwoPanelLayout (43개 페이지, 98%)
   └ 좌측: 입력/설정
   └ 우측: 결과/미리보기
   └ 데이터 하단 배치 패턴 (23개 최근 마이그레이션 완료)

3. regression-demo (여전히 존재)
   └ 4단계 워크플로우 (회귀 전용)
   └ 유형 선택 → 업로드 → 변수 → 결과
```

**개선 상태**: ✅ **80% 해결**
- ✅ TwoPanelLayout 98% 적용 (43/44)
- ✅ Step 인터페이스 표준화 (0-based 인덱싱)
- ✅ PyodideCore 표준화 (95%)
- ❌ regression-demo 여전히 중복 존재

**남은 문제**:
- regression-demo vs regression vs 스마트 분석 역할 여전히 불명확

---

### 3. **추천 시스템 신뢰도** 🤖 (부분 개선)

#### 현재 추천 로직
```typescript
// PurposeInputStep.tsx
1. 규칙 기반 추천 (method-mapping.ts)
   → recommendMethods(dataProfile)

2. SmartRecommender AI 추천
   → SmartRecommender.recommend(context)

3. 두 결과 병합 (mergedRecommendations)
   → 중복 제거, Smart 우선
```

**개선 상태**: 🟡 **부분 해결**
- ✅ 가정 결과 반영 (정규성, 등분산성)
- ✅ 200ms 디바운스 적용
- ❌ 추천 이유 설명 없음 (Black Box)
- ❌ 신뢰도 점수 표시 없음

---

### 4. **Step 2 (데이터 검증) 과부하** 📊 (개선 필요)

#### 현재 검증 항목
```typescript
DataValidationService.performDetailedValidation(data)
→ 1. 기본 검증 (결측치, 타입, 이상치)
→ 2. 정규성 검정 (Shapiro-Wilk)
→ 3. 등분산성 검정 (Levene)
→ 4. 상관관계 히트맵
→ 5. 컬럼별 통계량
```

**개선 상태**: ❌ **미해결** (V1과 동일)
- 대용량 데이터 (10,000행+)에서 느림 (3-5초)
- 사용자 이탈 가능성

---

## 💡 개선 방안 업데이트 (To-Be)

### Phase 1: 커버리지 100% 달성 (CRITICAL) 🎯

#### A. method-mapping.ts 확장 (우선순위: 변경됨!)

**작업 내용**: **18개 메서드 추가** (V1: 19개)

**필수 추가 (10개)** - V1: 11개 (ordinal-regression 제외)
```typescript
// 1. ANCOVA (공분산분석)
{
  id: 'ancova',
  name: '공분산분석 (ANCOVA)',
  description: '공변량을 통제한 그룹 비교',
  category: 'anova',
  requirements: {
    minSampleSize: 10,
    variableTypes: ['numeric', 'categorical'],
    assumptions: ['정규성', '등분산성', '공변량-종속변수 선형성']
  }
}

// 2. Friedman 검정
{
  id: 'friedman',
  name: 'Friedman 검정',
  description: '반복측정 비모수 검정 (3개 이상 조건)',
  category: 'nonparametric',
  requirements: {
    minSampleSize: 5,
    variableTypes: ['numeric'],
    assumptions: []
  }
}

// 3. 카이제곱 적합도 검정
{
  id: 'chi-square-goodness',
  name: '카이제곱 적합도 검정',
  description: '관찰 빈도가 기댓값과 일치하는지 검정',
  category: 'chi-square',
  requirements: {
    minSampleSize: 20,
    variableTypes: ['categorical']
  }
}

// 4. McNemar 검정
{
  id: 'mcnemar',
  name: 'McNemar 검정',
  description: '대응표본 범주형 자료 검정',
  category: 'chi-square',
  requirements: {
    minSampleSize: 10,
    variableTypes: ['categorical']
  }
}

// 5. Cochran Q 검정
{
  id: 'cochran-q',
  name: 'Cochran Q 검정',
  description: '3개 이상 반복측정 이분형 자료',
  category: 'chi-square',
  requirements: {
    minSampleSize: 10,
    variableTypes: ['categorical']
  }
}

// 6. Mann-Kendall 추세검정
{
  id: 'mann-kendall',
  name: 'Mann-Kendall 추세검정',
  description: '시계열 데이터 추세 유무 검정',
  category: 'timeseries',
  requirements: {
    minSampleSize: 10,
    variableTypes: ['numeric', 'date']
  }
}

// 7. MANOVA (다변량 분산분석)
{
  id: 'manova',
  name: '다변량 분산분석 (MANOVA)',
  description: '2개 이상 종속변수의 그룹 차이',
  category: 'anova',
  requirements: {
    minSampleSize: 20,
    variableTypes: ['numeric', 'categorical']
  }
}

// 8. 혼합효과모형
{
  id: 'mixed-model',
  name: '혼합효과모형',
  description: '고정효과 + 랜덤효과 분석',
  category: 'advanced',
  requirements: {
    minSampleSize: 30,
    variableTypes: ['numeric', 'categorical']
  }
}

// 9. 판별분석
{
  id: 'discriminant',
  name: '판별분석 (LDA/QDA)',
  description: '그룹 분류 및 판별함수 도출',
  category: 'advanced',
  requirements: {
    minSampleSize: 50,
    variableTypes: ['numeric', 'categorical']
  }
}

// 10. 용량-반응 분석
{
  id: 'dose-response',
  name: '용량-반응 분석',
  description: 'EC50, IC50 등 용량 반응 곡선',
  category: 'regression',
  requirements: {
    minSampleSize: 20,
    variableTypes: ['numeric']
  }
}
```

**선택 추가 (8개)** - V1과 동일
```typescript
// 11. Mood's Median 검정
{
  id: 'mood-median',
  name: "Mood's Median 검정",
  description: '중앙값 기반 비모수 검정',
  category: 'nonparametric',
  requirements: {
    minSampleSize: 10,
    variableTypes: ['numeric', 'categorical']
  }
}

// 12. 편상관분석
{
  id: 'partial-correlation',
  name: '편상관분석',
  description: '제3변수 통제 상관계수',
  category: 'correlation',
  requirements: {
    minSampleSize: 30,
    variableTypes: ['numeric']
  }
}

// 13. 단계적 회귀분석
{
  id: 'stepwise-regression',
  name: '단계적 회귀분석',
  description: '변수 선택 자동화 (Forward/Backward)',
  category: 'regression',
  requirements: {
    minSampleSize: 50,
    variableTypes: ['numeric']
  }
}

// 14. 반응표면분석
{
  id: 'response-surface',
  name: '반응표면분석 (RSM)',
  description: '최적 조건 탐색',
  category: 'advanced',
  requirements: {
    minSampleSize: 30,
    variableTypes: ['numeric']
  }
}

// 15. 신뢰도 분석
{
  id: 'reliability-analysis',
  name: '신뢰도 분석 (Cronbach α)',
  description: '측정 도구 내적일관성',
  category: 'psychometrics',
  requirements: {
    minSampleSize: 30,
    variableTypes: ['numeric']
  }
}

// 16. 검정력 분석
{
  id: 'power-analysis',
  name: '검정력 분석',
  description: '필요 표본 크기 계산',
  category: 'design',
  requirements: {
    minSampleSize: 1,
    variableTypes: []
  }
}

// 17. 탐색적 데이터 분석
{
  id: 'explore-data',
  name: '탐색적 데이터 분석 (EDA)',
  description: '종합 데이터 요약 및 시각화',
  category: 'descriptive',
  requirements: {
    minSampleSize: 1,
    variableTypes: []
  }
}

// 18. 평균 그림
{
  id: 'means-plot',
  name: '평균 그림',
  description: '그룹별 평균 비교 시각화',
  category: 'descriptive',
  requirements: {
    minSampleSize: 3,
    variableTypes: ['numeric', 'categorical']
  }
}
```

**예상 작업 시간**: 2-3시간 (V1과 동일)
**우선순위**: **HIGH**
**완료 후 커버율**: **100%** (50/42 - 일부 method는 여러 page로 구현)

---

### Phase 2: UI 역할 명확화 및 통합 🎨

#### A. 홈 화면 안내 개선 (V1과 동일)

**현재**:
```
┌─────────────────────┐
│ [통계 분석 시작]    │
│ [스마트 분석]       │
└─────────────────────┘
```

**개선**:
```
┌──────────────────────────────────────────────┐
│ 🚀 통계 분석 시작하기                        │
│                                              │
│ 📊 [처음이신가요? 스마트 분석 🤖]             │
│    데이터만 업로드하면 AI가 자동으로 추천!   │
│    → 6단계 가이드 워크플로우                 │
│                                              │
│ 🎯 [원하는 분석을 아시나요? 통계 메뉴 📋]     │
│    42개 통계 방법 중 직접 선택               │
│    → 전문가 모드                             │
└──────────────────────────────────────────────┘
```

**작업 시간**: 30분
**파일**: `app/(dashboard)/page.tsx`

---

#### B. regression-demo 제거 및 통합 (재검토)

**현재 상황**:
- `/smart-flow`: 범용 워크플로우 ✅
- `/statistics/regression-demo`: 회귀 전용 워크플로우 (여전히 존재)
- `/statistics/regression`: Legacy 회귀 페이지 (TwoPanelLayout 미적용)

**개선안 (2가지 옵션)**:

**옵션 1: regression-demo 삭제** (V1 제안)
1. `regression-demo` **삭제**
2. `/statistics/regression`을 TwoPanelLayout으로 완전 재작성
3. 스마트 분석에서 회귀 선택 시 → `/statistics/regression` 리다이렉트

**장점**:
- 중복 제거
- 사용자 혼란 감소
- 유지보수 부담 감소

**옵션 2: regression-demo 유지 및 역할 재정의** (신규)
1. `regression-demo`를 "회귀 분석 마법사"로 리브랜딩
2. `/statistics/regression`은 "고급 회귀 분석"으로 차별화
3. 스마트 분석 → regression-demo (초보자) / 통계 메뉴 → regression (전문가)

**장점**:
- 초보자/전문가 분리
- 기존 개발 투자 유지
- 점진적 마이그레이션 가능

**추천**: **옵션 1** (V1과 동일)
**작업 시간**: 1-2시간
**우선순위**: MEDIUM

---

#### C. 스마트 분석 ↔ 개별 페이지 양방향 전환 (V1과 동일)

**Step 3 (분석 목적) 개선**:
```typescript
// PurposeInputStep.tsx
{selectedMethod && (
  <Alert className="bg-primary/5 border-primary/20">
    <Check className="h-4 w-4 text-primary" />
    <AlertDescription>
      <div className="flex justify-between items-center">
        <div>
          <strong>선택된 방법:</strong> {selectedMethod.name}
        </div>

        {/* 🆕 추가 */}
        <Button variant="outline" size="sm" asChild>
          <Link href={`/statistics/${selectedMethod.id}`}>
            고급 옵션 보기 →
          </Link>
        </Button>
      </div>
    </AlertDescription>
  </Alert>
)}
```

**개별 통계 페이지에 역방향 링크 추가**:
```typescript
// TwoPanelLayout Header
<div className="flex items-center gap-2">
  <Breadcrumb>
    <BreadcrumbItem>홈</BreadcrumbItem>
    <BreadcrumbItem>통계 분석</BreadcrumbItem>
    <BreadcrumbItem>{analysisTitle}</BreadcrumbItem>
  </Breadcrumb>

  {/* 🆕 추가 */}
  <Button variant="ghost" size="sm" asChild>
    <Link href="/smart-flow">
      🤖 스마트 분석으로
    </Link>
  </Button>
</div>
```

**작업 시간**: 3시간
**우선순위**: HIGH

---

### Phase 3: 추천 시스템 개선 (Explainable AI) 🧠

#### A. 추천 이유 표시 (V1과 동일, 더 상세히)

**현재**:
```typescript
<Card>
  <Badge>AI 추천</Badge>
  <h3>독립표본 t-검정</h3>
  <p>두 독립 그룹 간 평균 차이 검정</p>
</Card>
```

**개선**:
```typescript
<Card>
  <div className="flex items-center justify-between">
    <Badge variant="default">AI 추천 ⚡</Badge>
    <Badge variant="outline">신뢰도: 92%</Badge>
  </div>

  <h3>독립표본 t-검정</h3>
  <p className="text-sm text-muted-foreground">
    두 독립 그룹 간 평균 차이 검정
  </p>

  {/* 🆕 추천 이유 */}
  <Collapsible>
    <CollapsibleTrigger className="text-xs text-primary hover:underline">
      왜 추천되나요? ▼
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div className="mt-2 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span>그룹 변수 2개 감지 (남/여)</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span>정규성 검정 통과 (p = 0.12)</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span>등분산성 검정 통과 (p = 0.45)</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span>샘플 크기 충분 (n=50, 필요: 4)</span>
        </div>
      </div>
    </CollapsibleContent>
  </Collapsible>

  <Button className="mt-3 w-full">선택하기</Button>
</Card>
```

**구현 방법**:
1. `checkMethodRequirements()` 결과를 UI에 노출
2. 통과/실패 항목을 체크리스트로 표시
3. 신뢰도 점수 계산 (통과 항목 / 전체 항목)

**작업 시간**: 4시간
**우선순위**: HIGH

---

#### B. "수동 선택" 탭 추가 (V1과 동일)

```typescript
<Tabs defaultValue="recommended">
  <TabsList className="grid grid-cols-2 w-full">
    <TabsTrigger value="recommended">
      🤖 AI 추천 ({mergedRecommendations.length}개)
    </TabsTrigger>
    <TabsTrigger value="manual">
      📋 전체 보기 (50개)
    </TabsTrigger>
  </TabsList>

  <TabsContent value="recommended">
    {/* 기존 추천 UI */}
  </TabsContent>

  <TabsContent value="manual">
    {/* 카테고리별 전체 메서드 그리드 */}
    <Accordion type="single" collapsible>
      <AccordionItem value="t-test">
        <AccordionTrigger>T-검정 (4개)</AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-2 gap-2">
            {/* 4개 카드 */}
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="anova">
        <AccordionTrigger>분산분석 (7개)</AccordionTrigger>
        {/* ... */}
      </AccordionItem>

      {/* ... */}
    </Accordion>
  </TabsContent>
</Tabs>
```

**작업 시간**: 2시간
**우선순위**: MEDIUM

---

### Phase 4: 성능 최적화 ⚡

#### A. Step 2 검증 단계 경량화 (V1과 동일)

**현재**:
```typescript
// DataValidationStep - 모든 검증 한 번에 실행
performDetailedValidation(data)
→ 3-5초 소요 (10,000행 기준)
```

**개선**:
```typescript
// 1. 기본 검증만 즉시 실행 (0.5초)
performBasicValidation(data)
→ 결측치, 타입, 기본 통계량만

// 2. 고급 검증은 "백그라운드"로 이동
<Tabs>
  <TabsTrigger>기본 정보 ✓</TabsTrigger>
  <TabsTrigger>
    상세 분석
    {isDetailedLoading && <Loader2 className="ml-1 h-3 w-3 animate-spin" />}
  </TabsTrigger>
</Tabs>

<TabsContent value="basic">
  {/* 즉시 표시 */}
</TabsContent>

<TabsContent value="detailed">
  {/* 클릭 시 로드 */}
  {!detailedResults && (
    <Button onClick={performDetailedValidation}>
      상세 분석 실행
    </Button>
  )}
</TabsContent>
```

**효과**:
- 초기 로딩 시간 83% 감소 (5초 → 0.5초)
- 사용자 이탈률 감소

**작업 시간**: 5시간
**우선순위**: HIGH

---

### Phase 5: 최신 UI 트렌드 적용 🎨

#### A. ChatGPT Canvas 스타일 "실시간 미리보기" (V1과 동일)

**Step 4 (변수 선택) 개선**:
```typescript
<div className="grid grid-cols-2 gap-4">
  {/* 좌측: 변수 선택 */}
  <Card>
    <CardHeader>
      <CardTitle>변수 선택</CardTitle>
    </CardHeader>
    <CardContent>
      <VariableSelector
        onChange={handleVariableChange}
      />
    </CardContent>
  </Card>

  {/* 우측: 실시간 미리보기 🆕 */}
  <Card className="bg-muted/20">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        실시간 미리보기
      </CardTitle>
    </CardHeader>
    <CardContent>
      {isPreviewLoading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">계산 중...</span>
        </div>
      ) : previewResults ? (
        <div className="space-y-2">
          <div className="text-2xl font-bold font-mono">
            p = {previewResults.pValue.toFixed(3)}
          </div>
          <Progress value={previewResults.power * 100} />
          <p className="text-xs text-muted-foreground">
            예상 검정력: {(previewResults.power * 100).toFixed(0)}%
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          변수를 선택하면 예상 결과가 표시됩니다
        </p>
      )}
    </CardContent>
  </Card>
</div>
```

**구현 방법**:
1. 변수 선택 시 `useDebouncedCallback` (500ms)
2. PyodideCore로 **샘플링 분석** (1000행만)
3. 빠른 결과 표시 (1초 이내)

**작업 시간**: 8시간
**우선순위**: MEDIUM

---

#### B. Perplexity 스타일 "인라인 가이드" (V1과 동일)

```typescript
<div className="prose prose-sm max-w-none">
  <p>
    독립표본 t-검정을 선택하셨습니다.
    <sup>
      <Button
        variant="link"
        size="sm"
        className="h-auto p-0 text-xs"
        onClick={() => setExpandedGuide('t-test')}
      >
        [1]
      </Button>
    </sup>
  </p>

  {expandedGuide === 't-test' && (
    <Alert className="mt-2">
      <Info className="h-4 w-4" />
      <AlertTitle>[1] 독립표본 t-검정이란?</AlertTitle>
      <AlertDescription>
        <ul className="text-xs space-y-1 mt-2">
          <li>• 두 독립된 그룹의 평균을 비교하는 통계 방법</li>
          <li>• 정규성과 등분산성 가정 필요</li>
          <li>• 예: 남성과 여성의 평균 키 비교</li>
        </ul>
      </AlertDescription>
    </Alert>
  )}
</div>
```

**작업 시간**: 6시간
**우선순위**: LOW

---

#### C. Claude Artifacts 스타일 "결과 해석 도우미" (V1과 동일)

```typescript
// Step 6 (결과)
<Tabs>
  <TabsTrigger value="visualization">📊 시각화</TabsTrigger>
  <TabsTrigger value="table">📋 테이블</TabsTrigger>
  <TabsTrigger value="interpretation">💬 해석 도움</TabsTrigger> {/* 🆕 */}
</Tabs>

<TabsContent value="interpretation">
  <Card>
    <CardHeader>
      <CardTitle className="text-base">AI 결과 해석</CardTitle>
      <CardDescription>
        분석 결과를 쉬운 말로 설명해드립니다
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      {/* 자동 생성된 해석 */}
      <div className="bg-primary/5 border-l-4 border-primary p-3 rounded">
        <p className="text-sm leading-relaxed">
          📌 <strong>주요 결과</strong><br/>
          p-value가 0.03으로 0.05보다 작습니다.
          이는 두 그룹 간 평균 차이가 통계적으로 유의함을 의미합니다.
        </p>
      </div>

      <div className="bg-muted/50 p-3 rounded">
        <p className="text-sm leading-relaxed">
          💡 <strong>쉬운 해석</strong><br/>
          남성과 여성의 평균 키가 실제로 다르다고 95% 확신할 수 있습니다.
          이 차이는 우연히 발생했을 가능성이 3%에 불과합니다.
        </p>
      </div>

      {/* 추가 질문 */}
      <div className="border-t pt-3">
        <p className="text-xs text-muted-foreground mb-2">
          더 궁금한 점이 있으신가요?
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm">
            효과 크기는 어떻게 해석하나요?
          </Button>
          <Button variant="outline" size="sm">
            논문에 어떻게 쓰나요?
          </Button>
          <Button variant="outline" size="sm">
            가정 위반 시 대안은?
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</TabsContent>
```

**작업 시간**: 10시간
**우선순위**: LOW

---

## 📋 실행 계획 (Roadmap - Updated)

### ✅ 즉시 착수 (1-2시간)
**우선순위**: **CRITICAL**

1. **method-mapping.ts 확장** (18개 메서드 추가)
   - 예상 시간: 2시간
   - 완료 후 커버율: 100%
   - 블로커: 없음

2. **홈 화면 안내 개선**
   - 예상 시간: 30분
   - 파일: `app/(dashboard)/page.tsx`
   - 블로커: 없음

3. **regression-demo 제거 검토**
   - 예상 시간: 1시간 (토론 + 결정)
   - 사용자 승인 필요: ✓

---

### ⏳ 단기 (1일)
**우선순위**: **HIGH**

4. **스마트 분석 ↔ 개별 페이지 양방향 전환**
   - 예상 시간: 3시간
   - 파일:
     - `PurposeInputStep.tsx`
     - `TwoPanelLayout.tsx`

5. **추천 이유 표시 (Explainable AI)**
   - 예상 시간: 4시간
   - 파일: `RecommendedMethods.tsx`
   - 의존성: method-mapping.ts 확장 완료

6. **"수동 선택" 탭 추가**
   - 예상 시간: 2시간
   - 파일: `PurposeInputStep.tsx`

---

### 🔮 중기 (3일)
**우선순위**: **MEDIUM**

7. **Step 2 검증 경량화** (성능 최적화)
   - 예상 시간: 5시간
   - 파일: `DataValidationStep.tsx`, `DataValidationService.ts`
   - 효과: 로딩 시간 83% 감소

8. **실시간 미리보기** (ChatGPT Canvas 스타일)
   - 예상 시간: 8시간
   - 파일: `VariableSelectionStep.tsx`
   - 의존성: PyodideCore 샘플링 API

9. **인라인 가이드** (Perplexity 스타일)
   - 예상 시간: 6시간
   - 파일: `PurposeInputStep.tsx`, `MethodSelector.tsx`

10. **결과 해석 도우미** (Claude Artifacts 스타일)
    - 예상 시간: 10시간
    - 파일: `ResultsActionStep.tsx`
    - 의존성: RAG 챗봇 통합

---

### 🌟 장기 (1주)
**우선순위**: **LOW**

11. **남은 2개 통계 페이지 TwoPanelLayout 전환**
    - non-parametric, regression
    - 예상 시간: 3시간 (페이지당 1.5시간)

12. **스마트 분석 A/B 테스트**
    - AI 추천 vs 규칙 추천 정확도 비교
    - 사용자 선호도 조사

---

## 🎯 성공 지표 (KPI - Updated)

### 정량 지표
1. **커버율**: 76% (32/42) → **100%** (50/42)
2. **초기 로딩 시간**: 5초 → **0.5초** (90% 감소)
3. **사용자 완료율**: 추정 60% → **85%** 목표
4. **TwoPanelLayout 적용**: 98% (43/44) → **100%** (44/44)
5. **PyodideCore 표준화**: 95% (40/42) → **100%** (42/42)

### 정성 지표
1. **사용자 혼란도 감소**
   - "어디로 가야 하나요?" 문의 감소
2. **추천 신뢰도 향상**
   - "왜 이게 추천되나요?" 설명 제공
3. **전문가 모드 만족도**
   - 고급 사용자도 빠르게 접근 가능

---

## 🚀 다음 단계 (Updated)

### 사용자 승인 필요 항목
1. ✅ **method-mapping.ts 18개 메서드 추가** (즉시 시작 가능?)
2. ✅ **regression-demo 제거** (동의하시나요?)
3. ✅ **Phase 우선순위** (어느 것부터?)

### 제안 작업 순서
```
Day 1 (오늘):
  1. method-mapping.ts 확장 (2시간)
  2. 홈 화면 안내 개선 (30분)
  3. 테스트 및 문서 업데이트 (30분)

Day 2:
  4. 양방향 전환 버튼 (3시간)
  5. 추천 이유 표시 (4시간)

Day 3:
  6. 수동 선택 탭 (2시간)
  7. Step 2 경량화 (5시간)

Day 4-6:
  8-10. 고급 UI 개선 (실시간 미리보기, 인라인 가이드, 해석 도우미)
```

---

## 📝 V2 주요 변경 사항 요약

### 현황 업데이트
- ✅ 통계 페이지 개수: 43개 → **42개** (데이터 도구 2개 분리)
- ✅ TwoPanelLayout 적용: 79% → **98%** (23개 페이지 마이그레이션 완료)
- ✅ PyodideCore 표준화: 0% → **95%** (Phase 9 진행 중)
- ✅ 통계 신뢰성: SciPy, statsmodels, sklearn **100% 사용**

### 개선 방안 조정
- 🔄 method-mapping.ts 확장: 19개 → **18개** (ordinal-regression 제외)
- 🔄 커버율 목표: 100% (51/43) → **100%** (50/42)
- 🆕 regression-demo 제거 옵션 2가지 제시 (V1: 1가지만)

### 우선순위 재조정
- 🔴 **CRITICAL**: method-mapping.ts 확장 (100% 커버율)
- 🟠 **HIGH**: 추천 이유 표시, 양방향 전환, Step 2 경량화
- 🟡 **MEDIUM**: 수동 선택 탭, 실시간 미리보기
- 🟢 **LOW**: 인라인 가이드, 결과 해석 도우미

---

**작성 완료**: 2025-01-17 (V2)
**검토 필요**: 사용자 승인 후 즉시 실행 가능
**예상 총 작업 시간**: 60시간 (전체 Phase 완료 기준, V1과 동일)
