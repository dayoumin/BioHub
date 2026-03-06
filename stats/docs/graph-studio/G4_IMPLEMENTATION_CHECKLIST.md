# G4 구현 체크리스트

> **상세 설계**: [GRAPH_STUDIO_G4_PLAN.md](GRAPH_STUDIO_G4_PLAN.md)
> **리뷰 커밋**: `330c79b3` (API/스키마 9건 수정)

---

## 전체 현황

| Phase | 작업 | 예상 | 상태 | 비고 |
|-------|------|------|------|------|
| G4.1 | Accordion 재설계 | 1주 | - | 다른 G4의 UI 틀 |
| G4.2 | 축 설정 확장 | 1주 | - | G4.1과 동시 가능 |
| G4.3 | Jitter Dots | 2주 | - | POC 먼저 |
| G4.4 | 에러바 상세 | 1주 | - | G1-4와 묶기 권장 |
| G4.5 | 선/마커 스타일 | 1주 | - | 독립 |
| G4.6 | Violin Plot | 3주 | - | 별도 스프린트 |
| G4.7 | Broken Axis | 1주 | - | G4.6과 병렬 가능 |

**총 예상: ~10주** (G4.1+G4.2 병렬 시 ~9주)

---

## G4.1 — Accordion 재설계

- [ ] DataTab: 빠른 시작 상단 고정 (Accordion 밖)
- [ ] DataTab: 차트 설정 / 데이터 매핑 / 통계 표현 Accordion 그룹
- [ ] DataTab: 색상 팔레트 → StyleTab으로 이동
- [ ] StyleTab: 학술 스타일 / 축 설정 / 텍스트 폰트 / 레이블 범례 / 선 마커 스타일 Accordion 그룹
- [ ] 조건부 렌더: 차트 유형별 불필요 섹션 완전 숨김

---

## G4.2 — 축 설정 확장

### UI만 추가 (컨버터 이미 있음)
- [ ] X축 레이블 각도 버튼 그룹 (0/-45/-90)
- [ ] Y축 그리드 Toggle
- [ ] X축 그리드 Toggle

### UI + 컨버터 수정
- [ ] Y축 0 포함 Toggle + 컨버터 `min: 0` 로직 (domain 우선)
- [ ] 축 레이블 폰트 크기 (Y/X) + 컨버터 개별값 우선
- [ ] 축 제목 폰트 크기 (Y/X) + 컨버터 개별값 우선
- [ ] 테스트: 컨버터 zero/fontSize 단위 테스트

---

## G4.3 — Jitter Dots

### POC (plain bar만)
- [ ] ECharts 6 `jitter` API 실제 동작 검증
- [ ] categorical xAxis에서 scatter x값 형태 확인 (문자열 vs 인덱스)
- [ ] rawData가 컨버터까지 집계 전 상태로 도달하는지 확인

### 스키마 확장 (5곳 동시)
- [ ] `types/graph-studio.ts` — `showRawPoints` 추가
- [ ] `chart-spec-schema.ts` — Zod 스키마 추가 (.strict() 유지)
- [ ] `echarts-converter.ts` — scatter overlay series 생성
- [ ] `ai-service.ts` — 시스템 프롬프트 설명 추가
- [ ] 테스트 — Zod 검증 + converter series + AI patch 왕복

### 분기별 구현 (POC 이후)
- [ ] plain bar
- [ ] bar + errorBar
- [ ] grouped-bar + color (그룹별 x 오프셋)
- [ ] stacked-bar + color
- [ ] error-bar 차트
- [ ] UI: DataTab > 통계 표현 섹션

---

## G4.4 — 에러바 상세

### 스키마 확장
- [ ] `ErrorBarSpec`에 `direction`, `capWidth` 추가
- [ ] Zod 스키마 확장
- [ ] 컨버터: `direction: 'positive'` → lowerBound = mean
- [ ] 컨버터: `capWidth` → renderItem 내부 상수(0.12) 교체
- [ ] ai-service 프롬프트 업데이트
- [ ] 테스트
- [ ] UI: DataTab > 통계 표현 섹션

---

## G4.5 — 선/마커 스타일

### 스키마 확장
- [ ] `ChartSpec` 루트에 `lineStyle`, `symbolStyle` 추가
- [ ] Zod 스키마 확장
- [ ] 컨버터: color group 시 `LINE_DASH_CYCLE`, `SYMBOL_CYCLE` 순환 할당
- [ ] ai-service 프롬프트 업데이트
- [ ] 테스트
- [ ] UI: StyleTab > 조건부 섹션 (line/scatter)

---

## G4.6 — Violin Plot (별도 스프린트)

### 사전 결정
- [ ] KDE 계산 방식 결정: A.Pyodide / B.순수JS / C.Pyodide lazy-load

### 구현
- [ ] KDE 계산 모듈
- [ ] `echarts-converter.ts` custom series `renderItem`
- [ ] 중앙 boxplot 겹치기 옵션 (`showBox`)
- [ ] 스키마/Zod/ai-service 확장
- [ ] 테스트

---

## G4.7 — Broken Axis

- [ ] `ScaleSpec`에 `axisBreaks` 추가 (`encoding.y.scale.axisBreaks`)
- [ ] Zod 스키마 확장
- [ ] 컨버터: ECharts 6 `yAxis.axisBreaks` 매핑
- [ ] ai-service 프롬프트 업데이트
- [ ] 테스트
- [ ] UI: StyleTab > 축 설정 > 축 불연속 범위 (기본 접힘)

---

## 리뷰 반영 이력

| 날짜 | 커밋 | 수정 건수 | 요약 |
|------|------|-----------|------|
| 2026-03-06 | `330c79b3` | 9건 | containZero→min:0, markLine→renderItem, 테스트 컬럼 추가, axisBreaks 위치, Jitter POC 전략, capWidth 단위, zero+domain 우선순위, lineStyle 위치, POC 검증 항목 |
