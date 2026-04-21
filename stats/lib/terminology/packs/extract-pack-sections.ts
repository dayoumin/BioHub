import type { TerminologyDictionary } from '../terminology-types'
import {
  DOMAIN_OWNED_TERMINOLOGY_KEYS,
  LANGUAGE_OWNED_TERMINOLOGY_KEYS,
  MIXED_OWNED_TERMINOLOGY_KEYS,
  type DomainOwnedTerminologyKey,
  type LanguageOwnedTerminologyKey,
  type MixedOwnedTerminologyKey,
} from './pack-section-keys'
import type { DomainOwnedSections, LanguageOwnedSections, MixedOwnedSections } from './pack-types'

function pickSections<Key extends keyof TerminologyDictionary>(
  dictionary: TerminologyDictionary,
  keys: readonly Key[],
): Pick<TerminologyDictionary, Key> {
  const picked = {} as Pick<TerminologyDictionary, Key>

  for (const key of keys) {
    const value = dictionary[key]
    if (value !== undefined) {
      picked[key] = value
    }
  }

  return picked
}

export function extractLanguageOwnedSections(
  dictionary: TerminologyDictionary,
): LanguageOwnedSections {
  return pickSections<LanguageOwnedTerminologyKey>(dictionary, LANGUAGE_OWNED_TERMINOLOGY_KEYS)
}

export function extractDomainOwnedSections(
  dictionary: TerminologyDictionary,
): DomainOwnedSections {
  return pickSections<DomainOwnedTerminologyKey>(dictionary, DOMAIN_OWNED_TERMINOLOGY_KEYS)
}

export function extractMixedOwnedSections(
  dictionary: TerminologyDictionary,
): MixedOwnedSections {
  return pickSections<MixedOwnedTerminologyKey>(dictionary, MIXED_OWNED_TERMINOLOGY_KEYS)
}
