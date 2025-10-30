# Phase 2-2 Step 5 Remaining Work Plan

**생성일**: 2025-10-30
**예상 완료**: 2025-10-30 (2.5시간)
**목표**: 통계 페이지 11개 TypeScript 에러 제거 (91개 → 0개)

## 현재 상태
- **총 에러**: 466개
- **통계 페이지 에러**: 91개 (11개 파일)
- **완료된 페이지**: 34/45 (75%)
- **목표**: 45/45 (100%)

## 작업 목록

### Group 1: Quick Wins (6개, 19 errors) - 예상 30분
- [ ] anova (2 errors) - SelectedVariables 타입 이슈
- [ ] t-test (3 errors) - 표준 패턴
- [ ] one-sample-t (3 errors) - 표준 패턴
- [ ] normality-test (3 errors) - 표준 패턴
- [ ] means-plot (4 errors) - 표준 패턴
- [ ] ks-test (4 errors) - 표준 패턴

**주요 패턴**:
- `actions.setResults()` → `actions.completeAnalysis()`
- Optional chaining 추가
- 타입 가드 추가

### Group 2: Medium (2개, 15 errors) - 예상 30분
- [ ] friedman (8 errors)
  - Line 177: `friedmanTest` → `friedman` (메서드명)
  - Line 606: `setCurrentStep` → `actions.nextStep()`
  - Line 156, 161: `actions` undefined 체크
  - Line 286, 318: 타입 불일치 수정
- [ ] kruskal-wallis (7 errors)
  - Line 178: `kruskalWallisTest` → `kruskalWallis`
  - 나머지 friedman과 동일 패턴

**주요 패턴**:
- PyodideStatistics 메서드명 확인
- `useStatisticsPage` hook 패턴 적용

### Group 3: Complex (2개, 23 errors) - 예상 45분
- [ ] mann-kendall (13 errors) - 시계열 분석 타입 복잡
- [ ] reliability (10 errors) - 신뢰도 분석 타입 복잡

**주요 패턴**:
- 복잡한 결과 타입 정의
- Worker 메서드 확인 필요

### Group 4: Critical (1개, 34 errors) - 예상 60분
- [ ] regression (34 errors)
  - 가장 복잡한 페이지
  - 다중 회귀 타입 정의
  - 잔차 분석, 진단 플롯 타입

**주요 패턴**:
- `RegressionResult` 인터페이스 정의
- 복잡한 중첩 타입 구조

## 작업 전략

### Option A: 순차 처리 (권장)
```
Group 1 (30분) → Group 2 (30분) → Group 3 (45분) → Group 4 (60분)
```
**장점**:
- 점진적 난이도 증가
- 빠른 성과로 모멘텀 확보
- 각 그룹 완료 시 커밋

### Option B: 병렬 처리
```
4개 Agent 동시 실행 (Group 1-4)
```
**장점**:
- 최대 속도 (30분 내 완료 가능)
- 패턴 학습 동시 진행

**단점**:
- Agent 간 충돌 가능성
- 리뷰 부담 증가

### Option C: 역순 처리
```
Group 4 → Group 3 → Group 2 → Group 1
```
**장점**:
- 어려운 것 먼저 해결
- 나중에 쉬운 작업으로 마무리

**단점**:
- 초반 진행 속도 느림

## 검증 체크리스트

각 그룹 완료 시:
- [ ] TypeScript 컴파일 (`npx tsc --noEmit`)
- [ ] 에러 개수 확인 (목표 대비)
- [ ] Git 커밋
- [ ] STATUS.md 업데이트 (선택적)

## 완료 후 작업

1. **Phase 2-2 완료 선언**
   - 통계 페이지 45/45 = 100%
   - TypeScript 에러: 466 → 375개

2. **문서 정리**
   - 이 문서를 `archive/2025-10/phase2-2-step5-complete.md`로 이동
   - dailywork.md에 요약 추가
   - STATUS.md 업데이트

3. **다음 Phase 계획**
   - Phase 3: 인프라 에러 375개 처리 (우선순위 낮음)
   - 또는 Phase 7: 새 기능 추가

---

**작업 시작 시각**:
**작업 완료 시각**:
**실제 소요 시간**:
