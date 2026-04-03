# Phase 6a: 차트 이미지 DOCX/HWPX 삽입 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Graph Studio 차트를 PNG 스냅샷으로 캡처하여 DOCX/HWPX 내보내기에 실제 이미지로 삽입

**Architecture:** Graph Studio 저장 시 ECharts getDataURL → IndexedDB 스냅샷 저장. 내보내기 시 스냅샷 조회 → DOCX ImageRun / HWPX hp:pic 삽입. 스냅샷 없으면 캡션 플레이스홀더 fallback.

**Tech Stack:** JSZip (HWPX), docx v9 (DOCX), IndexedDB (스냅샷 저장), ECharts getDataURL (캡처)

**Spec:** `stats/docs/papers/PLAN-FIGURE-IMAGE-EXPORT.md`

---

## 파일 구조

| 파일 | 역할 |
|------|------|
| **신규** `stats/lib/graph-studio/chart-snapshot-storage.ts` | IndexedDB CRUD (save/load/delete) |
| **신규** `stats/lib/services/export/document-hwpx-export.ts` | DocumentBlueprint → HWPX |
| **신규** `stats/public/templates/blank.hwpx` | 한컴 빈 문서 템플릿 (표 포함) |
| **수정** `stats/lib/utils/adapters/indexeddb-adapter.ts` | DB v3→v4, chart-snapshots store 추가 |
| **수정** `stats/lib/graph-studio/project-storage.ts` | saveProject → evictedIds 반환, deleteProjectCascade 추가 |
| **수정** `stats/lib/stores/graph-studio-store.ts` | saveCurrentProject에서 evictedIds 처리 |
| **수정** `stats/components/graph-studio/GraphStudioHeader.tsx` | 저장 버튼 추가 |
| **수정** `stats/app/graph-studio/GraphStudioContent.tsx` | echartsRef를 Header에 전달 |
| **수정** `stats/lib/services/export/document-docx-export.ts` | buildDocxDocument에 snapshots 파라미터 + ImageRun |
| **수정** `stats/components/papers/DocumentExportBar.tsx` | HWPX 다운로드 버튼 추가 |
| **테스트** `stats/__tests__/lib/graph-studio/chart-snapshot-storage.test.ts` | 스냅샷 CRUD |
| **테스트** `stats/__tests__/lib/services/export/document-hwpx-export.test.ts` | HWPX 빌더 |
| **테스트** `stats/__tests__/lib/services/export/document-docx-export.test.ts` | 기존 + 이미지 삽입 |

---

## Task 1: chart-snapshot-storage (IndexedDB CRUD)

**Files:**
- Create: `stats/lib/graph-studio/chart-snapshot-storage.ts`
- Modify: `stats/lib/utils/adapters/indexeddb-adapter.ts:16-74`
- Test: `stats/__tests__/lib/graph-studio/chart-snapshot-storage.test.ts`

- [ ] **Step 1: IndexedDB 버전 업그레이드 (v3→v4)**

`stats/lib/utils/adapters/indexeddb-adapter.ts` 수정:

```ts
// 변경: DB_VERSION 3 → 4
const DB_VERSION = 4  // v4: chart-snapshots store 추가

// onupgradeneeded에 추가 (document-blueprints 블록 뒤):
// Chart snapshots 스토어 생성 (v4)
if (!db.objectStoreNames.contains('chart-snapshots')) {
  db.createObjectStore('chart-snapshots', { keyPath: 'id' })
}
```

- [ ] **Step 2: ChartSnapshot 타입 + CRUD 구현**

`stats/lib/graph-studio/chart-snapshot-storage.ts` 생성:

