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
- [ ] **[P1] Legend orient schema drift 방지**: `converters/shared.ts:623-624`의 `TOP_ORIENTS`/`BOTTOM_ORIENTS` Set이 `chart-spec-schema.ts:56-59`의 zod enum SSOT와 독립 선언. `top-center` 등이 schema에 추가되면 silent fall-through. `legendSchema.shape.orient._def.values`에서 derive하거나 별도 `LEGEND_ORIENTS` 공용 상수 배열에서 schema도 derive.
- [ ] **[P2] 토큰 사전 + 유니코드 tokenizer 분리**: 5종 토큰 사전이 이미 `selectXYFields`+`selectAutoColorField` 2곳에서 사용 (3번째 도입 임박). `stats/lib/graph-studio/chart-spec-heuristics.ts`로 분리 + `normalizeFieldName`의 정규식을 `/[^a-z0-9]+/` → `/[^\p{L}\p{N}]+/u`로 변경하여 한국어 사전 추가를 pure additive 확장으로 만들 것.
- [ ] **[P2] `selectXYFields → selectAutoColorField` 통합 테스트 (완료 `e18a6e4a` 이후)**: 통합 케이스 1건 추가 완료 (`xField=treatment_id` 선택 후 auto-color가 species로 빠지는 시나리오). 추가 케이스 후보: `length_cm + weight_g + species` → X=species, Y=weight_g, color=null(species=X이므로 제외) 확인.
- [ ] **[P2] `legend.top(px)` vs `grid.top(%)` 산술 guard**: 작은 캔버스(<200px) 또는 `titleSize >= 24`에서 legend가 plot 영역 침범 가능. `buildBaseOption`에 runtime guard 추가: `legendTopBelowTitle(px) / chartHeightEstimate > 0.18` 시 fallback(legend 높이 축소 or grid.top 재조정).
- [ ] **[P3] `components/common/index.ts` barrel 갱신 (완료 `SortablePinnedCardGrid`)**: 추가됨. 이후 `common/` 신규 컴포넌트는 barrel 동기 필수.
- [ ] **[P3] `MAX_PINNED_TOOLS` 팩토리 파라미터화**: `createPinnedToolsStore(persistKey)` — 현재 6 하드코딩. 미래 다른 한도(e.g., favorite analyses 10개)가 생길 때 `createPinnedToolsStore(persistKey, { maxItems = 6 } = {})`로 확장. 지금 선제 구현 불필요 — YAGNI.
- [ ] **[P3] `app/genetics/page.tsx` `tool.ready` 필터 회귀 테스트**: L203, L210의 `.filter((tool): tool is Tool => Boolean(tool) && tool.ready)` 필터가 load-bearing (미래 `ready: false` 추가 시 tool 숨김). 현재 모든 tool이 `ready: true`라 필터 효과 없어 테스트 미작성. 페이지 전체 mock 비용 과함 → 필터 로직만 pure 함수로 추출(`filterReadyTools(ids, map)`)한 뒤 단위 테스트 추가하는 방식이 저비용.
- [ ] **[P3] Bisect quirk — `e18a6e4a`**: barrel이 `analysisVizTypeToChartType` 재-export하지만 이 symbol은 `b94b7bb2`에서야 `chart-spec-utils.ts`에 추가됨. 해당 SHA에서 fresh checkout + tsc 시 실패. 원인: 내 barrel 커밋 staging 시 다른 세션 uncommitted 변경도 함께 포함됨. 실용상 main은 정상, bisect 특수 케이스만 영향. history rewrite 불필요.
- [ ] **[P3] CLAUDE.md Graph Studio 토큰 휴리스틱 섹션**: 5종 토큰 사전(ID/CATEGORY/TIME/RESPONSE/PREDICTOR)과 스코어 가중치가 implicit contract. 향후 기여자가 토큰 추가/제거 시 회귀 유발 가능 → CLAUDE.md나 `stats/docs/graph-studio/`에 휴리스틱 설계 문서화.
- [ ] **[P2] `patternSummary` Textarea readonly 전환 + 자동 생성 라벨**: [PackageBuilder.tsx:238-244](stats/components/papers/PackageBuilder.tsx#L238-L244) Textarea가 편집 가능이지만 [PackageBuilder.tsx:451](stats/components/papers/PackageBuilder.tsx#L451) refresh 시 자동 생성본으로 덮어써짐 → silent data loss. 커밋 `685c19fe`에서 저자가 의도적으로 "자동 파생 필드"로 재정의했으므로 UI 계약도 동기화 필요. `readOnly` prop + 레이블 "📊 분석 결과 기반 자동 생성" 추가. 사용자 커스텀 워딩은 최종 DOCX export에서 수행. 구현 ~10줄 + refresh-preservation 테스트 1건 업데이트.

### Graph Studio architecture stabilization follow-up (2026-04-14)
- [ ] 계획 문서 기준선 확정: [`stats/docs/graph-studio/PLAN-ARCHITECTURE-STABILIZATION.md`](stats/docs/graph-studio/PLAN-ARCHITECTURE-STABILIZATION.md) 기준으로 기존 계획과 충돌 지점 정리 + 유지할 기존 결정 명시
- [x] **[P1] project restore compatibility 강화**: 동일 필드명만으로 기존 `chartSpec`을 재부착하지 않도록 dataset compatibility 기준 재설계. (`graph-studio-store.ts`, `graph-studio-store.test.ts`, 2026-04-14)
- [x] **[P1] preview/export contract 일치화**: preview 배경과 PNG/SVG export 배경이 같은 `style.background` 경로를 따르도록 정리. (`export-utils.ts`, `export-utils.test.ts`, 2026-04-14)
- [ ] **[P2] session / persistence coordinator 분리**: route sync, project detach, draft chat lifecycle, snapshot save 의미를 한 수명 주기로 재구성.
- [x] **[P2] save transaction semantics 정리**: metadata 저장 성공과 snapshot 저장 실패가 사용자에게 같은 "저장 완료"로 보이지 않게 상태와 토스트 기준 정리. (`GraphStudioContent.tsx`, `GraphStudioContent-save.test.tsx`, 2026-04-14)
- [x] **[P2] chart capability registry 도입**: preview/export/overlay/facet/style capability를 chart type별 단일 선언으로 통합. (`chart-capabilities.ts`, `ChartPreview.tsx`, `useDataTabLogic.ts`, `useStyleTabLogic.ts`, `echarts-converter.ts`, `matplotlib-compat.ts`, `chart-capabilities.test.ts`, 2026-04-14)
- [x] **[P2] matplotlib export contract 정렬**: preview와 동일 재현이 안 되는 spec(feature-level mismatch)은 preflight에서 차단하고, dialog/service가 같은 validation 규칙을 공유하도록 정리. (`matplotlib-compat.ts`, `ExportDialog.tsx`, `matplotlib-export.service.ts`, `matplotlib-compat.test.ts`, `matplotlib-export.service.test.ts`, 2026-04-14)
- [x] **[P2] editor action layer 공용화**: `LeftDataPanel`, `DataTab`, `ChartSetupPanel`, AI patch apply 경로의 field assignment / chart mutation 규칙을 공용 action helper로 통합. (`editor-actions.ts`, `LeftDataPanel.tsx`, `useDataTabLogic.ts`, `ChartSetupPanel.tsx`, `use-ai-chat.ts`, `editor-actions.test.ts`, `use-ai-chat.test.ts`, 2026-04-14)
- [x] **[P3] ambient research project 의존 제거**: `saveCurrentProject()`가 외부 active project singleton을 직접 읽지 않도록 session binding(`linkedResearchProjectId`) 경로로 정리. (`graph-studio-store.ts`, `graph-studio-store.test.ts`, 2026-04-14)

## 1. 시각화 및 UX 컴포넌트 고도화
- [x] AI 해석의 요약 (결론 도출 근거) 정보를 결과 카드에 축약하여 노출 (Hero Card의 AI 요약 첫 줄) (2026-04-07)
- [x] 분석 유형별(통계 메서드별) 기본 시각화 컴포넌트 매핑 일관성 확보 (`b94b7bb2`, 2026-04-14 analysisVizTypeToChartType + adapter 우선 priority + AnalysisVizType union)
- [ ] 사용자 언어(질문 기반)가 통계 엄밀함을 해치는지 확인하고 문구 미세 조정 및 모니터링 *(부분 — terminology 인프라 구축, 자동 검증 lint 없음)*
- [ ] **ResultsActionStep 훅 추출**: useResultsExport, useResultsHistory, useResultsNavigation, usePaperDraft 분리 (1158줄 → 핸들러 로직 캡슐화, 2026-04-14 실측)

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
- [x] Step 4 결과 화면에 분석 옵션 표시 (`alternative`, `postHoc`, `ciMethod` 등) 추가 (2026-04-14 formatAnalysisOptionBadges + HeroCard 메타 row, 9/9 테스트)
- [x] Step 3 E2E/스모크 테스트 시나리오 추가 (click-first, slot 가드, 역할 필터) (2026-04-14 역할 필터 5개 시나리오 추가, 11/11 통과)

### 타입 검증
- [x] `pnpm exec tsc --noEmit` 통과 (2026-04-14 확인, 0 errors)

### 검증 파일
- [ ] `stats/docs/plans/2026-04-09-common-variable-assignment-ux-spec.md`
- [ ] `stats/components/analysis/variable-selector/UnifiedVariableSelector.tsx`
- [ ] `stats/components/analysis/variable-selector/AnalysisOptions.tsx`
- [ ] `stats/components/analysis/steps/VariableSelectionStep.tsx`
- [ ] `stats/components/analysis/steps/AnalysisExecutionStep.tsx`


### Section 7 후속 playbook (별도 세션)
- [ ] Optional slot 테스트 추가 (ANCOVA covariate `required:false`) — multi-var 메서드 경로 가드
- [ ] Multi-slot 메서드 테스트 (one-way ANOVA 3-level factor, repeated-measures) — ANOVA 계열 regression 방지
- [ ] 엣지 픽스처 상태 검증 (ID 컬럼, uniqueCount=1/50+, 날짜 컬럼) — 실데이터 크래시 방지
- [ ] `CANDIDATE_STATUS_LABELS` → `lib/terminology/selector-labels.ts` 이관 — 드리프트 방지 (드리프트 증거 나온 후)
- [ ] `caution` 상태 재도입 (제품 요구 발생 시) — type union + labels + CSS + terminology 4포인트 동시 개방

### 사전 존재 이슈 (본 세션 스코프 외)
- [ ] Method-ID canonicalization drift — AES만 정규화, VSS/ResultsActionStep은 raw id. `useCanonicalSelectedMethod` 공유 hook 추출
- [ ] `variable-requirements` 라벨 워딩 재검토 — "등분산 가정 등분산 가정", "Welch ANOVA 표준 ANOVA" 중복/모순, option vs setting 라벨 분리 UX 결정 필요
## 8. Statistics UI Polish Follow-up (2026-04-10)

- [ ] 모바일 해상도에서 Hub hero, 빠른 분석 pills, 보조 도구 카드 밀도 재점검 *(모바일 보류 — 배포 후)*
- [ ] 결과 화면 우측 히스토리 사이드바 정보 밀도와 액션 노출 수준 재조정 *(부분 — `685c19fe` 액션 재배치, 내보내기 예정)*
- [x] 결과 화면 Hero 메타 영역에서 메서드별 중요 정보 우선순위 재정의 (`7b83b1cd`, 2026-04-10 ResultsHeroCard.tsx 96→52줄 + methodEntry 분기)
- [ ] AI 해석 카드의 섹션 pill/전체 보기 동작을 모바일과 긴 텍스트 기준으로 추가 검토 *(모바일 보류 — 배포 후)*
- [x] Data Exploration Step에서 업로드 교체 상태와 경고 배너의 시각적 우선순위 재검토 (`500dc963`, 2026-04-12)
- [x] 실제 사용자 시나리오 기준으로 Hub → Step 1 → Result 전체 흐름 e2e 스모크 테스트 추가 (`c91cff4c`, 2026-04-13 (부분 — 사이드바+smoke-test.mjs))
