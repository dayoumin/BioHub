# BioHub ?듦퀎 UI/UX 怨좊룄??& 由ы뙥?곕쭅 ?붿뿬 ?묒뾽

## 0. Graph Studio / Papers follow-up (2026-04-12)
- [x] Graph Studio intentional gap 재검토: `encoding.color.scale`, `encoding.shape`, `encoding.size`, `scale.type=sqrt|symlog` 유지 여부와 renderer 지원 계획 정리 (defense-in-depth 유지 — 2026-04-14 재검토, 스키마 코멘트 추가)
- [x] Graph Studio save/restore/export 경계 최종 점검: route detach/reopen, snapshot last-good 유지, save 직후 외부 소비자 반영 흐름 E2E 확인 (`515a1bfb`, 2026-04-12)
- [x] Papers 문서 편집기 후속 보강: 문서 전환 직후 reassemble/export 타이밍 케이스와 citation 로딩 레이스 회귀 테스트 추가 (`a3d73407`, 2026-04-13)
- [x] PackageBuilder Step 2 자동 수집 후속 점검: same-tab entity/graph 변경 시 기존 item 재수집 정책과 사용자 수동 편집 충돌 여부 검토 (`a3d73407`, 2026-04-13)

### Graph Studio scoring follow-up (2026-04-14, 커밋 `9ae32a41` 후속)
- [ ] **[P1] 기본 차트 타입 휴리스틱 재검토**: 샘플 데이터(`species`/`length_cm`/`weight_g`/`year`) 기준 현재 `getRecommendedTypes`가 bar 우선. 사용자 기대는 scatter(2+ 수치 컬럼). `ChartSetupPanel.defaultType`은 `recommended.has('bar')`, `autoCreateChartSpec`·`createChartSpecFromDataPackage`·`ResultsActionStep.tsx:673`은 `suggestChartType(columns)` — 두 경로가 다른 기본값 반환 가능(현재 sample로 bar vs line). scatter 우선 여부 결정 후 양쪽 call site 동시 업데이트 필요.
- [ ] **[P1] Auto-color 인코딩 entry point 불일치**: 새 `selectAutoColorField`는 `ChartSetupPanel.handleCreate`에서만 호출. 다른 5곳(`LeftDataPanel`, `ResultsActionStep:675`, `useDataTabLogic:178`, `autoCreateChartSpec`, `createChartSpecFromDataPackage`)은 auto color 로직 부재. 사용자가 분석→차트/재업로드 등 다른 경로로 진입 시 line/scatter에서 범주형 자동 color 인식 안 됨. `createDefaultChartSpec`에 통합(SSOT)하거나 명시적으로 "Setup-only" 문서화. (ID-aware 필터링 자체는 `fbefe31d`에서 추가 완료 — entry point 통합만 미해결)
- [ ] **[P2] `visit`/`age` ordinal 분기 −2 페널티 재검토 + `suggestChartType` line 우선권 완화**: `scoreXAxisCandidate` nominal/ordinal branch에서 TIME_LIKE 힌트가 `-2` 감점되어 `visit`(종단 연구 legitimate X) 같은 컬럼이 중립 이름 컬럼 대비 ~10점 손해. 또한 `suggestChartType`은 `timeCols≥1 && quantCols≥1 → line`을 먼저 적용하는데 `visit`/`age` 같은 준-시간 컬럼은 실제론 공변량일 때가 많음. ordinal 분기에서 TIME 페널티 제거 + `visit`/`age`를 TIME_LIKE에서 분리하면 `quantitative 2+` scatter 경로로 자연스럽게 빠짐.
- [ ] **[P2] 토큰 사전 한국어 확장**: 현재 `ID_LIKE`/`CATEGORY_FRIENDLY`/`TIME_LIKE`/`RESPONSE_LIKE`/`PREDICTOR_LIKE` 영문 only. 한국어 헤더는 unique count + 원순서 fallback만 동작. 실제 사용자 CSV 샘플 수집 트리거 필요(누가·언제 수집할지 기준 미정). 유니코드 헤더용 `normalizeFieldName` 정규식도 동시 확장.
- [ ] **[P2] `concentration`/`dose` 역할 모호성**: `concentration`, `intensity`, `level`은 현재 `RESPONSE_LIKE`만 속함. dose-response 맥락에선 X축 predictor 역할도 함. 도메인별 override 정책 고려.
- [ ] **[P2] Y scorer CATEGORY suppression symmetry**: `scoreYAxisCandidate`는 CATEGORY suppress 로직 없어 numeric `treatment_id` 같은 엣지 케이스에서 `-12` 그대로 (X는 ID+CATEGORY 면제, Y는 면제 없음). 비대칭 설계 의도성 문서화 또는 symmetry 적용.
- [ ] **[P3] `code`/`index` ID-like 토큰 완화**: `ID_LIKE_TOKENS`에서 일반 범주형 헤더도 과하게 감점하지 않도록 조정. `treatment_code`, `site_code`, `group_index` 같은 도메인 컬럼이 row-id처럼 취급되지 않게 테스트 케이스와 함께 정리.
- [ ] **[P3] `converters/shared.ts:678` `base.title.top: 8` 하드코딩**: 같은 파일에 이미 `TITLE_TOP = 8` 상수 있음. 재사용하여 single source of truth 확보(다음 shared.ts 편집 시 1줄 수정).
- [ ] **[P3] 샘플 데이터 preferredXY override**: 어류 생태 샘플(`species`/`length_cm`/`weight_g`/`year`)에서 `length-weight relationship`이 흔한 분석 축이지만 현재 글로벌 RESPONSE_LIKE 스코어가 `weight`를 우선시 → `length_cm`이 Y로 잡히지 않음. 제품 샘플로 계속 쓸 데이터면 CSV 메타에 `preferredXY: { x: 'length_cm', y: 'weight_g' }` 필드 추가 또는 analysis adapter에서 명시하는 방식이 더 안정적 (글로벌 weight 우선은 유지).
- [ ] **[P3] Legend-title 오프셋 CI 검증 — Playwright screenshot diff**: 현재 오프셋 `8 + titleSize + 10`은 single-line title 가정. multiline title / titleSize 24+ / small viewport 엣지 케이스는 단위 테스트로 못 잡음. Playwright로 `title 있음` × `titleSize 기본/24+` × `top legend/bottom legend` × `multiline title/small viewport` 최소 4~8 fixture screenshot diff 추가.