```ts
/**
 * 차트 스냅샷 IndexedDB 저장소
 *
 * Graph Studio 저장 시 ECharts PNG 캡처를 저장.
 * DOCX/HWPX 내보내기 시 스냅샷 조회.
 */

import { openDB } from '@/lib/utils/adapters/indexeddb-adapter'

const STORE_NAME = 'chart-snapshots'

export interface ChartSnapshot {
  id: string           // graphProjectId
  data: Uint8Array     // PNG 바이너리
  cssWidth: number     // ECharts 렌더 영역 CSS px
  cssHeight: number    // ECharts 렌더 영역 CSS px
  pixelRatio: number   // 캡처 시 배율 (기본 2)
  updatedAt: string    // ISO 8601
}

// ── IndexedDB 헬퍼 (document-blueprint-storage.ts 패턴) ──

function txPut(db: IDBDatabase, storeName: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.put(value)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

function txGet<T>(db: IDBDatabase, storeName: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

function txDelete(db: IDBDatabase, storeName: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.delete(key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// ── 공개 API ──

export async function saveSnapshot(snapshot: ChartSnapshot): Promise<void> {
  const db = await openDB()
  await txPut(db, STORE_NAME, snapshot)
}

export async function loadSnapshot(id: string): Promise<ChartSnapshot | undefined> {
  const db = await openDB()
  return txGet<ChartSnapshot>(db, STORE_NAME, id)
}

export async function loadSnapshots(ids: string[]): Promise<Map<string, ChartSnapshot>> {
  if (ids.length === 0) return new Map()
  const db = await openDB()
  const map = new Map<string, ChartSnapshot>()
  for (const id of ids) {
    const snap = await txGet<ChartSnapshot>(db, STORE_NAME, id)
    if (snap) map.set(id, snap)
  }
  return map
}

export async function deleteSnapshot(id: string): Promise<void> {
  const db = await openDB()
  await txDelete(db, STORE_NAME, id)
}

export async function deleteSnapshots(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const db = await openDB()
  for (const id of ids) {
    await txDelete(db, STORE_NAME, id)
  }
}

/** base64 data URL → Uint8Array 변환 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
  const binaryStr = atob(base64)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }
  return bytes
}
```

- [ ] **Step 3: 테스트 작성**

`stats/__tests__/lib/graph-studio/chart-snapshot-storage.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveSnapshot, loadSnapshot, loadSnapshots,
  deleteSnapshot, deleteSnapshots, dataUrlToUint8Array,
} from '@/lib/graph-studio/chart-snapshot-storage'
import type { ChartSnapshot } from '@/lib/graph-studio/chart-snapshot-storage'

const makeMockSnapshot = (id: string): ChartSnapshot => ({
  id,
  data: new Uint8Array([137, 80, 78, 71]),  // PNG magic bytes
  cssWidth: 480,
  cssHeight: 320,
  pixelRatio: 2,
  updatedAt: new Date().toISOString(),
})

describe('chart-snapshot-storage', () => {
  it('saveSnapshot → loadSnapshot 왕복', async () => {
    const snap = makeMockSnapshot('proj-1')
    await saveSnapshot(snap)
    const loaded = await loadSnapshot('proj-1')
    expect(loaded).toBeDefined()
    expect(loaded!.cssWidth).toBe(480)
    expect(loaded!.data.length).toBe(4)
  })

  it('loadSnapshot 미존재 키 → undefined', async () => {
    const result = await loadSnapshot('nonexistent')
    expect(result).toBeUndefined()
  })

  it('loadSnapshots 일괄 조회 (일부 미존재)', async () => {
    await saveSnapshot(makeMockSnapshot('a'))
    await saveSnapshot(makeMockSnapshot('b'))
    const map = await loadSnapshots(['a', 'b', 'missing'])
    expect(map.size).toBe(2)
    expect(map.has('a')).toBe(true)
    expect(map.has('missing')).toBe(false)
  })

  it('deleteSnapshot 후 loadSnapshot → undefined', async () => {
    await saveSnapshot(makeMockSnapshot('del-1'))
    await deleteSnapshot('del-1')
    expect(await loadSnapshot('del-1')).toBeUndefined()
  })

  it('deleteSnapshots 일괄 삭제', async () => {
    await saveSnapshot(makeMockSnapshot('x'))
    await saveSnapshot(makeMockSnapshot('y'))
    await deleteSnapshots(['x', 'y'])
    expect(await loadSnapshot('x')).toBeUndefined()
    expect(await loadSnapshot('y')).toBeUndefined()
  })

  it('dataUrlToUint8Array 변환', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo='
    const result = dataUrlToUint8Array(dataUrl)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result[0]).toBe(137)  // PNG signature
  })
})
```

