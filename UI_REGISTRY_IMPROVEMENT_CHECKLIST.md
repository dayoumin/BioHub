# UI-Registry 개선 체크리스트

**작성일**: 2025-11-05
**목적**: 단계별 수정 진행 상황 추적

---

## ✅ Phase 0: 현황 파악 (완료)

- [x] UI 페이지 목록 수집 (43개)
- [x] Registry 메서드 목록 수집 (60개)
- [x] 매핑 테이블 작성
- [x] 문제점 식별

**결과**: [UI_REGISTRY_MAPPING_ANALYSIS.md](./UI_REGISTRY_MAPPING_ANALYSIS.md)

---

## 🔴 Phase 1: 긴급 수정 (현재 진행)

### 1-1. 메뉴와 페이지 정합성 검증

#### ✅ 확인 완료
- [x] `welch-t` - 페이지 존재 확인 ✅

#### ❌ 누락된 페이지 (메뉴에는 있음)
- [ ] `two-way-anova` - **페이지 생성 필요**
  - 메뉴: `/statistics/two-way-anova`
  - Registry: `twoWayAnova`
  - 카테고리: glm (일반선형모델)

- [ ] `three-way-anova` - **페이지 생성 필요**
  - 메뉴: `/statistics/three-way-anova`
  - Registry: 메서드 없음 (추가 필요?)
  - 카테고리: glm (일반선형모델)

- [ ] `repeated-measures` - **페이지 생성 필요**
  - 메뉴: `/statistics/repeated-measures`
  - Registry: `repeatedMeasures`
  - 카테고리: glm (일반선형모델)

### 1-2. menu-config.ts 정합성 검증

- [ ] `menu-config.ts`의 href와 실제 페이지 경로 일치 확인
- [ ] `implemented: true` 항목이 실제 페이지 존재 여부와 일치하는지 확인

---

## 🟡 Phase 2: 누락된 핵심 페이지 추가

### 2-1. High Priority (즉시 필요)

- [ ] **z-test 페이지**
  - 경로: `/statistics/z-test`
  - Registry: `zTest`
  - 카테고리: compare (평균 비교)
  - 참고: t-test와 유사, 대표본 + 모분산 알 때 사용

- [ ] **binomial-test 페이지**
  - 경로: `/statistics/binomial-test`
  - Registry: `binomialTest`
  - 카테고리: nonparametric 또는 diagnostic
  - 참고: 이항분포 검정

### 2-2. Medium Priority (점진적)

- [ ] **curve-estimation 페이지**
  - 경로: `/statistics/curve-estimation`
  - Registry: `curveEstimation`
  - 카테고리: regression

- [ ] **nonlinear-regression 페이지**
  - 경로: `/statistics/nonlinear-regression`
  - Registry: `nonlinearRegression`
  - 카테고리: regression

- [ ] **probit-regression 페이지**
  - 경로: `/statistics/probit-regression`
  - Registry: `probitRegression`
  - 카테고리: regression

- [ ] **negative-binomial 페이지**
  - 경로: `/statistics/negative-binomial`
  - Registry: `negativeBinomial`
  - 카테고리: regression

- [ ] **cochran-q 페이지**
  - 경로: `/statistics/cochran-q`
  - Registry: `cochranQ`
  - 카테고리: nonparametric

- [ ] **mood-median 페이지**
  - 경로: `/statistics/mood-median`
  - Registry: `moodMedian`
  - 카테고리: nonparametric

---

## 🟢 Phase 3: 고급 메서드 로드맵

### 3-1. 고급 통계 페이지 (선택적, 사용자 승인 필요)

- [ ] **canonical-correlation 페이지**
  - Registry: `canonicalCorrelation`
  - 카테고리: advanced

- [ ] **survival-analysis 페이지**
  - Registry: `survivalAnalysis`
  - 카테고리: advanced

- [ ] **time-series 페이지**
  - Registry: `timeSeries`
  - 카테고리: advanced

- [ ] **meta-analysis 페이지**
  - Registry: `metaAnalysis`
  - 카테고리: advanced

- [ ] **sem 페이지** (구조방정식 모델)
  - Registry: `sem`
  - 카테고리: advanced

- [ ] **mediation 페이지**
  - Registry: `mediation`
  - 카테고리: advanced

- [ ] **moderation 페이지**
  - Registry: `moderation`
  - 카테고리: advanced

---

## 🔧 Phase 4: menu-config.ts 수정

### 4-1. 누락된 메뉴 항목 추가

```typescript
// compare 카테고리에 추가
{
  id: 'z-test',
  href: '/statistics/z-test',
  title: 'z-검정',
  subtitle: '대표본 모분산 알 때',
  category: 'compare',
  icon: Calculator,
  implemented: false // 페이지 생성 후 true
}

// nonparametric 카테고리에 추가
{
  id: 'binomial-test',
  href: '/statistics/binomial-test',
  title: '이항 검정',
  subtitle: '이항분포 기반 검정',
  category: 'nonparametric',
  icon: Calculator,
  implemented: false
}
```

### 4-2. 잘못된 항목 수정

- [ ] `two-way-anova`, `three-way-anova`, `repeated-measures`의 `implemented` 값 검증
- [ ] 존재하지 않는 페이지는 `implemented: false` 또는 `comingSoon: true`로 변경

---

## 📝 Phase 5: 문서화

### 5-1. 개발자 문서

- [x] `UI_REGISTRY_MAPPING_ANALYSIS.md` - 매핑 분석
- [x] `UI_REGISTRY_IMPROVEMENT_CHECKLIST.md` - 이 체크리스트
- [ ] `statistical-platform/docs/UI_REGISTRY_GUIDE.md` - 개발자 가이드

### 5-2. 사용자 문서

- [ ] `STATISTICS_METHODS_ROADMAP.md` - 구현 로드맵
- [ ] README 업데이트 (통계 메서드 현황)

---

## 🎯 우선순위 요약

### 즉시 수정 (1-2일)
1. `two-way-anova` 페이지 생성
2. `three-way-anova` 페이지 생성 (또는 메뉴에서 제거)
3. `repeated-measures` 페이지 생성
4. `menu-config.ts` 정합성 수정

### 다음 주 (3-5일)
5. `z-test` 페이지 추가
6. `binomial-test` 페이지 추가
7. 회귀 고급 메서드 4개 페이지 추가

### 장기 계획 (선택)
8. 고급 통계 7개 메서드 페이지 추가
9. 카테고리 재구조화 검토

---

## 📌 다음 단계

**현재 위치**: Phase 1 진행 중

**즉시 해야 할 일**:
1. ✅ `welch-t` 페이지 존재 확인
2. ⏳ `menu-config.ts` 읽고 정합성 검증
3. ⏳ 누락된 3개 페이지 (`two-way-anova`, `three-way-anova`, `repeated-measures`) 처리 방안 결정

**사용자 승인 필요**:
- 3개 누락된 페이지를 생성할지, 메뉴에서 제거할지 결정
- 고급 메서드 7개를 언제 추가할지 로드맵 수립

---

**Updated**: 2025-11-05 | **Next Review**: Phase 1 완료 후
