# Phase 6a: 차트 이미지 DOCX 삽입

**상태**: 설계 확정  
**선행**: Phase 4 (DOCX 내보내기) 완료  
**목표**: Graph Studio 차트를 실제 PNG 이미지로 DOCX에 삽입 (캡션 플레이스홀더 대체)

---

## 1. 범위

### 포함

- Graph Studio 차트 PNG 스냅샷 캡처 + IndexedDB 저장
- DOCX 내보내기 시 스냅샷 조회 → `ImageRun`으로 실제 이미지 삽입
- Graph Studio 저장 버튼 (현재 미구현 → 신규)

### 제외 (후순위)

- HWPX 내보내기 — JSZip 직접 구현 필요, Phase 6b로 분리
- Bio-Tools 차트 이미지 — ECharts ref 미노출 구조, 별도 작업
- 자동 번호 매기기 — 사용자가 Word/한글에서 최종 편집

### 핵심 전제

**BioHub = 초안 생성기.** 최종 편집은 Word/한글에서 수행. 사용자는 다른 소스의 그림을 추가할 수 있으므로 번호 매기기/인용 관리는 BioHub 범위 밖.

---

## 2. 차트 스냅샷 시스템

### 저장소

기존 `analysis-history` IndexedDB (v3 → v4)에 `chart-snapshots` store 추가. `document-blueprint-storage.ts`와 동일한 `openDB()` + `txPut`/`txGet`/`txDelete` 패턴 재사용.

```
DB: "analysis-history" (v4)
  기존: analyses, sync_queue, favorites, document-blueprints
  추가: chart-snapshots
    key: graphProjectId (string)
    value: ChartSnapshot
```

### ChartSnapshot 타입

```ts
interface ChartSnapshot {
  data: Uint8Array    // PNG 바이너리
  cssWidth: number    // ECharts 렌더 영역 CSS px
  cssHeight: number   // ECharts 렌더 영역 CSS px
  pixelRatio: number  // 캡처 시 배율 (2)
  updatedAt: string   // ISO 8601
}
```

- `cssWidth/cssHeight` = 문서 배치용 논리 크기 (DOCX `ImageRun.transformation`에 직접 전달)
- 실제 PNG 픽셀 크기 = `cssWidth * pixelRatio`

### 파일

```
stats/lib/graph-studio/chart-snapshot-storage.ts
```

API: `saveSnapshot(id, snapshot)` / `loadSnapshot(id)` / `loadSnapshots(ids)` / `deleteSnapshot(id)` / `deleteSnapshots(ids)`

### 캡처 흐름 (2단계 저장)

`saveCurrentProject()`의 동기 `string | null` 계약을 유지하면서 비동기 스냅샷을 붙이는 방식:

```
GraphStudioHeader "저장" 버튼 클릭:
  1. echartsRef.getDataURL({ type: 'png', pixelRatio: 2 }) → base64 (동기)
  2. base64 → Uint8Array 변환 (동기)
  3. saveSnapshot(projectId, snapshot) → IndexedDB (비동기, fire-and-forget)
  4. store.saveCurrentProject(name) → localStorage (동기, 기존 계약 유지)
```

- 스냅샷 저장 실패 → `console.warn` (프로젝트 저장은 성공해야 함)
- 스냅샷 없이 DOCX 내보내기 → 기존 캡션 플레이스홀더 fallback

### 선행 작업: 저장 버튼

`GraphStudioHeader`에 저장 버튼 추가. 현재 `saveCurrentProject` 스토어 액션은 존재하지만 UI에서 호출하는 곳이 없음 (IDEAS-PAPER-DRAFT-ENHANCEMENTS.md에 TODO로 기록됨).

저장 버튼은 `echartsRef`를 props로 받아 캡처 수행 → 스토어 액션 호출.

---

## 3. 삭제 cascade

### deleteProjectCascade

`project-storage.ts`에 추가:

```ts
export async function deleteProjectCascade(projectId: string): Promise<void> {
  deleteProject(projectId)              // localStorage (동기)
  removeProjectEntityRefs(projectId)    // entity ref (동기)
  await deleteSnapshot(projectId)       // IndexedDB (비동기)
}
```

### 3개 삭제 경로 통합

1. **QuickAccessBar 삭제** → `await deleteProjectCascade(id)` (이미 async 함수, 현재 await 누락 → 수정)
2. **graph-studio-store rollback** → `deleteProjectCascade(id).catch(console.error)` (best-effort)
3. **quota eviction** → `saveProject` 반환값을 `string[]` (축출된 ID)로 확장. 호출자가 비동기 cleanup:

```ts
// saveProject 시그니처 변경
export function saveProject(project: GraphProject): string[]
// 반환: evictedIds (빈 배열이면 축출 없음)

// enforceMaxCount 반환값 확장
function enforceMaxCount(...): { list: GraphProject[]; evictedIds: string[] }

// writeWithQuotaRetry도 evicted ID 수집
function writeWithQuotaRetry(...): string[]
```

`saveCurrentProject` (store)에서 반환된 evictedIds로 스냅샷 fire-and-forget 삭제.

---

## 4. DOCX 이미지 삽입

### buildDocxDocument 시그니처 확장

```ts
export async function buildDocxDocument(
  doc: DocumentBlueprint,
  snapshots?: Map<string, ChartSnapshot>,
): Promise<Document>
```

### Figure 처리 로직 변경

