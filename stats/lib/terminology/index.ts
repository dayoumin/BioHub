/**
 * Terminology System - Public API
 *
 * 도메인별 용어 사전 시스템
 */

// Context & Provider
export {
  TerminologyProvider,
  TerminologyContext,
  registerTerminology,
  getAvailableDomains
} from './terminology-context'

// Types
export type {
  TerminologyDictionary,
  TerminologyContextValue,
  VariableTerminology,
  VariableSelectorTerminology,
  ValidationMessages,
  SuccessMessages,
  SelectorUIText,
  StatisticalMethodTerminology
} from './terminology-types'

// Domains
export { aquaculture } from './domains/aquaculture'
export { generic } from './domains/generic'
