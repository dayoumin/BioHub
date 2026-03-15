# Graph Studio UX 개선 계획

> 작성: 2026-03-14 | 상태: v5 — 코드 리뷰 반영 + 4-1/4-2 적용 완료

## 배경

Graph Studio 3단계 흐름(데이터→설정→편집) 도입 후, 사용자 시나리오별 UX 갭 분석 결과를 기반으로 한 개선 계획.

## 사용자 시나리오

```
A. 논문 작성자: 같은 스타일로 Figure 1, 2, 3... 반복 생성
B. 탐색 사용자: 같은 데이터로 bar → scatter → boxplot 비교
C. 반복 사용자: 어제 만든 차트와 같은 설정으로 새 데이터 적용
D. 첫 사용자: 샘플로 체험 → 내 데이터 업로드
```

---

## Phase 1: 핵심 네비게이션 ✅ 구현 완료

### 1-1. 데이터 교체 시 스타일 보존

**현재 문제**: LeftDataPanel "데이터 교체" 클릭 시 `createDefaultChartSpec()` 호출 → 스타일, 프리셋, 색상 팔레트, 주석 등 **전부 소실**.

**보존 대상** (데이터 무관):
- `style` (프리셋, 폰트, 배경, 패딩, scheme, showDataLabels, showSampleCounts)
- `exportConfig` (포맷, DPI, 물리 크기)
- `chartType`
- `annotations` — **전부 보존** (현재 AnnotationSpec은 화면 좌표 기반 graphic 오버레이. 데이터 필드 참조 개념 없음.)

**재생성 대상** (새 데이터 컬럼에 의존):
- `encoding` (X/Y/color/shape/size) → `selectXYFields()`로 재매핑
- `significance` marks → 그룹명(`groupA`/`groupB`) 참조이므로 제거
- `facet`, `y2`, `errorBar` → 필드명 참조이므로 제거
- `trendline` → chartType이 scatter가 아니면 제거
- `aggregate.groupBy` → 새 컬럼에 없는 필드만 제거 (있는 필드는 유지)

**전략**: "같은 차트 유형 + 같은 스타일 + 새 데이터에 맞는 새 인코딩"

**수정 파일**:
- `LeftDataPanel.tsx` — `handleFileChange` 로직 변경
- `LeftDataPanel.tsx` — accept 속성에 `.xlsx,.xls` 추가 + Excel 파싱 로직 추가

**Excel 파싱**: DataUploadPanel의 `xlsx` dynamic import 패턴 재사용.
LeftDataPanel은 현재 `Papa.parse` CSV 전용. Excel 지원 시 DataUploadPanel의 패턴을 공통 유틸로 추출하거나, 확장자 분기 로직을 LeftDataPanel에도 추가해야 함.
```typescript
// 공통 유틸 추출 방안 (lib/graph-studio/file-parser.ts)
export async function parseFile(file: File): Promise<{ columns: ColumnMeta[]; data: Record<string, unknown[]> }>
// → CSV: Papa.parse, XLSX: dynamic import('xlsx')
// → LeftDataPanel, DataUploadPanel 모두 이 유틸 사용
```

**구현 요약**:
```typescript
// 현재 chartSpec에서 스타일 추출
const { style, exportConfig, chartType, annotations } = existingSpec;
// 새 데이터로 인코딩만 재생성
const { xField, yField } = selectXYFields(newColumns, CHART_TYPE_HINTS[chartType]);
const newSpec = createDefaultChartSpec(pkg.id, chartType, xField, yField, newColumns);
// 스타일 + 주석 복원
newSpec.style = { ...style };
newSpec.exportConfig = { ...exportConfig };
newSpec.annotations = [...annotations];
```

### 1-2. 에디터→설정 네비게이션 (차트 재설정)

**현재 문제**: 에디터에서 차트 유형/필드를 근본적으로 바꾸려면 "새 차트"밖에 없음 → 데이터까지 리셋됨.

**추가할 것**:
- Store: `goToSetup()` 액션 — `chartSpec=null` (dataPackage 유지), 이전 chartSpec을 `previousChartSpec`에 보관
- Header: "차트 재설정" 버튼 (에디터 모드에서만 표시)
- ChartSetupPanel: `previousChartSpec`이 있으면 초기값으로 사용 (chartType, preset, fields)

**Store 변경**:
```typescript
interface GraphStudioState {
  // ... 기존 ...
  /** 차트 재설정 시 이전 spec 보관 (ChartSetupPanel 초기값용) */
  previousChartSpec: ChartSpec | null;
}

interface GraphStudioActions {
  // ... 기존 ...
  /** 에디터→설정 이동: chartSpec 제거 + previousChartSpec에 보관 */
  goToSetup: () => void;
}
```

