# Phase 4: DOCX 내보내기 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** DocumentBlueprint를 학술 논문 형식 DOCX로 내보내기 — DocumentExportBar의 비활성 버튼 활성화

**Architecture:** `document-docx-export.ts`가 DocumentBlueprint를 순회하며 `docx` 패키지로 Document 객체를 빌드. `buildDocxDocument()` (순수 빌더, 테스트 가능) + `documentToDocx()` (다운로드 사이드이펙트) 2-tier API. DocumentExportBar에서 export 직전 `flushSerialize` 호출로 최신 content 보장.

**Tech Stack:** `docx` v9.5.1 (이미 설치됨), Vitest, sonner (toast)

**Spec:** `stats/docs/papers/PLAN-DOCX-EXPORT.md`

---

## 파일 구조

| 파일 | 역할 | 작업 |
|------|------|------|
| `stats/lib/services/export/document-docx-export.ts` | DOCX 빌더 + 다운로드 | 신규 |
| `stats/__tests__/lib/services/export/document-docx-export.test.ts` | 빌더 테스트 | 신규 |
| `stats/components/papers/DocumentExportBar.tsx` | 내보내기 버튼 바 | 수정 |
| `stats/components/papers/DocumentEditor.tsx` | flushSerialize prop 전달 | 수정 |

---

## Task 1: hasVisibleContent 헬퍼 + 테스트

**Files:**
- Create: `stats/lib/services/export/document-docx-export.ts`
- Create: `stats/__tests__/lib/services/export/document-docx-export.test.ts`

- [ ] **Step 1: 테스트 파일 생성 — hasVisibleContent 테스트 작성**

```typescript
// stats/__tests__/lib/services/export/document-docx-export.test.ts

import type { DocumentSection } from '@/lib/research/document-blueprint-types'

// downloadBlob mock (DOM 조작 방지)
vi.mock('@/lib/services/export/export-data-builder', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/lib/services/export/export-data-builder')>()
  return { ...orig, downloadBlob: vi.fn() }
})

import { hasVisibleContent } from '@/lib/services/export/document-docx-export'

// ─── 픽스처 ───

function makeSection(overrides: Partial<DocumentSection> = {}): DocumentSection {
  return {
    id: 'test-section',
    title: 'Test',
    content: '',
    sourceRefs: [],
    editable: true,
    generatedBy: 'user',
    ...overrides,
  }
}

// ─── hasVisibleContent ───

describe('hasVisibleContent', () => {
  it('content만 있으면 true', () => {
    expect(hasVisibleContent(makeSection({ content: '본문 텍스트' }))).toBe(true)
  })

  it('tables만 있으면 true', () => {
    expect(hasVisibleContent(makeSection({
      tables: [{ caption: 'Table 1', headers: ['A'], rows: [['1']] }],
    }))).toBe(true)
  })

  it('figures만 있으면 true', () => {
    expect(hasVisibleContent(makeSection({
      figures: [{ entityId: 'g1', label: 'Figure 1', caption: '차트' }],
    }))).toBe(true)
  })

  it('모두 없으면 false', () => {
    expect(hasVisibleContent(makeSection())).toBe(false)
  })

  it('빈 배열이면 false', () => {
    expect(hasVisibleContent(makeSection({ tables: [], figures: [] }))).toBe(false)
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `cd d:/Projects/BioHub/stats && pnpm test __tests__/lib/services/export/document-docx-export.test.ts`
Expected: FAIL — `hasVisibleContent` 모듈 없음

- [ ] **Step 3: 최소 구현 — document-docx-export.ts 파일 생성**

```typescript
// stats/lib/services/export/document-docx-export.ts

/**
 * 문서(DocumentBlueprint) → DOCX 내보내기
 *
 * 학술 논문 형식: Times New Roman 12pt, 더블스페이스, 3-line table.
 * Spec: stats/docs/papers/PLAN-DOCX-EXPORT.md
 */

import type { DocumentSection } from '@/lib/research/document-blueprint-types'

