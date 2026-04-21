import type { AppLanguageCode, AppTerminologyDomain } from '@/lib/preferences'
import type { TerminologyDictionary } from '../terminology-types'
import type {
  DomainOwnedTerminologyKey,
  LanguageOwnedTerminologyKey,
  MixedOwnedTerminologyKey,
} from './pack-section-keys'

export type LanguageOwnedSections = Pick<TerminologyDictionary, LanguageOwnedTerminologyKey>
export type MixedOwnedSections = Pick<TerminologyDictionary, MixedOwnedTerminologyKey>
export type DomainOwnedSections = Pick<TerminologyDictionary, DomainOwnedTerminologyKey>
export type DomainOverrideSections = Partial<DomainOwnedSections>

export interface LanguagePack {
  language: AppLanguageCode
  fallbackDictionary: TerminologyDictionary
  sections: LanguageOwnedSections
}

export interface DomainPack {
  domain: AppTerminologyDomain
  displayNames: Record<AppLanguageCode, string>
  sectionsByLanguage?: Partial<Record<AppLanguageCode, DomainOwnedSections>>
  mixedSectionsByLanguage?: Partial<Record<AppLanguageCode, MixedOwnedSections>>
  exactDictionaries?: Partial<Record<AppLanguageCode, TerminologyDictionary>>
  overrides?: Partial<Record<AppLanguageCode, DomainOverrideSections>>
}