**previousChartSpec 수명 관리**:
| 이벤트 | previousChartSpec 처리 |
|--------|----------------------|
| `goToSetup()` | `previousChartSpec = currentChartSpec` (보관) |
| `loadDataPackageWithSpec()` (차트 생성 완료) | `previousChartSpec = null` (소비 완료) |
| `clearData()` | `previousChartSpec = null` (세션 리셋) |
| `loadDataOnly()` (새 데이터 업로드) | `previousChartSpec = null` (데이터 불일치 방지) |
| `setProject()` (프로젝트 로드) | `previousChartSpec = null` (외부 프로젝트) |

**Header 버튼 구분**:
| 버튼 | 동작 | 결과 |
|------|------|------|
| "+ 새 차트" | `clearData()` | Step 1 (데이터 선택) |
| "차트 재설정" | `goToSetup()` | Step 2 (차트 설정, 데이터 유지) |

**ChartSetupPanel 초기값**:
```typescript
const previousSpec = useGraphStudioStore(state => state.previousChartSpec);
const [selectedType, setSelectedType] = useState<ChartType>(
  previousSpec?.chartType ?? defaultType
);
const [selectedPreset, setSelectedPreset] = useState<StylePreset>(
  previousSpec?.style.preset ?? 'default'
);
```

### 1-3. "새 차트" 확인 대화상자

**현재 문제**: 클릭 즉시 `clearData()` → 30분 작업 손실 가능.

**조건**: `historyIndex > 0` (편집 이력 있을 때)만 AlertDialog 표시. 이력 없으면 바로 실행.

**수정 파일**: `GraphStudioHeader.tsx`

**UI**: shadcn AlertDialog
```
제목: 새 차트를 만드시겠습니까?
본문: 현재 작업이 저장되지 않았습니다. 계속하면 모든 변경사항이 사라집니다.
버튼: [취소] [새 차트 만들기]
```

### 1-4. ChartSetupPanel 단계 표시기

**현재 문제**: DataUploadPanel에는 "① 데이터 선택 > ② 차트 설정 > ③ 편집" 표시기 있지만, ChartSetupPanel에는 없음.

**수정**: ChartSetupPanel 상단에 동일한 스텝 인디케이터 추가, ② 강조.

**공통 컴포넌트화**: DataUploadPanel과 ChartSetupPanel 모두 사용하므로 `StepIndicator` 컴포넌트로 추출.
```typescript
function StepIndicator({ currentStep }: { currentStep: 0 | 1 | 2 }): React.ReactElement
```

### 1-5. AI 채팅 이력 초기화

**현재 문제**: 데이터 변경 후에도 이전 데이터의 AI 채팅 이력 잔존 → "species 컬럼을..." 같은 무효 메시지.

**수정**: `loadDataOnly`, `loadDataPackageWithSpec`(데이터 교체), `clearData` 호출 시 localStorage의 **`graph_studio_ai_chat`** 키 삭제.

> ⚠️ 키 이름 주의: `use-ai-chat.ts`의 `CHAT_STORAGE_KEY = 'graph_studio_ai_chat'` (NOT `graph_studio_ai_chat_messages`)

**수정 파일**: `graph-studio-store.ts` — 해당 액션들에 `localStorage.removeItem('graph_studio_ai_chat')` 추가.

---

## Phase 2: 스타일 템플릿 ✅ 구현 완료

### 2-1. 템플릿 데이터 구조 + 저장/불러오기

**타입**:
```typescript
interface StyleTemplate {
  id: string;
  name: string;           // "Nature 투고용", "학위논문 Figure"
  style: StyleSpec;       // preset, scheme, font, colors, background, padding, showDataLabels 등 전체
  exportConfig: ExportConfig; // format, dpi, physicalWidth, physicalHeight 등 전체
  createdAt: string;
  updatedAt: string;
}
// Note: scheme은 StyleSpec.scheme에 포함되므로 별도 필드 불필요
```

**저장소**: localStorage `graph_studio_style_templates` 키 (JSON 배열)

**유틸 파일**: `lib/graph-studio/style-template-storage.ts`
```typescript
export function loadTemplates(): StyleTemplate[]
export function saveTemplate(template: StyleTemplate): void
export function deleteTemplate(id: string): void
```

### 2-2. ChartSetupPanel 템플릿 UI

**위치**: 기존 4프리셋 (Default/Science/IEEE/Grayscale) 아래에 "내 템플릿" 섹션.

