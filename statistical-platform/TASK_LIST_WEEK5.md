# 📋 Week 5 작업 목록 및 진행 상황

> 작성일: 2025-09-23
> 목표: 변수 선택 시스템 완성 및 통계 분석 페이지 구현

## 📊 현재 상황 요약

### ✅ 완료된 작업
- [x] 변수 선택 시스템 (variable-requirements.ts)
- [x] 변수 타입 자동 감지 (variable-type-detector.ts)
- [x] ProfessionalVariableSelector 컴포넌트
- [x] StatisticsPageLayout 공통 레이아웃
- [x] 4개 통계 페이지 UI (t-test, anova, regression, correlation)
- [x] 테스트 코드 작성 (일부)

### ❌ 미완료 주요 작업
- [ ] 2개 통계 페이지 (non-parametric, chi-square)
- [ ] Pyodide 실제 연결 (현재 모든 페이지가 mock 데이터)
- [ ] 나머지 35개 통계 메서드 (41개 중 6개만 페이지 존재)
- [ ] 코드 중복 제거 및 중앙화

---

## 🎯 Phase 1: 코드 정리 및 중앙화 (2시간)

### 1.1 코드 중복 제거 ✅ [완료]
- [x] cn 함수 제거 - anova 페이지
- [x] cn 함수 제거 - regression 페이지
- [x] cn 함수 제거 - correlation 페이지
- [x] cn 함수 제거 - t-test 페이지 확인

### 1.2 공통 유틸리티 함수 생성 ✅ [완료]
```typescript
// 완료: /lib/statistics/formatters.ts
```
- [x] formatPValue(p: number): string  // p < 0.001 처리
- [x] formatConfidenceInterval(lower: number, upper: number): string
- [x] formatStatistic(value: number, precision?: number): string
- [x] interpretEffectSize(value: number, type: 'cohen_d' | 'eta_squared' | 'r'): string
- [x] interpretCorrelation(r: number): string
- [x] interpretPValue(p: number, alpha?: number): boolean
- [x] 테스트 작성 및 통과 (23개 테스트 모두 통과)

### 1.3 공통 컴포넌트 추출 ✅ [완료]
```typescript
// 생성 완료: /components/statistics/common/
```
- [x] `PValueBadge.tsx` - p-value 표시 컴포넌트 (툴팁, 애니메이션, 접근성 포함)
- [x] `EffectSizeCard.tsx` - 효과크기 표시 카드 (시각화, 비교, 가이드 포함)
- [x] `AssumptionTestCard.tsx` - 가정 검정 결과 카드 (접기/펼치기, 심각도 표시, 권장사항)
- [x] `StatisticsTable.tsx` - 통계 결과 테이블 (정렬, 선택, CSV 내보내기)
- [x] `ConfidenceIntervalDisplay.tsx` - 신뢰구간 표시 (시각화, 줌, 다중 비교)
- [x] `ResultActionButtons.tsx` - 보고서/다운로드 버튼 (다양한 형식 지원)
- [x] `StatisticalResultCard.tsx` - 통합 결과 카드 (탭 구조, 모든 컴포넌트 통합)

### 1.4 차트 컴포넌트 표준화
```typescript
// 생성할 폴더: /components/charts/
```
- [ ] `BarChartWithCI.tsx` - 신뢰구간이 있는 막대차트
- [ ] `ScatterPlotWithRegression.tsx` - 회귀선이 있는 산점도
- [ ] `BoxPlot.tsx` - 박스플롯
- [ ] `HeatmapChart.tsx` - 상관행렬 히트맵
- [ ] `ResidualPlot.tsx` - 잔차 플롯

---

## 🎯 Phase 2: 미구현 페이지 완성 (3시간)

### 2.1 비모수 검정 페이지 (/statistics/non-parametric) ✅ [완료]
- [x] 페이지 레이아웃 구성
- [x] 4가지 검정 방법 선택 UI
  - [x] Mann-Whitney U test
  - [x] Wilcoxon signed-rank test
  - [x] Kruskal-Wallis test
  - [x] Friedman test
