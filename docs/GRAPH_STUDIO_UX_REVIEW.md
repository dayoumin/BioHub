# Graph Studio UX 개선 계획 — 리뷰 요청

**범위**: Graph Studio 진입 흐름 + 차트 추천 + 복합 차트 + AI 연동
**목적**: 데이터 업로드 → 차트 생성 UX를 AI 시대 표준에 맞게 개선

---

## 1. 현재 아키텍처 요약

### 진입 경로 3가지

| 경로 | 데이터 출처 | 분석 맥락 | 초기 동작 |
|------|------------|----------|----------|
| **A. 결과→GS** | Smart Flow 분석 결과 | 있음 (analysisContext, p-value, 비교 그룹) | 즉시 차트 + 유의성 브라켓 |
| **B. 직접 진입** | CSV 업로드 / 샘플 데이터 | 없음 | 즉시 기본 차트 ← **문제** |
| **C. 저장 복원** | localStorage 프로젝트 | 있음 (이전 상태 그대로) | 저장된 차트 복원 |

### 현재 차트 추천기 (`chart-recommender.ts`)

```typescript
export interface ChartRecommendation {
  type: ChartType;
  label: string;
  priority: number;
}

export function recommendCharts(columns: ColumnMeta[], maxResults = 4): ChartRecommendation[] {
  // 컬럼 타입만 분석: hasCat, hasNum, numCount, hasTemporal
  // 단순 if-else로 6개 규칙 → 최대 4개 반환
  // bar → scatter → boxplot → histogram → line → heatmap
}
```

**한계:**
- chartType만 반환 (encoding 미포함 → "어떤 변수를 x/y에?" 정보 없음)
- 복합 차트 미추천 (grouped-bar, stacked-bar, Y2 등)
- 분석 목적(intent) 미반영
- 추천 이유 없음

### 차트 타입 12종 (지원 현황)

| 차트 타입 | 멀티 시리즈 | Y2 이중축 | 에러바 | 소규모 다중(facet) |
|-----------|-----------|----------|--------|-------------------|
| `bar` | color field | **지원** | 지원 | 지원 |
| `grouped-bar` | color field | X | 지원 | X |
| `stacked-bar` | color field (stack) | X | X | X |
| `line` | color field | **지원** | 지원 | X |
| `scatter` | shape/size field | X | X | 지원 |
| `boxplot` | per-category | X | X | X |
| `histogram` | X | X | X | X |
| `error-bar` | X | X | 고유 | X |
| `heatmap` | X | X | X | X |
| `violin` | per-category | X | X | X |
| `km-curve` | X | X | X | X |
| `roc-curve` | X | X | X | X |

**복합 차트 지원 현황:**
- ✅ 이중 Y축 (bar, line만)
- ✅ 멀티 시리즈 (color field → 그룹별 시리즈)
- ✅ Stacked/Grouped bar
- ❌ **레이어 오버레이** (scatter + regression line, bar + line 혼합 등) — 미구현

### AI 패널 (현재 동작)

```
사용자 NL → OpenRouter API → JSON Patch (RFC 6902) → ChartSpec 수정 → 리렌더
```

- **6개 카테고리**: 축 설정, 색상·스타일, 차트 유형, 제목·레이블, 에러바·통계, 출력 크기
- 컬럼 메타만 전송 (실제 데이터 미전송 — zero-data-retention)
- **제한**: 기존 차트를 **수정**만 가능. 빈 상태에서 "이 데이터로 산점도 만들어줘" → **불가**

---

## 2. 문제 정의

### P1: 시나리오 B (직접 진입) — "왜 이 차트?"

사용자가 CSV 업로드 시 `createDefaultChartSpec()`으로 첫 번째 추천 차트가 즉시 렌더링됨.
사용자는 왜 이 차트인지 모르고, 목적을 물어보지도 않음.

**업계 트렌드 (2024-2026):**
- Power BI Copilot, Julius AI: NL로 목적 먼저 파악
- Google Sheets Explore: 추천 차트 2~3개 썸네일 제시
- Tableau Pulse: Push형 인사이트 제안
- MS LIDA: Summarize → Goal Explore → Viz Generate 4단계