**동작**:
- 저장된 템플릿 있으면 표시 (카드 형태, 이름 + 프리셋 라벨 + 폰트/DPI 요약)
- 클릭 시 **style 전체 + exportConfig 전체** 적용 (프리셋뿐 아니라 폰트, 배경, 패딩, DPI, 물리 크기 등 모두)
- 삭제 버튼 (×)

**적용 로직**:
```typescript
// 템플릿 클릭 시
setSelectedPreset(template.style.preset);
// + 차트 생성(handleCreate) 시 style/exportConfig를 템플릿에서 덮어쓰기
// selectedTemplate state 추가 필요
```

**템플릿 없을 때**: 섹션 자체 숨김 (빈 상태 메시지 불필요).

### 2-3. StyleTab "템플릿으로 저장" 버튼

**위치**: StyleTab 하단 (학술 스타일 프리셋 아래).

**동작**:
1. 버튼 클릭 → 인라인 Input 노출 (이름 입력)
2. Enter 또는 "저장" 클릭 → localStorage에 저장
3. 저장 후 toast 알림

**저장 내용**: `chartSpec.style` 전체 (preset, scheme, font, colors, background, padding, showDataLabels, showSampleCounts) + `chartSpec.exportConfig` 전체 (format, dpi, physicalWidth, physicalHeight, transparentBackground)

> ⚠️ style.scheme은 StyleSpec 내부에 이미 포함. StyleTemplate에서 별도 `scheme?` 필드 불필요 → 제거.

---

## Phase 1.5: AI 시스템 프롬프트 경로 보완 ✅ 완료

별도 세션에서 구현 완료. `ai-service.ts`의 `CHART_EDIT_SYSTEM_PROMPT` 수정 결과:

**프롬프트에 문서화된 경로 (AI 패치 생성 가능)**:
| 경로 | 상태 |
|------|------|
| `/encoding/y2` | ✅ 프롬프트 포함 (라인 47) |
| `/orientation` | ✅ 프롬프트 포함 (라인 52) |
| `/trendline` | ✅ 프롬프트 포함 (라인 53) |
| `/facet` | ✅ 프롬프트 포함 (라인 54) |

**렌더러 미지원 — 패치 생성 금지 유지**:
| 경로 | 상태 |
|------|------|
| `/significance` | 🚫 프롬프트 "NOT YET RENDERED" + `UNRENDERED_PATH_PREFIXES` 코드 차단 |
| `/encoding/size` | 🚫 프롬프트 "NOT YET RENDERED" + `UNRENDERED_PATH_PREFIXES` 코드 차단 |

> significance/size는 echarts-converter에서 렌더링 구현 후 프롬프트 금지 해제 + `UNRENDERED_PATH_PREFIXES` 제거 필요.

**AiPanel 카드 추가 (선택, 미구현)**:
- "수평 막대로 변환" → `/orientation`
- "회귀선 추가" → `/trendline`
- "패싯 분할" → `/facet`

---

## Phase 4: 패널 구조 개선

> 상태: 4-1/4-2 적용 완료, 4-3/4-5 구현 대기

### 배경 (사용자 관점 문제)

현재 에디터 모드 레이아웃:
```
[좌측 256px]        [중앙 flex-1]        [우측 320px]
데이터 소스 정보     차트 캔버스          데이터 탭 (→ 차트 설정)
변수 목록 (읽기만)                       스타일 탭
데이터 교체 버튼
```

**문제 1 — 좌측 패널 활용도 낮음**: 변수 목록과 역할 배지를 보여주지만 인터랙션 없음. 사용자는 좌측에서 변수를 확인한 뒤 우측 Select를 열어 같은 변수를 다시 찾아야 함. 256px 공간 대비 실용 가치가 낮음.

**문제 2 — "데이터" 탭 명칭 혼란**: 우측 "데이터" 탭의 실제 내용은 차트 유형, X/Y 필드 매핑, 색상 팔레트, 에러바, 회귀선, 유의성 마커 등 — "차트 설정"에 가까운 내용. 사용자가 "데이터 관련 설정"을 찾을 때 직관적이지 않음.

**문제 3 — 정보 분산**: 좌측에서 변수+역할을 보여주고, 우측에서 동일 필드를 Select 드롭다운으로 다시 매핑. 같은 개념이 두 곳에 분산.

### 4-1. "데이터" → "차트 설정" 탭명 변경 ✅ 완료

**난이도**: 1줄 변경
**효과**: 탭 내용과 이름의 의미 일치

**수정 파일**: `components/graph-studio/RightPropertyPanel.tsx`
```diff
- <AccordionTrigger data-testid="graph-studio-tab-data">데이터</AccordionTrigger>
+ <AccordionTrigger data-testid="graph-studio-tab-data">차트 설정</AccordionTrigger>
```

