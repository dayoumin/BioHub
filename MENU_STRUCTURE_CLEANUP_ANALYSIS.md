# 메뉴 구조 정리 분석 보고서

**작성일**: 2025-11-05
**목적**: 혼란 야기 요소 제거 및 명확한 패턴 수립

---

## 🔍 혼란 야기 요소 분석

### 1. ❌ 제거된 혼란 요소

#### 1-1. `comingSoon: true` 패턴 (이미 제거됨)
```typescript
// Before (혼란 발생)
{
  id: 'two-way-anova',
  href: '/statistics/two-way-anova',
  implemented: false,
  comingSoon: true  // ❌ 실제로는 /anova에 구현됨
}

// After (명확함)
제거됨 - ANOVA 통합 페이지 1개로 정리
```

**문제점**:
- 메뉴에는 있지만 페이지 없음 → 사용자 혼란
- 실제로는 다른 페이지에 구현됨 → AI 혼란

---

### 2. ⚠️ 현재 남아있는 잠재적 혼란 요소

#### 2-1. 통합 페이지 vs 개별 페이지 패턴 불일치

**Case 1: 비모수 검정 (혼합 패턴)**
```typescript
// 통합 페이지 1개
{ id: 'non-parametric', href: '/statistics/non-parametric', title: '비모수 검정 (통합)' }

// + 개별 페이지 8개
{ id: 'mann-whitney', href: '/statistics/mann-whitney' }
{ id: 'wilcoxon', href: '/statistics/wilcoxon' }
{ id: 'kruskal-wallis', href: '/statistics/kruskal-wallis' }
{ id: 'friedman', href: '/statistics/friedman' }
{ id: 'sign-test', href: '/statistics/sign-test' }
{ id: 'runs-test', href: '/statistics/runs-test' }
{ id: 'ks-test', href: '/statistics/ks-test' }
{ id: 'mcnemar', href: '/statistics/mcnemar' }
```

**Case 2: ANOVA (통합만)**
```typescript
// 통합 페이지 1개만
{ id: 'anova', href: '/statistics/anova', title: 'ANOVA' }
// 개별 페이지 없음 ✅
```

**Case 3: 회귀분석 (통합만)**
```typescript
// 통합 페이지 1개
{ id: 'regression', href: '/statistics/regression', title: '회귀분석' }
// subtitle: '단순, 다중, 로지스틱' (내부 선택)
```

**분석**:
- ✅ ANOVA: 통합 패턴 명확
- ✅ 회귀: 통합 패턴 명확
- ⚠️ 비모수: 혼합 패턴 (통합 + 개별)

---

#### 2-2. ID와 카테고리 ID 중복 (경고)

```typescript
// 카테고리 ID
{ id: 'descriptive' }
{ id: 'regression' }
{ id: 'chi-square' }

// 메뉴 항목 ID (동일 이름)
{ id: 'descriptive', category: 'descriptive' }  // ⚠️ 중복
{ id: 'regression', category: 'regression' }    // ⚠️ 중복
{ id: 'chi-square', category: 'chi-square' }    // ⚠️ 중복
```

**영향도**: 🟡 Medium
- 현재 기능 문제 없음
- 향후 동적 라우팅 시 혼란 가능

---

## 📋 중복 페이지 패턴 전체 검토

### 현재 상태 (2025-11-05)

| 통계 분류 | 통합 페이지 | 개별 페이지 | 패턴 |
|----------|----------|----------|------|
| **비모수 검정** | ✅ `/non-parametric` | ✅ 8개 | 혼합 |
| **ANOVA** | ✅ `/anova` | ❌ 없음 | 통합만 |
| **회귀분석** | ✅ `/regression` | ✅ 5개 추가 | 혼합 |
| **카이제곱** | ❌ 없음 | ✅ 3개 | 개별만 |
| **상관분석** | ❌ 없음 | ✅ 2개 | 개별만 |
| **기초 분석** | ❌ 없음 | ✅ 5개 | 개별만 |

### 상세 분석

#### ✅ Pattern 1: 통합만 (명확)
```
ANOVA
- /anova (일원, 이원, 삼원, 반복측정 선택)
```

#### ⚠️ Pattern 2: 통합 + 개별 (혼합)
```
비모수 검정
- /non-parametric (통합) + 8개 개별 페이지

회귀분석
- /regression (통합) + 5개 추가
  - /stepwise
  - /ordinal-regression
  - /poisson
  - /dose-response
  - /response-surface
```

#### ✅ Pattern 3: 개별만 (명확)
```
카이제곱 검정
- /chi-square-independence
- /chi-square-goodness
- /chi-square (Fisher)

상관분석
- /correlation
- /partial-correlation

기초 분석
- /explore-data
- /descriptive
- /frequency-table
- /cross-tabulation
- /reliability
```

---

## 🎯 권장 정책

