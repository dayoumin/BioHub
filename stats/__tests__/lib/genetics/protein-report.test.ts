import { describe, expect, it } from 'vitest'
import { buildProteinInterpretationMarkdown } from '@/lib/genetics/protein-report'

describe('buildProteinInterpretationMarkdown', () => {
  it('protein interpretation 상태를 보고서용 markdown으로 묶는다', () => {
    const markdown = buildProteinInterpretationMarkdown({
      analysisName: 'HBB protein summary',
      accession: 'P68871',
      result: {
        molecularWeight: 15867.2,
        isoelectricPoint: 6.75,
        gravy: -0.231,
        aromaticity: 0.081,
        instabilityIndex: 32.1,
        isStable: true,
        sequenceLength: 147,
      },
      uniProtSummary: {
        sourceAccession: 'P68871',
        primaryAccession: 'P68871',
        uniProtId: 'HBB_HUMAN',
        entryType: 'UniProtKB reviewed (Swiss-Prot)',
        reviewed: true,
        proteinName: 'Hemoglobin subunit beta',
        alternativeNames: [],
        geneNames: ['HBB'],
        organismName: 'Homo sapiens',
        taxonId: 9606,
        sequenceLength: 147,
        annotationScore: 5,
        functions: ['Involved in oxygen transport from the lung to the various peripheral tissues.'],
        keywords: ['Oxygen transport', 'Heme'],
        goTerms: [],
        pdbIds: ['4HHB'],
        entryUrl: 'https://www.uniprot.org/uniprotkb/P68871/entry',
      },
      quickGoSummary: {
        id: 'GO:0005344',
        name: 'oxygen carrier activity',
        aspect: 'molecular_function',
        definition: 'Binding to oxygen and delivering it.',
        usage: null,
        comment: null,
        synonyms: [],
        ancestors: [{ id: 'GO:0003674', name: 'molecular_function' }],
        children: [],
        pathToRoot: [],
      },
      stringPartners: [
        {
          source: {
            queryIdentifier: 'P68871',
            stringId: '9606.ENSP00000494175',
            preferredName: 'HBB',
            taxonId: 9606,
            annotation: null,
          },
          partnerStringId: '9606.ENSP00000322421',
          partnerName: 'HBA1',
          score: 0.999,
          evidence: {
            neighborhood: 0,
            fusion: 0,
            phylogeny: 0,
            coexpression: 0.999,
            experimental: 0.973,
            database: 0.72,
            textmining: 0,
          },
        },
      ],
      reactomePathways: [
        {
          dbId: 1247673,
          stId: 'R-HSA-1247673',
          stIdVersion: null,
          displayName: 'Erythrocytes take up oxygen and release carbon dioxide',
          speciesName: 'Homo sapiens',
          isInDisease: false,
          isInferred: false,
          maxDepth: 2,
          releaseDate: null,
          doi: null,
          hasDiagram: true,
          hasEHLD: false,
          pathwayUrl: 'https://reactome.org/content/detail/R-HSA-1247673',
        },
      ],
      reactomeEnrichment: {
        token: 'token',
        queryIdentifiers: ['HBB', 'HBA1'],
        identifiersNotFound: 0,
        pathwaysFound: 1,
        warnings: [],
        pathways: [
          {
            stId: 'R-HSA-1247673',
            dbId: 1247673,
            name: 'Erythrocytes take up oxygen and release carbon dioxide',
            speciesName: 'Homo sapiens',
            entitiesFound: 2,
            entitiesTotal: 16,
            reactionsFound: 1,
            reactionsTotal: 6,
            pValue: 9.7e-6,
            fdr: 1.7e-4,
            inDisease: false,
            lowLevelPathway: true,
            pathwayUrl: 'https://reactome.org/content/detail/R-HSA-1247673',
          },
        ],
      },
      pdbStructures: [
        {
          pdbId: '4HHB',
          title: 'Deoxy human hemoglobin',
          keywords: ['OXYGEN TRANSPORT'],
          experimentalMethods: ['X-RAY DIFFRACTION'],
          resolutionAngstrom: 1.74,
          assemblyCount: 1,
          proteinEntityCount: 2,
          depositedModelCount: 1,
          releaseDate: '1984-07-17T00:00:00.000+00:00',
          revisionDate: '2024-05-22T00:00:00.000+00:00',
          citationTitle: null,
          citationDoi: null,
          citationYear: null,
          entryUrl: 'https://www.rcsb.org/structure/4HHB',
        },
      ],
      alphaFoldPrediction: {
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
      },
    })

    expect(markdown).toContain('# HBB protein summary')
    expect(markdown).toContain('## UniProt Summary')
    expect(markdown).toContain('## GO Focus')
    expect(markdown).toContain('## STRING Partners')
    expect(markdown).toContain('## Pathway Interpretation')
    expect(markdown).toContain('## Structure Support')
    expect(markdown).toContain('4HHB Deoxy human hemoglobin')
    expect(markdown).toContain('Mean pLDDT')
  })
})
