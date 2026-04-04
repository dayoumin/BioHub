# 자료 작성 탭 통합 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/literature` 독립 페이지를 `/papers` 하위 탭으로 통합하여 자료 작성 워크플로우를 단일 진입점으로 묶는다.

**Architecture:** PapersContent에 `tab` 상태를 추가하고, doc/pkg가 없을 때 탭 바를 표시한다. 탭 전환은 `replaceState`로 처리하고, `/literature`는 client-side redirect로 전환한다.

**Tech Stack:** Next.js 15 App Router, React, shadcn/ui (Button/Badge만), window.history API

**Spec:** `docs/superpowers/specs/2026-04-04-papers-tab-integration-design.md`

---

## File Map

| 파일 | 변경 | 역할 |
|------|------|------|
| `stats/app/papers/PapersContent.tsx` | Modify | 탭 상태 + 탭 바 UI + LiteratureSearchContent 분기 + handleBack 수정 |
| `stats/components/papers/MaterialPalette.tsx` | Modify | `/literature` 링크 → `/papers?tab=literature` 변경 (2곳) |
| `stats/app/literature/page.tsx` | Modify | 리다이렉트 전용으로 교체 |
| `stats/__tests__/app/papers/PapersContent-routing.test.tsx` | Create | 라우팅 우선순위 + 탭 전환 쿼리 보존 테스트 |

---

### Task 1: `/literature` 리다이렉트 전용 페이지

**Files:**
- Modify: `stats/app/literature/page.tsx`

- [ ] **Step 1: 리다이렉트 전용 페이지로 교체**

기존 `LiteratureSearchContent` import/render를 완전히 제거하고, 쿼리를 병합하여 `/papers?tab=literature&...`로 리다이렉트한다.

```tsx
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

- [ ] **Step 2: 수동 확인**

브라우저에서 `/literature?project=abc` 접근 시 `/papers?tab=literature&project=abc`로 리다이렉트되는지 확인. 아직 papers 탭 UI가 없으므로 URL만 바뀌면 성공.

- [ ] **Step 3: 커밋**

```bash
git add stats/app/literature/page.tsx
git commit -m "refactor(literature): redirect to /papers?tab=literature"
```

---

### Task 2: MaterialPalette 링크 변경

**Files:**
- Modify: `stats/components/papers/MaterialPalette.tsx:117-126,152-159`

- [ ] **Step 1: `<Link>` → `<a>` 변경 (빈 인용 상태)**

L120-125의 `<Link href={...}>` 를 `<a href={...}>`로 변경:

```tsx
// Before (L120-125):
<Link
  href={`/literature?project=${projectId}`}
  className="text-primary hover:underline"
>
  문헌 검색에서 추가
</Link>

// After:
<a
  href={`/papers?tab=literature&project=${projectId}`}
  className="text-primary hover:underline"
>
  문헌 검색에서 추가
</a>
```

- [ ] **Step 2: `<Link>` → `<a>` 변경 (더 추가 링크)**

L153-158도 동일하게 변경:

```tsx
// Before (L153-158):
<Link
  href={`/literature?project=${projectId}`}
  className="text-xs text-primary hover:underline flex items-center gap-1 pt-1"
>

// After:
<a
  href={`/papers?tab=literature&project=${projectId}`}
  className="text-xs text-primary hover:underline flex items-center gap-1 pt-1"
>
  <Plus className="w-3 h-3" /> 더 추가
</a>
```

- [ ] **Step 3: 미사용 import 정리**

`Link`가 더 이상 사용되지 않으면 import에서 제거. 파일 상단 L4의 `import Link from 'next/link'`를 확인하고 다른 곳에서 사용하지 않으면 삭제.

- [ ] **Step 4: tsc 확인**

```bash
cd stats && pnpm tsc --noEmit
```

Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add stats/components/papers/MaterialPalette.tsx
git commit -m "fix(papers): MaterialPalette links to /papers?tab=literature"
```

---

### Task 3: PapersContent 탭 통합 (핵심)

