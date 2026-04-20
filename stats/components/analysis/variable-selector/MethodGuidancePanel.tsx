'use client'

import { Badge } from '@/components/ui/badge'
import { getMethodByIdOrAlias } from '@/lib/constants/statistical-methods'
import type {
  SettingDescription,
  StatisticalMethodRequirements,
  VariableType,
  VariableRequirement,
} from '@/lib/statistics/variable-requirements'
import { useTerminology } from '@/hooks/use-terminology'
import { getSettingOptionLabel } from '@/lib/utils/analysis-execution'

const KOREAN_TEXT_PATTERN = /[가-힣]/

const GENERIC_SETTING_LABELS: Record<string, string> = {
  alpha: 'Significance level',
  testValue: 'Reference value',
  testProportion: 'Reference proportion',
  alternative: 'Alternative hypothesis',
  ciMethod: 'Confidence interval method',
  missingPolicy: 'Missing-data handling',
  equalVar: 'Execution mode',
  welch: 'Execution mode',
  postHoc: 'Post-hoc method',
}

const GENERIC_SETTING_DESCRIPTIONS: Record<string, string> = {
  alpha: 'Controls the threshold for statistical significance.',
  testValue: 'Defines the benchmark value to compare the sample against.',
  testProportion: 'Defines the reference proportion for the test.',
  alternative: 'Chooses the direction of the statistical test.',
  ciMethod: 'Chooses the confidence-interval estimation method.',
  missingPolicy: 'Chooses how rows with missing values are handled.',
  equalVar: 'Chooses between Student and Welch execution modes.',
  welch: 'Chooses between standard ANOVA and Welch ANOVA.',
  postHoc: 'Chooses the multiple-comparison procedure applied after the omnibus test.',
}

const GENERIC_SETTING_OPTION_LABELS: Record<string, Record<string, string>> = {
  alternative: {
    'two-sided': 'Two-sided',
    greater: 'Greater',
    less: 'Less',
  },
  ciMethod: {
    wilson: 'Wilson score',
    normal: 'Normal approximation',
    exact: 'Exact',
  },
  missingPolicy: {
    listwise: 'Listwise deletion',
    pairwise: 'Pairwise deletion',
  },
  equalVar: {
    true: 'Student t-test',
    false: 'Welch t-test',
  },
  welch: {
    false: 'One-way ANOVA',
    true: 'Welch ANOVA',
  },
  postHoc: {
    tukey: 'Tukey HSD',
    bonferroni: 'Bonferroni',
    'games-howell': 'Games-Howell',
    dunn: 'Dunn',
  },
}

const GENERIC_ROLE_FALLBACKS: Record<string, { title: string; description: string }> = {
  within: {
    title: 'Within-subject Factor',
    description: 'Repeated-measures factor defined within each subject.',
  },
  between: {
    title: 'Between-subject Factor',
    description: 'Grouping factor defined between subjects or cohorts.',
  },
  blocking: {
    title: 'Blocking Variable',
    description: 'Blocking variable used to control nuisance variation.',
  },
  censoring: {
    title: 'Censoring Variable',
    description: 'Indicates whether the observation is censored.',
  },
  weight: {
    title: 'Weight Variable',
    description: 'Observation weights applied during model fitting.',
  },
}

function containsKoreanText(value: string): boolean {
  return KOREAN_TEXT_PATTERN.test(value)
}

function humanizeSettingKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function humanizeOptionValue(value: string): string {
  return humanizeSettingKey(value)
}

function getRequirementFallback(
  requirement: VariableRequirement,
  terminology: ReturnType<typeof useTerminology>
) {
  const { variables } = terminology

  switch (requirement.role) {
    case 'dependent':
      return variables.dependent
    case 'independent':
      return variables.independent
    case 'factor':
      return variables.factor
    case 'covariate':
      return variables.covariate
    case 'time':
      return variables.time
    case 'event':
      return variables.event
    default:
      return GENERIC_ROLE_FALLBACKS[requirement.role] ?? null
  }
}

function getMethodDescription(
  methodRequirements: StatisticalMethodRequirements,
  domain: ReturnType<typeof useTerminology>['domain']
): string {
  const matchedEntry = getMethodByIdOrAlias(methodRequirements.id)
  const exactEntry = matchedEntry?.id === methodRequirements.id ? matchedEntry : null

  if (domain !== 'generic') {
    return exactEntry?.koreanDescription ?? methodRequirements.description
  }

  if (exactEntry?.description) {
    return exactEntry.description
  }

  if (!containsKoreanText(methodRequirements.description)) {
    return methodRequirements.description
  }

  return `Configuration and variable guidance for ${humanizeSettingKey(methodRequirements.id)}.`
}

