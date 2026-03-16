# Graph Studio UX 재설계 (G6)

> **작성일**: 2026-03-16
> **전제**: G5 (3패널 레이아웃) 완료 상태
> **목표**: 3단계 → 2단계 흐름 전환, Figma 스타일 속성 패널, 추천 차트 라이브 프리뷰

---

## 1. 현재 문제점

| # | 문제 | 원인 |
|---|------|------|
| 1 | 차트 선택 후 "만들기" 눌러야 프리뷰 보임 | Setup → Editor 2단계 분리 |
| 2 | 뒤로가기 3종 (데이터 다시 선택 / 차트 재설정 / 새 차트) | 3단계 구조의 부산물 |
| 3 | 우측 패널 아코디언 탭 20+ 항목 | Data탭 + Style탭에 모든 옵션 나열 |
| 4 | 좌측 패널 (변수 목록) — 한번 정하면 안 바꿈 | 데이터 확인용인데 항상 차지 |
| 5 | 학술 프리셋 4개만, 커스텀 저장 불편 | 프리셋이 Setup에만 있음 |

---

## 2. 목표 레이아웃

### 2단계 흐름

```
[1단계] Upload 화면
  ├─ 파일 업로드 (드래그 앤 드롭)
  ├─ 샘플 데이터로 시작
  └─ 저장된 템플릿으로 시작

        ↓ 데이터 로드 즉시 추천 1위 차트 자동 렌더링

[2단계] 통합 편집 화면 (Setup + Editor 합침)
```

### 통합 편집 화면 와이어프레임

```
┌────────────────────────────────────────────────────────┐
│ ← 홈  │ 📄 fish_growth.csv (150×5)  │ ↻ 교체  │ Undo Redo │ 📥 내보내기 │
├──────────────┬──────────────────┬───────────────────────┤
│ 추천 차트     │                  │ 차트 타입 (Figma)      │
│              │                  │ ┌──┬──┬──┬──┐         │
│ ┌────┬────┐ │                  │ │▐▌│≡ │╱ │◯ │         │
│ │bar │box │ │                  │ └──┴──┴──┴──┘         │
│ │ ✨ │    │ │                  │ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│ ├────┼────┤ │   라이브 프리뷰    │ X [species▾]          │
│ │scat│hist│ │   (자동 갱신)     │ Y [length_cm▾]        │
│ │    │    │ │                  │ 색상 [없음▾]           │
│ └────┴────┘ │                  │ (조건부: 에러바/회귀선)  │
│              │                  │ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│ 추천 이유:   │  [PNG↓] [⚙]     │ 프리셋           [+저장]│
│ "범주×수치   │                  │ [내 프리셋들...]        │
│  → 막대 차트"│                  │ [Nature][Science]...   │
│              │                  │ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│              │                  │ 팔레트 [Set2▾] ■■■■   │
│              │                  │ 폰트 [Arial▾] 14px    │
│              │                  │ 배경 □ #FFF            │
│              │                  │ Y범위 0 ─── 100        │
│              │                  │ 범례 위○ 우● 숨김○     │
│              │                  │ 값표시 [OFF ━━━]       │
├──────────────┴──────────────────┴───────────────────────┤
│ AI 패널                                                │
└────────────────────────────────────────────────────────┘
```

---

## 3. 핵심 설계 결정

### 3.1 3단계 → 2단계

| 현재 | 변경 |
|------|------|
| Upload → Setup → Editor (3 layoutMode) | Upload → Editor (2 layoutMode) |
| `!chartSpec → 'setup'` | **제거** — 데이터 로드 시 자동 추천 차트 생성 |
| "차트 만들기" 버튼 | **제거** — 즉시 프리뷰 |

**Store 변경**:
```typescript
// 현재
layoutMode = !isDataLoaded ? 'upload' : !chartSpec ? 'setup' : 'editor'

// 변경
layoutMode = !isDataLoaded ? 'upload' : 'editor'
```

**Store API 전략: 기존 API 의미 유지 + 신규 액션 추가**

```typescript
// 기존 유지 (의미 불변)
loadDataOnly(pkg)              // 데이터만 (내부 사용, setup 진입용 → G6에서 미사용)
loadDataPackageWithSpec(pkg, s) // 데이터+spec 직접 지정
setProject(project, pkg?)      // 프로젝트 복원

// 신규 추가
loadDataWithAutoChart(pkg)     // G6 진입: data + recommendCharts() + createDefaultChartSpec()
```

