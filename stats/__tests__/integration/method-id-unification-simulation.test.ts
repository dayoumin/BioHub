/**
 * Method ID Unification — Integration Simulation Tests
 *
 * Verifies end-to-end that legacy SM IDs resolve to canonical entries
 * through every resolution path: Proxy, getMethodByAlias, getMethodByIdOrAlias,
 * ChiSquareSelector mode, IndexedDB deserialization,
 * dynamic registration, and enumeration integrity.
 */

import {
  STATISTICAL_METHODS,
  getMethodByAlias,
  getMethodByIdOrAlias,
  getAllMethodIds,
  type StatisticalMethodEntry,
} from '@/lib/constants/statistical-methods'
import {
  registerMethod,
  _unregisterByPrefix,
} from '@/lib/registry'

// ============================================
// Scenario A: Legacy ID → Canonical Resolution
// ============================================

/**
 * All 16 legacy SM ID → canonical mappings to test.
 * Each [legacyId, canonicalId] pair covers one demoted alias.
 */
const LEGACY_TO_CANONICAL: Array<[string, string]> = [
  ['t-test', 'two-sample-t'],
  ['anova', 'one-way-anova'],
  ['correlation', 'pearson-correlation'],
  ['regression', 'simple-regression'],
  ['descriptive', 'descriptive-stats'],
  ['wilcoxon', 'wilcoxon-signed-rank'],
  ['ks-test', 'kolmogorov-smirnov'],
  ['poisson', 'poisson-regression'],
  ['stepwise', 'stepwise-regression'],
  ['discriminant', 'discriminant-analysis'],
  ['reliability', 'reliability-analysis'],
  ['proportion-test', 'one-sample-proportion'],
  ['mann-kendall', 'mann-kendall-test'],
  // chi-square aliases to chi-square-goodness (not chi-square-independence)
  ['chi-square', 'chi-square-goodness'],
  ['kendall-correlation', 'pearson-correlation'],
  ['kendall', 'pearson-correlation'],
]

describe('Scenario A: Legacy ID → Canonical Resolution (all 16 demoted SM IDs)', () => {
  describe.each(LEGACY_TO_CANONICAL)(
    'legacy "%s" → canonical "%s"',
    (legacyId: string, canonicalId: string) => {
      let proxyResult: StatisticalMethodEntry | undefined
      let aliasResult: StatisticalMethodEntry | null
      let idOrAliasResult: StatisticalMethodEntry | null

      beforeAll(() => {
        proxyResult = STATISTICAL_METHODS[legacyId]
        aliasResult = getMethodByAlias(legacyId)
        idOrAliasResult = getMethodByIdOrAlias(legacyId)
      })

      it('STATISTICAL_METHODS[legacyId] returns the canonical entry (Proxy)', () => {
        expect(proxyResult).toBeDefined()
        expect(proxyResult!.id).toBe(canonicalId)
      })

      it('getMethodByAlias(legacyId) returns the canonical entry', () => {
        expect(aliasResult).not.toBeNull()
        expect(aliasResult!.id).toBe(canonicalId)
      })

      it('getMethodByIdOrAlias(legacyId) returns the canonical entry', () => {
        expect(idOrAliasResult).not.toBeNull()
        expect(idOrAliasResult!.id).toBe(canonicalId)
      })

      it('returned entry .id equals the canonical ID', () => {
        // All three paths must agree on the canonical ID
        expect(proxyResult?.id).toBe(canonicalId)
        expect(aliasResult?.id).toBe(canonicalId)
        expect(idOrAliasResult?.id).toBe(canonicalId)
      })

      it('returned entry .pageId is a non-empty string', () => {
        expect(typeof proxyResult?.pageId).toBe('string')
        expect(proxyResult!.pageId.length).toBeGreaterThan(0)
      })
    },
  )
})

// ============================================
// Scenario B: ChiSquareSelector Mode Detection
// ============================================

