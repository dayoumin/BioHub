# Graph Studio UI 리디자인 계획 (G5)

> **작성일**: 2026-03-11
> **전제 문서**: [G1-G3](GRAPH_STUDIO_IMPROVEMENT_PLAN.md) · [G4](GRAPH_STUDIO_G4_PLAN.md)
> **디자인 레퍼런스**: 3개 시안 (막대형 에러바 에디터, 산점도 회귀선 에디터, 박스 플롯 에디터)
> **목표**: 2패널 → 3패널 전환 + 시각적 컨트롤 리디자인으로 GraphPad Prism 수준 편집 UX 달성

---

## 1. 현황 vs 목표

### 현재 레이아웃 (2패널)
```
┌─────────────────────────────────────────────┐
│ GraphStudioHeader (AI 토글, undo/redo, 내보내기)  │
├──────────────────────────┬──────────────────┤
│                          │ SidePanel (w-80) │
│      ChartPreview        │ ┌──────────────┐ │
│      (ECharts)           │ │ [데이터|스타일] │ │
│                          │ │ DataTab      │ │
│                          │ │ StyleTab     │ │
│                          │ └──────────────┘ │
├──────────────────────────┴──────────────────┤
│ AiPanel (dock: bottom/left/right)           │
└─────────────────────────────────────────────┘
```

### 목표 레이아웃 (3패널)
```
┌─────────────────────────────────────────────────────────┐
│ Header: [AI 스타일 추천] [undo/redo] [내보내기]               │
├───────────────┬─────────────────────┬───────────────────┤
│ 좌측: 데이터    │     중앙: 캔버스       │ 우측: 속성 편집     │
│               │                     │                   │
│ 📊 파일명.csv  │   ┌─ 미니 툴바 ─┐   │ ▸ 차트 유형        │
│ 3열, 120행    │   │ 🔍 🖐 Tt ⊞ │   │   [아이콘 그리드]   │
│               │   └────────────┘   │                   │
│ ☑ 사료종류 Cat │                     │ ▸ 색상 및 스타일    │
│ ☑ 체중(g) Num │    [차트 렌더링]      │   팔레트 스와치     │
│ ☐ 체장(cm) Num│                     │   그룹별 색상 편집   │
│               │                     │                   │
│ ─────────── │                     │ ▸ 오차 막대         │
│ 샘플 차트      │                     │   [SEM][SD][95%CI] │
│ ┌──┐ ┌──┐   │                     │   선 두께 슬라이더   │
│ │▐▌│ │≡ │   │                     │                   │
│ └──┘ └──┘   │                     │ ▸ 축 설정          │
│ ┌──┐ ┌──┐   │                     │ ▸ 범례 및 제목      │
│ │╱ │ │∷ │   │                     │ ▸ 내보내기 형식     │
│ └──┘ └──┘   │                     │                   │
├───────────────┴─────────────────────┴───────────────────┤
│ AiPanel (dock: bottom 전용 — 좌/우 모두 고정 패널 차지)      │
└─────────────────────────────────────────────────────────┘
```

**핵심 변경**: SidePanel 하나(Data/Style 탭 전환) → 좌측 LeftDataPanel + 우측 RightPropertyPanel 분리

---

## 2. 레퍼런스 디자인 분석

### 레퍼런스 1: 막대형 에러바 에디터
| 요소 | 현재 구현 | 레퍼런스 | 갭 |
|------|----------|---------|-----|
| 차트 유형 선택 | 드롭다운 | 아이콘 그리드 (막대형/선형/산점도) | **UI 교체** |
| 색상 팔레트 | 드롭다운 + 작은 스와치 | 인라인 팔레트 미리보기 + Nature/Science 레이블 | **시각 개선** |
| 그룹별 색상 편집 | 없음 | 컬러피커 인라인 (hex 입력 + 테두리 토글) | **신규** |
| 오차 막대 UI | 드롭다운 (SEM/SD/CI/IQR) | 버튼 그룹 토글 + 슬라이더 (선 두께, 캡 너비) | **UI 교체** |
| 유의성 표시 토글 | 수동 마커 추가 폼 | 체크박스 토글 (*, **, ***) | 있으나 **UX 간소화** 필요 |
| 샘플 차트 | 없음 | 좌측 하단 썸네일 그리드 (4종) | **신규** |
| 변수 체크박스 | 없음 (드롭다운 매핑만) | 체크박스 + 타입 배지 (Cat/Num) | **신규** |
| 접이식 섹션 | 없음 (수직 나열) | ▸ 접기/펼치기 | G4.1과 동일 |