- [x] 변수 선택 통합 (ProfessionalVariableSelector)
- [x] 결과 표시 (공통 컴포넌트 활용 - StatisticalResultCard)
- [x] 가정 확인 탭 추가
- [x] 분석 옵션 설정 (유의수준, 대립가설)

### 2.2 카이제곱 검정 페이지 (/statistics/chi-square)
- [ ] 페이지 레이아웃 구성
- [ ] 3가지 검정 방법 선택 UI
  - [ ] 독립성 검정
  - [ ] 적합도 검정
  - [ ] Fisher's exact test
- [ ] 분할표 입력/표시
- [ ] 기대빈도 계산 표시
- [ ] 테스트 코드 작성

### 2.3 추가 통계 페이지 (우선순위별)
**높은 우선순위**
- [ ] 정규성 검정 페이지 (Shapiro-Wilk, Anderson-Darling, etc.)
- [ ] 검정력 분석 페이지 (Power Analysis)
- [ ] 표본크기 계산 페이지

**중간 우선순위**
- [ ] 시계열 분석 페이지 (ARIMA, 계절성)
- [ ] 주성분 분석 (PCA)
- [ ] 요인 분석 (Factor Analysis)

**낮은 우선순위**
- [ ] 생존 분석 (Kaplan-Meier, Cox)
- [ ] 메타 분석
- [ ] 베이지안 통계

---

## 🎯 Phase 3: Pyodide 통합 (4시간)

### 3.1 Pyodide 서비스 연결
- [ ] pyodide-statistics.ts 메서드와 페이지 연결
- [ ] 로딩 상태 관리
- [ ] 에러 처리
- [ ] 진행 상황 표시

### 3.2 각 페이지별 실제 계산 연결
- [ ] t-test 페이지 - mock 제거, 실제 계산
- [ ] anova 페이지 - mock 제거, 실제 계산
- [ ] regression 페이지 - mock 제거, 실제 계산
- [ ] correlation 페이지 - mock 제거, 실제 계산
- [ ] non-parametric 페이지 - 실제 계산
- [ ] chi-square 페이지 - 실제 계산

### 3.3 데이터 전처리
- [ ] 결측값 처리 옵션
- [ ] 이상치 감지 및 처리
- [ ] 데이터 변환 (log, sqrt, etc.)

---

## 🎯 Phase 4: 스마트 플로우 통합 (2시간)

### 4.1 변수 선택 단계 추가
- [ ] /smart-flow에 Step 3.5 추가
- [ ] ProfessionalVariableSelector 통합
- [ ] 자동 변수 매핑

### 4.2 분석 방법 자동 추천
- [ ] 데이터 특성 기반 추천
- [ ] 가정 검정 후 대안 제시

---

## 🎯 Phase 5: 테스트 및 품질 보증 (지속적)

### 5.1 단위 테스트
- [x] StatisticsPageLayout.test.tsx ✅
- [x] t-test.page.test.tsx (일부)
- [x] anova.page.test.tsx (일부)
- [ ] regression.page.test.tsx
- [ ] correlation.page.test.tsx
- [ ] formatters.test.ts
- [ ] 공통 컴포넌트 테스트

### 5.2 통합 테스트
- [ ] 전체 워크플로우 E2E 테스트
- [ ] 실제 CSV 파일로 테스트
- [ ] Pyodide 계산 검증 (R/SPSS 결과와 비교)

### 5.3 성능 최적화
- [ ] 대용량 데이터 처리
- [ ] Web Worker 활용
- [ ] 메모리 관리

---

## 📅 오늘의 작업 순서 (2025-09-23)

### ⏰ 오전 (3시간)
1. **[10분]** cn 함수 중복 제거 완료
2. **[30분]** formatters.ts 생성 및 구현
3. **[30분]** PValueBadge, EffectSizeCard 컴포넌트 생성
4. **[20분]** 코드 리뷰 및 테스트
5. **[1시간]** 비모수 검정 페이지 구현
6. **[30분]** 테스트 코드 작성 및 실행

