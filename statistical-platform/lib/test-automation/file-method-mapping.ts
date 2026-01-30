/**
 * File-Method Mapping for Test Impact Analysis
 *
 * Maps source files to affected statistical methods.
 * Used by pre-commit hook and dashboard to identify
 * which methods need revalidation after code changes.
 *
 * SSOT: worker-method-mapping.json
 * - Worker -> Method mappings
 * - Global impact files (with impactLevel)
 * - State transition rules
 *
 * @see CLAUDE.md - Section: AI 코딩 품질 보증 워크플로우
 */

import { ALL_STATISTICS_PAGES } from '@/lib/constants/method-page-mapping'
import workerMappingData from './worker-method-mapping.json'

// ============================================================================
// Types
// ============================================================================

export type ImpactLevel = 'critical' | 'high' | 'medium' | 'low'

export interface FileMethodMapping {
  /** Glob pattern or path substring to match */
  pattern: string
  /** Method IDs affected by changes to this file */
  affectedMethods: string[]
  /** Impact severity */
  impactLevel: ImpactLevel
  /** Human-readable description */
  description: string
}

export type TestStatus = 'pass' | 'fail' | 'untested'

export interface MethodTestStatus {
  methodId: string
  status: TestStatus
  lastTested: string | null
  needsRevalidation: boolean
  notes?: string
}

// ============================================================================
// Worker -> Method Mappings (from SSOT JSON)
// ============================================================================

/**
 * Python Worker files and their associated methods
 * Source: worker-method-mapping.json (Single Source of Truth)
 */
export const WORKER_METHOD_MAPPING: Record<string, string[]> = Object.fromEntries(
  Object.entries(workerMappingData.workers).map(([worker, data]) => [
    worker,
    (data as { methods: string[] }).methods,
  ])
)

/**
 * Global impact files that affect all methods
 * Source: worker-method-mapping.json
 */
interface GlobalImpactFile {
  pattern: string
  impactLevel: ImpactLevel
  description: string
}

const globalImpactFiles: GlobalImpactFile[] = (
  workerMappingData.globalImpactFiles as GlobalImpactFile[]
)

/**
 * Critical files (impactLevel: critical) - for backward compatibility
 */
export const CRITICAL_FILES: string[] = globalImpactFiles
  .filter(f => f.impactLevel === 'critical')
  .map(f => f.pattern)

// ============================================================================
// File -> Method Mappings (Full)
// ============================================================================

/**
 * Complete file-to-method mapping for impact analysis
 * Source: worker-method-mapping.json (Single Source of Truth)
 */
export const FILE_METHOD_MAPPINGS: FileMethodMapping[] = [
  // ---------------------------------------------------------------------------
  // Python Workers (affect their specific methods)
  // ---------------------------------------------------------------------------
  ...Object.entries(WORKER_METHOD_MAPPING).map(([worker, methods]) => ({
    pattern: `workers/python/${worker}`,
    affectedMethods: methods,
    impactLevel: 'critical' as ImpactLevel,
    description: (workerMappingData.workers as Record<string, { description: string }>)[worker]?.description || worker,
  })),

  // ---------------------------------------------------------------------------
  // Global Impact Files (from JSON SSOT)
  // ---------------------------------------------------------------------------
  ...globalImpactFiles.map(file => ({
    pattern: file.pattern,
    affectedMethods: ['*'],
    impactLevel: file.impactLevel,
    description: file.description,
  })),

  // ---------------------------------------------------------------------------
  // Individual Page Files
  // ---------------------------------------------------------------------------
  ...ALL_STATISTICS_PAGES
    .filter(page => page !== 'non-parametric') // Overview page, not a method
    .map(page => ({
      pattern: `statistics/${page}/page.tsx`,
      affectedMethods: [page],
      impactLevel: 'high' as ImpactLevel,
      description: `${page} page component`,
    })),
]

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all method IDs from worker mappings
 */
export function getAllMappedMethods(): string[] {
  const methods = new Set<string>()
  Object.values(WORKER_METHOD_MAPPING).forEach(workerMethods => {
    workerMethods.forEach(m => methods.add(m))
  })
  return Array.from(methods).sort()
}

/**
 * Find affected methods for a list of changed files
 */
export function getAffectedMethods(changedFiles: string[]): {
  methods: Set<string>
  isAllAffected: boolean
  criticalChanges: string[]
} {
  const methods = new Set<string>()
  const criticalChanges: string[] = []
  let isAllAffected = false

  for (const file of changedFiles) {
    for (const mapping of FILE_METHOD_MAPPINGS) {
      if (file.includes(mapping.pattern)) {
        if (mapping.affectedMethods.includes('*')) {
          isAllAffected = true
          if (mapping.impactLevel === 'critical') {
            criticalChanges.push(file)
          }
        } else {
          mapping.affectedMethods.forEach(m => methods.add(m))
        }

        if (mapping.impactLevel === 'critical' && !mapping.affectedMethods.includes('*')) {
          criticalChanges.push(file)
        }
      }
    }
  }

  return { methods, isAllAffected, criticalChanges }
}

/**
 * Get the worker file for a method
 */
export function getWorkerForMethod(methodId: string): string | null {
  for (const [worker, methods] of Object.entries(WORKER_METHOD_MAPPING)) {
    if (methods.includes(methodId)) {
      return worker
    }
  }
  return null
}

// ============================================================================
// Completeness Validation
// ============================================================================

/**
 * Validate that all statistics pages have corresponding worker mappings
 * Run this to ensure no methods are missing from the mapping
 */
export function validateMappingCompleteness(): {
  isComplete: boolean
  missingMethods: string[]
  extraMethods: string[]
  report: string
} {
  const mappedMethods = new Set(getAllMappedMethods())
  const statisticsPagesArray = ALL_STATISTICS_PAGES.filter(p => p !== 'non-parametric')
  const statisticsPages = new Set<string>(statisticsPagesArray)

  const missingMethods: string[] = []
  const extraMethods: string[] = []

  // Check for pages without worker mapping
  for (const page of statisticsPages) {
    if (!mappedMethods.has(page)) {
      missingMethods.push(page)
    }
  }

  // Check for mapped methods without pages
  for (const method of mappedMethods) {
    if (!statisticsPages.has(method)) {
      extraMethods.push(method)
    }
  }

  const isComplete = missingMethods.length === 0

  const report = [
    '=== Mapping Completeness Report ===',
    `Total Pages: ${statisticsPages.size}`,
    `Mapped Methods: ${mappedMethods.size}`,
    `Status: ${isComplete ? 'COMPLETE' : 'INCOMPLETE'}`,
    '',
    missingMethods.length > 0
      ? `Missing from mapping (${missingMethods.length}):\n  - ${missingMethods.join('\n  - ')}`
      : 'No missing methods',
    '',
    extraMethods.length > 0
      ? `Extra in mapping (${extraMethods.length}):\n  - ${extraMethods.join('\n  - ')}`
      : 'No extra methods',
  ].join('\n')

  return { isComplete, missingMethods, extraMethods, report }
}

// ============================================================================
// Export for scripts
// ============================================================================

export const STATISTICS_PAGE_COUNT = ALL_STATISTICS_PAGES.filter(
  p => p !== 'non-parametric'
).length
