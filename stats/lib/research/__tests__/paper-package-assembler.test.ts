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
      analysisLinks: [{ sourceId: 'h1', label: 'ANAL-01' }],
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
    expect(result.markdown).toContain('"id": "h1"')
    expect(result.markdown).toContain('"analysisLabel": "ANAL-01"')
    expect(result.markdown).toContain('"sourceAnalysisIds": [')
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

  it('variableMapping의 dependentVar/independentVar가 JSON에 포함', () => {
    const pkg = makeMinimalPackage()
    pkg.items = [{
      id: generatePackageItemId(),
      type: 'analysis',
      sourceId: 'h_var',
      analysisIds: ['ANAL-01'],
      label: 'Table 1',
      section: 'results',
      order: 0,
      included: true,
    }]
    const sources: PackageDataSources = {
      historyRecords: [{
        id: 'h_var',
        method: { id: 'anova', name: 'One-way ANOVA', category: 'parametric' },
        variableMapping: {
          dependentVar: 'Shannon_H',
          independentVar: 'Region',
          groupVar: 'Site',
        },
        results: { F: 4.23, p: 0.017, df: [2, 117] },
      } as unknown as HistoryRecord],
      graphProjects: [],
    }
    const result = assemblePaperPackage(pkg, sources)
    expect(result.markdown).toContain('"dependent": "Shannon_H"')
    expect(result.markdown).toContain('"independent": "Region"')
  })

  it('영어 프리셋(APA 7th) 선택 시 영어 헤더 출력', () => {
    const pkg = makeMinimalPackage()
    pkg.journal = JOURNAL_PRESETS.find(p => p.id === 'apa7')!
    const result = assemblePaperPackage(pkg, emptySources)
    expect(result.markdown).toContain('Research Paper Writing Request')
    expect(result.markdown).toContain('Critical Rules')
    expect(result.markdown).toContain('Study Overview')
    expect(result.markdown).not.toContain('연구 논문 작성 요청')
  })

  it('summaryStatus missing 문헌은 markdown에 "요약 없음" 경고 텍스트 포함', () => {
    const pkg = makeMinimalPackage()
    pkg.references = [{
      id: generatePackageRefId(),
      manualEntry: { authors: 'Kim J', year: 2024, title: 'Test', journal: 'JMS' },
      role: 'methodology',
      summaryStatus: 'missing',
      included: true,
    }]
    const result = assemblePaperPackage(pkg, emptySources)
    expect(result.markdown).toContain('⚠ 요약 없음')
    expect(result.markdown).toContain('서술은 최소화')
  })

  it('영어 프리셋에서 missing 문헌은 영문 경고 출력', () => {
    const pkg = makeMinimalPackage()
    pkg.journal = JOURNAL_PRESETS.find(p => p.id === 'apa7')!
    pkg.references = [{
      id: generatePackageRefId(),
      manualEntry: { authors: 'Kim J', year: 2024, title: 'Test', journal: 'JMS' },
      role: 'background',
      summaryStatus: 'missing',
      included: true,
    }]
    const result = assemblePaperPackage(pkg, emptySources)
    expect(result.markdown).toContain('Summary missing')
    expect(result.markdown).toContain('Minimize introduction')
  })

  it('figure 아이템에 patternSummary와 analysisIds가 markdown에 반영', () => {
    const pkg = makeMinimalPackage()
    pkg.items = [{
      id: generatePackageItemId(),
      type: 'figure',
      sourceId: 'g1',
      analysisIds: ['ANAL-01', 'ANAL-02'],
      analysisLinks: [
        { sourceId: 'analysis-1', label: 'ANAL-01' },
        { sourceId: 'analysis-2', label: 'ANAL-02' },
      ],
      label: 'Figure 1',
      section: 'results',
      order: 0,
      included: true,
      patternSummary: '해역 B의 평균(2.8)이 A(2.1)보다 높음',
    }]
    const sources: PackageDataSources = {
      historyRecords: [],
      graphProjects: [{ id: 'g1', name: '박스플롯' } as unknown as GraphProject],
    }
    const result = assemblePaperPackage(pkg, sources)
    expect(result.markdown).toContain('해역 B의 평균(2.8)이 A(2.1)보다 높음')
    expect(result.markdown).toContain('ANAL-01, ANAL-02')
    expect(result.markdown).toContain('analysis-1, analysis-2')
  })
})