**진입 경로별 사용 액션**:
| 진입 | 액션 | spec 생성 |
|------|------|----------|
| 파일 업로드 / 샘플 데이터 | `loadDataWithAutoChart()` | 추천 1위 자동 |
| 템플릿으로 시작 | `loadDataPackageWithSpec()` | 템플릿 spec 적용 |
| 프로젝트 복원 | `setProject()` | 저장된 spec 복원 |
| 데이터 교체 (↻) | `loadDataPackageWithSpec()` + `disconnectProject()` | 기존 호환성 정책 적용 |

### 3.2 좌측: 추천 차트 썸네일 갤러리

| 항목 | 설명 |
|------|------|
| 렌더링 | 추천 4개를 미니 ECharts로 실제 렌더링 |
| 선택 | 클릭 시 중앙 프리뷰에 반영 + 우측 차트 타입 동기화 |
| 추천 이유 | 하단에 한 줄 설명 ("범주×수치 → 막대 차트 권장") |
| ✨ 표시 | 1순위 추천에 sparkle 아이콘 |
| 접기 | 토글로 접기 가능 (캔버스 확장) |

**컴포넌트**: `ChartRecommendationPanel.tsx` (신규)

**추천 이유 매핑** (`chart-recommender.ts` 확장):
```typescript
interface ChartRecommendation {
  type: ChartType
  priority: number
  reason: string  // 신규: "범주형(species) × 수치형(length) → 막대 차트"
}
```

### 3.3 우측: Figma 스타일 속성 패널

**기존 구조 (제거)**:
- Accordion 2탭 (DataTab / StyleTab) → **제거**
- 각 탭 내 Select/Input 위주 → **인라인 컨트롤로 교체**

**새 구조 (단일 스크롤)**:

```
┌──────────────────────────┐
│ 차트 타입                 │  ← 상단 고정 영역 시작
│ [4×3 아이콘 그리드]       │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│ X  [species ▾]           │
│ Y  [length_cm ▾]     ⋯  │  ← ⋯ 클릭 시 축 제목/Ω 확장
│ 색상 [없음 ▾]            │
│                          │  ← 상단 고정 영역 끝
├──────────────────────────┤
│ (조건부: 차트 타입 따라)   │  ← 하단 스크롤 영역
│ 에러바 SEM○ SD● CI○      │  ← bar 계열만
│ 회귀선 [OFF ━━━]         │  ← scatter만
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│ 프리셋             [+저장]│
│ 내 프리셋                 │
│ [졸업논문용] [랩미팅용] ×  │
│ 학술지                    │
│ [Nature] [Science] [IEEE]│
│ [APA] [ACS] [Grayscale]  │
│ [Elsevier] [Springer]    │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│ 팔레트 [Set2 ▾] ■■■■■■  │
│ 폰트   [Arial ▾]  14px  │
│ 배경   □ #FFFFFF         │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│ Y범위   [0] ── [100]     │
│ 범례    위○ 우● 숨김○     │
│ 값표시  [OFF ━━━]        │
│ n= 표기 [OFF ━━━]        │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│ 유의성 마커  [+ 추가]     │
│ 패싯   [없음 ▾]          │
└──────────────────────────┘
```

**핵심 원칙**:
- 아코디언/탭 없음 — 얇은 구분선으로 영역 분리
- 라벨 + 컨트롤 한 줄 인라인
- 조건부 섹션: 차트 타입에 따라 자동 표시/숨김
- 상단 고정 (차트 타입 + 필드) + 하단 스크롤 (나머지)

### 3.4 헤더 통합

**현재 3종 뒤로가기 → 1개로 통일**:

| 현재 | 변경 |
|------|------|
| "데이터 다시 선택" (Setup→Upload) | **제거** (Setup 자체 제거) |
| "차트 재설정" (Editor→Setup) | **제거** (우측에서 타입 변경 가능) |
| "새 차트" (Editor→Upload) | **← 홈** (확인 다이얼로그 포함) |

