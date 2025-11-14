# 통계 페이지 데이터 UX 개선 계획

**작성일**: 2025-11-15
**목표**: 개별 통계 페이지 데이터 추출 버그 수정 + 데이터 뷰어 + 검증 도구 추가
**작업 완료 후**: 이 문서는 `archive/implementation/` 폴더로 이동 예정

---

## 📋 작업 체크리스트

### Phase A: 데이터 추출 버그 수정 (긴급)

#### ✅ A-1. 공통 유틸리티 생성
- [ ] 파일 생성: `lib/utils/data-extraction.ts`
- [ ] 함수 작성: `extractNumericValue(value: unknown): number | null`
- [ ] 함수 작성: `extractRowValue(row: unknown, col: string): number | null`
- [ ] 단위 테스트 추가: `lib/utils/__tests__/data-extraction.test.ts`
- [ ] TypeScript 에러 확인: `npx tsc --noEmit`

**검증 기준**:
- `extractNumericValue("123")` → `123`
- `extractNumericValue(123)` → `123`
- `extractNumericValue("abc")` → `null`
- `extractNumericValue(null)` → `null`

---

#### ✅ A-2. 문제 페이지 수정 (6개)

**수정 대상**:
1. [ ] `app/(dashboard)/statistics/regression/page.tsx` ✅ **완료**
2. [ ] `app/(dashboard)/statistics/mann-whitney/page.tsx`
3. [ ] `app/(dashboard)/statistics/chi-square-independence/page.tsx`
4. [ ] `app/(dashboard)/statistics/cochran-q/page.tsx`
5. [ ] `app/(dashboard)/statistics/mann-kendall/page.tsx`
6. [ ] `app/(dashboard)/statistics/wilcoxon/page.tsx`

**수정 방법 (각 페이지 동일)**:
```typescript
// Before (삭제)
const extractRowValue = (row: unknown, col: string): unknown => {
  if (typeof row === 'object' && row !== null && col in row) {
    return (row as Record<string, unknown>)[col]
  }
  return undefined
}

// After (추가)
import { extractRowValue } from '@/lib/utils/data-extraction'
```

**검증 방법**:
- [ ] 각 페이지 브라우저 테스트
- [ ] CSV 업로드 → 변수 선택 → 분석 실행
- [ ] 에러 없이 정상 작동 확인

---

#### ✅ A-3. 최종 검증
- [ ] TypeScript 컴파일: `npx tsc --noEmit` (0 errors)
- [ ] 빌드 테스트: `npm run build` (성공)
- [ ] 6개 페이지 수동 테스트 (CSV 업로드 → 분석 실행)

---

### Phase B: 데이터 뷰어 추가

#### ✅ B-1. DataPreviewPanel 컴포넌트 생성
- [ ] 파일 생성: `components/statistics/common/DataPreviewPanel.tsx`
- [ ] Props 인터페이스 정의: `DataPreviewPanelProps`
- [ ] 기능 구현:
  - [ ] 데이터 테이블 (첫 100행)
  - [ ] 기초 통계량 탭 (평균, 표준편차, 최소/최대)
  - [ ] 누락 데이터 표시
  - [ ] 접기/펼치기 토글
- [ ] 스마트플로 유틸 재사용:
  - [ ] `import { extractNumericData } from '@/components/smart-flow/steps/validation/utils/statisticalTests'`
  - [ ] `import { calculateBasicStats } from '@/components/smart-flow/steps/validation/utils/statisticalTests'`
- [ ] 단위 테스트: `components/statistics/common/__tests__/DataPreviewPanel.test.tsx`

**UI 구조**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>업로드된 데이터</CardTitle>
    <Badge>{data.length}개 행</Badge>
    <Button onClick={toggle}>
      {isExpanded ? <ChevronUp /> : <ChevronDown />}
    </Button>
  </CardHeader>
  {isExpanded && (
    <CardContent>
      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">데이터 미리보기</TabsTrigger>
          <TabsTrigger value="stats">기초 통계</TabsTrigger>
        </TabsList>
        <TabsContent value="table">
          <StatisticsTable data={data.slice(0, 100)} />
        </TabsContent>
        <TabsContent value="stats">
          <NumericStatsTable stats={stats} />
        </TabsContent>
      </Tabs>
    </CardContent>
  )}
