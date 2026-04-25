/**
 * 문서(DocumentBlueprint) → HWPX 내보내기
 *
 * 전략: 한컴오피스에서 생성한 빈 문서(blank.hwpx)를 템플릿으로 사용.
 * section0.xml(본문)만 동적 교체 + BinData에 이미지 추가.
 * header.xml은 템플릿을 그대로 사용하므로 폰트/스타일이 100% 호환됨.
 *
 * Spec: stats/docs/papers/PLAN-DOCX-EXPORT.md §HWPX
 */

import JSZip from 'jszip'
import type {
  DocumentBlueprint,
  DocumentTable,
} from '@/lib/research/document-blueprint-types'
import { resolveDocumentInlineCitations } from '@/lib/research/citation-csl'
import { buildRenderableDocument } from '@/lib/research/document-support-renderer'
import type { ChartSnapshot } from '@/lib/graph-studio/chart-snapshot-storage'
import { loadSnapshots } from '@/lib/graph-studio/chart-snapshot-storage'
import {
  getFigureProvenanceLines,
  getTableProvenanceLines,
} from './document-provenance'
import { hasVisibleContent } from './document-docx-export'
import { downloadBlob } from './export-data-builder'

// ─── XML 유틸 ───

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * CSS px → HWPML unit (1/7200 inch).
 * 가정: 96 DPI. px * (7200 / 96) = px * 75.
 */
function pxToHwpml(px: number): number {
  return Math.round(px * 75)
}

// ─── 인라인 마크 파서 (위첨자 포함) ───

interface HwpxInlineRun {
  text: string
  bold?: true
  italic?: true
  superscript?: true
}

/**
 * 마크다운 스타일 인라인 마크 파싱.
 * **볼드**, *이탤릭*, ^위첨자^ → HwpxInlineRun[]
 */
function parseHwpxInlineMarks(text: string): HwpxInlineRun[] {
  if (!text) return [{ text: '' }]

  const runs: HwpxInlineRun[] = []
  // **bold** 먼저, *italic* 다음, ^superscript^ 마지막
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|\^(.+?)\^/g
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
    } else if (match[3] !== undefined) {
      runs.push({ text: match[3], superscript: true })
    }
    lastIndex = match.index + match[0].length
  }

  const remaining = text.slice(lastIndex)
  if (remaining || runs.length === 0) {
    runs.push({ text: remaining })
  }

  return runs.filter(r => r.text.length > 0 || runs.length === 1)
}

// ─── 상수 ───

/** 페이지 본문 폭 (A4 기준, 좌우 여백 제외) — HWPML unit */
const CONTENT_WIDTH = 42520

/** 기본 charPr ID */
const DEFAULT_CHAR_PR_ID = '0'

/** 표 테두리 fill ID (템플릿 의존) */
const TABLE_BORDER_FILL_ID = '3'

/** 표 셀 좌+우 마진 — HWPML unit */
const CELL_MARGIN_LR = 510 + 510

// ─── 스타일 ID 묶음 ───

interface StyleIds {
  bold: string
  italic: string
  superscript: string
  center: string
}

// ─── 내부 이미지 엔트리 ───

interface ImageEntry {
  id: string
  filename: string
  data: Uint8Array
}

// ─── HwpxDocumentBuilder ───

/**
 * HWPX 문서 빌더.
 * JSZip 인스턴스 + 섹션 설정 XML + 스타일 ID를 받아 단락/표/이미지를 축적 후 생성.
 */
class HwpxDocumentBuilder {
  private readonly zip: JSZip
  private readonly secOpen: string
  private readonly setupP: string
  private readonly styleIds: StyleIds
  private readonly paragraphs: string[] = []
  private readonly images: ImageEntry[] = []
  private nextId: number
  private nextImgId: number = 1

  constructor(
    zip: JSZip,
    secOpen: string,
    setupP: string,
    styleIds: StyleIds,
    initialNextId: number,
  ) {
    this.zip = zip
    this.secOpen = secOpen
    this.setupP = setupP
    this.styleIds = styleIds
    this.nextId = initialNextId
  }