> Note: `data-testid`는 유지 (E2E 테스트 호환성)

### 4-2. 좌측 패널 기본 접힘 ✅ 완료

**난이도**: 1줄 변경
**효과**: 차트 캔버스 256px 넓어짐. 필요시 헤더 토글(PanelLeft)로 열기.

**수정 파일**: `app/graph-studio/page.tsx`
```diff
- const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
+ const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
```

**근거**: 좌측 패널은 변수 확인용 → 편집 중 상시 필요하지 않음. 우측 "차트 설정" 탭에서 이미 필드 Select가 있으므로 핵심 조작에 영향 없음.

### 4-3. 좌측 패널 변수 클릭 → 빠른 역할 할당

**난이도**: 중간 (Popover + store 연동)
**효과**: 좌측 패널의 존재 이유 강화. 드래그 없이 1-click으로 필드 매핑.

**현재 흐름** (5단계):
```
좌측에서 변수 확인 → 우측 탭 열기 → "X축 필드" Select 열기 → 스크롤하여 변수 찾기 → 클릭
```

**개선 흐름** (2단계):
```
좌측 변수 클릭 → Popover 메뉴에서 역할 선택 (X축 / Y축 / 색상 / 패싯)
```

**구현 설계**:

```typescript
// LeftDataPanel.tsx 변수 행에 Popover 추가
<Popover>
  <PopoverTrigger asChild>
    <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded
                    hover:bg-muted/50 cursor-pointer transition-colors">
      <Icon className={`h-3 w-3 shrink-0 ${cfg.color.split(' ')[0]}`} />
      <span className="truncate flex-1">{col.name}</span>
      {role && <RoleBadge role={role} />}
      <TypeBadge type={col.type} />
    </div>
  </PopoverTrigger>
  <PopoverContent className="w-36 p-1" side="right">
    <div className="space-y-0.5">
      <PopoverMenuItem
        label="X축 지정"
        active={role === 'X'}
        onClick={() => assignField(col.name, 'x')}
      />
      <PopoverMenuItem
        label="Y축 지정"
        active={role === 'Y'}
        disabled={col.type !== 'quantitative'}
        onClick={() => assignField(col.name, 'y')}
      />
      <PopoverMenuItem
        label="색상 그룹"
        active={role === 'Color'}
        onClick={() => assignField(col.name, 'color')}
      />
      <PopoverMenuItem
        label="패싯 분할"
        active={role === 'Facet'}
        disabled={col.type !== 'nominal' && col.type !== 'ordinal'}
        onClick={() => assignField(col.name, 'facet')}
      />
      {role && (
        <>
          <div className="border-t border-border my-1" />
          <PopoverMenuItem
            label="역할 해제"
            destructive
            onClick={() => unassignField(col.name)}
          />
        </>
      )}
    </div>
  </PopoverContent>
</Popover>
```

**Store 액션 추가**: `assignFieldRole(field, role)` — 기존 `updateChartSpec` 활용
```typescript
// graph-studio-store.ts
assignFieldRole: (field: string, role: 'x' | 'y' | 'color' | 'facet') => {
  const spec = get().chartSpec;
  if (!spec) return;
  const updated = { ...spec };
  switch (role) {
    case 'x': updated.encoding = { ...updated.encoding, x: { ...updated.encoding.x, field } }; break;
    case 'y': updated.encoding = { ...updated.encoding, y: { ...updated.encoding.y, field } }; break;
    case 'color': updated.encoding = { ...updated.encoding, color: { field, type: 'nominal' } }; break;
    case 'facet': updated.facet = { field }; break;
  }
  get().updateChartSpec(updated);
}
```

**의존성**: shadcn Popover (이미 설치됨)

**제약 사항**:
- Y축은 quantitative 컬럼만 허용
- 패싯은 nominal/ordinal만 허용
- 이미 X/Y에 사용 중인 컬럼은 다른 역할 disabled 처리
- **기존 상호 배타 로직 재사용 필수**: `useDataTabLogic.ts`의 `showColorField`, `showFacet`, `showY2` 조건을 그대로 적용해야 함. 예: `showColorField = supportsColor && !hasY2 && !hasFacet`. assignFieldRole()을 별도로 만들면 UI가 막는 조합을 store에 만들 수 있으므로, **기존 normalize 로직을 공유**해야 함.
- **주의**: histogram과 km-curve는 `supportsColor: true`임 (계획 초안의 예시가 부정확했음). 색상 비활성 조건은 supportsColor가 아니라 hasY2/hasFacet 상호 배타.
- **X/Y 역할 해제 불가**: `encoding.x`와 `encoding.y`는 ChartSpec 필수 필드. Popover에서 역할 해제는 color/facet/y2 같은 optional 필드에만 노출. X/Y에 대해서는 "해제" 대신 다른 컬럼으로 "교체"만 가능.

