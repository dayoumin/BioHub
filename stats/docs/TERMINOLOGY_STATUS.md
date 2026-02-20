# Terminology System 적용 현황

**최종 업데이트**: 2026-02-09

---

## ✅ 완료된 작업

### 1. Core System (100%)
- ✅ `terminology-types.ts` - TypeScript 타입 정의 완료
- ✅ `terminology-context.tsx` - Context & Provider 구현
- ✅ `hooks/use-terminology.ts` - Custom Hook 구현
- ✅ `domains/aquaculture.ts` - 수산과학 용어 사전
- ✅ `domains/generic.ts` - 범용 통계 용어 사전
- ✅ `components/terminology/DomainSwitcher.tsx` - UI 컴포넌트

### 2. Variable Selectors (100%)
- ✅ `GroupComparisonSelector.tsx` - 실험구 비교
- ✅ `OneSampleSelector.tsx` - 일표본 t-검정
- ✅ `PairedSelector.tsx` - 대응 표본
- ✅ `CorrelationSelector.tsx` - 상관분석
- ✅ `MultipleRegressionSelector.tsx` - 다중회귀
- ✅ `TwoWayAnovaSelector.tsx` - 이원 ANOVA

### 3. Integration (100%)
- ✅ `app/layout.tsx` - TerminologyProvider 추가
- ✅ TypeScript 0 errors

---

## 🎯 적용 범위

### ✅ 완전 적용 (Smart Flow Only)

**Smart Flow Variable Selection**:
- `components/smart-flow/steps/VariableSelectionStep.tsx`
- 6개 통계 방법에 대한 변수 선택 UI
- 도메인 전환 시 즉시 반영

**영향받는 통계 방법**:
1. t-test, Mann-Whitney, Kruskal-Wallis (GroupComparisonSelector)
2. One-sample t-test (OneSampleSelector)
3. Paired t-test, Wilcoxon (PairedSelector)
4. Correlation (CorrelationSelector)
5. Multiple Regression (MultipleRegressionSelector)
6. Two-way ANOVA (TwoWayAnovaSelector)

### ❌ 미적용

**50개 통계 페이지**:
- `/statistics/anova/page.tsx`
- `/statistics/correlation/page.tsx`
- `/statistics/chi-square/page.tsx`
- ... (47개 더)

**Smart Flow 내부 텍스트**:
- `components/smart-flow/steps/PurposeInputStep.tsx` - "분석 방법 선택"
- `components/smart-flow/steps/AnalysisExecutionStep.tsx` - "분석 실행"
- `components/smart-flow/steps/VariableSelectionStep.tsx` - "변수 선택"
- ... (더 많음)

---

## 📊 적용 비율

| 영역 | 적용률 | 상태 |
|------|--------|------|
| **Core System** | 100% | ✅ 완료 |
| **Variable Selectors** | 100% (6/6) | ✅ 완료 |
| **Smart Flow** | 30% (6개 Selector만) | ⚠️ 부분 |
| **Statistics Pages** | 0% (0/50) | ❌ 미적용 |
| **Overall** | ~5% | ⚠️ 매우 제한적 |

---

## 🎯 다음 단계 우선순위

### Phase 2: Smart Flow 완전 적용 (우선)
- [ ] PurposeInputStep 텍스트 → Terminology
- [ ] VariableSelectionStep 텍스트 → Terminology
- [ ] AnalysisExecutionStep 텍스트 → Terminology
- [ ] ResultsActionStep 텍스트 → Terminology
- [ ] DomainSwitcher 헤더 배치

### Phase 3: 핵심 통계 페이지 적용 (중기)
- [ ] 상위 5개 사용 빈도 높은 페이지 선정
- [ ] 페이지별 Terminology 적용 계획
- [ ] 단계적 마이그레이션

### Phase 4: 전체 페이지 적용 (장기)
- [ ] 나머지 45개 페이지
- [ ] 자동화 도구 개발 고려

---

## 🚨 알려진 제한사항

1. **도메인 전환의 불일치**
   - Smart Flow: ✅ 즉시 반영
   - 통계 페이지: ❌ 반영 안 됨

2. **DomainSwitcher 미배치**
   - 컴포넌트 존재하지만 UI에 없음
   - 사용자가 도메인 전환 불가능

3. **Smart Flow 내부 불완전**
   - Selector는 적용되었지만
   - Step 제목, 버튼 등은 하드코딩

---

## 📝 권장 사항

**즉시 조치 필요**:
1. DomainSwitcher를 헤더에 배치
2. Smart Flow 내부 텍스트 완전 적용
3. 브라우저 테스트 진행

**단기 계획**:
1. 핵심 5개 통계 페이지 선정 및 적용
2. 사용자 피드백 수집

**장기 계획**:
1. 전체 페이지 마이그레이션 로드맵
2. 자동화 도구 개발

---

**작성**: Claude Code
**버전**: v1.0