  /**
   * 텍스트 단락 추가. 인라인 마크 지원: **볼드**, *이탤릭*, ^위첨자^
   */
  addParagraph(text: string, opts?: { align?: 'left' | 'center' }): this {
    const paraPrId = opts?.align === 'center' ? this.styleIds.center : '0'
    const runs = parseHwpxInlineMarks(text)
    const runsXml = runs.map(r => {
      let cpId = DEFAULT_CHAR_PR_ID
      if (r.bold) cpId = this.styleIds.bold
      else if (r.italic) cpId = this.styleIds.italic
      else if (r.superscript) cpId = this.styleIds.superscript
      return `<hp:run charPrIDRef="${cpId}"><hp:t>${escapeXml(r.text)}</hp:t></hp:run>`
    }).join('')

    const id = this.nextId++
    this.paragraphs.push(
      `<hp:p id="${id}" paraPrIDRef="${paraPrId}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">${runsXml}</hp:p>`,
    )
    return this
  }

  /** 빈 줄 추가 */
  addEmptyLine(): this {
    this.paragraphs.push(this.makePlainP(''))
    return this
  }

  /**
   * 표 추가. 헤더 행은 가운데 정렬 + 볼드.
   */
  addTable(table: DocumentTable): this {
    if (table.caption) {
      this.addParagraph(table.caption)
    }

    const colCount = table.headers.length
    const rowCount = table.rows.length + 1
    const cellWidth = Math.round(CONTENT_WIDTH / colCount)
    const horzsize = cellWidth - CELL_MARGIN_LR

    const makeCell = (
      text: string,
      colAddr: number,
      rowAddr: number,
      isHeader: boolean,
    ): string => {
      const pId = this.nextId++
      const baseCpId = isHeader ? this.styleIds.bold : DEFAULT_CHAR_PR_ID
      const ppId = isHeader ? this.styleIds.center : '0'

      const runs = parseHwpxInlineMarks(text)
      const runsXml = runs.map(r => {
        let cpId = baseCpId
        if (r.superscript) cpId = this.styleIds.superscript
        else if (r.bold && !isHeader) cpId = this.styleIds.bold
        else if (r.italic) cpId = this.styleIds.italic
        return `<hp:run charPrIDRef="${cpId}"><hp:t>${escapeXml(r.text)}</hp:t></hp:run>`
      }).join('')

      return (
        `<hp:tc name="" header="0" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="${TABLE_BORDER_FILL_ID}">` +
        `<hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">` +
        `<hp:p id="${pId}" paraPrIDRef="${ppId}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
        runsXml +
        `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000" baseline="850" spacing="600" horzpos="0" horzsize="${horzsize}" flags="393216"/></hp:linesegarray>` +
        `</hp:p>` +
        `</hp:subList>` +
        `<hp:cellAddr colAddr="${colAddr}" rowAddr="${rowAddr}"/>` +
        `<hp:cellSpan colSpan="1" rowSpan="1"/>` +
        `<hp:cellSz width="${cellWidth}" height="282"/>` +
        `<hp:cellMargin left="510" right="510" top="141" bottom="141"/>` +
        `</hp:tc>`
      )
    }

    const headerRow = `<hp:tr>${table.headers.map((h, ci) => makeCell(h, ci, 0, true)).join('')}</hp:tr>`
    const dataRows = table.rows.map((row, ri) =>
      `<hp:tr>${row.map((cell, ci) => makeCell(cell, ci, ri + 1, false)).join('')}</hp:tr>`,
    ).join('')

    const tblId = this.nextId++
    this.nextId++ // instId 소비
    const wrapPId = this.nextId++

    const tblXml =
      `<hp:p id="${wrapPId}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="${DEFAULT_CHAR_PR_ID}">` +
      `<hp:tbl id="${tblId}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" ` +
      `lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="1" ` +
      `rowCnt="${rowCount}" colCnt="${colCount}" cellSpacing="0" borderFillIDRef="${TABLE_BORDER_FILL_ID}" noAdjust="0">` +
      `<hp:sz width="${CONTENT_WIDTH}" widthRelTo="ABSOLUTE" height="0" heightRelTo="ABSOLUTE" protect="0"/>` +
      `<hp:pos treatAsChar="0" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" ` +
      `vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>` +
      `<hp:outMargin left="283" right="283" top="283" bottom="283"/>` +
      `<hp:inMargin left="510" right="510" top="141" bottom="141"/>` +
      headerRow + dataRows +
      `</hp:tbl>` +
      `</hp:run></hp:p>`

    this.paragraphs.push(tblXml)

    for (const line of getTableProvenanceLines(table)) {
      this.addParagraph(line)
    }
    return this
  }

