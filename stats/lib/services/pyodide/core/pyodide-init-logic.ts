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
 * helpers.py를 Pyodide 가상 파일시스템에 등록하고 sys.modules에 추가
 *
 * ✅ 수정 내용 (2025-11-22):
 * - 기존: 파일 쓰기 + 코드 실행만 (sys.modules에 미등록)
 * - 수정: 파일 쓰기 + import 수행 (sys.modules에 정상 등록)
 * - 결과: Worker3에서 "from helpers import ..." 정상 작동
 *
 * @param pyodide - Pyodide 인스턴스
 * @param helpersCode - helpers.py 파일 내용
 * @throws helpers.py 등록 실패 시
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
  // 1. helpers.py를 안전한 작업 디렉터리에 저장
  const helpersPath = '/home/pyodide/helpers.py'

  try {
    // 디렉터리 생성 (이미 존재하면 무시)
    try {
      pyodide.FS.mkdir('/home/pyodide')
    } catch (e) {
      // 디렉터리가 이미 존재하면 무시
    }

    pyodide.FS.writeFile(helpersPath, helpersCode)
    console.log('[Pyodide] ✓ helpers.py written to', helpersPath)

    // 2. sys.path에 경로 추가 + 실제 import 수행하여 sys.modules에 등록
    await pyodide.runPythonAsync(`
import sys
import importlib.util

# 작업 디렉터리를 sys.path에 추가
if '/home/pyodide' not in sys.path:
    sys.path.insert(0, '/home/pyodide')
    print('[Python] Added /home/pyodide to sys.path')

# importlib로 helpers 모듈을 명시적으로 sys.modules에 등록
spec = importlib.util.spec_from_file_location('helpers', '${helpersPath}')
if spec is None or spec.loader is None:
    raise ImportError('Failed to create module spec for helpers.py')

module = importlib.util.module_from_spec(spec)
sys.modules['helpers'] = module
spec.loader.exec_module(module)

print('[Python] ✓ helpers module registered in sys.modules')
`)

    console.log('[Pyodide] ✓ helpers module registered in sys.modules')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Pyodide] Failed to register helpers module:', errorMessage)
    throw new Error(`helpers.py registration failed: ${errorMessage}`)
  }
}

/**
 * Pyodide 초기화 단계 검증
 *
 * @param pyodide - Pyodide 인스턴스
 * @param expectedVersion - 예상 버전 (예: 'v0.29.3')
 * @returns 초기화 상태
 *
 * @example
 * ```typescript
 * const state = validateInitialization(pyodide, 'v0.29.3')
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
 * const packages = getAdditionalPackages(3)  // ['statsmodels', 'scikit-learn']
 * await pyodide.loadPackage(packages)
 * ```
 */
export function getAdditionalPackages(workerNum: number): string[] {
  const packageMap: Record<number, string[]> = {
    1: [], // worker1-descriptive.py (numpy, scipy만 사용)
    2: [], // worker2-hypothesis.py (numpy, scipy만 사용)
    3: ['statsmodels', 'scikit-learn'], // worker3-nonparametric-anova.py (KMeans, PCA, LDA, Factor Analysis)
    4: ['statsmodels', 'scikit-learn'], // worker4-regression-advanced.py (stepwise regression + cluster/factor)
    5: ['scikit-learn'] // worker5-survival.py (KM scipy 직접 구현, ROC sklearn)
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
    4: 'worker4-regression-advanced',
    5: 'worker5-survival'
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