### Option A: 통합 우선 (단순함 중시) ⭐ 권장

**원칙**:
- 유사한 메서드는 1개 통합 페이지에서 선택
- 개별 페이지는 제거

**변경 사항**:
```typescript
// 비모수 검정 → 통합만 유지
- 제거: mann-whitney, wilcoxon, kruskal-wallis 등 8개
- 유지: non-parametric (통합)

// 회귀분석 → 통합만 유지
- 제거: stepwise, ordinal-regression 등 5개
- 유지: regression (통합, 모든 방법 포함하도록 확장)
```

**장점**:
- ✅ 메뉴 간결함 (41개 → 약 28개)
- ✅ 유지보수 용이
- ✅ 일관성 향상

**단점**:
- ❌ 사용자가 원하는 메서드를 바로 찾기 어려움
- ❌ SEO 불리 (개별 URL 없음)

---

### Option B: 혼합 유지 (현상 유지)

**원칙**:
- 통합 페이지 제공 (초보자용)
- 개별 페이지 제공 (전문가용)
- 사용자 선택권 최대화

**변경 사항**:
```typescript
// 없음 - 현재 구조 유지
```

**장점**:
- ✅ 사용자 선택권 최대
- ✅ SEO 유리
- ✅ 전문가 사용자 만족도 높음

**단점**:
- ❌ 메뉴 복잡함 (41개)
- ❌ 중복처럼 보일 수 있음
- ❌ 유지보수 부담

---

### Option C: 계층화 (절충안)

**원칙**:
- Level 1: 통합 페이지만 메뉴에 노출
- Level 2: 개별 페이지는 통합 페이지 내부 링크로 제공

**변경 사항**:
```typescript
// 메뉴 (9개 카테고리, 약 20개 항목)
비모수 검정
- non-parametric (통합만)

// 통합 페이지 내부
"더 자세히 보기" 섹션
→ Mann-Whitney 검정
→ Wilcoxon 검정
→ ...
```

**장점**:
- ✅ 메뉴 간결함
- ✅ 개별 페이지 유지 (SEO)
- ✅ 계층적 정보 구조

**단점**:
- ❌ 2단계 클릭 필요
- ❌ UI 복잡도 증가

---

## 🔧 즉시 제거 권장 항목

### 1. ID-카테고리 중복 해소 (선택)

```typescript
// Before
{ id: 'descriptive', category: 'descriptive' }

// After (Option 1: 메뉴 항목 ID 변경)
{ id: 'descriptive-stats', category: 'descriptive' }

// After (Option 2: 현상 유지 + 문서화)
// 주석 추가: ID 중복은 의도된 설계
```

**권장**: Option 2 (현상 유지)
- 이미 안정적으로 동작
- 변경 시 리스크 > 이득

---

### 2. 비모수 검정 통합 페이지 제목 명확화

```typescript
// Before
{ id: 'non-parametric', title: '비모수 검정 (통합)' }

// After
{ id: 'non-parametric', title: '비모수 검정' }
// (통합) 제거 - 개별 페이지도 있으므로 혼란
```

---

## 📊 최종 권장안

### ✅ 즉시 적용 (혼란 제거)

1. **"(통합)" 제거**
```typescript
// Before
'비모수 검정 (통합)'
'ANOVA (통합)'  // 이미 제거됨

// After
'비모수 검정'
'ANOVA'
```

2. **문서화 개선**
- menu-config.ts 상단에 패턴 설명 주석 추가
- 통합 vs 개별 페이지 정책 명시

---

### 🔄 향후 검토 (장기)

1. **Option B (혼합 유지) 권장**
   - 현재 구조 유지
   - 이유: 사용자 선택권 최대화

2. **새 통계 메서드 추가 시 정책**
   - 유사 메서드 3개 이상 → 통합 페이지 생성
   - 독립 메서드 → 개별 페이지만

---

## 📝 Action Items

### 즉시 (5분)
- [ ] "(통합)" 문구 제거
- [ ] menu-config.ts 상단 주석 추가

### 단기 (1-2일)
- [ ] 사용자 피드백 수집
- [ ] 패턴 정책 문서화

### 장기 (선택)
- [ ] Option C (계층화) 검토
- [ ] ID 중복 해소 검토

---

## 🎯 핵심 결론

### 혼란 야기 요소
1. ✅ `comingSoon` 패턴 → 이미 제거됨
2. ⚠️ "(통합)" 문구 → 즉시 제거 권장
3. ⚠️ ID 중복 → 현상 유지 (문서화)

### 중복 페이지 정책
- ✅ **혼합 패턴 유지** (Option B)
- 이유: 사용자 선택권, SEO, 전문가 만족도

### 개선 효과
- 명확한 메뉴 구조
- 일관된 네이밍
- 혼란 요소 제거

---

**Updated**: 2025-11-05 | **Status**: 분석 완료 | **Next**: 즉시 조치 실행
