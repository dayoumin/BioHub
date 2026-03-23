# Code Review — 원격 머지 24커밋 (2026-03-23)

> 범위: ab8ae9a7..26d7a601 (136파일, +15,701 / -665)
> 리뷰어: Claude Opus 4.6 서브에이전트 4개 (genetics, bio-tools, trust/projects, infra)

---

## 높음 (8건)

### H-1. Worker 번호 불일치 — Fisheries 런타임 100% 실패
- **파일**: `stats/lib/generated/method-types.generated.ts`
- **상태**: ✅ 수정 완료 — `FISHERIES: 7`, `ECOLOGY: 8`, `MATPLOTLIB: 6` 추가. `callWorkerMethod` 3곳 수정.

### H-2. D1 INTEGER→TEXT 타임스탬프 마이그레이션
- **파일**: `migrations/0001_init.sql`, `packages/db/src/schema.ts`
- **상태**: 🟡 확인 필요
- **설명**: `created_at`/`updated_at`가 INTEGER에서 TEXT(ISO 8601)로 변경. 기존 DB 데이터가 있으면 호환성 깨짐.
- **수정**: 프로덕션 DB 없으면 문제 없음. 있으면 별도 마이그레이션 필요.

### H-3. HistorySidebar activeHistoryId URL 변경 미갱신
- **파일**: `stats/components/genetics/HistorySidebar.tsx`
- **상태**: ✅ 수정 완료 — `router.push` 전에 `setActiveHistoryId(entry.id)` 추가.

### H-4. BlastResult.createdAt number→string 마이그레이션 불완전
- **파일**: `packages/types/src/blast.ts:55`
- **상태**: 🟡 안전 — D1 읽기 코드 미구현, localStorage만 사용 (number). 수정 불필요.

### H-5. PaperDraftPanel dangerouslySetInnerHTML 미살균
- **파일**: `stats/components/analysis/steps/PaperDraftPanel.tsx`
- **상태**: ✅ 확인 완료 — `paper-tables.ts`의 `htmlTable()`에서 `escapeHtml()` 적용 확인. 주석 추가.

### H-6. 코드 템플릿 alternative 값 인젝션 위험
- **파일**: `stats/lib/services/export/code-export.ts`
- **상태**: ✅ 수정 완료 — `VALID_ALTERNATIVES` Set + `sanitizeAlternative()` 함수 추가.

### H-7. code-export.ts unsafe `as` casts
- **파일**: `stats/lib/services/export/code-export.ts`
- **상태**: ✅ 수정 완료 — `as number` 4곳 제거, `typeof` 가드 + `extractNumericEffectSize` 헬퍼.

### H-8. BioCsvUpload clear 시 부모 미통보
- **파일**: `stats/components/bio-tools/BioCsvUpload.tsx`, `use-bio-tool-analysis.ts`, 10개 페이지
- **상태**: ✅ 수정 완료 — `onClear` 콜백 prop + hook `handleClear` 함수 + 모든 consumer 연결.

---

## 중간 (14건)

### M-1. methods-registry.json Worker 6(matplotlib) 누락
- **파일**: `stats/lib/constants/methods-registry.json`
- **상태**: ✅ 수정 완료 — worker6 (matplotlib, render_chart) 추가. worker7/8은 이미 존재.

### M-2. Intent Router 0.7→0.6 false positive 위험
- **파일**: `stats/lib/services/intent-router.ts:134`
- **상태**: 🟡 보류 — false positive 위험 있지만 실질 피해 낮음, 다음 사이클

### M-3. 한국어 DIRECT_INTENT_PATTERNS 과도하게 광범위
- **파일**: `stats/lib/services/intent-router.ts:115-116`
- **상태**: 🟡 보류 — M-2와 동일

### M-4. fetchBlastResult abort 체크 일관성
- **파일**: `stats/components/genetics/BlastRunner.tsx:403-423`
- **상태**: 🟢 낮은 실제 위험 (sleep이 AbortError throw)

### M-5. speciesPromise catch가 모든 에러 삼킴
- **파일**: `stats/components/genetics/BlastRunner.tsx:145-146`
- **상태**: ✅ 수정 완료 — AbortError만 무시, 나머지 console.warn

### M-6. accession 매핑 덮어쓰기 가능성
- **파일**: `src/worker.ts:592-603`
- **상태**: 🟡 확인 필요 (의도적일 수 있음)

### M-7. MARKER_DISPLAY_NAMES 불완전
- **파일**: `stats/lib/genetics/decision-engine.ts:206-209`
- **상태**: 🟡 낮은 실제 위험 (fallback 있음)

### M-8. BIO_TABLE 토큰 미사용 (4페이지)
- **파일**: icc, meta-analysis, roc-auc, survival 페이지
- **상태**: ✅ 이미 적용됨 — 4페이지 모두 BIO_TABLE 토큰 사용 중 확인.

### M-9. Mantel Test — useBioToolAnalysis 미사용
- **파일**: `stats/app/bio-tools/mantel-test/page.tsx`
- **상태**: ✅ 정상 — dual-CSV 아키텍처 의도적 편차

### M-10. NMDS/PERMANOVA pre-step 에러 미처리
- **파일**: nmds/page.tsx, permanova/page.tsx
- **상태**: ✅ 수정 완료 — try-catch 추가됨.

### M-11. ReportComposer drag stale closure
- **파일**: `stats/components/projects/ReportComposer.tsx`
- **상태**: ✅ 정상 — dependency array 정확, 문제 아님

### M-12. APA 95% CI 하드코딩
- **파일**: `stats/lib/research/report-apa-format.ts:64`
- **상태**: 🟡 보류 — 모든 메서드 95% 기본, 실질 영향 없음

### M-13. markdownToSimpleHtml th/thead 미구분
- **파일**: `stats/lib/research/report-export.ts`
- **상태**: ✅ 수정 완료 — 상태 기반 파싱으로 전환, thead/th 구분 구현.

### M-14. Kruskal-Wallis R — JSON.stringify → safeRString
- **파일**: `stats/lib/services/export/code-templates/nonparametric.ts:144,154`
- **상태**: ✅ 수정 완료

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
