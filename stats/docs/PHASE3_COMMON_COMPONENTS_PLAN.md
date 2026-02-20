# Phase 3: 공통 컴포넌트 확대 적용 계획서

**작성일**: 2025-11-11
**상태**: 계획 단계 (선택 사항)
**목적**: 통계 페이지 전반의 UI/UX 일관성 향상 및 코드 중복 제거

---

## 📋 적용 범위

### ✅ 스마트 분석 (Smart Flow)
- `app/(dashboard)/statistics/smart-flow/` 하위 모든 페이지
- 예: chi-square-independence, binomial-test, runs-test 등

### ✅ 개별 통계 분석
- `app/(dashboard)/statistics/` 하위 개별 통계 페이지
- 예: anova, t-test, mann-whitney, correlation, regression 등

**총 대상**: 약 40개 통계 페이지 (스마트 분석 + 개별 분석)

---

## 🎯 작업 개요

Phase 3는 **선택 사항**이며, 기능 동작에는 영향을 주지 않습니다.
목적은 **UI/UX 일관성**과 **유지보수성 향상**입니다.

---

## 📦 공통 컴포넌트 목록

### 1. StatisticsTable 컴포넌트

**위치**: `components/statistics/common/StatisticsTable.tsx`

**현재 상태**:
- ✅ 사용 중: descriptive/page.tsx
- ❌ 미사용: anova, t-test, mann-whitney, correlation 등 (직접 `<table>` 사용)

**적용 대상 페이지**:
1. anova/page.tsx (ANOVA Table)
2. t-test/page.tsx (기술통계 표)
3. mann-whitney/page.tsx (기술통계 표)
4. correlation/page.tsx (상관계수 행렬)
5. regression/page.tsx (회귀계수 표)
6. chi-square-independence/page.tsx (교차표)
7. friedman/page.tsx (순위합 표)
8. kruskal-wallis/page.tsx (순위 통계)
9. manova/page.tsx (다변량 검정 표)
10. ancova/page.tsx (공분산분석 표)

**예시 코드**:

```typescript
// ❌ Before: 직접 구현 (anova/page.tsx)
<table className="w-full text-sm">
  <thead>
    <tr className="border-b">
      <th className="text-left py-2">Source</th>
      <th className="text-right py-2">SS</th>
      <th className="text-right py-2">df</th>
      <th className="text-right py-2">MS</th>
      <th className="text-right py-2">F</th>
      <th className="text-right py-2">p-value</th>
    </tr>
  </thead>
  <tbody>
    {anovaTable.map((row, idx) => (
      <tr key={idx} className="border-b">
        <td className="py-2">{row.source}</td>
        <td className="text-right">{row.ss.toFixed(2)}</td>
        <td className="text-right">{row.df}</td>
        <td className="text-right">{row.ms ? row.ms.toFixed(2) : '-'}</td>
        <td className="text-right">{row.f ? row.f.toFixed(3) : '-'}</td>
        <td className="text-right">
          {row.p !== null ? (
            <Badge variant={row.p < 0.05 ? "default" : "secondary"}>
              {row.p < 0.001 ? '< 0.001' : row.p.toFixed(4)}
            </Badge>
          ) : '-'}
        </td>
      </tr>
    ))}
  </tbody>
</table>

// ✅ After: 공통 컴포넌트
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'

<StatisticsTable
  columns={[
    { key: 'source', label: 'Source', align: 'left' },
    { key: 'ss', label: 'SS', align: 'right', format: (v) => v.toFixed(2) },
    { key: 'df', label: 'df', align: 'right' },
    { key: 'ms', label: 'MS', align: 'right', format: (v) => v ? v.toFixed(2) : '-' },
    { key: 'f', label: 'F', align: 'right', format: (v) => v ? v.toFixed(3) : '-' },
    {
      key: 'p',
      label: 'p-value',
      align: 'right',
      render: (value) => (
        value !== null ? (
          <Badge variant={value < 0.05 ? "default" : "secondary"}>
            {value < 0.001 ? '< 0.001' : value.toFixed(4)}
          </Badge>
        ) : '-'
      )
    }
  ]}
  data={anovaTable}
  caption="ANOVA Table"
/>
```

**장점**:
- ✅ 스타일 일관성 (모든 페이지 동일한 테이블 디자인)
- ✅ 반응형 자동 처리 (모바일 최적화)
- ✅ 접근성 향상 (ARIA 속성 자동 추가)
- ✅ 유지보수 간편 (한 곳에서 수정 → 전체 반영)
- ✅ 정렬/필터 기능 추가 용이

