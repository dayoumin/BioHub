/**
 * HWPX Builder — 재사용 가능한 HWPX 문서 생성 모듈
 *
 * 전략: 한컴오피스에서 만든 빈 문서를 템플릿으로 사용하여
 * section0.xml만 동적 교체 + BinData에 이미지 추가.
 *
 * 사용법:
 *   const builder = await HwpxBuilder.fromTemplate('template.hwpx')
 *   builder.addHeading('제목', 1)
 *   builder.addParagraph('본문 텍스트')
 *   builder.addTable({ caption: '표 1', headers: [...], rows: [...] })
 *   builder.addImage(pngBuffer, { width: 480, height: 320 })
 *   const hwpxBytes = await builder.build()
 *
 * @license MIT
 */

const JSZip = require('jszip')
const fs = require('fs')
const path = require('path')

// ─── XML 유틸 ───

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// CSS px → HWPML unit (1/7200 inch). 96dpi 기준: px * 75
function pxToHwpml(px) {
  return Math.round(px * 75)
}

// ─── HwpxBuilder ───

class HwpxBuilder {
  /** @private */
  constructor(zip, secOpen, firstP) {
    this._zip = zip
    this._secOpen = secOpen
    this._firstP = firstP // 페이지 설정(secPr+colPr) 포함 첫 단락
    this._paragraphs = []
    this._images = []     // { id, filename, data }
    this._nextId = 100
    this._nextImgId = 1
  }

  /**
   * 템플릿 HWPX 파일에서 빌더 생성
   * @param {string} templatePath - 한컴오피스에서 만든 .hwpx 파일 경로
   */
  static async fromTemplate(templatePath) {
    const buf = fs.readFileSync(templatePath)
    const zip = await JSZip.loadAsync(buf)

    const section = await zip.file('Contents/section0.xml').async('string')
    const secOpen = section.match(/<hs:sec[^>]*>/)[0]
    const firstP = section.match(/<hp:p[\s\S]*?<\/hp:p>/)[0]

    // 기존 BinData 제거
    const binFiles = Object.keys(zip.files).filter(p => p.startsWith('BinData/'))
    binFiles.forEach(p => zip.remove(p))

    // Preview 제거
    const prevFiles = Object.keys(zip.files).filter(p => p.startsWith('Preview/'))
    prevFiles.forEach(p => zip.remove(p))

    return new HwpxBuilder(zip, secOpen, firstP)
  }

  /** 일반 텍스트 단락 추가 */
  addParagraph(text) {
    this._paragraphs.push(this._makeP(escapeXml(text)))
    return this
  }

  /** 빈 줄 추가 */
  addEmptyLine() {
    this._paragraphs.push(this._makeP(''))
    return this
  }

  /**
   * 제목 추가 (볼드, 번호 접두사)
   * @param {string} text
   * @param {number} level - 1=대제목, 2=중제목, 3=소제목
   */
  addHeading(text, level = 1) {
    // 볼드 처리: charPrIDRef를 별도로 만들 수 없으므로 텍스트에 시각적 구분
    // 실제 볼드는 header.xml에 charPr 추가 필요 → 현재는 텍스트 레벨로 표현
    this._paragraphs.push(this._makeP(escapeXml(text)))
    return this
  }

