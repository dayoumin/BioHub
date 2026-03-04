# G2-3 코드 리뷰 브리핑

> **목적**: 외부 리뷰어(AI 또는 사람)가 Graph Studio G2-3 구현을 빠르게 파악하고 추가 결함을 찾을 수 있도록 구조화한 문서.

---

## 1. 기능 요약

G2-3은 Graph Studio ECharts converter에 두 가지 기능을 추가:

| 기능 | 설명 | 해당 차트 |
|------|------|-----------|
| **이중 Y축 (Dual Y-axis)** | `encoding.y2` 필드로 오른쪽 Y축 추가. bar→line, line→line 렌더. | bar, line |
| **패싯 (Facet)** | `facet: { field, ncol?, shareAxis?, showTitle? }`. ggplot2 `facet_wrap` 등가. 단일 ECharts 인스턴스 + 멀티 grid. | bar, scatter |

### 상호 배타 규칙
- **Y2 ↔ Facet**: 동시 사용 불가 (UI에서 하나만 노출)
- **Y2 ↔ Color**: Y2 있으면 color 그룹 비활성 (colors[1] 충돌 방지)
- **Facet ↔ Color**: Facet 있으면 color UI 숨김 (패싯이 이미 그룹 분리)
- **Facet ↔ ErrorBar**: Facet 있으면 errorBar UI 숨김 (멀티 grid에서 custom renderItem 미지원)
- **Facet ↔ Significance**: 멀티 grid에서 `convertToPixel` 단일 grid 가정 → 패싯 시 유의성 마커 무시
- **Y2 ↔ Horizontal**: 수평 막대에서 Y2 비활성 (축 구조 복잡)

---

## 2. 파일 구조 (리뷰 대상)

```
stats/
├── types/graph-studio.ts                      # 타입 정의 (310줄)
├── lib/graph-studio/
│   ├── chart-spec-defaults.ts                 # CHART_TYPE_HINTS, 팔레트, 프리셋
│   ├── chart-spec-schema.ts                   # Zod 스키마 (y2, facet 포함)
│   ├── facet-layout.ts                        # partitionRowsByFacet, computeFacetLayout (101줄)
│   └── echarts-converter.ts                   # ChartSpec → ECharts option (1520줄) ★ 핵심
├── components/graph-studio/
│   ├── panels/DataTab.tsx                     # Y2/Facet UI, 상호 배타 조건 (698줄)
│   └── ChartPreview.tsx                       # 렌더링 + 유의성 마커 (패싯 가드)
└── __tests__/graph-studio/
    ├── g2-3-features.test.ts                  # 기능 테스트 45개
    ├── g2-3-review-sim.test.ts                # 리뷰 시뮬레이션 테스트 28개
    └── g2-bugfix-regression.test.ts           # 버그픽스 회귀 테스트 29개
```

---

## 3. 아키텍처 흐름

```
사용자 → DataTab UI → updateChartSpec(Zustand) → ChartPreview → chartSpecToECharts() → ECharts
                                                                      │
                                                                      ├─ facet? → buildFacetOption()
                                                                      ├─ bar + y2? → buildY2Series/Axis
                                                                      ├─ line + y2? → buildY2Series/Axis
                                                                      └─ 기존 분기 (bar/scatter/line/...)
```

### Converter 구조 (echarts-converter.ts)
```
chartSpecToECharts()
  ├── buildBaseOption()        # 공통 기본 (title, grid, 배경 등)
  ├── aggregateRows()          # 집계 (facet.field 자동 포함)
  ├── buildFacetOption()       # ★ 패싯 분기 (최우선)
  │     ├── partitionRowsByFacet()
  │     ├── computeFacetLayout()
  │     └── 각 패싯별 bar/scatter series 빌드
  ├── bar 분기                 # Y2 지원
  ├── grouped-bar / stacked-bar
  ├── line 분기                # Y2 지원 (temporal/non-temporal)
  ├── scatter 분기             # trendline 지원
  ├── boxplot / violin
  ├── histogram
  ├── error-bar
  ├── heatmap
  └── fallback (bar)
```

---

## 4. 수정된 결함 7건 (이번 리뷰에서 수정)

### CRITICAL (2건)

**C-1: handleChartTypeChange y2 누출**
- 파일: `DataTab.tsx` L134-141
- 문제: `hint.supportsColor ? chartSpec.encoding : baseEncoding` — supportsColor=true일 때 전체 encoding 스프레드 → y2도 포함됨
- 수정: `baseEncoding` 기반, color/y2 개별 조건 스프레드
- 테스트: SIM-1 (6개 테스트)

**C-2: Non-null assertion 12곳**
- 파일: `echarts-converter.ts` 12곳
- 문제: `map.get(key)!.push(val)` 패턴 — CLAUDE.md 규칙 "Non-null assertion 절대 금지" 위반
- 수정: `const arr = map.get(key); if (arr) arr.push(val);` 패턴으로 전환
- 검증: `Grep('\\)\\!')` → 0건

### HIGH (3건)

