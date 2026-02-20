#!/usr/bin/env tsx

/**
 * Result contract guard for high-risk methods.
 *
 * Validates that:
 * 1) method -> category mapping is stable
 * 2) method-specific required fields are configured
 * 3) required UI/additional fields have worker-side source fields
 */

import registry from '../../lib/constants/methods-registry.json'
import {
  METHOD_REQUIRED_FIELDS,
  METHOD_TO_CATEGORY,
  type StatisticsCategory
} from '../../lib/validation/result-schema-validator'

type SourceKind = 'worker' | 'derived'

interface FieldSourceSpec {
  source: string
  kind: SourceKind
}

interface ContractGuardSpec {
  methodId: string
  expectedCategory: StatisticsCategory
  registryMethod: string
  requiredAdditionalFields: string[]
  fieldSources: Record<string, FieldSourceSpec>
}

interface RegistryMethodInfo {
  workerId: string
  returns: string[]
}

const CONTRACT_GUARDS: ContractGuardSpec[] = [
  {
    methodId: 'correlation',
    expectedCategory: 'correlation',
    registryMethod: 'correlation_test',
    requiredAdditionalFields: [
      'additional.rSquared',
      'additional.pearson',
      'additional.spearman',
      'additional.kendall'
    ],
    fieldSources: {
      'additional.rSquared': { source: 'correlation', kind: 'derived' },
      'additional.pearson': { source: 'correlation', kind: 'derived' },
      'additional.spearman': { source: 'correlation', kind: 'derived' },
      'additional.kendall': { source: 'correlation', kind: 'derived' }
    }
  },
  {
    methodId: 'pearson-correlation',
    expectedCategory: 'correlation',
    registryMethod: 'correlation_test',
    requiredAdditionalFields: [
      'additional.rSquared',
      'additional.pearson',
      'additional.spearman',
      'additional.kendall'
    ],
    fieldSources: {
      'additional.rSquared': { source: 'correlation', kind: 'derived' },
      'additional.pearson': { source: 'correlation', kind: 'derived' },
      'additional.spearman': { source: 'correlation', kind: 'derived' },
      'additional.kendall': { source: 'correlation', kind: 'derived' }
    }
  },
  {
    methodId: 'pearson',
    expectedCategory: 'correlation',
    registryMethod: 'correlation_test',
    requiredAdditionalFields: ['additional.rSquared'],
    fieldSources: {
      'additional.rSquared': { source: 'correlation', kind: 'derived' }
    }
  },
  {
    methodId: 'normality-test',
    expectedCategory: 'goodnessOfFit',
    registryMethod: 'normality_test',
    requiredAdditionalFields: ['additional.isNormal'],
    fieldSources: {
      'additional.isNormal': { source: 'isNormal', kind: 'worker' }
    }
  },
  {
    methodId: 'shapiro-wilk',
    expectedCategory: 'goodnessOfFit',
    registryMethod: 'normality_test',
    requiredAdditionalFields: ['additional.isNormal'],
    fieldSources: {
      'additional.isNormal': { source: 'isNormal', kind: 'worker' }
    }
  },
  {
    methodId: 'pca',
    expectedCategory: 'dimensionReduction',
    registryMethod: 'pca_analysis',
    requiredAdditionalFields: [
      'additional.explainedVarianceRatio',
      'additional.eigenvalues'
    ],
    fieldSources: {
      'additional.explainedVarianceRatio': { source: 'screeData', kind: 'derived' },
      'additional.eigenvalues': { source: 'screeData', kind: 'derived' }
    }
  },
  {
    methodId: 'factor-analysis',
    expectedCategory: 'dimensionReduction',
    registryMethod: 'factor_analysis',
    requiredAdditionalFields: [
      'additional.explainedVarianceRatio',
      'additional.loadings',
      'additional.communalities'
    ],
    fieldSources: {
      'additional.explainedVarianceRatio': { source: 'explainedVarianceRatio', kind: 'worker' },
      'additional.loadings': { source: 'loadings', kind: 'worker' },
      'additional.communalities': { source: 'communalities', kind: 'worker' }
    }
  },
  {
    methodId: 'cluster-analysis',
    expectedCategory: 'dimensionReduction',
    registryMethod: 'cluster_analysis',
    requiredAdditionalFields: [
      'additional.clusters',
      'additional.centers',
      'additional.silhouetteScore'
    ],
    fieldSources: {
      'additional.clusters': { source: 'clusterAssignments', kind: 'derived' },
      'additional.centers': { source: 'centroids', kind: 'derived' },
      'additional.silhouetteScore': { source: 'silhouetteScore', kind: 'worker' }
    }
  }
]

