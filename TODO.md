# BioHub 통계 UI/UX 고도화 & 리팩터링 잔여 작업

## 1. 시각화 및 UX 컴포넌트 고도화
- [ ] 분석 유형별(통계 메서드별) 기본 시각화 컴포넌트 매핑 일관성 확보
- [ ] AI 해석의 요약 (결론 도출 근거) 정보를 결과 카드에 축약하여 노출 (Phase 3)
- [ ] 사용자 언어(질문 기반)가 통계적 엄밀함을 해치는지 확인하고 문구 미세 조정 및 모니터링

## 2. StatisticalExecutor 마이그레이션 및 파서 버그 해결 (B2)
- [ ] **Stepwise Regression 결과 매핑 불일치 해결**: Handler는 `fStatistic`, `pValue`를 찾으나 Worker는 `pValues`(배열)을 반환하는 버그 우회/해결 필요.
- [ ] **Poisson / Ordinal Regression Model-level p-value 추가**: Model-level `llrPValue` 누락 문제 개선 보완 (`handle-regression.ts`).
- [ ] `generated types` (`OrdinalLogisticResult`, `PoissonRegressionResult`)의 불완전한 명세 수정 및 `any` 타입 캐스팅 3곳 정리.
- [ ] MANOVA 등에 남아있는 `|| 0`, 불필요한 삼항연산자 클리닝 및 타입 재설계.

## 3. ResultsHeroCard 추가 예외 처리 (Optional)
- [ ] ResultsStatsCards.tsx 내에서도 비가설검정 (PCA, 군집화 등)의 p-value 카드를 좀 더 자연스럽게 숨기거나 적절한 값으로 표시할 수 있도록 개선 여부 검토.
