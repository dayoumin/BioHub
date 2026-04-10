import type { AlphaFoldPredictionSummary } from './alphafold'
import type { PdbStructureSummary } from './pdb'
import type { QuickGoTermSummary } from './quickgo'
import type { ReactomeEnrichmentResult, ReactomePathwaySummary } from './reactome'
import type { StringPartnerSummary } from './string'
import type { UniProtSummary } from './uniprot'

export interface ProteinReportResult {
  molecularWeight: number
  isoelectricPoint: number
  gravy?: number | null
  aromaticity?: number | null
  instabilityIndex?: number | null
  isStable: boolean
  sequenceLength: number
}

export interface ProteinInterpretationReportInput {
  analysisName: string
  accession: string | null
  result: ProteinReportResult
  uniProtSummary?: UniProtSummary | null
  quickGoSummary?: QuickGoTermSummary | null
  stringPartners?: StringPartnerSummary[]
  reactomePathways?: ReactomePathwaySummary[]
  reactomeEnrichment?: ReactomeEnrichmentResult | null
  pdbStructures?: PdbStructureSummary[]
  alphaFoldPrediction?: AlphaFoldPredictionSummary | null
}

function formatScientificMetric(value: number | null): string {
  if (value == null || Number.isNaN(value)) return 'n/a'
  if (value === 0) return '0'
  if (value >= 0.001 && value < 1) return value.toFixed(3)
  return value.toExponential(2)
}

function formatDate(dateString: string | null | undefined): string | null {
  if (!dateString) return null
  return dateString.slice(0, 10)
}

