# Bio-Tools 통합 워크스페이스 — 리뷰 요청

## 변경 목적

Bio-Tools 15개 도구가 각각 독립된 Next.js 페이지(`/bio-tools/{id}`)로 분리되어 있었다.
도구 전환 시마다 페이지 이동이 발생하여 UX가 단절됨.

**변경 후**: 단일 `/bio-tools` 페이지에 사이드바 + 워크스페이스 구조로 통합.
도구 클릭 시 페이지 이동 없이 워크스페이스 내에서 즉시 전환.

---

## 변경 범위

### 신규 파일

| 파일 | 역할 | LOC |
|------|------|-----|
| `components/bio-tools/BioToolSidebar.tsx` | 도구 선택 사이드바 (카테고리별 그룹) | ~130 |
| `components/bio-tools/BioToolWorkspace.tsx` | 메인 컨테이너 (사이드바 + 워크스페이스) | ~95 |
| `components/bio-tools/BioToolIntro.tsx` | 도구 소개 카드 (설명 + 기대 결과 + 데이터 형식) | ~110 |
| `components/bio-tools/tools/types.ts` | `ToolComponentProps` 인터페이스 | ~6 |
| `components/bio-tools/tools/index.ts` | `React.lazy()` 컴포넌트 맵 (15개) | ~30 |
| `components/bio-tools/tools/*Tool.tsx` × 15 | 도구별 컴포넌트 (기존 page.tsx에서 추출) | ~3,500 합계 |
| `lib/bio-tools/bio-tool-metadata.ts` | 15개 도구 확장 메타데이터 (설명, 기대결과, 컬럼가이드) | ~290 |
| `app/bio-tools/error.tsx` | Next.js 에러 바운더리 | ~30 |
| `public/example-data/*.csv` × 7 | 예제 데이터 (ecology, fisheries, genetics) | 데이터 |

### 수정 파일

| 파일 | 변경 |
|------|------|
| `components/bio-tools/BioCsvUpload.tsx` | 예제 데이터 버튼 추가 + CSV 파싱 중복 제거(`applyParsed` 공용 함수) |
| `components/bio-tools/BioToolCard.tsx` | `onSelect` prop 추가 (Link/onClick 듀얼 모드) + description 표시 |
| `components/bio-tools/BioToolsHub.tsx` | `onSelectTool` prop 추가, 헤더/배경 제거 (워크스페이스가 관리) |
| `lib/bio-tools/bio-tool-registry.ts` | `BioToolColumnSpec`, `BioToolExtendedMeta` 타입 추가 |
| `components/layout/app-sidebar.tsx` | '홈' → '통계분석', `Home` → `BarChart3` 아이콘 |
| `app/bio-tools/page.tsx` | `BioToolsHub` → `BioToolWorkspace` + `Suspense` 래핑 |

### 삭제 파일

| 파일 | 이유 |
|------|------|
| `app/bio-tools/{id}/page.tsx` × 15 | 통합 워크스페이스로 대체 (로직은 `tools/*Tool.tsx`로 이동) |

---

## 아키텍처

### 라우팅 변경

```
AS-IS:  /bio-tools           → 허브 카드 그리드
        /bio-tools/alpha-diversity → 개별 페이지 (15개)

TO-BE:  /bio-tools            → 통합 워크스페이스 (사이드바 + 동적 도구 렌더링)
        /bio-tools?tool=alpha-diversity → URL 쿼리로 도구 선택 유지
```

### 컴포넌트 구조

```
app/bio-tools/page.tsx
  └─ <Suspense>                           ← useSearchParams 서버 호환
       └─ BioToolWorkspace
            ├─ BioToolSidebar              ← 카테고리별 도구 목록 (200px)
            └─ 메인 영역
                 ├─ 도구 헤더 (아이콘 + 이름)  ← 도구 선택 시
                 └─ 콘텐츠
                      ├─ BioToolsHub        ← 도구 미선택 시 (허브 그리드)
                      └─ <Suspense>         ← 도구 선택 시
                           └─ ToolComponent  ← lazy-loaded, key={toolId}
```

### 상태 관리

- **도구 전환**: `key={toolId}`로 컴포넌트 재마운트 → 전체 상태 자동 리셋
- **URL 동기화**: `useSearchParams().get('tool')` + `router.push()` → 새로고침/공유 가능
- **도구별 독립 상태**: 각 `*Tool.tsx`가 `useBioToolAnalysis<T>()` 훅으로 자체 상태 관리

### 코드 스플리팅

```typescript
// tools/index.ts
export const TOOL_COMPONENTS = {
  'alpha-diversity': lazy(() => import('./AlphaDiversityTool')),
  // ... 14개 더
}
```

- 각 도구가 독립 청크로 분리
- 선택한 도구만 로드 (나머지는 로드하지 않음)
- `Suspense fallback`으로 로딩 상태 표시

