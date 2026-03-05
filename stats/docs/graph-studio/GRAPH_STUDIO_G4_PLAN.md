# Graph Studio G4 — 논문 수준 품질 + UX 재설계 계획

> **작성일**: 2026-03-04 / **검토**: 2026-03-04 (코드 검증 반영)
> **전제 문서**: [GRAPH_STUDIO_IMPROVEMENT_PLAN.md](GRAPH_STUDIO_IMPROVEMENT_PLAN.md) (G1-G3)
> **목표**: SCI/SCIE 저널 직접 투고 가능한 차트 품질 달성 + 사이드 패널 UX 대폭 개선

---

## 1. ECharts 6.0 현황 및 고려사항

### 현재 상태

```
echarts:           6.0.0  (2025-07-30 릴리즈, 이미 설치됨)
echarts-for-react: 3.0.6  (2026-02 게시, 이미 설치됨)
```

"3월 15일 업데이트" 공식 확인 불가. ECharts 6.0.0이 최신 stable.
6.0.1 패치가 나와도 API breaking change 없으므로 별도 대응 불필요.

---

### ECharts 6.0 활용 가능한 신기능

| 기능 | ECharts API | G4 활용 방법 |
|------|------------|------------|
| **Scatter jitter** | `jitter`, `jitterOverlap`, `jitterMargin` | Jitter dots 오버레이 (G4.3) |
| **Broken axis** | `yAxis.axisBreaks` | 이상치 데이터 처리 (G4.7) |
| **Custom series 재사용** | `renderItem` 모듈화 | Significance bracket (G2-1) + Violin (G4.6) |
| **Matrix coordinate** | `matrix` coord | Heatmap 개선 (미정) |

### ECharts 6.0 Breaking Change 주의사항

| 변경 항목 | 영향 | 조치 |
|----------|------|------|
| 기본 테마 전면 재설계 | STYLE_PRESETS 색상·spacing이 의도와 다를 수 있음 | 실제 렌더 확인 후 PRESET_COLORS 값 보정 |
| 범례(legend) 기본 위치 이동 | `top` 정렬이 달라 보일 수 있음 | `legend: { top: 0 }` 명시 |
| `echarts/theme/v5.js` 제공 | 구버전 외양 복원 레이어 | **사용 안 함** — 새 테마로 적응 |

---

## 2. 현황 갭 분석

### 논문 게재를 막는 핵심 부족 (P0)

| 기능 | 현황 | 비고 |
|------|------|------|
| 유의성 표시 (significance bracket) | G2-1 계획, 미구현 | 생물·의학 논문 필수 |
| 개별 데이터 포인트 오버레이 (jitter) | 없음 | 2020년대 top 저널 요구 빈번 |
| Violin plot 실제 구현 | Boxplot 대체 중 | KDE 계산 필요 |

### P1 — 스키마·컨버터 현황 (코드 검증 결과)

> 단순 "스키마 있음"이 아님. **컨버터 처리 여부를 구분**.

| 기능 | 스키마 | 컨버터 | UI | G4 작업 |
|------|-------|--------|-----|---------|
| X축 레이블 각도 | ✅ `labelAngle` | ✅ `rotate` 처리 | ❌ | UI만 추가 |
| Y/X 그리드 | ✅ `grid` | ✅ `splitLine.show` 처리 | ❌ | UI만 추가 |
| Y축 0 포함 | ✅ `scale.zero` | ❌ **미처리** | ❌ | 컨버터 + UI |
| 축 레이블 폰트 크기 | ✅ `labelFontSize` | ❌ **미처리** (global만) | ❌ | 컨버터 + UI |
| 축 제목 폰트 크기 | ✅ `titleFontSize` | ❌ **미처리** (global만) | ❌ | 컨버터 + UI |

### UX 구조 문제 (P1)

