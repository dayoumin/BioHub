import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { BIO_TOOL_RESULT_CONTRACT_FIXTURES } from '@/lib/bio-tools/bio-tool-result-contract-fixtures'
import type { BioToolId } from '@/lib/bio-tools/bio-tool-registry'
import { loadBioToolHistory, type BioToolHistoryEntry } from '@/lib/bio-tools/bio-tool-history'
import { createDocumentSourceRef } from '../document-blueprint-types'
import {
  DEDICATED_BIO_TOOL_WRITING_SOURCE_TOOL_IDS,
  createNormalizedSupplementaryWritingSource,
  isDedicatedBioToolWritingSourceResult,
  writeNormalizedSourceBlock,
} from '../document-writing-source-registry'
import { summarizeBioToolResultShapeContracts } from '../document-writing-development-checklist'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function resolveRepoPath(path: string): string {
  return path.startsWith('stats/')
    ? resolve(process.cwd(), '..', path)
    : resolve(process.cwd(), path)
}

function hasPythonDictKey(source: string, key: string): boolean {
  const escapedKey = escapeRegExp(key)
  return (
    new RegExp(`['"]${escapedKey}['"]\\s*:`).test(source)
    || new RegExp(`\\[['"]${escapedKey}['"]\\]\\s*=`).test(source)
  )
}

function expectedBioToolSourceType(toolId: BioToolId): string {
  return `bio-tool-${toolId}`
}

function createHistoryEntry(fixture: (typeof BIO_TOOL_RESULT_CONTRACT_FIXTURES)[number]): BioToolHistoryEntry {
  return {
    id: `bio_${fixture.toolId}`,
    toolId: fixture.toolId,
    toolNameEn: fixture.toolNameEn,
    toolNameKo: fixture.toolNameKo,
    csvFileName: fixture.csvFileName,
    columnConfig: fixture.columnConfig,
    results: fixture.results,
    createdAt: 1,
  }
}

function collectResultKeys(value: unknown): string[] {
  if (typeof value !== 'object' || value === null) {
    return []
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectResultKeys)
  }

  return Object.entries(value).flatMap(([key, child]) => [
    key,
    ...collectResultKeys(child),
  ])
}

describe('Bio-Tools result contract fixtures', () => {
  it('covers every dedicated Bio-Tool writer with a guarded fixture', () => {
    const contractSummary = summarizeBioToolResultShapeContracts()

    expect(contractSummary.fixtureToolIds).toEqual([...DEDICATED_BIO_TOOL_WRITING_SOURCE_TOOL_IDS].sort())
    expect(contractSummary.missingFixtureToolIds).toEqual([])
    expect(contractSummary.staleFixtureToolIds).toEqual([])
    expect(contractSummary.duplicateFixtureToolIds).toEqual([])
    expect(contractSummary.invalidFixtureToolIds).toEqual([])
    expect(contractSummary.disallowedResultKeyPaths).toEqual([])
  })

  it('keeps fixture result keys compatible with Python worker camelCase output', () => {
    BIO_TOOL_RESULT_CONTRACT_FIXTURES.forEach((fixture) => {
      const keys = collectResultKeys(fixture.results)
      const snakeOrKebabKeys = keys.filter((key) => /[_\-\s]/.test(key))

      expect(snakeOrKebabKeys, fixture.toolId).toEqual([])
      expect(isDedicatedBioToolWritingSourceResult(fixture.toolId, fixture.results), fixture.toolId).toBe(true)
    })
  })

  it('anchors fixture schema keys to the Python worker producer boundary', () => {
    BIO_TOOL_RESULT_CONTRACT_FIXTURES.forEach((fixture) => {
      const workerSource = readFileSync(resolveRepoPath(fixture.producer.workerPath), 'utf-8')
      const missingKeys = fixture.producer.requiredResultKeys.filter((key) => !hasPythonDictKey(workerSource, key))

      expect(missingKeys, fixture.toolId).toEqual([])
    })
  })

  it('preserves fixture results through BioToolHistoryEntry.results and document-writing guards', () => {
    BIO_TOOL_RESULT_CONTRACT_FIXTURES.forEach((fixture) => {
      const [restored] = loadBioToolHistory(JSON.stringify([createHistoryEntry(fixture)]))

      expect(restored, fixture.toolId).toBeDefined()
      expect(restored?.toolId).toBe(fixture.toolId)
      expect(isDedicatedBioToolWritingSourceResult(fixture.toolId, restored?.results), fixture.toolId).toBe(true)
    })
  })

  it('routes fixture results through dedicated document-writing source output', () => {
    BIO_TOOL_RESULT_CONTRACT_FIXTURES.forEach((fixture) => {
      const entry = createHistoryEntry(fixture)
      const source = createNormalizedSupplementaryWritingSource({
        entityRef: {
          id: `ref_${fixture.toolId}`,
          projectId: 'proj_1',
          entityKind: 'bio-tool-result',
          entityId: entry.id,
          label: fixture.toolNameKo,
          createdAt: '2026-04-30T00:00:00.000Z',
        },
        sourceRef: createDocumentSourceRef('supplementary', entry.id, { label: fixture.toolNameKo }),
        language: 'ko',
        maps: {
          bioToolById: new Map([[entry.id, entry]]),
          blastById: new Map(),
          proteinById: new Map(),
          seqStatsById: new Map(),
          similarityById: new Map(),
          phylogenyById: new Map(),
          boldById: new Map(),
          translationById: new Map(),
        },
      })
      const block = writeNormalizedSourceBlock(source, 'supplementary', { language: 'ko' })

      expect(source.sourceType, fixture.toolId).toBe(expectedBioToolSourceType(fixture.toolId))
      expect(source.capabilities.canWriteSupplement, fixture.toolId).toBe(true)
      expect(block, fixture.toolId).not.toContain('입력 파일:')
      expect(block?.trim().length, fixture.toolId).toBeGreaterThan(0)
    })
  })
})