  /**
   * PNG 이미지 삽입.
   * @param pngData - PNG 바이너리 (Uint8Array)
   * @param opts - 크기(CSS px 기준, 96dpi 가정)와 캡션
   */
  addImage(pngData: Uint8Array, opts: { width: number; height: number; caption?: string }): this {
    const imgId = `chart${this.nextImgId++}`
    const filename = `${imgId}.png`
    this.images.push({ id: imgId, filename, data: pngData })

    const w = pxToHwpml(opts.width)
    const h = pxToHwpml(opts.height)
    const picId = this.nextId++
    const instId = this.nextId++
    const wrapPId = this.nextId++

    const picXml =
      `<hp:pic id="${picId}" zOrder="0" numberingType="PICTURE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" ` +
      `lock="0" dropcapstyle="None" groupLevel="0" instid="${instId}" reverse="0">` +
      `<hp:offset x="0" y="0"/>` +
      `<hp:orgSz width="${w}" height="${h}"/>` +
      `<hp:curSz width="${w}" height="${h}"/>` +
      `<hp:flip horizontal="0" vertical="0"/>` +
      `<hp:rotationInfo angle="0"/>` +
      `<hp:renderingInfo>` +
      `<hc:transMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/>` +
      `<hc:scaMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/>` +
      `<hc:rotMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/>` +
      `</hp:renderingInfo>` +
      `<hp:imgRect><hc:pt0 x="0" y="0"/><hc:pt1 x="${w}" y="0"/><hc:pt2 x="${w}" y="${h}"/><hc:pt3 x="0" y="${h}"/></hp:imgRect>` +
      `<hp:imgClip left="0" right="${w}" top="0" bottom="${h}"/>` +
      `<hp:inMargin left="0" right="0" top="0" bottom="0"/>` +
      `<hc:img binaryItemIDRef="${imgId}" bright="0" contrast="0" effect="REAL_PIC" alpha="0"/>` +
      `<hp:effects/>` +
      `<hp:sz width="${w}" widthRelTo="ABSOLUTE" height="${h}" heightRelTo="ABSOLUTE" protect="0"/>` +
      `<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" ` +
      `vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>` +
      `<hp:outMargin left="0" right="0" top="0" bottom="0"/>` +
      `</hp:pic>`

    this.paragraphs.push(
      `<hp:p id="${wrapPId}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="${DEFAULT_CHAR_PR_ID}">${picXml}</hp:run></hp:p>`,
    )

    if (opts.caption) {
      this.addParagraph(opts.caption)
    }

    return this
  }

  /**
   * section0.xml + BinData 기록 후 HWPX Uint8Array 생성.
   */
  async build(): Promise<Uint8Array> {
    const section0 =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>' +
      this.secOpen +
      this.setupP +
      this.paragraphs.join('') +
      '</hs:sec>'

    this.zip.file('Contents/section0.xml', section0)

    for (const img of this.images) {
      this.zip.file(`BinData/${img.filename}`, img.data)
    }

    if (this.images.length > 0) {
      const hpfFile = this.zip.file('Contents/content.hpf')
      if (hpfFile) {
        let hpf = await hpfFile.async('string')
        const imgItems = this.images.map(img =>
          `<opf:item id="${img.id}" href="BinData/${img.filename}" media-type="image/png" isEmbeded="1"/>`,
        ).join('')
        hpf = hpf.replace('</opf:manifest>', imgItems + '</opf:manifest>')
        this.zip.file('Contents/content.hpf', hpf)
      }
    }

    const result = await this.zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
    return result
  }