### ⏰ 오후 (3시간)
1. **[1시간]** 카이제곱 검정 페이지 구현
2. **[30분]** 공통 컴포넌트 적용 (기존 4개 페이지)
3. **[1시간]** Pyodide 연결 시작 (t-test부터)
4. **[30분]** 통합 테스트

---

## 📝 진행 상황 추적

### 완료율
- Phase 1: 75% ███████████████░░░░░
- Phase 2: 30% ██████░░░░░░░░░░░░░░
- Phase 3: 0%  ░░░░░░░░░░░░░░░░░░░░
- Phase 4: 0%  ░░░░░░░░░░░░░░░░░░░░
- Phase 5: 35% ███████░░░░░░░░░░░░░

### 다음 체크포인트
- [ ] 10:30 - cn 함수 제거 완료
- [ ] 11:00 - formatters.ts 완료
- [ ] 11:30 - 공통 컴포넌트 2개 완료
- [ ] 12:30 - 비모수 페이지 완료

---

## 🚨 주의사항
1. **각 작업 완료 후 반드시 테스트 실행**
2. **코드 리뷰는 매 컴포넌트마다**
3. **커밋은 작은 단위로 자주**
4. **Pyodide는 mock 모드 유지 옵션 필요 (테스트용)**

---

## 📌 참고 링크
- [변수 선택 시스템 문서](./docs/development/VARIABLE_SELECTION_SYSTEM.md)
- [통계 메서드 가이드](./STATISTICAL_METHODS_COMPLETE_GUIDE.md)
- [프로젝트 마스터 플랜](./PROJECT_MASTER_PLAN.md)

---

*마지막 업데이트: 2025-09-23 17:30*

## 🎆 주요 성과 (UX/UI 개선)

### 완료된 공통 컴포넌트 특징:

**PValueBadge** ✅
- 통계적 유의성에 따른 4단계 색상 체계
- 호버 툴팁으로 해석 제공
- 접근성을 위한 ARIA 레이블
- p < 0.001 시 애니메이션 인디케이터
- 유의성 표시 컴포넌트 포함
- 그룹 표시 기능

**EffectSizeCard** ✅
- 시각적 스케일 바로 크기 표현
- 방향 표시 아이콘 (TrendingUp/Down)
- 효과크기 타입별 가이드라인
- 여러 효과크기 비교 컴포넌트
- 상호작용 툴팁으로 상세 설명

**AssumptionTestCard** ✅
- 가정 충족 여부 시각적 표현
- 접기/펼치기 기능으로 공간 효율성
- 심각도 레벨 표시 (경미/보통/심각)
- 가정 위반 시 권장사항 자동 표시
- 대안 분석 방법 추천 버튼

**StatisticsTable** ✅
- 정렬 가능한 컬럼
- 다중 행 선택 기능
- CSV/클립보드 내보내기
- 확장 가능한 행
- 커스터마이징 가능한 셀 포맷

**ConfidenceIntervalDisplay** ✅
- 신뢰구간 시각적 표현
- 줌 인/아웃 기능
- 점추정치와 구간 동시 표시
- 여러 신뢰구간 비교 기능
- 기준값과 비교 해석

**ResultActionButtons** ✅
- 다양한 내보내기 형식 (PDF, Word, Excel, CSV 등)
- 공유 기능 (링크, 이메일, 클립보드)
- 노트북 저장 기능
- 인용 생성 (APA, MLA 등)
- 드롭다운 메뉴로 정리된 UI

**StatisticalResultCard** ✅
- 모든 컴포넌트 통합된 종합 카드
- 4개 탭 구조 (주요 결과, 가정 검정, 해석, 상세)
- 상태별 색상 표시
- 재분석 및 상세보기 버튼
- 접기/펼치기 가능한 레이아웃