### 레퍼런스 2: 산점도 회귀선 에디터
| 요소 | 현재 구현 | 레퍼런스 | 갭 |
|------|----------|---------|-----|
| 데이터 매핑 | 드롭다운 직접 선택 | X축/Y축 드롭다운 (설명변수/반응변수 레이블) | **레이블 개선** |
| 회귀선 | on/off 토글만 (선형) | 모델 유형 선택 (선형/다항식/로스) + 옵션 | **확장 필요** |
| 95% 신뢰대역 | 없음 | 체크박스 토글 | **신규** (G4 범위 외) |
| R² 표시 | 없음 (툴팁에서만) | 체크박스 토글 + 차트 위 라벨 | **신규** |
| 추천 그래프 | 없음 | 좌측 하단 4종 추천 (산점도, 막대, 선, 히스토그램) | **신규** |
| 그룹 기준 | color 드롭다운 | "그룹 기준" 드롭다운 + "초기화" 버튼 | **UX 개선** |
| 점 크기/투명도 | 없음 | 슬라이더 (4px, 80%) | **신규** |
| 선 스타일 | 없음 | 색상 + 실선/점선 드롭다운 | G4.5와 겹침 |

### 레퍼런스 3: 박스 플롯 에디터
| 요소 | 현재 구현 | 레퍼런스 | 갭 |
|------|----------|---------|-----|
| 드래그앤드롭 변수 | 없음 | 좌측 컬럼 목록 → X/Y 영역에 드롭 | **신규** |
| 박스 스타일 토글 | 없음 | 노치/평균값(X)/이상치 표시 토글 | **신규** |
| 지터 포인트 | 없음 | 개별 데이터 표시 토글 + 지터 폭/투명도 슬라이더 | G4.3과 겹침 |
| 그룹별 색상 | 없음 | 그룹별 hex 컬러피커 + "색상 팔레트 변경" 버튼 | **신규** |
| 좌측 네비게이션 | 없음 (단일 페이지) | 홈/데이터 가져오기/데이터 편집/그래프 생성/내보내기 | 불필요 (AppSidebar 존재) |

---

## 3. Phase 구성

### G5.0 — 3패널 레이아웃 전환 (P0, 선행 필수)

**목표**: 2패널(SidePanel 탭 전환) → 3패널(좌/중/우 고정) 구조 변경

**변경 파일**:
- `app/graph-studio/page.tsx` — 레이아웃 3패널 전환 + `isSidePanelOpen` → 좌/우 개별 접기 + AI `right` 도킹 분기 제거 (L101 sidePanelWidth, L110-126 도킹 분기)
- `components/graph-studio/SidePanel.tsx` → **삭제** (역할 분리)
- `components/graph-studio/LeftDataPanel.tsx` — **신규** (데이터 소스 + 변수 목록 + 추천 차트)
- `components/graph-studio/RightPropertyPanel.tsx` — **신규** (속성 편집 아코디언)
- `types/graph-studio.ts` — `AiPanelDock` 타입에서 `'right'` 제거 → `'bottom'` (L347)
- `types/graph-studio.ts` L365 — `sidePanel: 'data' | 'style'` 타입 필드 제거
- `lib/stores/graph-studio-store.ts` — `sidePanel` 초기값(L57) + `setSidePanel` 액션(L163) + 마이그레이션(L191-192) 제거
- `components/graph-studio/GraphStudioHeader.tsx` — `onToggleSidePanel` prop → `onToggleLeftPanel` + `onToggleRightPanel` 개별 토글로 변경
- `components/graph-studio/AiPanel.tsx` — 도킹 버튼 전체 제거(ArrowLeft L221-224, ArrowRight L224-231) + `isSide` 분기 제거 (L175) → bottom 전용 레이아웃만 유지

**레이아웃 규격**:
```
좌측 패널: w-64 (256px) — 토글 버튼으로 접기/펼치기 (접히면 hidden, 리사이즈 없음)
중앙 캔버스: flex-1 (남은 공간)
우측 패널: w-80 (320px) — 토글 버튼으로 접기/펼치기 (접히면 hidden, 리사이즈 없음)
```

**AI 패널 도킹 조정**:
- `right` 도킹 제거 (우측이 속성 패널로 고정)
- `left` 도킹 제거 — **좌측도 LeftDataPanel이 차지하므로 공간 충돌**. 현재 page.tsx L127-137의 left dock은 독립 좌측 컬럼을 점유하는데, G5에서는 그 자리가 LeftDataPanel로 고정됨
- **G5.0 결정: `bottom` 만 유지** (AiPanelDock = `'bottom'` 단일값, 향후 필요 시 오버레이/드로어로 확장)
- 우측 패널 내 탭 통합은 G5 범위 외 (향후 사용자 피드백 기반 검토)
- **마이그레이션**: 기존 프로젝트 localStorage에 `aiPanelDock: 'right' | 'left'`가 저장된 경우 → `setProject` 시 `'bottom'`으로 폴백 (project-storage.ts의 `loadProject` 복원 경로)

