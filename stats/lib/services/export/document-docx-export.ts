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