### 4-4. 시리즈 색상 hex 복사 ✅ 완료

**수정 파일**: `components/graph-studio/panels/StyleTab.tsx`
- 색상 스워치 아래에 hex 텍스트 행 추가
- 클릭 시 `navigator.clipboard.writeText()` + toast 알림

### 구현 순서 및 의존성

```
4-1 (탭명 변경) ──── ✅ 완료
4-2 (좌측 접힘) ──── ✅ 완료
4-3 (변수 클릭) ──── 구현 대기 (상호 배타 로직 재사용 필요)
4-4 (색상 복사) ──── ✅ 완료
4-5 (프로젝트 해제) ── 구현 대기 (disconnectProject 액션 방식으로 변경)
```

### 4-5. 데이터 교체 시 프로젝트 연결 해제

**배경**: 현재 `loadDataPackageWithSpec()`은 `currentProject`를 건드리지 않음. 저장된 프로젝트를 연 상태에서 LeftDataPanel "데이터 교체"를 하면, 이후 저장이 기존 프로젝트를 덮어쓸 위험.

**⚠️ `loadDataPackageWithSpec` 자체는 수정 불가**: 이 액션은 3곳에서 호출됨:
- `ChartSetupPanel.tsx:206` — 설정 완료 (프로젝트 유지해야 함)
- `LeftDataPanel.tsx:110` — 데이터 교체 (프로젝트 끊어야 함)
- `ResultsActionStep.tsx:533` — 결과→Graph Studio (새 작업)

**수정 방안 A — store에 `disconnectProject` 액션 추가** (권장):
```typescript
// graph-studio-store.ts
disconnectProject: () => {
  set({ currentProject: null });
},
```

```typescript
// LeftDataPanel.tsx — 데이터 교체 후 호출
loadDataPackageWithSpec(pkg, newSpec);
disconnectProject(); // 기존 프로젝트 덮어쓰기 방지
```

**수정 방안 B — `loadDataPackageWithSpec`에 옵션 플래그 추가**:
```typescript
loadDataPackageWithSpec: (pkg, spec, opts?: { disconnectProject?: boolean }) => {
  clearAiChatHistory();
  set({
    ...baseState,
    ...(opts?.disconnectProject ? { currentProject: null } : {}),
  });
},
```

**권장**: 방안 A (단순, 호출부에서 의도 명확)

> 시나리오 C(반복 사용자)에서 특히 중요: "어제 프로젝트 열기 → 새 데이터 교체 → 저장 → 어제 프로젝트가 새 데이터로 덮어씌워짐" 방지.

### 알려진 제한사항

**annotations 보존 — subtype별 위험도**:
- `text`, `line`, `rect` — 절대 좌표 기반 graphic 오버레이. 축 범위 변경 시 위치 어긋남 가능하지만 설정값 자체는 유효.
- **`hline`** — `value: number` (Y축 데이터 값). 새 데이터의 Y 범위가 다르면 차트 밖으로 벗어남.
- **`vline`** — `value: number | string` (X축 값 또는 카테고리명). 새 데이터에 해당 카테고리가 없으면 무효.
- **현재 구현**: Phase 1에서 annotations 전체 보존 중. hline/vline 데이터 바인딩 검증은 미구현 — 향후 데이터 교체 시 subtype별 검증 규칙 추가 필요.

**"새 차트" 확인 대화상자 조건**:
- 현재: `historyIndex > 0` (undo history 존재 여부)
- **한계**: `setExportConfig`은 specHistory에 넣지 않으므로 (graph-studio-store.ts:201), DPI/출력 크기만 바꾼 사용자는 경고 없이 설정 손실.
- **향후 개선**: dirty flag 또는 last-saved snapshot 비교 도입 시 해결 가능. 현재는 "대부분의 편집은 history에 반영됨"으로 허용.

**데이터 교체 시 encoding 재사용**:
- 현재: color/facet/y2를 전부 제거하고 X/Y만 `selectXYFields()`로 재매핑.
- **개선 가능**: graph-studio-store.ts:91의 프로젝트 복원 호환성 체크(`colNames.has()`)를 재사용하면, 같은 컬럼이 있는 경우 기존 color/facet 매핑 유지 가능. 시나리오 A(같은 스타일로 Figure 반복)에 유리.

---

## Phase 5: 학술 UX 고도화 (계획)

