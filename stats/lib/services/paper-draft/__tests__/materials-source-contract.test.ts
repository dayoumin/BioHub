import { describe, expect, it } from 'vitest'
import {
  buildMaterialsSourceContract,
  getMaterialsSourceSummary,
  hasUnsafeSpeciesSource,
} from '../materials-source-contract'

describe('materials source contract', () => {
  it('creates a verified dataset source from analysis metadata', () => {
    const contract = buildMaterialsSourceContract({
      dataFileName: 'growth.csv',
      rowCount: 40,
      variables: ['group', 'length', 'weight'],
      dataDescription: '대조군과 처리군 각각 20개체를 비교했다.',
    })

    expect(contract.sources).toHaveLength(1)
    expect(contract.sources[0]).toMatchObject({
      kind: 'dataset',
      label: 'growth.csv',
      origin: 'data-file',
      verification: {
        status: 'verified',
        evidence: '40 rows, 3 variables',
      },
    })
    expect(contract.sources[0]?.allowedClaims).toEqual([
      'source-label',
      'data-file-name',
      'row-count',
      'variable-count',
    ])
    expect(contract.warnings).toEqual([])
    expect(contract.errors).toEqual([])
  })

  it('blocks confirmed species wording when species verification is absent', () => {
    const contract = buildMaterialsSourceContract({
      dataFileName: 'growth.csv',
      rowCount: 40,
      variables: ['group', 'length'],
      dataDescription: '양식 어류 성장 자료',
      materialSources: [
        {
          kind: 'species',
          label: 'Salmo salar',
          scientificName: 'Salmo salar',
          origin: 'user-input',
          verificationStatus: 'missing',
        },
      ],
    })

    expect(hasUnsafeSpeciesSource(contract)).toBe(true)
    expect(contract.errors).toEqual(['Species source "Salmo salar" is missing.'])
    expect(contract.sources.find((source) => source.kind === 'species')?.allowedClaims).not.toContain('verified-species-name')
  })

  it('allows species identity only when verification is explicit', () => {
    const contract = buildMaterialsSourceContract({
      dataFileName: 'growth.csv',
      rowCount: 40,
      variables: ['group', 'length'],
      dataDescription: '양식 어류 성장 자료',
      materialSources: [
        {
          id: 'species:salmo-salar',
          kind: 'species',
          label: 'Atlantic salmon',
          scientificName: 'Salmo salar',
          origin: 'taxonomy-checker',
          verificationStatus: 'verified',
          verifiedBy: 'taxonomy-checker',
          evidence: 'taxon:8030',
        },
      ],
    })

    expect(hasUnsafeSpeciesSource(contract)).toBe(false)
    expect(contract.errors).toEqual([])
    expect(contract.sources.find((source) => source.kind === 'species')?.allowedClaims).toContain('verified-species-name')
    expect(getMaterialsSourceSummary(contract, 'ko')).toBe('source: 데이터셋 1개, 시료 0개, 검증된 종 1개')
  })

  it('preserves sampling details as explicit user-controlled context only', () => {
    const contract = buildMaterialsSourceContract({
      dataFileName: 'growth.csv',
      rowCount: 40,
      variables: ['group', 'length'],
      sampling: {
        collectionLocation: 'Jeju hatchery',
        equipment: ['caliper'],
        reagents: ['  '],
        ethicsApproval: 'IACUC-2026-01',
      },
    })

    expect(contract.sampling).toEqual({
      collectionLocation: 'Jeju hatchery',
      collectionPeriod: undefined,
      storageCondition: undefined,
      equipment: ['caliper'],
      reagents: [],
      ethicsApproval: 'IACUC-2026-01',
    })
    expect(contract.prohibitedAutoClaims).toContain('equipment-name')
    expect(contract.prohibitedAutoClaims).toContain('ethics-approval')
  })
})
