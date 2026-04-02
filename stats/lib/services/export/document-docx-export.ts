/**
 * 문서(DocumentBlueprint) → DOCX 내보내기
 *
 * 학술 논문 형식: Times New Roman 12pt, 더블스페이스, 3-line table.
 * Spec: stats/docs/papers/PLAN-DOCX-EXPORT.md
 */

import type {
  DocumentBlueprint,
  DocumentTable,
  DocumentSection,
} from '@/lib/research/document-blueprint-types'
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

// ─── 헤딩 패턴 (parseMarkdownLine에서 반복 사용) ───

const H2_RE = /^##\s+(.+)$/
const H3_RE = /^###\s+(.+)$/

// ─── Dynamic import ───

async function getDocx(): Promise<typeof import('docx')> {
  return import('docx')
}

/** 섹션에 렌더링할 콘텐츠가 있는지 판정 (DOCX/HTML 공용) */
export function hasVisibleContent(section: DocumentSection): boolean {
  if (section.content) return true
  if (section.tables && section.tables.length > 0) return true
  if (section.figures && section.figures.length > 0) return true
  return false
}

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
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
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

  const remaining = text.slice(lastIndex)
  if (remaining || runs.length === 0) {
    runs.push({ text: remaining })
  }

  return runs.filter(r => r.text.length > 0 || runs.length === 1)
}

// ─── docx 빌더 헬퍼 ───

type DocxModule = typeof import('docx')
type ParagraphInstance = InstanceType<typeof import('docx')['Paragraph']>
type TableInstance = InstanceType<typeof import('docx')['Table']>

/** InlineRun 배열 → docx TextRun 배열 */
function toTextRuns(
  runs: InlineRun[],
  docx: DocxModule,
  overrides?: { size?: number },
): InstanceType<typeof import('docx')['TextRun']>[] {
  const { TextRun } = docx
  const size = overrides?.size ?? SIZE_BODY
  return runs.map(r =>
    new TextRun({
      text: r.text,
      font: FONT,
      size,
      bold: r.bold ?? false,
      italics: r.italic ?? false,
    }),
  )
}

/**
 * 마크다운 한 줄 → docx Paragraph.
 * - `## H2` → HeadingLevel.HEADING_2
 * - `### H3` → HeadingLevel.HEADING_3
 * - 일반 텍스트 → 본문 Paragraph (인라인 마크 파싱)
 */
function parseMarkdownLine(line: string, docx: DocxModule): ParagraphInstance {
  const { Paragraph, HeadingLevel, TextRun } = docx

  const h2Match = line.match(H2_RE)
  if (h2Match) {
    return new Paragraph({
      children: [new TextRun({ text: h2Match[1], font: FONT, size: SIZE_HEADING, bold: true })],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120, line: LINE_SPACING },
    })
  }

  const h3Match = line.match(H3_RE)
  if (h3Match) {
    return new Paragraph({
      children: [new TextRun({ text: h3Match[1], font: FONT, size: SIZE_HEADING, bold: true })],
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 200, after: 100, line: LINE_SPACING },
    })
  }

  const inlineRuns = parseInlineMarks(line)
  return new Paragraph({
    children: toTextRuns(inlineRuns, docx),
    spacing: { line: LINE_SPACING },
  })
}

/**
 * 학술 3-line 테이블 빌더.
 * - 상단 굵은 선 (헤더 위)
 * - 헤더 하단 굵은 선
 * - 하단 굵은 선 (마지막 데이터 행 아래)
 * - 세로선 없음
 * - 캡션: 이탤릭 별도 Paragraph
 */
function buildAcademicTable(
  table: DocumentTable,
  docx: DocxModule,
): (ParagraphInstance | TableInstance)[] {
  const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType, BorderStyle, AlignmentType } = docx

  const elements: (ParagraphInstance | TableInstance)[] = []

  // 캡션
  if (table.caption) {
    elements.push(new Paragraph({
      children: [new TextRun({ text: table.caption, font: FONT, size: SIZE_BODY, italics: true })],
      spacing: { before: 240, after: 120 },
    }))
  }

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  const solidBorder = { style: BorderStyle.SINGLE, size: 2, color: BORDER_COLOR }

  // 헤더 행
  const headerRow = new TableRow({
    tableHeader: true,
    children: table.headers.map(h =>
      new TableCell({
        borders: {
          top: solidBorder,
          bottom: solidBorder,
          left: noBorder,
          right: noBorder,
        },
        children: [new Paragraph({
          children: [new TextRun({ text: h, font: FONT, size: SIZE_BODY, bold: true })],
          alignment: AlignmentType.CENTER,
          spacing: { line: LINE_SPACING },
        })],
      }),
    ),
  })

  // 데이터 행
  const dataRows = table.rows.map((row, rowIdx) => {
    const isLastRow = rowIdx === table.rows.length - 1
    return new TableRow({
      children: row.map(cell =>
        new TableCell({
          borders: {
            top: noBorder,
            bottom: isLastRow ? solidBorder : noBorder,
            left: noBorder,
            right: noBorder,
          },
          children: [new Paragraph({
            children: [new TextRun({ text: cell, font: FONT, size: SIZE_BODY })],
            alignment: AlignmentType.CENTER,
            spacing: { line: LINE_SPACING },
          })],
        }),
      ),
    })
  })

  elements.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  }))

  return elements
}

