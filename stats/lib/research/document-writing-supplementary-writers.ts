import {
  buildProteinInterpretationSectionMarkdown,
  type BarcodingHistoryEntry,
  type ProteinHistoryEntry,
} from '@/lib/genetics'
import { generateBlastContent } from './report-apa-format'

function deepenMarkdownHeadingLevels(markdown: string): string {
  return markdown.replace(/^(#{2,6})(\s+)/gm, (match, hashes: string, space: string) => {
    if (hashes.length >= 6) {
      return match
    }
    return `${hashes}#${space}`
  })
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeProteinReportSnapshot(reportMarkdown: string | undefined, sectionHeading: string): string | null {
  if (!reportMarkdown) {
    return null
  }

  const trimmed = reportMarkdown.trim()
  if (!trimmed) {
    return null
  }

  const withoutHeading = trimmed.replace(/^#\s+.+?\r?\n(?:\r?\n)?/, '')
  if (withoutHeading.trim()) {
    return deepenMarkdownHeadingLevels(withoutHeading.trim())
  }

  const fallback = trimmed.replace(new RegExp(`^#\\s+${escapeRegExp(sectionHeading)}\\s*$`, 'm'), '').trim()
  return fallback ? deepenMarkdownHeadingLevels(fallback) : null
}

export function buildBlastSupplementaryMarkdown(
  entry: BarcodingHistoryEntry | undefined,
  fallbackHeading: string,
  language: 'ko' | 'en',
): string {
  if (!entry?.resultData) {
    return ''
  }

  const blastHeading = entry?.sampleName ?? fallbackHeading
  const description = entry?.resultData?.description?.trim()
  const statusText = entry?.status ?? entry?.resultData?.status ?? null
  const topSpecies = entry?.topSpecies ?? (language === 'ko' ? '종 미확정' : 'Species unresolved')
  const identity = entry?.topIdentity != null
    ? `${(entry.topIdentity > 1 ? entry.topIdentity : entry.topIdentity * 100).toFixed(1)}%`
    : null
  const blastNarrative = entry?.resultData ? generateBlastContent(blastHeading, {
    kind: 'blast-result',
    status: entry.resultData.status,
    description: entry.resultData.description,
    topHits: entry.resultData.topHits,
  }) : null

  const lines = [`#### ${blastHeading}`, '']
  lines.push(description ?? `${topSpecies}${identity ? ` · ${identity}` : ''}${statusText ? ` · ${statusText}` : ''}`)
  lines.push('')
  lines.push(`- ${language === 'ko' ? '최상위 동정' : 'Top assignment'}: ${topSpecies}`)
  if (identity) {
    lines.push(`- ${language === 'ko' ? '최고 일치도' : 'Top identity'}: ${identity}`)
  }
  if (statusText) {
    lines.push(`- ${language === 'ko' ? '판정 상태' : 'Status'}: ${statusText}`)
  }
  if (entry?.marker) {
    lines.push(`- Marker: ${entry.marker}`)
  }
  if (entry?.resultData?.taxonAlert) {
    lines.push(`- ${language === 'ko' ? '분류군 주의' : 'Taxon alert'}: ${entry.resultData.taxonAlert.title} - ${entry.resultData.taxonAlert.recommendation}`)
  }
  if ((entry?.resultData?.recommendedMarkers?.length ?? 0) > 0) {
    lines.push(`- ${language === 'ko' ? '추가 권장 마커' : 'Recommended follow-up markers'}: ${entry?.resultData?.recommendedMarkers.slice(0, 3).map((item) => item.displayName).join(', ')}`)
  }
  if ((entry?.resultData?.topHits.length ?? 0) > 0) {
    lines.push('')
    lines.push(language === 'ko' ? '상위 hit:' : 'Top hits:')
    for (const hit of entry?.resultData?.topHits.slice(0, 3) ?? []) {
      const hitIdentity = hit.identity > 1 ? hit.identity : hit.identity * 100
      const hitDetails = [
        `${hit.species} (${hitIdentity.toFixed(1)}%)`,
        hit.accession,
        typeof hit.evalue === 'number' ? `E=${hit.evalue.toExponential(2)}` : null,
      ].filter((value): value is string => value !== null)
      lines.push(`- ${hitDetails.join(' · ')}`)
    }
  }
  if (blastNarrative?.body) {
    lines.push('')
    lines.push(blastNarrative.body)
  }
  lines.push('')

  return lines.join('\n')
}

export function buildProteinSupplementaryMarkdown(
  entry: ProteinHistoryEntry | undefined,
  fallbackHeading: string,
): string {
  const proteinHeading = entry?.analysisName ?? fallbackHeading
  const proteinSnapshot = entry
    ? normalizeProteinReportSnapshot(entry.reportMarkdown, proteinHeading)
    : null
  const proteinFallback = entry?.resultData
    ? buildProteinInterpretationSectionMarkdown({
        analysisName: proteinHeading,
        accession: entry.accession ?? null,
        result: {
          molecularWeight: entry.resultData.molecularWeight,
          isoelectricPoint: entry.resultData.isoelectricPoint,
          gravy: entry.resultData.gravy,
          aromaticity: entry.resultData.aromaticity,
          instabilityIndex: entry.resultData.instabilityIndex,
          isStable: entry.resultData.isStable,
          sequenceLength: entry.resultData.sequenceLength,
        },
      }).trim()
    : null

  const lines = [`#### ${proteinHeading}`, '']

  if (proteinSnapshot) {
    lines.push(proteinSnapshot)
  } else if (proteinFallback) {
    lines.push(deepenMarkdownHeadingLevels(proteinFallback))
  } else {
    lines.push(`- Sequence length: ${entry?.sequenceLength ?? 0} aa`)
    lines.push(`- Molecular weight: ${entry ? (entry.molecularWeight / 1000).toFixed(2) : '0.00'} kDa`)
    lines.push(`- Isoelectric point (pI): ${entry?.isoelectricPoint?.toFixed(2) ?? '0.00'}`)
    if (entry) {
      lines.push(`- Stability: ${entry.isStable ? 'stable' : 'unstable'}`)
    }
    if (entry?.accession) {
      lines.push(`- Input accession: ${entry.accession}`)
    }
  }

  lines.push('')
  return lines.join('\n')
}
