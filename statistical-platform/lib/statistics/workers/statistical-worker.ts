/**
 * Statistical Worker Script
 *
 * Phase 5-3: Worker Pool 구현
 * - Web Worker 컨텍스트에서 실행
 * - Pyodide 초기화 및 Python 스크립트 로딩
 * - 메시지 핸들러 (init, execute, terminate)
 */

import type { WorkerMessage, WorkerResponse } from './worker-types'
import { WORKER_PACKAGES } from './worker-types'

// ============================================================================
// Worker State
// ============================================================================

let workerNum: number | null = null
let pyodide: unknown = null
let isInitialized = false

// ============================================================================
// Message Handler
// ============================================================================

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, method, params, workerNum: msgWorkerNum } = event.data

  try {
    switch (type) {
      case 'init':
        await handleInit(id, msgWorkerNum!)
        break

      case 'execute':
        await handleExecute(id, method!, params ?? {})
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

async function handleInit(requestId: string, num: number): Promise<void> {
  if (isInitialized) {
    sendSuccess(requestId, { status: 'already_initialized' })
    return
  }

  workerNum = num

  try {
    // Step 1: Load Pyodide
    console.log(`[Worker ${workerNum}] Loading Pyodide...`)
    // @ts-expect-error - loadPyodide is loaded from CDN
    pyodide = await self.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
    })

    // Step 2: Load required packages
    const packages = WORKER_PACKAGES[workerNum] ?? []
    console.log(`[Worker ${workerNum}] Loading packages:`, packages)

    // @ts-expect-error - pyodide is loaded dynamically
    await pyodide.loadPackage(['micropip', ...packages])

    // Step 3: Load Python worker script
    console.log(`[Worker ${workerNum}] Loading Python script...`)
    const scriptUrl = `/workers/python/worker${workerNum}.py`
    const response = await fetch(scriptUrl)

    if (!response.ok) {
      throw new Error(`Failed to load Python script: ${response.statusText}`)
    }

    const pythonCode = await response.text()

    // @ts-expect-error - pyodide is loaded dynamically
    await pyodide.runPythonAsync(pythonCode)

    isInitialized = true
    console.log(`[Worker ${workerNum}] ✓ Initialized`)

    sendSuccess(requestId, { status: 'initialized', workerNum })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[Worker ${workerNum}] Initialization failed:`, errorMessage)
    throw new Error(`Worker ${workerNum} initialization failed: ${errorMessage}`)
  }
}

// ============================================================================
// Execute Handler
// ============================================================================

async function handleExecute(
  requestId: string,
  method: string,
  params: Record<string, unknown>
): Promise<void> {
  if (!isInitialized || !pyodide) {
    throw new Error(`Worker ${workerNum} not initialized`)
  }

  try {
    console.log(`[Worker ${workerNum}] Executing: ${method}`)

    // Convert params to Python-compatible format
    // @ts-expect-error - pyodide is loaded dynamically
    const pyParams = pyodide.toPy(params)

    // Execute Python function
    // @ts-expect-error - pyodide is loaded dynamically
    const pyResult = await pyodide.runPythonAsync(`
import json
result = ${method}(**${JSON.stringify(params)})
json.dumps(result)
    `)

    // Convert result back to JavaScript
    // @ts-expect-error - pyodide is loaded dynamically
    const jsResult = pyodide.toJs(pyResult, { dict_converter: Object.fromEntries })

    console.log(`[Worker ${workerNum}] ✓ ${method} completed`)
    sendSuccess(requestId, jsResult)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[Worker ${workerNum}] Execute failed:`, errorMessage)
    throw new Error(`Worker ${workerNum} execute failed: ${errorMessage}`)
  }
}

// ============================================================================
// Terminate Handler
// ============================================================================

function handleTerminate(): void {
  console.log(`[Worker ${workerNum}] Terminating...`)
  isInitialized = false
  pyodide = null
  workerNum = null
  self.close()
}

// ============================================================================
// Response Helpers
// ============================================================================

function sendSuccess<T = unknown>(id: string, result: T): void {
  const response: WorkerResponse<T> = {
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
// Export for type checking (not used in Worker context)
// ============================================================================

export type {}