- [ ] **Step 4: 테스트 실행**

Run: `cd stats && pnpm test __tests__/lib/graph-studio/chart-snapshot-storage`
Expected: 6 passed

- [ ] **Step 5: 커밋**

```bash
git add stats/lib/graph-studio/chart-snapshot-storage.ts stats/lib/utils/adapters/indexeddb-adapter.ts stats/__tests__/lib/graph-studio/chart-snapshot-storage.test.ts
git commit -m "feat(graph): chart snapshot IndexedDB storage (Phase 6a Step 1)"
```

---

## Task 2: deleteProjectCascade + saveProject eviction

**Files:**
- Modify: `stats/lib/graph-studio/project-storage.ts:60-140`
- Modify: `stats/lib/stores/graph-studio-store.ts:304-348`
- Modify: `stats/components/analysis/hub/QuickAccessBar.tsx` (deleteProject 호출부)

- [ ] **Step 1: enforceMaxCount 반환값 확장**

`stats/lib/graph-studio/project-storage.ts`의 `enforceMaxCount` 수정:

```ts
// Before: function enforceMaxCount(...): GraphProject[]
// After:
function enforceMaxCount(
  list: GraphProject[],
  maxCount: number,
  excludeId: string,
): { list: GraphProject[]; evictedIds: string[] } {
  if (list.length <= maxCount) return { list, evictedIds: [] };

  const candidates = getEvictionCandidates(list, excludeId);
  const evictCount = list.length - maxCount;
  const evictedIds = candidates.slice(0, evictCount).map(p => p.id);
  const evictSet = new Set(evictedIds);

  return {
    list: list.filter(p => !evictSet.has(p.id)),
    evictedIds,
  };
}
```

- [ ] **Step 2: saveProject 반환값 → string[] (evictedIds)**

```ts
// Before: export function saveProject(project: GraphProject): void
// After:
export function saveProject(project: GraphProject): string[] {
  let list = listProjects();
  const idx = list.findIndex(p => p.id === project.id);
  if (idx >= 0) {
    list[idx] = project;
  } else {
    list.push(project);
  }

  const { list: enforced, evictedIds } = enforceMaxCount(list, MAX_GRAPH_PROJECTS, project.id);
  const retryResult = writeWithQuotaRetry(enforced, project.id);

  return [...evictedIds, ...retryResult];
}
```

- [ ] **Step 3: writeWithQuotaRetry → evictedIds 수집**

```ts
// Before: function writeWithQuotaRetry(list, excludeId): void
// After:
function writeWithQuotaRetry(list: GraphProject[], excludeId: string): string[] {
  const evictedIds: string[] = [];
  for (let attempt = 0; attempt <= MAX_EVICTION_RETRIES; attempt++) {
    try {
      writeJson(STORAGE_KEY, list);
      return evictedIds;
    } catch (error: unknown) {
      // ... 기존 QuotaExceededError 체크 ...
      const candidates = getEvictionCandidates(list, excludeId);
      if (candidates.length === 0) throw error;
      const evictId = candidates[0].id;
      evictedIds.push(evictId);
      list = list.filter(p => p.id !== evictId);
    }
  }
  return evictedIds;
}
```

- [ ] **Step 4: deleteProjectCascade 추가**

```ts
import { deleteSnapshot, deleteSnapshots } from './chart-snapshot-storage'

export async function deleteProjectCascade(projectId: string): Promise<void> {
  deleteProject(projectId)
  await deleteSnapshot(projectId).catch(() => {})  // best-effort
}
```

- [ ] **Step 5: graph-studio-store.ts에서 evictedIds 처리**

`saveCurrentProject` 수정:

```ts
// saveProject 호출 후:
const evictedIds = saveProject(project);

// evictedIds가 있으면 스냅샷도 비동기 정리
if (evictedIds.length > 0) {
  deleteSnapshots(evictedIds).catch(console.warn);
}
```

rollback 경로도:

```ts
// 기존: deleteStoredProject(project.id)
// 변경: deleteProjectCascade(project.id).catch(console.error)
```

- [ ] **Step 6: QuickAccessBar.tsx에서 cascade 사용**

```ts
// 기존: deleteProject(deleteConfirmId)
// 변경: await deleteProjectCascade(deleteConfirmId)
```

(이미 async 함수 내부이므로 await 추가만)

- [ ] **Step 7: 테스트 실행**

Run: `cd stats && pnpm test __tests__/lib/graph-studio/`
Expected: 기존 테스트 통과 (saveProject 반환값 변경에 따른 테스트 수정 필요 시 수정)

- [ ] **Step 8: 커밋**

```bash
git add stats/lib/graph-studio/project-storage.ts stats/lib/stores/graph-studio-store.ts stats/components/analysis/hub/QuickAccessBar.tsx
git commit -m "feat(graph): deleteProjectCascade + saveProject eviction tracking (Phase 6a Step 2)"
```

---

## Task 3: Graph Studio 저장 버튼 + 스냅샷 캡처

**Files:**
- Modify: `stats/components/graph-studio/GraphStudioHeader.tsx`
- Modify: `stats/app/graph-studio/GraphStudioContent.tsx`

- [ ] **Step 1: GraphStudioHeader에 저장 버튼 추가**

```tsx
// Props 확장:
interface GraphStudioHeaderProps {
  // ... 기존 ...
  onSave?: () => void;
}

// JSX에 저장 버튼 추가 (export 버튼 근처):
<Button variant="outline" size="sm" onClick={onSave} disabled={!chartSpec}>
  <Save className="w-4 h-4 mr-1" />
  저장
</Button>
```

- [ ] **Step 2: GraphStudioContent에서 스냅샷 캡처 + 저장 연결**

```tsx
import { saveSnapshot, dataUrlToUint8Array } from '@/lib/graph-studio/chart-snapshot-storage'
import type { ChartSnapshot } from '@/lib/graph-studio/chart-snapshot-storage'

const handleSave = useCallback(async () => {
  const store = useGraphStudioStore.getState()
  const name = store.currentProject?.name || 'Untitled Chart'

  // 1. 스냅샷 캡처 (fire-and-forget)
  const instance = echartsRef.current?.getEchartsInstance()
  if (instance) {
    const dataUrl = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' })
    const projectId = store.currentProject?.id ?? store.saveCurrentProject(name)
    if (projectId) {
      const snapshot: ChartSnapshot = {
        id: projectId,
        data: dataUrlToUint8Array(dataUrl),
        cssWidth: instance.getWidth(),
        cssHeight: instance.getHeight(),
        pixelRatio: 2,
        updatedAt: new Date().toISOString(),
      }
      saveSnapshot(snapshot).catch(console.warn)
    }
  }

  // 2. 프로젝트 저장 (기존 동기 계약 유지)
  store.saveCurrentProject(name)
}, [echartsRef])
```

- [ ] **Step 3: onSave를 Header에 전달**

```tsx
<GraphStudioHeader onSave={handleSave} />
```

- [ ] **Step 4: 수동 테스트**

Graph Studio에서 차트 생성 → 저장 버튼 → IndexedDB에 chart-snapshots 엔트리 확인 (DevTools Application > IndexedDB)

- [ ] **Step 5: 커밋**

```bash
git add stats/components/graph-studio/GraphStudioHeader.tsx stats/app/graph-studio/GraphStudioContent.tsx
git commit -m "feat(graph): save button + chart snapshot capture (Phase 6a Step 3)"
```

---

## Task 4: DOCX 이미지 삽입

**Files:**
- Modify: `stats/lib/services/export/document-docx-export.ts:228-370`
- Modify: `stats/__tests__/lib/services/export/document-docx-export.test.ts`

- [ ] **Step 1: buildDocxDocument 시그니처 확장**

