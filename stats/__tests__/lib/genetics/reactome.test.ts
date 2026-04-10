import { describe, expect, it } from 'vitest'
import {
  normalizeReactomeIdentifiers,
  parseReactomeEnrichmentResult,
  parseReactomePathways,
  ReactomeError,
} from '@/lib/genetics/reactome'

describe('parseReactomePathways', () => {
  it('Reactome pathway 매핑 응답을 요약한다', () => {
    const pathways = parseReactomePathways([
      {
        dbId: 12345,
        displayName: 'Hemoglobin oxygen transport',
        stId: 'R-HSA-2168880',
        stIdVersion: 'R-HSA-2168880.1',
        speciesName: 'Homo sapiens',
        maxDepth: 2,
        releaseDate: '2025-12-03',
        doi: '10.3180/R-HSA-2168880.1',
        hasDiagram: true,
        hasEHLD: false,
      },
      {
        dbId: 67890,
        displayName: 'Defective HBB causes beta-thalassemia',
        stId: 'R-HSA-5609970',
        isInDisease: true,
        isInferred: true,
      },
    ])

    expect(pathways).toHaveLength(2)
    expect(pathways[0]).toEqual({
      dbId: 12345,
      stId: 'R-HSA-2168880',
      stIdVersion: 'R-HSA-2168880.1',
      displayName: 'Hemoglobin oxygen transport',
      speciesName: 'Homo sapiens',
      isInDisease: false,
      isInferred: false,
      maxDepth: 2,
      releaseDate: '2025-12-03',
      doi: '10.3180/R-HSA-2168880.1',
      hasDiagram: true,
      hasEHLD: false,
      pathwayUrl: 'https://reactome.org/content/detail/R-HSA-2168880',
    })
    expect(pathways[1]?.stId).toBe('R-HSA-5609970')
    expect(pathways[1]?.isInDisease).toBe(true)
    expect(pathways[1]?.isInferred).toBe(true)
  })

  it('필수 필드가 없는 항목은 제외한다', () => {
    const pathways = parseReactomePathways([
      { dbId: 12345, displayName: 'missing stId' },
      { stId: 'R-HSA-1', displayName: 'missing dbId' },
      { dbId: 67890, stId: 'R-HSA-2', displayName: 'valid' },
    ])

    expect(pathways).toEqual([
      expect.objectContaining({
        dbId: 67890,
        stId: 'R-HSA-2',
        displayName: 'valid',
      }),
    ])
  })
})

describe('ReactomeError', () => {
  it('에러 코드를 유지한다', () => {
    const error = new ReactomeError('not found', 'not-found')
    expect(error.code).toBe('not-found')
    expect(error.name).toBe('ReactomeError')
  })
})

describe('normalizeReactomeIdentifiers', () => {
  it('공백과 중복을 제거한다', () => {
    expect(normalizeReactomeIdentifiers([
      ' HBB ',
      'HBA1',
      'hbb',
      '',
      '  ',
      'AHSP',
    ])).toEqual(['HBB', 'HBA1', 'AHSP'])
  })
})

describe('parseReactomeEnrichmentResult', () => {
  it('Reactome analysis service 응답을 정렬해서 요약한다', () => {
    const result = parseReactomeEnrichmentResult(
      {
        summary: { token: 'token-123' },
        identifiersNotFound: 1,
        pathwaysFound: 2,
        warnings: ['Missing header. Using a default one.'],
        pathways: [
          {
            stId: 'R-HSA-2',
            dbId: 2,
            name: 'Second pathway',
            species: { name: 'Homo sapiens' },
            entities: { found: 2, total: 30, pValue: 0.01, fdr: 0.02 },
            reactions: { found: 1, total: 10 },
          },
          {
            stId: 'R-HSA-1',
            dbId: 1,
            name: 'First pathway',
            species: { name: 'Homo sapiens' },
            entities: { found: 3, total: 12, pValue: 0.001, fdr: 0.005 },
            reactions: { found: 2, total: 5 },
            inDisease: true,
            llp: true,
          },
        ],
      },
      ['HBB', 'HBA1', 'AHSP'],
    )

    expect(result.token).toBe('token-123')
    expect(result.identifiersNotFound).toBe(1)
    expect(result.pathwaysFound).toBe(2)
    expect(result.queryIdentifiers).toEqual(['HBB', 'HBA1', 'AHSP'])
    expect(result.warnings).toEqual(['Missing header. Using a default one.'])
    expect(result.pathways[0]).toEqual({
      stId: 'R-HSA-1',
      dbId: 1,
      name: 'First pathway',
      speciesName: 'Homo sapiens',
      entitiesFound: 3,
      entitiesTotal: 12,
      reactionsFound: 2,
      reactionsTotal: 5,
      pValue: 0.001,
      fdr: 0.005,
      inDisease: true,
      lowLevelPathway: true,
      pathwayUrl: 'https://reactome.org/content/detail/R-HSA-1',
    })
    expect(result.pathways[1]?.stId).toBe('R-HSA-2')
  })
})