- DataTab: 14개 항목 수직 나열 → 체감 복잡도 높음
- 색상 팔레트가 DataTab에 있음 (스타일 항목인데 위치 오류)
- 에러바·회귀선처럼 통계 표현 항목이 차트 설정과 섞임

### P2 — 스키마 확장 필요

| 기능 | 용도 |
|------|------|
| 에러바 단방향 (위만) | 일부 저널 스타일 가이드 |
| 에러바 cap 너비 | 미세 조정 |
| 점선/마커 스타일 구분 | 색맹 독자, 흑백 인쇄 |
| Broken axis | 이상치 포함 데이터 |

---

## 3. UX/UI 설계 원칙

> **핵심**: 기능을 무작정 추가하지 않는다.
> 연구자의 작업 흐름을 따라 자연스럽게 나타난다.

### 3.1 Progressive Disclosure (점진적 노출)

```
Level 1 (기본 사용):  빠른 시작 + 차트 유형 + X/Y + 학술 스타일 → 항상 표시
Level 2 (고급 조정):  에러바 상세, 폰트 크기, 축 각도 → Accordion 기본 접힘
Level 3 (전문가):     Broken axis, 유의성 마커 수동 편집 → 하단 섹션
```

### 3.2 Context-Aware Controls (문맥 인식)

- 현재도 조건부 렌더 있음 — 강화
- 비활성화(disabled) 대신 완전히 숨김 → 시각적 노이즈 제거

```
bar 차트:    에러바 섹션 ✅ / 회귀선 섹션 ❌ / Jitter ✅
scatter:     회귀선 ✅ / 에러바 ❌ / Jitter ✅ / 마커 스타일 ✅
line:        점선 스타일 ✅
```

### 3.3 Grouping (관련 항목 묶기)

```
DataTab Accordion:
  [상단 고정]  빠른 시작        ← Accordion 밖, 항상 표시 (신규 사용자 진입점)
  [기본 펼침]  차트 설정        ← 유형 + 제목 + 방향
  [기본 펼침]  데이터 매핑      ← X/Y/Color/Y2/Facet
  [조건부]     통계 표현        ← 에러바/Jitter/회귀선 (해당 차트 유형일 때만)

StyleTab Accordion:
  [기본 펼침]  학술 스타일      ← 프리셋 4개 + 색상팔레트 (DataTab에서 이동)
  [기본 펼침]  축 설정          ← 범위 + 로그 + 각도 + 그리드 + zero
  [기본 펼침]  텍스트·폰트      ← 폰트 패밀리 + 개별 크기
  [조건부]     레이블·범례      ← 데이터레이블 + 범례 위치
  [조건부]     선·마커 스타일   ← line/scatter 선택 시
```

**빠른 시작을 Accordion 밖에 두는 이유**: 이 버튼들은 신규 사용자의 첫 진입점. Accordion으로 접히면 발견성이 낮아진다. 차트가 로드되면 사용 빈도가 낮아지므로 상단 고정으로 스크롤로 올릴 수 있으면 충분.

### 3.4 실시간 피드백

- Toggle/Select → `onChange` 즉시 반영 (현재와 동일)
- 숫자 입력 → `onBlur` 유지 (입력 중 잦은 리렌더 방지)
- 버튼 그룹(각도 0°/-45°/-90°) → 클릭 즉시 반영

---

## 4. G4 Phase 구성

### G4.1 — 패널 구조 Accordion 재설계 (1주)

**목표**: 항목 수직 나열 → Accordion 섹션 그룹화

**사전 확인 완료**: `components/ui/accordion.tsx` 이미 존재 ✅

**변경 파일**:
- `components/graph-studio/panels/DataTab.tsx`
- `components/graph-studio/panels/StyleTab.tsx`