```ts
import type { ChartSnapshot } from '@/lib/graph-studio/chart-snapshot-storage'
import { loadSnapshots } from '@/lib/graph-studio/chart-snapshot-storage'

// 크기 상수 추가
const PAGE_WIDTH_TWIPS = 12240    // Letter 8.5인치
const CONTENT_WIDTH_PX = (PAGE_WIDTH_TWIPS - MARGIN * 2) / 15  // 624 CSS px

export async function buildDocxDocument(
  doc: DocumentBlueprint,
  snapshots?: Map<string, ChartSnapshot>,
): Promise<InstanceType<typeof import('docx')['Document']>> {
```

- [ ] **Step 2: Figure 처리 — 이미지 삽입 로직**

기존 Figure 플레이스홀더 블록 교체:

```ts
// 그림 참조 → 이미지 삽입 (스냅샷 있으면) + 캡션
if (section.figures) {
  for (const fig of section.figures) {
    const snapshot = snapshots?.get(fig.entityId)

    if (snapshot) {
      const { ImageRun } = docx
      const scale = Math.min(1, CONTENT_WIDTH_PX / snapshot.cssWidth)
      const width = Math.round(snapshot.cssWidth * scale)
      const height = Math.round(snapshot.cssHeight * scale)

      children.push(new Paragraph({
        children: [new ImageRun({
          type: 'png',
          data: snapshot.data,
          transformation: { width, height },
        })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 80, line: LINE_SPACING },
      }))
    }

    // 캡션은 항상 출력
    children.push(new Paragraph({
      children: [new TextRun({
        text: `${fig.label}: ${fig.caption}`,
        font: FONT,
        size: SIZE_BODY,
        italics: true,
      })],
      spacing: { before: snapshot ? 80 : 240, after: 120, line: LINE_SPACING },
    }))
  }
}
```

- [ ] **Step 3: documentToDocx 래퍼에서 스냅샷 로드**

```ts
export async function documentToDocx(doc: DocumentBlueprint): Promise<void> {
  // Figure entityId 수집 → 스냅샷 일괄 로드
  const figureIds = doc.sections.flatMap(s => s.figures?.map(f => f.entityId) ?? [])
  const snapshots = figureIds.length > 0 ? await loadSnapshots(figureIds) : undefined

  const docx = await getDocx()
  const document = await buildDocxDocument(doc, snapshots)
  const { Packer } = docx
  const blob = await Packer.toBlob(document)
  const safeName = doc.title.replace(/[/\\?%*:|"<>]/g, '_')
  downloadBlob(blob, `${safeName}.docx`)
}
```

- [ ] **Step 4: 테스트 추가**

```ts
describe('buildDocxDocument with snapshots', () => {
  const mockSnapshot = new Map([
    ['g1', {
      id: 'g1',
      data: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10,  // PNG header (8 bytes minimum)
        0, 0, 0, 13, 73, 72, 68, 82,  // IHDR chunk
        0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0,  // 1x1 RGB
        144, 119, 83, 222,  // CRC
        0, 0, 0, 12, 73, 68, 65, 84,  // IDAT
        8, 215, 99, 248, 207, 192, 0, 0, 0, 3, 0, 1,  // compressed
        24, 216, 110, 175,  // CRC
        0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130  // IEND
      ]),
      cssWidth: 480,
      cssHeight: 320,
      pixelRatio: 2,
      updatedAt: '2026-04-03T00:00:00.000Z',
    }],
  ])

  it('스냅샷 있는 Figure → Blob 크기가 플레이스홀더보다 큼', async () => {
    const { Packer } = await import('docx')
    const docWithFig = makeDoc({
      sections: [makeSection({
        id: 'r', title: '결과', content: '결과.',
        figures: [{ entityId: 'g1', label: 'Figure 1', caption: '차트' }],
      })],
    })
    const withImg = await buildDocxDocument(docWithFig, mockSnapshot)
    const withoutImg = await buildDocxDocument(docWithFig)
    const blobWith = await Packer.toBlob(withImg)
    const blobWithout = await Packer.toBlob(withoutImg)
    expect(blobWith.size).toBeGreaterThan(blobWithout.size)
  })

  it('스냅샷 없는 Figure → 캡션 플레이스홀더 fallback', async () => {
    const doc = await buildDocxDocument(makeDoc({
      sections: [makeSection({
        id: 'r', title: '결과', content: '',
        figures: [{ entityId: 'missing', label: 'Figure 1', caption: '차트' }],
      })],
    }))
    expect(doc).toBeDefined()
  })
})
```