### Graph Studio architecture stabilization follow-up (2026-04-14)
- [ ] 계획 문서 기준선 확정: [`stats/docs/graph-studio/PLAN-ARCHITECTURE-STABILIZATION.md`](stats/docs/graph-studio/PLAN-ARCHITECTURE-STABILIZATION.md)
- [ ] **[P1] project restore compatibility 강화**: 동일 필드명만으로 기존 `chartSpec`을 재부착하지 않도록 dataset compatibility 기준 재설계.
- [ ] **[P1] preview/export contract 일치화**: preview 배경과 PNG/SVG export 배경이 같은 `style.background` 경로를 따르도록 정리.
- [ ] **[P2] session / persistence coordinator 분리**: route sync, project detach, draft chat lifecycle, snapshot save 의미를 한 수명 주기로 재구성.
- [ ] **[P2] save transaction semantics 정리**: metadata 저장 성공과 snapshot 저장 실패가 사용자에게 같은 "저장 완료"로 보이지 않게 상태와 토스트 기준 정리.
- [ ] **[P2] chart capability registry 도입**: preview/export/overlay/facet 지원 여부를 chart type별 단일 선언으로 통합.
- [ ] **[P2] matplotlib export contract 정렬**: preview spec과 export spec이 같은 필드 집합과 validation 규칙을 공유하도록 정리.
- [ ] **[P2] editor action layer 공용화**: `LeftDataPanel`, `DataTab`, `AiPanel`의 field assignment / direct mutation 규칙을 공용 액션으로 통합.
- [ ] **[P3] ambient research project 의존 제거**: `saveCurrentProject()`가 외부 active project singleton을 직접 읽지 않도록 session binding 경로 정리.