**DataTab 구조**:
```tsx
{/* 빠른 시작: Accordion 밖, 항상 표시 */}
<div className="p-3 border-b">
  <Label className="text-xs mb-1.5">빠른 시작</Label>
  <div className="grid grid-cols-2 gap-1">...</div>
</div>

{/* 나머지: Accordion */}
<Accordion type="multiple" defaultValue={['chart-settings', 'data-mapping']}>
  <AccordionItem value="chart-settings">차트 설정</AccordionItem>
  <AccordionItem value="data-mapping">데이터 매핑</AccordionItem>
  {showStatExpression && (
    <AccordionItem value="stat-expression">통계 표현</AccordionItem>
  )}
</Accordion>
```

**StyleTab 구조**:
```tsx
<Accordion type="multiple" defaultValue={['style-preset', 'axis-settings', 'text-font']}>
  <AccordionItem value="style-preset">학술 스타일</AccordionItem>
  <AccordionItem value="axis-settings">축 설정</AccordionItem>
  <AccordionItem value="text-font">텍스트·폰트</AccordionItem>
  {showLegend && <AccordionItem value="label-legend">레이블·범례</AccordionItem>}
</Accordion>
```

**스키마 변경**: 없음

---

### G4.2 — 축 설정 확장 (1주)

**목표**: 스키마에 있는 설정을 UI + (일부는 컨버터도) 추가

#### UI만 추가 (컨버터 이미 처리 중)

| 항목 | 스키마 필드 | 컨트롤 | 컨버터 확인 |
|------|----------|--------|-----------|
| X축 레이블 각도 | `encoding.x.labelAngle` | 버튼 그룹 (0°/-45°/-90°) | `xAxisBase() rotate` ✅ |
| Y축 그리드 | `encoding.y.grid` | Toggle | `yAxisBase() splitLine.show` ✅ |
| X축 그리드 | `encoding.x.grid` | Toggle | `xAxisBase() splitLine.show` ✅ |

#### UI + 컨버터 동시 수정 필요

| 항목 | 스키마 필드 | 컨트롤 | 컨버터 수정 내용 |
|------|----------|--------|----------------|
| Y축 0 포함 | `encoding.y.scale.zero` | Toggle | `yAxisBase()`에서 `zero === true`이면 `min: 0` 강제, `false/undefined`이면 ECharts 자동 스케일 (domain `min` 생략). **우선순위**: `domain`이 명시되면 domain 우선 (사용자 의도 존중), `zero`는 domain 미설정 시에만 적용. |
| 축 레이블 크기 | `encoding.y.labelFontSize` | Number input (pt) | `yAxisBase() axisLabel.fontSize` → global 대신 개별값 우선 |
| 축 제목 크기 | `encoding.y.titleFontSize` | Number input (pt) | `yAxisBase() nameTextStyle.fontSize` → 개별값 우선 |
| (동일 X축 적용) | `encoding.x.labelFontSize` | Number input | `xAxisBase()` 동일 패턴 |

**수정 패턴 (컨버터)**:
```typescript
// 기존
axisLabel: { fontFamily: style.fontFamily, fontSize: style.labelSize }
// 수정 후
axisLabel: {
  fontFamily: style.fontFamily,
  fontSize: spec.encoding.y.labelFontSize ?? style.labelSize,
}
```

**스키마 변경**: 없음 (기존 필드 활용)

---

### G4.3 — 개별 데이터 포인트 오버레이 (Jitter Dots) (2주)

**목표**: 막대 차트 위에 원시 데이터 포인트를 투명 점으로 겹쳐 표시

**ECharts 6 API**: `jitter`, `jitterOverlap`, `jitterMargin`
> ⚠️ `jitterScale`이 아님 — ECharts 6 실제 API는 `jitter` (number, 0~1)

**사용 대상 차트**: bar, grouped-bar, error-bar

**영향 분기 분석** (echarts-converter.ts):
| 경로 | 라인 | 복잡도 |
|------|------|--------|
| plain bar | ~1106 | 낮음 (POC 대상) |
| bar + errorBar | ~1110-1134 | 중간 |
| grouped-bar + color | ~1187-1205 | 높음 (그룹별 x 오프셋) |
| stacked-bar + color | ~1228-1247 | 높음 |
| error-bar 차트 | ~1516-1543 | 중간 |

