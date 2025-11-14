/**
 * Pyodide 초기화 로직 (Worker 독립적)
 *
 * 목적: Web Worker 컨텍스트와 독립적인 순수 함수로 초기화 로직을 구현
 * 이유: Jest에서 테스트 가능하도록 Worker 외부로 분리
 *
 * 이 파일의 함수들은:
 * - Web Worker에서 사용됨 (pyodide-worker.ts)
 * - Jest 테스트에서 직접 import 가능 (회귀 방지)
 */

import type { PyodideInterface } from '@/types/pyodide'

/**
 * helpers.py를 Pyodide 가상 파일시스템에 등록하고 실행
 *
 * @param pyodide - Pyodide 인스턴스
 * @param helpersCode - helpers.py 파일 내용
 * @throws helpers.py 실행 중 에러 발생 시
 *
 * @example
 * ```typescript
 * const helpersCode = await fetch('/workers/python/helpers.py').then(r => r.text())
 * await registerHelpersModule(pyodide, helpersCode)
 * ```
 */
export async function registerHelpersModule(
  pyodide: PyodideInterface,
  helpersCode: string
): Promise<void> {
  // 1. helpers.py를 가상 파일시스템에 등록
  pyodide.FS.writeFile('/helpers.py', helpersCode)

  // 2. helpers.py 실행 (import 가능하게 만듦)
  await pyodide.runPythonAsync(helpersCode)
}

/**
 * Pyodide 초기화 단계 검증
 *
 * @param pyodide - Pyodide 인스턴스
 * @param expectedVersion - 예상 버전 (예: 'v0.28.3')
 * @returns 초기화 상태
 *
 * @example
 * ```typescript
 * const state = validateInitialization(pyodide, 'v0.28.3')
 * if (!state.isValid) {
 *   throw new Error(state.errors.join(', '))
 * }
 * ```
 */
export function validateInitialization(
  pyodide: PyodideInterface | null,
  expectedVersion?: string
): {
  isValid: boolean
  errors: string[]
  version?: string
} {
  const errors: string[] = []

  if (!pyodide) {
    errors.push('Pyodide instance is null')
    return { isValid: false, errors }
  }

  if (!pyodide.version) {
    errors.push('Pyodide version is missing')
  }

  if (expectedVersion && pyodide.version !== expectedVersion) {
    errors.push(`Version mismatch: expected ${expectedVersion}, got ${pyodide.version}`)
  }

  if (!pyodide.FS) {
    errors.push('Pyodide.FS is missing')
  }

  if (!pyodide.loadPackage) {
    errors.push('Pyodide.loadPackage is missing')
  }

  if (!pyodide.runPythonAsync) {
    errors.push('Pyodide.runPythonAsync is missing')
  }

  return {
    isValid: errors.length === 0,
    errors,
    version: pyodide.version
  }
}

/**
 * Worker별 추가 패키지 목록
 *
 * @param workerNum - Worker 번호 (1-4)
 * @returns 패키지 목록
 *
 * @example
 * ```typescript
 * const packages = getAdditionalPackages(3)  // ['statsmodels']
 * await pyodide.loadPackage(packages)
 * ```
 */
export function getAdditionalPackages(workerNum: number): string[] {
  const packageMap: Record<number, string[]> = {
    1: [], // worker1-descriptive.py (numpy, scipy만 사용)
    2: [], // worker2-hypothesis.py (numpy, scipy만 사용)
    3: ['statsmodels'], // worker3-nonparametric-anova.py (Mood's median test)
    4: ['statsmodels', 'scikit-learn'] // worker4-regression-advanced.py (stepwise regression + cluster/factor)
  }

  return packageMap[workerNum] || []
}

/**
 * Python Worker 파일명 매핑
 *
 * @param workerNum - Worker 번호 (1-4)
 * @returns Python 파일명 (확장자 제외)
 * @throws 잘못된 Worker 번호인 경우
 *
 * @example
 * ```typescript
 * const fileName = getWorkerFileName(1)  // 'worker1-descriptive'
 * const scriptUrl = `/workers/python/${fileName}.py`
 * ```
 */
export function getWorkerFileName(workerNum: number): string {
  const fileNameMap: Record<number, string> = {
    1: 'worker1-descriptive',
    2: 'worker2-hypothesis',
    3: 'worker3-nonparametric-anova',
    4: 'worker4-regression-advanced'
  }

  const fileName = fileNameMap[workerNum]
  if (!fileName) {
    throw new Error(`Invalid worker number: ${workerNum}`)
  }

  return fileName
}

/**
 * 초기화 순서 검증
 *
 * Pyodide 초기화는 다음 순서를 따라야 함:
 * 1. Pyodide 인스턴스 로드
 * 2. 코어 패키지 로드 (numpy, scipy)
 * 3. helpers.py 등록 및 실행
 * 4. Worker 모듈 로드 시 추가 패키지 먼저 로드
 * 5. Worker 모듈 실행 (이제 import 가능)
 *
 * @param steps - 실행된 단계 목록
 * @returns 검증 결과
 */
export function validateInitializationOrder(
  steps: string[]
): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // 1. 'loadPyodide' 먼저 실행되어야 함
  const loadPyodideIndex = steps.indexOf('loadPyodide')
  if (loadPyodideIndex === -1) {
    errors.push('loadPyodide step is missing')
  }

  // 2. 'loadPackage' (numpy, scipy)가 helpers.py 전에 실행
  const loadPackageIndex = steps.indexOf('loadPackage')
  if (loadPackageIndex === -1) {
    errors.push('loadPackage step is missing')
  }

  // 3. 'writeFile' (helpers.py)가 loadPackage 후 실행
  const writeFileIndex = steps.indexOf('writeFile')
  if (writeFileIndex === -1) {
    errors.push('writeFile step is missing')
  }

  // 4. 순서 검증
  if (loadPyodideIndex !== -1 && loadPackageIndex !== -1) {
    if (loadPyodideIndex > loadPackageIndex) {
      errors.push('loadPyodide must run before loadPackage')
    }
  }

  if (loadPackageIndex !== -1 && writeFileIndex !== -1) {
    if (loadPackageIndex > writeFileIndex) {
      errors.push('loadPackage must run before writeFile')
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
