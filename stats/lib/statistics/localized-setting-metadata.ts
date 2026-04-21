import type { SelectorUIText } from '@/lib/terminology/terminology-types'
import type { SettingDescription } from '@/lib/statistics/variable-requirements'
import { isEnglishLanguage } from '@/lib/preferences'

type LocalizableSettingOption = {
  value: string | number | boolean
  label: string
  description: string
}

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
    increasing: 'Increasing',
    decreasing: 'Decreasing',
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
    scheffe: 'Scheffe',
    sidak: 'Sidak',
    'games-howell': 'Games-Howell',
    dunn: 'Dunn',
    conover: 'Conover',
    nemenyi: 'Nemenyi',
    wilcoxon: 'Wilcoxon (Bonferroni)',
    mcnemar: 'McNemar',
  },
}

export function containsKoreanText(value: string): boolean {
  return KOREAN_TEXT_PATTERN.test(value)
}

export function humanizeSettingKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function humanizeOptionValue(value: string): string {
  return humanizeSettingKey(value)
}

function getRawOptionLabel(options: LocalizableSettingOption[] | undefined, value: unknown): string {
  const matched = options?.find(option => String(option.value) === String(value))
  return matched?.label ?? String(value)
}

function getGenericSettingLabel(key: string): string {
  return GENERIC_SETTING_LABELS[key] ?? humanizeSettingKey(key)
}

export function getLocalizedSettingLabel(
  key: string,
  label: string,
  language: string
): string {
  if (!isEnglishLanguage(language) || !containsKoreanText(label)) {
    return label
  }

  return getGenericSettingLabel(key)
}

export function getLocalizedSettingDescription(
  key: string,
  description: string,
  language: string
): string {
  if (!isEnglishLanguage(language) || !containsKoreanText(description)) {
    return description
  }

  return GENERIC_SETTING_DESCRIPTIONS[key]
    ?? `Configures ${getGenericSettingLabel(key).toLowerCase()}.`
}

export function getLocalizedSettingOptionLabel(
  key: string,
  option: Pick<LocalizableSettingOption, 'value' | 'label'>,
  language: string
): string {
  if (!isEnglishLanguage(language) || !containsKoreanText(option.label)) {
    return option.label
  }

  return GENERIC_SETTING_OPTION_LABELS[key]?.[String(option.value)]
    ?? humanizeOptionValue(String(option.value))
}

export function getLocalizedSettingOptions(
  key: string,
  options: LocalizableSettingOption[] | undefined,
  language: string
): LocalizableSettingOption[] | undefined {
  return options?.map(option => ({
    ...option,
    label: getLocalizedSettingOptionLabel(key, option, language),
  }))
}

function formatSettingDefault(
  value: unknown,
  methodGuidance: SelectorUIText['methodGuidance']
): string {
  if (typeof value === 'boolean') return value ? methodGuidance.yes : methodGuidance.no
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

export function getLocalizedSettingDefaultLabel(
  key: string,
  setting: SettingDescription,
  language: string,
  methodGuidance: SelectorUIText['methodGuidance']
): string | undefined {
  if (setting.default === undefined || setting.default === null) return undefined

  if (setting.options && setting.options.length > 0) {
    const defaultLabel = getRawOptionLabel(setting.options, setting.default)
    if (!isEnglishLanguage(language)) {
      return defaultLabel
    }

    return GENERIC_SETTING_OPTION_LABELS[key]?.[String(setting.default)]
      ?? (containsKoreanText(defaultLabel)
        ? humanizeOptionValue(String(setting.default))
        : defaultLabel)
  }

  return formatSettingDefault(setting.default, methodGuidance)
}
