import type { AppLanguageCode, AppTerminologyDomain } from '@/lib/preferences'
import type { TerminologyDictionary } from '../terminology-types'
import type {
  DomainOwnedTerminologyKey,
  LanguageOwnedTerminologyKey,
} from './pack-section-keys'

export type DomainOverrideSections = Partial<Pick<
  TerminologyDictionary,
  | 'displayName'
  | 'variables'
  | 'validation'
  | 'success'
  | 'selectorUI'
  | 'purposeInput'
  | 'hub'
>>

export type LanguageOwnedSections = Pick<TerminologyDictionary, LanguageOwnedTerminologyKey>
export type DomainOwnedSections = Pick<TerminologyDictionary, DomainOwnedTerminologyKey>

export interface LanguagePack {
  language: AppLanguageCode
  fallbackDictionary: TerminologyDictionary
  sections: LanguageOwnedSections
}

export interface DomainPack {
  domain: AppTerminologyDomain
  displayNames: Record<AppLanguageCode, string>
  sectionsByLanguage?: Partial<Record<AppLanguageCode, DomainOwnedSections>>
  exactDictionaries?: Partial<Record<AppLanguageCode, TerminologyDictionary>>
  overrides?: Partial<Record<AppLanguageCode, DomainOverrideSections>>
}
