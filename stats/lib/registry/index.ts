/**
 * Method Registry — 통합 메서드 메타데이터 공개 API
 *
 * 새 메서드 추가 시 method-registry.ts에서 registerMethod() 호출.
 * 기존 소비자는 getSelectorType() 등 accessor 사용.
 */

/** 새 메서드 등록 (selectorType + requirements + canonical 정보) */
export { registerMethod } from './method-registry'

/** 메서드 ID → SelectorType 조회 */
export { getSelectorType } from './method-registry'

/** 메서드 ID → Requirements 조회 */
export { getMethodRequirements } from './method-registry'

/** 등록된 메서드 ID 목록 / 레지스트리 크기 */
export { getRegisteredMethodIds, getRegistrySize } from './method-registry'

/** Types */
export type { MethodRegistration, MethodRequirements } from './method-registry'
export type { SelectorType } from './selector-types'
