import { describe, expect, it } from 'vitest'
import { resolveEntities, type ProteinHistoryLike } from '../entity-resolver'
import type { ProjectEntityRef } from '@biohub/types'

function makeRef(overrides: Partial<ProjectEntityRef> = {}): ProjectEntityRef {
  return {
    id: 'pref_1',
    projectId: 'proj_1',
    entityKind: 'protein-result',
    entityId: 'protein_1',
    label: 'HBB protein',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('resolveEntities protein-result', () => {
  it('protein history를 프로젝트 엔티티로 해석한다', () => {
    const proteinHistory: ProteinHistoryLike[] = [
      {
        id: 'protein_1',
        analysisName: 'HBB protein summary',
        sequenceLength: 147,
        molecularWeight: 15867.2,
        isoelectricPoint: 6.75,
        isStable: true,
        accession: 'P68871',
        createdAt: 1710000000000,
      },
    ]

    const [entity] = resolveEntities([makeRef()], { proteinHistory })

    expect(entity.loaded).toBe(true)
    expect(entity.summary.title).toBe('HBB protein summary')
    expect(entity.summary.subtitle).toContain('147 aa')
    expect(entity.summary.navigateTo).toBe('/genetics/protein?history=protein_1')
    expect(entity.rawData).toEqual({
      kind: 'protein-result',
      analysisName: 'HBB protein summary',
      sequenceLength: 147,
      molecularWeight: 15867.2,
      isoelectricPoint: 6.75,
      isStable: true,
      accession: 'P68871',
    })
  })
})