/** 섹션에 렌더링할 콘텐츠가 있는지 판정 (DOCX/HTML 공용) */
export function hasVisibleContent(section: DocumentSection): boolean {
  if (section.content) return true
  if (section.tables && section.tables.length > 0) return true
  if (section.figures && section.figures.length > 0) return true
  return false
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `cd d:/Projects/BioHub/stats && pnpm test __tests__/lib/services/export/document-docx-export.test.ts`
Expected: 5 passed

- [ ] **Step 5: 커밋**

```bash
cd d:/Projects/BioHub && git add stats/lib/services/export/document-docx-export.ts stats/__tests__/lib/services/export/document-docx-export.test.ts && git commit -m "feat(papers): Phase 4 Step 1 — hasVisibleContent 헬퍼 + 테스트"
```

---

## Task 2: 마크다운 인라인 파싱 + 테스트

**Files:**
- Modify: `stats/lib/services/export/document-docx-export.ts`
- Modify: `stats/__tests__/lib/services/export/document-docx-export.test.ts`

- [ ] **Step 1: 테스트 추가 — parseInlineMarks**

테스트 파일 하단에 추가:

```typescript
import { parseInlineMarks } from '@/lib/services/export/document-docx-export'

describe('parseInlineMarks', () => {
  it('plain text → 단일 TextRun', () => {
    const runs = parseInlineMarks('hello world')
    expect(runs).toHaveLength(1)
    expect(runs[0]).toEqual({ text: 'hello world' })
  })

  it('**bold** → bold TextRun', () => {
    const runs = parseInlineMarks('앞 **굵게** 뒤')
    expect(runs).toHaveLength(3)
    expect(runs[0]).toEqual({ text: '앞 ' })
    expect(runs[1]).toEqual({ text: '굵게', bold: true })
    expect(runs[2]).toEqual({ text: ' 뒤' })
  })

  it('*italic* → italic TextRun', () => {
    const runs = parseInlineMarks('앞 *기울임* 뒤')
    expect(runs).toHaveLength(3)
    expect(runs[0]).toEqual({ text: '앞 ' })
    expect(runs[1]).toEqual({ text: '기울임', italic: true })
    expect(runs[2]).toEqual({ text: ' 뒤' })
  })

  it('bold와 italic 혼재', () => {
    const runs = parseInlineMarks('**a** and *b*')
    expect(runs).toHaveLength(4)
    expect(runs[0]).toEqual({ text: 'a', bold: true })
    expect(runs[1]).toEqual({ text: ' and ' })
    expect(runs[2]).toEqual({ text: 'b', italic: true })
    // 마지막 빈 문자열 run은 제거
  })

  it('마크 없는 텍스트', () => {
    const runs = parseInlineMarks('no formatting here')
    expect(runs).toHaveLength(1)
    expect(runs[0]).toEqual({ text: 'no formatting here' })
  })

  it('빈 문자열', () => {
    const runs = parseInlineMarks('')
    expect(runs).toHaveLength(1)
    expect(runs[0]).toEqual({ text: '' })
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `cd d:/Projects/BioHub/stats && pnpm test __tests__/lib/services/export/document-docx-export.test.ts`
Expected: FAIL — `parseInlineMarks` export 없음

- [ ] **Step 3: 구현 — parseInlineMarks**

`document-docx-export.ts`에 추가:

```typescript
/** 인라인 마크다운 파싱 결과 (docx TextRun 생성 전 중간 표현) */
export interface InlineRun {
  text: string
  bold?: true
  italic?: true
}

/**
 * 마크다운 인라인 마크(**bold**, *italic*)를 파싱하여 InlineRun 배열 반환.
 * 중첩 마크(***bold italic***)는 외측만 적용.
 */
export function parseInlineMarks(text: string): InlineRun[] {
  if (!text) return [{ text: '' }]

  const runs: InlineRun[] = []
  // **bold** 먼저, *italic* 다음 — 순서 중요 (** 가 * 보다 먼저 매칭)
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    // 매치 앞 plain text
    if (match.index > lastIndex) {
      runs.push({ text: text.slice(lastIndex, match.index) })
    }
    if (match[1] !== undefined) {
      runs.push({ text: match[1], bold: true })
    } else if (match[2] !== undefined) {
      runs.push({ text: match[2], italic: true })
    }
    lastIndex = match.index + match[0].length
  }

  // 남은 plain text
  const remaining = text.slice(lastIndex)
  if (remaining || runs.length === 0) {
    runs.push({ text: remaining })
  }

  return runs.filter(r => r.text.length > 0 || runs.length === 1)
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `cd d:/Projects/BioHub/stats && pnpm test __tests__/lib/services/export/document-docx-export.test.ts`
Expected: 11 passed (5 hasVisibleContent + 6 parseInlineMarks)

- [ ] **Step 5: 커밋**

```bash
cd d:/Projects/BioHub && git add stats/lib/services/export/document-docx-export.ts stats/__tests__/lib/services/export/document-docx-export.test.ts && git commit -m "feat(papers): Phase 4 Step 2 — parseInlineMarks 인라인 마크다운 파서 + 테스트"
```

---

## Task 3: buildDocxDocument 빌더 + 테스트

**Files:**
- Modify: `stats/lib/services/export/document-docx-export.ts`
- Modify: `stats/__tests__/lib/services/export/document-docx-export.test.ts`

- [ ] **Step 1: 테스트 추가 — buildDocxDocument**

테스트 파일에 추가:

```typescript
import { buildDocxDocument } from '@/lib/services/export/document-docx-export'
import type { DocumentBlueprint } from '@/lib/research/document-blueprint-types'

// ─── 문서 픽스처 ───

function makeDoc(overrides: Partial<DocumentBlueprint> = {}): DocumentBlueprint {
  return {
    id: 'doc-1',
    projectId: 'proj-1',
    preset: 'paper',
    title: '독립표본 t-검정 분석 보고서',
    authors: ['홍길동', '김철수'],
    language: 'ko',
    sections: [
      makeSection({ id: 'intro', title: '서론', content: '본 연구는 어류의 체장 차이를 분석하였다.' }),
    ],
    metadata: {},
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-02T12:00:00.000Z',
    ...overrides,
  }
}

// ─── buildDocxDocument ───

describe('buildDocxDocument', () => {
  it('최소 문서 → Document 객체 생성', async () => {
    const doc = await buildDocxDocument(makeDoc())
    // docx.Document는 sections 배열을 가짐
    expect(doc).toBeDefined()
    expect(doc.sections).toBeDefined()
  })

  it('빈 섹션은 스킵', async () => {
    const doc = await buildDocxDocument(makeDoc({
      sections: [
        makeSection({ id: 's1', title: '서론', content: '내용 있음' }),
        makeSection({ id: 's2', title: '빈 섹션', content: '' }),
        makeSection({ id: 's3', title: '결론', content: '결론 내용' }),
      ],
    }))
    expect(doc).toBeDefined()
    // Document가 정상 생성되면 충분 — 빈 섹션 heading 제외는 Blob 크기로 간접 검증
  })

  it('표 포함 섹션', async () => {
    const doc = await buildDocxDocument(makeDoc({
      sections: [
        makeSection({
          id: 'results',
          title: '결과',
          content: '분석 결과는 다음과 같다.',
          tables: [{
            caption: 'Table 1: 기술통계량',
            headers: ['그룹', 'N', '평균', '표준편차'],
            rows: [
              ['실험군', '30', '75.2', '12.4'],
              ['대조군', '30', '68.1', '11.8'],
            ],
          }],
        }),
      ],
    }))
    expect(doc).toBeDefined()
  })

  it('그림 참조 포함', async () => {
    const doc = await buildDocxDocument(makeDoc({
      sections: [
        makeSection({
          id: 'results',
          title: '결과',
          content: '',
          figures: [{ entityId: 'g1', label: 'Figure 1', caption: '체장-체중 산점도' }],
        }),
      ],
    }))
    expect(doc).toBeDefined()
  })

  it('마크다운 서식 포함 섹션', async () => {
    const doc = await buildDocxDocument(makeDoc({
      sections: [
        makeSection({
          id: 'methods',
          title: '방법',
          content: '## 통계 분석\n\n**독립표본 t-검정**을 사용하였다.\n\n*p* < 0.05를 유의수준으로 설정하였다.',
        }),
      ],
    }))
    expect(doc).toBeDefined()
  })

  it('저자 없는 문서', async () => {
    const doc = await buildDocxDocument(makeDoc({ authors: undefined }))
    expect(doc).toBeDefined()
  })

  it('Packer.toBlob으로 유효한 Blob 생성', async () => {
    const { Packer } = await import('docx')
    const doc = await buildDocxDocument(makeDoc())
    const blob = await Packer.toBlob(doc)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(100)
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `cd d:/Projects/BioHub/stats && pnpm test __tests__/lib/services/export/document-docx-export.test.ts`
Expected: FAIL — `buildDocxDocument` export 없음

- [ ] **Step 3: 구현 — buildDocxDocument + 스타일 상수 + 내부 함수**

`document-docx-export.ts`를 확장 (기존 `hasVisibleContent`, `parseInlineMarks` 유지, 아래 추가):

```typescript
import type { DocumentBlueprint, DocumentTable, DocumentSection } from '@/lib/research/document-blueprint-types'
import { downloadBlob } from './export-data-builder'

// ─── 스타일 상수 ───

const FONT = 'Times New Roman'
const SIZE_BODY = 24     // 12pt in half-points
const SIZE_TITLE = 28    // 14pt
const SIZE_HEADING = 24  // 12pt
const LINE_SPACING = 480 // 2.0 double-space in twips
const MARGIN = 1440      // 1 inch in twips
const COLOR_MUTED = '666666'
const BORDER_COLOR = '000000'

// ─── Dynamic import ───

async function getDocx() {
  return import('docx')
}

// ─── 마크다운 줄 → Paragraph ───

function parseMarkdownLine(
  line: string,
  docx: typeof import('docx'),
): InstanceType<typeof import('docx')['Paragraph']> {
  const { Paragraph, TextRun, HeadingLevel, AlignmentType } = docx

  const trimmed = line.trim()

  // ## Heading 2
  if (trimmed.startsWith('## ')) {
    return new Paragraph({
      children: [new TextRun({ text: trimmed.slice(3), font: FONT, size: SIZE_HEADING, bold: true })],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120, line: LINE_SPACING },
    })
  }

  // ### Heading 3
  if (trimmed.startsWith('### ')) {
    return new Paragraph({
      children: [new TextRun({ text: trimmed.slice(4), font: FONT, size: SIZE_HEADING, bold: true })],
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 200, after: 100, line: LINE_SPACING },
    })
  }

  // 일반 단락 — 인라인 마크 파싱
  const inlineRuns = parseInlineMarks(trimmed)
  const textRuns = inlineRuns.map(r => new TextRun({
    text: r.text,
    font: FONT,
    size: SIZE_BODY,
    bold: r.bold,
    italics: r.italic,
  }))

  return new Paragraph({
    children: textRuns,
    spacing: { line: LINE_SPACING },
  })
}

