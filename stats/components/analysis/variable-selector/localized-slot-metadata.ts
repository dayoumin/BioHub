import type { TerminologyDictionary } from '@/lib/terminology'
import { containsKoreanText } from '@/lib/statistics/localized-setting-metadata'
import { isEnglishLanguage } from '@/lib/preferences'
import type { SlotConfig } from './slot-configs'

const GENERIC_SLOT_FALLBACKS: Record<string, { label: string; description: string }> = {
  dependent: {
    label: 'Dependent Variable',
    description: 'Select the main outcome variable used in the analysis.',
  },
  independent: {
    label: 'Independent Variable',
    description: 'Select the predictor variable used to explain or compare the outcome.',
  },
  factor: {
    label: 'Group Variable',
    description: 'Select the categorical grouping factor used to compare conditions or cohorts.',
  },
  group: {
    label: 'Group Variable',
    description: 'Select the categorical grouping factor used to compare conditions or cohorts.',
  },
  covariate: {
    label: 'Covariate',
    description: 'Select the control variable to adjust for in the model.',
  },
  variables: {
    label: 'Analysis Variables',
    description: 'Select the variables that will be analyzed together in this method.',
  },
  time: {
    label: 'Time Variable',
    description: 'Select the time or sequence variable used to order observations.',
  },
  event: {
    label: 'Event Variable',
    description: 'Select the binary event indicator used in the analysis.',
  },
  fixed: {
    label: 'Fixed-effect Factor',
    description: 'Select the fixed-effect factor included in the model.',
  },
  random: {
    label: 'Random-effect Factor',
    description: 'Select the random-effect grouping factor included in the model.',
  },
  predictors: {
    label: 'Predictor Variables',
    description: 'Select the predictor variables used by the model.',
  },
  state: {
    label: 'State Variable',
    description: 'Select the true state or class variable used as the reference outcome.',
  },
  test: {
    label: 'Test Variable',
    description: 'Select the test score or prediction variable evaluated against the state variable.',
  },
}

function includesAny(texts: string[], patterns: string[]): boolean {
  return patterns.some((pattern) => texts.some((text) => text.includes(pattern)))
}

function getVariablesFallback(slot: SlotConfig): { label: string; description: string } {
  const texts = [slot.label, slot.description]

  if (includesAny(texts, ['이진'])) {
    return {
      label: 'Paired Binary Variables',
      description: 'Select the paired binary variables analyzed together in this method.',
    }
  }

  if (includesAny(texts, ['반복', '개체내'])) {
    return {
      label: 'Repeated-measures Variables',
      description: 'Select the repeated measurements recorded for the same subjects.',
    }
  }

  if (includesAny(texts, ['대응', '비교'])) {
    return {
      label: 'Comparison Variables',
      description: 'Select the variables compared together as a matched or paired analysis.',
    }
  }

  if (includesAny(texts, ['다변량', '종속'])) {
    return {
      label: 'Dependent Variables',
      description: 'Select the multiple numeric outcome variables analyzed together.',
    }
  }

  return GENERIC_SLOT_FALLBACKS.variables
}

function getDependentFallback(
  slot: SlotConfig,
  terminology: Pick<TerminologyDictionary, 'language' | 'variables'>
): { label: string; description: string } {
  const texts = [slot.label, slot.description]

  if (includesAny(texts, ['열'])) {
    return {
      label: 'Column Variable',
      description: 'Select the categorical variable used for the table columns.',
    }
  }

  if (includesAny(texts, ['이진'])) {
    return {
      label: 'Binary Variable',
      description: 'Select the binary outcome variable used in this test.',
    }
  }

  if (includesAny(texts, ['검정'])) {
    return {
      label: 'Test Variable',
      description: 'Select the variable evaluated by this test.',
    }
  }

  return {
    label: terminology.variables.dependent.title,
    description: terminology.variables.dependent.description,
  }
}

function getIndependentFallback(
  slot: SlotConfig,
  terminology: Pick<TerminologyDictionary, 'language' | 'variables'>
): { label: string; description: string } {
  const texts = [slot.label, slot.description]

  if (includesAny(texts, ['행'])) {
    return {
      label: 'Row Variable',
      description: 'Select the categorical variable used for the table rows.',
    }
  }

  return {
    label: terminology.variables.independent.title,
    description: terminology.variables.independent.description,
  }
}

function getTerminologyFallback(
  slot: SlotConfig,
  terminology: Pick<TerminologyDictionary, 'language' | 'variables'>
): { label: string; description: string } | null {
  const texts = [slot.label, slot.description]

  switch (slot.id) {
    case 'dependent':
      return getDependentFallback(slot, terminology)
    case 'independent':
      return getIndependentFallback(slot, terminology)
    case 'factor':
      if (includesAny(texts, ['그룹'])) {
        return { label: terminology.variables.group.title, description: terminology.variables.group.description }
      }
      return { label: terminology.variables.factor.title, description: terminology.variables.factor.description }
    case 'group':
      return { label: terminology.variables.group.title, description: terminology.variables.group.description }
    case 'covariate':
      return { label: terminology.variables.covariate.title, description: terminology.variables.covariate.description }
    case 'time':
      return { label: terminology.variables.time.title, description: terminology.variables.time.description }
    case 'event':
      return { label: terminology.variables.event.title, description: terminology.variables.event.description }
    case 'variables':
      return getVariablesFallback(slot)
    default:
      return GENERIC_SLOT_FALLBACKS[slot.id] ?? null
  }
}

export function getLocalizedSlotConfigs(
  slots: SlotConfig[],
  terminology: Pick<TerminologyDictionary, 'language' | 'variables'>
): SlotConfig[] {
  if (!isEnglishLanguage(terminology.language)) {
    return slots
  }

  return slots.map((slot) => {
    const fallback = getTerminologyFallback(slot, terminology)
    if (!fallback) return slot

    return {
      ...slot,
      label: containsKoreanText(slot.label) ? fallback.label : slot.label,
      description: containsKoreanText(slot.description) ? fallback.description : slot.description,
    }
  })
}
