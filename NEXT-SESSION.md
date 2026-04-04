# Next Session Checklist

**Last updated**: 2026-04-04
**Status**: 통계/유전/Graph Studio 정비 완료 → 다음 도메인 진입 준비

---

## 1. 이번 세션 완료 사항

### 통계 플랫폼 정비 (2 커밋)
- deprecated 16개 제거, 중복 3패턴 추출 (useLocalStorageSync, indexeddb-helpers, togglePinId)
- VarReqs 14개 ID alias 해소 (getMethodByIdOrAlias 재사용)
- Executor 14개 메서드 배선 완료:
  - Regression 6개 (logistic, poisson, ordinal, stepwise, dose-response, response-surface)
  - ANOVA 2개 (manova, mixed-model)
  - TimeSeries 2개 (arima, mann-kendall)
  - Descriptive 2개 (explore-data, means-plot)
  - Cluster ID 정규화 (`cluster-analysis` → `cluster`)
  - welch-anova: 구현 불필요 확인 (hasOwnPage:false)
- /simplify 2회 + 검증 테스트 25개
- 최종: TS 에러 0, 테스트 7090개 전체 통과

### 유전적 분석 점검
- Phase 2 코드 리뷰 15/15 PASS
- Bug 0-2 (localStorage 에러): 이미 수정됨 (7개 UI 호출처 toast 표시)
- genetics/ 스테일 디렉토리: 이미 정리됨

### Graph Studio 점검
- barrel export 보완 (deleteProjectCascade)
- 스키마 미렌더 필드 주석 추가

---

## 2. Graph Studio 별도 작업 (다음 세션)

### P1: echarts-converter.ts 분할 (2279줄)
- 30+ 차트 타입 함수가 단일 파일에 집중
- 분할 방안: `converters/bar.ts`, `converters/scatter.ts`, `converters/bio-curves.ts` + dispatch layer
- 예상: 2-3시간

### P2: 스키마-렌더러 정합성
- 7개 스키마 필드가 echarts-converter에서 무시됨 (shape, size, color.scale, legend.title, x/y.format, style.overrides, style.padding)
- AI 프롬프트에서만 문서화 — 코드 레벨 tracking 없음
- 선택: 렌더러에 구현하거나, 스키마에서 제거하거나, 명시적 `_unimplemented` 마커 추가

### P3: 컴포넌트 렌더링 테스트
- 로직 테스트 23개 있으나 컴포넌트 렌더링 테스트 0개
- AiPanel, ChartPreview, ExportDialog 등 대상

### P4: docs/graph-studio/README.md 업데이트
- 18개 문서 중 7개만 목록화

---

## 3. Executor 배선 계획 (완료 기록)

계획서: [2026-04-04-executor-varreqs-alignment.md](docs/superpowers/plans/2026-04-04-executor-varreqs-alignment.md)
- Task 1-7 전체 완료

---

## 4. 다음 도메인 진입

### GBIF 외부 DB 연동
- species-validation 레코드 스키마 정의
- legal-status 레코드 스키마 정의

### UniProt 연동 (3순위)
- 단백질 서열 분석 도구

---

## 5. 참조 문서

- **진행 상황**: [TODO.md](TODO.md) · [ROADMAP.md](ROADMAP.md)
- **Executor 계획**: [2026-04-04-executor-varreqs-alignment.md](docs/superpowers/plans/2026-04-04-executor-varreqs-alignment.md)
- **유전 계획**: [PLAN-GENETICS-IMPROVEMENT.md](docs/PLAN-GENETICS-IMPROVEMENT.md)
- **도메인 다음 단계**: [docs/databases/](docs/databases/)