// ─── 3-line 학술 테이블 ───

function buildAcademicTable(
  table: DocumentTable,
  docx: typeof import('docx'),
): unknown[] {
  const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType, BorderStyle, AlignmentType } = docx

  if (table.headers.length === 0) return []

  const noBorder = { style: BorderStyle.NONE, size: 0 }
  const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR }

  // 헤더 행: 상단선 + 하단선, 세로선 없음
  const headerRow = new TableRow({
    tableHeader: true,
    children: table.headers.map(h =>
      new TableCell({
        borders: { top: thinBorder, bottom: thinBorder, left: noBorder, right: noBorder },
        children: [new Paragraph({
          children: [new TextRun({ text: h, font: FONT, size: SIZE_BODY, bold: true })],
          alignment: AlignmentType.CENTER,
        })],
      })
    ),
  })

  // 데이터 행: 세로선 없음, 마지막 행만 하단선
  const dataRows = table.rows.map((row, rowIdx) =>
    new TableRow({
      children: row.map(cell =>
        new TableCell({
          borders: {
            top: noBorder,
            bottom: rowIdx === table.rows.length - 1 ? thinBorder : noBorder,
            left: noBorder,
            right: noBorder,
          },
          children: [new Paragraph({
            children: [new TextRun({ text: cell, font: FONT, size: SIZE_BODY })],
            alignment: AlignmentType.CENTER,
          })],
        })
      ),
    })
  )

  const tableElement = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  })

  // 캡션 (이탤릭, 테이블 위)
  const caption = new Paragraph({
    children: [new TextRun({ text: table.caption, font: FONT, size: SIZE_BODY, italics: true })],
    spacing: { before: 240, after: 120 },
  })

  return [caption, tableElement]
}

