import { describe, it, expect } from 'vitest'
import {
  generateFigurePatternSummary,
  assemblePaperPackage,
} from '../paper-package-assembler'
import type { PackageDataSources } from '../paper-package-assembler'
import type { PaperPackage, PackageItem, PackageReference } from '../paper-package-types'
import { JOURNAL_PRESETS, generatePackageId, generatePackageItemId, generatePackageRefId } from '../paper-package-types'
import type { GraphProject } from '@/types/graph-studio'
import type { HistoryRecord } from '@/lib/utils/storage-types'

// ── generateFigurePatternSummary ──────────────────────────

describe('generateFigurePatternSummary', () => {
  const baseGraph: GraphProject = {
    id: 'g1',
    name: '박스플롯',
    chartSpec: { chartType: 'boxplot' } as GraphProject['chartSpec'],
    dataPackageId: 'dp1',
    editHistory: [],
    createdAt: '',
    updatedAt: '',
  }

  it('HistoryRecord 없으면 undefined 반환', () => {
    expect(generateFigurePatternSummary(baseGraph)).toBeUndefined()
  })

  it('results에 groupStats 있으면 패턴 요약 생성', () => {
    const record = {
      id: 'h1',
      results: {
        groupStats: [
          { group: 'A', mean: 2.1, n: 40 },
          { group: 'B', mean: 2.8, n: 40 },
          { group: 'C', mean: 2.3, n: 40 },
        ],
      },
    } as unknown as HistoryRecord
    const summary = generateFigurePatternSummary(baseGraph, record)
    expect(summary).toContain('B')
    expect(summary).toContain('2.8')
  })

  it('groupStats 없으면 undefined 반환', () => {
    const record = { id: 'h1', results: { p: 0.017 } } as unknown as HistoryRecord
    expect(generateFigurePatternSummary(baseGraph, record)).toBeUndefined()
  })
})

// ── assemblePaperPackage ──────────────────────────────────

const makeMinimalPackage = (): PaperPackage => ({
  id: generatePackageId(),
  projectId: 'proj_1',
  version: 1,
  overview: {
    title: '남해 종 다양성 연구',
    purpose: '해역별 종 다양성 비교',
    dataDescription: '남해 3개 해역 샘플링 데이터',
  },
  items: [],
  references: [],
  journal: JOURNAL_PRESETS[0], // 한국수산과학회지
  context: {},
  createdAt: '2026-04-03T00:00:00Z',
  updatedAt: '2026-04-03T00:00:00Z',
})

const emptySources: PackageDataSources = {
  historyRecords: [],
  graphProjects: [],
}

describe('assemblePaperPackage', () => {
  it('아이템 없어도 기본 구조 생성', () => {
    const result = assemblePaperPackage(makeMinimalPackage(), emptySources)
    expect(result.markdown).toContain('연구 논문 작성 요청')
    expect(result.markdown).toContain('한국수산과학회지')
    expect(result.markdown).toContain('남해 종 다양성 연구')
    expect(result.warnings).toEqual([])
  })

  it('included=false 아이템은 제외', () => {
    const pkg = makeMinimalPackage()
    const item: PackageItem = {
      id: generatePackageItemId(),
      type: 'analysis',
      sourceId: 'h_excluded',
      analysisIds: ['ANAL-01'],
      label: 'Table 1',
      section: 'results',
      order: 0,
      included: false,
    }
    pkg.items = [item]
    const sources: PackageDataSources = {
      historyRecords: [{
        id: 'h_excluded',
        method: { id: 'anova', name: 'One-way ANOVA', category: 'parametric' },
        results: {},
      } as unknown as HistoryRecord],
      graphProjects: [],
    }
    const result = assemblePaperPackage(pkg, sources)
    expect(result.markdown).not.toContain('One-way ANOVA')
  })

  it('included=true 아이템의 분석 method가 markdown에 포함', () => {
    const pkg = makeMinimalPackage()
    const item: PackageItem = {
      id: generatePackageItemId(),
      type: 'analysis',
      sourceId: 'h1',
      analysisIds: ['ANAL-01'],
      label: 'Table 1',
      section: 'results',
      order: 0,
      included: true,
    }
    pkg.items = [item]
    const sources: PackageDataSources = {
      historyRecords: [{
        id: 'h1',
        method: { id: 'anova', name: 'One-way ANOVA', category: 'parametric' },
        paperDraft: { results: 'F(2,117) = 4.23, p = .017' } as HistoryRecord['paperDraft'],
        results: {},
      } as unknown as HistoryRecord],
      graphProjects: [],
    }
    const result = assemblePaperPackage(pkg, sources)
    expect(result.markdown).toContain('One-way ANOVA')
    expect(result.markdown).toContain('ANAL-01')
  })

  it('included=true ref에 summaryStatus missing이면 경고 생성', () => {
    const pkg = makeMinimalPackage()
    const ref: PackageReference = {
      id: generatePackageRefId(),
      manualEntry: { authors: 'Kim J', year: 2024, title: 'Test', journal: 'JMS' },
      role: 'methodology',
      summaryStatus: 'missing',
      included: true,
    }
    pkg.references = [ref]
    const result = assemblePaperPackage(pkg, emptySources)
    expect(result.warnings.some(w => w.includes('요약'))).toBe(true)
  })

  it('tokenEstimate는 양수', () => {
    const result = assemblePaperPackage(makeMinimalPackage(), emptySources)
    expect(result.tokenEstimate).toBeGreaterThan(0)
  })
})
