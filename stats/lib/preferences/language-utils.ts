import type { AppLanguageCode } from './app-preferences-types'

export function isEnglishLanguage(language?: string): language is Extract<AppLanguageCode, 'en'> {
  return language === 'en'
}

export function getLocaleForLanguage(language: AppLanguageCode): string {
  return language === 'en' ? 'en-US' : 'ko-KR'
}
