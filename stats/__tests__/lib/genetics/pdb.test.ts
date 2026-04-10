import { describe, expect, it } from 'vitest'
import {
  fetchPdbStructureSummaries,
  parsePdbStructureSummary,
  PdbError,
} from '@/lib/genetics/pdb'

describe('parsePdbStructureSummary', () => {
  it('RCSB core entry 응답을 구조 메타데이터로 요약한다', () => {
    const summary = parsePdbStructureSummary({
      rcsb_id: '4HHB',
      struct: {
        title: 'THE CRYSTAL STRUCTURE OF HUMAN DEOXYHAEMOGLOBIN AT 1.74 ANGSTROMS RESOLUTION',
      },
      struct_keywords: {
        pdbx_keywords: 'OXYGEN TRANSPORT',
        text: 'OXYGEN TRANSPORT, HEME PROTEIN',
      },
      exptl: [{ method: 'X-RAY DIFFRACTION' }],
      rcsb_entry_info: {
        resolution_combined: [1.74],
        assembly_count: 1,
        polymer_entity_count_protein: 2,
        deposited_model_count: 1,
      },
      rcsb_accession_info: {
        initial_release_date: '1984-07-17T00:00:00.000+00:00',
        revision_date: '2024-05-22T00:00:00.000+00:00',
      },
      rcsb_primary_citation: {
        title: 'The crystal structure of human deoxyhaemoglobin',
        pdbx_database_id_DOI: '10.1038/XYZ',
        year: 1984,
      },
    })

    expect(summary).toEqual({
      pdbId: '4HHB',
      title: 'THE CRYSTAL STRUCTURE OF HUMAN DEOXYHAEMOGLOBIN AT 1.74 ANGSTROMS RESOLUTION',
      keywords: ['OXYGEN TRANSPORT', 'HEME PROTEIN'],
      experimentalMethods: ['X-RAY DIFFRACTION'],
      resolutionAngstrom: 1.74,
      assemblyCount: 1,
      proteinEntityCount: 2,
      depositedModelCount: 1,
      releaseDate: '1984-07-17T00:00:00.000+00:00',
      revisionDate: '2024-05-22T00:00:00.000+00:00',
      citationTitle: 'The crystal structure of human deoxyhaemoglobin',
      citationDoi: '10.1038/XYZ',
      citationYear: 1984,
      entryUrl: 'https://www.rcsb.org/structure/4HHB',
    })
  })

  it('유효한 PDB ID가 없으면 에러를 던진다', () => {
    expect(() => parsePdbStructureSummary({ rcsb_id: 'bad-id' })).toThrow(PdbError)
  })
})

describe('fetchPdbStructureSummaries input handling', () => {
  it('중복과 잘못된 ID를 제거하고 남은 값이 없으면 에러를 던진다', async () => {
    await expect(fetchPdbStructureSummaries(['', 'ABCDE', '12'], { limit: 2 })).rejects.toThrow(PdbError)
  })
})