**구현 순서**:
1. LeftDataPanel 골격 생성 (데이터 소스 카드 + 변수 목록 — placeholder)
2. RightPropertyPanel 골격 생성 — **G5.0에서는 기존 DataTab/StyleTab을 그대로 import하는 래퍼**. 내부 아코디언 재구성은 G5.2 범위.
   ```tsx
   // G5.0의 RightPropertyPanel.tsx (최소 구현)
   export function RightPropertyPanel() {
     return (
       <div data-testid="graph-studio-right-panel">
         {/* SidePanel의 Tabs 구조를 그대로 가져옴 — alias testid 포함 */}
         <Tabs ...>
           <TabsTrigger data-testid="graph-studio-tab-data" />
           <TabsTrigger data-testid="graph-studio-tab-style" />
           <DataTab />
           <StyleTab />
         </Tabs>
       </div>
     );
   }
   ```
3. **RightPropertyPanel에 기존 testid alias 부착** (`graph-studio-side-panel`, `graph-studio-tab-data`, `graph-studio-tab-style`)
4. page.tsx 3패널 레이아웃으로 교체
5. E2E 테스트가 새 패널에서 기존 testid로 통과하는지 검증
6. SidePanel.tsx 삭제, store에서 `sidePanel` 상태 제거
7. AI 패널 도킹 모드 조정

**upload 모드**: `layoutMode === 'upload'` 화면은 이번 G5 범위 외. 기존 `DataUploadPanel` 유지.

**E2E data-testid 원칙** (`e2e/selectors.ts` L10: "기존 testid 삭제/변경 절대 금지"):
- `graph-studio-side-panel` → RightPropertyPanel 루트에 alias로 유지
- `graph-studio-tab-data`, `graph-studio-tab-style` → 아코디언 전환 후에도 동일 testid 유지 (숨김 요소로든)
- `graph-studio-side-toggle` (selectors.ts L112) → **우측 패널 토글 버튼에 유지**. 좌측 패널 토글은 신규 testid `graph-studio-left-toggle` 추가.
- 새 패널에는 별도 testid 추가 (`graph-studio-left-panel`, `graph-studio-right-panel`)
- 기존 E2E 테스트가 구 testid로 동작해야 함 → **alias 매핑 또는 래퍼 요소 유지**

**패널 토글 계약**:
- 현재: `GraphStudioHeader.tsx`의 단일 `onToggleSidePanel` prop + 단일 `graph-studio-side-toggle` 버튼
- G5.0 변경: `onToggleLeftPanel` + `onToggleRightPanel` 2개 prop으로 분리
- `graph-studio-side-toggle` testid → 우측 토글 버튼에 유지 (기존 E2E 호환)
- 좌측 토글 버튼 → `graph-studio-left-toggle` 신규 testid
- `e2e/selectors.ts`에 `graphStudioLeftToggle` 항목 추가 (기존 항목 수정 금지)

---

### G5.1 — 좌측 데이터 패널 (LeftDataPanel)

**구성 요소** (위→아래):

#### A. 데이터 소스 카드
```tsx
<div className="p-3 border-b">
  <div className="flex items-center gap-2">
    <TableIcon className="h-4 w-4 text-primary" />
    <div>
      <p className="text-sm font-medium truncate">사료종류비교.csv</p>
      <p className="text-xs text-muted-foreground">3 columns, 120 rows</p>
    </div>
  </div>
</div>
```

#### B. 변수 목록 (체크박스 + 타입 배지)
```tsx
// 레퍼런스 1 스타일
<div className="space-y-1 p-3">
  {columns.map(col => (
    <div className="flex items-center gap-2">
      <Checkbox checked={isUsed(col)} />
      <TypeIcon type={col.type} />  {/* # (숫자), 🔤 (문자) */}
      <span className="text-sm flex-1 truncate">{col.name}</span>
      <Badge variant="outline" className="text-xs">
        {col.type === 'quantitative' ? 'Num' : 'Cat'}
      </Badge>
    </div>
  ))}
</div>
```

**향후 확장**: 체크박스 상태 → 차트에 사용할 변수 필터링 (MVP에서는 표시만)

#### C. 샘플 차트 / 추천 그래프 썸네일
```tsx
<div className="p-3 border-t">
  <div className="flex items-center justify-between mb-2">
    <Label className="text-xs font-medium">샘플 차트</Label>
    <Button variant="link" className="text-xs h-auto p-0">더보기</Button>
  </div>
  <div className="grid grid-cols-2 gap-2">
    {recommendedCharts.map(chart => (
      <ChartThumbnail
        key={chart.type}
        type={chart.type}
        label={chart.label}
        isSelected={chartSpec.chartType === chart.type}
        onClick={() => applyChartType(chart.type)}
      />
    ))}
  </div>
</div>
```