## 1. ?쒓컖??諛?UX 而댄룷?뚰듃 怨좊룄??
- [x] AI ?댁꽍???붿빟 (寃곕줎 ?꾩텧 洹쇨굅) ?뺣낫瑜?寃곌낵 移대뱶??異뺤빟?섏뿬 ?몄텧 ??Hero Card??AI ?붿빟 ??以??몃씪??(2026-04-07)
- [ ] 遺꾩꽍 ?좏삎蹂??듦퀎 硫붿꽌?쒕퀎) 湲곕낯 ?쒓컖??而댄룷?뚰듃 留ㅽ븨 ?쇨????뺣낫
- [ ] ?ъ슜???몄뼱(吏덈Ц 湲곕컲)媛 ?듦퀎???꾨??⑥쓣 ?댁튂?붿? ?뺤씤?섍퀬 臾멸뎄 誘몄꽭 議곗젙 諛?紐⑤땲?곕쭅
- [ ] **ResultsActionStep ??異붿텧**: useResultsExport, useResultsHistory, useResultsNavigation, usePaperDraft 遺꾨━ (1025以????몃뱾??濡쒖쭅 罹≪뒓??

## 2. StatisticalExecutor 留덉씠洹몃젅?댁뀡 諛??뚯꽌 踰꾧렇 ?닿껐 (B2)
- [x] **Poisson / Ordinal Regression Model-level p-value**: Worker + Handler ?묒そ `llrPValue`/`llrStatistic` ?꾩쟾 援ы쁽 ?뺤씤 (2026-04-07 寃??
- [x] **Stepwise Regression 寃곌낵 留ㅽ븨**: 踰꾧렇 ?꾨떂 ??Handler媛 `fStatistic`/`fPValue` ?뺤긽 ?ъ슜, 媛쒕퀎 `pValues` 諛곗뿴? rawResults濡??꾪뙆 (2026-04-07 寃??
- [x] **generated types 紐낆꽭**: `OrdinalLogisticResult`, `PoissonRegressionResult` ????꾩쟾, any 1怨녹? ?ㅼ쨷 諛섑솚???泥섎━濡??뺣떦 (2026-04-07 寃??
- [x] **MANOVA `|| 0` / ?쇳빆?곗궛??*: `|| 0`? NaN?? ?섎룄??蹂?섏쑝濡??뺣떦, ?쇳빆 1嫄?以묐났? 誘몃? (2026-04-07 寃??
- [x] **worker2 `manova()` dead code ?쒓굅**: TS??worker3?쇰줈 ?쇱슦????worker2 踰꾩쟾 220以??쒓굅 ?꾨즺 (2026-04-07)

## 3. Statistical Validation

### ?꾨즺
- [x] **Phase 1**: T-test 4 + ANOVA 2 = 6/6 PASS, LRE 14.8 (`run-phase1-2026-04-06.json`)
- [x] **Phase 2**: 鍮꾨え??+ ?곴? + ?뚭? = 26媛?硫붿꽌??29/29 PASS, LRE 12.97 (`run-phase2-2026-04-07.json`)
- [x] **Phase 1 蹂닿퀬??寃利?*: ?낃퀎 踰ㅼ튂留덊겕 ?섏튂 援먯감寃利??꾨즺, Stata ANOVA 3嫄?+ 異쒖쿂 3嫄??섏젙

### Phase 3 ?꾨즺 (24媛?硫붿꽌?? ??55/55 PASS
- [x] **Phase 3**: 移댁씠?쒓낢 + ?ㅻ???+ ?앹〈/?쒓퀎??+ ?곗씠???꾧뎄 = **55/55 PASS**, LRE 12.6 (`run-phase3-final-2026-04-07.json`)
- [x] R golden data 誘명룷??11媛??섏젙 ?꾨즺
- [x] Phase 3 蹂닿퀬?? `VALIDATION-REPORT-phase3-2026-04-07.md`
- [x] **FAIL 4嫄???55/55 PASS ?ъ꽦**
  - `stationarity-test` LRE 5.7??0.3: ?щ꼫 `regression='c'`??'ct'` (R adf.test??constant+trend ?ы븿)
  - `cox-regression` LRE 1.7??4.7: ?щ꼫 `PHReg(ties='efron')` 異붽? (R coxph 湲곕낯媛?Efron, statsmodels 湲곕낯媛?Breslow 遺덉씪移?
  - `factor-analysis` LRE 0.7??.6: sklearn MLE?묿umPy PAF ?꾪솚, comm tier3 + varExp tier4 (?쇱옄 鍮꾧탳 ?꾨즺)
  - `cluster` LRE 1.7??.4: golden tier3?뭪ier4 + clusterSizes ?뺣젹 ?쇱튂 (sklearn Lloyd vs R Hartigan-Wong)

### Phase 4 ?꾨즺 ??65/65 PASS
- [x] **NIST StRD 吏곸젒 寃利?(Layer 1)**: 4/4 PASS, LRE 10.3~14.6 ??Norris, Pontius, AtmWtAg, Michelson (`run-phase4-2026-04-07.json`)
- [x] **?ｌ?耳?댁뒪 寃利?(Layer 3)**: 6/6 PASS ??寃곗륫媛?NaN), 洹밸떒媛?r??, ?댁긽移?, ?뚰몴蹂?n=3), ?숈젏(?꾩껜 ?숈닚??
- [x] **怨듭떇臾몄꽌 踰꾩쟾 怨좎젙 李몄“**: Phase 1~3 蹂닿퀬?쒖뿉 Library Version Reference ?뱀뀡 異붽? (踰꾩쟾 ? URL)
- [x] Phase 4 蹂닿퀬?? `VALIDATION-REPORT-phase4-2026-04-07.md`

### ?명봽??/ Worker 踰꾧렇
- [x] **worker2 poisson_regression**: GLM ?꾪솚 ?꾨즺 + predicted/residuals ndarray ?몃뜳???섏젙
- [x] **worker2 partial_correlation pValue**: t-遺꾪룷 df=n-k-2 吏곸젒 怨꾩궛 + r clip + 理쒖냼 ?쒕낯 k+4
- [x] **worker4 cox_regression**: np.asarray() ?뺢퇋?붾줈 DataFrame/ndarray ?듯빀 泥섎━
- [x] **welch-t 寃利?留ㅽ븨 蹂닿컯**: golden JSON + ?꾨뱶 留ㅽ븨??cohensD/mean1/mean2 異붽? (2026-04-07)

### Phase 2 諛쒓껄?ы빆 (LRE ?議????ㅻТ ?곹뼢 ?놁쓬)
- [ ] mann-whitney LRE=8.0, ordinal LRE=4.8, dose-response LRE=5.8, pearson ?몄감 7.5~13.4

### 寃利?媛?遺꾩꽍 (?곸꽭: `stats/docs/VALIDATION-GAPS-ANALYSIS.md`)
- [x] **?뚭퀬由ъ쬁 李⑥씠 ?ш???*: factor-analysis sklearn MLE?묿umPy PAF ?꾪솚 (LRE 0.69??.6, tier3), arima 4.72쨌ordinal 4.81 tier3 ?곸젅 ?뺤씤, ?쇱옄 援먯감鍮꾧탳 臾몄꽌???꾨즺
- [x] **kaplan-meier ??statsmodels ?꾪솚**: `SurvfuncRight + survdiff` ?ъ슜, R ?鍮?LRE 15.0 ?좎? ?뺤씤
- [x] **method-target-matrix.json ?뺤젙**: 9媛?硫붿꽌?쒖쓽 pythonLib/pythonCall???ㅼ젣 ?쇱씠釉뚮윭由??몄텧濡??섏젙
- [x] **寃利?硫뷀??곗씠??UI ?쒖떆**: `validation-metadata.ts` + ResultsHeroCard 諛곗? (?쇱씠釉뚮윭由щ챸 + R 寃利??꾨즺)
- [x] **?먯껜 援ы쁽 10媛?怨듭떇 ?議??꾨즺**: 12媛?援ы쁽泥?媛먯궗 ??BUG 3嫄?+ ISSUE 4嫄?+ Finding 2嫄??섏젙 (mann-kendall tie correction, mixed-model 7嫄? manova placeholder ?쒓굅)
- [x] **?ｌ?耳?댁뒪 異붽?**: 遺꾩궛 0, n=1, ?꾩쟾 遺꾨━, ?ㅼ쨷怨듭꽑?? ?꾩껜 寃곗륫, 鍮??⑺꽣 ??6媛?異붽? (12/12 PASS)
- [x] **NIST ?뺤옣**: Filip(?ㅽ빆?뚭?, LRE 7.7), Longley(?ㅼ쨷怨듭꽑?? LRE 12.3) 異붽? ??6/6 PASS

## 4. 李⑦듃 ?덉쭏 ?먭? (UI ?ㅻ벉湲??꾨즺 ??
- [ ] ?곸꽭: [`stats/docs/CHART-REVIEW-CHECKLIST.md`](stats/docs/CHART-REVIEW-CHECKLIST.md)
- [ ] L1: 而⑤쾭???뚯뒪??edge case 蹂닿컯 (鍮??곗씠?? NaN, ?⑥씪 ?ъ씤?? ??⑸웾)
- [ ] L2: Analysis Flow 4媛?+ Graph Studio 12????쒓컖 ?붿냼 ?섎룞 ?먭?
- [ ] L3: ?됱긽 ?묎렐?? ?ㅽ겕紐⑤뱶, 諛섏쓳?? ?대낫?닿린 怨듯넻 ?덉쭏

## 5. ?ㅼ쨷 ?먯씠?꾪듃 諛??ъ쟾 援ъ텞 ?꾨＼?꾪듃 ?ㅺ퀎 (Prompt Registry & Cross-Model Review)

> **상태**: 보류 — 대형 설계 작업으로 분리. 별도 스펙 착수 후 재개.
- [ ] **議곕┰???꾨＼?꾪듃 ?쇱씠釉뚮윭由?`ai/prompts`) 援ъ텞**: ?쇰Ц ?앹꽦 ?뚯툩(Methods, Results ??, 臾몄꽌 ?댁“ ?뚯툩(Journal, Report), 寃利??꾩슜 ?뚯툩濡?嫄곕????⑥씪 ?꾨＼?꾪듃瑜?遺꾪븷 (?곸꽭: `ai/PROMPT_REGISTRY_PLAN.md` 李몄“).
- [ ] **?뱀뀡/紐⑹쟻蹂??꾩슜 ?꾨＼?꾪듃 ?앹꽦**: ?듦퀎 寃곌낵 ?섏튂?? 洹몃옒???⑦꽩, ?앺깭??遺꾩빞蹂꾨줈 理쒖쟻?붾맂 ?꾨＼?꾪듃 ?쒗뵆由??뚯씪 ?앹꽦 諛??숈옉 ?뚯뒪??
- [ ] **?먮룞 寃利??뚯씠?꾨씪??Cross-Model Review) 湲고쉷**: ?묒꽦 ?꾩슜 紐⑤뜽怨?寃???꾩슜 紐⑤뜽(?ㅻ쪟泥댁빱, ?⑺듃泥댁빱 ??븷)??援먯감 ?ъ엯??泥닿퀎???뺤씤??媛?ν븯?꾨줉 UX 湲고쉷.

## 6. Diagnostic Pipeline 湲곗닠 遺梨?(湲곕뒫쨌?고????곹뼢 ?놁쓬)

?곸꽭: [`stats/docs/superpowers/specs/diagnostic-pipeline-tech-debt.md`](stats/docs/superpowers/specs/diagnostic-pipeline-tech-debt.md)

### ?꾨즺
- [x] TD-3: Worker ?묐떟 ???以묐났 ??`worker-result-types.ts` 異붿텧 (`9ce2689e`)
- [x] TD-6: MIN_GROUP_SIZE ?곸닔 以묐났 ??`statistical-constants.ts` 異붿텧 (`9ce2689e`)
- [x] TD-7: 洹몃９ 蹂???닿껐 濡쒖쭅 以묐났 ??`resolveGroupVariable()` 異붿텧 (`9ce2689e`)
- [x] TD-1: suggestedSettings ??handler ?꾨떖 (Phase E) ??alternative/postHoc 吏??
- [x] TD-5: JSON 異붿텧 regex ?듯빀 ??`lib/utils/json-extraction.ts`
- [x] TD-2: auto 셀렉터 11개 메서드를 7개 전용 SelectorType으로 이전 (`8b9d54fc`, 2026-04-08)

### 以묎컙 (肄붾뱶 ?덉쭏)
- [x] TD-4: Pyodide lazy init ?⑦꽩 以묐났 ??`ensurePyodideReady()` 異붿텧

### ??쓬
- [x] TD-8: goToPreviousStep() ??Phase D?먯꽌 ?대? ?닿껐??
- [x] TD-9: experiment-design ?몃옓 ??data-consultation ?≪닔 ?꾨즺

## 7. Smart Flow Step 3 공통 UX 후속 작업 (2026-04-09)

### 현재 완료
- [x] chi-square 계열, mcnemar, proportion-test를 공통 `UnifiedVariableSelector`로 통합
- [x] `variable-requirements` 기반 슬롯/역할 옵션 패널 1차 반영
- [x] `analysisOptions.methodSettings` 기반 공통 옵션 저장/실행 경로 연결
- [x] Step 3에 `MethodGuidancePanel` 추가

### 다음 우선순위
- [x] mismatch 감지 시 `다른 방법 찾아보기` CTA 추가 (MethodFitBanner `actionCtaLabel` + `method-fit-action` data-testid)
- [x] `AutoConfirmSelector` UI 보강 (`a749331b`, 2026-04-10)
- [x] handler 계층에 `methodSettings` 전달 연결 (`7ed3db6c`, 2026-04-10)
- [x] `variable-requirements`의 `notes` / `dataFormat` 필드 Step 3 표시 (`MethodGuidancePanel`)
- [ ] Step 4 결과 화면에 분석 옵션 표시 (`alternative`, `postHoc`, `ciMethod` 등) 추가
- [ ] Step 3 E2E/스모크 테스트 시나리오 추가 (click-first, slot 가드, 역할 필터)

### 타입 검증
- [x] `pnpm exec tsc --noEmit` 통과 (2026-04-14 확인, 0 errors)

### 검증 파일
- [ ] `stats/docs/plans/2026-04-09-common-variable-assignment-ux-spec.md`
- [ ] `stats/components/analysis/variable-selector/UnifiedVariableSelector.tsx`
- [ ] `stats/components/analysis/variable-selector/AnalysisOptions.tsx`
- [ ] `stats/components/analysis/steps/VariableSelectionStep.tsx`
- [ ] `stats/components/analysis/steps/AnalysisExecutionStep.tsx`

## 8. Statistics UI Polish Follow-up (2026-04-10)

- [ ] 모바일 해상도에서 Hub hero, 빠른 분석 pills, 보조 도구 카드 밀도 재점검 *(모바일 보류 — 배포 후)*
- [ ] 결과 화면 우측 히스토리 사이드바 정보 밀도와 액션 노출 수준 재조정
- [ ] 결과 화면 Hero 메타 영역에서 메서드별 중요 정보 우선순위 재정의
- [ ] AI 해석 카드의 섹션 pill/전체 보기 동작을 모바일과 긴 텍스트 기준으로 추가 검토 *(모바일 보류 — 배포 후)*
- [x] Data Exploration Step에서 업로드 교체 상태와 경고 배너의 시각적 우선순위 재검토 (`500dc963`, 2026-04-12)
- [x] 실제 사용자 시나리오 기준으로 Hub → Step 1 → Result 전체 흐름 e2e 스모크 테스트 추가 (`c91cff4c`, 2026-04-13 (부분 — 사이드바+smoke-test.mjs))