### P2: 추천기가 단순 chartType만 반환

추천 결과에 encoding(x/y/color 매핑)이 없어서:
- 썸네일 미리보기 불가능 (실제 차트를 그릴 수 없음)
- "study_hours × motivation 산점도" 같은 구체적 레이블 불가
- 복합 차트(grouped-bar + color=group 등) 추천 불가

### P3: AI로 빈 상태에서 차트 생성 불가

AI 패널은 기존 ChartSpec을 JSON Patch로 수정하는 구조.
차트가 없는 상태에서 "이 데이터의 분포를 보여줘"라고 하면 동작 불가.

### P4: 복합 차트 추천 누락

추천기가 `bar`만 추천하지 `grouped-bar`, `stacked-bar`, Y2 설정은 추천하지 않음.
카테고리 변수 2개 + 수치 1개 → `grouped-bar`가 적합한데 `bar`만 나옴.

---

## 3. 개선 계획

### Phase 1: 추천기 확장 (chart-recommender.ts)

**변경 전:**
```typescript
interface ChartRecommendation {
  type: ChartType;
  label: string;
  priority: number;
}
```

**변경 후:**
```typescript
interface ChartRecommendation {
  type: ChartType;
  label: string;          // "study_hours × motivation 산점도"
  reason: string;         // "두 연속형 변수의 상관 탐색에 적합"
  priority: number;
  encoding?: {            // 사전 설정된 인코딩
    xField?: string;
    yField?: string;
    colorField?: string;
    y2Field?: string;
  };
}
```

**추천 규칙 확장:**

| 조건 | 현재 추천 | 추가 추천 |
|------|----------|----------|
| cat(1) + num(1) | bar | boxplot, violin |
| cat(2) + num(1) | bar | **grouped-bar** (color=cat2), **stacked-bar** |
| cat(1) + num(2) | bar, scatter | **bar + Y2** (이중축) |
| temporal + num(2+) | line | **line + Y2**, **line + color** (멀티시리즈) |
| num(2+) | scatter | scatter + **color=cat** (그룹별 산점도) |
| cat(1) + num(1) + 그룹 소 | bar | **error-bar** (평균 + SEM) |

**리뷰 포인트:**
1. encoding을 추천 시점에 확정하면 `createDefaultChartSpec()` 로직과 중복됨. 추천기가 encoding hint만 주고 실제 spec 생성은 기존 함수에 위임하는 게 나은가?
2. 추천 수를 4개에서 늘려야 하나? 복합 차트까지 포함하면 6~8개 될 수 있음
3. label/reason을 한국어/영어 어떻게 처리? terminology 시스템 연동?

### Phase 2: 시나리오 B 추천 화면 UI

**데이터 업로드 직후** (editor 모드 전환 시):

```
┌─────────────────────────────────────────────────────┐
│  regression.csv  5개 변수 · 20행                    │
│                                                      │
│  📊 어떤 시각화가 필요하세요?                        │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ 산점도    │  │ 그룹 막대 │  │ 박스플롯  │          │
│  │ study ×   │  │ group별   │  │ score by │          │
│  │ motivation│  │ score     │  │ category │          │
│  │ [미리보기]│  │ [미리보기]│  │ [미리보기]│          │
│  │           │  │           │  │           │          │
│  │ "두 변수의│  │ "그룹간   │  │ "분포 비교│          │
│  │  관계"    │  │  비교"    │  │  에 적합" │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                      │
│  💬 AI에게 직접 요청: "___의 시간별 추이를 보여줘"   │
│                                                      │
│  ─── 또는 직접 선택 ───                              │
│  [전체 12개 차트 유형 보기 →]                         │
└─────────────────────────────────────────────────────┘
```

**분기 로직:**
```typescript
// page.tsx에서
if (dataPackage.source === 'smart-flow') {
  // 시나리오 A: 분석 맥락 있음 → 즉시 차트 (현재대로)
  layoutMode = 'editor';
} else if (!hasUserSelectedChart) {
  // 시나리오 B: 직접 업로드 → 추천 화면
  layoutMode = 'recommend';  // ← 새 모드
} else {
  layoutMode = 'editor';
}
```