**Files:**
- Modify: `stats/app/papers/PapersContent.tsx`

- [ ] **Step 1: 타입 + 상태 + dynamic import 추가**

파일 상단에 타입과 LiteratureSearchContent dynamic import를 추가:

```tsx
// 기존 import 아래에 추가
import { Search, PenTool } from 'lucide-react'

const LiteratureSearchContent = dynamic(
  () => import('@/app/literature/LiteratureSearchContent'),
  { ssr: false },
)

type PapersTab = 'docs' | 'literature'
```

- [ ] **Step 2: tab 상태 + syncFromSearch 확장**

`PapersContent` 함수 내부에 `tab` 상태를 추가하고, `syncFromSearch`에서 읽기:

```tsx
const [tab, setTab] = useState<PapersTab>('docs')

// syncFromSearch 수정: 기존 doc/pkg 읽기 후 tab도 읽기
const syncFromSearch = useCallback(() => {
  const params = new URLSearchParams(window.location.search)
  setDocId(params.get('doc'))
  const pkg = params.get('pkg')
  setPkgId(pkg)
  setPkgProjectId(params.get('projectId') ?? undefined)
  setTab((params.get('tab') as PapersTab) === 'literature' ? 'literature' : 'docs')
}, [])
```

- [ ] **Step 3: switchTab 핸들러 추가**

탭 전환 시 `replaceState` 사용, 기존 쿼리 파라미터 보존:

```tsx
const switchTab = useCallback((newTab: PapersTab) => {
  const params = new URLSearchParams(window.location.search)
  // doc/pkg 열린 상태에서 탭 전환은 없지만 방어적으로 제거
  params.delete('doc')
  params.delete('pkg')
  params.delete('projectId')
  if (newTab === 'docs') params.delete('tab')
  else params.set('tab', newTab)
  const qs = params.toString()
  window.history.replaceState({}, '', `/papers${qs ? `?${qs}` : ''}`)
  setTab(newTab)
  setDocId(null)
  setPkgId(null)
}, [])
```

- [ ] **Step 4: handleBack을 history.back()으로 변경**

```tsx
// Before:
const handleBack = useCallback(() => {
  window.history.pushState({}, '', '/papers')
  setDocId(null)
  setPkgId(null)
  setPkgProjectId(undefined)
}, [])

// After:
const handleBack = useCallback(() => {
  window.history.back()
}, [])
```

`popstate` 리스너가 이미 `syncFromSearch`를 호출하므로 `history.back()` 후 상태가 자동 복원된다.

- [ ] **Step 5: 탭 바 + 렌더링 분기 변경**

return 부분을 교체:

```tsx
// doc/pkg는 기존대로 탭 바 없이 렌더링
if (docId) {
  return <DocumentEditor documentId={docId} onBack={handleBack} />
}

if (pkgId) {
  return (
    <PackageBuilder
      packageId={pkgId === 'new' ? undefined : pkgId}
      projectId={pkgProjectId}
      onBack={handleBack}
    />
  )
}

// 탭 바 + 콘텐츠
return (
  <div className="flex flex-col h-full">
    {/* 탭 바 */}
    <div className="flex gap-1 px-6 pt-4">
      <button
        type="button"
        onClick={() => switchTab('docs')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          tab === 'docs'
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
      >
        <PenTool className="w-3.5 h-3.5" />
        문서
      </button>
      <button
        type="button"
        onClick={() => switchTab('literature')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          tab === 'literature'
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
      >
        <Search className="w-3.5 h-3.5" />
        문헌 검색
      </button>
    </div>

    {/* 콘텐츠 */}
    {tab === 'literature' ? (
      <LiteratureSearchContent />
    ) : (
      <PapersHub onOpenDocument={handleOpenDocument} onOpenPackage={handleOpenPackage} />
    )}
  </div>
)
```

- [ ] **Step 6: tsc 확인**

```bash
cd stats && pnpm tsc --noEmit
```

Expected: 에러 없음.

- [ ] **Step 7: 커밋**