  /** @private */
  private makePlainP(textContent: string): string {
    const id = this.nextId++
    return (
      `<hp:p id="${id}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="${DEFAULT_CHAR_PR_ID}"><hp:t>${escapeXml(textContent)}</hp:t></hp:run></hp:p>`
    )
  }
}

// ─── 템플릿 로딩 + 스타일 주입 ───

/**
 * 템플릿 ZIP에서 섹션 설정을 추출하고 header.xml에 볼드/이탤릭/위첨자 charPr +
 * 가운데 정렬 paraPr을 주입하여 HwpxDocumentBuilder를 반환.
 */
async function createBuilderFromZip(zip: JSZip): Promise<HwpxDocumentBuilder> {
  // section0.xml에서 페이지 설정 추출
  const section0File = zip.file('Contents/section0.xml')
  if (!section0File) throw new Error('[hwpx] Contents/section0.xml not found in template')
  const section = await section0File.async('string')

  const secOpenMatch = section.match(/<hs:sec[^>]*>/)
  if (!secOpenMatch) throw new Error('[hwpx] <hs:sec> not found in section0.xml')
  const secOpen = secOpenMatch[0]

  const firstPMatch = section.match(/<hp:p[\s\S]*?<\/hp:p>/)
  if (!firstPMatch) throw new Error('[hwpx] first <hp:p> not found in section0.xml')
  const setupP = firstPMatch[0]
    .replace(/<hp:t>[^<]*<\/hp:t>/g, '<hp:t></hp:t>')
    .replace(/<hp:linesegarray>[\s\S]*?<\/hp:linesegarray>/g, '')

  // section0에서 최대 id 추출 → nextId 초기화
  const idMatches = section.match(/\bid="(\d+)"/g) ?? []
  const maxId = idMatches.reduce((max, m) => {
    const parsed = m.match(/\d+/)
    const n = parsed ? parseInt(parsed[0], 10) : 0
    return n > max ? n : max
  }, 0)

  // 기존 BinData, Preview 제거
  for (const path of Object.keys(zip.files)) {
    if (path.startsWith('BinData/') || path.startsWith('Preview/')) {
      zip.remove(path)
    }
  }

  // 기존 BinData manifest 항목 제거
  const hpfFile = zip.file('Contents/content.hpf')
  if (hpfFile) {
    let hpf = await hpfFile.async('string')
    hpf = hpf.replace(/<opf:item[^>]*BinData[^>]*\/>/g, '')
    zip.file('Contents/content.hpf', hpf)
  }

  // header.xml에 스타일 주입
  const styleIds = await injectStyles(zip)

  return new HwpxDocumentBuilder(zip, secOpen, setupP, styleIds, maxId + 1)
}

/**
 * header.xml에 볼드/이탤릭/위첨자 charPr + 가운데 정렬 paraPr을 동적 주입.
 * charPr/paraPr ID는 기존 최대 ID+1부터 순차 할당 (한컴 순차 ID 요구사항).
 */