/** ISO 날짜 → 한국어 포맷 */
function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ─── 메인 빌더 ───

/**
 * DocumentBlueprint → docx Document 객체 생성.
 *
 * 학술 논문 형식: Times New Roman 12pt, 더블스페이스, 1인치 마진.
 */
export async function buildDocxDocument(
  doc: DocumentBlueprint,
): Promise<InstanceType<typeof import('docx')['Document']>> {
  const docx = await getDocx()
  const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, PageNumber, Footer } = docx

  const children: (ParagraphInstance | TableInstance)[] = []

  // 1. 제목
  children.push(new Paragraph({
    children: [new TextRun({ text: doc.title, font: FONT, size: SIZE_TITLE, bold: true })],
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { after: 120, line: LINE_SPACING },
  }))

  // 2. 저자
  if (doc.authors && doc.authors.length > 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: doc.authors.join(', '), font: FONT, size: SIZE_BODY })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80, line: LINE_SPACING },
    }))
  }

  // 3. 날짜
  if (doc.updatedAt) {
    children.push(new Paragraph({
      children: [new TextRun({
        text: formatDate(doc.updatedAt),
        font: FONT,
        size: SIZE_BODY,
        italics: true,
        color: COLOR_MUTED,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240, line: LINE_SPACING },
    }))
  }

  // 4. 섹션
  for (const section of doc.sections) {
    if (!hasVisibleContent(section)) continue

    // 섹션 제목
    children.push(new Paragraph({
      children: [new TextRun({ text: section.title, font: FONT, size: SIZE_HEADING, bold: true })],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 360, after: 120, line: LINE_SPACING },
    }))

    // 본문 콘텐츠
    if (section.content) {
      const paragraphs = section.content.split('\n\n')
      for (const para of paragraphs) {
        const lines = para.split('\n')
        for (const line of lines) {
          if (line.trim()) {
            children.push(parseMarkdownLine(line.trim(), docx))
          }
        }
      }
    }

    // 표
    if (section.tables) {
      for (const table of section.tables) {
        const tableElements = buildAcademicTable(table, docx)
        for (const el of tableElements) {
          children.push(el)
        }
      }
    }

    // 그림 참조 (이미지 삽입 없이 캡션 플레이스홀더)
    if (section.figures) {
      for (const fig of section.figures) {
        children.push(new Paragraph({
          children: [new TextRun({
            text: `${fig.label}: ${fig.caption}`,
            font: FONT,
            size: SIZE_BODY,
            italics: true,
          })],
          spacing: { before: 240, after: 120, line: LINE_SPACING },
        }))
      }
    }
  }

  // 5. Footer: "Generated by BioHub" + 날짜, 페이지 번호
  const exportDate = formatDate(new Date().toISOString())

  const footer = new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: `Generated by BioHub — ${exportDate}  `, font: FONT, size: 18, color: COLOR_MUTED }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: COLOR_MUTED }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    ],
  })

  // 6. 문서 생성
  return new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: MARGIN,
            right: MARGIN,
            bottom: MARGIN,
            left: MARGIN,
          },
        },
      },
      footers: { default: footer },
      children,
    }],
  })
}

// ─── 내보내기 래퍼 (side-effect) ───

/**
 * DocumentBlueprint → DOCX 파일 다운로드.
 * buildDocxDocument로 문서 생성 후 Packer.toBlob → downloadBlob.
 */
export async function documentToDocx(doc: DocumentBlueprint): Promise<void> {
  const docx = await getDocx()
  const document = await buildDocxDocument(doc)
  const { Packer } = docx
  const blob = await Packer.toBlob(document)
  const safeName = doc.title.replace(/[/\\?%*:|"<>]/g, '_')
  downloadBlob(blob, `${safeName}.docx`)
}
