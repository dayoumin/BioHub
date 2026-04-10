import type { StatisticalMethodRequirements } from '@/lib/statistics/variable-requirements'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'
import type { AnalysisOptions, SuggestedSettings } from '@/types/analysis'

export type ExecutionSettingValue = string | number | boolean | undefined
export type ExecutionSettingsRecord = Record<string, ExecutionSettingValue>

export interface ExecutionSettingEntry {
  key: string
  label: string
  value: string
}

interface BuildAnalysisExecutionContextArgs {
  analysisOptions: AnalysisOptions
  methodRequirements?: StatisticalMethodRequirements
  selectedMethodId?: string
  suggestedSettings?: SuggestedSettings | null
  variableMapping?: VariableMapping | null
}

export interface AnalysisExecutionContext {
  effectiveExecutionSettings: ExecutionSettingsRecord
  effectiveExecutionVariables: VariableMapping
  executionSettingEntries: ExecutionSettingEntry[]
}

function formatExecutionSettingValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? '예' : '아니오'
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

function getSettingOptionLabel(
  options: Array<{ value: string | number | boolean; label: string; description: string }> | undefined,
  value: unknown
): string {
  const matched = options?.find(option => String(option.value) === String(value))
  return matched?.label ?? formatExecutionSettingValue(value)
}

function resolveManagedSettingValue({
  defaultValue,
  suggestedValue,
  userValue,
}: {
  defaultValue: unknown
  suggestedValue: unknown
  userValue: unknown
}): unknown {
  if (userValue === undefined) {
    return suggestedValue ?? defaultValue
  }

  if (suggestedValue === undefined || userValue !== defaultValue) {
    return userValue
  }

  return suggestedValue
}

function buildEffectiveExecutionSettings({
  analysisOptions,
  methodRequirements,
  suggestedSettings,
}: Omit<BuildAnalysisExecutionContextArgs, 'selectedMethodId' | 'variableMapping'>): ExecutionSettingsRecord {
  const merged: ExecutionSettingsRecord = {
    ...((suggestedSettings ?? {}) as ExecutionSettingsRecord),
    ...(analysisOptions.methodSettings ?? {}),
    alpha: analysisOptions.alpha,
  }

  const resolvedAlternative = resolveManagedSettingValue({
    defaultValue: methodRequirements?.settings?.alternative?.default,
    suggestedValue: suggestedSettings?.alternative,
    userValue: analysisOptions.alternative,
  })
  if (resolvedAlternative !== undefined && resolvedAlternative !== null) {
    merged.alternative = resolvedAlternative as ExecutionSettingValue
  }

  const resolvedCiMethod = resolveManagedSettingValue({
    defaultValue: methodRequirements?.settings?.ciMethod?.default,
    suggestedValue: suggestedSettings?.ciMethod,
    userValue: analysisOptions.ciMethod,
  })
  if (resolvedCiMethod !== undefined && resolvedCiMethod !== null) {
    merged.ciMethod = resolvedCiMethod as ExecutionSettingValue
  }

  return merged
}

function buildEffectiveExecutionVariables({
  analysisOptions,
  methodRequirements,
  selectedMethodId,
  variableMapping,
}: Pick<BuildAnalysisExecutionContextArgs, 'analysisOptions' | 'methodRequirements' | 'selectedMethodId' | 'variableMapping'>): VariableMapping {
  return {
    ...(variableMapping ?? {}),
    ...(analysisOptions.testValue !== undefined
      ? { testValue: String(analysisOptions.testValue) }
      : {}),
    ...(
      selectedMethodId === 'proportion-test' || selectedMethodId === 'one-sample-proportion'
        ? {
            nullProportion: String(
              analysisOptions.nullProportion
              ?? methodRequirements?.settings?.testProportion?.default
              ?? 0.5
            ),
          }
        : {}
    ),
  }
}

function buildExecutionSettingEntries({
  analysisOptions,
  effectiveExecutionSettings,
  methodRequirements,
}: Pick<AnalysisExecutionContext, 'effectiveExecutionSettings'> & Pick<BuildAnalysisExecutionContextArgs, 'analysisOptions' | 'methodRequirements'>): ExecutionSettingEntry[] {
  const entries: ExecutionSettingEntry[] = [
    { key: 'alpha', label: 'alpha', value: String(analysisOptions.alpha) },
  ]

  const settings = methodRequirements?.settings
  const pushEntry = (key: string, label: string, rawValue: unknown) => {
    if (rawValue === undefined || rawValue === null || rawValue === '') return
    entries.push({ key, label, value: formatExecutionSettingValue(rawValue) })
  }

  if (settings?.testValue) {
    pushEntry(
      'testValue',
      settings.testValue.label,
      analysisOptions.testValue ?? settings.testValue.default
    )
  }

  if (settings?.testProportion) {
    pushEntry(
      'testProportion',
      settings.testProportion.label,
      analysisOptions.nullProportion ?? settings.testProportion.default
    )
  }

  if (settings?.alternative) {
    const rawValue = effectiveExecutionSettings.alternative
    pushEntry(
      'alternative',
      settings.alternative.label,
      rawValue !== undefined ? getSettingOptionLabel(settings.alternative.options, rawValue) : undefined
    )
  }

  if (settings?.ciMethod) {
    const rawValue = effectiveExecutionSettings.ciMethod
    pushEntry(
      'ciMethod',
      settings.ciMethod.label,
      rawValue !== undefined ? getSettingOptionLabel(settings.ciMethod.options, rawValue) : undefined
    )
  }

  for (const [key, setting] of Object.entries(settings ?? {})) {
    if (['alpha', 'testValue', 'testProportion', 'alternative', 'ciMethod'].includes(key)) continue

    const rawValue = effectiveExecutionSettings[key]
    if (rawValue === undefined) continue
    pushEntry(
      key,
      setting.label,
      setting.options ? getSettingOptionLabel(setting.options, rawValue) : rawValue
    )
  }

  pushEntry('showAssumptions', '가정 검정', analysisOptions.showAssumptions ? '사용' : '건너뜀')
  pushEntry('showEffectSize', '효과크기', analysisOptions.showEffectSize ? '표시' : '생략')

  return entries
}

export function buildAnalysisExecutionContext(
  args: BuildAnalysisExecutionContextArgs
): AnalysisExecutionContext {
  const effectiveExecutionSettings = buildEffectiveExecutionSettings(args)
  const effectiveExecutionVariables = buildEffectiveExecutionVariables(args)
  const executionSettingEntries = buildExecutionSettingEntries({
    analysisOptions: args.analysisOptions,
    effectiveExecutionSettings,
    methodRequirements: args.methodRequirements,
  })

  return {
    effectiveExecutionSettings,
    effectiveExecutionVariables,
    executionSettingEntries,
  }
}