---

## 디자인 시스템 준수

### 토큰 사용

| 토큰 | 사용처 |
|------|--------|
| `BIO_HEADER_BORDER` | 사이드바 헤더, 워크스페이스 도구 헤더 |
| `BIO_BG_TINT` | 워크스페이스 전체 배경 |
| `BIO_ICON_BG` / `BIO_ICON_COLOR` | 도구 아이콘 배경/색상 |
| `BIO_ACCENT_VAR` | 사이드바 선택 상태, BioToolIntro 좌측 border |
| `BIO_LAYOUT.*` | 콘텐츠 패딩 (px-6, py-8) |
| `LAYOUT.stickyHeader` | 워크스페이스 도구 헤더 sticky |
| `LAYOUT.maxWidth` | 콘텐츠 최대 너비 |
| `focusRing` | 사이드바 버튼 포커스 |

### 하드코딩된 색상: 0개

모든 색상은 CSS 변수 `var(--section-accent-bio)` + `color-mix()` 사용.
다크모드는 CSS 변수 재정의로 자동 대응 (Tailwind `dark:` 불필요).

### 사이드바 hover 패턴

```tsx
// CSS 커스텀 속성으로 color-mix 값 전달 → Tailwind arbitrary value로 참조
style={{ '--bio-sidebar-hover': 'color-mix(...)' }}
className="hover:bg-[var(--bio-sidebar-hover)]"
```

JS `onMouseEnter/Leave` 대신 순수 CSS 기반. 키보드 사용자도 동일 피드백.

---

## 리뷰 포인트

### 1. 도구 컴포넌트 추출 정확성

15개 `app/bio-tools/{id}/page.tsx`가 `components/bio-tools/tools/*Tool.tsx`로 이동.
변환 규칙:
- `BioToolShell` 래퍼 제거 (워크스페이스가 대체)
- `getBioToolById` / `getBioToolMeta` 제거 (props로 수신)
- `if (!tool || !meta)` 가드 제거 (부모가 보장)
- `export default function` 유지 (`React.lazy()` 호환)
- 나머지 모든 로직/JSX 그대로 유지

**확인 필요**: 15개 컴포넌트의 import 경로가 새 위치에서 모두 유효한지.

### 2. BioToolSidebar 접근성

- `<nav aria-label="Bio-Tools 도구 목록">`
- 버튼에 `aria-selected={isSelected}`
- disabled 도구는 `<button disabled>` + "예정" 뱃지

**확인 필요**: `aria-selected`가 listbox 패턴 없이 단독 사용 시 적절한지.

### 3. BioCsvUpload 중복 제거

```
AS-IS:  processCsvText() + handleFile() 에 동일 검증 로직 중복
TO-BE:  applyParsed() 공용 함수로 통합, 두 곳에서 위임
```

`handleFile`의 `Papa.parse(file, { complete })` 콜백에서 `applyParsed(result as ...)` 캐스팅 사용.

### 4. URL 쿼리 파라미터

- `?tool=alpha-diversity` → 도구 선택 유지
- 잘못된 ID(`?tool=nonexistent`) → `TOOL_COMPONENTS[id]`가 `undefined` → Hub 표시 (graceful)
- `species-validation` (coming-soon) → 사이드바에서 disabled, 수동 URL 접근 시 Hub 표시

### 5. 에러 바운더리

`app/bio-tools/error.tsx` (Next.js 컨벤션) 추가.
lazy 컴포넌트 렌더 에러 시 전체 크래시 대신 복구 UI 표시.

### 6. BioToolsHub 변경

- `onSelectTool` prop 추가 (있으면 onClick, 없으면 기존 Link)
- 헤더/배경 제거 (워크스페이스가 제공)
- 그리드 컬럼: `lg:grid-cols-6` → `lg:grid-cols-5` (사이드바 공간 확보)

---

## 알려진 제한/향후 개선

| 항목 | 설명 |
|------|------|
| `tool` prop 미사용 | 15개 Tool 컴포넌트가 `tool` prop을 받지만 현재 미사용 (meta만 사용). 향후 cross-link 등에 활용 예정. |
| `BioToolId` union 미도입 | tool ID가 plain `string`. TODO.md에 등록 완료. |
| `getBioToolWithMeta` 편의 함수 미도입 | 15개 페이지에서 이중 호출 패턴. TODO.md에 등록 완료. |
| `relatedTools` 미소비 | metadata에 정의되어 있으나 UI에서 미사용. TODO.md에 등록 완료. |
| 사이드바 반응형 미구현 | 현재 고정 200px. 모바일/태블릿 대응 필요 시 접힘 패턴 추가. |

---

## 검증 결과

- `tsc --noEmit`: 통과 (에러 0)
- `pnpm test`: 297 passed, 4 failed (기존 `DataExplorationStep-terminology` 에러, Bio-Tools 무관)