**헤더 레이아웃**:
```
← 홈  │  📄 filename.csv (150×5)  │  ↻ 데이터 교체  │  Undo Redo  │  📥 내보내기
```

- `← 홈`: 변경사항 있으면 "저장하지 않은 변경사항이 있습니다" 다이얼로그
- `↻ 데이터 교체`: 파일 선택 → 스타일 유지, 데이터만 교체
- `📥 내보내기`: PNG 원클릭 + 드롭다운(SVG/DPI 설정)

### 3.5 캔버스 플로팅 액션

```
┌──────────────────────────┐
│                          │
│       차트 렌더링         │
│                          │
│              [🔍+][🔍-]  │  ← 호버 시 나타남
│              [📋][PNG↓]  │
└──────────────────────────┘
```

기존 CanvasToolbar 유지 + PNG 원클릭 추가.

### 3.6 프리셋 시스템 확장

**빌트인 프리셋 (기존 4 → 10+)**:

| 프리셋 | 폰트 | 팔레트 | 배경 | 대상 학술지 |
|--------|------|--------|------|------------|
| Default | Arial 14 | Set2 | #FFF | 범용 |
| Nature/Science | Arial 12 | Paired | #FFF | Nature, Science, Cell |
| IEEE | Times New Roman 12 | Set1 | #FFF | IEEE 계열 |
| Grayscale | Arial 12 | Greys | #FFF | 흑백 인쇄 |
| APA 7th | Times New Roman 12 | Set2 | #FFF | 심리/사회과학 |
| ACS | Arial 11 | Dark2 | #FFF | 화학 저널 |
| Elsevier | Arial 12 | Set1 | #FFF | Elsevier 계열 |
| Springer | Times New Roman 11 | Paired | #FFF | Springer Nature |
| PNAS | Arial 12 | Set2 | #FFF | PNAS |
| 포스터 | Arial 18 | Set2 | #FFF | 학회 포스터 (큰 폰트) |

**커스텀 프리셋**:
- `[+ 저장]` 버튼 → 현재 스타일 전체를 이름 붙여 localStorage 저장
- 내 프리셋 목록에 칩으로 표시
- 클릭: 적용, ×: 삭제 (확인 다이얼로그)

---

## 4. 구현 단계

### Phase G6.0: 2단계 흐름 전환 (핵심)

**변경 파일**:
| 파일 | 변경 내용 |
|------|----------|
| `graph-studio-store.ts` | `loadDataOnly()` → 자동 추천+차트 생성, `setup` layoutMode 제거 |
| `page.tsx` | `setup` 분기 제거, 2패널 레이아웃 |
| `ChartSetupPanel.tsx` | **삭제** (기능은 우측 패널로 이전) |

**결과**: 데이터 업로드 → 즉시 편집 화면 + 추천 1위 차트 렌더링

### Phase G6.1: 좌측 추천 차트 갤러리

**변경 파일**:
| 파일 | 변경 내용 |
|------|----------|
| `ChartRecommendationPanel.tsx` | **신규** — 미니 ECharts 4개 렌더링 |
| `chart-recommender.ts` | `reason` 필드 추가 |
| `LeftDataPanel.tsx` | **삭제** 또는 ChartRecommendationPanel로 교체 |
| `page.tsx` | 좌측에 ChartRecommendationPanel 배치 |

### Phase G6.2: Figma 스타일 우측 패널

**선행 조건**: `useDataTabLogic` + `useStyleTabLogic` 훅을 **그대로 재사용**.
이 두 훅에 차트 타입 전환 정규화, encoding 상호 배타 규칙, 조건부 표시 로직이 있음.
FigmaPropertyPanel은 thin UI wrapper로만 작성.

**변경 파일**:
| 파일 | 변경 내용 |
|------|----------|
| `FigmaPropertyPanel.tsx` | **신규** — 단일 스크롤, 인라인 컨트롤 (`useDataTabLogic` + `useStyleTabLogic` 소비) |
| `RightPropertyPanel.tsx` | **삭제** (FigmaPropertyPanel로 교체) |
| `DataTab.tsx` | **삭제** (로직은 useDataTabLogic에 이미 분리됨, UI만 폐기) |
| `StyleTab.tsx` | **삭제** (로직은 useStyleTabLogic에 이미 분리됨, UI만 폐기) |