**추천 알고리즘**:
```typescript
function recommendCharts(columns: ColumnMeta[]): ChartRecommendation[] {
  const hasCat = columns.some(c => c.type === 'nominal' || c.type === 'ordinal');
  const hasNum = columns.some(c => c.type === 'quantitative');
  const numCount = columns.filter(c => c.type === 'quantitative').length;

  const result: ChartRecommendation[] = [];
  if (hasCat && hasNum)   result.push({ type: 'bar', label: '막대 그래프', priority: 1 });
  if (numCount >= 2)      result.push({ type: 'scatter', label: '산점도', priority: 2 });
  if (hasCat && hasNum)   result.push({ type: 'boxplot', label: '박스 플롯', priority: 3 });
  if (numCount >= 1)      result.push({ type: 'histogram', label: '히스토그램', priority: 4 });
  if (hasCat && hasNum)   result.push({ type: 'line', label: '선 그래프', priority: 5 });
  return result.slice(0, 4);
}
```

**ChartThumbnail 컴포넌트**: 정적 SVG 아이콘 (실제 미니 차트 렌더링은 성능상 향후 개선)

#### D. 데이터 교체 버튼
```tsx
// 레퍼런스 1 하단: "+ 데이터 추가"
<div className="p-3 border-t">
  <Button variant="outline" className="w-full text-sm">
    <Plus className="h-4 w-4 mr-1" /> 데이터 추가
  </Button>
</div>
```
클릭 시 CSV 교체/추가. 현재는 upload 모드로 돌아가야 하므로 UX 개선.

**주의**: 현재 `DataUploadPanel`은 전체 화면 전용 UX(드롭존 + 템플릿 + Feature highlights)로 강하게 결합되어 있어 모달 재사용이 어려움. **구현 전략**: 업로드 로직(Papa Parse `parse` → `inferColumnMeta` → `selectXYFields` → `loadDataPackageWithSpec` 호출 체인)을 커스텀 훅(`useDataUpload`)으로 추출 → 모달용 경량 UI를 별도 작성. `DataUploadPanel` 자체는 수정하지 않음.

---

### G5.2 — 우측 속성 패널 (RightPropertyPanel)

기존 DataTab + StyleTab 내용을 **단일 아코디언 패널**로 통합. G4.1 설계를 확장.

**아코디언 구조**:
```
"속성 편집" 헤더 (⚙ 아이콘)
│
├─ ▸ 차트 유형 (기본 펼침)
│   └─ 아이콘 그리드 (3열) + 선택 상태 하이라이트
│
├─ ▸ 데이터 매핑 (기본 펼침)
│   ├─ X축 (설명변수) — 드롭다운
│   ├─ Y축 (반응변수) — 드롭다운
│   └─ 그룹 기준 — 드롭다운 + "초기화" 버튼
│
├─ ▸ 색상 및 스타일 (기본 펼침)
│   ├─ 팔레트 프리셋 스와치 (Nature/Science style 등)
│   ├─ 그룹별 색상 편집 (hex 컬러피커 인라인) — 신규
│   └─ 테두리 사용 (토글 + 두께/색상) — 신규
│
├─ ▾ 오차 막대 (조건부: bar/line/error-bar)
│   ├─ 표시 유형: [SEM] [SD] [95% CI] 버튼 그룹 토글
│   ├─ 선 두께: 슬라이더 (0.5~3px)
│   ├─ 캡 너비: 슬라이더 (0~10px)
│   └─ 유의성 표시 토글 (*, **, ***)
│
├─ ▾ 데이터 포인트 (지터) (조건부: bar/boxplot)
│   ├─ 개별 데이터 표시: 토글
│   ├─ 지터 폭: 슬라이더 (0~1)
│   └─ 투명도: 슬라이더 (0~100%)
│
├─ ▾ 회귀선 (추세선) (조건부: scatter)
│   ├─ 모델 유형: [선형] [다항식] [로스] 버튼 그룹
│   ├─ 95% 신뢰대역 표시: 체크박스
│   ├─ 상관계수(R²) 표시: 체크박스
│   └─ 선 스타일: 색상 + 실선/점선
│
├─ ▾ 축 설정
│   ├─ Y축: 범위 (min/max), 로그 스케일, 0 포함, 그리드
│   ├─ X축: 범위, 레이블 각도 (0°/-45°/-90°), 그리드
│   └─ 폰트 크기: 축 레이블/축 제목 개별 조절
│
├─ ▾ 범례 및 제목
│   ├─ 차트 제목 입력 + 과학 기호 삽입 (Ω)
│   ├─ 축 제목 (X/Y) + 과학 기호
│   ├─ 범례 위치 (위/우/아래/좌/숨김)
│   └─ 범례 레이블 편집 (커스텀 이름)
│
├─ ▾ 학술 스타일 프리셋
│   └─ Default / Science / IEEE / Grayscale (기존 StyleTab 프리셋 이전)
│
└─ ▾ 내보내기 형식 (기존 ExportDialog 모달의 핵심 옵션을 인라인화, 모달은 "고급 설정"으로 축소)
    ├─ PNG (300dpi) / SVG 선택
    └─ 저널 프리셋 크기 (Nature/Cell/IEEE...)
```

