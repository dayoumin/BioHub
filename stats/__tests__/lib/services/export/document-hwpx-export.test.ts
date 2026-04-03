/**
 * document-hwpx-export 테스트
 *
 * buildHwpxDocument: DocumentBlueprint → HWPX Uint8Array
 * - 최소 문서 → 유효한 ZIP (Uint8Array, size > 0)
 * - 표 포함 → section0.xml에 hp:tbl 존재
 * - 그림 + 스냅샷 → BinData/chart1.png 존재
 * - 그림 없는 스냅샷 → BinData 없음, 캡션 텍스트만
 *
 * parseHwpxInlineMarks: 위첨자 포함 인라인 마크 파싱
 * pxToHwpml: CSS px → HWPML unit
 */

import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'

// downloadBlob mock (DOM 조작 방지)
vi.mock('@/lib/services/export/export-data-builder', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/lib/services/export/export-data-builder')>()
  return { ...orig, downloadBlob: vi.fn() }
})

// IndexedDB mock (jsdom 환경)
vi.mock('@/lib/graph-studio/chart-snapshot-storage', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/lib/graph-studio/chart-snapshot-storage')>()
  return { ...orig, loadSnapshots: vi.fn().mockResolvedValue(new Map()) }
})

import {
  buildHwpxDocument,
  parseHwpxInlineMarks,
  pxToHwpml,
} from '@/lib/services/export/document-hwpx-export'
import type { DocumentBlueprint, DocumentSection } from '@/lib/research/document-blueprint-types'
import type { ChartSnapshot } from '@/lib/graph-studio/chart-snapshot-storage'

// ─── 템플릿 로드 ───

const TEMPLATE_PATH = path.resolve(__dirname, '../../../../public/templates/blank.hwpx')

function loadTemplate(): Uint8Array {
  return new Uint8Array(fs.readFileSync(TEMPLATE_PATH))
}

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

function makePngSnapshot(id: string): ChartSnapshot {
  // 최소 PNG 시그니처 (1x1 투명 PNG)
  const minPng = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR length + type
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // width=1, height=1
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bit depth=8, colorType=2
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, // IDAT length + type
    0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, // IDAT data
    0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, // IDAT data
    0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, // IEND length + type
    0x44, 0xae, 0x42, 0x60, 0x82,                   // IEND data
  ])
  return {
    id,
    data: minPng,
    cssWidth: 480,
    cssHeight: 320,
    pixelRatio: 2,
    updatedAt: '2026-04-01T00:00:00.000Z',
  }
}

// ─── pxToHwpml ───

describe('pxToHwpml', () => {
  it('96px → 7200 (1inch at 96dpi)', () => {
    expect(pxToHwpml(96)).toBe(7200)
  })

  it('1px → 75', () => {
    expect(pxToHwpml(1)).toBe(75)
  })

  it('480px → 36000', () => {
    expect(pxToHwpml(480)).toBe(36000)
  })

  it('0px → 0', () => {
    expect(pxToHwpml(0)).toBe(0)
  })
})

// ─── parseHwpxInlineMarks ───

describe('parseHwpxInlineMarks', () => {
  it('plain text → 단일 run', () => {
    const runs = parseHwpxInlineMarks('hello world')
    expect(runs).toHaveLength(1)
    expect(runs[0]).toEqual({ text: 'hello world' })
  })

  it('**bold** → bold run', () => {
    const runs = parseHwpxInlineMarks('앞 **굵게** 뒤')
    expect(runs).toHaveLength(3)
    expect(runs[1]).toEqual({ text: '굵게', bold: true })
  })

  it('*italic* → italic run', () => {
    const runs = parseHwpxInlineMarks('앞 *기울임* 뒤')
    expect(runs).toHaveLength(3)
    expect(runs[1]).toEqual({ text: '기울임', italic: true })
  })

  it('^superscript^ → superscript run', () => {
    const runs = parseHwpxInlineMarks('p=0.016^*^')
    expect(runs).toHaveLength(2)
    expect(runs[0]).toEqual({ text: 'p=0.016' })
    expect(runs[1]).toEqual({ text: '*', superscript: true })
  })

  it('bold + italic + superscript 혼재', () => {
    const runs = parseHwpxInlineMarks('**F**=4.56, *p*=0.016^*^')
    expect(runs.find(r => r.bold)?.text).toBe('F')
    expect(runs.find(r => r.italic)?.text).toBe('p')
    expect(runs.find(r => r.superscript)?.text).toBe('*')
  })

  it('빈 문자열 → [{ text: "" }]', () => {
    const runs = parseHwpxInlineMarks('')
    expect(runs).toHaveLength(1)
    expect(runs[0]).toEqual({ text: '' })
  })

  it('마크 없는 텍스트', () => {
    const runs = parseHwpxInlineMarks('no formatting here')
    expect(runs).toHaveLength(1)
    expect(runs[0].bold).toBeUndefined()
    expect(runs[0].italic).toBeUndefined()
    expect(runs[0].superscript).toBeUndefined()
  })
})