**리뷰 포인트:**
1. 추천 화면을 별도 layoutMode로 할 것인가, editor 모드 위에 오버레이/모달로 할 것인가?
2. 미리보기 썸네일: 실제 ECharts 미니 렌더링 vs 정적 아이콘? ECharts 미니 렌더링이면 추천 3개 × ECharts 인스턴스 = 성능 영향
3. "전체 차트 유형 보기"와 현재 LeftDataPanel의 "추천 차트" 섹션이 중복됨. 통합 방안?
4. 추천 화면에서 AI 입력을 받으면 어떤 흐름? Phase 3 (AI 초기 생성)이 필요

### Phase 3: AI 초기 차트 생성

현재 AI 패널은 기존 ChartSpec을 JSON Patch로 수정하는 구조.
빈 상태(또는 추천 화면)에서 NL → 차트 생성하려면:

**방안 A: 추천 화면에서 AI → 추천기 연동**
```
사용자: "study_hours와 score의 관계를 보여줘"
  → AI가 intent 파악: 상관/관계 → scatter
  → 추천기에 intent 힌트 전달 → encoding 포함 추천 반환
  → 해당 추천으로 ChartSpec 생성 → editor 모드 진입
```

**방안 B: AI → ChartSpec 직접 생성**
```
사용자: "study_hours와 score의 관계를 보여줘"
  → AI가 전체 ChartSpec JSON 생성 (patch가 아닌 full spec)
  → store에 로드 → editor 모드 진입
```

**리뷰 포인트:**
1. 방안 A는 로컬 추천기 활용 (빠름, API 비용 없음) but intent 파싱이 제한적
2. 방안 B는 유연하지만 API 호출 필요 + 현재 patch 기반 구조와 별도 경로
3. 하이브리드: 간단한 요청은 A, 복잡한 요청은 B?

### Phase 4: 레이어 오버레이 (향후)

현재 ChartSpec은 단일 chartType. scatter + regression line, bar + line 혼합 등은:
- ECharts는 series 배열로 혼합 가능
- ChartSpec 구조 변경 필요: `layers: ChartLayer[]` 같은 개념

**이 phase는 현재 리뷰 범위 밖** — 추후 필요 시 설계.

---

## 4. 현재 코드 참조

| 파일 | 역할 |
|------|------|
| `stats/app/graph-studio/page.tsx` | 메인 페이지, layoutMode 전환 |
| `stats/lib/stores/graph-studio-store.ts` | Zustand 스토어 (data + spec + history) |
| `stats/lib/graph-studio/chart-recommender.ts` | 차트 추천 (42줄, 6규칙) |
| `stats/components/graph-studio/LeftDataPanel.tsx` | 변수 목록 + 추천 차트 그리드 |
| `stats/components/graph-studio/DataUploadPanel.tsx` | 업로드 화면 + 샘플 데이터 |
| `stats/components/graph-studio/AiPanel.tsx` | AI 어시스턴트 (NL → JSON Patch) |
| `stats/lib/graph-studio/use-ai-chat.ts` | AI 채팅 로직 |
| `stats/lib/graph-studio/ai-service.ts` | OpenRouter API 호출 |
| `stats/lib/graph-studio/chart-spec-utils.ts` | ChartSpec 생성/패치/유의성 마크 |
| `stats/lib/graph-studio/echarts-converter.ts` | ChartSpec → ECharts 옵션 변환 |
| `stats/types/graph-studio.ts` | ChartType (12종), ChartSpec, ColumnMeta 등 |
| `stats/lib/graph-studio/chart-spec-defaults.ts` | ChartTypeHint (supportsY2, supportsColor 등) |

---

## 5. 리뷰 포인트 요약