---

### G5.3 — 차트 유형 아이콘 그리드

현재 드롭다운 → 시각적 아이콘 그리드로 변경.

```tsx
// 3열 그리드, 선택 상태는 primary border + 배경
<div className="grid grid-cols-3 gap-1.5">
  {CHART_TYPES.map(type => (
    <button
      key={type.id}
      className={cn(
        "flex flex-col items-center gap-1 p-2 rounded-md border text-xs",
        "hover:bg-accent",
        isSelected && "border-primary bg-primary/5 font-medium"
      )}
      onClick={() => handleChartTypeChange(type.id)}
    >
      <ChartTypeIcon type={type.id} className="h-6 w-6" />
      <span>{type.label}</span>
    </button>
  ))}
</div>
```

**표시할 차트 유형** (ChartType 전 12종, `CHART_TYPE_HINTS` 기준):
| 아이콘 | 유형 | ID | 비고 |
|--------|------|-----|------|
| ▐▌▐▌ | 막대형 | `bar` | |
| ▐▌▐▌ (그룹) | 그룹 막대 | `grouped-bar` | |
| ▐█ (적층) | 적층 막대 | `stacked-bar` | |
| ━━ | 선형 | `line` | |
| ∷ | 산점도 | `scatter` | |
| ☐ | 박스 플롯 | `boxplot` | |
| ▐▐▐ | 히스토그램 | `histogram` | |
| ╪ | 오차 막대 | `error-bar` | |
| ▥ | 히트맵 | `heatmap` | |
| ◎ | 바이올린 | `violin` | G4.6 구현 후 활성화 |
| 📉 | KM 생존 곡선 | `km-curve` | Bio-Tools 연계 |
| 📈 | ROC 곡선 | `roc-curve` | Bio-Tools 연계 |

**그리드 레이아웃**: 12종 → 3열 × 4행. 향후 차트 유형 추가 시 행만 증가.

**ChartTypeIcon**: lucide-react 조합 또는 커스텀 SVG (24x24, Tailwind `h-6 w-6`)

---

### G5.4 — 인터랙티브 컨트롤 개선

#### A. 색상 팔레트 스와치 (인라인)
```tsx
// 현재: 드롭다운 목록
// 변경: 팔레트 미리보기 그리드

<div className="space-y-2">
  <Label className="text-xs">팔레트 (Nature/Science style)</Label>
  <div className="grid grid-cols-2 gap-1.5">
    {PALETTE_GROUPS.map(group => (
      <button
        className={cn(
          "flex items-center gap-1.5 p-1.5 rounded border text-xs",
          isSelected && "border-primary bg-primary/5"
        )}
        onClick={() => setScheme(group.key)}
      >
        <div className="flex gap-0.5">
          {group.colors.slice(0, 5).map((c, i) => (
            <span key={i} className="h-3 w-3 rounded-sm" style={{ backgroundColor: c }} />
          ))}
        </div>
        <span className="truncate">{group.label}</span>
      </button>
    ))}
  </div>
</div>
```

현재 `ALL_PALETTES`에 19개 팔레트 존재 → "선택됨" 표시 + 스크롤 or 2행 표시 + "더보기"

#### B. 그룹별 개별 색상 편집 (신규)
```tsx
// 레퍼런스 1: 실험군 1 (B) → #e37e5e 직접 편집
<div className="space-y-1.5">
  <Label className="text-xs">실험군 1 (B)</Label>
  <div className="flex items-center gap-2">
    <div className="flex items-center gap-1.5">
      <button
        className="h-6 w-6 rounded border"
        style={{ backgroundColor: groupColor }}
        onClick={() => openColorPicker(groupKey)}
      />
      <Input value={hexInput} className="h-6 w-16 text-xs font-mono" />
    </div>
    <div className="flex items-center gap-1">
      <Checkbox checked={useBorder} />
      <span className="text-xs">테두리 사용 ({borderWidth}px, {borderColor})</span>
    </div>
  </div>
</div>
```

**스키마 변경 필요**:
```typescript
// types/graph-studio.ts — ColorSpec 확장
export interface ColorSpec {
  field: string;
  type: DataType;
  legend?: LegendSpec;
  customColors?: Record<string, string>;  // NEW: 그룹명 → hex
}
```

#### C. 오차 막대 버튼 그룹
```tsx
// 현재: 드롭다운
// 변경: 버튼 그리드 (레퍼런스 1 스타일)
<div className="flex gap-1">
  {['stderr', 'stdev', 'ci', 'iqr'].map(type => (
    <Button
      key={type}
      variant={activeType === type ? 'default' : 'outline'}
      className="flex-1 h-8 text-xs"
      onClick={() => setErrorBarType(type)}
    >
      {type === 'stderr' ? 'SEM' : type === 'stdev' ? 'SD' : type === 'ci' ? '95% CI' : 'IQR'}
    </Button>
  ))}
</div>
```

