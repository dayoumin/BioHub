# Code Review — 원격 머지 24커밋 (2026-03-23)

> 범위: ab8ae9a7..26d7a601 (136파일, +15,701 / -665)
> 리뷰어: Claude Opus 4.6 서브에이전트 4개 (genetics, bio-tools, trust/projects, infra)

---

## 높음 (8건)

### H-1. Worker 번호 불일치 — Fisheries 런타임 100% 실패
- **파일**: `stats/lib/generated/method-types.generated.ts`
- **상태**: 🔴 미수정
- **설명**: `WORKER.FISHERIES = 6`으로 하드코딩되어 있으나 실제 Worker 6은 matplotlib. Fisheries는 Worker 7. `callWorkerMethod(6, 'fit_vbgf', ...)` 호출 시 matplotlib Worker 로드 → 메서드 미존재 에러.
- **수정**: `FISHERIES: 7`, `ECOLOGY: 8`로 변경. `callWorkerMethod` 호출도 6→7.

### H-2. D1 INTEGER→TEXT 타임스탬프 마이그레이션
- **파일**: `migrations/0001_init.sql`, `packages/db/src/schema.ts`
- **상태**: 🟡 확인 필요
- **설명**: `created_at`/`updated_at`가 INTEGER에서 TEXT(ISO 8601)로 변경. 기존 DB 데이터가 있으면 호환성 깨짐.
- **수정**: 프로덕션 DB 없으면 문제 없음. 있으면 별도 마이그레이션 필요.

### H-3. HistorySidebar activeHistoryId URL 변경 미갱신
- **파일**: `stats/components/genetics/HistorySidebar.tsx:14-16`
- **상태**: 🔴 미수정
- **설명**: `useEffect([], [])`로 초기 마운트 시에만 설정. layout에서 렌더링되어 리마운트 안 됨 → 히스토리 클릭해도 active 하이라이트 안 됨.
- **수정**: `router.push` 시 `setActiveHistoryId` 동시 업데이트.

### H-4. BlastResult.createdAt number→string 마이그레이션 불완전
- **파일**: `packages/types/src/blast.ts:55`
- **상태**: 🟡 확인 필요
- **설명**: 서버 측 BlastResult.createdAt만 string으로 변경. 클라이언트 AnalysisHistoryEntry.createdAt은 number 유지. DB 읽기 코드에서 기존 number 데이터와 새 string 데이터 혼재 가능.
- **수정**: DB 읽기 코드에 정규화 로직 추가 필요 (현재 읽기 코드 미구현이면 OK).

### H-5. PaperDraftPanel dangerouslySetInnerHTML 미살균
- **파일**: `stats/components/analysis/steps/PaperDraftPanel.tsx`
- **상태**: 🔴 미수정
- **설명**: `TableRenderer`가 `table.htmlContent`를 `dangerouslySetInnerHTML`로 렌더링. CSV 컬럼명 등 사용자 데이터가 이스케이프 없이 삽입되면 XSS.
- **수정**: 생성 측에서 이스케이프 확인 또는 DOMPurify 추가.

### H-6. 코드 템플릿 alternative 값 인젝션 위험
- **파일**: `stats/lib/services/export/code-templates/t-test.ts` 등
- **상태**: 🔴 미수정
- **설명**: `alternative` 값이 화이트리스트 없이 R/Python 코드 문자열에 직접 삽입. 악의적 입력 시 코드 인젝션 가능.
- **수정**: `VALID_ALTERNATIVES = ['two-sided', 'less', 'greater']` 화이트리스트 추가.

### H-7. code-export.ts unsafe `as` casts
- **파일**: `stats/lib/services/export/code-export.ts:171,179-187`
- **상태**: 🔴 미수정
- **설명**: `results.statistic as number` 등 런타임 검증 없는 캐스트. `undefined`이면 `toFixed(4)` 에서 throw.
- **수정**: `as` 제거, `buildExpectedResults`가 이미 `typeof` 체크하므로 raw 값 전달.

### H-8. BioCsvUpload clear 시 부모 미통보
- **파일**: `stats/components/bio-tools/BioCsvUpload.tsx`
- **상태**: 🔴 미수정
- **설명**: X 버튼 클릭 시 로컬 상태만 리셋, 부모의 `csvData`는 stale 유지.
- **수정**: `onClear` 콜백 추가 또는 `onDataLoaded(null)` 호출.

---

## 중간 (14건)

### M-1. methods-registry.json Worker 7(fisheries) 누락
- **파일**: `stats/lib/constants/methods-registry.json`
- **상태**: 🔴 미수정

