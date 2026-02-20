# TODO — Statistical Analysis Platform

**Updated**: 2026-02-20

---

## 현재 상태

| 영역 | 상태 | 비고 |
|------|------|------|
| Smart Flow (43개 메서드) | ✅ 완료 | Phase 13 — 유일한 통계 진입점 |
| Export (DOCX/Excel/HTML) | ✅ 기본 완료 | 차트 내보내기 미구현 |
| 히스토리 AI 해석 저장 | ✅ 완료 | aiInterpretation + apaFormat 전계층 |
| pyodide-statistics 리팩터 | ✅ Phase 5-2 완료 | Generated 래퍼 전환 + any 제거 |
| E2E 테스트 | ✅ 6/7 통과 | LLM 추천 timeout 1건 (낮은 우선순위) |
| Bio-Tools | 📋 계획 수립 | Phase 15 예정 |

---

## 다음 할일

### P0: Phase 5-3 — pyodide-statistics 안정화
> 상세: [PHASE5-3-PLAN.md](docs/PHASE5-3-PLAN.md)

- [ ] **S1** 타입 명시 강화 — `performBonferroni` 인터페이스 분리, `calculateCorrelation` JSDoc
- [ ] **S2** Adapter 레이어 — `clusterAnalysis` alias 후처리 분리 + 하위호환 테스트
- [ ] **S3** `performPCA` 레거시 정책 명시 + 사용처 스캔
- [ ] **S4** 미구현 메서드 TODO 추적 문서화

### P1: Export 개선
> 상세: [ROADMAP.md](ROADMAP.md)

- [ ] **차트/그래프 내보내기** — html2canvas 또는 Recharts toDataURL → DOCX/HTML 삽입
- [ ] 히스토리 외 내보내기 진입점에도 옵션 컨트롤 통일

### P2: Phase 5-3 Track A/B (중기)

- [ ] **Track A** 결과 계약 통합 — Generated/Executor/UI 타입 단일화
- [ ] **Track B** methods-registry v2 스키마 확장 (status, deprecated 등)

### P3: Bio-Tools (Phase 15)

- [ ] Worker 5 (ecology): biodiversity, community analysis
- [ ] Worker 6 (bio): growth curves, meta-analysis, bio-tests
- [ ] 5개 페이지 UI 구현

---

## 최근 작업 (7일)

### 2026-02-20
- Export 다이얼로그 + 히스토리 AI 해석 저장 + UI 정리 (`58296ba5`)

### 2026-02-19
- Registry v2 스키마 + Export HTML + 인프라 정리 (`f7a3b54b`)
- Phase 5-3 계획서 작성 (Lane 1~3 정의)
- ROADMAP.md 신규 작성

### 2026-02-18
- Smart Flow 스텝 개선 — MethodBrowser 리팩터 + 레이아웃 정리 (`00f0a5ee`)
- Hub 히스토리 인라인 UI + LLM 추천/해석 개선 (`0a464e59`)

### 2026-02-17
- LLM fallback flow 강화 + regression tests (`a5def93d`)
- Result contract guard + posthoc normalization (`3cb7a06a`)

### 2026-02-16
- DataExploration 비판적 검토 수정 (`42fd1305`)
- ResultsActionStep 코드 품질 개선 (`88395fe9`)
- 결과 내보내기 개선 — 파일 다운로드 + splitInterpretation (`8b897882`)

### 2026-02-15
- DataExplorationStep 성능 최적화 + 컴포넌트 분할 (`375e1974`)
- AI 해석 UI 중복 제거 + 프롬프트 품질 개선 (`36b67ed9`)

### 2026-02-14
- AI 해석 + LLM E2E 수정 — postHoc meanDiff 근본 해결 (`750837c3`)
- Smart Flow UI 디자인 폴리시 (`097cf35e`)
- PDF 서비스 제거 → Export 서비스 통합 (`9c95295b`)