#### D. 슬라이더 컨트롤 (신규)
오차 막대 선 두께, 캡 너비, 지터 폭, 투명도 등에 공통 사용.

**의존성**: `@/components/ui/slider` (shadcn/ui Slider 컴포넌트)

```tsx
<div className="space-y-1">
  <div className="flex items-center justify-between">
    <Label className="text-xs">선 두께</Label>
    <span className="text-xs text-muted-foreground">{lineWidth}px</span>
  </div>
  <Slider
    value={[lineWidth]}
    onValueChange={([v]) => setLineWidth(v)}
    min={0.5} max={3} step={0.5}
    className="w-full"
  />
</div>
```

---

### G5.5 — 캔버스 미니 툴바

ChartPreview 상단에 떠 있는 도구 모음 (레퍼런스 3 스타일).

```tsx
<div className="absolute top-2 right-2 flex gap-1 bg-background/80 backdrop-blur rounded-md border p-0.5">
  <ToolbarButton icon={ZoomIn} tooltip="확대" />
  <ToolbarButton icon={ZoomOut} tooltip="축소" />
  <ToolbarButton icon={Maximize} tooltip="화면 맞춤" />
  <ToolbarButton icon={Camera} tooltip="스크린샷" />
</div>
```

현재 Header에 있는 줌 컨트롤을 캔버스 위로 이동. 더 직관적.

---

## 4. G4와의 관계

| G4 항목 | G5 통합 방안 |
|---------|-------------|
| G4.1 Accordion 재설계 | → **G5.2에 흡수** (RightPropertyPanel 아코디언) |
| G4.2 축 설정 확장 | → G5.2 "축 설정" 섹션에서 UI 배치. 컨버터 수정은 G4.2 그대로 진행. |
| G4.3 Jitter Dots | → G5.2 "데이터 포인트(지터)" 섹션에서 UI 배치. 스키마/컨버터는 G4.3 그대로. |
| G4.4 에러바 상세 | → G5.4C 버튼 그룹 + 슬라이더에서 UI 배치. 스키마는 G4.4 그대로. |
| G4.5 선/마커 스타일 | → scatter: G5.2 "회귀선(추세선)" 섹션, line: "축 설정" 하위 "선 스타일" 서브섹션에서 배치. |
| G4.6 Violin Plot | → 독립 (G5와 무관) |
| G4.7 Broken Axis | → G5.2 "축 설정" 섹션 하위에 배치 |

**결론**: G4의 스키마/컨버터 작업은 그대로 유효. 단, G5를 두 단계로 분리해야 충돌을 방지할 수 있음:

### G5 범위 분리

| 단계 | 범위 | G4 병렬 가능 여부 |
|------|------|-----------------|
| **G5A: 레이아웃/컴포넌트 재구성** | G5.0~G5.3, G5.4A/C/D, G5.5 — 순수 UI 구조 변경. 스키마 미변경. | G4와 완전 병렬 가능 |
| **G5B: 스키마 확장 포함 컨트롤** | G5.4B(customColors), 회귀선 모델 확장, boxplotOptions, scatterOptions | **G4 스키마 작업 완료 후** 진행 권장. strict() Zod + AI 프롬프트 동시 수정이 필요하므로 G4와 동시 진행 시 충돌 위험 |

**진행 권장**: G5A 먼저 완료 → G4 스키마 작업 → G5B 순차 진행. G5A만으로도 3패널 전환 + 아코디언 + 아이콘 그리드 등 주요 UX 개선 달성.

---

## 5. 스키마 변경 요약

G5에서 새로 필요한 스키마 변경 (G4와 중복 제외):

| 항목 | 필드 | 위치 | 비고 |
|------|------|------|------|
| 그룹별 색상 | `customColors` | `ColorSpec` | `Record<string, string>` |
| 회귀선 모델 유형 | `trendline.type` 확장 | `TrendlineSpec` | 기존 `'linear'` → `'linear' \| 'polynomial' \| 'loess'`. **주의**: `polynomial`/`loess`는 JS 계산 라이브러리 또는 Pyodide 필요 (G4.6 violin과 유사한 의존성 결정 필요) |
| 신뢰대역 표시 | `trendline.showCI` | `TrendlineSpec` | `boolean` |
| R² 표시 | `trendline.showR2` | `TrendlineSpec` | `boolean` |
| 박스 플롯 옵션 | `boxplotOptions` | `ChartSpec` 루트 | `{ showNotch, showMean, showOutliers }`. **주의**: `showJitter`는 G4.3 `showRawPoints`와 동일 역할 → G4.3 스키마를 재사용하고 여기서는 제외 |
| 산점도 점 스타일 | `encoding.scatter` 또는 `ChartSpec` 루트 | **G5B 착수 전 확정 필수** | `{ pointSize, opacity }`. 기존 `encoding` 하위 패턴과 일관성 고려. G4 스키마 구조 확정 후 결정 |