- [ ] **Step 5: 테스트 실행**

Run: `cd stats && pnpm test __tests__/lib/services/export/document-docx-export`
Expected: 기존 18 + 신규 2 = 20 passed

- [ ] **Step 6: 커밋**

```bash
git add stats/lib/services/export/document-docx-export.ts stats/__tests__/lib/services/export/document-docx-export.test.ts
git commit -m "feat(papers): DOCX image insertion from chart snapshots (Phase 6a Step 4)"
```

---

## Task 5: HWPX 내보내기

**Files:**
- Create: `stats/lib/services/export/document-hwpx-export.ts`
- Create: `stats/public/templates/blank.hwpx`
- Test: `stats/__tests__/lib/services/export/document-hwpx-export.test.ts`

- [ ] **Step 1: 템플릿 복사**

```bash
cp d:/Projects/BioHub/table-template.hwpx stats/public/templates/blank.hwpx
```

- [ ] **Step 2: document-hwpx-export.ts 생성**

playbook의 `hwpx-builder.js` 로직을 TypeScript로 BioHub에 통합. `DocumentBlueprint` → HWPX 변환:

```ts
/**
 * 문서(DocumentBlueprint) → HWPX 내보내기
 *
 * JSZip 템플릿 방식. playbook/recipes/hwpx-builder 기반.
 * 지원: 텍스트(볼드/이탤릭/위첨자), 표(헤더 가운데+볼드), PNG 이미지.
 */

import JSZip from 'jszip'
import type { DocumentBlueprint, DocumentTable, DocumentSection } from '@/lib/research/document-blueprint-types'
import type { ChartSnapshot } from '@/lib/graph-studio/chart-snapshot-storage'
import { loadSnapshots } from '@/lib/graph-studio/chart-snapshot-storage'
import { hasVisibleContent, parseInlineMarks } from './document-docx-export'
import { downloadBlob } from './export-data-builder'

// ... (playbook hwpx-builder 로직을 TypeScript로 이식)
// escapeXml, pxToHwpml, _injectStyles, section0 조립 등

export async function buildHwpxDocument(
  doc: DocumentBlueprint,
  snapshots?: Map<string, ChartSnapshot>,
): Promise<Uint8Array> { /* ... */ }

export async function documentToHwpx(doc: DocumentBlueprint): Promise<void> {
  const figureIds = doc.sections.flatMap(s => s.figures?.map(f => f.entityId) ?? [])
  const snapshots = figureIds.length > 0 ? await loadSnapshots(figureIds) : undefined
  const hwpxData = await buildHwpxDocument(doc, snapshots)
  const safeName = doc.title.replace(/[/\\?%*:|"<>]/g, '_')
  downloadBlob(new Blob([hwpxData]), `${safeName}.hwpx`)
}
```

핵심: `document-docx-export.ts`에서 `hasVisibleContent`, `parseInlineMarks`를 import하여 재사용. DocumentBlueprint의 sections 순회 로직은 DOCX 빌더와 동일 패턴.

- [ ] **Step 3: 테스트 작성**