> 2025-2026 학술 시각화 도구 동향 조사 기반 (GraphPad Prism 11, Origin 2025, Figlinq, matplotlib 3.10, Dash 4)
> 조사일: 2026-03-15

### 동향 요약

**학술 도구 UI 표준 (2025-2026)**: Dual-Mode Editing — Quick(Mini Toolbar) + Deep(사이드 패널/다이얼로그)
- Prism 11, Origin 2025 모두 동일 패턴. Modal/Inline 편집은 학술 도구에서 채택 사례 없음.
- AI 도입: 학술 골드 스탠다드(Prism, Origin, JASP, Stata)는 AI 기능 전무. Figlinq만 "투명 AI"(코드 공개) 채택.
- **우리 차별점**: 웹 기반 + AI 채팅 + 한국어 — Prism/Origin이 기술적으로 도입 어려운 영역에서 선점.

**채택할 패턴**:
| 패턴 | 출처 | 우리 적용 |
|------|------|-----------|
| Contextual Quick Action | Origin Mini Toolbar | 5-1: 차트 요소 클릭 → Floating Panel |
| 색맹 친화 기본값 | matplotlib petroff10 | 5-2: 기본 팔레트 변경 |
| 투명 AI | Figlinq | 5-3: AI 변경 diff 표시 |
| 데이터 Slicer | Origin 2025 | 5-4: 값 필터 체크박스 |

**따르지 않을 패턴**:
| 패턴 | 이유 |
|------|------|
| 코드 기반 워크플로우 (R/Quarto/Typst) | 우리는 GUI 도구 — Export(SVG/PNG)로 통합 |
| 순수 다이얼로그 방식 (Prism Plot Details) | 웹에서 모달 남발은 UX 저하 — 사이드 패널이 적합 |
| AI 배제 | 학술 도구의 보수성은 레거시 제약 — 우리는 선점 |

### 5-1. Contextual Floating Panel (차트 요소 클릭 → 설정)

**영감**: Origin Mini Toolbar + Prism Dual-Mode (Quick + Deep)

**현재**: 차트 요소 수정 시 우측 패널에서 해당 항목을 직접 찾아야 함.
**개선**: 차트 요소 클릭 → 해당 설정만 담은 Floating Panel 표시.

```
[사용자가 막대/선/점 클릭]
  → Popover: 색상 picker + 라벨 on/off + 값 표시 형식
  → 정밀 값은 숫자 Input (슬라이더 아님 — 학술 정밀도 유지)

[사용자가 Y축 영역 클릭]
  → Popover: 범위(min/max), 스케일(linear/log), 제목, 폰트
  → 소수점 자릿수, 단위 표기 포함

[사용자가 빈 영역 클릭]
  → Panel 닫힘
```

**ECharts 지원 범위**:
- 시리즈 클릭: `chart.on('click')` + `params.componentType === 'series'` ✅
- 축 라벨 클릭: `triggerEvent: true` + `componentType === 'xAxis'/'yAxis'` ✅
- 범례 클릭: `legendselectchanged` ✅
- 제목 클릭: ❌ 미지원 → 우측 패널에서만 수정
- 드래그/이동: ❌ 미지원 → 위치 조정은 숫자 입력으로

**핵심 원칙**: "진짜 인라인"(요소 위 직접 편집)이 아닌 "Contextual Navigation" — 클릭한 요소에 맞는 설정으로 안내. 학술 정밀도(숫자 직접 입력)를 유지하면서 탐색 시간 단축.

**구현 상세 설계**:

**현재 ChartPreview 구조** (ChartPreview.tsx):
- `effectiveRef` = echartsRef ?? localRef (line 215)
- `onEvents` = `{ finished: handleFinished }` (line 288) — 현재 유일한 이벤트
- 캔버스 래퍼: `<div className="flex-1 min-h-0 relative">` (line 304) — CanvasToolbar가 이미 absolute 배치
- 빈 영역 클릭 해제: `chart.getZr().on('click')` 필요

**Step 1 — 이벤트 등록** (ChartPreview.tsx 수정):
```typescript
// onEvents에 click 추가
const onEvents = useMemo(
  () => ({
    finished: handleFinished,
    click: handleChartClick,
  }),
  [handleFinished, handleChartClick],
);

// 축 클릭을 위해 echarts-converter에서 triggerEvent: true 추가 필요
// xAxis/yAxis option에 { axisLabel: { triggerEvent: true } }
```

