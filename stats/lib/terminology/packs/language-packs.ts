import type { AppLanguageCode } from '@/lib/preferences'
import type { LanguagePack } from './pack-types'
import { aquaculture } from '../domains/aquaculture'
import { generic } from '../domains/generic'
import { extractLanguageOwnedSections } from './extract-pack-sections'

export const LANGUAGE_PACKS: Record<AppLanguageCode, LanguagePack> = {
  ko: {
    language: 'ko',
    fallbackDictionary: aquaculture,
    sections: extractLanguageOwnedSections(aquaculture),
  },
  en: {
    language: 'en',
    fallbackDictionary: generic,
    sections: extractLanguageOwnedSections(generic),
  },
}