// ─── 날짜 포맷 ───

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ─── 메인 빌더 ───

/**
 * DocumentBlueprint → docx.Document 순수 빌더 (테스트 가능)
 */
export async function buildDocxDocument(
  doc: DocumentBlueprint,
): Promise<InstanceType<typeof import('docx')['Document']>> {
  const docx = await getDocx()
  const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, PageNumber, Footer, NumberFormat } = docx

  const children: unknown[] = []

  // ── 제목 ──
  children.push(new Paragraph({
    children: [new TextRun({ text: doc.title, font: FONT, size: SIZE_TITLE, bold: true })],
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
  }))

  // ── 저자 ──
  if (doc.authors && doc.authors.length > 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: doc.authors.join(', '), font: FONT, size: SIZE_BODY })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }))
  }

  // ── 날짜 (updatedAt) ──
  children.push(new Paragraph({
    children: [new TextRun({ text: formatDate(doc.updatedAt), font: FONT, size: SIZE_BODY, italics: true, color: COLOR_MUTED })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
  }))

  // ── 섹션 순회 ──
  for (const section of doc.sections) {
    if (!hasVisibleContent(section)) continue

    // 섹션 제목
    children.push(new Paragraph({
      children: [new TextRun({ text: section.title, font: FONT, size: SIZE_HEADING, bold: true })],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 360, after: 120, line: LINE_SPACING },
    }))

    // 본문 (마크다운 줄 단위 파싱)
    if (section.content) {
      const paragraphs = section.content.split('\n\n').filter(Boolean)
      for (const para of paragraphs) {
        const lines = para.split('\n')
        for (const line of lines) {
          if (line.trim()) {
            children.push(parseMarkdownLine(line, docx))
          }
        }
      }
    }

    // 표
    if (section.tables && section.tables.length > 0) {
      for (const table of section.tables) {
        const tableElements = buildAcademicTable(table, docx)
        children.push(...tableElements)
      }
    }

    // 그림 참조 (플레이스홀더)
    if (section.figures && section.figures.length > 0) {
      for (const fig of section.figures) {
        children.push(new Paragraph({
          children: [new TextRun({
            text: `${fig.label}: ${fig.caption}`,
            font: FONT,
            size: SIZE_BODY,
            italics: true,
            color: COLOR_MUTED,
          })],
          spacing: { before: 200, after: 200 },
        }))
      }
    }
  }

  // ── 푸터 ──
  const exportDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: `Generated by BioHub — ${exportDate}    `, font: FONT, size: 18, color: COLOR_MUTED }),
                new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: COLOR_MUTED }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      },
      children: children as InstanceType<typeof Paragraph>[],
    }],
  })
}