function findRegistryMethod(methodName: string): RegistryMethodInfo | null {
  const entries = Object.entries(registry as Record<string, unknown>)

  for (const [key, value] of entries) {
    if (!key.startsWith('worker')) continue
    if (!value || typeof value !== 'object') continue

    const methods = (value as { methods?: Record<string, { returns?: string[] }> }).methods
    if (!methods) continue

    const method = methods[methodName]
    if (!method) continue

    return {
      workerId: key,
      returns: Array.isArray(method.returns) ? method.returns : []
    }
  }

  return null
}

function main(): void {
  const errors: string[] = []
  const info: string[] = []

  for (const spec of CONTRACT_GUARDS) {
    const mappedCategory = METHOD_TO_CATEGORY[spec.methodId]
    if (mappedCategory !== spec.expectedCategory) {
      errors.push(
        `[${spec.methodId}] category mismatch: expected=${spec.expectedCategory}, actual=${mappedCategory ?? 'undefined'}`
      )
    }

    const methodRequired = METHOD_REQUIRED_FIELDS[spec.methodId] ?? []
    for (const requiredField of spec.requiredAdditionalFields) {
      if (!methodRequired.includes(requiredField)) {
        errors.push(`[${spec.methodId}] missing METHOD_REQUIRED_FIELDS entry: ${requiredField}`)
      }
    }

    const registryMethod = findRegistryMethod(spec.registryMethod)
    if (!registryMethod) {
      errors.push(`[${spec.methodId}] registry method not found: ${spec.registryMethod}`)
      continue
    }

    for (const [targetField, sourceSpec] of Object.entries(spec.fieldSources)) {
      if (!registryMethod.returns.includes(sourceSpec.source)) {
        errors.push(
          `[${spec.methodId}] source field missing in registry returns: ${sourceSpec.source} (for ${targetField})`
        )
      }

      if (!spec.requiredAdditionalFields.includes(targetField)) {
        errors.push(
          `[${spec.methodId}] fieldSources key must be declared in requiredAdditionalFields: ${targetField}`
        )
      }
    }

    info.push(
      `[ok] ${spec.methodId} -> ${spec.registryMethod} (${registryMethod.workerId}, ${spec.requiredAdditionalFields.length} required fields)`
    )
  }

  // bonferroni는 실행 method가 아닌 worker utility 계약으로 별도 추적
  const bonferroniRegistry = findRegistryMethod('bonferroni_correction')
  if (!bonferroniRegistry) {
    errors.push('[bonferroni] registry method not found: bonferroni_correction')
  } else {
    const requiredUtilityReturns = ['adjustedPValues', 'significantResults', 'correctedAlpha']
    for (const field of requiredUtilityReturns) {
      if (!bonferroniRegistry.returns.includes(field)) {
        errors.push(`[bonferroni] missing utility return field: ${field}`)
      }
    }
    info.push(
      `[ok] bonferroni utility -> bonferroni_correction (${bonferroniRegistry.workerId}, utility contract)`
    )
  }

  if (METHOD_TO_CATEGORY.bonferroni) {
    errors.push('[bonferroni] should not be in METHOD_TO_CATEGORY (utility only)')
  }

  console.log('\n[Result Contract Guard] High-risk method checks')
  for (const line of info) {
    console.log(`  ${line}`)
  }

  if (errors.length > 0) {
    console.error('\n[Result Contract Guard] FAILED')
    for (const error of errors) {
      console.error(`  - ${error}`)
    }
    process.exit(1)
  }

  console.log('\n[Result Contract Guard] PASSED')
}

main()