### M-2. Intent Router 0.7→0.6 false positive 위험
- **파일**: `stats/lib/services/intent-router.ts:134`
- **상태**: 🟡 확인 필요

### M-3. 한국어 DIRECT_INTENT_PATTERNS 과도하게 광범위
- **파일**: `stats/lib/services/intent-router.ts:115-116`
- **상태**: 🟡 확인 필요

### M-4. fetchBlastResult abort 체크 일관성
- **파일**: `stats/components/genetics/BlastRunner.tsx:403-423`
- **상태**: 🟢 낮은 실제 위험 (sleep이 AbortError throw)

### M-5. speciesPromise catch가 모든 에러 삼킴
- **파일**: `stats/components/genetics/BlastRunner.tsx:145-146`
- **상태**: 🔴 미수정

### M-6. accession 매핑 덮어쓰기 가능성
- **파일**: `src/worker.ts:592-603`
- **상태**: 🟡 확인 필요 (의도적일 수 있음)

### M-7. MARKER_DISPLAY_NAMES 불완전
- **파일**: `stats/lib/genetics/decision-engine.ts:206-209`
- **상태**: 🟡 낮은 실제 위험 (fallback 있음)

### M-8. BIO_TABLE 토큰 미사용 (4페이지)
- **파일**: icc, meta-analysis, roc-auc, survival 페이지
- **상태**: 🔴 미수정

### M-9. Mantel Test — useBioToolAnalysis 미사용
- **파일**: `stats/app/bio-tools/mantel-test/page.tsx`
- **상태**: 🟡 의도적 편차 가능 (dual CSV)

### M-10. NMDS/PERMANOVA pre-step 에러 미처리
- **파일**: nmds/page.tsx, permanova/page.tsx
- **상태**: 🔴 미수정

### M-11. ReportComposer drag stale closure
- **파일**: `stats/components/projects/ReportComposer.tsx`
- **상태**: 🔴 미수정

### M-12. APA 95% CI 하드코딩
- **파일**: `stats/lib/research/report-apa-format.ts:64`
- **상태**: 🟡 확인 필요

### M-13. markdownToSimpleHtml th/thead 미구분
- **파일**: `stats/lib/research/report-export.ts`
- **상태**: 🔴 미수정

### M-14. Kruskal-Wallis R — JSON.stringify → safeRString
- **파일**: `stats/lib/services/export/code-templates/nonparametric.ts:144,154`
- **상태**: 🔴 미수정

---

## 낮음 (16건) — 나중에 검토

### L-1. speciesPromise await — abort 후 불필요한 대기 (BlastRunner.tsx:152)
### L-2. HistorySidebar 초기 open:true — 빈 히스토리 시 사이드바 표시 (HistorySidebar.tsx:17)
### L-3. submit 429 재시도 submitRes 타입 (BlastRunner.tsx:91)
### L-4. genetics/page.tsx Escape 키 리스너 불필요 등록 (page.tsx:100)
### L-5. `as` casts on select e.target.value (beta-diversity, icc, mantel, meta-analysis)
### L-6. results.metric cast from Python worker (beta-diversity:259)
### L-7. PERMANOVA silently reduces permutations (worker8-ecology.py:312)
### L-8. Mantel/PERMANOVA raw pValue display (mantel:749, permanova:1410)
### L-9. module-level getBioToolById null guard 반복
### L-10. evidence-factory Math.random() ID 충돌 위험 (evidence-factory.ts:20)
### L-11. downloadTextFile DOM appendChild 누락 (PaperDraftPanel.tsx)
### L-12. EntityBrowser dangling entity empty state (EntityBrowser.tsx)
### L-13. report-export HTML table regex fragile (report-export.ts)
### L-14. ProjectHeader onBlur+Enter 이중 save (ProjectHeader.tsx:73)
### L-15. ProjectDetailContent dead state refs (ProjectDetailContent.tsx:31)
### L-16. ProjectDetailContent loading 미리셋 (ProjectDetailContent.tsx:33)

---

## 수정 우선순위

1. **즉시**: H-1 (Worker 번호 — 런타임 실패), H-6 (인젝션), H-7 (unsafe casts), H-8 (clear 미통보)
2. **빠른 시일**: H-3 (히스토리 하이라이트), H-5 (XSS), M-5 (catch), M-8 (BIO_TABLE), M-10 (에러 미처리), M-14 (safeRString)
3. **확인 후 결정**: H-2, H-4, M-2, M-3, M-6, M-7, M-9, M-12
4. **나중에**: L-1 ~ L-16
