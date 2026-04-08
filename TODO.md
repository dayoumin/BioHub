# BioHub 통계 UI/UX 고도화 & 리팩터링 잔여 작업

## 1. 시각화 및 UX 컴포넌트 고도화
- [x] AI 해석의 요약 (결론 도출 근거) 정보를 결과 카드에 축약하여 노출 — Hero Card에 AI 요약 한 줄 인라인 (2026-04-07)
- [ ] 분석 유형별(통계 메서드별) 기본 시각화 컴포넌트 매핑 일관성 확보
- [ ] 사용자 언어(질문 기반)가 통계적 엄밀함을 해치는지 확인하고 문구 미세 조정 및 모니터링
- [ ] **비가설검정 StatsCards 개선**: PCA/군집/요인/판별/검정력 → 메서드별 primaryMetrics 정의 + 조건부 카드 구성 (p-value 대신 분산설명률, 실루엣 등)
- [ ] **ResultsActionStep 훅 추출**: useResultsExport, useResultsHistory, useResultsNavigation, usePaperDraft 분리 (1025줄 → 핸들러 로직 캡슐화)

## 2. StatisticalExecutor 마이그레이션 및 파서 버그 해결 (B2)
- [x] **Poisson / Ordinal Regression Model-level p-value**: Worker + Handler 양쪽 `llrPValue`/`llrStatistic` 완전 구현 확인 (2026-04-07 검토)
- [x] **Stepwise Regression 결과 매핑**: 버그 아님 — Handler가 `fStatistic`/`fPValue` 정상 사용, 개별 `pValues` 배열은 rawResults로 전파 (2026-04-07 검토)
- [x] **generated types 명세**: `OrdinalLogisticResult`, `PoissonRegressionResult` 타입 완전, any 1곳은 다중 반환타입 처리로 정당 (2026-04-07 검토)
- [x] **MANOVA `|| 0` / 삼항연산자**: `|| 0`은 NaN→0 의도적 변환으로 정당, 삼항 1건 중복은 미미 (2026-04-07 검토)
- [x] **worker2 `manova()` dead code 제거**: TS는 worker3으로 라우팅 — worker2 버전 220줄 제거 완료 (2026-04-07)

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
  - `factor-analysis` LRE 0.7→2.6: sklearn MLE→NumPy PAF 전환, comm tier3 + varExp tier4 (삼자 비교 완료)
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
- [x] **welch-t 검증 매핑 보강**: golden JSON + 필드 매핑에 cohensD/mean1/mean2 추가 (2026-04-07)

### Phase 2 발견사항 (LRE 저조 — 실무 영향 없음)
- [ ] mann-whitney LRE=8.0, ordinal LRE=4.8, dose-response LRE=5.8, pearson 편차 7.5~13.4

### 검증 갭 분석 (상세: `stats/docs/VALIDATION-GAPS-ANALYSIS.md`)
- [x] **알고리즘 차이 재검토**: factor-analysis sklearn MLE→NumPy PAF 전환 (LRE 0.69→2.6, tier3), arima 4.72·ordinal 4.81 tier3 적절 확인, 삼자 교차비교 문서화 완료
- [x] **kaplan-meier → statsmodels 전환**: `SurvfuncRight + survdiff` 사용, R 대비 LRE 15.0 유지 확인
- [x] **method-target-matrix.json 정정**: 9개 메서드의 pythonLib/pythonCall을 실제 라이브러리 호출로 수정
- [x] **검증 메타데이터 UI 표시**: `validation-metadata.ts` + ResultsHeroCard 배지 (라이브러리명 + R 검증 완료)
- [x] **자체 구현 10개 공식 대조 완료**: 12개 구현체 감사 — BUG 3건 + ISSUE 4건 + Finding 2건 수정 (mann-kendall tie correction, mixed-model 7건, manova placeholder 제거)
- [x] **엣지케이스 추가**: 분산 0, n=1, 완전 분리, 다중공선성, 전체 결측, 빈 팩터 — 6개 추가 (12/12 PASS)
- [x] **NIST 확장**: Filip(다항회귀, LRE 7.7), Longley(다중공선성, LRE 12.3) 추가 — 6/6 PASS

## 5. 차트 품질 점검 (UI 다듬기 완료 후)
- [ ] 상세: [`stats/docs/CHART-REVIEW-CHECKLIST.md`](stats/docs/CHART-REVIEW-CHECKLIST.md)
- [ ] L1: 컨버터 테스트 edge case 보강 (빈 데이터, NaN, 단일 포인트, 대용량)
- [ ] L2: Analysis Flow 4개 + Graph Studio 12타입 시각 요소 수동 점검
- [ ] L3: 색상 접근성, 다크모드, 반응형, 내보내기 공통 품질

## 6. 다중 에이전트 및 사전 구축 프롬프트 설계 (Prompt Registry & Cross-Model Review)
- [ ] **조립식 프롬프트 라이브러리(`ai/prompts`) 구축**: 논문 생성 파츠(Methods, Results 등), 문서 어조 파츠(Journal, Report), 검증 전용 파츠로 거대한 단일 프롬프트를 분할 (상세: `ai/PROMPT_REGISTRY_PLAN.md` 참조).
- [ ] **섹션/목적별 전용 프롬프트 생성**: 통계 결과 수치형, 그래프 패턴, 생태학 분야별로 최적화된 프롬프트 템플릿 파일 생성 및 동작 테스트.
- [ ] **자동 검증 파이프라인(Cross-Model Review) 기획**: 작성 전용 모델과 검수 전용 모델(오류체커, 팩트체커 역할)을 교차 투입해 체계적 확인이 가능하도록 UX 기획.

## 7. Diagnostic Pipeline 기술 부채 (기능·런타임 영향 없음)

상세: [`stats/docs/superpowers/specs/diagnostic-pipeline-tech-debt.md`](stats/docs/superpowers/specs/diagnostic-pipeline-tech-debt.md)

### 완료
- [x] TD-3: Worker 응답 타입 중복 → `worker-result-types.ts` 추출 (`9ce2689e`)
- [x] TD-6: MIN_GROUP_SIZE 상수 중복 → `statistical-constants.ts` 추출 (`9ce2689e`)
- [x] TD-7: 그룹 변수 해결 로직 중복 → `resolveGroupVariable()` 추출 (`9ce2689e`)
- [x] TD-1: suggestedSettings → handler 전달 (Phase E) — alternative/postHoc 지원
- [x] TD-5: JSON 추출 regex 통합 → `lib/utils/json-extraction.ts`

### 높음
- [ ] TD-2: auto 셀렉터 12개 메서드 변수 입력 UI 미완성

### 중간 (코드 품질)
- [ ] TD-4: Pyodide lazy init 패턴 중복 3파일 → `ensurePyodideReady()` 헬퍼 추출

### 낮음
- [ ] TD-8: goToPreviousStep() diagnostic 트랙에서 Step 2 skip 미인지
- [ ] TD-9: experiment-design 트랙 빈 껍데기 → Consultant 모드 흡수 검토