</Card>
```

---

#### ✅ B-2. StatisticsPageLayout 통합
- [ ] 파일 수정: `components/statistics/StatisticsPageLayout.tsx`
- [ ] `DataPreviewPanel` import
- [ ] Props에 `uploadedData` 추가
- [ ] Layout 순서 조정:
  ```
  1. MethodSelectionCard
  2. VariableSelector
  3. DataPreviewPanel  ← 신규 추가
  4. AnalysisButton
  5. ResultsPanel
  ```

**변경 전후 비교**:
```diff
export function StatisticsPageLayout({
  title,
  uploadedData,
+ showDataPreview = true,
  ...
}: StatisticsPageLayoutProps) {
  return (
    <div>
      <MethodSelectionCard ... />
      <VariableSelector ... />
+     {showDataPreview && uploadedData && (
+       <DataPreviewPanel data={uploadedData} />
+     )}
      <AnalysisButton ... />
      <ResultsPanel ... />
    </div>
  )
}
```

---

#### ✅ B-3. 개별 통계 페이지 적용
- [ ] `StatisticsPageLayout` 사용하는 페이지 확인 (자동 적용)
- [ ] 사용하지 않는 페이지 수동 추가
- [ ] 테스트 페이지 선정:
  - [ ] ANOVA
  - [ ] Regression
  - [ ] T-test
  - [ ] Correlation
  - [ ] Descriptive

**검증 방법**:
- [ ] CSV 업로드 → DataPreviewPanel 자동 표시
- [ ] 데이터 테이블 확인 (첫 100행)
- [ ] 기초 통계 탭 확인 (평균, 표준편차)
- [ ] 토글 버튼 작동 확인

---

### Phase C: 데이터 검증 도구 추가 (선택)

#### ✅ C-1. DataValidationPanel 컴포넌트 생성
- [ ] 파일 생성: `components/statistics/common/DataValidationPanel.tsx`
- [ ] 스마트플로 재사용:
  - [ ] `import { useNormalityTest } from '@/components/smart-flow/steps/validation/hooks'`
  - [ ] `import { AssumptionResultsPanel } from '@/components/smart-flow/steps/validation/components'`
- [ ] 기능 구현:
  - [ ] 정규성 검정 (Shapiro-Wilk)
  - [ ] Q-Q Plot
  - [ ] Box Plot (이상치 탐지)
  - [ ] 결측치 분석
- [ ] Props 인터페이스: `DataValidationPanelProps`

**UI 구조**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>데이터 검증</CardTitle>
    <Button onClick={runValidation}>검증 실행</Button>
  </CardHeader>
  <CardContent>
    {isLoading && <Loader />}
    {results && (
      <AssumptionResultsPanel
        assumptions={results.assumptions}
        recommendations={results.recommendations}
      />
    )}
  </CardContent>
</Card>
```

---

#### ✅ C-2. 통계별 맞춤 검증 (10개 페이지)
- [ ] ANOVA: 정규성 + 등분산성
- [ ] T-test: 정규성 + 등분산성
- [ ] Regression: 정규성 + 선형성
- [ ] Correlation: 선형성 + 정규성
- [ ] Chi-square: 기대빈도 ≥ 5

**검증 로직**:
```typescript
const validateAssumptions = async (data, variables) => {
  const results = {
    normality: await checkNormality(data, variables),
    homogeneity: await checkHomogeneity(data, variables),
    recommendations: []
  }

  if (!results.normality.passed) {
    results.recommendations.push({
      issue: '정규성 가정 위배',
      alternative: 'Kruskal-Wallis 검정 사용 권장'
    })
  }

  return results
}
```

---

## 🔍 검증 체크리스트

### TypeScript 검증
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] 모든 신규 파일에 타입 정의 완료
- [ ] `any` 타입 사용 없음

### 기능 검증
- [ ] 데이터 추출: CSV 문자열 → 숫자 변환 정상
- [ ] 데이터 뷰어: 100행 미리보기 정상
- [ ] 기초 통계: 평균, 표준편차 계산 정확
- [ ] 접기/펼치기: 토글 정상 작동