> **POC 전략**: plain bar만 먼저 구현 → 검증 → grouped-bar/stacked-bar 순차 확장.
> grouped-bar에서 color 그룹별 x 오프셋 + jitter 조합, facet/horizontal 조합은 POC 이후 설계.

**구현 전 검증 필요사항** (POC에서 확인):
1. ECharts scatter series가 categorical xAxis에서 카테고리 문자열(e.g. `'Bass'`)을 x값으로 받는지, 또는 인덱스(0, 1, 2)가 필요한지
2. `echarts@6.0.0`에서 `jitter`, `jitterOverlap` API가 실제 동작하는지 (릴리즈 노트 기반 추정 → 실증 필요)
3. 컨버터에 전달되는 `rawData`가 집계 전 원시 데이터인지, 이미 집계된 상태인지 — scatter overlay에 원시 행 데이터가 필요하므로 데이터 흐름 확인 필수

**설계 결정**:
```
렌더링 방식:
  - bar series + scatter series를 동일 xAxis에 겹침 (ECharts multi-series)
  - scatter 점: 반투명 (opacity 0.5~0.7), 크기 조정 가능
  - ECharts 6 내장 jitter 활용

데이터 흐름:
  - aggregate: mean → bar height (기존)
  - 원시 데이터 → scatter series 직접 전달
  - x 위치: 카테고리 인덱스 또는 이름 (POC에서 확인)

ECharts 구현 스케치:
  {
    type: 'scatter',
    xAxisIndex: 0,
    yAxisIndex: 0,
    data: rawPoints,       // [[catIndex, value], ...] or [[catName, value], ...]
    symbolSize: 5,
    jitter: 0.3,           // ECharts 6 scatter jitter (not jitterScale)
    jitterOverlap: false,
    itemStyle: { opacity: 0.6 },
    silent: true,
  }
```

**스키마 변경**:
```typescript
// types/graph-studio.ts
showRawPoints?: {
  enabled: boolean;
  size?: number;     // default: 4
  opacity?: number;  // default: 0.6
  jitter?: number;   // default: 0.3 (ECharts jitter 파라미터와 동일 범위)
};
```

**스키마 확장 체크리스트** (5곳 동시):
1. `types/graph-studio.ts` — `showRawPoints` 추가
2. `chart-spec-schema.ts` — `showRawPointsSchema` 추가 (`.strict()` 유지)
3. `echarts-converter.ts` — bar/error-bar scatter overlay series 생성
4. `ai-service.ts` — 시스템 프롬프트 `showRawPoints` 설명 추가
5. **테스트** — Zod 검증 통과 + converter series 생성 + AI patch 왕복 테스트

**UI 위치**: DataTab > 통계 표현 섹션 (에러바 아래)

---

### G4.4 — 에러바 상세 옵션 (1주)

**목표**: 에러바 방향·Cap 너비 조정

**스키마 변경**:
```typescript
// ErrorBarSpec 확장 (G1-4 precomputed와 함께 진행 권장)
export interface ErrorBarSpec {
  type: 'ci' | 'stderr' | 'stdev' | 'iqr' | 'precomputed';
  value?: number;
  direction?: 'both' | 'positive';  // default: 'both'
  capWidth?: number;                  // default: 0.12 (0~1, bar 너비 대비 비율)
  // G1-4
  lowerField?: string;
  upperField?: string;
}
```

**ECharts 구현**:
- `direction: 'positive'` → lowerBound = mean (위만 표시)
- `capWidth` → `buildErrorBarOverlay()` 내부 `renderItem`의 하드코딩 상수(`0.12`)를 `spec.errorBar.capWidth` 값으로 교체
  - 현재: `const capHalf = api.size([1, 0])[0] * 0.12;` (bar 너비의 24%)
  - 수정: `const capHalf = api.size([1, 0])[0] * (capWidth ?? 0.12);`

