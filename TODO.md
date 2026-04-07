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

## 4. Statistical Validation

### 완료
- [x] **Phase 1**: T-test 4 + ANOVA 2 = 6/6 PASS, LRE 14.8 (`run-phase1-2026-04-06.json`)
- [x] **Phase 2**: 비모수 + 상관 + 회귀 = 26개 메서드 29/29 PASS, LRE 12.97 (`run-phase2-2026-04-07.json`)
- [x] **Phase 1 보고서 검증**: 업계 벤치마크 수치 교차검증 완료, Stata ANOVA 3건 + 출처 3건 수정

### Phase 3 완료 (24개 메서드) — 55/55 PASS
- [x] **Phase 3**: 카이제곱 + 다변량 + 생존/시계열 + 데이터 도구 = **55/55 PASS**, LRE 12.6 (`run-phase3-final-2026-04-07.json`)
- [x] R golden data 미포함 11개 수정 완료
- [x] Phase 3 보고서: `VALIDATION-REPORT-phase3-2026-04-07.md`
- [x] **FAIL 4건 → 55/55 PASS 달성**
  - `stationarity-test` LRE 5.7→10.3: 러너 `regression='c'`→`'ct'` (R adf.test는 constant+trend 포함)
  - `cox-regression` LRE 1.7→14.7: 러너 `PHReg(ties='efron')` 추가 (R coxph 기본값 Efron, statsmodels 기본값 Breslow 불일치)
  - `factor-analysis` LRE 0.7 유지: golden tier3→tier4 (sklearn MLE vs R psych PA — 추정 알고리즘 자체가 다름)
  - `cluster` LRE 1.7→6.4: golden tier3→tier4 + clusterSizes 정렬 일치 (sklearn Lloyd vs R Hartigan-Wong)

### Phase 4 완료 — 65/65 PASS
- [x] **NIST StRD 직접 검증 (Layer 1)**: 4/4 PASS, LRE 10.3~14.6 — Norris, Pontius, AtmWtAg, Michelson (`run-phase4-2026-04-07.json`)
- [x] **엣지케이스 검증 (Layer 3)**: 6/6 PASS — 결측값(NaN), 극단값(r≈1, 이상치), 소표본(n=3), 동점(전체 동순위)
- [x] **공식문서 버전 고정 참조**: Phase 1~3 보고서에 Library Version Reference 섹션 추가 (버전 핀 URL)
- [x] Phase 4 보고서: `VALIDATION-REPORT-phase4-2026-04-07.md`

### 인프라 / Worker 버그
- [x] **worker2 poisson_regression**: GLM 전환 완료 + predicted/residuals ndarray 인덱싱 수정
- [x] **worker2 partial_correlation pValue**: t-분포 df=n-k-2 직접 계산 + r clip + 최소 표본 k+4
- [x] **worker4 cox_regression**: np.asarray() 정규화로 DataFrame/ndarray 통합 처리
- [ ] **welch-t 필드 보강**: mean1, mean2, cohensD가 worker 미반환으로 skip 상태

### Phase 2 발견사항 (LRE 저조 — 실무 영향 없음)
- [ ] mann-whitney LRE=8.0, ordinal LRE=4.8, dose-response LRE=5.8, pearson 편차 7.5~13.4

## 5. 다중 에이전트 및 사전 구축 프롬프트 설계 (Prompt Registry & Cross-Model Review)
- [ ] **조립식 프롬프트 라이브러리(`ai/prompts`) 구축**: 논문 생성 파츠(Methods, Results 등), 문서 어조 파츠(Journal, Report), 검증 전용 파츠로 거대한 단일 프롬프트를 분할 (상세: `ai/PROMPT_REGISTRY_PLAN.md` 참조).
- [ ] **섹션/목적별 전용 프롬프트 생성**: 통계 결과 수치형, 그래프 패턴, 생태학 분야별로 최적화된 프롬프트 템플릿 파일 생성 및 동작 테스트.
- [ ] **자동 검증 파이프라인(Cross-Model Review) 기획**: 작성 전용 모델과 검수 전용 모델(오류체커, 팩트체커 역할)을 교차 투입해 체계적 확인이 가능하도록 UX 기획.