// ─── buildHwpxDocument ───

describe('buildHwpxDocument', () => {
  it('최소 문서 → Uint8Array (size > 0)', async () => {
    const template = loadTemplate()
    const result = await buildHwpxDocument(makeDoc(), undefined, template)

    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('결과가 유효한 ZIP (JSZip으로 파싱 가능)', async () => {
    const template = loadTemplate()
    const result = await buildHwpxDocument(makeDoc(), undefined, template)

    const zip = await JSZip.loadAsync(result)
    expect(zip.file('Contents/section0.xml')).not.toBeNull()
    expect(zip.file('Contents/header.xml')).not.toBeNull()
  })

  it('section0.xml에 제목 텍스트 포함', async () => {
    const template = loadTemplate()
    const result = await buildHwpxDocument(makeDoc(), undefined, template)

    const zip = await JSZip.loadAsync(result)
    const section0File = zip.file('Contents/section0.xml')
    const section0 = await section0File!.async('string')
    expect(section0).toContain('독립표본 t-검정 분석 보고서')
  })

  it('표 포함 문서 → section0.xml에 hp:tbl 존재', async () => {
    const template = loadTemplate()
    const doc = makeDoc({
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
    })

    const result = await buildHwpxDocument(doc, undefined, template)
    const zip = await JSZip.loadAsync(result)
    const section0 = await zip.file('Contents/section0.xml')!.async('string')

    expect(section0).toContain('hp:tbl')
    expect(section0).toContain('그룹')
    expect(section0).toContain('Table 1: 기술통계량')
    // BinData는 없어야 함
    const binDataFiles = Object.keys(zip.files).filter(f => f.startsWith('BinData/'))
    expect(binDataFiles).toHaveLength(0)
  })

  it('그림 + 스냅샷 → BinData/chart1.png 존재', async () => {
    const template = loadTemplate()
    const snapshot = makePngSnapshot('graph-1')
    const snapshots = new Map<string, ChartSnapshot>([['graph-1', snapshot]])

    const doc = makeDoc({
      sections: [
        makeSection({
          id: 'results',
          title: '결과',
          content: '',
          figures: [{ entityId: 'graph-1', label: 'Figure 1', caption: '체장-체중 산점도' }],
        }),
      ],
    })

    const result = await buildHwpxDocument(doc, snapshots, template)
    const zip = await JSZip.loadAsync(result)

    // BinData/chart1.png가 ZIP에 존재해야 함
    const binFile = zip.file('BinData/chart1.png')
    expect(binFile).not.toBeNull()

    // content.hpf에 이미지 manifest 항목이 추가되어야 함
    const hpf = await zip.file('Contents/content.hpf')!.async('string')
    expect(hpf).toContain('chart1')
  })

  it('그림 + 스냅샷 없음 → BinData 없음, 캡션 텍스트 포함', async () => {
    const template = loadTemplate()
    const doc = makeDoc({
      sections: [
        makeSection({
          id: 'results',
          title: '결과',
          content: '',
          figures: [{ entityId: 'graph-99', label: 'Figure 1', caption: '체장-체중 산점도' }],
        }),
      ],
    })

    const result = await buildHwpxDocument(doc, new Map(), template)
    const zip = await JSZip.loadAsync(result)

    // BinData 없음
    const binDataFiles = Object.keys(zip.files).filter(f => f.startsWith('BinData/'))
    expect(binDataFiles).toHaveLength(0)

    // 캡션 텍스트는 section0.xml에 있어야 함
    const section0 = await zip.file('Contents/section0.xml')!.async('string')
    expect(section0).toContain('체장-체중 산점도')
  })

  it('스냅샷 cssWidth=0 → 이미지 제외, 캡션만 출력', async () => {
    const template = loadTemplate()
    const zeroDimSnapshot: ChartSnapshot = {
      id: 'g-zero', data: makePngSnapshot('g-zero').data,
      cssWidth: 0, cssHeight: 320, pixelRatio: 2,
      updatedAt: '2026-04-01T00:00:00.000Z',
    }
    const snapshots = new Map<string, ChartSnapshot>([['g-zero', zeroDimSnapshot]])

    const doc = makeDoc({
      sections: [
        makeSection({
          id: 'results', title: '결과', content: '',
          figures: [{ entityId: 'g-zero', label: 'Figure 1', caption: '0-width 차트' }],
        }),
      ],
    })

    const result = await buildHwpxDocument(doc, snapshots, template)
    const zip = await JSZip.loadAsync(result)

    // 이미지 제외 (BinData 없음)
    const binDataFiles = Object.keys(zip.files).filter(f => f.startsWith('BinData/'))
    expect(binDataFiles).toHaveLength(0)

    // 캡션은 존재
    const section0 = await zip.file('Contents/section0.xml')!.async('string')
    expect(section0).toContain('0-width 차트')
  })

  it('빈 섹션은 스킵 (content/tables/figures 없음)', async () => {
    const template = loadTemplate()
    const doc = makeDoc({
      sections: [
        makeSection({ id: 's1', title: '서론', content: '내용 있음' }),
        makeSection({ id: 's2', title: '빈 섹션', content: '' }), // 스킵 대상
        makeSection({ id: 's3', title: '결론', content: '결론 내용' }),
      ],
    })

    const result = await buildHwpxDocument(doc, undefined, template)
    const zip = await JSZip.loadAsync(result)
    const section0 = await zip.file('Contents/section0.xml')!.async('string')

    expect(section0).toContain('내용 있음')
    expect(section0).toContain('결론 내용')
    // 빈 섹션 제목은 포함되지 않아야 함
    expect(section0).not.toContain('빈 섹션')
  })

  it('저자 없는 문서도 정상 생성', async () => {
    const template = loadTemplate()
    const result = await buildHwpxDocument(makeDoc({ authors: undefined }), undefined, template)
    expect(result.length).toBeGreaterThan(0)
  })

  it('마크다운 ## 헤더 → 볼드 단락으로 변환', async () => {
    const template = loadTemplate()
    const doc = makeDoc({
      sections: [
        makeSection({
          id: 'methods',
          title: '방법',
          content: '## 통계 분석\n\n**독립표본 t-검정**을 사용하였다.',
        }),
      ],
    })

    const result = await buildHwpxDocument(doc, undefined, template)
    const zip = await JSZip.loadAsync(result)
    const section0 = await zip.file('Contents/section0.xml')!.async('string')

    expect(section0).toContain('통계 분석')
    expect(section0).toContain('독립표본 t-검정')
    // ## 기호는 section0.xml에 없어야 함
    expect(section0).not.toContain('## ')
  })

  it('복수 이미지 → chart1, chart2 순서대로 BinData에 추가', async () => {
    const template = loadTemplate()
    const snapshots = new Map<string, ChartSnapshot>([
      ['g1', makePngSnapshot('g1')],
      ['g2', makePngSnapshot('g2')],
    ])

    const doc = makeDoc({
      sections: [
        makeSection({
          id: 'results',
          title: '결과',
          content: '',
          figures: [
            { entityId: 'g1', label: 'Figure 1', caption: '첫 번째 차트' },
            { entityId: 'g2', label: 'Figure 2', caption: '두 번째 차트' },
          ],
        }),
      ],
    })

    const result = await buildHwpxDocument(doc, snapshots, template)
    const zip = await JSZip.loadAsync(result)

    expect(zip.file('BinData/chart1.png')).not.toBeNull()
    expect(zip.file('BinData/chart2.png')).not.toBeNull()
  })

  it('XML 특수문자 (&, <, >) → 이스케이프 처리', async () => {
    const template = loadTemplate()
    const doc = makeDoc({
      sections: [
        makeSection({
          id: 'results',
          title: '결과 & 논의',
          content: 'p < 0.05 이면 유의하고, F > 4.0 인 경우를 확인하였다.',
          tables: [{
            caption: 'A & B 비교',
            headers: ['그룹', 'p값'],
            rows: [['A < B', '0.03']],
          }],
        }),
      ],
    })

    const result = await buildHwpxDocument(doc, undefined, template)
    const zip = await JSZip.loadAsync(result)
    const section0 = await zip.file('Contents/section0.xml')!.async('string')

    // 원본 특수문자는 그대로 있으면 안 됨 (태그 문맥에서)
    expect(section0).toContain('&amp;')
    expect(section0).toContain('&lt;')
    expect(section0).toContain('&gt;')
    // 이스케이프된 텍스트가 포함되어 있어야 함
    expect(section0).toContain('결과 &amp; 논의')
  })
})
