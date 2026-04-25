/**
 * document-docx-export 테스트
 *
 * hasVisibleContent: 섹션 콘텐츠 가시성 판정
 * parseInlineMarks: 마크다운 인라인 마크 파싱
 * buildDocxDocument: DOCX 문서 빌더
 */

import type { DocumentBlueprint, DocumentSection } from '@/lib/research/document-blueprint-types'

// downloadBlob mock (DOM 조작 방지)
vi.mock('@/lib/services/export/export-data-builder', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/lib/services/export/export-data-builder')>()
  return { ...orig, downloadBlob: vi.fn() }
})

import { hasVisibleContent, parseInlineMarks, buildDocxDocument, computeImageScale } from '@/lib/services/export/document-docx-export'

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

  it('section support bindings만 있어도 true', () => {
    expect(hasVisibleContent(makeSection({
      sectionSupportBindings: [{
        id: 'dsb_1',
        sourceKind: 'citation-record',
        sourceId: 'cit_1',
        role: 'comparison',
        label: 'Marine Ecology Review',
        summary: '비교 문헌의 핵심 차이를 정리한 메모',
        included: true,
        origin: 'user',
      }],
    }))).toBe(true)
  })

  it('모두 없으면 false', () => {
    expect(hasVisibleContent(makeSection())).toBe(false)
  })

  it('빈 배열이면 false', () => {
    expect(hasVisibleContent(makeSection({ tables: [], figures: [] }))).toBe(false)
  })
})

// ─── parseInlineMarks ───

describe('parseInlineMarks', () => {
  it('plain text → 단일 run', () => {
    const runs = parseInlineMarks('hello world')
    expect(runs).toHaveLength(1)
    expect(runs[0]).toEqual({ text: 'hello world' })
  })

  it('**bold** → bold run', () => {
    const runs = parseInlineMarks('앞 **굵게** 뒤')
    expect(runs).toHaveLength(3)
    expect(runs[0]).toEqual({ text: '앞 ' })
    expect(runs[1]).toEqual({ text: '굵게', bold: true })
    expect(runs[2]).toEqual({ text: ' 뒤' })
  })

  it('*italic* → italic run', () => {
    const runs = parseInlineMarks('앞 *기울임* 뒤')
    expect(runs).toHaveLength(3)
    expect(runs[0]).toEqual({ text: '앞 ' })
    expect(runs[1]).toEqual({ text: '기울임', italic: true })
    expect(runs[2]).toEqual({ text: ' 뒤' })
  })

  it('bold와 italic 혼재', () => {
    const runs = parseInlineMarks('**a** and *b*')
    expect(runs).toHaveLength(3)
    expect(runs[0]).toEqual({ text: 'a', bold: true })
    expect(runs[1]).toEqual({ text: ' and ' })
    expect(runs[2]).toEqual({ text: 'b', italic: true })
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

// ─── buildDocxDocument ───

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

describe('buildDocxDocument', () => {
  it('최소 문서 → Document 객체 생성', async () => {
    const doc = await buildDocxDocument(makeDoc())
    expect(doc).toBeDefined()
    // Document 객체가 Packer.toBlob에 사용 가능한지 확인
    const { Packer } = await import('docx')
    const blob = await Packer.toBlob(doc)
    expect(blob.size).toBeGreaterThan(0)
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

// ─── buildDocxDocument with snapshots ───

describe('buildDocxDocument with snapshots', () => {
  // Create a minimal valid PNG for testing
  const minimalPng = new Uint8Array([
    137, 80, 78, 71, 13, 10, 26, 10,
    0, 0, 0, 13, 73, 72, 68, 82,
    0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0,
    144, 119, 83, 222,
    0, 0, 0, 12, 73, 68, 65, 84,
    8, 215, 99, 248, 207, 192, 0, 0, 0, 3, 0, 1,
    24, 216, 110, 175,
    0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
  ])

  const mockSnapshots = new Map([
    ['g1', {
      id: 'g1', data: minimalPng,
      cssWidth: 480, cssHeight: 320, pixelRatio: 2,
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
    const withImg = await buildDocxDocument(docWithFig, mockSnapshots)
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

// ─── computeImageScale ───

describe('computeImageScale', () => {
  it('oversized → 페이지 폭에 비례 축소', () => {
    const result = computeImageScale(1200, 800, 624)
    expect(result.width).toBe(624)
    expect(result.height).toBe(416)  // 800 * (624/1200) = 416
  })

  it('undersized → 확대 안 함', () => {
    const result = computeImageScale(400, 300, 624)
    expect(result.width).toBe(400)
    expect(result.height).toBe(300)
  })

  it('정확히 페이지 폭 → 그대로', () => {
    const result = computeImageScale(624, 400, 624)
    expect(result.width).toBe(624)
    expect(result.height).toBe(400)
  })

  it('cssWidth=0 → {0, 0}', () => {
    expect(computeImageScale(0, 100, 624)).toEqual({ width: 0, height: 0 })
  })

  it('cssHeight=0 → {0, 0}', () => {
    expect(computeImageScale(100, 0, 624)).toEqual({ width: 0, height: 0 })
  })

  it('음수 → {0, 0}', () => {
    expect(computeImageScale(-1, 100, 624)).toEqual({ width: 0, height: 0 })
  })
})