**스키마 확장 체크리스트** (6곳 동시 수정 필수):
1. `types/graph-studio.ts` — 타입 정의
2. `chart-spec-schema.ts` — Zod `.strict()` 스키마
3. `ai-service.ts` — AI 프롬프트 (스키마 설명)
4. `project-storage.ts` — `loadProject` 복원 경로 (기존 localStorage 프로젝트에 새 필드 없음 → 기본값 폴백 필요)
5. `graph-studio-store.ts` `setProject` — 프로젝트 복원 시 새 필드 정규화
6. 테스트 — 위 5곳 모두 커버

---

## 6. 진행 순서 권장

```
═══ G5A: 레이아웃/컴포넌트 재구성 (스키마 미변경, G4 병렬 가능) ═══

Phase 0: G5.0 (3패널 레이아웃)  ← 모든 G5의 뼈대. 최우선.
  │
  ├─ G5.1 (좌측 패널)     ← G5.0 직후. 데이터 소스 + 변수 + 추천 차트.
  │
  ├─ G5.2 (우측 패널)     ← G5.0 직후. G4.1 흡수. 아코디언 구조.
  │
  ├─ G5.3 (차트 유형 아이콘)  ← G5.2와 병렬 가능
  │
  ├─ G5.4A (팔레트 스와치)    ← 순수 UI 교체 (스키마 불변)
  ├─ G5.4C (오차 막대 버튼 그룹) ← 순수 UI 교체 (스키마 불변)
  ├─ G5.4D (슬라이더 컨트롤)   ← 순수 UI 교체 (스키마 불변)
  │
  └─ G5.5 (캔버스 미니 툴바)  ← 독립. 언제든 추가 가능.

═══ G4: 스키마/컨버터 (G5A와 병렬 진행 가능) ═══

  ├─ G4.2 (축 설정 컨버터)  ← G5.2 "축 설정" UI에 즉시 반영
  ├─ G4.3 (Jitter 스키마)   ← G5.2 "데이터 포인트" 섹션 UI에 반영
  ├─ G4.4 (에러바 스키마)   ← G5.4C 버튼 그룹 UI에 반영
  └─ G4.5~G4.7             ← 독립 진행

═══ G5B: 스키마 확장 포함 컨트롤 (G4 스키마 완료 후) ═══

  ├─ G5.4B (그룹별 색상 편집)  ← customColors 스키마 추가 필요
  ├─ G5.2+ 회귀선 모델 확장    ← trendline.type/showCI/showR2 스키마
  └─ boxplotOptions, scatterOptions 스키마 확장
```

---

## 7. 변경 영향 범위

| Phase | 신규 파일 | 수정 파일 | 삭제 파일 |
|-------|----------|----------|----------|
| G5.0 | `LeftDataPanel.tsx`, `RightPropertyPanel.tsx` | `page.tsx`, `graph-studio-store.ts`, `types/graph-studio.ts`, `AiPanel.tsx`, `GraphStudioHeader.tsx` | `SidePanel.tsx` |
| G5.1 | `ChartThumbnail.tsx`, `chart-recommender.ts`, `useDataUpload.ts` (업로드 로직 훅) | `LeftDataPanel.tsx` | — |
| G5.2 | `useDataTabLogic.ts`, `useStyleTabLogic.ts` (로직 훅) | `RightPropertyPanel.tsx`, `DataTab.tsx`, `StyleTab.tsx` (래퍼 유지, 로직 훅 추출) | — |
| G5.3 | `ChartTypeIcon.tsx` (또는 인라인 SVG) | `RightPropertyPanel.tsx` | — |
| G5.4A/C/D (G5A) | — | `RightPropertyPanel.tsx` (UI만 교체, 스키마 불변) | — |
| G5.4B (G5B) | — | `RightPropertyPanel.tsx`, `types/graph-studio.ts`, `chart-spec-schema.ts`, `ai-service.ts` | — |
| G5.5 | `CanvasToolbar.tsx` | `ChartPreview.tsx`, `GraphStudioHeader.tsx` (줌 컨트롤 이동) | — |

**테스트 영향**:
- E2E `data-testid`: 기존 testid(`graph-studio-side-panel`, `graph-studio-tab-data/style`) **유지 필수** (selectors.ts 규약). 새 패널에 alias 매핑.
- DataTab/StyleTab 단위 테스트 → 로직 훅 테스트로 전환 (아래 §10 참조)
- 새 컴포넌트 (ChartThumbnail, ChartTypeIcon 등) 테스트 추가

---

## 8. 범위 외 (G5에서 다루지 않음)

