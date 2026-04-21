import type { AppLanguageCode, AppTerminologyDomain } from '@/lib/preferences'
import type { TerminologyDictionary } from './terminology-types'
import type { DomainOverrideSections } from './packs/pack-types'
import { LANGUAGE_PACKS } from './packs/language-packs'
import { DOMAIN_PACKS } from './packs/domain-packs'

function composeWithOverrides(
  base: TerminologyDictionary,
  domain: AppTerminologyDomain,
  language: AppLanguageCode,
  override?: DomainOverrideSections,
): TerminologyDictionary {
  return {
    ...base,
    ...override,
    domain,
    language,
    displayName: override?.displayName ?? DOMAIN_PACKS[domain].displayNames[language],
    purposeInput: override?.purposeInput ?? base.purposeInput,
    hub: override?.hub ?? base.hub,
    variables: override?.variables ?? base.variables,
  }
}

export function resolveTerminologyDictionary(
  language: AppLanguageCode,
  domain: AppTerminologyDomain,
): TerminologyDictionary {
  const languagePack = LANGUAGE_PACKS[language]
  const domainPack = DOMAIN_PACKS[domain]

  const exact = domainPack.exactDictionaries?.[language]
  const baseDictionary = exact ?? languagePack.fallbackDictionary
  const domainSections = domainPack.sectionsByLanguage?.[language]
  const mixedSections = domainPack.mixedSectionsByLanguage?.[language]
  const override = domainPack.overrides?.[language]

  if (exact) {
    return composeWithOverrides(
      {
        ...baseDictionary,
        ...languagePack.sections,
        ...mixedSections,
        ...domainSections,
      },
      domain,
      language,
      override,
    )
  }

  return composeWithOverrides(
    {
      ...baseDictionary,
      ...languagePack.sections,
      ...mixedSections,
      ...domainSections,
    },
    domain,
    language,
    override,
  )
}