**스키마 확장 체크리스트**: types + schema + converter + ai-service 4곳 + **테스트**

---

### G4.5 — 선·마커 스타일 (Line/Scatter 전용) (1주)

**목표**: 색맹 독자 배려 + 흑백 인쇄 지원

**스키마 변경**:
```typescript
// ChartSpec 루트에 추가 (series 전체 기본값)
lineStyle?: {
  type?: 'solid' | 'dashed' | 'dotted';
  width?: number;
};
symbolStyle?: {
  shape?: 'circle' | 'square' | 'triangle' | 'diamond';
  size?: number;
};
```

**위치**: `ChartSpec` 루트 레벨 (encoding이 아닌 시각적 스타일 속성).
- color group 없을 때: 루트값 그대로 적용
- **color group 있을 때**: 컨버터가 series별로 `LINE_DASH_CYCLE`, `SYMBOL_CYCLE` 배열에서 자동 순환 할당
  (ECharts는 series별 `lineStyle.type`과 `symbol` 개별 설정 지원)

**UI 위치**: StyleTab > 조건부 섹션 (line/scatter 선택 시)

---

### G4.6 — Violin Plot 실제 구현 (3주)

**현황**: ECharts 네이티브 violin 미지원 → boxplot fallback 중

**신규 의존성**: Graph Studio가 현재 Pyodide를 사용하지 않음.
KDE 계산을 위해 처음으로 Pyodide 의존성 추가가 필요.

```
고려 방안:
  A. Pyodide 도입 (정확한 KDE, scipy.stats.gaussian_kde)
     → Graph Studio 첫 로드 시 Pyodide 초기화 필요 (~수 초)
  B. 순수 JS KDE 구현 (근사값, 추가 라이브러리 없음)
     → 통계 알고리즘 직접 구현 — CLAUDE.md 예외 조항 해당
        (Pyodide 로딩 과잉일 경우 순수 TS 허용)
  C. Pyodide lazy-load (violin 선택 시에만 초기화)
     → 사용자 경험 최선, 구현 복잡도 중간
```

**권장**: Option C — violin 선택 시 lazy Pyodide 로드 + 로딩 표시

**구현 순서**:
1. KDE 계산 (Pyodide lazy-load 또는 순수 JS)
2. `echarts-converter.ts` custom series `renderItem` 구현
3. 중앙 boxplot 겹치기 옵션 (`showBox: boolean`)

**주의**: 다른 G4 작업과 독립 — 별도 스프린트로 분리 권장

---

### G4.7 — Broken Axis (ECharts 6 신기능) (1주)

**활용 시나리오**: 이상치가 포함된 데이터에서 Y축 불연속 표시

**ECharts 6 API**: `yAxis.axisBreaks`

**스키마 변경**:
```typescript
// encoding.y.scale에 추가 (기존 ScaleSpec 확장 — 축 설정은 모두 이곳에 위치)
export interface ScaleSpec {
  domain?: [number, number] | string[];
  range?: [number, number] | string[];
  zero?: boolean;
  type?: 'linear' | 'log' | 'sqrt' | 'symlog';
  axisBreaks?: { start: number; end: number; }[];  // NEW
}
```

> ⚠️ 루트 레벨이 아닌 `encoding.y.scale.axisBreaks`에 위치. AI patch 경로 일관성 유지.

**UI**: StyleTab > 축 설정 > "축 불연속 범위" 서브섹션 (기본 접힘)

---

## 5. 진행 순서 권장

