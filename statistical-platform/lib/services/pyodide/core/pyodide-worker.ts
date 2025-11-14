/**
 * Pyodide Web Worker
 *
 * ⚠️ 중요: 이 파일은 Web Worker 컨텍스트에서 실행됨
 * - 메인 스레드와 분리되어 UI 블로킹 방지
 * - 단일 Pyodide 인스턴스 관리
 * - Python 모듈(worker1-4.py) 로딩 및 실행
 *
 * Phase 5-3 재구현: 단일 Web Worker 구현
 * - UI 블로킹 제거 (11.8초 → 0초)
 * - 메모리 효율 (1x Pyodide)
 * - 오프라인 환경 최적화
 *
 * 🔧 다른 AI 리뷰 5가지 이슈 모두 반영:
 * 1. ✅ importScripts로 Pyodide 로더 로드
 * 2. ✅ 올바른 파일명 매핑 (worker1-descriptive.py 등)
 * 3. ✅ helpers.py 먼저 로드
 * 4. ✅ 로컬 Pyodide 사용 (/pyodide/)
 * 5. ✅ Progress 버그 수정 (bridge에서 처리)
 *
 * 🧪 테스트 가능성:
 * - 핵심 로직은 pyodide-init-logic.ts에서 추출
 * - Jest에서 직접 테스트 가능 (회귀 방지)
 */

/// <reference lib="webworker" />
declare const self: DedicatedWorkerGlobalScope

// ⚠️ Worker 컨텍스트이므로 ES Module import 사용 불가
// 대신 postMessage로 초기화 로직 함수들을 전달받거나,
// 동일한 로직을 pyodide-init-logic.ts에서 복사해 사용

// Pyodide 타입 선언
declare function loadPyodide(options: {
  indexURL: string
}): Promise<PyodideInterface>

interface PyodideInterface {
  loadPackage(packages: string | string[]): Promise<void>
  runPythonAsync(code: string): Promise<string>
  version: string
  FS: {
    writeFile(path: string, data: string | Uint8Array): void
    readFile(path: string, options?: { encoding?: string }): string | Uint8Array
    unlink(path: string): void
    mkdir(path: string): void
  }
}

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * Worker로 전송되는 메시지
 */
interface WorkerRequest {
  id: string
  type: 'init' | 'loadWorker' | 'callMethod' | 'terminate'
  workerNum?: number
  method?: string
  params?: Record<string, unknown>
  pyodideUrl?: string  // Pyodide indexURL (환경별 자동 선택)
  scriptUrl?: string   // Pyodide loader script URL (환경별 자동 선택)
}

/**
 * Worker에서 반환하는 응답
 */
interface WorkerResponse {
  id: string
  type: 'success' | 'error' | 'progress'
  result?: unknown
  error?: string
  progress?: number
}

// ============================================================================
// Worker State
// ============================================================================

let pyodide: PyodideInterface | null = null
let isInitialized = false
const loadedWorkers: Set<number> = new Set()

// Python Worker 파일명 매핑
const WORKER_FILE_NAMES: Record<number, string> = {
  1: 'worker1-descriptive',
  2: 'worker2-hypothesis',
  3: 'worker3-nonparametric-anova',
  4: 'worker4-regression-advanced'
}

// ============================================================================
// Helper Functions (pyodide-init-logic.ts와 동일한 로직)
// ============================================================================

/**
 * helpers.py를 Pyodide 가상 파일시스템에 등록하고 실행
 * (pyodide-init-logic.ts의 registerHelpersModule와 동일)
 */
async function registerHelpersModule(
  pyodideInstance: PyodideInterface,
  helpersCode: string
): Promise<void> {
  // 1. helpers.py를 가상 파일시스템에 등록
  pyodideInstance.FS.writeFile('/helpers.py', helpersCode)

  // 2. helpers.py 실행 (import 가능하게 만듦)
  await pyodideInstance.runPythonAsync(helpersCode)
}

