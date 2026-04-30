'use client'

import { useMemo } from 'react'
import { loadBioToolHistory } from '@/lib/bio-tools/bio-tool-history'
import { loadGeneticsHistory, type GeneticsHistoryEntry } from '@/lib/genetics/analysis-history'
import { listProjects as listGraphProjects } from '@/lib/graph-studio/project-storage'
import { getDocumentSourceId, type DocumentSection } from '@/lib/research/document-blueprint-types'
import { getTabEntry } from '@/lib/research/entity-tab-registry'
import { listProjectEntityRefs } from '@/lib/research/project-storage'
import {
  buildAnalysisHistoryUrl,
  buildGraphStudioProjectUrl,
  buildProjectEntityNavigationUrl,
} from '@/lib/research/source-navigation'
import {
  getDocumentWritingSourceReadiness,
  type DocumentWritingSourceReadiness,
} from '@/lib/research/document-writing-source-readiness'
import type { ProjectEntityRef } from '@biohub/types'

export interface DocumentSourceLink {
  key: string
  label: string
  href: string
  kind: 'analysis' | 'figure' | 'supplementary'
  kindLabel: string
  readiness: DocumentWritingSourceReadiness
}

interface DocumentAnalysisSourceRecord {
  id: string
  name?: string
  method?: {
    name?: string
  } | null
}

interface UseDocumentSourceLinksInput {
  projectId: string | null
  activeSection: DocumentSection | null
  analysisHistory: DocumentAnalysisSourceRecord[]
  needsReassemble: boolean
  refreshKey?: number
}

function inferSupplementaryEntityKind(
  sourceId: string,
  bioToolById: ReadonlyMap<string, unknown>,
  geneticsById: ReadonlyMap<string, GeneticsHistoryEntry>,
): ProjectEntityRef['entityKind'] | null {
  if (bioToolById.has(sourceId)) {
    return 'bio-tool-result'
  }

  const geneticsEntry = geneticsById.get(sourceId)
  if (!geneticsEntry) {
    return null
  }

  switch (geneticsEntry.type) {
    case 'seq-stats':
      return 'seq-stats-result'
    case 'similarity':
      return 'similarity-result'
    case 'phylogeny':
      return 'phylogeny-result'
    case 'bold':
      return 'bold-result'
    case 'translation':
      return 'translation-result'
    case 'protein':
      return 'protein-result'
    default:
      return 'blast-result'
  }
}

function getGeneticsEntryLabel(entry: GeneticsHistoryEntry | undefined): string | undefined {
  if (!entry) {
    return undefined
  }

  if ('analysisName' in entry) {
    return entry.analysisName
  }

  if ('sampleName' in entry) {
    return entry.sampleName
  }

  return undefined
}

export function useDocumentSourceLinks({
  projectId,
  activeSection,
  analysisHistory,
  needsReassemble,
  refreshKey,
}: UseDocumentSourceLinksInput): DocumentSourceLink[] {
  return useMemo((): DocumentSourceLink[] => {
    if (!projectId || !activeSection) return []

    const projectRefs = listProjectEntityRefs(projectId)
    const refByEntityId = new Map(projectRefs.map((ref) => [ref.entityId, ref] as const))
    const historyById = new Map(analysisHistory.map((record) => [record.id, record]))
    const graphById = new Map(listGraphProjects().map((graph) => [graph.id, graph]))
    const bioToolById = new Map(loadBioToolHistory().map((entry) => [entry.id, entry] as const))
    const geneticsById = new Map(loadGeneticsHistory().map((entry) => [entry.id, entry] as const))
    const links = new Map<string, DocumentSourceLink>()

    for (const sourceRef of activeSection.sourceRefs) {
      const sourceId = getDocumentSourceId(sourceRef)
      const entityRef = refByEntityId.get(sourceId)
      const entityKind = entityRef?.entityKind ?? inferSupplementaryEntityKind(sourceId, bioToolById, geneticsById)

      if (entityKind === 'analysis' || historyById.has(sourceId)) {
        const record = historyById.get(sourceId)
        links.set(`analysis:${sourceId}`, {
          key: `analysis:${sourceId}`,
          label: record?.method?.name ?? record?.name ?? '원본 분석',
          href: buildAnalysisHistoryUrl(sourceId),
          kind: 'analysis',
          kindLabel: '통계',
          readiness: getDocumentWritingSourceReadiness({
            sourceKind: 'analysis',
            sectionId: activeSection.id,
            needsReassemble,
          }),
        })
        continue
      }

      if (entityKind === 'figure' || graphById.has(sourceId)) {
        const graph = graphById.get(sourceId)
        links.set(`figure:${sourceId}`, {
          key: `figure:${sourceId}`,
          label: graph?.name ?? 'Graph Studio',
          href: buildGraphStudioProjectUrl(sourceId),
          kind: 'figure',
          kindLabel: '그래프',
          readiness: getDocumentWritingSourceReadiness({
            sourceKind: 'figure',
            needsReassemble,
          }),
        })
        continue
      }

      if (entityKind) {
        const bioToolEntry = bioToolById.get(sourceId)
        const geneticsEntry = geneticsById.get(sourceId)
        const href = buildProjectEntityNavigationUrl(entityKind, sourceId, {
          bioToolId: bioToolEntry?.toolId,
        })
        if (!href) {
          continue
        }

        const tabEntry = getTabEntry(entityKind)
        const entryLabel = getGeneticsEntryLabel(geneticsEntry)
          ?? bioToolEntry?.toolNameKo
          ?? bioToolEntry?.toolNameEn

        links.set(`supplementary:${sourceId}`, {
          key: `supplementary:${sourceId}`,
          label: sourceRef.label ?? entityRef?.label ?? entryLabel ?? sourceId,
          href,
          kind: 'supplementary',
          kindLabel: tabEntry?.label ?? '보조 결과',
          readiness: getDocumentWritingSourceReadiness({
            sourceKind: 'supplementary',
            entityKind,
            needsReassemble,
            bioTool: bioToolEntry
              ? {
                toolId: bioToolEntry.toolId,
                results: bioToolEntry.results,
              }
              : undefined,
          }),
        })
      }
    }

    return Array.from(links.values())
  }, [activeSection, analysisHistory, needsReassemble, projectId, refreshKey])
}
