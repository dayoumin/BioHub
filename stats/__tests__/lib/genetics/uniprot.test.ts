import { describe, expect, it } from 'vitest'
import { parseUniProtEntry, UniProtError } from '@/lib/genetics/uniprot'

describe('parseUniProtEntry', () => {
  it('핵심 요약 필드를 추출한다', () => {
    const summary = parseUniProtEntry({
      entryType: 'UniProtKB reviewed (Swiss-Prot)',
      primaryAccession: 'P68871',
      uniProtkbId: 'HBB_HUMAN',
      annotationScore: 5,
      organism: { scientificName: 'Homo sapiens', taxonId: 9606 },
      proteinDescription: {
        recommendedName: { fullName: { value: 'Hemoglobin subunit beta' } },
        alternativeNames: [
          { fullName: { value: 'Beta-globin' } },
          { fullName: { value: 'Hemoglobin beta chain' } },
        ],
      },
      genes: [{ geneName: { value: 'HBB' } }],
      comments: [
        {
          commentType: 'FUNCTION',
          texts: [
            { value: 'Involved in oxygen transport.' },
            { value: 'Binds heme.' },
          ],
        },
        {
          commentType: 'SUBUNIT',
          texts: [{ value: 'Ignored comment type.' }],
        },
      ],
      keywords: [
        { name: 'Transport' },
        { name: '3D-structure' },
      ],
      uniProtKBCrossReferences: [
        {
          database: 'GO',
          id: 'GO:0015671',
          properties: [{ key: 'GoTerm', value: 'P:oxygen transport' }],
        },
        {
          database: 'GO',
          id: 'GO:0005344',
          properties: [{ key: 'GoTerm', value: 'F:oxygen carrier activity' }],
        },
        {
          database: 'PDB',
          id: '1A3N',
        },
      ],
      sequence: { length: 147 },
    }, 'NP_000509', 'RefSeq_Protein')

    expect(summary.sourceAccession).toBe('NP_000509')
    expect(summary.sourceDatabase).toBe('RefSeq_Protein')
    expect(summary.primaryAccession).toBe('P68871')
    expect(summary.uniProtId).toBe('HBB_HUMAN')
    expect(summary.reviewed).toBe(true)
    expect(summary.proteinName).toBe('Hemoglobin subunit beta')
    expect(summary.alternativeNames).toEqual(['Beta-globin', 'Hemoglobin beta chain'])
    expect(summary.geneNames).toEqual(['HBB'])
    expect(summary.organismName).toBe('Homo sapiens')
    expect(summary.taxonId).toBe(9606)
    expect(summary.sequenceLength).toBe(147)
    expect(summary.functions).toEqual(['Involved in oxygen transport.', 'Binds heme.'])
    expect(summary.keywords).toEqual(['Transport', '3D-structure'])
    expect(summary.goTerms).toEqual([
      { id: 'GO:0015671', aspect: 'process', term: 'oxygen transport' },
      { id: 'GO:0005344', aspect: 'function', term: 'oxygen carrier activity' },
    ])
    expect(summary.pdbIds).toEqual(['1A3N'])
    expect(summary.entryUrl).toBe('https://www.uniprot.org/uniprotkb/P68871/entry')
  })

  it('누락 필드를 안전하게 처리한다', () => {
    const summary = parseUniProtEntry({
      primaryAccession: 'Q00000',
      entryType: 'UniProtKB unreviewed (TrEMBL)',
    }, 'Q00000')

    expect(summary.reviewed).toBe(false)
    expect(summary.proteinName).toBe('이름 미상 단백질')
    expect(summary.geneNames).toEqual([])
    expect(summary.organismName).toBe('미상 생물')
    expect(summary.taxonId).toBeNull()
    expect(summary.functions).toEqual([])
    expect(summary.goTerms).toEqual([])
    expect(summary.pdbIds).toEqual([])
  })

  it('primary accession이 없으면 에러를 던진다', () => {
    expect(() => parseUniProtEntry({}, 'NP_000509')).toThrow(UniProtError)
  })
})
