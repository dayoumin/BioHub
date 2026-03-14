import type { SelectorType } from './selector-types'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import type { StatisticalMethod } from '@/types/analysis'

export interface MethodRequirements {
  minSampleSize: number
  variableTypes: string[]
  assumptions?: string[]
}

export interface MethodRegistration {
  id: string
  selectorType: SelectorType
  aliases?: string[]
  requirements?: MethodRequirements
  name?: string
  koreanName?: string
  description?: string
  koreanDescription?: string
  category?: StatisticalMethod['category']
}

const selectorTypeMap = new Map<string, SelectorType>()
const requirementsMap = new Map<string, MethodRequirements>()

function assertSelectorTypeAvailable(
  id: string,
  selectorType: SelectorType,
  label: 'method' | 'alias'
): void {
  const existing = selectorTypeMap.get(id)
  if (existing !== undefined && existing !== selectorType) {
    throw new Error(
      `[method-registry] ${label} "${id}" is already registered as ` +
      `"${existing}", cannot re-register as "${selectorType}".`
    )
  }
}

const CANONICAL_FIELDS = ['name', 'category', 'description', 'koreanName', 'koreanDescription'] as const

function assertCanonicalMetadataCompatible(entry: MethodRegistration): void {
  const existing = STATISTICAL_METHODS[entry.id]
  if (!existing) return

  for (const field of CANONICAL_FIELDS) {
    const incoming = entry[field]
    if (incoming !== undefined && existing[field] !== incoming) {
      throw new Error(
        `[method-registry] method "${entry.id}" already exists with a different ${field}.`
      )
    }
  }
}

export function registerMethod(entry: MethodRegistration): void {
  // Phase 1: validate everything before mutating any state
  assertSelectorTypeAvailable(entry.id, entry.selectorType, 'method')
  assertCanonicalMetadataCompatible(entry)

  if (entry.aliases) {
    for (const alias of entry.aliases) {
      assertSelectorTypeAvailable(alias, entry.selectorType, 'alias')
    }
  }

  // Phase 2: all assertions passed — apply mutations
  selectorTypeMap.set(entry.id, entry.selectorType)

  if (entry.aliases) {
    for (const alias of entry.aliases) {
      selectorTypeMap.set(alias, entry.selectorType)
    }
  }

  if (entry.requirements) {
    requirementsMap.set(entry.id, entry.requirements)
  }

  if (entry.name && entry.category && !STATISTICAL_METHODS[entry.id]) {
    STATISTICAL_METHODS[entry.id] = {
      id: entry.id,
      name: entry.name,
      description: entry.description ?? '',
      category: entry.category,
      aliases: entry.aliases,
      koreanName: entry.koreanName,
      koreanDescription: entry.koreanDescription,
    }
  }
}

export function getSelectorType(methodId: string): SelectorType {
  return selectorTypeMap.get(methodId) ?? 'default'
}

export function getMethodRequirements(methodId: string): MethodRequirements | undefined {
  return requirementsMap.get(methodId)
}

export function getRegisteredMethodIds(): string[] {
  return [...selectorTypeMap.keys()]
}

export function getRegistrySize(): number {
  return selectorTypeMap.size
}

/** 테스트 전용: prefix로 시작하는 등록 항목을 일괄 제거 */
export function _unregisterByPrefix(prefix: string): void {
  for (const key of [...selectorTypeMap.keys()]) {
    if (key.startsWith(prefix)) selectorTypeMap.delete(key)
  }
  for (const key of [...requirementsMap.keys()]) {
    if (key.startsWith(prefix)) requirementsMap.delete(key)
  }
  for (const key of Object.keys(STATISTICAL_METHODS)) {
    if (key.startsWith(prefix)) delete STATISTICAL_METHODS[key]
  }
}

function bootSelectorTypes(entries: Array<[string, SelectorType]>): void {
  for (const [id, type] of entries) {
    const prev = selectorTypeMap.get(id)
    if (prev !== undefined && prev !== type) {
      throw new Error(
        `[method-registry/boot] "${id}" mapped to "${prev}", cannot remap to "${type}".`
      )
    }
    selectorTypeMap.set(id, type)
  }
}

// IMPORTANT: must NOT call registerMethod — circular import means
// STATISTICAL_METHODS may be empty at this point.
bootSelectorTypes([
  ['one-sample-t', 'one-sample'],
  ['binomial-test', 'one-sample'],
  ['runs-test', 'one-sample'],
  ['mann-kendall', 'one-sample'],
  ['normality-test', 'one-sample'],
  ['homogeneity-test', 'one-sample'],

  ['paired-t', 'paired'],
  ['wilcoxon', 'paired'],
  ['sign-test', 'paired'],
  ['cochran-q', 'paired'],

  ['two-sample-t', 'group-comparison'],
  ['welch-t', 'group-comparison'],
  ['one-way-anova', 'group-comparison'],
  ['ancova', 'group-comparison'],
  ['mann-whitney', 'group-comparison'],
  ['kruskal-wallis', 'group-comparison'],
  ['ks-test', 'group-comparison'],
  ['mood-median', 'group-comparison'],
  ['non-parametric', 'group-comparison'],
  ['means-plot', 'group-comparison'],
  ['dunn-test', 'group-comparison'],

  ['two-way-anova', 'two-way-anova'],

  ['correlation', 'correlation'],
  ['partial-correlation', 'correlation'],
  ['descriptive-stats', 'correlation'],
  ['explore-data', 'correlation'],
  ['pca', 'correlation'],
  ['factor-analysis', 'correlation'],
  ['k-means', 'correlation'],
  ['hierarchical', 'correlation'],
  ['reliability-analysis', 'correlation'],

  ['simple-regression', 'multiple-regression'],
  ['multiple-regression', 'multiple-regression'],
  ['logistic-regression', 'multiple-regression'],
  ['poisson-regression', 'multiple-regression'],
  ['ordinal-regression', 'multiple-regression'],
  ['dose-response', 'multiple-regression'],
  ['response-surface', 'multiple-regression'],
  ['stepwise-regression', 'multiple-regression'],

  ['chi-square', 'chi-square'],
  ['chi-square-goodness', 'chi-square'],
  ['chi-square-independence', 'chi-square'],
  ['mcnemar', 'chi-square'],
  ['proportion-test', 'chi-square'],

  ['friedman', 'auto'],
  ['repeated-measures-anova', 'auto'],
  ['manova', 'auto'],
  ['mixed-model', 'auto'],
  ['arima', 'auto'],
  ['seasonal-decompose', 'auto'],
  ['stationarity-test', 'auto'],
  ['kaplan-meier', 'auto'],
  ['cox-regression', 'auto'],
  ['discriminant', 'auto'],
  ['power-analysis', 'auto'],

  ['t-test', 'group-comparison'],
  ['anova', 'group-comparison'],
  ['regression', 'multiple-regression'],
  ['poisson', 'multiple-regression'],
  ['stepwise', 'multiple-regression'],
  ['cluster', 'correlation'],
  ['reliability', 'correlation'],
  ['descriptive', 'correlation'],
  ['roc-curve', 'auto'],
])