```
G4.1 (Accordion 재구조)   ← 가장 먼저: 다른 G4의 UI 틀
     ↓
G4.2 (축 설정 확장)        ← G4.1과 동시 가능. 컨버터 일부 수정 포함.
     ↓
G4.3 (Jitter Dots)         ← POC 먼저. 스키마 확장 + ECharts 6 jitter.
     ↓
G4.4 (에러바 상세)          ← G4.3과 같은 섹션. G1-4(precomputed)와 묶어서 진행 권장.
     ↓
G4.5 (선·마커 스타일)       ← 독립. 흑백 논문에 즉시 효과.
     ↓
G4.6 (Violin 실구현)        ← Pyodide 의존성 결정 후 별도 스프린트.
G4.7 (Broken Axis)          ← 단순 래핑. G4.6과 병렬 가능.
```

**G1-G3와의 관계**:
- G1 (버그 수정): G4와 독립. 가급적 먼저 진행.
- G2-1 (유의성 마커): G4.1 완료 후 DataTab > 어노테이션 섹션으로 진입.
- G1-4 (precomputed 에러바): G4.4와 묶어서 진행 권장.

---

## 6. 스키마 확장 영향 범위

| G4 항목 | types | schema | converter | ai-service | **test** | 비고 |
|---------|-------|--------|-----------|-----------|---------|------|
| G4.1 (Accordion) | — | — | — | — | — | UI 구조만 |
| G4.2 (UI만) | — | — | — | — | — | labelAngle/grid 컨버터 이미 있음 |
| G4.2 (컨버터 필요) | — | — | ✏️ | — | ✏️ | zero/labelFontSize/titleFontSize |
| G4.3 showRawPoints | ✏️ | ✏️ | ✏️ | ✏️ | ✏️ | POC(plain bar) 후 진행 |
| G4.4 direction/capWidth | ✏️ | ✏️ | ✏️ | ✏️ | ✏️ | G1-4와 묶기 권장 |
| G4.5 lineStyle/symbolStyle | ✏️ | ✏️ | ✏️ | ✏️ | ✏️ | |
| G4.6 violin KDE | ✏️ | — | ✏️ | ✏️ | ✏️ | Pyodide 방안 결정 후 |
| G4.7 axisBreaks | ✏️ | ✏️ | ✏️ | ✏️ | ✏️ | `encoding.y.scale.axisBreaks` |

> **테스트 필수**: 스키마 확장 시 Zod strict() 검증 통과 + converter series 생성 + AI patch 왕복 테스트를 반드시 포함.

---

## 7. 논문 제출 가능 기준 체크리스트

```
기본 요건:
  ✅ SVG 벡터 내보내기 (G1-2 필요 — DPI 수정 + mm 단위)
  ✅ 저널별 칼럼 너비 프리셋 (이미 있음)
  ✅ 학술 스타일 프리셋 Science/IEEE/Grayscale (이미 있음)
  ✅ 에러바 SEM/SD/CI (이미 있음)
  ✅ 색맹 친화 팔레트 Okabe-Ito (이미 있음)
  ☐ 폰트 크기 세부 조절 (G4.2 — 컨버터 수정 포함)
  ☐ 그리드 제어 (G4.2 — UI 추가만)
  ☐ X축 레이블 각도 (G4.2 — UI 추가만)

중급 요건:
  ☐ 개별 데이터 포인트 jitter dots (G4.3)
  ☐ 에러바 단방향 (G4.4)
  ☐ 점선/마커 스타일 (G4.5)
  ☐ 유의성 브라켓 *, **, *** (G2-1)

고급 요건:
  ☐ Violin plot (G4.6)
  ☐ Broken axis (G4.7)
  ☐ Pre-computed 에러바 (G1-4)
  ☐ Smart Flow 자동 유의성 마커 연결 (G3-2)
```

---

## 8. 범위 외 (이번 G4에서 다루지 않음)

| 기능 | 이유 |
|------|------|
| TIFF 출력 | html2canvas 필요, 별도 Phase |
| CMYK 색상 | 웹 환경 불가 |
| 다중 패널 그래프 (Figure) | 별도 레이아웃 엔진 필요 |
| 커브 피팅 CI 밴드 | Pyodide 연동 복잡 |
| 차트 간 정렬 보조선 | UX 복잡도 대비 효과 낮음 |
