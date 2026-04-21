export type AppLanguageCode = 'ko' | 'en'

export type AppTerminologyDomain = 'aquaculture' | 'generic' | 'medical'

export interface AppPreferencesContextValue {
  currentLanguage: AppLanguageCode
  currentDomain: AppTerminologyDomain
  locale: string
  setLanguage: (language: AppLanguageCode) => void
  setDomain: (domain: AppTerminologyDomain) => void
}