| 기능 | 이유 |
|------|------|
| 드래그앤드롭 변수 매핑 | 복잡한 DnD 라이브러리 의존 + 드롭다운이 이미 효과적 |
| 차트 위 직접 제목 편집 | ECharts graphic 이벤트 + 인라인 에디터 복잡도 높음 |
| 리사이즈 가능 패널 (드래그 경계) | 고정 너비로 충분. 향후 필요 시 `react-resizable-panels` 도입 |
| 데이터 편집 기능 (셀 수정) | 별도 "데이터 편집" 페이지에서 처리 |
| 다중 차트 레이아웃 | Figure 수준 기능. 별도 Phase |
| 실시간 미니 차트 썸네일 렌더링 | 성능 부담. 정적 SVG 아이콘으로 대체 |

---

## 9. 메인 화면 (ChatCentricHub) 연동 고려

현재 ChatCentricHub의 "데이터 시각화" 카드가 `/graph-studio`로 연결됨.
리디자인 후 추가 연동 포인트:

- **최근 프로젝트 표시**: Hub에서 Graph Studio 최근 작업 카드 표시
- **Smart Flow → Graph Studio 전환**: 분석 결과에서 "그래프 편집" 버튼 (G3-1과 동일)
- **차트 미리보기**: Hub에서 최근 차트 썸네일 표시 (G5.1 ChartThumbnail 재사용 가능)

이 연동은 G5 완료 후 별도 작업으로 진행.

---

## 10. 이행 전략: DataTab/StyleTab 로직 훅 추출 (G5.2)

### 문제
DataTab (867줄), StyleTab (480줄)의 **이벤트 핸들러 + 상태 로직**을 RightPropertyPanel에 그대로 복사하면:
- 코드 중복 또는 거대 단일 컴포넌트 발생
- 기존 DataTab/StyleTab 단위 테스트가 즉시 깨짐
- 향후 DataTab/StyleTab을 다른 곳(모바일 레이아웃 등)에서 재사용 불가

### 해결: 로직 훅 추출 패턴

```
현재:
  DataTab.tsx (867줄) = 상태 + 핸들러 + JSX 혼합
  StyleTab.tsx (481줄) = 상태 + 핸들러 + JSX 혼합

변경 후:
  useDataTabLogic.ts  ← 상태 + 핸들러만 추출 (테스트 대상)
  useStyleTabLogic.ts ← 상태 + 핸들러만 추출 (테스트 대상)
  DataTab.tsx          ← useDataTabLogic() + JSX (래퍼로 유지, 기존 testid 보존)
  StyleTab.tsx         ← useStyleTabLogic() + JSX (래퍼로 유지)
  RightPropertyPanel.tsx ← useDataTabLogic() + useStyleTabLogic() + 새 아코디언 JSX
```

**이점**:
1. **기존 테스트 유지**: DataTab/StyleTab 단위 테스트는 훅 테스트로 전환 (renderHook)
2. **기존 E2E 유지**: DataTab.tsx를 삭제하지 않으므로 testid 호환성 문제 없음
3. **점진적 전환**: DataTab → RightPropertyPanel 전환을 import 교체로 처리
4. **최종 정리**: RightPropertyPanel로 E2E 전수 통과 + 1주 안정 운영 후, DataTab/StyleTab 래퍼를 삭제하고 testid를 RightPropertyPanel로 완전 이전

---

## 11. G5.0 영향범위 전체 목록 (코드 검증 기반)

| 파일 | 변경 내용 |
|------|----------|
| `types/graph-studio.ts` L347 | `AiPanelDock = 'bottom' \| 'left'` (right 제거) |
| `types/graph-studio.ts` L365 | `sidePanel: 'data' \| 'style'` 타입 필드 제거 |
| `lib/stores/graph-studio-store.ts` L57, L163, L191-192 | `sidePanel` 초기값 + `setSidePanel` 액션 + 마이그레이션 코드 제거 |
| `app/graph-studio/page.tsx` L73(isSidePanelOpen), L101(sidePanelWidth), L110-126(도킹 분기) | 3패널 레이아웃 + right 도킹 분기 제거 + `onToggleSidePanel` prop → 좌/우 개별 토글로 변경 |
| `components/graph-studio/GraphStudioHeader.tsx` | `onToggleSidePanel` prop 시그니처 변경 (단일 → 좌/우 개별) |
| `components/graph-studio/AiPanel.tsx` L175, L221-231 | `isSide` 분기 전체 제거 + 도킹 버튼(ArrowLeft/ArrowRight) 전체 제거 → bottom 전용 |
| `components/graph-studio/SidePanel.tsx` | **삭제** (단, LeftDataPanel/RightPropertyPanel에 alias testid 부착 후) |
| `components/graph-studio/LeftDataPanel.tsx` | **신규** |
| `components/graph-studio/RightPropertyPanel.tsx` | **신규** |
| `e2e/selectors.ts` | **수정 금지** — 새 testid만 추가 |