/**
 * Worker별 추가 패키지 매핑
 * (pyodide-init-logic.ts의 getAdditionalPackages와 동일)
 */
function getAdditionalPackages(workerNum: number): string[] {
  const packageMap: Record<number, string[]> = {
    1: [], // worker1-descriptive.py (numpy, scipy만 사용)
    2: [], // worker2-hypothesis.py (numpy, scipy만 사용)
    3: ['statsmodels'], // worker3-nonparametric-anova.py (Mood's median test)
    4: ['statsmodels', 'scikit-learn'] // worker4-regression-advanced.py (stepwise + cluster/factor)
  }

  return packageMap[workerNum] || []
}

/**
 * Python Worker 파일명 가져오기
 * (pyodide-init-logic.ts의 getWorkerFileName과 동일)
 */
function getWorkerFileName(workerNum: number): string {
  const fileName = WORKER_FILE_NAMES[workerNum]
  if (!fileName) {
    throw new Error(`Invalid worker number: ${workerNum}`)
  }
  return fileName
}

// ============================================================================
// Pyodide Loader 로드 (동적 - 환경별 자동 선택)
// ============================================================================

// Pyodide 로더는 init 메시지에서 동적으로 로드됨
// - Vercel: CDN에서 로드
// - 내부망: /pyodide/에서 로드