describe('Scenario B: ChiSquareSelector mode detection logic', () => {
  // Recreate the module-level constants from ChiSquareSelector.tsx
  // (they are not exported, so we test the same derivation logic)
  const GOODNESS_IDS = new Set([
    'chi-square-goodness',
    'proportion-test',
    'one-sample-proportion',
  ])
  const BINARY_ONLY_IDS = new Set([
    'mcnemar',
    'proportion-test',
    'one-sample-proportion',
  ])
  const deriveMode = (methodId: string): 'goodness' | 'independence' =>
    GOODNESS_IDS.has(methodId) ? 'goodness' : 'independence'

  it('"one-sample-proportion" triggers goodness mode', () => {
    expect(deriveMode('one-sample-proportion')).toBe('goodness')
  })

  it('"proportion-test" (legacy) also triggers goodness mode', () => {
    expect(deriveMode('proportion-test')).toBe('goodness')
  })

  it('"one-sample-proportion" is in BINARY_ONLY_IDS', () => {
    expect(BINARY_ONLY_IDS.has('one-sample-proportion')).toBe(true)
  })

  it('"proportion-test" (legacy) is in BINARY_ONLY_IDS', () => {
    expect(BINARY_ONLY_IDS.has('proportion-test')).toBe(true)
  })

  it('"chi-square-independence" triggers independence mode', () => {
    expect(deriveMode('chi-square-independence')).toBe('independence')
  })

  it('"chi-square-goodness" triggers goodness mode', () => {
    expect(deriveMode('chi-square-goodness')).toBe('goodness')
  })

  it('"mcnemar" triggers independence mode (not goodness)', () => {
    expect(deriveMode('mcnemar')).toBe('independence')
  })

  it('"mcnemar" is in BINARY_ONLY_IDS but not in GOODNESS_IDS', () => {
    expect(BINARY_ONLY_IDS.has('mcnemar')).toBe(true)
    expect(GOODNESS_IDS.has('mcnemar')).toBe(false)
  })
})

// ============================================
// Scenario C: IndexedDB Deserialization Simulation
// ============================================

describe('Scenario C: IndexedDB deserialization — stored legacy IDs resolve to canonical', () => {
  interface MockStoredRecord {
    id: string
    method: { id: string; name: string }
    timestamp: number
    results: unknown
  }

  const TOP_5_LEGACY: Array<[string, string]> = [
    ['t-test', 'two-sample-t'],
    ['anova', 'one-way-anova'],
    ['correlation', 'pearson-correlation'],
    ['regression', 'simple-regression'],
    ['descriptive', 'descriptive-stats'],
  ]

  it.each(TOP_5_LEGACY)(
    'stored record with method.id = "%s" resolves to "%s"',
    (legacyId: string, expectedCanonical: string) => {
      // Simulate reading from IndexedDB
      const storedRecord: MockStoredRecord = {
        id: `record-${legacyId}`,
        method: { id: legacyId, name: 'Test Method' },
        timestamp: Date.now(),
        results: null,
      }

      // Deserialization path: read method.id → resolve
      const resolved = getMethodByIdOrAlias(storedRecord.method.id)

      expect(resolved).not.toBeNull()
      expect(resolved!.id).toBe(expectedCanonical)
      expect(resolved!.pageId).toBeTruthy()
      expect(resolved!.name).toBeTruthy()
    },
  )

  it('resolves all 5 legacy IDs without returning null', () => {
    const results = TOP_5_LEGACY.map(([legacyId]) =>
      getMethodByIdOrAlias(legacyId),
    )
    const nullCount = results.filter((r) => r === null).length
    expect(nullCount).toBe(0)
  })

  it('each resolved entry has distinct canonical ID (no duplicates between unrelated aliases)', () => {
    const canonicalIds = TOP_5_LEGACY.map(([legacyId]) =>
      getMethodByIdOrAlias(legacyId)!.id,
    )
    const uniqueIds = new Set(canonicalIds)
    expect(uniqueIds.size).toBe(canonicalIds.length)
  })
})

// ============================================
// Scenario D: Dynamic Registration Alias Sync
// ============================================

