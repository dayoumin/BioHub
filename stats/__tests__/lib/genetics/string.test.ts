import { describe, expect, it } from 'vitest'
import {
  parseStringResolvedTarget,
  parseStringPartnerSummaries,
  StringError,
} from '@/lib/genetics/string'

describe('parseStringResolvedTarget', () => {
  it('STRING identifier mapping을 요약한다', () => {
    const target = parseStringResolvedTarget('P68871', {
      stringId: '9606.ENSP00000494175',
      preferredName: 'HBB',
      ncbiTaxonId: 9606,
      annotation: 'Hemoglobin subunit beta',
    })

    expect(target).toEqual({
      queryIdentifier: 'P68871',
      stringId: '9606.ENSP00000494175',
      preferredName: 'HBB',
      taxonId: 9606,
      annotation: 'Hemoglobin subunit beta',
    })
  })

  it('stringId가 없으면 에러를 던진다', () => {
    expect(() => parseStringResolvedTarget('P68871', {})).toThrow(StringError)
  })
})

describe('parseStringPartnerSummaries', () => {
  it('partner score와 evidence를 정렬해서 반환한다', () => {
    const source = parseStringResolvedTarget('P68871', {
      stringId: '9606.ENSP00000494175',
      preferredName: 'HBB',
      ncbiTaxonId: 9606,
    })

    const partners = parseStringPartnerSummaries(source, [
      {
        stringId_B: '9606.ENSP00000322421',
        preferredName_B: 'HBA1',
        score: 0.999,
        ascore: 0.999,
        escore: 0.973,
        dscore: 0.72,
      },
      {
        stringId_B: '9606.ENSP00000251595',
        preferredName_B: 'HBA2',
        score: 0.95,
        tscore: 0.7,
      },
    ])

    expect(partners).toHaveLength(2)
    expect(partners[0].partnerName).toBe('HBA1')
    expect(partners[0].score).toBe(0.999)
    expect(partners[0].evidence.coexpression).toBe(0.999)
    expect(partners[1].partnerName).toBe('HBA2')
    expect(partners[1].evidence.textmining).toBe(0.7)
  })
})
