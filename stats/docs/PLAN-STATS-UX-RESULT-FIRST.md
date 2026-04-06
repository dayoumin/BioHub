# PLAN: 통계 결과 화면 — 결론 우선(Result-First) UX 개선

**Date**: 2026-04-06
**Status**: Planned
**Priority**: 3-B (UX 개선)
**배경**: SPSS 대비 차별화 전략 검토에서 도출된 통계 UX 개선 포인트

---

## 1. 배경

SPSS의 가장 큰 약점은 **"결과는 주지만 해석은 없다"**는 것이다.
BioHub의 결과 화면은 이미 해석 레이어가 있지만, **결과 화면의 정보 순서**가 여전히 SPSS와 같다.

현재 `ResultSummaryCard`의 렌더링 순서:
```
1. 검정명 (t-test)
2. 3-column 숫자 그리드: Statistic | p-value | Effect Size  ← 전문가 언어 먼저
3. 결론 바: "Reject null hypothesis"                         ← 결론이 나중
4. APA string
```

사용자가 가장 먼저 봐야 하는 것은 숫자가 아니라 **"차이가 있다 / 없다"**는 결론이다.

---

## 2. 개선 목표

> **비전공자가 결과 화면을 열었을 때 0.5초 안에 결론을 이해할 수 있어야 한다.**

---

## 3. 개선 항목 (우선순위 순)

### 3-1. `ResultSummaryCard` — 결론을 카드 최상단으로 [★★★ 쉬움]

**파일**: `stats/components/statistics/common/ResultSummaryCard.tsx`

**변경 전 순서**:
```
CardHeader: 검정명 + 아이콘
  ↓
3-col grid: 통계량 | p-value | 효과크기
  ↓
결론 bar
  ↓
APA string
```

**변경 후 순서**:
```
결론 Hero: 크고 굵은 한 줄 결론 (예: "두 집단은 통계적으로 유의미한 차이가 있습니다")
  ↓
p-value badge (작게, 부연 설명 역할)
  ↓
상세 수치 (접이식 accordion 또는 초보자/전문가 toggle)
  ↓
APA string (전문가 모드에서만)
```

**구현 포인트**:
- 결론 문구: `text-2xl font-bold` + significant 여부에 따라 색상
- p-value는 small badge로 결론 옆에 (부연 설명 역할)
- 통계량 그리드는 기본 접힘, "상세 보기" 클릭 시 펼침 (또는 전문가 모드)

---

### 3-2. `ResultSummaryCard` — `conclusion` 한국어 폴백 [★★★ 매우 쉬움]

**파일**: `stats/components/statistics/common/ResultSummaryCard.tsx` L90-94

**현재**:
```typescript
const displayConclusion = conclusion || (
  isSignificant
    ? 'Reject null hypothesis'       // ← 영어 폴백
    : 'Fail to reject null hypothesis'
)
```

**변경 후**:
```typescript
const displayConclusion = conclusion || (
  isSignificant
    ? '귀무가설을 기각합니다 (통계적으로 유의미한 차이가 있습니다)'
    : '귀무가설을 기각하지 못합니다 (통계적으로 유의미한 차이가 없습니다)'
)
```

단, 각 분석 페이지에서 `conclusion` prop을 이미 넘기고 있는지 확인 필요.
넘기지 않는 페이지는 이 폴백이 그대로 노출된다.

---

### 3-3. `QuickAnalysisPills` — "문제 언어"로 전환 [★★ 중간]

**파일**: `stats/components/analysis/hub/QuickAnalysisPills.tsx`

**현재 추정**: 분석 방법명 기반 pills
```
[t-test] [ANOVA] [상관분석] [회귀분석] ...
```

**변경 후**: 연구 질문 기반 pills (메서드 이름은 부제로만)
```
[두 집단 차이 비교]   (t-test / Mann-Whitney)
[세 집단 이상 비교]   (ANOVA / Kruskal-Wallis)
[변수 간 관계]        (상관분석)
[영향 요인 찾기]      (회귀분석)
```

**구현 포인트**:
- `statistical-methods.ts`에 `userFacingQuestion` 필드 추가 또는
- QuickAnalysisPills 내부에서 메서드 ID → 질문 문구 매핑 테이블 유지
- 기존 `onQuickAnalysis(methodId)` 콜백은 그대로 유지 (내부 로직 변경 없음)

---

### 3-4. 분석 페이지별 `conclusion` prop 전달 일관성 확인 [★★ 중간]

**대상**: 43개 통계 분석 페이지 (`stats/app/analysis/` 하위)

각 분석 페이지에서 `ResultSummaryCard`에 `conclusion` prop을 넘기는지 확인.
누락된 페이지는 폴백 문구(3-2에서 개선)로 처리되지만, **분석별 맞춤 결론 문구**가 있으면 더 좋다.

예시 맞춤 결론:
- t-test: `"A 그룹(M=3.45)이 B 그룹(M=2.87)보다 통계적으로 유의미하게 높습니다 (p=0.023)"`
- 상관분석: `"두 변수 사이에 강한 양의 상관관계가 있습니다 (r=0.78)"`

이 수준은 `interpretation engine`과 연동해서 동적으로 생성하는 것이 이상적.

---

### 3-5. 자동 시각화 일관성 보장 [★ 높은 난이도]

**현재 문제**: `StatisticsPageLayout`의 `resultsStep`이 각 페이지 구현에 따라 다름.
어떤 분석에는 그래프가 있고 어떤 분석에는 없다.

**목표**: 43개 분석 모두에서 최소 1개의 결과 시각화 보장.
기본 시각화 후보:
- 분포 비교: Box plot (기본)
- 집단 평균: Bar chart with error bar
- 관계: Scatter plot
- 비율: Pie / Bar

**구현 전략**:
- 분석 유형(카테고리)별 기본 시각화 컴포넌트 매핑
- `ResultSummaryCard` 하단에 "결과 시각화" 섹션 기본 포함
- 각 페이지가 커스텀 시각화를 제공하면 override, 없으면 기본 사용

---

## 4. 구현 순서 (권장)

| 순서 | 항목 | 예상 공수 |
|------|------|-----------|
| 1 | 3-2: conclusion 한국어 폴백 | 10분 |
| 2 | 3-1: ResultSummaryCard 레이아웃 재구성 | 1-2시간 |
| 3 | 3-3: QuickAnalysisPills 문제 언어 전환 | 2-3시간 |
| 4 | 3-4: 43개 페이지 conclusion prop 점검 | 1-2일 (반복 작업) |
| 5 | 3-5: 자동 시각화 일관성 | 3-5일 |

---

## 5. 기대 효과

- **1, 2번** 완료 시: 결과 화면에서 "결론이 제일 먼저, 한국어로" — 제안된 UX 핵심 구현
- **3번** 완료 시: 진입부터 결과까지 전체가 "기능 중심"이 아닌 "문제 중심" UX
- **4, 5번** 완료 시: 모든 분석에서 일관된 결론+시각화 경험 보장

---

## 6. 참고

- 코드 분석 기반: `stats/components/statistics/common/ResultSummaryCard.tsx`
- 코드 분석 기반: `stats/components/statistics/common/ResultInterpretation.tsx`
- 코드 분석 기반: `stats/components/analysis/ChatCentricHub.tsx`
- 전략 배경: 2026-04-06 SPSS 대비 UX 전략 검토