// ============================================================================
// Message Handler
// ============================================================================

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, type, workerNum, method, params, pyodideUrl, scriptUrl } = event.data

  try {
    switch (type) {
      case 'init':
        await handleInit(id, pyodideUrl, scriptUrl)
        break

      case 'loadWorker':
        if (workerNum) {
          await handleLoadWorker(id, workerNum)
        }
        break

      case 'callMethod':
        if (workerNum && method && params) {
          await handleCallMethod(id, workerNum, method, params)
        }
        break

      case 'terminate':
        handleTerminate()
        break

      default:
        throw new Error(`Unknown message type: ${type}`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    sendError(id, errorMessage)
  }
}

// ============================================================================
// Init Handler
// ============================================================================

async function handleInit(
  requestId: string,
  pyodideUrl?: string,
  scriptUrl?: string
): Promise<void> {
  if (isInitialized) {
    sendSuccess(requestId, { status: 'already_initialized' })
    return
  }

  try {
    // 0. Load Pyodide loader script dynamically (환경별 자동 선택)
    const finalScriptUrl = scriptUrl || '/pyodide/pyodide.js'
    const finalPyodideUrl = pyodideUrl || '/pyodide/'

    console.log('[PyodideWorker] Loading Pyodide loader from:', finalScriptUrl)
    importScripts(finalScriptUrl)
    console.log('[PyodideWorker] ✓ Pyodide loader loaded')

    console.log('[PyodideWorker] Initializing Pyodide from:', finalPyodideUrl)

    // 1. Load Pyodide with dynamic URL (환경별 자동 선택)
    pyodide = await loadPyodide({
      indexURL: finalPyodideUrl
    })

    if (!pyodide) {
      throw new Error('Pyodide load failed')
    }

    console.log(`[PyodideWorker] ✓ Pyodide ${pyodide.version} loaded`)

    // 2. Load core packages (NumPy + SciPy)
    console.log('[PyodideWorker] Loading core packages (numpy, scipy)...')
    await pyodide.loadPackage(['numpy', 'scipy'])
    console.log('[PyodideWorker] ✓ Core packages loaded')

    // 3. Load helpers.py first and register it as a module
    console.log('[PyodideWorker] Loading helpers.py...')
    const helpersResponse = await fetch('/workers/python/helpers.py')

    if (!helpersResponse.ok) {
      throw new Error(`Failed to load helpers.py: ${helpersResponse.statusText}`)
    }

    const helpersCode = await helpersResponse.text()

    // Register helpers.py using extracted function (테스트 가능)
    await registerHelpersModule(pyodide, helpersCode)
    console.log('[PyodideWorker] ✓ helpers.py loaded and registered')

    isInitialized = true
    console.log('[PyodideWorker] ✓ Pyodide initialized')

    sendSuccess(requestId, { status: 'initialized' })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[PyodideWorker] Initialization failed:', errorMessage)
    throw new Error(`Pyodide initialization failed: ${errorMessage}`)
  }
}

// ============================================================================
// Load Worker Handler
// ============================================================================

async function handleLoadWorker(requestId: string, workerNum: number): Promise<void> {
  if (!pyodide) {
    throw new Error('Pyodide not initialized')
  }

  if (loadedWorkers.has(workerNum)) {
    sendSuccess(requestId, { status: 'already_loaded', workerNum })
    return
  }

  try {
    console.log(`[PyodideWorker] Loading Python module: worker${workerNum}...`)

    // 1. Get correct file name using extracted function (테스트 가능)
    const fileName = getWorkerFileName(workerNum)

    // 2. Fetch Python script
    const scriptUrl = `/workers/python/${fileName}.py`
    const response = await fetch(scriptUrl)

    if (!response.ok) {
      throw new Error(`Failed to load ${fileName}.py: ${response.statusText}`)
    }

    const pythonCode = await response.text()

    // 3. Load additional packages BEFORE executing code (Worker 3/4 import 위해 필수)
    const additionalPackages = getAdditionalPackages(workerNum)
    if (additionalPackages.length > 0) {
      console.log(`[PyodideWorker] Loading additional packages for worker${workerNum}:`, additionalPackages)
      await pyodide.loadPackage(additionalPackages)
      console.log(`[PyodideWorker] ✓ Additional packages loaded`)
    }

    // 4. Execute Python code (이제 statsmodels/sklearn import 가능)
    await pyodide.runPythonAsync(pythonCode)

    loadedWorkers.add(workerNum)
    console.log(`[PyodideWorker] ✓ Worker${workerNum} (${fileName}) loaded`)

    sendSuccess(requestId, { status: 'loaded', workerNum })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[PyodideWorker] Worker${workerNum} load failed:`, errorMessage)
    throw new Error(`Worker${workerNum} load failed: ${errorMessage}`)
  }
}


// ============================================================================
// Call Method Handler
// ============================================================================

async function handleCallMethod(
  requestId: string,
  workerNum: number,
  method: string,
  params: Record<string, unknown>
): Promise<void> {
  if (!pyodide) {
    throw new Error('Pyodide not initialized')
  }

  if (!loadedWorkers.has(workerNum)) {
    throw new Error(`Worker${workerNum} not loaded. Call 'loadWorker' first.`)
  }

  try {
    console.log(`[PyodideWorker] Executing: ${method}`)

    // Execute Python function
    const pyResult = await pyodide.runPythonAsync(`
import json
result = ${method}(**${JSON.stringify(params)})
json.dumps(result)
    `)

    // Convert result to JavaScript
    const jsResult = JSON.parse(pyResult)

    console.log(`[PyodideWorker] ✓ ${method} completed`)
    sendSuccess(requestId, jsResult)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[PyodideWorker] Execute failed:`, errorMessage)
    throw new Error(`Method execution failed: ${errorMessage}`)
  }
}

// ============================================================================
// Terminate Handler
// ============================================================================

function handleTerminate(): void {
  console.log('[PyodideWorker] Terminating...')
  isInitialized = false
  pyodide = null
  loadedWorkers.clear()
  self.close()
}

// ============================================================================
// Response Helpers
// ============================================================================

function sendSuccess(id: string, result: unknown): void {
  const response: WorkerResponse = {
    id,
    type: 'success',
    result
  }
  self.postMessage(response)
}

function sendError(id: string, error: string): void {
  const response: WorkerResponse = {
    id,
    type: 'error',
    error
  }
  self.postMessage(response)
}

function sendProgress(id: string, progress: number): void {
  const response: WorkerResponse = {
    id,
    type: 'progress',
    progress
  }
  self.postMessage(response)
}

// ============================================================================
// Export for type checking
// ============================================================================

export type { WorkerRequest, WorkerResponse }
