# Graph Studio 문서

Graph Studio(차트 빌더) 관련 설계·분석·리뷰 문서 모음.

## 파일 목록

| 파일 | 내용 | 작성일 |
|------|------|--------|
| [GRAPH_STUDIO_ADR.md](GRAPH_STUDIO_ADR.md) | 아키텍처 결정 기록 (ADR) — 기술 스택 선택 근거 | 2026-02-28 |
| [GRAPH_STUDIO_EXPANSION_ADR.md](GRAPH_STUDIO_EXPANSION_ADR.md) | G2 기능 확장 ADR (유의성 마커, 회귀선, 이중 Y축, 패싯) | 2026-02-28 |
| [GRAPH_STUDIO_ECHARTS_REVIEW.md](GRAPH_STUDIO_ECHARTS_REVIEW.md) | ECharts 전환 기술 리뷰 (D3 vs ECharts 비교) | 2026-02-28 |
| [GRAPH_STUDIO_AI_REVIEW.md](GRAPH_STUDIO_AI_REVIEW.md) | AI 코드 리뷰 결과 (G1 완료 시점) | 2026-02-28 |
| [REVIEW-GRAPH-STUDIO-ONBOARDING.md](REVIEW-GRAPH-STUDIO-ONBOARDING.md) | 온보딩 UX 리뷰 — 샘플 데이터, 첫 화면 | 2026-02-28 |
| [GRAPH_STUDIO_IMPROVEMENT_PLAN.md](GRAPH_STUDIO_IMPROVEMENT_PLAN.md) | G2+G2.5 개선 계획 전체 (경쟁사 분석 포함) | 2026-02-28 |
| [GRAPH_STUDIO_COMPETITIVE_ANALYSIS.md](GRAPH_STUDIO_COMPETITIVE_ANALYSIS.md) | 경쟁사 심층 분석 (Prism/Origin/ggplot2/웹도구) + Gap Analysis | 2026-03-01 |

## 관련 코드 위치

- 구현: `stats/lib/graph-studio/`, `stats/components/graph-studio/`
- 타입: `stats/types/graph-studio.ts`
- 테스트: `stats/__tests__/graph-studio/`