export function buildProteinInterpretationSectionMarkdown(input: ProteinInterpretationReportInput): string {
  const lines: string[] = []
  lines.push(`- Sequence length: ${input.result.sequenceLength} aa`)
  lines.push(`- Molecular weight: ${(input.result.molecularWeight / 1000).toFixed(2)} kDa`)
  lines.push(`- Isoelectric point (pI): ${input.result.isoelectricPoint.toFixed(2)}`)
  if (typeof input.result.gravy === 'number') {
    lines.push(`- GRAVY: ${input.result.gravy.toFixed(3)}`)
  }
  if (typeof input.result.aromaticity === 'number') {
    lines.push(`- Aromaticity: ${input.result.aromaticity.toFixed(3)}`)
  }
  if (typeof input.result.instabilityIndex === 'number') {
    lines.push(`- Instability index: ${input.result.instabilityIndex.toFixed(2)} (${input.result.isStable ? 'stable' : 'unstable'})`)
  } else {
    lines.push(`- Stability: ${input.result.isStable ? 'stable' : 'unstable'}`)
  }
  if (input.accession) {
    lines.push(`- Input accession: ${input.accession}`)
  }

  if (input.uniProtSummary) {
    lines.push('')
    lines.push('## UniProt Summary')
    lines.push('')
    lines.push(`- Entry: ${input.uniProtSummary.primaryAccession} (${input.uniProtSummary.uniProtId})`)
    lines.push(`- Protein: ${input.uniProtSummary.proteinName}`)
    lines.push(`- Organism: ${input.uniProtSummary.organismName}`)
    if (input.uniProtSummary.geneNames.length > 0) {
      lines.push(`- Gene: ${input.uniProtSummary.geneNames.join(', ')}`)
    }
    if (input.uniProtSummary.annotationScore != null) {
      lines.push(`- Annotation score: ${input.uniProtSummary.annotationScore.toFixed(1)}`)
    }
    if (input.uniProtSummary.functions.length > 0) {
      lines.push('')
      lines.push('### Functions')
      lines.push('')
      for (const fn of input.uniProtSummary.functions.slice(0, 3)) {
        lines.push(`- ${fn}`)
      }
    }
    if (input.uniProtSummary.keywords.length > 0) {
      lines.push('')
      lines.push(`Keywords: ${input.uniProtSummary.keywords.slice(0, 8).join(', ')}`)
    }
  }

  if (input.quickGoSummary) {
    lines.push('')
    lines.push('## GO Focus')
    lines.push('')
    lines.push(`- ${input.quickGoSummary.id} ${input.quickGoSummary.name}`)
    lines.push(`- Aspect: ${input.quickGoSummary.aspect}`)
    if (input.quickGoSummary.definition) {
      lines.push(`- Definition: ${input.quickGoSummary.definition}`)
    }
    if (input.quickGoSummary.ancestors.length > 0) {
      lines.push(`- Ancestors: ${input.quickGoSummary.ancestors.slice(0, 4).map((item) => `${item.id} ${item.name}`).join(' | ')}`)
    }
  }

  if ((input.stringPartners ?? []).length > 0) {
    lines.push('')
    lines.push('## STRING Partners')
    lines.push('')
    lines.push('| Partner | Combined score |')
    lines.push('| --- | ---: |')
    for (const partner of (input.stringPartners ?? []).slice(0, 8)) {
      lines.push(`| ${partner.partnerName} | ${partner.score.toFixed(3)} |`)
    }
  }

  if ((input.reactomePathways ?? []).length > 0 || input.reactomeEnrichment) {
    lines.push('')
    lines.push('## Pathway Interpretation')
    lines.push('')
    if ((input.reactomePathways ?? []).length > 0) {
      lines.push('### Direct Reactome Mapping')
      lines.push('')
      for (const pathway of (input.reactomePathways ?? []).slice(0, 5)) {
        lines.push(`- ${pathway.stId} ${pathway.displayName}`)
      }
      lines.push('')
    }

    if (input.reactomeEnrichment && input.reactomeEnrichment.pathways.length > 0) {
      lines.push('### STRING Network Enrichment')
      lines.push('')
      lines.push('| Pathway | Entities | FDR |')
      lines.push('| --- | ---: | ---: |')
      for (const pathway of input.reactomeEnrichment.pathways.slice(0, 5)) {
        lines.push(`| ${pathway.stId} ${pathway.name} | ${pathway.entitiesFound}/${pathway.entitiesTotal} | ${formatScientificMetric(pathway.fdr)} |`)
      }
    }
  }

  if ((input.pdbStructures ?? []).length > 0 || input.alphaFoldPrediction) {
    lines.push('')
    lines.push('## Structure Support')
    lines.push('')
    if ((input.pdbStructures ?? []).length > 0) {
      lines.push('### Experimental Structures (RCSB PDB)')
      lines.push('')
      for (const structure of (input.pdbStructures ?? []).slice(0, 4)) {
        const meta = [
          structure.experimentalMethods[0],
          structure.resolutionAngstrom != null ? `${structure.resolutionAngstrom.toFixed(2)} A` : null,
          formatDate(structure.releaseDate),
        ].filter((value): value is string => Boolean(value))
        lines.push(`- ${structure.pdbId} ${structure.title}${meta.length > 0 ? ` (${meta.join(' · ')})` : ''}`)
      }
      lines.push('')
    }

    if (input.alphaFoldPrediction) {
      lines.push('### AlphaFold Fallback')
      lines.push('')
      lines.push(`- Entry: ${input.alphaFoldPrediction.entryId}`)
      if (input.alphaFoldPrediction.meanPlddt != null) {
        lines.push(`- Mean pLDDT: ${input.alphaFoldPrediction.meanPlddt.toFixed(1)}`)
      }
      lines.push(`- Confidence split: very high ${(input.alphaFoldPrediction.fractionVeryHigh * 100).toFixed(1)}%, confident ${(input.alphaFoldPrediction.fractionConfident * 100).toFixed(1)}%, low ${((input.alphaFoldPrediction.fractionLow + input.alphaFoldPrediction.fractionVeryLow) * 100).toFixed(1)}%`)
      if (input.alphaFoldPrediction.modelCreatedDate) {
        lines.push(`- Model date: ${formatDate(input.alphaFoldPrediction.modelCreatedDate)}`)
      }
    }
  }

  lines.push('')
  return lines.join('\n')
}

export function buildProteinInterpretationMarkdown(input: ProteinInterpretationReportInput): string {
  const lines: string[] = []
  lines.push(`# ${input.analysisName}`)
  lines.push('')
  lines.push(buildProteinInterpretationSectionMarkdown(input))
  return lines.join('\n')
}
