import { describe, expect, it } from 'vitest'
import type { ChartSpec, DataPackage, GraphProject } from '@/types/graph-studio'
import {
  buildGraphProjectProvenanceEdges,
  didGraphDataPackageChange,
  resolveGraphProjectAnalysisId,
  resolveGraphProjectLineage,
  resolveGraphProjectSourceRefs,
} from '@/lib/graph-studio/project-lineage'

function makeSpec(title = 'Growth Chart'): ChartSpec {
  return {
    version: '1.0',
    chartType: 'bar',
    title,
    data: {
      sourceId: 'src-1',
      columns: [
        { name: 'group', type: 'nominal', uniqueCount: 2, sampleValues: ['A', 'B'], hasNull: false },
        { name: 'value', type: 'quantitative', uniqueCount: 8, sampleValues: ['10', '12'], hasNull: false },
      ],
    },
    encoding: {
      x: { field: 'group', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
    style: { preset: 'default' },
    annotations: [],
    exportConfig: { format: 'png', dpi: 96 },
  }
}

function makePkg(overrides: Partial<DataPackage> = {}): DataPackage {
  return {
    id: 'pkg-1',
    source: 'upload',
    label: 'Fresh Upload',
    columns: [
      { name: 'group', type: 'nominal', uniqueCount: 2, sampleValues: ['A', 'B'], hasNull: false },
      { name: 'value', type: 'quantitative', uniqueCount: 8, sampleValues: ['10', '12'], hasNull: false },
    ],
    data: { group: ['A', 'B'], value: [10, 12] },
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeProject(overrides: Partial<GraphProject> = {}): GraphProject {
  return {
    id: 'gp-1',
    name: 'Saved Graph',
    chartSpec: makeSpec(),
    dataPackageId: 'pkg-legacy',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('project-lineage', () => {
  it('treats empty dataPackageId as a relink when a new package is attached', () => {
    const currentProject = makeProject({
      dataPackageId: '',
      analysisId: 'analysis-legacy',
      sourceRefs: [{ kind: 'analysis', sourceId: 'analysis-legacy', label: 'Legacy Analysis' }],
    })
    const dataPackage = makePkg({ id: 'pkg-new' })

    expect(didGraphDataPackageChange(currentProject, dataPackage)).toBe(true)
    expect(resolveGraphProjectAnalysisId(currentProject, dataPackage)).toBeUndefined()
    expect(resolveGraphProjectSourceRefs(currentProject, dataPackage)).toEqual([
      { kind: 'data-package', sourceId: 'pkg-new', label: 'Fresh Upload' },
    ])
  })

  it('prefers canonical data package sourceRefs when provided', () => {
    const sourceRefs = resolveGraphProjectSourceRefs(
      makeProject(),
      makePkg({
        sourceRefs: [
          { kind: 'analysis', sourceId: 'hist-1', label: 'ANOVA' },
          { kind: 'figure', sourceId: 'fig-1', label: 'Existing Figure' },
        ],
      }),
    )

    expect(sourceRefs).toEqual([
      { kind: 'analysis', sourceId: 'hist-1', label: 'ANOVA' },
      { kind: 'figure', sourceId: 'fig-1', label: 'Existing Figure' },
    ])
  })

  it('preserves richer current project provenance when the attached package only has a legacy analysisResultId', () => {
    const sourceRefs = resolveGraphProjectSourceRefs(
      makeProject({
        dataPackageId: 'pkg-1',
        sourceRefs: [
          { kind: 'analysis', sourceId: 'hist-1', label: 'ANOVA' },
          { kind: 'figure', sourceId: 'fig-1', label: 'Existing Figure' },
        ],
      }),
      makePkg({
        id: 'pkg-1',
        analysisResultId: 'hist-1',
      }),
    )

    expect(sourceRefs).toEqual([
      { kind: 'analysis', sourceId: 'hist-1', label: 'ANOVA' },
      { kind: 'figure', sourceId: 'fig-1', label: 'Existing Figure' },
    ])
  })

  it('builds provenance edges only for project-entity backed refs', () => {
    expect(buildGraphProjectProvenanceEdges([
      { kind: 'analysis', sourceId: 'hist-1', label: 'ANOVA' },
      { kind: 'data-package', sourceId: 'pkg-1', label: 'Upload' },
      { kind: 'upload', sourceId: 'upload-1', label: 'CSV' },
    ])).toEqual([
      { role: 'derived-from', targetKind: 'analysis', targetId: 'hist-1', label: 'ANOVA' },
    ])
  })

  it('resolves lineage context from a relinked upload session', () => {
    const lineage = resolveGraphProjectLineage(
      makeProject({
        dataPackageId: '',
        analysisId: 'analysis-legacy',
        sourceRefs: [{ kind: 'analysis', sourceId: 'analysis-legacy', label: 'Legacy Analysis' }],
      }),
      makePkg({ id: 'pkg-new' }),
      makeSpec('Relinked Graph'),
      '2026-01-02T00:00:00.000Z',
    )

    expect(lineage.analysisId).toBeUndefined()
    expect(lineage.sourceRefs).toEqual([
      { kind: 'data-package', sourceId: 'pkg-new', label: 'Fresh Upload' },
    ])
    expect(lineage.provenanceEdges).toEqual([])
    expect(lineage.lineageMode).toBe('derived')
    expect(lineage.sourceSnapshot?.dataPackageId).toBe('pkg-new')
    expect(lineage.sourceSnapshot?.sourceFingerprint).toBeDefined()
  })

  it('falls back to the persisted source schema when no package is attached', () => {
    const lineage = resolveGraphProjectLineage(
      makeProject({
        dataPackageId: '',
        sourceSchema: [
          { name: 'group', type: 'nominal' },
          { name: 'value', type: 'quantitative' },
        ],
      }),
      null,
      makeSpec('Saved Graph'),
      '2026-01-02T00:00:00.000Z',
    )

    expect(lineage.sourceSchema).toEqual([
      { name: 'group', type: 'nominal' },
      { name: 'value', type: 'quantitative' },
    ])
  })
})