### 통합 테스트
- [ ] 6개 수정 페이지 브라우저 테스트
- [ ] 5개 테스트 페이지 DataPreviewPanel 확인
- [ ] 콘솔 에러 없음
- [ ] 성능 문제 없음 (대용량 CSV 100MB 테스트)

### 빌드 검증
- [ ] `npm run build` 성공
- [ ] 빌드 사이즈 증가 < 100KB
- [ ] 런타임 에러 없음

---

## 📊 진행 상황 추적

| Phase | 작업 | 상태 | 완료일 |
|-------|------|------|--------|
| A-1 | 공통 유틸리티 생성 | ⏳ 대기 | - |
| A-2 | 6개 페이지 버그 수정 | ⏳ 대기 | - |
| A-3 | Phase A 검증 | ⏳ 대기 | - |
| B-1 | DataPreviewPanel 생성 | ⏳ 대기 | - |
| B-2 | Layout 통합 | ⏳ 대기 | - |
| B-3 | 개별 페이지 적용 | ⏳ 대기 | - |
| C-1 | DataValidationPanel 생성 | ⏳ 대기 | - |
| C-2 | 통계별 맞춤 검증 | ⏳ 대기 | - |
| Final | 전체 검증 | ⏳ 대기 | - |

**범례**:
- ⏳ 대기
- 🔄 진행 중
- ✅ 완료
- ❌ 실패

---

## 🚀 예상 소요 시간

| Phase | 소요 시간 | 누적 시간 |
|-------|----------|----------|
| A-1 | 30분 | 0.5h |
| A-2 | 1.5시간 | 2h |
| A-3 | 30분 | 2.5h |
| B-1 | 2시간 | 4.5h |
| B-2 | 1시간 | 5.5h |
| B-3 | 1시간 | 6.5h |
| C-1 | 3시간 | 9.5h |
| C-2 | 3시간 | 12.5h |
| **합계** | **12.5시간** | - |

---

## 📝 Git Commit 전략

### Phase A 완료 후
```bash
git add -A
git commit -m "fix: 데이터 추출 버그 수정 (6개 페이지)

변경 내역:
- lib/utils/data-extraction.ts 추가 (공통 유틸리티)
- regression, mann-whitney, chi-square-independence 등 6개 페이지 수정
- parseFloat 변환 로직 통합

검증 결과:
- TypeScript: 0 errors ✓
- 6개 페이지 브라우저 테스트 완료 ✓

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Phase B 완료 후
```bash
git commit -m "feat: 데이터 뷰어 추가 (42개 통계 페이지)

변경 내역:
- DataPreviewPanel 컴포넌트 추가
- StatisticsPageLayout 통합
- 스마트플로 유틸리티 재사용 (extractNumericData, calculateBasicStats)

기능:
- 데이터 테이블 (첫 100행)
- 기초 통계량 (평균, 표준편차)
- 접기/펼치기 토글

검증 결과:
- 5개 페이지 브라우저 테스트 완료 ✓
- 100MB CSV 성능 테스트 통과 ✓

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Phase C 완료 후
```bash
git commit -m "feat: 데이터 검증 도구 추가 (10개 주요 통계)

변경 내역:
- DataValidationPanel 컴포넌트 추가
- 통계별 맞춤 검증 로직 (ANOVA, t-test, regression 등)
- 스마트플로 검증 모듈 재사용

기능:
- 정규성 검정 (Shapiro-Wilk)
- Q-Q Plot, Box Plot
- 결측치 분석
- 대안 통계 자동 권장

검증 결과:
- 10개 페이지 검증 테스트 완료 ✓

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 🗑️ 작업 완료 후 처리

이 문서는 작업 완료 후 다음으로 이동:
```bash
mkdir -p archive/implementation
mv STATISTICS_DATA_UX_IMPROVEMENT_PLAN.md archive/implementation/2025-11-15-data-ux-improvement.md
```

또는 불필요 시 삭제:
```bash
rm STATISTICS_DATA_UX_IMPROVEMENT_PLAN.md
```

---

**시작일**: 2025-11-15
**예상 완료일**: 2025-11-16
**담당**: Claude Code + 사용자