| # | 영역 | 질문 |
|---|------|------|
| 1 | Phase 1 | 추천기에 encoding 힌트를 넣으면 `createDefaultChartSpec()`과 책임 중복. 분리 설계? |
| 2 | Phase 1 | 복합 차트 추천 시 조건이 복잡해짐 (cat 수, num 수, 그룹 카디널리티). 규칙 기반 유지 vs ML/LLM? |
| 3 | Phase 2 | 추천 화면: 별도 layoutMode vs overlay? 기존 LeftDataPanel 추천 섹션과 중복 처리? |
| 4 | Phase 2 | ECharts 미니 렌더링 성능: 추천 3개 × ECharts 인스턴스 → 무거울 수 있음. SVG 모드? canvas? |
| 5 | Phase 3 | AI 초기 생성: intent → 추천기 (로컬) vs AI → full spec (API). 어떤 접근이 적절? |
| 6 | Phase 3 | 추천 화면의 AI 입력과 editor 모드의 AI 패널을 동일 컴포넌트로 재사용 가능? |
| 7 | 전체 | Phase 1→2→3 순서가 적절한가? 사용자 가치 기준으로 다른 순서? |
| 8 | 전체 | 시나리오 A (결과→GS)는 건드리지 않는 게 맞는가? 결과 맥락을 활용한 추가 추천 가능성? |

---

## 6. 업계 참고

| 도구 | 접근 | 핵심 패턴 |
|------|------|----------|
| **Power BI Copilot** | NL → 차트 + 내러티브 + DAX 자동 생성 | 목적 먼저, 차트는 결과물 |
| **Tableau Pulse** | Push형 인사이트 → Slack/Teams 전달 | "찾으러 가지 말고 알려준다" |
| **Google Sheets Explore** | 범위 선택 → 추천 3개 썸네일 | Progressive disclosure |
| **Julius AI** | 채팅 → 노트북 뷰 (과정 투명) | 대화형 + 코드 투명성 |
| **MS LIDA** | Summarize → Goal → Generate → Infographic | 4단계 파이프라인 |

**핵심 트렌드**: "차트 선택기" → "분석 어시스턴트". 출력 단위가 차트 1개가 아니라 **인사이트 + 시각화**.

**참고 논문/프로젝트:**
- Intent-Aware Data Visualization Recommendation (Springer, 2022)
- VizML: ML Approach to Visualization Recommendation (CHI 2019)
- Draco 2: Constraint-based Recommendation (IEEE VIS 2023)
- LIDA: Grammar-Agnostic Viz Generation (Microsoft Research, ACL 2023)

---

## 7. 외부 리뷰 피드백 및 수정 계획

### 리뷰 결과 요약

| 심각도 | 지적 | 판정 |
|--------|------|------|
| **High** | `recommend` 모드 삽입 시 store 계약 변경이 선행 필요. 현재 `loadDataPackageWithSpec()`이 data+spec을 원자적으로 set하므로 "데이터 로드됨 + spec 미선택" 상태가 존재하지 않음 | **정확** |
| **High** | LeftDataPanel CSV 교체에서도 동일 문제 재발. Phase 2를 첫 진입에만 적용하면 업로드 UX가 이원화됨 | **정확** (단, 에디터 내 데이터 교체 시 기존 차트 유형 유지가 자연스러울 수 있어 의도적 차이 허용 가능) |
| **Medium** | `encoding` hint만으로는 미리보기/one-click 적용까지 연결 안 됨. `buildChartSpecFromRecommendation()` 변환 계층 필요 | **정확** |
| **Medium** | 추천 화면에서 AI 재사용 불가. `!chartSpec`이면 입력 disabled, 채팅 히스토리 단일 key로 데이터셋별 분리 안 됨 | **정확** |

### 수정 1: Phase 0 신설 — Store 계약 분리 (선행 작업)

**문제**: `loadDataPackageWithSpec(pkg, spec)` 단일 호출로 data+spec 동시 설정 → "데이터만 로드" 상태 불가

**수정 방향**:
```typescript
// graph-studio-store.ts — 기존
loadDataPackageWithSpec: (pkg, spec) => set({
  dataPackage: pkg,
  isDataLoaded: true,
  chartSpec: spec,        // ← data와 동시 설정
  specHistory: [spec],
  historyIndex: 0,
})

// graph-studio-store.ts — Phase 0 후
loadDataPackage: (pkg) => set({
  dataPackage: pkg,
  isDataLoaded: true,
  chartSpec: null,        // ← spec 미설정
  pendingRecommendation: true,
})

commitChartSpec: (spec) => set({
  chartSpec: spec,
  specHistory: [spec],
  historyIndex: 0,
  pendingRecommendation: false,
})

// 시나리오 A (결과→GS), C (복원)는 기존 loadDataPackageWithSpec 유지
// 시나리오 B (직접 업로드)만 loadDataPackage → recommend → commitChartSpec
```