**Step 2 — Floating Panel 상태** (ChartPreview 내부 state):
```typescript
interface FloatingPanelState {
  type: 'series' | 'xAxis' | 'yAxis' | null;
  position: { x: number; y: number };
  // series 클릭 시 추가 정보
  seriesIndex?: number;
  dataIndex?: number;
}

const [floatingPanel, setFloatingPanel] = useState<FloatingPanelState>({ type: null, position: { x: 0, y: 0 } });
```

**Step 3 — FloatingEditPanel 컴포넌트** (신규):
```typescript
// components/graph-studio/FloatingEditPanel.tsx
// position으로 absolute 배치, 캔버스 래퍼 내부에 렌더링

// type === 'series': 색상 picker, 데이터 라벨 토글, 값 표시 형식
// type === 'xAxis': 축 제목, 폰트, 라벨 회전
// type === 'yAxis': 범위(min/max), 스케일(linear/log), 축 제목, 폰트
```

**Step 4 — 빈 영역 클릭으로 닫기**:
```typescript
// useEffect에서 chart.getZr().on('click') 등록
// params.target이 없으면 (빈 영역) floatingPanel을 null로
```

**의존성**:
- echarts-converter.ts에 `axisLabel.triggerEvent: true` 추가 필요
- useDataTabLogic의 표시 조건을 FloatingEditPanel에서도 재사용

**난이도**: 높음 (ECharts 이벤트 → 좌표 변환 → Popover 위치 → store 연동)
**의존성**: Phase 4 완료 후

### 5-2. 색맹 친화 팔레트 기본값

**영감**: matplotlib 3.10 `petroff10` — ML 최적화 색맹 친화 컬러 사이클

**현재**: ColorBrewer 15종 제공하지만 기본 선택이 색맹 비친화적일 수 있음.
**개선**: 기본 팔레트를 색맹 친화로 변경 + "색맹 시뮬레이션 미리보기" 토글.

**수정 파일**: `lib/graph-studio/chart-spec-defaults.ts` — 기본 scheme 변경
**추가 기능**: StyleTab에 "색맹 미리보기" 버튼 (CSS `filter` 기반 시뮬레이션)

**난이도**: 낮음 (기본값 변경) ~ 중간 (시뮬레이션 미리보기)

### 5-3. AI 변경 투명성

**영감**: Figlinq "Transparent AI" — 학술적으로 수용 가능한 유일한 AI 패턴

**현재**: AI가 chartSpec을 JSON Patch로 수정하지만, 사용자에게 "무엇이 바뀌었는지" 명시적으로 보여주지 않음.
**개선**: AI 수정 후 변경된 항목을 한눈에 보여주기.

```
AI 응답: "Y축 범위를 0-100으로 설정하고 로그 스케일로 변경했습니다"
변경 요약:
  • encoding.y.domain: [auto] → [0, 100]
  • encoding.y.scale: linear → log
  [되돌리기]
```

**구현**: AI 응답에 이미 JSON Patch가 있으므로, patch ops를 사람이 읽을 수 있는 한국어로 변환하는 유틸 추가.

**난이도**: 중간
**파일**: `lib/graph-studio/ai-patch-summary.ts` (신규), `components/graph-studio/panels/AiEditTab.tsx`

### 5-4. 데이터 필터 (Slicer)

**영감**: Origin 2025 Slicer — 차트에서 데이터를 인터랙티브하게 필터링 (원본 불변)

**현재**: 업로드한 데이터 전체가 차트에 표시됨. 특정 그룹만 보려면 데이터를 다시 가공해야 함.
**개선**: 좌측 패널에 nominal/ordinal 변수의 값 체크박스 추가 → 차트 실시간 반영.

```
변수 "Species" 클릭 →
  [역할 할당 메뉴] (Phase 4-3)
  ──────────────
  필터:
  ☑ setosa
  ☑ versicolor
  ☐ virginica      ← 체크 해제 시 차트에서 즉시 제외
```

**난이도**: 높음 (store에 filter 상태 + echarts-converter에 filter 적용)
**의존성**: Phase 4-3 완료 후

**열린 질문 — dataFilter의 영속성**: 현재 저장 로직은 chartSpec만 영속화 (graph-studio-store.ts:290). 필터를 일시 상태(탐색용, 저장 안 함)로 볼지, chartSpec에 포함(저장/undo 대상)할지 결정 필요. 일시 상태 권장 — 저장된 차트는 전체 데이터 기반이 자연스러움.

### Phase 6: 후순위