```ts
describe('buildHwpxDocument', () => {
  it('최소 문서 → Uint8Array 생성', async () => {
    const result = await buildHwpxDocument(makeDoc())
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('표 포함 문서', async () => {
    const result = await buildHwpxDocument(makeDoc({
      sections: [makeSection({
        id: 'r', title: '결과', content: '결과.',
        tables: [{ caption: 'Table 1', headers: ['A', 'B'], rows: [['1', '2']] }],
      })],
    }))
    expect(result.length).toBeGreaterThan(0)
  })

  it('스냅샷 있는 Figure → ZIP에 BinData 포함', async () => {
    const snap = new Map([['g1', { id: 'g1', data: new Uint8Array([137,80,78,71]), cssWidth: 100, cssHeight: 100, pixelRatio: 2, updatedAt: '' }]])
    const result = await buildHwpxDocument(makeDoc({
      sections: [makeSection({
        id: 'r', title: '결과', content: '',
        figures: [{ entityId: 'g1', label: 'Figure 1', caption: '차트' }],
      })],
    }), snap)
    const zip = await JSZip.loadAsync(result)
    expect(zip.file('BinData/chart1.png')).toBeDefined()
  })
})
```

- [ ] **Step 4: 테스트 실행**

Run: `cd stats && pnpm test __tests__/lib/services/export/document-hwpx-export`
Expected: 3 passed

- [ ] **Step 5: 커밋**

```bash
git add stats/lib/services/export/document-hwpx-export.ts stats/public/templates/blank.hwpx stats/__tests__/lib/services/export/document-hwpx-export.test.ts
git commit -m "feat(papers): HWPX export with tables + images (Phase 6a Step 5)"
```

---

## Task 6: DocumentExportBar에 HWPX 버튼 추가

**Files:**
- Modify: `stats/components/papers/DocumentExportBar.tsx`

- [ ] **Step 1: HWPX 핸들러 + 버튼 추가**

```tsx
import { documentToHwpx } from '@/lib/services/export/document-hwpx-export'

// state 추가
const [hwpxLoading, setHwpxLoading] = useState(false)

// 핸들러
const handleDownloadHwpx = useCallback(async () => {
  onBeforeExport?.()
  setHwpxLoading(true)
  try {
    await documentToHwpx(doc)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'HWPX 생성에 실패했습니다'
    toast.error(message)
  } finally {
    setHwpxLoading(false)
  }
}, [doc, onBeforeExport])

// JSX — DOCX 버튼 뒤에 추가
<Button
  variant="outline"
  size="sm"
  disabled={!hasContent || hwpxLoading}
  onClick={handleDownloadHwpx}
  className="gap-1.5"
>
  {hwpxLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
  {hwpxLoading ? '생성 중...' : 'HWPX 다운로드'}
</Button>
```

- [ ] **Step 2: 커밋**

```bash
git add stats/components/papers/DocumentExportBar.tsx
git commit -m "feat(papers): HWPX download button in export bar (Phase 6a Step 6)"
```

---

## Task 7: 통합 테스트 + 문서 업데이트

- [ ] **Step 1: tsc 검증**

Run: `cd stats && node node_modules/typescript/bin/tsc --noEmit`
Expected: 기존 에러만 (AlphaDiversityTool)

- [ ] **Step 2: 전체 paper 테스트**

Run: `cd stats && pnpm test components/papers/__tests__/ lib/research/__tests__/ __tests__/lib/services/export/document-docx-export __tests__/lib/services/export/document-hwpx-export __tests__/lib/graph-studio/chart-snapshot-storage`

- [ ] **Step 3: TODO.md 업데이트**

Phase 6a 완료 표시.

- [ ] **Step 4: 최종 커밋**

```bash
git commit -m "docs: Phase 6a 완료 — 차트 이미지 DOCX/HWPX 삽입"
```

---

## 테스트 시나리오 (Task 7 후 수동 검증)

1. **Graph Studio** → 차트 생성 → 저장 버튼 → DevTools에서 IndexedDB 스냅샷 확인
2. **Papers** → 문서 생성 → Figure 삽입 → DOCX 다운로드 → Word에서 이미지 확인
3. **Papers** → 같은 문서 → HWPX 다운로드 → 한컴에서 이미지+표 확인
4. **스냅샷 없는 Figure** → DOCX/HWPX 모두 캡션 플레이스홀더로 fallback 확인
5. **Graph Studio 프로젝트 삭제** → 스냅샷도 함께 삭제 확인
