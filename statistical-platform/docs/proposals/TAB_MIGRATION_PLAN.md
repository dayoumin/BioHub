# Tab Migration Plan: Statistics Pages

## Overview
통계 분석 페이지 49개에서 기존 shadcn Tabs를 새로운 ContentTabs/FilterToggle 컴포넌트로 마이그레이션

## Completed (Smart Flow)
- [x] `content-tabs.tsx` - ContentTabs 공통 컴포넌트
- [x] `filter-toggle.tsx` - FilterToggle 공통 컴포넌트
- [x] `DataExplorationStep.tsx` - 3곳 변경 완료
- [x] `PurposeInputStep.tsx` - 1곳 변경 완료
- [x] `ColumnDetailModal.tsx` - 1곳 변경 완료

## Statistics Pages Migration

### Phase 1: High Priority (결과 탭이 많은 페이지) - 15개
복잡한 분석 결과를 여러 탭으로 보여주는 페이지들

| # | Page | Tabs | Pattern |
|---|------|------|---------|
| 1 | ancova | 5 | 수정된 평균/ANCOVA 결과/사후검정/가정검정/해석 |
| 2 | chi-square-independence | 4 | 교차표/잔차분석/해석/가정검정 |
| 3 | chi-square-goodness | 4 | 빈도표/잔차분석/해석/시각화 |
| 4 | cluster | 4 | 군집 통계/성능 지표/해석/시각화 |
| 5 | dose-response | 4 | 매개변수/통계량/해석/진단 |
| 6 | factor-analysis | 4 | 요인 로딩/고유값/공통성/해석 |
| 7 | friedman | 4 | 통계량/기술통계/해석/사후검정 |
| 8 | kruskal-wallis | 4 | 통계량/기술통계/해석/사후검정 |
| 9 | regression | 4+ | 요약/계수/진단/해석 |
| 10 | manova | 4+ | 다변량/단변량/사후검정/해석 |
| 11 | mixed-model | 4+ | 고정효과/랜덤효과/적합도/해석 |
| 12 | stepwise | 4 | 모델선택/계수/진단/해석 |
| 13 | response-surface | 4 | 표면/최적화/통계/해석 |
| 14 | ordinal-regression | 4 | 계수/적합도/예측/해석 |
| 15 | poisson | 4 | 계수/적합도/진단/해석 |

### Phase 2: Medium Priority (3개 탭) - 18개
| # | Page | Tabs |
|---|------|------|
| 1 | arima | Summary/Forecast/Diagnostics |
| 2 | cox-regression | Summary/Coefficients/Interpretation |
| 3 | explore-data | 전체 개요/변수별 상세/데이터 품질 |
| 4 | kaplan-meier | Summary/Survival Table/Interpretation |
| 5 | mann-kendall | 통계량/해석/가정 |
| 6 | mann-whitney | 통계량/기술통계/해석 |
| 7 | normality-test | 검정결과/시각화/해석 |
| 8 | one-sample-t | 통계량/기술통계/해석 |
| 9 | welch-t | 통계량/기술통계/해석 |
| 10 | wilcoxon | 통계량/기술통계/해석 |
| 11 | correlation | 행렬/산점도/해석 |
| 12 | partial-correlation | 통계량/시각화/해석 |
| 13 | proportion-test | 통계량/신뢰구간/해석 |
| 14 | power-analysis | 파워분석/표본크기/해석 |
| 15 | reliability | 신뢰도/항목분석/해석 |
| 16 | means-plot | 평균/오차막대/해석 |
| 17 | seasonal-decompose | 분해/추세/해석 |
| 18 | stationarity-test | 검정결과/시각화/해석 |

### Phase 3: Low Priority (2개 탭) - 8개
| # | Page | Tabs |
|---|------|------|
| 1 | descriptive | 요약/통계표 |
| 2 | anova | 결과/해석 |
| 3 | t-test | 결과/해석 |
| 4 | chi-square | 결과/해석 |
| 5 | binomial-test | 결과/해석 |
| 6 | pca | 결과/시각화 |
| 7 | discriminant | 결과/해석 |
| 8 | runs-test | 결과/해석 |

### Phase 4: No Tabs / Skip - 8개
탭이 없거나 단순 구조인 페이지

- non-parametric (목록 페이지)
- page.tsx (인덱스)
- cochran-q, mcnemar, mood-median, sign-test, ks-test (단순 구조)

## Migration Strategy

### Approach A: Batch Script (권장)
Node.js 스크립트로 일괄 변환
- 장점: 빠름, 일관성
- 단점: 예외 케이스 수동 처리 필요

```bash
node scripts/migrate-tabs.mjs
```

### Approach B: Manual + AI
페이지별 수동 변환
- 장점: 정확한 컨텍스트 파악
- 단점: 시간 소요 (페이지당 5-10분)

### Approach C: Hybrid (추천)
1. Phase 1 (복잡한 15개): 수동 변환
2. Phase 2-3 (단순한 26개): 스크립트 변환
3. Phase 4: Skip

## Implementation Pattern

### Before (기존 Tabs)
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

<Tabs defaultValue="summary">
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="summary">요약</TabsTrigger>
    <TabsTrigger value="table">통계표</TabsTrigger>
    <TabsTrigger value="interpretation">해석</TabsTrigger>
  </TabsList>
  <TabsContent value="summary">...</TabsContent>
  <TabsContent value="table">...</TabsContent>
  <TabsContent value="interpretation">...</TabsContent>
</Tabs>
```

### After (ContentTabs)
```tsx
import { ContentTabs, ContentTabsContent } from '@/components/ui/content-tabs'
import { useState } from 'react'

const [activeTab, setActiveTab] = useState('summary')

<ContentTabs
  tabs={[
    { id: 'summary', label: '요약', icon: FileText },
    { id: 'table', label: '통계표', icon: Table },
    { id: 'interpretation', label: '해석', icon: MessageSquare }
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
  className="mb-4"
/>
<ContentTabsContent tabId="summary" show={activeTab === 'summary'}>
  ...
</ContentTabsContent>
<ContentTabsContent tabId="table" show={activeTab === 'table'}>
  ...
</ContentTabsContent>
<ContentTabsContent tabId="interpretation" show={activeTab === 'interpretation'}>
  ...
</ContentTabsContent>
```

## Checklist Per Page
- [ ] Import 변경 (Tabs → ContentTabs)
- [ ] useState 추가
- [ ] Tabs → ContentTabs 변환
- [ ] TabsList/TabsTrigger 제거
- [ ] TabsContent → ContentTabsContent 변환
- [ ] TypeScript 체크
- [ ] 실행 테스트

## Timeline Estimate
- Phase 1 (15개): 2-3시간 (수동)
- Phase 2-3 (26개): 1시간 (스크립트)
- Phase 4: Skip
- 테스트: 1시간
- **Total: 4-5시간**

## Notes
- 기존 Tabs import를 제거하지 않으면 빌드 에러 발생
- defaultValue → useState 패턴으로 변경 필요
- 아이콘은 선택적 (기존 없으면 추가 안 해도 됨)

---
Created: 2025-11-28
Status: Planning
