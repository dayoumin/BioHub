/**
 * Methods Registry Types
 *
 * methods-registry.json에서 자동 생성 가능한 타입 정의
 * Single Source of Truth에서 파생된 TypeScript 타입
 *
 * @module MethodsRegistryTypes
 */

import methodsRegistry from './methods-registry.json'

// ========================================
// 기본 타입
// ========================================

/**
 * Worker 번호 타입
 */
export type WorkerNumber = 1 | 2 | 3 | 4

/**
 * Worker 키 타입
 */
export type WorkerKey = 'worker1' | 'worker2' | 'worker3' | 'worker4'

/**
 * Worker 번호 → 키 매핑
 */
export const WORKER_NUM_TO_KEY: Record<WorkerNumber, WorkerKey> = {
  1: 'worker1',
  2: 'worker2',
  3: 'worker3',
  4: 'worker4'
}

/**
 * Worker 키 → 번호 매핑
 */
export const WORKER_KEY_TO_NUM: Record<WorkerKey, WorkerNumber> = {
  worker1: 1,
  worker2: 2,
  worker3: 3,
  worker4: 4
}

// ========================================
// 레지스트리 타입 추출
// ========================================

/**
 * 전체 레지스트리 타입
 */
export type MethodsRegistry = typeof methodsRegistry

/**
 * Worker 정의 타입
 */
export interface WorkerDefinition {
  name: string
  description: string
  packages: string[]
  methods: Record<string, MethodDefinition>
}

/**
 * 메서드 정의 타입
 */
export interface MethodDefinition {
  params: string[]
  returns: string[]
  description: string
  status?: 'active' | 'todo' | 'experimental' | 'deprecated'
  since?: string
  replacement?: string
  notes?: string
}

// ========================================
// 메서드 이름 추출
// ========================================

/**
 * Worker 1 메서드 이름
 */
export type Worker1Method = keyof typeof methodsRegistry.worker1.methods

/**
 * Worker 2 메서드 이름
 */
export type Worker2Method = keyof typeof methodsRegistry.worker2.methods

/**
 * Worker 3 메서드 이름
 */
export type Worker3Method = keyof typeof methodsRegistry.worker3.methods

/**
 * Worker 4 메서드 이름
 */
export type Worker4Method = keyof typeof methodsRegistry.worker4.methods

/**
 * 모든 메서드 이름 (Union)
 */
export type AllMethodNames =
  | Worker1Method
  | Worker2Method
  | Worker3Method
  | Worker4Method

// ========================================
// 유틸리티 함수
// ========================================

/**
 * 메서드가 속한 Worker 번호 찾기
 *
 * @param methodName 메서드 이름
 * @returns Worker 번호 (1-4) 또는 null
 */
export function getWorkerForMethod(methodName: string): WorkerNumber | null {
  if (methodName in methodsRegistry.worker1.methods) return 1
  if (methodName in methodsRegistry.worker2.methods) return 2
  if (methodName in methodsRegistry.worker3.methods) return 3
  if (methodName in methodsRegistry.worker4.methods) return 4
  return null
}

/**
 * 메서드 정의 가져오기
 *
 * @param methodName 메서드 이름
 * @returns 메서드 정의 또는 null
 */
export function getMethodDefinition(methodName: string): MethodDefinition | null {
  const workerNum = getWorkerForMethod(methodName)
  if (!workerNum) return null

  const workerKey = WORKER_NUM_TO_KEY[workerNum]
  const worker = methodsRegistry[workerKey] as WorkerDefinition
  return worker.methods[methodName] || null
}

/**
 * Worker의 모든 메서드 이름 가져오기
 *
 * @param workerNum Worker 번호
 * @returns 메서드 이름 배열
 */
export function getWorkerMethods(workerNum: WorkerNumber): string[] {
  const workerKey = WORKER_NUM_TO_KEY[workerNum]
  const worker = methodsRegistry[workerKey] as WorkerDefinition
  return Object.keys(worker.methods)
}

/**
 * 메서드 존재 여부 확인
 *
 * @param methodName 메서드 이름
 * @returns 존재 여부
 */
export function methodExists(methodName: string): boolean {
  return getWorkerForMethod(methodName) !== null
}

/**
 * 모든 메서드 목록 가져오기
 *
 * @returns { workerNum, methodName, definition }[] 배열
 */
export function getAllMethods(): Array<{
  workerNum: WorkerNumber
  methodName: string
  definition: MethodDefinition
}> {
  const result: Array<{
    workerNum: WorkerNumber
    methodName: string
    definition: MethodDefinition
  }> = []

  for (const workerNum of [1, 2, 3, 4] as WorkerNumber[]) {
    const workerKey = WORKER_NUM_TO_KEY[workerNum]
    const worker = methodsRegistry[workerKey] as WorkerDefinition

    for (const [methodName, definition] of Object.entries(worker.methods)) {
      result.push({
        workerNum,
        methodName,
        definition: definition as MethodDefinition
      })
    }
  }

  return result
}

/**
 * 레지스트리 통계 가져오기
 */
export function getRegistryStats(): {
  totalMethods: number
  methodsByWorker: Record<WorkerNumber, number>
} {
  const methodsByWorker: Record<WorkerNumber, number> = {
    1: Object.keys(methodsRegistry.worker1.methods).length,
    2: Object.keys(methodsRegistry.worker2.methods).length,
    3: Object.keys(methodsRegistry.worker3.methods).length,
    4: Object.keys(methodsRegistry.worker4.methods).length
  }

  return {
    totalMethods: methodsByWorker[1] + methodsByWorker[2] + methodsByWorker[3] + methodsByWorker[4],
    methodsByWorker
  }
}

// ========================================
// 레지스트리 Export
// ========================================

export { methodsRegistry }
export default methodsRegistry
