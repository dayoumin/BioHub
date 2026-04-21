import type { TerminologyDictionary } from '../terminology-types'
import {
  DOMAIN_OWNED_TERMINOLOGY_KEYS,
  LANGUAGE_OWNED_TERMINOLOGY_KEYS,
  type DomainOwnedTerminologyKey,
  type LanguageOwnedTerminologyKey,
} from './pack-section-keys'
import type { DomainOwnedSections, LanguageOwnedSections } from './pack-types'

function pickSections<Key extends keyof TerminologyDictionary>(
  dictionary: TerminologyDictionary,
  keys: readonly Key[],
): Pick<TerminologyDictionary, Key> {
  const picked = {} as Pick<TerminologyDictionary, Key>

  for (const key of keys) {
    picked[key] = dictionary[key]
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