async function injectStyles(zip: JSZip): Promise<StyleIds> {
  const headerFile = zip.file('Contents/header.xml')
  if (!headerFile) throw new Error('[hwpx] Contents/header.xml not found in template')
  let header = await headerFile.async('string')

  // 본문 charPr id=0의 height 추출
  const heightMatch = header.match(/<hh:charPr id="0" height="(\d+)"/)
  const bodyHeight = heightMatch ? heightMatch[1] : '1000'

  // charPr 기본 골격 생성 함수
  const charPrBase = (id: string, extraElements: string): string =>
    `<hh:charPr id="${id}" height="${bodyHeight}" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2">` +
    `<hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>` +
    `<hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>` +
    `<hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>` +
    `<hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>` +
    `<hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>` +
    extraElements +
    `</hh:charPr>`

  // 기존 max charPr ID 탐색
  const cpIdMatches = header.match(/<hh:charPr id="(\d+)"/g) ?? []
  const maxCpId = cpIdMatches.reduce((max, m) => {
    const parsed = m.match(/\d+/)
    const n = parsed ? parseInt(parsed[0], 10) : 0
    return n > max ? n : max
  }, -1)

  // 기존 max paraPr ID 탐색
  const ppIdMatches = header.match(/<hh:paraPr id="(\d+)"/g) ?? []
  const maxPpId = ppIdMatches.reduce((max, m) => {
    const parsed = m.match(/\d+/)
    const n = parsed ? parseInt(parsed[0], 10) : 0
    return n > max ? n : max
  }, -1)

  const boldId = String(maxCpId + 1)
  const italicId = String(maxCpId + 2)
  const superId = String(maxCpId + 3)
  const centerId = String(maxPpId + 1)

  const boldCp = charPrBase(boldId, '<hh:bold/>')
  const italicCp = charPrBase(italicId, '<hh:italic/>')
  const superCp = charPrBase(superId, '<hh:supscript/>')

  // charProperties itemCnt 업데이트 + 주입
  const cpCountMatch = header.match(/charProperties itemCnt="(\d+)"/)
  if (cpCountMatch) {
    const newCount = parseInt(cpCountMatch[1], 10) + 3
    header = header.replace(/charProperties itemCnt="\d+"/, `charProperties itemCnt="${newCount}"`)
  }
  header = header.replace(
    /<\/hh:charProperties>/,
    boldCp + italicCp + superCp + '</hh:charProperties>',
  )

  // 가운데 정렬 paraPr 주입
  const centerPp =
    `<hh:paraPr id="${centerId}" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">` +
    `<hh:align horizontal="CENTER" vertical="BASELINE"/>` +
    `<hh:heading type="NONE" idRef="0" level="0"/>` +
    `<hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="KEEP_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>` +
    `<hh:autoSpacing eAsianEng="0" eAsianNum="0"/>` +
    `<hh:margin><hc:intent value="0" unit="HWPUNIT"/><hc:left value="0" unit="HWPUNIT"/><hc:right value="0" unit="HWPUNIT"/><hc:prev value="0" unit="HWPUNIT"/><hc:next value="0" unit="HWPUNIT"/></hh:margin>` +
    `<hh:lineSpacing type="PERCENT" value="160"/>` +
    `</hh:paraPr>`

  const ppCountMatch = header.match(/paraProperties itemCnt="(\d+)"/)
  if (ppCountMatch) {
    const newCount = parseInt(ppCountMatch[1], 10) + 1
    header = header.replace(/paraProperties itemCnt="\d+"/, `paraProperties itemCnt="${newCount}"`)
  }
  header = header.replace(/<\/hh:paraProperties>/, centerPp + '</hh:paraProperties>')

  zip.file('Contents/header.xml', header)

  return { bold: boldId, italic: italicId, superscript: superId, center: centerId }
}

// ─── 메인 빌더 ───

/**
 * DocumentBlueprint → HWPX Uint8Array 생성.
 *
 * @param doc - 문서 청사진
 * @param snapshots - 차트 스냅샷 맵 (entityId → ChartSnapshot)
 * @param templateData - 테스트용 템플릿 바이너리 (없으면 /templates/blank.hwpx fetch)
 */
