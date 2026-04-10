import { describe, expect, it } from 'vitest'
import { AlphaFoldError, parseAlphaFoldPrediction } from '@/lib/genetics/alphafold'

describe('parseAlphaFoldPrediction', () => {
  it('AlphaFold API 응답을 fallback 카드용 요약으로 변환한다', () => {
    const summary = parseAlphaFoldPrediction({
      toolUsed: 'AlphaFold Monomer v2.0 pipeline',
      providerId: 'GDM',
      modelEntityId: 'AF-P68871-F1',
      modelCreatedDate: '2025-08-01T00:00:00Z',
      globalMetricValue: 97.19,
      fractionPlddtVeryLow: 0,
      fractionPlddtLow: 0.007,
      fractionPlddtConfident: 0.02,
      fractionPlddtVeryHigh: 0.973,
      latestVersion: 6,
      gene: 'HBB',
      uniprotAccession: 'P68871',
      uniprotId: 'HBB_HUMAN',
      uniprotDescription: 'Hemoglobin subunit beta',
      organismScientificName: 'Homo sapiens',
      taxId: 9606,
      pdbUrl: 'https://alphafold.ebi.ac.uk/files/AF-P68871-F1-model_v6.pdb',
      cifUrl: 'https://alphafold.ebi.ac.uk/files/AF-P68871-F1-model_v6.cif',
      bcifUrl: 'https://alphafold.ebi.ac.uk/files/AF-P68871-F1-model_v6.bcif',
      paeImageUrl: 'https://alphafold.ebi.ac.uk/files/AF-P68871-F1-predicted_aligned_error_v6.png',
      plddtDocUrl: 'https://alphafold.ebi.ac.uk/files/AF-P68871-F1-confidence_v6.json',
      paeDocUrl: 'https://alphafold.ebi.ac.uk/files/AF-P68871-F1-predicted_aligned_error_v6.json',
      entryId: 'AF-P68871-F1',
      isComplex: false,
      isReviewed: true,
    })

    expect(summary).toEqual({
      accession: 'P68871',
      entryId: 'AF-P68871-F1',
      modelEntityId: 'AF-P68871-F1',
      proteinName: 'Hemoglobin subunit beta',
      geneName: 'HBB',
      organismName: 'Homo sapiens',
      providerId: 'GDM',
      toolUsed: 'AlphaFold Monomer v2.0 pipeline',
      meanPlddt: 97.19,
      fractionVeryLow: 0,
      fractionLow: 0.007,
      fractionConfident: 0.02,
      fractionVeryHigh: 0.973,
      latestVersion: 6,
      modelCreatedDate: '2025-08-01T00:00:00Z',
      taxId: 9606,
      isComplex: false,
      isReviewed: true,
      entryUrl: 'https://alphafold.ebi.ac.uk/entry/AF-P68871-F1',
      pdbUrl: 'https://alphafold.ebi.ac.uk/files/AF-P68871-F1-model_v6.pdb',
      cifUrl: 'https://alphafold.ebi.ac.uk/files/AF-P68871-F1-model_v6.cif',
      bcifUrl: 'https://alphafold.ebi.ac.uk/files/AF-P68871-F1-model_v6.bcif',
      paeImageUrl: 'https://alphafold.ebi.ac.uk/files/AF-P68871-F1-predicted_aligned_error_v6.png',
      plddtDocUrl: 'https://alphafold.ebi.ac.uk/files/AF-P68871-F1-confidence_v6.json',
      paeDocUrl: 'https://alphafold.ebi.ac.uk/files/AF-P68871-F1-predicted_aligned_error_v6.json',
    })
  })

  it('entry ID가 없으면 에러를 던진다', () => {
    expect(() => parseAlphaFoldPrediction({ uniprotAccession: 'P68871' })).toThrow(AlphaFoldError)
  })
})
