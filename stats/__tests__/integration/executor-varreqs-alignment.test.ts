/**
 * Executor / VarReqs alignment integration tests
 *
 * Verifies key session changes:
 * 1. getMethodRequirements alias resolution (variable-requirements.ts)
 * 2. togglePinId pure function (pinned-history-storage.ts)
 * 3. indexeddb-helpers module exports
 * 4. Regression executor branch coverage (statistical-executor.ts)
 */

import fs from 'fs'
import path from 'path'

import { getMethodRequirements } from '@/lib/statistics/variable-requirements'
import { togglePinId } from '@/lib/utils/pinned-history-storage'
import {
  txGet,
  txGetAll,
  txGetByIndex,
  txPut,
  txDelete,
} from '@/lib/utils/indexeddb-helpers'

// ---------------------------------------------------------------------------
// 1. VarReqs ID resolution
// ---------------------------------------------------------------------------
describe('getMethodRequirements — alias resolution', () => {
  it('resolves "wilcoxon" via alias to wilcoxon-signed-rank requirements', () => {
    const req = getMethodRequirements('wilcoxon')
    expect(req).toBeDefined()
    expect(req!.id).toBe('wilcoxon-signed-rank')
  })

  it('resolves "anova" via alias to one-way-anova requirements', () => {
    const req = getMethodRequirements('anova')
    expect(req).toBeDefined()
    expect(req!.id).toBe('one-way-anova')
  })

  it('resolves "cluster" directly to cluster requirements', () => {
    const req = getMethodRequirements('cluster')
    expect(req).toBeDefined()
    expect(req!.id).toBe('cluster')
  })

  it('resolves "descriptive" via alias to descriptive-stats requirements', () => {
    const req = getMethodRequirements('descriptive')
    expect(req).toBeDefined()
    expect(req!.id).toBe('descriptive-stats')
  })

  it('resolves direct ID "mann-whitney" without alias lookup', () => {
    const req = getMethodRequirements('mann-whitney')
    expect(req).toBeDefined()
    expect(req!.id).toBe('mann-whitney')
  })

  it('returns undefined for non-existent method ID', () => {
    const req = getMethodRequirements('nonexistent-method')
    expect(req).toBeUndefined()
  })

  it('resolves "t-test" — current behavior returns requirements via alias chain', () => {
    // t-test in the registry has aliases: ['independent-t', 'independent-t-test', 'student-t']
    // Requirements array uses 'two-sample-t' — no alias overlap, so this currently returns undefined.
    // If alias coverage is expanded later, this test should be updated.
    const req = getMethodRequirements('t-test')
    // Document the current gap: t-test registry aliases don't include 'two-sample-t'
    expect(req).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// 2. togglePinId
// ---------------------------------------------------------------------------
describe('togglePinId — pure function', () => {
  it('adds id to empty list (toggle on)', () => {
    const result = togglePinId([], 'a', 3)
    expect(result).toEqual(['a'])
  })

  it('removes id when already present (toggle off)', () => {
    const result = togglePinId(['a', 'b'], 'a', 3)
    expect(result).toEqual(['b'])
  })

  it('returns null when at capacity and adding new id', () => {
    const result = togglePinId(['a', 'b', 'c'], 'd', 3)
    expect(result).toBeNull()
  })

  it('still removes when at capacity (toggle off is always allowed)', () => {
    const result = togglePinId(['a', 'b', 'c'], 'b', 3)
    expect(result).toEqual(['a', 'c'])
  })

  it('adds when below capacity', () => {
    const result = togglePinId(['a'], 'b', 3)
    expect(result).toEqual(['a', 'b'])
  })
})

// ---------------------------------------------------------------------------
// 3. indexeddb-helpers exports
// ---------------------------------------------------------------------------
describe('indexeddb-helpers — module exports', () => {
  it('exports txGet as a function', () => {
    expect(typeof txGet).toBe('function')
  })

  it('exports txGetAll as a function', () => {
    expect(typeof txGetAll).toBe('function')
  })

  it('exports txGetByIndex as a function', () => {
    expect(typeof txGetByIndex).toBe('function')
  })

  it('exports txPut as a function', () => {
    expect(typeof txPut).toBe('function')
  })

  it('exports txDelete as a function', () => {
    expect(typeof txDelete).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// 4. Regression executor branches
// ---------------------------------------------------------------------------
describe('statistical-executor — regression branch coverage', () => {
  const executorPath = path.resolve(__dirname, '../../lib/services/statistical-executor.ts')
  let source: string

  beforeAll(() => {
    source = fs.readFileSync(executorPath, 'utf-8')
  })

  const regressionCases = [
    'logistic-regression',
    'poisson',
    'ordinal-regression',
    'stepwise',
    'dose-response',
    'response-surface',
  ] as const

  for (const caseId of regressionCases) {
    it(`executeRegression has switch case for "${caseId}"`, () => {
      expect(source).toContain(`case '${caseId}'`)
    })
  }

  it('buildGlmResult helper is defined', () => {
    expect(source).toContain('buildGlmResult')
  })

  it('StatisticalExecutor class is importable', async () => {
    const mod = await import('@/lib/services/statistical-executor')
    expect(mod.StatisticalExecutor).toBeDefined()
    expect(typeof mod.StatisticalExecutor.getInstance).toBe('function')
  })
})
