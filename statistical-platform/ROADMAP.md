# 🗺️ Product Roadmap

**Project**: Statistical Analysis Platform
**Last Updated**: 2026-02-20

---

## ✅ Recently Completed

### Export 기본 기능 (Phase 10.5)
- [x] DOCX/Excel/HTML 3종 내보내기
- [x] ResultsActionStep 내보내기 다이얼로그 (포맷 선택 + 옵션)
- [x] AnalysisHistoryPanel 내보내기 다이얼로그
- [x] Methodology / References 생성 (method family 매핑)
- [x] Raw data preview (truncated)
- [x] 히스토리에 AI 해석(aiInterpretation) + APA 포맷 저장

### pyodide-statistics 리팩터 (Phase 5-2)
- [x] Generated 래퍼 전환 (~50개 메서드)
- [x] `any` 타입 제거 (~25개)
- [x] pyodide-statistics.ts 3287줄 → 1955줄 (-41%)

---

## 🚀 Priority 1: Phase 5-3 — pyodide-statistics 안정화

> 상세: [PHASE5-3-PLAN.md](docs/PHASE5-3-PLAN.md)

### Lane 1: 단기 안정화 (Current)
- [ ] **S1** 타입 명시 강화 — `performBonferroni` 인터페이스 분리, `calculateCorrelation` JSDoc
- [ ] **S2** Adapter 레이어 — `clusterAnalysis` alias 후처리 분리 + 하위호환 테스트
- [ ] **S3** `performPCA` 레거시 정책 명시 + 사용처 스캔
- [ ] **S4** 미구현 메서드 TODO 추적 문서화

### Lane 2: Track A — 결과 계약 통합
- [ ] method별 source-of-truth 필드 정의 (계약 맵)
- [ ] `ExecutorResult → UI AnalysisResult` 단일 어댑터 표준화
- [ ] 새 메서드 추가 시 계약 맵 갱신 강제 (린트/테스트 가드)

### Lane 3: Track B — methods-registry v2
> 상세: [PHASE5-3-TRACK-B-REGISTRY-V2.md](docs/PHASE5-3-TRACK-B-REGISTRY-V2.md)
- [ ] 스키마 확장 (status, deprecated, replacement, since)
- [ ] 생성기 + 타입 업데이트
- [ ] 레지스트리 데이터 마이그레이션

---

## 🚀 Priority 2: Export 기능 고도화

### 1. 📊 Chart & Graph Export (Critical)
**Status**: ❌ Missing
**Priority**: High
- [ ] Chart image capture (html2canvas 또는 Recharts toDataURL)
- [ ] **Word**: `docx` ImageRun으로 이미지 삽입
- [ ] **HTML**: Base64 인코딩으로 이미지 임베드

### 2. 📝 Export 옵션 통일
**Status**: ⚠️ Partial
**Priority**: Medium
- [x] ResultsActionStep 내보내기 다이얼로그 (옵션 연결 완료)
- [x] AnalysisHistoryPanel 내보내기 다이얼로그 (옵션 연결 완료)
- [ ] 레거시 ResultActionButtons 등 나머지 진입점 옵션 통일

---

## 🔮 Priority 3: Bio-Tools (Phase 15)

- [ ] Worker 5 (ecology): biodiversity, community analysis
- [ ] Worker 6 (bio): growth curves, meta-analysis, bio-tests
- [ ] 5개 페이지 UI 구현
- [ ] methods-registry에 Bio 메서드 등록

---

## 🔮 Future Improvements

### Smart Flow Enhancements
- [ ] Advanced Variable Selectors (Mixed Models, Repeated Measures)
- [ ] EDA Reports (distribution plots, correlation matrices)

### Performance & Infrastructure
- [ ] Large Data Handling (> 10,000 rows)
- [ ] Server-Side Generation (heavy reports)
