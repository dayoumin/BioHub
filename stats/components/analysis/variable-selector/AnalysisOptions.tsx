'use client'

/**
 * Shared Step 3 analysis options panel.
 *
 * Supported controls are derived from `variable-requirements.settings`.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useTerminology } from '@/hooks/use-terminology'
import type {
  SettingDescription,
  SettingOption,
  StatisticalMethodRequirements,
} from '@/lib/statistics/variable-requirements'
import {
  getLocalizedSettingDescription,
  getLocalizedSettingLabel,
  getLocalizedSettingOptions,
} from '@/lib/statistics/localized-setting-metadata'
import {
  MANAGED_REQUIREMENT_SETTING_KEYS,
  buildManagedAnalysisOptionDefaults,
  type ManagedRequirementSettingKey,
} from '@/lib/utils/analysis-execution'

interface AnalysisOptionsSectionProps {
  methodRequirements?: StatisticalMethodRequirements
  className?: string
}

type GenericSettingValue = string | number | boolean

function toNumberString(value: number | undefined, fallback?: number | string | null) {
  if (value !== undefined) return String(value)
  if (typeof fallback === 'number') return String(fallback)
  if (typeof fallback === 'string') return fallback
  return ''
}

function getRangeValue(setting: SettingDescription | undefined, key: 'min' | 'max') {
  const value = setting?.range?.[key]
  return Number.isFinite(value) ? String(value) : undefined
}

function hasNumericShape(setting: SettingDescription): boolean {
  return Boolean(setting.range) || typeof setting.default === 'number'
}

function getGenericSettingValue(
  methodSettings: Record<string, GenericSettingValue> | undefined,
  key: string,
  setting: SettingDescription
) {
  const value = methodSettings?.[key]
  if (value !== undefined) return value
  return setting.default
}

function coerceOptionValue(rawValue: string, options: SettingOption[] | undefined): GenericSettingValue {
  const matched = options?.find(option => String(option.value) === rawValue)
  return matched?.value ?? rawValue
}

export function AnalysisOptionsSection({
  methodRequirements,
  className,
}: AnalysisOptionsSectionProps) {
  const t = useTerminology()
  const language = t.language
  const analysisOptions = useAnalysisStore(state => state.analysisOptions)
  const setAnalysisOptions = useAnalysisStore(state => state.setAnalysisOptions)

  const settings = methodRequirements?.settings
  const alphaSetting = settings?.alpha
  const testValueSetting = settings?.testValue
  const nullProportionSetting = settings?.testProportion
  const alternativeSetting = settings?.alternative
  const ciMethodSetting = settings?.ciMethod

  const genericSettings = useMemo(
    () => Object.entries(settings ?? {}).filter(([key]) => (
      key !== 'alpha' && !MANAGED_REQUIREMENT_SETTING_KEYS.has(key as ManagedRequirementSettingKey)
    )),
    [settings]
  )

  const localizedLabels = useMemo(() => ({
    alpha: alphaSetting
      ? getLocalizedSettingLabel('alpha', alphaSetting.label, language)
      : t.selectorUI.labels.alpha,
    testValue: testValueSetting
      ? getLocalizedSettingLabel('testValue', testValueSetting.label, language)
      : t.selectorUI.labels.testValue,
    nullProportion: nullProportionSetting
      ? getLocalizedSettingLabel('testProportion', nullProportionSetting.label, language)
      : undefined,
    alternative: alternativeSetting
      ? getLocalizedSettingLabel('alternative', alternativeSetting.label, language)
      : undefined,
    ciMethod: ciMethodSetting
      ? getLocalizedSettingLabel('ciMethod', ciMethodSetting.label, language)
      : undefined,
  }), [
    alphaSetting,
    testValueSetting,
    nullProportionSetting,
    alternativeSetting,
    ciMethodSetting,
    language,
    t.selectorUI.labels.alpha,
    t.selectorUI.labels.testValue,
  ])

  const localizedDescriptions = useMemo(() => ({
    nullProportion: nullProportionSetting
      ? getLocalizedSettingDescription('testProportion', nullProportionSetting.description, language)
      : undefined,
  }), [nullProportionSetting, language])

  const alternativeOptions = useMemo(
    () => getLocalizedSettingOptions('alternative', alternativeSetting?.options, language) ?? [
      { value: 'two-sided', label: 'Two-sided', description: '' },
      { value: 'greater', label: 'Greater', description: '' },
      { value: 'less', label: 'Less', description: '' },
    ],
    [alternativeSetting?.options, language]
  )

  const ciMethodOptions = useMemo(
    () => getLocalizedSettingOptions('ciMethod', ciMethodSetting?.options, language) ?? [],
    [ciMethodSetting?.options, language]
  )
  const initializedDefaultsKeyRef = useRef<string | null>(null)

  useEffect(() => {
    const initializationKey = methodRequirements?.id ?? '__no-method__'
    if (initializedDefaultsKeyRef.current === initializationKey) return

    const defaults: {
      alternative?: 'two-sided' | 'less' | 'greater'
      ciMethod?: string
      nullProportion?: number
      testValue?: number
      methodSettings?: Record<string, GenericSettingValue>
    } = buildManagedAnalysisOptionDefaults({
      analysisOptions,
      methodRequirements,
    })

    const nextMethodSettings = { ...(analysisOptions.methodSettings ?? {}) }
    let hasMethodSettingDefaults = false

    for (const [key, setting] of genericSettings) {
      if (nextMethodSettings[key] === undefined && setting.default !== undefined) {
        nextMethodSettings[key] = setting.default as GenericSettingValue
        hasMethodSettingDefaults = true
      }
    }

    if (hasMethodSettingDefaults) {
      defaults.methodSettings = nextMethodSettings
    }

    if (Object.keys(defaults).length > 0) {
      setAnalysisOptions(defaults)
    }

    initializedDefaultsKeyRef.current = initializationKey
  }, [
    methodRequirements?.id,
    genericSettings,
    analysisOptions,
    setAnalysisOptions,
    methodRequirements,
  ])

  const handleAlphaChange = useCallback((value: string) => {
    setAnalysisOptions({ alpha: parseFloat(value) })
  }, [setAnalysisOptions])

  const handleTestValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (raw === '' || raw === '-') {
      setAnalysisOptions({ testValue: undefined })
      return
    }
    const num = parseFloat(raw)
    if (!Number.isNaN(num)) {
      setAnalysisOptions({ testValue: num })
    }
  }, [setAnalysisOptions])

  const handleNullProportionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (raw === '' || raw === '-') {
      setAnalysisOptions({ nullProportion: undefined })
      return
    }
    const num = parseFloat(raw)
    if (!Number.isNaN(num)) {
      setAnalysisOptions({ nullProportion: num })
    }
  }, [setAnalysisOptions])

  const handleNullProportionBlur = useCallback(() => {
    const min = nullProportionSetting?.range?.min ?? 0
    const max = nullProportionSetting?.range?.max ?? 1
    const fallback = Number(nullProportionSetting?.default ?? 0.5)
    const value = analysisOptions.nullProportion

    if (
      value === undefined
      || Number.isNaN(value)
      || value <= min
      || value >= max
    ) {
      setAnalysisOptions({ nullProportion: fallback })
    }
  }, [
    analysisOptions.nullProportion,
    nullProportionSetting?.default,
    nullProportionSetting?.range?.max,
    nullProportionSetting?.range?.min,
    setAnalysisOptions,
  ])

  const handleAlternativeChange = useCallback((value: string) => {
    if (value === 'two-sided' || value === 'less' || value === 'greater') {
      setAnalysisOptions({ alternative: value })
    }
  }, [setAnalysisOptions])

  const handleCiMethodChange = useCallback((value: string) => {
    setAnalysisOptions({ ciMethod: value })
  }, [setAnalysisOptions])

  const updateMethodSetting = useCallback((key: string, value: GenericSettingValue | undefined) => {
    const nextMethodSettings = { ...(analysisOptions.methodSettings ?? {}) }

    if (value === undefined) {
      delete nextMethodSettings[key]
    } else {
      nextMethodSettings[key] = value
    }

    setAnalysisOptions({ methodSettings: nextMethodSettings })
  }, [analysisOptions.methodSettings, setAnalysisOptions])

  const handleGenericInputChange = useCallback((
    key: string,
    setting: SettingDescription,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const raw = e.target.value
    if (raw === '' || raw === '-') {
      updateMethodSetting(key, undefined)
      return
    }

    if (hasNumericShape(setting)) {
      const parsed = parseFloat(raw)
      if (!Number.isNaN(parsed)) {
        updateMethodSetting(key, parsed)
      }
      return
    }

    updateMethodSetting(key, raw)
  }, [updateMethodSetting])

  const handleGenericSelectChange = useCallback((key: string, setting: SettingDescription, value: string) => {
    updateMethodSetting(key, coerceOptionValue(value, setting.options))
  }, [updateMethodSetting])

  return (
    <div className={className} data-testid="analysis-options">
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
        {(alphaSetting || !methodRequirements) && (
          <div className="flex items-center justify-between">
            <Label htmlFor="alpha-select" className="text-xs text-muted-foreground">
              {localizedLabels.alpha}
            </Label>
            <Select
              value={String(analysisOptions.alpha)}
              onValueChange={handleAlphaChange}
            >
              <SelectTrigger id="alpha-select" className="h-8 w-[110px] text-xs" data-testid="alpha-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.01">0.01</SelectItem>
                <SelectItem value="0.05">0.05</SelectItem>
                <SelectItem value="0.1">0.10</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {testValueSetting && (
          <div className="flex items-center justify-between">
            <Label htmlFor="test-value-input" className="text-xs text-muted-foreground">
              {localizedLabels.testValue}
            </Label>
            <Input
              id="test-value-input"
              type="number"
              min={getRangeValue(testValueSetting, 'min')}
              max={getRangeValue(testValueSetting, 'max')}
              value={toNumberString(analysisOptions.testValue, testValueSetting.default)}
              onChange={handleTestValueChange}
              placeholder={toNumberString(undefined, testValueSetting.default)}
              className="h-8 w-[110px] text-xs"
              data-testid="test-value-input"
            />
          </div>
        )}

        {nullProportionSetting && (
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="null-proportion-input" className="text-xs text-muted-foreground">
                {localizedLabels.nullProportion}
              </Label>
              <p className="text-[11px] text-muted-foreground/80">
                {localizedDescriptions.nullProportion}
              </p>
            </div>
            <Input
              id="null-proportion-input"
              type="number"
              min={getRangeValue(nullProportionSetting, 'min')}
              max={getRangeValue(nullProportionSetting, 'max')}
              step="0.01"
              value={toNumberString(analysisOptions.nullProportion, nullProportionSetting.default)}
              onChange={handleNullProportionChange}
              onBlur={handleNullProportionBlur}
              placeholder={toNumberString(undefined, nullProportionSetting.default)}
              className="h-8 w-[110px] text-xs"
              data-testid="null-proportion-input"
            />
          </div>
        )}

        {alternativeSetting && (
          <div className="flex items-center justify-between">
            <Label htmlFor="alternative-select" className="text-xs text-muted-foreground">
              {localizedLabels.alternative}
            </Label>
            <Select
              value={analysisOptions.alternative ?? String(alternativeSetting.default ?? 'two-sided')}
              onValueChange={handleAlternativeChange}
            >
              <SelectTrigger id="alternative-select" className="h-8 w-[140px] text-xs" data-testid="alternative-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {alternativeOptions.map(option => (
                  <SelectItem key={String(option.value)} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {ciMethodSetting && ciMethodOptions.length > 0 && (
          <div className="flex items-center justify-between">
            <Label htmlFor="ci-method-select" className="text-xs text-muted-foreground">
              {localizedLabels.ciMethod}
            </Label>
            <Select
              value={analysisOptions.ciMethod ?? String(ciMethodSetting.default ?? ciMethodOptions[0]?.value ?? '')}
              onValueChange={handleCiMethodChange}
            >
              <SelectTrigger id="ci-method-select" className="h-8 w-[140px] text-xs" data-testid="ci-method-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ciMethodOptions.map(option => (
                  <SelectItem key={String(option.value)} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {genericSettings.map(([key, setting]) => {
          const currentValue = getGenericSettingValue(analysisOptions.methodSettings, key, setting)
          const localizedLabel = getLocalizedSettingLabel(key, setting.label, language)
          const localizedDescription = getLocalizedSettingDescription(key, setting.description, language)
          const localizedOptions = getLocalizedSettingOptions(key, setting.options, language)

          if (localizedOptions && localizedOptions.length > 0) {
            return (
              <div key={key} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={`setting-${key}-select`} className="text-xs text-muted-foreground">
                    {localizedLabel}
                  </Label>
                  <p className="text-[11px] text-muted-foreground/80">
                    {localizedDescription}
                  </p>
                </div>
                <Select
                  value={String(currentValue ?? '')}
                  onValueChange={(value) => handleGenericSelectChange(key, setting, value)}
                >
                  <SelectTrigger
                    id={`setting-${key}-select`}
                    className="h-8 w-[160px] text-xs"
                    data-testid={`setting-${key}-select`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {localizedOptions.map(option => (
                      <SelectItem key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          }

          return (
            <div key={key} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor={`setting-${key}-input`} className="text-xs text-muted-foreground">
                  {localizedLabel}
                </Label>
                <p className="text-[11px] text-muted-foreground/80">
                  {localizedDescription}
                </p>
              </div>
              <Input
                id={`setting-${key}-input`}
                type={hasNumericShape(setting) ? 'number' : 'text'}
                min={getRangeValue(setting, 'min')}
                max={getRangeValue(setting, 'max')}
                value={hasNumericShape(setting)
                  ? toNumberString(
                    typeof currentValue === 'number' ? currentValue : undefined,
                    setting.default
                  )
                  : String(currentValue ?? '')}
                onChange={(event) => handleGenericInputChange(key, setting, event)}
                placeholder={String(setting.default ?? '')}
                className="h-8 w-[140px] text-xs"
                data-testid={`setting-${key}-input`}
              />
            </div>
          )
        })}

        <div className="flex items-center justify-between">
          <Label htmlFor="show-assumptions" className="text-xs text-muted-foreground">
            {t.selectorUI.labels.assumptionTest}
          </Label>
          <Switch
            id="show-assumptions"
            checked={analysisOptions.showAssumptions}
            onCheckedChange={(checked) => setAnalysisOptions({ showAssumptions: checked })}
            data-testid="show-assumptions-switch"
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="show-effect-size" className="text-xs text-muted-foreground">
            {t.selectorUI.labels.effectSize}
          </Label>
          <Switch
            id="show-effect-size"
            checked={analysisOptions.showEffectSize}
            onCheckedChange={(checked) => setAnalysisOptions({ showEffectSize: checked })}
            data-testid="show-effect-size-switch"
          />
        </div>
      </div>
    </div>
  )
}