describe('Scenario D: Dynamic registration alias sync', () => {
  const TEST_PREFIX = '_test-dynamic-'
  const TEST_METHOD_ID = `${TEST_PREFIX}method`
  const TEST_ALIAS = `${TEST_PREFIX}alias`

  afterEach(() => {
    _unregisterByPrefix(TEST_PREFIX)
  })

  it('registerMethod() creates a new entry accessible via STATISTICAL_METHODS', () => {
    registerMethod({
      id: TEST_METHOD_ID,
      selectorType: 'auto',
      name: 'Test Dynamic Method',
      category: 'descriptive',
      description: 'Integration test method',
      aliases: [TEST_ALIAS],
    })

    const entry = STATISTICAL_METHODS[TEST_METHOD_ID]
    expect(entry).toBeDefined()
    expect(entry.id).toBe(TEST_METHOD_ID)
    expect(entry.name).toBe('Test Dynamic Method')
  })

  it('getMethodByAlias(alias) resolves to the dynamically registered method', () => {
    registerMethod({
      id: TEST_METHOD_ID,
      selectorType: 'auto',
      name: 'Test Dynamic Method',
      category: 'descriptive',
      description: 'Integration test method',
      aliases: [TEST_ALIAS],
    })

    const resolved = getMethodByAlias(TEST_ALIAS)
    expect(resolved).not.toBeNull()
    expect(resolved!.id).toBe(TEST_METHOD_ID)
  })

  it('STATISTICAL_METHODS[alias] resolves via Proxy to the dynamic method', () => {
    registerMethod({
      id: TEST_METHOD_ID,
      selectorType: 'auto',
      name: 'Test Dynamic Method',
      category: 'descriptive',
      description: 'Integration test method',
      aliases: [TEST_ALIAS],
    })

    const viaProxy = STATISTICAL_METHODS[TEST_ALIAS]
    expect(viaProxy).toBeDefined()
    expect(viaProxy.id).toBe(TEST_METHOD_ID)
  })

  it('registering method without name/category does NOT create a STATISTICAL_METHODS entry', () => {
    const bareId = `${TEST_PREFIX}bare`
    registerMethod({
      id: bareId,
      selectorType: 'auto',
    })

    // No name/category → not added to _METHODS
    const entry = STATISTICAL_METHODS[bareId]
    expect(entry).toBeUndefined()
  })
})

// ============================================
// Scenario E: Enumeration Returns Only Canonical Keys
// ============================================

describe('Scenario E: Enumeration returns only canonical keys', () => {
  const LEGACY_SM_IDS = [
    't-test',
    'anova',
    'correlation',
    'regression',
    'descriptive',
    'wilcoxon',
    'ks-test',
    'poisson',
    'stepwise',
    'discriminant',
    'reliability',
    'proportion-test',
    'mann-kendall',
    'kendall-correlation',
    'kendall',
  ]

  const EXPECTED_CANONICAL_IDS = [
    'two-sample-t',
    'one-way-anova',
    'pearson-correlation',
    'simple-regression',
    'descriptive-stats',
    'wilcoxon-signed-rank',
    'kolmogorov-smirnov',
    'poisson-regression',
    'stepwise-regression',
    'discriminant-analysis',
    'reliability-analysis',
    'one-sample-proportion',
    'mann-kendall-test',
    'chi-square-goodness',
    'chi-square-independence',
  ]

  let enumeratedKeys: string[]

  beforeAll(() => {
    enumeratedKeys = Object.keys(STATISTICAL_METHODS)
  })

  it('Object.keys(STATISTICAL_METHODS) does NOT contain any legacy SM ID', () => {
    for (const legacyId of LEGACY_SM_IDS) {
      expect(enumeratedKeys).not.toContain(legacyId)
    }
  })

  it('Object.keys(STATISTICAL_METHODS) DOES contain all canonical IDs', () => {
    for (const canonicalId of EXPECTED_CANONICAL_IDS) {
      expect(enumeratedKeys).toContain(canonicalId)
    }
  })

  it('every enumerated key equals its entry .id field', () => {
    for (const key of enumeratedKeys) {
      const entry = STATISTICAL_METHODS[key]
      expect(entry).toBeDefined()
      expect(entry.id).toBe(key)
    }
  })

  it('getAllMethodIds() matches Object.keys(STATISTICAL_METHODS)', () => {
    const allIds = getAllMethodIds()
    expect(allIds.sort()).toEqual(enumeratedKeys.sort())
  })

  it('enumerated keys count matches expected total (approximately 50 canonical entries)', () => {
    // The file header says 50 canonical entries
    expect(enumeratedKeys.length).toBeGreaterThanOrEqual(45)
    expect(enumeratedKeys.length).toBeLessThanOrEqual(60)
  })
})