export async function buildHwpxDocument(
  doc: DocumentBlueprint,
  snapshots?: Map<string, ChartSnapshot>,
  templateData?: Uint8Array,
): Promise<Uint8Array> {
  const resolvedDoc = resolveDocumentInlineCitations(buildRenderableDocument(doc))
  // 1. 템플릿 로드
  let rawTemplate: Uint8Array
  if (templateData !== undefined) {
    rawTemplate = templateData
  } else {
    const res = await fetch('/templates/blank.hwpx')
    if (!res.ok) throw new Error(`[hwpx] 템플릿 로드 실패: ${res.status} ${res.statusText}`)
    rawTemplate = new Uint8Array(await res.arrayBuffer())
  }

  const zip = await JSZip.loadAsync(rawTemplate)
  const builder = await createBuilderFromZip(zip)

  // 2. 제목 단락
  builder.addParagraph(`**${resolvedDoc.title}**`, { align: 'center' })

  // 3. 저자
  if (resolvedDoc.authors && resolvedDoc.authors.length > 0) {
    builder.addParagraph(resolvedDoc.authors.join(', '), { align: 'center' })
  }

  builder.addEmptyLine()

  // 4. 섹션 순회
  for (const section of resolvedDoc.sections) {
    if (!hasVisibleContent(section)) continue

    // 섹션 제목
    builder.addParagraph(`**${section.title}**`)

    // 본문 콘텐츠
    if (section.content) {
      const paragraphs = section.content.split('\n\n')
      for (const para of paragraphs) {
        const lines = para.split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed) {
            // ## 헤더 제거 후 텍스트만 추출
            const h2Match = trimmed.match(/^##\s+(.+)$/)
            const h3Match = trimmed.match(/^###\s+(.+)$/)
            if (h2Match) {
              builder.addParagraph(`**${h2Match[1]}**`)
            } else if (h3Match) {
              builder.addParagraph(`**${h3Match[1]}**`)
            } else {
              builder.addParagraph(trimmed)
            }
          }
        }
      }
    }

    // 표
    if (section.tables) {
      for (const table of section.tables) {
        builder.addTable(table)
      }
    }

    // 그림 참조
    if (section.figures) {
      for (const fig of section.figures) {
        const snapshot = snapshots?.get(fig.entityId)
        if (snapshot && snapshot.cssWidth > 0 && snapshot.cssHeight > 0) {
          const CONTENT_WIDTH_PX = Math.floor(CONTENT_WIDTH / 75)
          const scale = Math.min(1, CONTENT_WIDTH_PX / snapshot.cssWidth)
          const width = Math.round(snapshot.cssWidth * scale)
          const height = Math.round(snapshot.cssHeight * scale)
          
          builder.addImage(snapshot.data, {
            width,
            height,
            caption: `${fig.label}: ${fig.caption}`,
          })
        } else {
          // 스냅샷 없으면 캡션 텍스트만
          builder.addParagraph(`${fig.label}: ${fig.caption}`)
        }

        for (const line of getFigureProvenanceLines(fig)) {
          builder.addParagraph(line)
        }
      }
    }

    builder.addEmptyLine()
  }

  return builder.build()
}

// ─── 내보내기 래퍼 (side-effect) ───

/**
 * DocumentBlueprint → HWPX 파일 다운로드.
 * IndexedDB에서 차트 스냅샷을 일괄 로드 후 buildHwpxDocument 호출.
 */
export async function documentToHwpx(doc: DocumentBlueprint): Promise<void> {
  // 모든 figure entityId 수집
  const figureIds = doc.sections
    .flatMap(s => s.figures ?? [])
    .map(f => f.entityId)

  const snapshots = figureIds.length > 0
    ? await loadSnapshots(figureIds)
    : new Map<string, ChartSnapshot>()

  const data = await buildHwpxDocument(doc, snapshots)
  const blob = new Blob([data as BlobPart], { type: 'application/octet-stream' })
  const safeName = doc.title.replace(/[/\\?%*:|"<>]/g, '_')
  downloadBlob(blob, `${safeName}.hwpx`)
}

// ─── 내부 함수 테스트용 재노출 ───

/** @internal 테스트용 — pxToHwpml 단위 변환 */
export { pxToHwpml }

/** @internal 테스트용 — 위첨자 포함 인라인 마크 파서 */
export { parseHwpxInlineMarks }
