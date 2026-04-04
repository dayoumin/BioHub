# 자료 작성 탭 통합 — `/literature` → `/papers` 하위 탭

**날짜**: 2026-04-04
**상태**: 확정

## 목표

독립 페이지였던 `/literature`(문헌 검색)를 `/papers` 하위 탭으로 통합하여 자료 작성 워크플로우를 단일 진입점으로 묶는다.

## 라우팅 우선순위

```
1. ?doc=<id>         → DocumentEditor (탭 바 없음)
2. ?pkg=<id>         → PackageBuilder (탭 바 없음)
3. ?tab=literature   → 탭 바 + LiteratureSearchContent
4. (기본)             → 탭 바 + PapersHub
```

`doc`, `pkg`가 있으면 탭 바를 표시하지 않고 기존 에디터/빌더를 그대로 렌더링한다.

## 히스토리 전략

| 동작 | history 메서드 | 이유 |
|------|---------------|------|
| 탭 전환 | `replaceState` | 뒤로가기 이력 오염 방지 |
| 문서/패키지 열기 | `pushState` | 뒤로가기로 Hub 복귀 |
| Back 버튼 (에디터/빌더) | `history.back()` | 이중 진입 방지 (기존 `pushState('/papers')` 버그 수정) |

### 탭 전환 시 쿼리 보존

탭 전환 핸들러는 `tab` 파라미터만 교체하고 나머지(`project` 등)를 유지한다:

```typescript
const switchTab = useCallback((newTab: PapersTab) => {
  const params = new URLSearchParams(window.location.search)
  if (newTab === 'docs') params.delete('tab')
  else params.set('tab', newTab)
  window.history.replaceState({}, '', `/papers?${params.toString()}`)
  setTab(newTab)
}, [])
```

## 변경 파일

### 1. `stats/app/papers/PapersContent.tsx`

- `tab` 상태 추가 (`'docs' | 'literature'`, 기본 `'docs'`)
- `syncFromSearch`에서 `tab` 파라미터 읽기
- 탭 바 UI 렌더링 (doc/pkg 없을 때만)
- 탭 전환: `replaceState` + 쿼리 보존
- `LiteratureSearchContent` dynamic import 추가
- `handleBack`: `pushState('/papers')` → `history.back()` 변경

### 2. `stats/components/papers/MaterialPalette.tsx`

- L120-125, L153-158: `<Link href="/literature?project=...">` → `<a href="/papers?tab=literature&project=...">`
- full navigation으로 PapersContent 상태 확실한 초기화
- `next/link` import에서 `Link` 제거 가능 여부 확인 (다른 곳에서 미사용 시 제거)

### 3. `stats/app/literature/page.tsx`

- 리다이렉트 전용으로 변경
- `LiteratureSearchContent` import/render 완전 제거 (플리커 방지)
- `URLSearchParams`로 기존 쿼리를 병합하여 `/papers?tab=literature&...` 생성
- `window.location.replace()` 사용, `return null` 렌더링

```typescript
'use client'
import { useEffect } from 'react'

export default function LiteraturePage(): null {
  useEffect(() => {
    const existing = new URLSearchParams(window.location.search)
    existing.set('tab', 'literature')
    window.location.replace(`/papers?${existing.toString()}`)
  }, [])
  return null
}
```

### 4. `stats/app/literature/LiteratureSearchContent.tsx`

- 변경 없음. `window.location.search`에서 `project` 읽는 기존 로직 그대로 동작.

## 탭 바 UI

- PapersContent 레벨, 최상단 배치
- shadcn Tabs 미사용 (2개 탭에 과잉) — `button` 2개 + `border-b` 활성 표시
- 아이콘: 문서 `PenTool`, 문헌 검색 `Search`
- 디자인 시스템: No-Line Rule 준수 (border 대신 배경색/font-weight로 활성 표시)

## 테스트

PapersContent 라우팅 로직 테스트 2개 추가:

1. **라우팅 우선순위**: `?doc=`가 `?tab=`보다 우선하는지 확인
2. **탭 전환 쿼리 보존**: `replaceState` 호출 시 기존 `project` 파라미터 유지 확인

## 스코프 외

- PapersHub 내부 UI 변경 없음
- LiteratureSearchContent 리팩토링 없음
- 패키지는 별도 탭이 아닌 기존 `?pkg=` 경로 유지
