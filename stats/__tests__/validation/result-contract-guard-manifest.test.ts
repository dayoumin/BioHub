import { describe, expect, it } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  globToRegExp,
  loadGuardManifest,
  matchChangedFiles,
} from '@/validation/scripts/result-contract-guard.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const manifestPath = path.resolve(__dirname, '../../validation/result-contract-guard.manifest.json')

describe('result contract guard manifest', () => {
  it('has critical paths and command groups', () => {
    const manifest = loadGuardManifest(manifestPath)

    expect(manifest.criticalPaths.length).toBeGreaterThan(0)
    expect(manifest.commands.length).toBeGreaterThan(0)
    expect(
      manifest.commands.every(
        (command: { name: unknown; run: unknown }) =>
          typeof command.name === 'string' && typeof command.run === 'string',
      ),
    ).toBe(true)
  })

  it('matches interpreter/export/method-identity changes', () => {
    const manifest = loadGuardManifest(manifestPath)
    const matched = matchChangedFiles([
      'stats/lib/services/result-interpreter.ts',
      'stats/lib/services/export/code-export.ts',
      'stats/lib/utils/method-identity.ts',
      'README.md',
    ], manifest.criticalPaths)

    expect(matched).toEqual([
      'stats/lib/services/result-interpreter.ts',
      'stats/lib/services/export/code-export.ts',
      'stats/lib/utils/method-identity.ts',
    ])
  })

  it('matches recommender normalization changes', () => {
    const manifest = loadGuardManifest(manifestPath)
    const matched = matchChangedFiles([
      'stats/lib/services/recommenders/openrouter-recommender.ts',
      'stats/lib/services/recommenders/decision-tree-recommender.ts',
      'stats/lib/services/recommenders/llm-recommender.ts',
      'stats/lib/services/recommenders/ollama-recommender.ts',
      'stats/__tests__/lib/services/openrouter-recommender.test.ts',
      'stats/__tests__/services/llm-recommender-simulation.test.ts',
      'README.md',
    ], manifest.criticalPaths)

    expect(matched).toEqual([
      'stats/lib/services/recommenders/openrouter-recommender.ts',
      'stats/lib/services/recommenders/decision-tree-recommender.ts',
      'stats/lib/services/recommenders/llm-recommender.ts',
      'stats/lib/services/recommenders/ollama-recommender.ts',
      'stats/__tests__/lib/services/openrouter-recommender.test.ts',
      'stats/__tests__/services/llm-recommender-simulation.test.ts',
    ])
  })

  it('includes a recommender guard command', () => {
    const manifest = loadGuardManifest(manifestPath)
    const recommenderCommand = manifest.commands.find(
      (command: { name: string; run: string }) => command.name === 'Run recommender normalization tests',
    )

    expect(recommenderCommand).toBeDefined()
    expect(recommenderCommand?.run).toContain('__tests__/lib/services/openrouter-recommender.test.ts')
    expect(recommenderCommand?.run).toContain('__tests__/services/llm-recommender-simulation.test.ts')
  })

  it('glob matcher handles nested directory patterns', () => {
    const matcher = globToRegExp('stats/lib/validation/**')

    expect(matcher.test('stats/lib/validation/result-schema.ts')).toBe(true)
    expect(matcher.test('stats/lib/validation/subdir/extra.ts')).toBe(true)
    expect(matcher.test('stats/lib/services/result-interpreter.ts')).toBe(false)
  })
})