  /**
   * 표 추가 (HWPML <hp:tbl> 구조)
   * @param {{ caption?: string, headers: string[], rows: string[][] }} table
   */
  addTable(table) {
    if (table.caption) {
      this._paragraphs.push(this._makeP(escapeXml(table.caption)))
    }

    const colCount = table.headers.length
    const rowCount = table.rows.length + 1 // 헤더 + 데이터

    // HWPML 테이블
    const cellWidth = Math.round(42520 / colCount) // 페이지 폭 약 42520 HWPML unit
    const cellWidths = Array(colCount).fill(cellWidth)

    const headerCells = table.headers.map((h, ci) =>
      `<hp:tc><hp:cellAddr colAddr="${ci}" rowAddr="0"/>` +
      `<hp:cellSpan colSpan="1" rowSpan="1"/>` +
      `<hp:cellSz width="${cellWidths[ci]}" height="1000"/>` +
      `<hp:cellMargin left="108" right="108" top="54" bottom="54"/>` +
      `<hp:p id="${this._nextId++}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="0"><hp:t>${escapeXml(h)}</hp:t></hp:run></hp:p>` +
      `</hp:tc>`
    ).join('')

    const dataRowsXml = table.rows.map((row, ri) => {
      const cells = row.map((cell, ci) =>
        `<hp:tc><hp:cellAddr colAddr="${ci}" rowAddr="${ri + 1}"/>` +
        `<hp:cellSpan colSpan="1" rowSpan="1"/>` +
        `<hp:cellSz width="${cellWidths[ci]}" height="1000"/>` +
        `<hp:cellMargin left="108" right="108" top="54" bottom="54"/>` +
        `<hp:p id="${this._nextId++}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
        `<hp:run charPrIDRef="0"><hp:t>${escapeXml(cell)}</hp:t></hp:run></hp:p>` +
        `</hp:tc>`
      ).join('')
      return `<hp:tr>${cells}</hp:tr>`
    }).join('')

    const tblXml =
      `<hp:p id="${this._nextId++}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="0">` +
      `<hp:tbl id="${this._nextId++}" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" groupLevel="0" instid="${this._nextId++}" reverse="0">` +
      `<hp:offset x="0" y="0"/>` +
      `<hp:sz width="42520" widthRelTo="ABSOLUTE" height="0" heightRelTo="ABSOLUTE" protect="0"/>` +
      `<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>` +
      `<hp:outMargin left="0" right="0" top="141" bottom="141"/>` +
      `<hp:inMargin left="0" right="0" top="0" bottom="0"/>` +
      `<hp:cellzoneList>` +
      cellWidths.map((w, i) => `<hp:cellzone startRowAddr="0" startColAddr="${i}" endRowAddr="${rowCount - 1}" endColAddr="${i}"/>`).join('') +
      `</hp:cellzoneList>` +
      `<hp:tr>${headerCells}</hp:tr>` +
      dataRowsXml +
      `</hp:tbl>` +
      `</hp:run></hp:p>`

    this._paragraphs.push(tblXml)
    return this
  }

  /**
   * PNG 이미지 추가
   * @param {Buffer|Uint8Array} pngData - PNG 바이너리
   * @param {{ width: number, height: number, caption?: string }} opts - CSS px 단위
   */
  addImage(pngData, opts) {
    const imgId = `chart${this._nextImgId++}`
    const filename = `${imgId}.png`
    this._images.push({ id: imgId, filename, data: pngData })

    const w = pxToHwpml(opts.width)
    const h = pxToHwpml(opts.height)

    const picXml =
      `<hp:pic id="${this._nextId++}" zOrder="0" numberingType="PICTURE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" groupLevel="0" instid="${this._nextId++}" reverse="0">` +
      `<hp:offset x="0" y="0"/>` +
      `<hp:orgSz width="${w}" height="${h}"/>` +
      `<hp:curSz width="${w}" height="${h}"/>` +
      `<hp:flip horizontal="0" vertical="0"/>` +
      `<hp:rotationInfo angle="0"/>` +
      `<hp:renderingInfo><hc:transMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/><hc:scaMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/><hc:rotMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/></hp:renderingInfo>` +
      `<hp:imgRect><hc:pt0 x="0" y="0"/><hc:pt1 x="${w}" y="0"/><hc:pt2 x="${w}" y="${h}"/><hc:pt3 x="0" y="${h}"/></hp:imgRect>` +
      `<hp:imgClip left="0" right="${w}" top="0" bottom="${h}"/>` +
      `<hp:inMargin left="0" right="0" top="0" bottom="0"/>` +
      `<hc:img binaryItemIDRef="${imgId}" bright="0" contrast="0" effect="REAL_PIC" alpha="0"/>` +
      `<hp:effects/>` +
      `<hp:sz width="${w}" widthRelTo="ABSOLUTE" height="${h}" heightRelTo="ABSOLUTE" protect="0"/>` +
      `<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>` +
      `<hp:outMargin left="0" right="0" top="0" bottom="0"/>` +
      `</hp:pic>`

    this._paragraphs.push(
      `<hp:p id="${this._nextId++}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="0">${picXml}</hp:run></hp:p>`
    )

    if (opts.caption) {
      this._paragraphs.push(this._makeP(escapeXml(opts.caption)))
    }

    return this
  }

  /** HWPX 파일 생성 → Uint8Array */
  async build() {
    // section0.xml 조립
    const section0 = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>' +
      this._secOpen +
      this._firstP +
      this._paragraphs.join('') +
      '</hs:sec>'

    this._zip.file('Contents/section0.xml', section0)

    // BinData에 이미지 추가
    for (const img of this._images) {
      this._zip.file(`BinData/${img.filename}`, img.data)
    }

    // content.hpf에 이미지 manifest 추가
    if (this._images.length > 0) {
      let hpf = await this._zip.file('Contents/content.hpf').async('string')
      // 기존 BinData 항목 제거
      hpf = hpf.replace(/<opf:item[^>]*BinData[^>]*\/>/g, '')
      // 새 이미지 항목 추가
      const imgItems = this._images.map(img =>
        `<opf:item id="${img.id}" href="BinData/${img.filename}" media-type="image/png" isEmbeded="1"/>`
      ).join('')
      hpf = hpf.replace('</opf:manifest>', imgItems + '</opf:manifest>')
      this._zip.file('Contents/content.hpf', hpf)
    }

    return this._zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  }

  /** HWPX 파일로 저장 */
  async save(outputPath) {
    const buf = await this.build()
    fs.writeFileSync(outputPath, buf)
    return buf.length
  }

  // ─── private ───

  _makeP(textContent) {
    const id = this._nextId++
    return `<hp:p id="${id}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="0"><hp:t>${textContent}</hp:t></hp:run></hp:p>`
  }
}

module.exports = { HwpxBuilder, escapeXml, pxToHwpml }