| 항목 | 비고 |
|------|------|
| 최근 데이터 이력 (sessionStorage) | 재업로드 없이 빠른 전환 |
| 프로젝트 로드 시 데이터 자동 복원 | DataPackage를 localStorage에 저장 (용량 주의) |
| Export 기본값 사용자 설정 | "항상 300 DPI" 같은 preference |
| 차트 복제 (같은 데이터, 다른 차트 유형) | 탐색 효율 |
| Auto-Annotation 강화 | Prism Stars-on-Graph 수준 — 통계 비교 결과 자동 bracket 생성 |
| LaTeX 수식 지원 | 축 라벨/제목에 수식 표기 (Origin 참고) |

---

## 수정 파일 요약

### Phase 1
| 파일 | 변경 |
|------|------|
| `lib/stores/graph-studio-store.ts` | `goToSetup()`, `previousChartSpec` + 수명 관리. AI 채팅 초기화(`graph_studio_ai_chat` 키) |
| `lib/graph-studio/file-parser.ts` | **신규** — CSV/XLSX 공통 파싱 유틸 (DataUploadPanel + LeftDataPanel 공유) |
| `components/graph-studio/LeftDataPanel.tsx` | 스타일 보존 로직. XLSX 지원 (file-parser 사용). annotations 전체 보존 |
| `components/graph-studio/DataUploadPanel.tsx` | file-parser 유틸 사용으로 리팩터. StepIndicator 컴포넌트 추출 |
| `components/graph-studio/GraphStudioHeader.tsx` | "차트 재설정" 버튼. "새 차트" AlertDialog |
| `components/graph-studio/ChartSetupPanel.tsx` | `previousChartSpec` 초기값. 스텝 인디케이터 |

### Phase 1.5
| 파일 | 변경 |
|------|------|
| `lib/graph-studio/ai-service.ts` | 4경로 프롬프트 문서화 확인 (y2, orientation, trendline, facet). 2경로 UNRENDERED 차단 유지 (significance, encoding/size). `collectTouchedPaths` 방어 로직 추가 |

### Phase 2
| 파일 | 변경 |
|------|------|
| `lib/graph-studio/style-template-storage.ts` | **신규** — 템플릿 CRUD |
| `components/graph-studio/ChartSetupPanel.tsx` | 내 템플릿 섹션 (style+exportConfig 전체 적용) |
| `components/graph-studio/panels/StyleTab.tsx` | "템플릿으로 저장" 버튼 |

### Phase 4
| 파일 | 변경 |
|------|------|
| `components/graph-studio/RightPropertyPanel.tsx` | "데이터" → "차트 설정" 탭명 변경 |
| `app/graph-studio/page.tsx` | 좌측 패널 기본 접힘 (`useState(false)`) |
| `components/graph-studio/LeftDataPanel.tsx` | 변수 클릭 → Popover 역할 할당 (차트 타입 capability 체크 포함) |
| `lib/stores/graph-studio-store.ts` | `assignFieldRole()` 액션 추가 + `disconnectProject()` 액션 추가 (4-5) |
| `components/graph-studio/panels/StyleTab.tsx` | 시리즈 색상 hex 복사 ✅ 완료 |

### Phase 5
| 파일 | 변경 |
|------|------|
| `components/graph-studio/ChartPreview.tsx` | 5-1: ECharts 이벤트 → Floating Panel 위치 계산 |
| `components/graph-studio/FloatingEditPanel.tsx` | **신규** 5-1: 시리즈/축별 Contextual 설정 Popover |
| `lib/graph-studio/chart-spec-defaults.ts` | 5-2: 기본 팔레트 색맹 친화로 변경 |
| `components/graph-studio/panels/StyleTab.tsx` | 5-2: 색맹 시뮬레이션 미리보기 토글 |
| `lib/graph-studio/ai-patch-summary.ts` | **신규** 5-3: JSON Patch → 한국어 변경 요약 변환 |
| `components/graph-studio/panels/AiEditTab.tsx` | 5-3: AI 변경 요약 표시 + 되돌리기 |
| `components/graph-studio/LeftDataPanel.tsx` | 5-4: nominal/ordinal 값 필터 체크박스 |
| `lib/stores/graph-studio-store.ts` | 5-4: dataFilter 상태 + 필터 적용 로직 |

---

## 검증 계획

```bash
# Phase 1 완료 후
pnpm tsc --noEmit    # 타입 체크
pnpm test            # 기존 테스트 통과 확인

# 수동 검증 시나리오
1. 샘플 데이터 → bar 차트 → Science 프리셋 → 데이터 교체 → 스타일 유지 확인
2. 에디터 → "차트 재설정" → 이전 chartType/preset 유지 확인
3. 편집 이력 있을 때 "새 차트" → AlertDialog 확인
4. 편집 이력 없을 때 "새 차트" → 바로 리셋 확인
5. AI 채팅 후 데이터 변경 → 채팅 이력 초기화 확인
```