**단점**:
- 🟡 컴포넌트 Props API 학습 필요
- 🟡 기존 코드 대량 수정 필요 (10개 페이지)
- 🟡 특수한 셀 렌더링 시 render prop 필요

**예상 작업 시간**: 각 페이지당 10분 × 10개 = **100분**

---

### 2. EffectSizeCard 컴포넌트

**위치**: `components/statistics/common/EffectSizeCard.tsx`

**현재 상태**:
- ✅ 사용 중: binomial-test (Wilson Score CI 표시)
- ❌ 미사용: t-test, anova, mann-whitney 등 (수동 표시)

**적용 대상 페이지**:
1. t-test/page.tsx (Cohen's d)
2. anova/page.tsx (η², ω², Cohen's f)
3. mann-whitney/page.tsx (rank-biserial correlation)
4. wilcoxon/page.tsx (r)
5. correlation/page.tsx (r², R²)
6. regression/page.tsx (R², Adjusted R²)
7. chi-square-independence/page.tsx (Cramér's V, φ)
8. manova/page.tsx (Wilks' Λ, η²)

**예시 코드**:

```typescript
// ❌ Before: 직접 구현 (anova/page.tsx)
<Card>
  <CardHeader>
    <CardTitle className="text-base">효과크기</CardTitle>
  </CardHeader>
  <CardContent className="space-y-2">
    <div className="flex justify-between">
      <span className="text-sm">Eta-squared (η²)</span>
      <Badge>{results.etaSquared.toFixed(3)}</Badge>
    </div>
    <div className="flex justify-between">
      <span className="text-sm">Omega-squared (ω²)</span>
      <Badge>{results.omegaSquared.toFixed(3)}</Badge>
    </div>
    <div className="flex justify-between">
      <span className="text-sm">Cohen's f</span>
      <Badge>{powerAnalysis.cohensF.toFixed(3)}</Badge>
    </div>
    <Separator className="my-2" />
    <p className="text-xs text-muted-foreground">
      효과크기: <strong>{powerAnalysis.effectSize}</strong>
    </p>
  </CardContent>
</Card>

// ✅ After: 공통 컴포넌트
import { EffectSizeCard } from '@/components/statistics/common/EffectSizeCard'

<EffectSizeCard
  testType="anova"
  metrics={[
    { name: 'Eta-squared (η²)', value: results.etaSquared, symbol: 'η²' },
    { name: 'Omega-squared (ω²)', value: results.omegaSquared, symbol: 'ω²' },
    { name: "Cohen's f", value: powerAnalysis.cohensF, symbol: 'f' }
  ]}
  interpretation={{
    size: powerAnalysis.effectSize, // 'small' | 'medium' | 'large'
    description: '효과크기가 크며, 결과의 실용적 가치가 높습니다.'
  }}
/>
```

**EffectSizeCard Props 인터페이스**:

```typescript
interface EffectSizeMetric {
  name: string          // 표시명 (예: "Cohen's d")
  value: number         // 값
  symbol?: string       // 기호 (예: "d", "η²")
  ci?: [number, number] // 신뢰구간 (선택)
}

interface EffectSizeInterpretation {
  size: 'negligible' | 'small' | 'medium' | 'large'
  description?: string
  guideline?: string    // 예: "Cohen (1988) 기준"
}

interface EffectSizeCardProps {
  testType: 'ttest' | 'anova' | 'correlation' | 'chi-square' | 'mann-whitney'
  metrics: EffectSizeMetric[]
  interpretation?: EffectSizeInterpretation
  showGauge?: boolean   // 효과크기 게이지 표시 여부
}
```

**해석 기준 (자동 적용)**:

| 검정 | 지표 | Small | Medium | Large | 기준 |
|------|------|-------|--------|-------|------|
| t-test | Cohen's d | 0.2 | 0.5 | 0.8 | Cohen (1988) |
| ANOVA | η² | 0.01 | 0.06 | 0.14 | Cohen (1988) |
| ANOVA | ω² | 0.01 | 0.06 | 0.14 | - |
| Correlation | r | 0.1 | 0.3 | 0.5 | Cohen (1988) |
| Chi-square | Cramér's V | 0.1 | 0.3 | 0.5 | Cohen (1988) |
| Mann-Whitney | r | 0.1 | 0.3 | 0.5 | - |

**장점**:
- ✅ 효과크기 해석 자동화 (Cohen 기준 자동 적용)
- ✅ 시각화 추가 가능 (효과크기 게이지, 색상 코딩)
- ✅ 다국어 지원 용이 (해석 문구 중앙 관리)
- ✅ 신뢰구간 표시 자동화

**단점**:
- 🟡 통계 방법별 지표가 다름 (유연한 Props 설계 필요)
- 🟡 해석 기준이 통일되지 않은 경우 대응 어려움
- 🟡 새로운 효과크기 지표 추가 시 컴포넌트 수정 필요

**예상 작업 시간**: 각 페이지당 15분 × 8개 = **120분**

---

### 3. StatisticalResultCard 컴포넌트

**위치**: `components/statistics/common/StatisticalResultCard.tsx`

**현재 상태**:
- ✅ 사용 중: mann-whitney (p-value, 검정통계량 표시)
- ❌ 미사용: anova, t-test, correlation 등 (Alert 또는 Card 직접 사용)

**적용 대상 페이지**:
1. anova/page.tsx (F 검정 결과)
2. t-test/page.tsx (t 검정 결과)
3. correlation/page.tsx (r 검정 결과)
4. chi-square-independence/page.tsx (χ² 검정 결과)
5. kruskal-wallis/page.tsx (H 검정 결과)
6. friedman/page.tsx (χ²ᶠ 검정 결과)
7. regression/page.tsx (F 검정 결과)
8. wilcoxon/page.tsx (W 검정 결과)

**예시 코드**:

```typescript
// ❌ Before: 직접 구현 (anova/page.tsx)
<Alert className={results.pValue < 0.05 ? "border-green-500 bg-muted" : "border-yellow-500 bg-muted"}>
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>분석 결과</AlertTitle>
  <AlertDescription>
    <div className="mt-2 space-y-2">
      <p className="font-medium">
        F({results.dfBetween}, {results.dfWithin}) = {results.fStatistic.toFixed(3)},
        p = {results.pValue.toFixed(4)}
      </p>
      <p>
        {results.pValue < 0.05
          ? "✅ 그룹 간 평균에 통계적으로 유의한 차이가 있습니다 (p < 0.05)"
          : "❌ 그룹 간 평균에 통계적으로 유의한 차이가 없습니다 (p ≥ 0.05)"}
      </p>
    </div>
  </AlertDescription>
</Alert>

// ✅ After: 공통 컴포넌트
import { StatisticalResultCard } from '@/components/statistics/common/StatisticalResultCard'

<StatisticalResultCard
  testName="One-Way ANOVA"
  statistic={{
    name: 'F',
    value: results.fStatistic,
    df: [results.dfBetween, results.dfWithin]
  }}
  pValue={results.pValue}
  alpha={0.05}
  interpretation={{
    significant: results.pValue < 0.05,
    conclusion: results.pValue < 0.05
      ? "그룹 간 평균에 통계적으로 유의한 차이가 있습니다"
      : "그룹 간 평균에 통계적으로 유의한 차이가 없습니다",
    hypothesis: {
      null: "모든 그룹의 평균이 같다",
      alternative: "적어도 하나의 그룹 평균이 다르다"
    }
  }}
  confidenceInterval={results.ci}
/>
```

**StatisticalResultCard Props 인터페이스**:

```typescript
interface TestStatistic {
  name: string              // 검정통계량 이름 (F, t, U, χ², r 등)
  value: number             // 값
  df?: number | number[]    // 자유도 (단일 또는 배열)
}

interface Interpretation {
  significant: boolean      // 유의한가?
  conclusion: string        // 결론 (한 문장)
  hypothesis?: {
    null: string           // 귀무가설
    alternative: string    // 대립가설
  }
  recommendation?: string   // 추가 권장사항
}

interface StatisticalResultCardProps {
  testName: string
  statistic: TestStatistic
  pValue: number
  alpha?: number            // 유의수준 (기본값: 0.05)
  interpretation: Interpretation
  confidenceInterval?: {
    lower: number
    upper: number
    level?: number          // 신뢰수준 (기본값: 95)
  }
  effectSize?: {
    value: number
    interpretation: string
  }
  showDetails?: boolean     // 상세 정보 펼치기/접기
}
```

**장점**:
- ✅ 결과 해석 자동화 (유의성 판단, 아이콘 표시)
- ✅ PValueBadge 내장 (색상 자동 적용: p < 0.001 빨강, p < 0.05 초록, 그 외 회색)
- ✅ 신뢰구간, 효과크기 통합 표시 가능
- ✅ 가설 표시로 통계 교육적 가치 향상

**단점**:
- 🟡 검정통계량 형식 다양 (F(2, 27), t(29), U = 120, χ²(4) 등)
- 🟡 커스터마이징 제한 가능성 (복잡한 결과는 직접 구현 필요)

**예상 작업 시간**: 각 페이지당 10분 × 8개 = **80분**

---

## 📊 작업 우선순위

| 컴포넌트 | 대상 페이지 | 예상 시간 | 우선순위 | 난이도 | 즉시 효과 |
|---------|------------|---------|---------|-------|---------|
| StatisticsTable | 10개 | 100분 | 🔴 High | ★★☆ | UI 일관성 대폭 향상 |
| StatisticalResultCard | 8개 | 80분 | 🟡 Medium | ★★☆ | 결과 해석 자동화 |
| EffectSizeCard | 8개 | 120분 | 🟢 Low | ★★★ | 전문성 향상 |
| **합계** | **26개** | **300분 (5시간)** | - | - | - |

---

## 🎯 권장 작업 순서

### Step 1: StatisticsTable 적용 (우선순위 최상)
**대상**: anova, t-test, mann-whitney, correlation, regression (5개 페이지)
**이유**: 가장 많이 사용되는 컴포넌트, 즉시 효과 큼
**예상 시간**: 50분

### Step 2: StatisticalResultCard 적용
**대상**: anova, t-test, chi-square-independence, kruskal-wallis (4개 페이지)
**이유**: 결과 해석 자동화로 사용자 경험 향상
**예상 시간**: 40분

### Step 3: EffectSizeCard 적용
**대상**: t-test, anova, mann-whitney, correlation (4개 페이지)
**이유**: 전문적인 해석 제공
**예상 시간**: 60분

### Step 4: 나머지 페이지 적용
**대상**: 나머지 13개 페이지
**예상 시간**: 150분

---

## 📋 작업 계획 옵션

### 옵션 A: 단계적 적용 (권장) ⭐
**일정**: 3주
- **1주차**: StatisticsTable 5개 페이지 시범 적용 → 피드백 수집
- **2주차**: 나머지 5개 페이지 + StatisticalResultCard 4개
- **3주차**: EffectSizeCard + 나머지 페이지

**장점**:
- ✅ 리스크 분산
- ✅ 피드백 반영 가능
- ✅ 점진적 개선

**단점**:
- 🟡 완료까지 시간 소요 (3주)

---

### 옵션 B: 한 번에 완료
**일정**: 2일 (8시간 작업 × 2)

**장점**:
- ✅ 일관성 즉시 확보
- ✅ 짧은 기간 내 완료

**단점**:
- 🔴 회귀 테스트 부담 큼 (26개 페이지 동시 수정)
- 🔴 버그 발생 시 영향 범위 큼

---

### 옵션 C: 신규 페이지만 적용 (최소 리스크)
**대상**: 향후 새로 추가되는 통계 페이지만 적용

**장점**:
- ✅ 리스크 최소화
- ✅ 기존 페이지 안정성 유지

**단점**:
- 🟡 일관성 확보 지연
- 🟡 기술 부채 누적

---

## ✅ 최종 권장사항

### 즉시 진행 필요 없음
- Phase 1, 2 완료로 **Critical 버그 수정 + 표준 준수도 98%** 달성
- Phase 3는 **UI/UX 개선**이 목적이므로 기능 동작에 영향 없음

### 향후 진행 시 권장
- **옵션 A (단계적 적용)** 선택
- 1주차 시범 적용 후 효과 검증
- 긍정적 피드백 시 나머지 페이지 확대 적용

---

## 📝 후속 작업

Phase 3 완료 후 검토할 항목:
1. **성능 측정**: 공통 컴포넌트 도입 전후 렌더링 성능 비교
2. **사용자 피드백**: 연구자들의 UI 만족도 조사
3. **접근성 감사**: WCAG 2.1 AA 기준 준수 여부 점검
4. **다국어 지원**: 영어, 일본어 버전 추가 시 용이성 검증

---

**작성자**: Claude Code
**검토 필요**: 프로젝트 리드, UI/UX 디자이너
**참고 문서**: [STATISTICS_CODING_STANDARDS.md](STATISTICS_CODING_STANDARDS.md)