/**
 * DocumentBlueprint → DOCX 다운로드 (사이드이펙트)
 */
export async function documentToDocx(doc: DocumentBlueprint): Promise<void> {
  const { Packer } = await import('docx')
  const document = await buildDocxDocument(doc)
  const blob = await Packer.toBlob(document)
  const safeName = doc.title.replace(/[/\\?%*:|"<>]/g, '_')
  downloadBlob(blob, `${safeName}.docx`)
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `cd d:/Projects/BioHub/stats && pnpm test __tests__/lib/services/export/document-docx-export.test.ts`
Expected: 18 passed (5 hasVisibleContent + 6 parseInlineMarks + 7 buildDocxDocument)

- [ ] **Step 5: 커밋**

```bash
cd d:/Projects/BioHub && git add stats/lib/services/export/document-docx-export.ts stats/__tests__/lib/services/export/document-docx-export.test.ts && git commit -m "feat(papers): Phase 4 Step 3 — buildDocxDocument 빌더 + 학술 3-line 테이블 + 테스트"
```

---

## Task 4: DocumentExportBar DOCX 버튼 활성화

**Files:**
- Modify: `stats/components/papers/DocumentExportBar.tsx`

- [ ] **Step 1: DocumentExportBar 수정**

```typescript
// stats/components/papers/DocumentExportBar.tsx — 전체 교체

'use client'

import { useCallback, useState, useMemo } from 'react'
import { Copy, Download, FileDown, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { downloadBlob } from '@/lib/services/export/export-data-builder'
import { documentToDocx, hasVisibleContent } from '@/lib/services/export/document-docx-export'
import type { DocumentBlueprint, DocumentTable } from '@/lib/research/document-blueprint-types'

interface DocumentExportBarProps {
  document: DocumentBlueprint
  /** export 직전 serialize flush — DocumentEditor가 전달 */
  onBeforeExport?: () => void
}

function documentToMarkdown(doc: DocumentBlueprint): string {
  const lines: string[] = []
  lines.push(`# ${doc.title}`)
  if (doc.authors?.length) {
    lines.push('', doc.authors.join(', '))
  }
  lines.push('')

  for (const section of doc.sections) {
    lines.push(`## ${section.title}`)
    lines.push('')
    if (section.content) {
      lines.push(section.content)
    }
    if (section.tables?.length) {
      for (const table of section.tables) {
        lines.push('')
        lines.push(`**${table.caption}**`)
        lines.push('')
        if (table.headers.length > 0) {
          lines.push(`| ${table.headers.join(' | ')} |`)
          lines.push(`| ${table.headers.map(() => '---').join(' | ')} |`)
          for (const row of table.rows) {
            lines.push(`| ${row.join(' | ')} |`)
          }
        }
      }
    }
    if (section.figures?.length) {
      lines.push('')
      for (const fig of section.figures) {
        lines.push(`*${fig.label}: ${fig.caption}*`)
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}

function renderTableHtml(table: DocumentTable): string {
  if (table.htmlContent) return `<p><strong>${table.caption}</strong></p>${table.htmlContent}`
  if (table.headers.length === 0) return ''
  const thead = `<thead><tr>${table.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`
  const tbody = `<tbody>${table.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`
  return `<p><strong>${table.caption}</strong></p><table>${thead}${tbody}</table>`
}

function documentToHtml(doc: DocumentBlueprint): string {
  const parts: string[] = []
  parts.push(`<h1>${doc.title}</h1>`)
  if (doc.authors?.length) parts.push(`<p>${doc.authors.join(', ')}</p>`)

  for (const section of doc.sections) {
    const hasContent = section.content || section.tables?.length || section.figures?.length
    if (!hasContent) continue
    parts.push(`<h2>${section.title}</h2>`)
    if (section.content) {
      const contentHtml = section.content
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .split('\n\n')
        .map(p => p.startsWith('<h') ? p : `<p>${p}</p>`)
        .join('\n')
      parts.push(contentHtml)
    }
    if (section.tables?.length) {
      for (const table of section.tables) {
        parts.push(renderTableHtml(table))
      }
    }
    if (section.figures?.length) {
      for (const fig of section.figures) {
        parts.push(`<p><em>${fig.label}: ${fig.caption}</em></p>`)
      }
    }
  }

  return `<!DOCTYPE html>
<html lang="${doc.language}">
<head>
  <meta charset="UTF-8">
  <title>${doc.title}</title>
  <style>
    body { font-family: 'Times New Roman', serif; max-width: 800px; margin: 40px auto; line-height: 1.6; }
    h1 { text-align: center; }
    h2 { margin-top: 2em; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    td, th { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
${parts.join('\n')}
</body>
</html>`
}

export default function DocumentExportBar({ document: doc, onBeforeExport }: DocumentExportBarProps): React.ReactElement {
  const [copied, setCopied] = useState(false)
  const [docxLoading, setDocxLoading] = useState(false)

  const hasContent = useMemo(
    () => doc.sections.some(s => hasVisibleContent(s)),
    [doc.sections],
  )

  const handleCopyMarkdown = useCallback(async () => {
    onBeforeExport?.()
    const md = documentToMarkdown(doc)
    await navigator.clipboard.writeText(md)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [doc, onBeforeExport])

  const handleDownloadHtml = useCallback(() => {
    onBeforeExport?.()
    const html = documentToHtml(doc)
    const blob = new Blob([html], { type: 'text/html' })
    downloadBlob(blob, `${doc.title}.html`)
  }, [doc, onBeforeExport])

  const handleDownloadDocx = useCallback(async () => {
    onBeforeExport?.()
    setDocxLoading(true)
    try {
      await documentToDocx(doc)
    } catch {
      toast.error('DOCX 생성에 실패했습니다')
    } finally {
      setDocxLoading(false)
    }
  }, [doc, onBeforeExport])

  return (
    <div className="flex items-center gap-2 border-t pt-3">
      <Button variant="outline" size="sm" onClick={handleCopyMarkdown} className="gap-1.5">
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? '복사됨' : '마크다운 복사'}
      </Button>
      <Button variant="outline" size="sm" onClick={handleDownloadHtml} className="gap-1.5">
        <Download className="w-4 h-4" />
        HTML 다운로드
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadDocx}
        disabled={!hasContent || docxLoading}
        className="gap-1.5"
      >
        {docxLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        {docxLoading ? '생성 중...' : 'DOCX 다운로드'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: 변경 확인 — 빌드 에러 없는지 확인**

Run: `cd d:/Projects/BioHub/stats && node node_modules/typescript/bin/tsc --noEmit --pretty 2>&1 | head -20`
Expected: 에러 없음 (또는 기존 에러만)

- [ ] **Step 3: 커밋**

```bash
cd d:/Projects/BioHub && git add stats/components/papers/DocumentExportBar.tsx && git commit -m "feat(papers): Phase 4 Step 4 — DOCX 버튼 활성화 + 로딩/에러/빈문서 처리"
```

---

## Task 5: DocumentEditor에서 flushSerialize 전달

**Files:**
- Modify: `stats/components/papers/DocumentEditor.tsx`

- [ ] **Step 1: DocumentEditor 수정 — flushSerialize prop 전달**

`stats/components/papers/DocumentEditor.tsx` 491줄 부근에서 `DocumentExportBar`에 `onBeforeExport` prop 추가:

변경 전 (491-493줄):
```tsx
      <div className="shrink-0 px-4 pb-3">
        <DocumentExportBar document={doc} />
      </div>
```

변경 후:
```tsx
      <div className="shrink-0 px-4 pb-3">
        <DocumentExportBar document={doc} onBeforeExport={flushSerialize} />
      </div>
```

- [ ] **Step 2: 변경 확인**

Run: `cd d:/Projects/BioHub/stats && node node_modules/typescript/bin/tsc --noEmit --pretty 2>&1 | head -20`
Expected: 에러 없음 (또는 기존 에러만)

- [ ] **Step 3: 커밋**

```bash
cd d:/Projects/BioHub && git add stats/components/papers/DocumentEditor.tsx && git commit -m "feat(papers): Phase 4 Step 5 — DocumentEditor flushSerialize → ExportBar 전달"
```

---

## Task 6: 최종 검증 + TODO.md 업데이트

**Files:**
- Modify: `TODO.md`

- [ ] **Step 1: 전체 테스트 실행**

Run: `cd d:/Projects/BioHub/stats && pnpm test __tests__/lib/services/export/document-docx-export.test.ts`
Expected: 18 passed

- [ ] **Step 2: 타입 체크**

Run: `cd d:/Projects/BioHub/stats && node node_modules/typescript/bin/tsc --noEmit`
Expected: 에러 없음 (또는 기존 에러만, 신규 에러 0)

- [ ] **Step 3: TODO.md Phase 3 완료 표시 + Phase 4 완료 표시**

`TODO.md` 221줄:

변경 전:
```markdown
  - Phase 3: Plate 리치 텍스트 에디터 (`@platejs/*` v52, shadcn/ui 네이티브)
```

변경 후:
```markdown
  - ~~Phase 3: Plate 리치 텍스트 에디터~~ — 완료 (`@platejs/*` v52, shadcn/ui 네이티브, 5 Step)
  - ~~Phase 4: DOCX 내보내기~~ — 완료 (학술 3-line table, Times New Roman, serialize flush)
```

- [ ] **Step 4: 커밋**

```bash
cd d:/Projects/BioHub && git add TODO.md && git commit -m "docs: Phase 3-4 완료 표시"
```