**H-1: facet + errorBar UI 미차단**
- 파일: `DataTab.tsx` L341
- 문제: `showErrorBar` 조건에 `!hasFacet` 누락 → facet 활성 시에도 errorBar UI 노출
- 수정: `&& !hasFacet` 추가
- 테스트: SIM-3

**H-2: facet bar 음수 전용 데이터**
- 파일: `echarts-converter.ts` L850-853
- 문제: 모든 값이 음수인 facet bar → `globalYMax`가 음수 → 0 기준선 미표시
- 수정: `if (globalYMax === undefined || globalYMax < 0) globalYMax = 0;`
- 테스트: SIM-4

**H-3: facet + aggregate groupBy 방어**
- 파일: `echarts-converter.ts` L1038-1046
- 문제: `aggregate.groupBy`에 `facet.field`가 없으면 패싯 그룹 소실
- 수정: `aggGroupBy`에 `spec.facet.field` 자동 추가
- 테스트: SIM-2

### MEDIUM (2건)

**M-1: facet + color UI 미차단**
- 파일: `DataTab.tsx` L334
- 수정: `showColorField`에 `&& !hasFacet` 추가

**M-2: Y2 handler type 강제 quantitative**
- 파일: `DataTab.tsx` L283
- 문제: `col?.type ?? 'quantitative'` — nominal 컬럼이 Y2에 들어갈 수 있음
- 수정: `'quantitative' as const` 하드코딩 + 미사용 `col` 변수 제거

---

## 5. 리뷰 요청 사항

다음 관점에서 추가 결함이 있는지 검토 요청:

### 5-A. 상호 배타 규칙 누락
- Y2/facet/color/errorBar/trendline/significance 간 모든 조합이 올바르게 처리되는지
- DataTab UI 조건과 converter 분기가 일관되는지
- 상태 전이: facet 설정 → 해제 시 이전 color/errorBar 설정이 복원되는지

### 5-B. Converter 안전성
- `buildFacetOption()`이 빈 데이터, 단일 그룹, 13+ 그룹 등 경계 조건을 올바르게 처리하는지
- Y2 series가 ECharts에서 올바른 yAxisIndex를 사용하는지
- shareAxis=false일 때 각 패싯의 y 범위가 독립적인지

### 5-C. 타입 안전성
- `encoding.y2`가 optional인데, 모든 참조 위치에서 undefined 체크가 올바른지
- `facet.field`가 실제 데이터에 없는 컬럼일 때의 동작
- Zod 스키마(`chart-spec-schema.ts`)가 타입과 일치하는지

### 5-D. 성능
- `partitionRowsByFacet` + `buildFacetOption` 루프에서 불필요한 재계산이 없는지
- MAX_FACETS=12 제한이 충분한지

### 5-E. 잔여 리스크
- converter 1520줄 — 복잡도 관리가 적절한지
- facet + annotations: 전체 캔버스 기준으로 적용됨 (패싯별 아님) — 의도된 동작인지

---

## 6. 검증 상태

| 항목 | 결과 |
|------|------|
| `pnpm tsc --noEmit` | 0 errors |
| `pnpm test` (전체) | 5,285 passed, 13 skipped |
| Graph Studio 테스트 | g2-3-features (45) + g2-3-review-sim (28) + g2-bugfix (29) = 102 passed |
| Non-null assertion | 0건 (`Grep('\\)\\!')` 확인) |

---

## 7. 핵심 코드 위치 (빠른 탐색용)

| 관심 영역 | 파일:줄 |
|-----------|---------|
| ChartSpec 타입 전체 | `types/graph-studio.ts:181-237` |
| FacetSpec 인터페이스 | `types/graph-studio.ts:118-127` |
| encoding.y2 정의 | `types/graph-studio.ts:202` |
| CHART_TYPE_HINTS | `chart-spec-defaults.ts:152-280` |
| buildFacetOption() | `echarts-converter.ts:801-1005` |
| facet + aggregate 방어 | `echarts-converter.ts:1038-1046` |
| Y2 bar 분기 | `echarts-converter.ts:1075-1101` |
| Y2 line 분기 | `echarts-converter.ts:1236-1312` |
| handleChartTypeChange | `DataTab.tsx:123-154` |
| 상호 배타 조건 (showY2/showFacet/...) | `DataTab.tsx:326-344` |
| handleY2FieldChange | `DataTab.tsx:272-287` |
| handleFacetFieldChange | `DataTab.tsx:305-316` |

---

## 8. 리뷰 시작 가이드

```bash
# 1. 타입 정의 확인
# Read: stats/types/graph-studio.ts

# 2. Converter 핵심 로직 (buildFacetOption)
# Read: stats/lib/graph-studio/echarts-converter.ts (L801-1005)

# 3. DataTab 상호 배타 조건
# Read: stats/components/graph-studio/panels/DataTab.tsx (L320-345)

# 4. 테스트 실행
cd stats && pnpm test -- --run __tests__/graph-studio/

# 5. 전체 타입 체크
pnpm tsc --noEmit
```