```ts
for (const fig of section.figures) {
  const snapshot = snapshots?.get(fig.entityId)

  if (snapshot) {
    // 이미지 크기: 본문 폭 초과 시 비례 축소
    const scale = Math.min(1, CONTENT_WIDTH_PX / snapshot.cssWidth)
    const width = Math.round(snapshot.cssWidth * scale)
    const height = Math.round(snapshot.cssHeight * scale)

    children.push(new Paragraph({
      children: [new ImageRun({
        type: 'png',
        data: snapshot.data,       // Uint8Array 직접 전달 (.buffer 아님)
        transformation: { width, height },  // CSS px (docx 내부에서 *9525 EMU 변환)
      })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 80 },
    }))
  }

  // 캡션은 항상 출력 (이미지 유무와 무관)
  children.push(new Paragraph({
    children: [new TextRun({ text: `${fig.label}: ${fig.caption}`, ... })],
  }))
}
```

### 크기 상수

```ts
const PAGE_WIDTH_TWIPS = 12240    // Letter 8.5인치
const CONTENT_WIDTH_PX = (PAGE_WIDTH_TWIPS - MARGIN * 2) / 15  // 624 CSS px
```

`MARGIN`은 기존 모듈 상수 (1440 twips = 1인치).

### documentToDocx 래퍼 변경

```ts
export async function documentToDocx(doc: DocumentBlueprint): Promise<void> {
  // Figure entityId 수집 → 스냅샷 일괄 로드
  const figureIds = doc.sections.flatMap(s => s.figures?.map(f => f.entityId) ?? [])
  const snapshots = figureIds.length > 0 ? await loadSnapshots(figureIds) : undefined

  const docx = await getDocx()
  const docxDoc = await buildDocxDocument(doc, snapshots)
  const { Packer } = docx
  const blob = await Packer.toBlob(docxDoc)
  downloadBlob(blob, `${safeName}.docx`)
}
```

---

## 5. UI 변경

### Graph Studio 저장 버튼

`GraphStudioHeader.tsx`에 저장 버튼 추가:
- 아이콘: `Save` (lucide)
- 프로젝트명 입력: 최초 저장 시 이름 입력 다이얼로그, 이후 덮어쓰기
- `echartsRef` prop 필요 (부모 `GraphStudioContent`에서 전달)

### DocumentExportBar

변경 없음. `documentToDocx` 래퍼가 내부에서 스냅샷 로드 처리.

---

## 6. 테스트

### chart-snapshot-storage

- `saveSnapshot` → `loadSnapshot` 왕복
- `deleteSnapshot` 후 `loadSnapshot` → undefined
- `loadSnapshots` 일괄 조회 (일부 키 없음 → 있는 것만 반환)
- `deleteSnapshots` 일괄 삭제

### deleteProjectCascade

- 프로젝트 + 스냅샷 + entity ref 모두 삭제 확인
- 스냅샷 없는 프로젝트 삭제 시 에러 없음

### saveProject eviction

- 50개 초과 시 evictedIds 반환 확인
- evictedIds 기반 스냅샷 삭제 확인

### buildDocxDocument with snapshots

- 스냅샷 있는 Figure → Blob 크기가 플레이스홀더보다 큼
- 스냅샷 없는 Figure → 기존 캡션 플레이스홀더 fallback
- 폭 초과 이미지 → 비례 축소 적용

---

## 7. 파일 변경 매트릭스

| 파일 | 변경 |
|------|------|
| **신규** `chart-snapshot-storage.ts` | IndexedDB CRUD |
| **신규** `chart-snapshot-types.ts` | ChartSnapshot 인터페이스 |
| `indexeddb-adapter.ts` | DB_VERSION 3→4, chart-snapshots store 추가 |
| `project-storage.ts` | `deleteProjectCascade`, `saveProject` 반환값 확장, `enforceMaxCount` 반환값 확장, `writeWithQuotaRetry` evictedIds 수집 |
| `graph-studio-store.ts` | `saveCurrentProject`에서 evictedIds 처리, rollback cascade |
| `GraphStudioHeader.tsx` | 저장 버튼 추가 |
| `GraphStudioContent.tsx` | `echartsRef`를 Header에 전달 |
| `document-docx-export.ts` | `buildDocxDocument` snapshots 파라미터, ImageRun 삽입, 크기 상수 |
| `QuickAccessBar.tsx` | `deleteProject` → `await deleteProjectCascade` |
| 테스트 4파일 | 위 항목별 테스트 |

---

## 8. 후순위 (Phase 6b)

### HWPX 내보내기

검증 순서:
1. `@handoc/hwpx-writer` (MIT, TS) — `HwpxBuilder.addImage()` 동작 확인. GitHub README에 이미지 지원 명시됨 ([muin-company/handoc](https://github.com/muin-company/handoc)). npm 설치 가능 여부 + addImage API 실재 검증 필요.
2. `@ssabrojs/hwpxjs` (MIT, TS) — HwpxWriter로 텍스트 생성 후 JSZip으로 BinData에 이미지 수동 추가하는 하이브리드 접근.
3. JSZip 완전 직접 구현 — OWPML 스펙 기반 ([한컴테크](https://tech.hancom.com/hwpxformat/)), kordoc 파싱 코드 역참조.

참고 자료:
- `pypandoc-hwpx` (MIT, Python) — Pandoc 기반 Markdown → HWPX 변환, 이미지 포함 지원. Pandoc 의존성 무거움.
- `python-hwpx` — 기능 완전하나 비상업적 라이선스 (사용 불가).

### Bio-Tools 차트 이미지

ECharts ref 노출 구조 변경 선행 (`LazyReactECharts`에 ref forwarding 추가).
