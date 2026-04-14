import type { AIRecommendation, StatisticalMethod, SuggestedSettings } from '@/types/analysis'
import { getMethodByIdOrAlias, promoteMethodToCanonical } from '@/lib/constants/statistical-methods'

export const WELCH_ANOVA_DISPLAY_NAME = 'Welch ANOVA'
export const WELCH_ANOVA_DESCRIPTION = '등분산 가정 위반에 강건한 일원분산분석'

// Intentional boundary compatibility:
// external recommenders may surface a Welch ANOVA display name,
// but internal execution/storage should remain canonical one-way-anova + welch=true.
export function isWelchAnovaPresentation(
  method?: Pick<StatisticalMethod, 'id' | 'name'> | null
): boolean {
  if (!method) return false

  const canonicalId = getMethodByIdOrAlias(method.id)?.id ?? method.id
  return canonicalId === 'one-way-anova' && /welch\s*anova/i.test(method.name)
}

export function isWelchAnovaVariant(args: {
  method?: Pick<StatisticalMethod, 'id' | 'name'> | null
  suggestedSettings?: SuggestedSettings | null
}): boolean {
  const { method, suggestedSettings } = args
  if (!method) return false

  const canonicalId = getMethodByIdOrAlias(method.id)?.id ?? method.id
  if (canonicalId !== 'one-way-anova') return false

  return suggestedSettings?.welch === true || isWelchAnovaPresentation(method)
}

export function getWelchAnovaSuggestedSettings(
  base?: SuggestedSettings | null
): SuggestedSettings {
  return {
    ...(base ?? {}),
    welch: true,
    postHoc: 'games-howell',
  }
}

export function normalizeWelchAnovaMethod(
  method: StatisticalMethod,
  suggestedSettings?: SuggestedSettings | null
): {
  method: StatisticalMethod
  forcedSuggestedSettings: SuggestedSettings | null
} {
  const normalizedMethod = promoteMethodToCanonical(method)

  if (!isWelchAnovaVariant({ method, suggestedSettings })) {
    return { method: normalizedMethod, forcedSuggestedSettings: null }
  }

  return {
    method: {
      ...normalizedMethod,
      name: method.name || WELCH_ANOVA_DISPLAY_NAME,
      description: method.description || WELCH_ANOVA_DESCRIPTION,
    },
    forcedSuggestedSettings: getWelchAnovaSuggestedSettings(),
  }
}

export function normalizeWelchAnovaRecommendation(
  recommendation: AIRecommendation
): AIRecommendation {
  if (!isWelchAnovaVariant({
    method: recommendation.method,
    suggestedSettings: recommendation.suggestedSettings,
  })) {
    return recommendation
  }

  const normalized = normalizeWelchAnovaMethod(
    recommendation.method,
    recommendation.suggestedSettings,
  )
  return {
    ...recommendation,
    method: normalized.method,
    suggestedSettings: getWelchAnovaSuggestedSettings(recommendation.suggestedSettings),
  }
}