```bash
git add stats/app/papers/PapersContent.tsx
git commit -m "feat(papers): add literature tab integration + fix handleBack history"
```

---

### Task 4: 라우팅 테스트

**Files:**
- Create: `stats/__tests__/app/papers/PapersContent-routing.test.tsx`

- [ ] **Step 1: 테스트 파일 작성**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// PapersContent는 dynamic import 사용 → 모킹 필요
vi.mock('@/components/papers/PapersHub', () => ({
  default: (props: Record<string, unknown>) => <div data-testid="papers-hub" {...props} />,
}))
vi.mock('@/components/papers/DocumentEditor', () => ({
  default: (props: Record<string, unknown>) => <div data-testid="document-editor" {...props} />,
}))
vi.mock('@/components/papers/PackageBuilder', () => ({
  default: (props: Record<string, unknown>) => <div data-testid="package-builder" {...props} />,
}))
vi.mock('@/app/literature/LiteratureSearchContent', () => ({
  default: () => <div data-testid="literature-search" />,
}))

// next/dynamic를 일반 import로 치환
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<{ default: React.ComponentType }>) => {
    // 동기적으로 모듈을 반환하는 간이 구현
    let Comp: React.ComponentType | null = null
    loader().then(m => { Comp = m.default })
    return function DynamicWrapper(props: Record<string, unknown>) {
      return Comp ? <Comp {...props} /> : null
    }
  },
}))

import PapersContent from '@/app/papers/PapersContent'

function setSearch(search: string): void {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, search, href: `http://localhost/papers${search}` },
    writable: true,
  })
}

describe('PapersContent routing', () => {
  beforeEach(() => {
    setSearch('')
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => {})
    vi.spyOn(window.history, 'pushState').mockImplementation(() => {})
  })

  it('doc param takes priority over tab param', async () => {
    setSearch('?doc=abc&tab=literature')
    render(<PapersContent />)
    // 약간의 대기 (dynamic import resolve)
    await vi.waitFor(() => {
      expect(screen.getByTestId('document-editor')).toBeTruthy()
    })
    expect(screen.queryByTestId('literature-search')).toBeNull()
  })

  it('tab=literature shows literature search', async () => {
    setSearch('?tab=literature')
    render(<PapersContent />)
    await vi.waitFor(() => {
      expect(screen.getByTestId('literature-search')).toBeTruthy()
    })
  })

  it('tab switch uses replaceState and preserves project param', async () => {
    setSearch('?tab=literature&project=p1')
    render(<PapersContent />)
    await vi.waitFor(() => {
      expect(screen.getByTestId('literature-search')).toBeTruthy()
    })

    const docsTab = screen.getByRole('button', { name: /문서/ })
    await userEvent.click(docsTab)

    expect(window.history.replaceState).toHaveBeenCalled()
    const call = vi.mocked(window.history.replaceState).mock.calls.at(-1)
    const url = call?.[2] as string
    expect(url).not.toContain('tab=')
    expect(url).toContain('project=p1')
  })
})
```

- [ ] **Step 2: 테스트 실행**

```bash
cd stats && pnpm test __tests__/app/papers/PapersContent-routing.test.tsx
```

Expected: 3 tests PASS.

- [ ] **Step 3: 커밋**

```bash
git add stats/__tests__/app/papers/PapersContent-routing.test.tsx
git commit -m "test(papers): add routing priority and tab switch tests"
```

---

### Task 5: NEXT-SESSION.md 업데이트

**Files:**
- Modify: `NEXT-SESSION.md`

- [ ] **Step 1: 완료 항목 반영**

NEXT-SESSION.md 섹션 2(자료 작성 탭 통합)와 섹션 3(Package Assembly 마무리 — 이미 커밋됨)을 완료로 표시. 섹션 5 권장 작업 순서도 갱신.

- [ ] **Step 2: 커밋**

```bash
git add NEXT-SESSION.md
git commit -m "docs: update NEXT-SESSION.md — tab integration + package assembly done"
```