function getRequirementTypeSummary(
  requirement: VariableRequirement,
  methodGuidance: ReturnType<typeof useTerminology>['selectorUI']['methodGuidance']
) {
  const variableCount = requirement.multiple
    ? methodGuidance.multipleVariableCount(
      requirement.minCount ?? 1,
      requirement.maxCount
    )
    : methodGuidance.singleVariableCount
  const localizedTypes = requirement.types
    .map((type: VariableType) => methodGuidance.variableTypeLabels[type])
    .join(', ')
  return `${variableCount} · ${localizedTypes}`
}

function formatSettingDefault(
  value: unknown,
  methodGuidance: ReturnType<typeof useTerminology>['selectorUI']['methodGuidance']
): string {
  if (typeof value === 'boolean') return value ? methodGuidance.yes : methodGuidance.no
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

function getSettingDefaultLabel(
  key: string,
  setting: SettingDescription,
  domain: ReturnType<typeof useTerminology>['domain'],
  methodGuidance: ReturnType<typeof useTerminology>['selectorUI']['methodGuidance']
): string | undefined {
  if (setting.default === undefined || setting.default === null) return undefined
  if (setting.options && setting.options.length > 0) {
    const defaultLabel = getSettingOptionLabel(setting.options, setting.default)
    if (domain === 'generic') {
      return GENERIC_SETTING_OPTION_LABELS[key]?.[String(setting.default)]
        ?? (containsKoreanText(defaultLabel)
          ? humanizeOptionValue(String(setting.default))
          : defaultLabel)
    }
    return defaultLabel
  }
  return formatSettingDefault(setting.default, methodGuidance)
}

interface MethodGuidancePanelProps {
  methodRequirements?: StatisticalMethodRequirements
}

export function MethodGuidancePanel({
  methodRequirements,
}: MethodGuidancePanelProps) {
  const t = useTerminology()
  if (!methodRequirements) return null
  const isGenericDomain = t.domain === 'generic'
  const mg = t.selectorUI.methodGuidance
  const methodDescription = getMethodDescription(methodRequirements, t.domain)

  const localizedVariables = methodRequirements.variables.map(requirement => {
    const fallback = getRequirementFallback(requirement, t)
    const label = isGenericDomain && containsKoreanText(requirement.label)
      ? fallback?.title ?? requirement.label
      : requirement.label
    const displayDescription = isGenericDomain && containsKoreanText(requirement.description)
      ? fallback?.description
      : requirement.description

    return {
      ...requirement,
      label,
      displayDescription,
    }
  })

  const previewColumns = (methodRequirements.dataFormat?.columns ?? [])
    .filter((column) => !isGenericDomain || (
      !containsKoreanText(column.name)
      && !containsKoreanText(column.description)
    ))
    .slice(0, 4)
  const hadFilteredColumns = isGenericDomain
    && (methodRequirements.dataFormat?.columns?.length ?? 0) > 0
    && previewColumns.length === 0
  const previewNotes = (methodRequirements.notes ?? [])
    .filter(note => !isGenericDomain || !containsKoreanText(note))
    .slice(0, 3)
  const hadFilteredNotes = isGenericDomain
    && (methodRequirements.notes?.length ?? 0) > 0
    && previewNotes.length === 0
  const previewAssumptions = (methodRequirements.assumptions ?? [])
    .filter(assumption => !isGenericDomain || !containsKoreanText(assumption))
    .slice(0, 4)
  const hadFilteredAssumptions = isGenericDomain
    && (methodRequirements.assumptions?.length ?? 0) > 0
    && previewAssumptions.length === 0
  const hasFilteredDataFormatDescription = isGenericDomain
    && Boolean(methodRequirements.dataFormat?.description)
    && containsKoreanText(methodRequirements.dataFormat?.description ?? '')
  const settingEntries = Object.entries(methodRequirements.settings ?? {})
    .slice(0, 4)
    .map(([key, setting]) => ({
      key,
      label: isGenericDomain && containsKoreanText(setting.label)
        ? GENERIC_SETTING_LABELS[key] ?? humanizeSettingKey(key)
        : setting.label,
      defaultLabel: getSettingDefaultLabel(key, setting, t.domain, mg),
      description: isGenericDomain && containsKoreanText(setting.description)
        ? GENERIC_SETTING_DESCRIPTIONS[key]
          ?? `Configures ${(
            GENERIC_SETTING_LABELS[key]
            ?? humanizeSettingKey(key)
          ).toLowerCase()}.`
        : setting.description,
    }))

  return (
    <div
      className="rounded-2xl border border-border/40 bg-background px-4 py-4 shadow-[0px_6px_24px_rgba(25,28,30,0.04)]"
      data-testid="method-guidance-panel"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
            {mg.title}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {methodDescription}
          </p>
          {methodRequirements.dataFormat && !hasFilteredDataFormatDescription && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {mg.dataFormat}: {methodRequirements.dataFormat.description}
            </p>
          )}
          {hasFilteredDataFormatDescription && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {mg.dataFormat}: {mg.translationPending}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-[11px] font-medium">
            {mg.minSample} {methodRequirements.minSampleSize}
          </Badge>
          {methodRequirements.dataFormat?.type && (
            <Badge variant="secondary" className="text-[11px] font-medium capitalize">
              {mg.formatTypeLabels[methodRequirements.dataFormat.type]} {mg.typeFormatSuffix}
            </Badge>
          )}
          <Badge variant="outline" className="text-[11px] font-medium">
            {mg.variableRoles} {methodRequirements.variables.length}
          </Badge>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.95fr)_minmax(0,0.9fr)_minmax(0,0.95fr)]">
        <div className="rounded-xl border border-border/40 bg-surface-container-lowest p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {mg.requiredRoles}
          </p>
          <div className="mt-2 space-y-2">
            {localizedVariables.length > 0 ? localizedVariables.map(requirement => (
              <div key={`${requirement.role}-${requirement.label}`} className="rounded-lg border border-border/30 bg-background px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{requirement.label}</span>
                  <Badge variant={requirement.required ? 'default' : 'outline'} className="text-[10px]">
                  {requirement.required ? mg.required : mg.optional}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {getRequirementTypeSummary(requirement, mg)}
                </p>
                {requirement.displayDescription && (
                  <p className="mt-1 text-[11px] text-muted-foreground/80">
                    {requirement.displayDescription}
                  </p>
                )}
              </div>
            )) : (
              <p className="mt-2 text-xs text-muted-foreground">{mg.noneRequiredRoles}</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border/40 bg-surface-container-lowest p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {mg.assumptions}
          </p>
          {previewAssumptions.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {previewAssumptions.map(assumption => (
                <Badge key={assumption} variant="outline" className="text-[10px]">
                  {assumption}
                </Badge>
              ))}
            </div>
          ) : hadFilteredAssumptions ? (
            <p className="mt-2 text-xs text-muted-foreground">{mg.translationPending}</p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">{mg.noAssumptions}</p>
          )}
          {previewNotes.length > 0 && (
            <>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {mg.notes}
              </p>
              <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted-foreground">
                {previewNotes.map(note => (
                  <li key={note}>- {note}</li>
                ))}
              </ul>
            </>
          )}
          {previewNotes.length === 0 && hadFilteredNotes && (
            <>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {mg.notes}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{mg.translationPending}</p>
            </>
          )}
        </div>

        <div className="rounded-xl border border-border/40 bg-surface-container-lowest p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {mg.expectedColumns}
          </p>
          {previewColumns.length > 0 ? (
            <div className="mt-2 space-y-2">
              {previewColumns.map(column => (
                <div key={column.name} className="rounded-lg border border-border/30 bg-background px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{column.name}</span>
                    {column.required && (
                      <Badge variant="outline" className="text-[10px]">{mg.required}</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{column.description}</p>
                </div>
              ))}
            </div>
          ) : hadFilteredColumns ? (
            <p className="mt-2 text-xs text-muted-foreground">{mg.translationPending}</p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">{mg.noExampleSchema}</p>
          )}
        </div>

        <div className="rounded-xl border border-border/40 bg-surface-container-lowest p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {mg.defaultSettings}
          </p>
          {settingEntries.length > 0 ? (
            <div className="mt-2 space-y-2">
              {settingEntries.map(setting => (
                <div key={setting.key} className="rounded-lg border border-border/30 bg-background px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{setting.label}</span>
                    {setting.defaultLabel !== undefined && (
                      <Badge variant="outline" className="text-[10px]">
                        {mg.defaultValue} {setting.defaultLabel}
                      </Badge>
                    )}
                  </div>
                  {setting.description && (
                    <p className="mt-1 text-[11px] text-muted-foreground">{setting.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">{mg.noDefaultSettings}</p>
          )}
        </div>
      </div>
    </div>
  )
}
