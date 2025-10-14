/**
 * Pyodide 통계 서비스 기본 클래스
 *
 * 모든 통계 계산은 Python의 SciPy/NumPy를 통해 수행되어야 합니다.
 * JavaScript 통계 라이브러리는 신뢰성이 검증되지 않았으므로 사용하지 않습니다.
 */

import type { PyodideInterface } from './types'
import { getPyodideCDNUrls } from '@/lib/constants'

export abstract class BasePyodideService {
  protected pyodide: PyodideInterface | null = null
  private static pyodideInstance: PyodideInterface | null = null
  private static isLoading = false
  private static loadPromise: Promise<void> | null = null

  protected constructor() {}

  /**
   * Python 결과를 파싱하는 헬퍼 메서드
   */
  protected parsePythonResult<T>(payload: any): T {
    if (typeof payload === 'string') {
      try {
        return JSON.parse(payload) as T
      } catch {
        // 문자열이지만 JSON 아님
        return payload as T
      }
    }
    return payload as T
  }

  /**
   * Pyodide 초기화 (모든 서비스에서 공유)
   */
  protected async initialize(): Promise<void> {
    if (BasePyodideService.pyodideInstance) {
      this.pyodide = BasePyodideService.pyodideInstance
      return
    }

    if (BasePyodideService.isLoading && BasePyodideService.loadPromise) {
      await BasePyodideService.loadPromise
      this.pyodide = BasePyodideService.pyodideInstance
      return
    }

    BasePyodideService.isLoading = true
    BasePyodideService.loadPromise = this._loadPyodide()

    try {
      await BasePyodideService.loadPromise
      this.pyodide = BasePyodideService.pyodideInstance
    } catch (error) {
      console.error('[BasePyodideService] 초기화 실패:', error)
      throw error
    } finally {
      BasePyodideService.isLoading = false
    }
  }

  private async _loadPyodide(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Pyodide는 브라우저 환경에서만 사용 가능합니다')
    }

    console.log('[BasePyodideService] 초기화 시작...')

    // Pyodide CDN URL 가져오기 (환경 변수 자동 반영)
    const cdnUrls = getPyodideCDNUrls()
    console.log(`[BasePyodideService] 버전: ${cdnUrls.version}`)

    // Pyodide CDN에서 로드
    if (!window.loadPyodide) {
      console.log('[BasePyodideService] Pyodide 스크립트 로딩...')
      const script = document.createElement('script')
      script.src = cdnUrls.scriptURL
      script.async = true

      await new Promise((resolve, reject) => {
        script.onload = () => {
          console.log('[BasePyodideService] 스크립트 로드 완료')
          resolve(true)
        }
        script.onerror = (error) => {
          console.error('[BasePyodideService] 스크립트 로드 실패:', error)
          reject(new Error('Pyodide 스크립트 로드 실패'))
        }
        document.head.appendChild(script)
      })
    } else {
      console.log('[BasePyodideService] Pyodide 이미 로드됨')
    }

    // Pyodide 초기화
    console.log('[BasePyodideService] Pyodide 인스턴스 생성 중...')
    try {
      if (!window.loadPyodide) {
        throw new Error('window.loadPyodide가 로드되지 않았습니다')
      }
      BasePyodideService.pyodideInstance = await window.loadPyodide({
        indexURL: cdnUrls.indexURL
      })
      console.log('[BasePyodideService] Pyodide 인스턴스 생성 완료')

      // window.pyodide에도 저장 (디버깅용)
      ;(window as any).pyodide = BasePyodideService.pyodideInstance
    } catch (error) {
      console.error('[BasePyodideService] Pyodide 인스턴스 생성 실패:', error)
      throw error
    }

    // 필수 패키지 로드
    console.log('[BasePyodideService] 패키지 로딩 중... (numpy, scipy, pandas, scikit-learn)')
    try {
      await BasePyodideService.pyodideInstance!.loadPackage(['numpy', 'scipy', 'pandas', 'scikit-learn', 'statsmodels'])
      console.log('[BasePyodideService] 패키지 로드 완료')
    } catch (error) {
      console.error('[BasePyodideService] 패키지 로드 실패:', error)
      throw error
    }

    // 기본 imports
    console.log('[BasePyodideService] Python 기본 imports 실행 중...')
    await BasePyodideService.pyodideInstance!.runPython(`
      import numpy as np
      import pandas as pd
      from scipy import stats
      import warnings
      warnings.filterwarnings('ignore')
    `)
    console.log('[BasePyodideService] 초기화 완료!')
  }

  /**
   * 초기화 상태 확인
   */
  protected isInitialized(): boolean {
    return this.pyodide !== null
  }

  /**
   * 리소스 정리
   */
  protected dispose(): void {
    // Pyodide 인스턴스는 공유되므로 개별 서비스에서는 정리하지 않음
    this.pyodide = null
  }

  /**
   * 안전한 Python 코드 실행 헬퍼
   */
  protected async runPythonSafely(code: string): Promise<any> {
    if (!this.pyodide) {
      throw new Error('Pyodide가 초기화되지 않았습니다')
    }

    try {
      return await this.pyodide.runPython(code)
    } catch (error) {
      console.error('[BasePyodideService] Python 코드 실행 오류:', error)
      throw new Error(`Python 실행 오류: ${error}`)
    }
  }

  /**
   * 데이터 설정 헬퍼
   */
  protected setData(name: string, data: any): void {
    if (!this.pyodide) {
      throw new Error('Pyodide가 초기화되지 않았습니다')
    }
    this.pyodide.globals.set(name, data)
  }

  /**
   * 데이터 가져오기 헬퍼
   */
  protected getData(name: string): any {
    if (!this.pyodide) {
      throw new Error('Pyodide가 초기화되지 않았습니다')
    }
    return this.pyodide.globals.get(name)
  }
}