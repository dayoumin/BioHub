import { getMethodByIdOrAlias } from '@/lib/constants/statistical-methods'
import { WELCH_ANOVA_DISPLAY_NAME } from './welch-anova-variant'

const WELCH_T_DISPLAY_NAME = 'Welch t-Test'
const WELCH_T_VARIANT_LABEL = 'Welch t-test'

export interface ResolvedMethodIdentity {
  rawMethodId?: string
  canonicalMethodId: string
  displayMethodName: string
  executionVariant?: string
  executionVariantLabel: string | null
}

interface ResolveMethodIdentityArgs {
  methodId?: string | null
  methodName?: string | null
  testVariant?: string | null
}

function normalizeString(value?: string | null): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function resolveWelchDisplayName(
  canonicalMethodId: string,
  currentDisplayName: string,
): string {
  if (canonicalMethodId === 'one-way-anova') {
    return /welch\s*anova/i.test(currentDisplayName)
      ? currentDisplayName
      : WELCH_ANOVA_DISPLAY_NAME
  }

  if (canonicalMethodId === 'welch-t' || canonicalMethodId === 'two-sample-t' || canonicalMethodId === 't-test') {
    return /welch\s+t-?test/i.test(currentDisplayName)
      ? currentDisplayName
      : WELCH_T_DISPLAY_NAME
  }

  return currentDisplayName
}

function resolveVariantLabel(
  canonicalMethodId: string,
  executionVariant?: string,
): string | null {
  if (!executionVariant || executionVariant === 'standard') return null

  if (executionVariant === 'welch') {
    if (canonicalMethodId === 'one-way-anova') {
      return WELCH_ANOVA_DISPLAY_NAME
    }
    if (canonicalMethodId === 'welch-t' || canonicalMethodId === 'two-sample-t' || canonicalMethodId === 't-test') {
      return WELCH_T_VARIANT_LABEL
    }
    return 'Welch variant'
  }

  return executionVariant
}

export function resolveMethodIdentity(args: ResolveMethodIdentityArgs): ResolvedMethodIdentity {
  const rawMethodId = normalizeString(args.methodId)
  const explicitMethodName = normalizeString(args.methodName)
  const executionVariant = normalizeString(args.testVariant)

  const resolvedMethod = rawMethodId ? getMethodByIdOrAlias(rawMethodId) : null
  const canonicalMethodId = resolvedMethod?.id ?? rawMethodId ?? explicitMethodName ?? 'unknown-method'

  let displayMethodName = explicitMethodName ?? resolvedMethod?.name ?? rawMethodId ?? 'Unknown analysis'
  if (executionVariant === 'welch') {
    displayMethodName = resolveWelchDisplayName(canonicalMethodId, displayMethodName)
  }

  return {
    rawMethodId,
    canonicalMethodId,
    displayMethodName,
    executionVariant,
    executionVariantLabel: resolveVariantLabel(canonicalMethodId, executionVariant),
  }
}