**핵심**: 상단 고정 (차트 타입 + 필드) + 하단 스크롤 (프리셋 + 스타일)

**유지 파일 (도메인 로직)**:
| 파일 | 이유 |
|------|------|
| `useDataTabLogic.ts` (389줄) | 차트 타입 전환 정규화, encoding 상호 배타, 조건부 표시 규칙 |
| `useStyleTabLogic.ts` (253줄) | 스타일 핸들러, 프리셋 적용, 범례/축/폰트 로직 |

### Phase G6.3: 헤더 통합 + 프리셋 확장

**프리셋 모델 결정: 빌트인 preset과 저장된 template을 분리 유지**

- `StylePreset` 타입 확장: `'default' | 'science' | 'ieee' | 'grayscale' | 'apa' | 'acs' | 'elsevier' | 'springer' | 'pnas' | 'poster'`
- 커스텀은 기존 `StyleTemplate` 시스템 (style-template-storage.ts, localStorage) 그대로 사용
- `ChartSpec.style.preset`은 빌트인만 가리킴, 커스텀 적용 시 `preset = 'default'`로 두고 개별 값 오버라이드
- UI에서 "내 프리셋" / "학술지" 섹션으로 시각적 분리

이유: 단일 presetId 통합 시 `StyleTemplate`의 CRUD + 직렬화와 `StylePreset`의 타입 안전성이 충돌.

**변경 파일**:
| 파일 | 변경 내용 |
|------|----------|
| `GraphStudioHeader.tsx` | 뒤로가기 통일, 파일 정보 표시, 데이터 교체 버튼 |
| `graph-studio.ts` (types) | `StylePreset` 타입에 6개 추가 |
| `chart-spec-defaults.ts` | `STYLE_PRESETS` 레코드에 6개 추가 |
| `useStyleTabLogic.ts` | `PRESET_LIST` 배열에 6개 추가 |
| `style-template-storage.ts` | **유지** — 커스텀 프리셋 CRUD 그대로 |

**데이터 교체 호환성 정책** (헤더 ↻ 버튼):

| 속성 | 교체 시 정책 | 비고 |
|------|-------------|------|
| chartType | **유지** | |
| X/Y 필드 | `selectXYFields()` 재추론 | 새 컬럼 메타 기반 |
| color/y2/facet | 새 컬럼에 존재하면 유지, 없으면 제거 | |
| aggregate.groupBy | 새 컬럼에 있는 것만 필터 | |
| style (전체) | **복사** | 폰트, 팔레트, 배경 등 |
| annotations | **복사** | |
| orientation | **유지** | |
| exportConfig | **복사** | |
| significanceMarks | **제거** | 그룹명이 달라지면 무효 |
| currentProject | **연결 해제** (disconnectProject) | 덮어쓰기 방지 |

### Phase G6.4: Upload 화면 개선

**변경 파일**:
| 파일 | 변경 내용 |
|------|----------|
| `DataUploadPanel.tsx` | 템플릿 진입점 추가, 레이아웃 정리 |

---

## 5. 삭제/교체 파일 목록

| 파일 | 처리 |
|------|------|
| `ChartSetupPanel.tsx` (440줄) | **삭제** — G6.0에서 기능 이전 |
| `LeftDataPanel.tsx` (366줄) | **교체** → ChartRecommendationPanel |
| `RightPropertyPanel.tsx` (63줄) | **교체** → FigmaPropertyPanel |
| `DataTab.tsx` (~700줄) | **통합** → FigmaPropertyPanel |
| `StyleTab.tsx` (~270줄) | **통합** → FigmaPropertyPanel |

**총 ~1,840줄 제거/교체** → 약 800-1,000줄 신규 (Figma 스타일이 더 컴팩트)

---

## 6. 유지 파일 (변경 최소)