**page.tsx 분기**:
```typescript
const layoutMode: LayoutMode =
  !isDataLoaded ? 'upload' :
  pendingRecommendation ? 'recommend' :  // ← 새 모드
  chartSpec ? 'editor' : 'upload';
```

### 수정 2: LeftDataPanel 데이터 교체 경로 명시

**결정**: 에디터 내 CSV 교체는 추천 화면을 거치지 않음 (의도적 차이)
- 이미 차트 작업 중인 사용자가 데이터만 바꾸는 경우 → 기존 차트 유형 유지가 자연스러움
- `loadDataPackageWithSpec()` 호출 유지 (기존 동작 그대로)
- 단, LeftDataPanel의 "추천 차트" 그리드는 새 데이터 기준으로 갱신

### 수정 3: Phase 1 확장 — `buildChartSpecFromRecommendation()` 추가

**기존 Phase 1**: 추천기에 encoding 필드 추가
**추가**: encoding → 완전한 ChartSpec 변환 함수

```typescript
// chart-spec-utils.ts에 추가
function buildChartSpecFromRecommendation(
  recommendation: ChartRecommendation,
  dataPackageId: string,
  columns: ColumnMeta[],
): ChartSpec {
  // encoding.xField, yField, colorField, y2Field 등을 반영하여
  // createDefaultChartSpec() 대비 richer한 spec 생성
  // grouped-bar: colorField 설정 + chartType='grouped-bar'
  // Y2: y2Field + y2Series 설정
  // error-bar: errorBarConfig 자동 설정
}
```

**관계**: `createDefaultChartSpec()`은 fallback으로 유지. `buildChartSpecFromRecommendation()`이 추천 선택 시 사용.

### 수정 4: Phase 3 현실성 조정 — AI 컴포넌트 재사용 불가

**기존 계획**: 추천 화면에서 AI 패널 재사용
**리뷰 결과**: 현재 구조에서 불가
- `!chartSpec` → 입력 disabled
- `use-ai-chat.ts` — `if (!spec) return` 가드
- 채팅 히스토리 `graph_studio_ai_chat` 단일 key

**수정 방향**: Phase 3에서 별도 경량 AI 입력 컴포넌트 구현
- 추천 화면 전용 텍스트 입력 (기존 AiPanel과 별개)
- intent 파싱 → 추천기에 전달 (방안 A 우선)
- 채팅 히스토리 불필요 (단발 intent 입력)
- editor 모드 진입 후 기존 AiPanel로 전환

### 수정 5: 착수 순서 변경

**기존**: Phase 1 → 2 → 3 → 4
**수정 후**: Phase 0 → 1 → 2 → 3 → 4

| Phase | 작업 | 선행 조건 | 이유 |
|-------|------|----------|------|
| **0** | Store 계약 분리 (`loadDataPackage` + `commitChartSpec`) | 없음 | UI보다 state 계약이 먼저 |
| **1** | 추천기 확장 + `buildChartSpecFromRecommendation()` | Phase 0 | encoding→spec 변환 계층 확보 |
| **2** | 추천 화면 UI (recommend 모드) | Phase 0, 1 | store + 변환 함수 준비 후 |
| **3** | 추천 화면 AI 입력 (경량 별도 컴포넌트) | Phase 2 | 추천 화면 존재 후 |
| **4** | 레이어 오버레이 | Phase 1~3 안정화 후 | 장기 |

### 수정 6: E2E 테스트 영향

현재 `graph-ux.spec.ts`는 "파일 업로드 후 곧바로 차트 표시"를 전제.
Phase 0/2 적용 시 시나리오 B 경로의 E2E가 깨짐.

**대응**: Phase 2 구현 시 E2E 동시 수정
- 시나리오 B: 업로드 → 추천 화면 → 차트 선택 → 에디터
- 시나리오 A, C: 기존 테스트 유지
