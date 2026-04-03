---
name: Result Display Unification Plan
description: 3개 결과 표시 시스템 통합 계획 — Analysis Flow(표준) / Legacy(유지) / Bio-Tools(래퍼 적용)
type: project
---

결과 표시 시스템 통합이 필요. 3개 시스템 존재:

1. **Analysis Flow** (표준): `components/analysis/steps/results/` 6개 서브컴포넌트, Phased reveal + AI + Q&A
2. **Legacy Statistics** (유지): `components/statistics/common/StatisticalResultCard.tsx` 모노리식, 43개 페이지
3. **Bio-Tools** (개선 필요): 도구별 원시 테이블, 공통 래퍼 없음

**Why:** 같은 데이터(p-value, 효과크기)가 다른 레이아웃으로 표시되어 사용자 학습 전이 안 됨. 신뢰 훼손.

**How to apply:**
- Analysis Flow 패턴 = 표준 (Hero → Stats Grid → AI → Charts → Diagnostics)
- Legacy 43개 페이지는 CLAUDE.md 규칙상 신규 개발 안 함 — 그대로 유지
- Bio-Tools에 공통 결과 래퍼 적용 (BioResultDisplay)
- 공유 컴포넌트: StatisticCard, 효과크기 해석, p-value 포맷을 `components/common/results/`로 추출
- 타입: `UnifiedStatisticalResult` 인터페이스 + 어댑터 패턴
- 2026-04-02 승인됨. Phase 단위로 점진 구현.