| 파일 | 상태 |
|------|------|
| `ChartPreview.tsx` (333줄) | 유지 — ref/렌더링 로직 그대로 |
| `CanvasToolbar.tsx` (119줄) | 유지 — PNG 원클릭 추가만 |
| `AiPanel.tsx` | 유지 — bottom dock 전용 |
| `useDataTabLogic.ts` (389줄) | **유지 (핵심)** — 차트 타입 전환 정규화, encoding 상호 배타 규칙 |
| `useStyleTabLogic.ts` (253줄) | **유지 (핵심)** — 스타일 핸들러, 프리셋 적용, 조건부 표시 |
| `chart-spec-defaults.ts` | 확장 — STYLE_PRESETS에 6개 추가 |
| `chart-spec-utils.ts` | 유지 — selectXYFields 등 |
| `style-template-storage.ts` | 유지 — 커스텀 프리셋 CRUD |
| `chart-recommender.ts` | 확장 — reason 필드 추가 |
| `graph-studio-store.ts` | 수정 — `loadDataWithAutoChart` 추가, setup 분기 제거 |

---

## 7. 테스트 영향

### E2E testid 호환 전략: **전면 변경**

Setup 화면 제거 + 탭 구조 제거로 기존 testid 다수가 무효.

**폐기 testid** (selectors.ts에서 `@deprecated G6` 주석 후 삭제):
| testid | 폐기 이유 |
|--------|----------|
| `chart-setup-type-*` | ChartSetupPanel 삭제, 차트 타입은 우측 패널로 |
| `chart-setup-create-btn` | "만들기" 버튼 삭제 |
| `chart-setup-preset-*` | Setup 프리셋 → 우측 패널로 이동 |
| `graph-studio-tab-data` | 탭 구조 제거 (단일 스크롤) |
| `graph-studio-tab-style` | 탭 구조 제거 (단일 스크롤) |

**유지 testid** (FigmaPropertyPanel/헤더에 그대로 부여):
| testid | 대상 |
|--------|------|
| `graph-studio-page` | 페이지 루트 |
| `graph-studio-chart` | 캔버스 |
| `graph-studio-side-panel` | FigmaPropertyPanel 루트 |
| `graph-studio-side-toggle` | 우측 패널 토글 |
| `graph-studio-dropzone` | Upload 드래그 앤 드롭 |
| `graph-studio-file-input` | 파일 input |
| `graph-studio-file-upload-btn` | 업로드 버튼 |
| `graph-studio-sample-btn` | 샘플 데이터 |
| `graph-studio-undo` / `redo` | Undo/Redo |
| `graph-studio-ai-toggle` | AI 패널 토글 |

**신규 testid**:
| testid | 대상 |
|--------|------|
| `graph-studio-chart-type-{type}` | 우측 차트 타입 아이콘 |
| `graph-studio-preset-{key}` | 우측 프리셋 버튼 |
| `graph-studio-recommendation-{index}` | 좌측 추천 차트 썸네일 |
| `graph-studio-home-btn` | ← 홈 버튼 |
| `graph-studio-data-replace` | ↻ 데이터 교체 |
| `graph-studio-preset-save` | + 프리셋 저장 |

### E2E (Playwright)
- `graph-studio-e2e.spec.ts` → Setup 관련 테스트 **전면 재작성**
- 새 테스트: 데이터 업로드 → 자동 프리뷰 → 차트 타입 변경 → 프리셋 적용

### Unit (Vitest)
- `useDataTabLogic` / `useStyleTabLogic` 테스트 → **유지** (로직 변경 없음)
- `chart-recommender.test.ts` → reason 필드 추가 테스트
- `graph-studio-store.test.ts` → `loadDataWithAutoChart` 추가, setup 모드 제거 반영
- DataTab/StyleTab 컴포넌트 테스트 → **삭제** (FigmaPropertyPanel 테스트로 대체)

---

## 8. 확인 다이얼로그

### ← 홈 복귀 시
```
┌─────────────────────────────┐
│ 저장하지 않은 변경사항        │
│                             │
│ 현재 차트 편집 내용이         │
│ 저장되지 않았습니다.          │
│                             │
│ [취소]  [저장하지 않고 나가기] │
└─────────────────────────────┘
```

조건: `specHistory.length > 1` (초기 상태 이후 변경 있을 때만)

---

## 9. 스코프 외 (향후)

- 차트 나란히 비교 (side-by-side)
- 좌측 데이터 미니 테이블 탭
- 프리셋 가져오기/내보내기 (JSON)
- AI 기반 차트 추천 ("이 데이터에 가장 적합한 차트는?")
- 모바일 대응 (현재 PC 전용)
