/**
 * Runtime-only Pyodide Loader
 *
 * 빌드 타임이 아닌 런타임에서만 Pyodide를 로드
 * - 완전한 동적 로딩
 * - 번들에 포함되지 않음
 * - CDN에서 직접 로드
 */

import { PYODIDE } from './constants'
import type { PyodideInterface } from '@/types/pyodide'

export type PyodideStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface PyodideState {
  instance: PyodideInterface | null
  status: PyodideStatus
  progress: string
  error: string | null
}

let pyodideState: PyodideState = {
  instance: null,
  status: 'idle',
  progress: '',
  error: null
}

const listeners = new Set<(state: PyodideState) => void>()

function notifyListeners() {
  listeners.forEach(listener => listener(pyodideState))
}

export function subscribeToPyodide(listener: (state: PyodideState) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getPyodideState(): PyodideState {
  return pyodideState
}

export async function loadPyodideRuntime(): Promise<void> {
  if (typeof window === 'undefined') {
    console.warn('Pyodide는 브라우저에서만 실행됩니다.')
    return
  }

  if (pyodideState.status === 'ready' || pyodideState.status === 'loading') {
    return
  }

  try {
    pyodideState = { ...pyodideState, status: 'loading', progress: '🐍 Python WebAssembly 로딩 시작...' }
    notifyListeners()

    // CDN에서 Pyodide 스크립트 직접 로드
    if (!(window as typeof window & { loadPyodide?: unknown }).loadPyodide) {
      const script = document.createElement('script')
      script.src = PYODIDE.SCRIPT_URL
      document.head.appendChild(script)
      
      await new Promise((resolve, reject) => {
        script.onload = resolve
        script.onerror = reject
      })
    }

    pyodideState = { ...pyodideState, progress: '📦 Python 환경 초기화 중...' }
    notifyListeners()

    // Pyodide 인스턴스 생성
    const pyodide = await (window as typeof window & {
      loadPyodide: (options: { indexURL: string }) => Promise<PyodideInterface>
    }).loadPyodide({
      indexURL: PYODIDE.CDN_URL
    })

    pyodideState = { ...pyodideState, progress: '📊 SciPy 패키지 설치 중... (잠시만 기다려주세요)' }
    notifyListeners()

    // 필수 패키지 설치
    await pyodide.loadPackage(PYODIDE.PACKAGES)

    pyodideState = { 
      instance: pyodide, 
      status: 'ready', 
      progress: '✅ 통계 분석 엔진 준비 완료!',
      error: null 
    }
    notifyListeners()

    console.log('✅ Pyodide 런타임 로딩 완료')

  } catch (error) {
    console.error('❌ Pyodide 런타임 로딩 실패:', error)
    pyodideState = { 
      ...pyodideState, 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
    notifyListeners()
  }
}

/**
 * Pyodide 인스턴스 가져오기
 */
export function getPyodideInstance(): PyodideInterface | null {
  return pyodideState.instance
}

/**
 * Pyodide 사용 가능 여부 확인
 */
export function isPyodideReady(): boolean {
  return pyodideState.status === 'ready' && pyodideState.instance !== null
}