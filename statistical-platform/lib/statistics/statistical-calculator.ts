/**
 * 통계 계산 브릿지
 * 템플릿 컴포넌트와 Pyodide 서비스를 연결
 *
 * Phase 6: PyodideCore 직접 연결
 * - PyodideStatisticsService Facade 제거
 * - PyodideCoreService 직접 사용
 */

import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { PyodideStatisticsService } from '@/lib/services/pyodide-statistics'
import { useAnalysisCacheStore } from '@/lib/stores/analysis-cache-store'
import type { CalculationResult } from '@/types/statistics/calculation'
import { MethodRouter } from './method-router'

export class StatisticalCalculator {
  private static pyodideCore = PyodideCoreService.getInstance()
  private static pyodideService = PyodideStatisticsService.getInstance()
  private static initializationPromise: Promise<void> | null = null
  private static router: MethodRouter | null = null

  /**
   * UI에서 오는 메서드 ID를 계산기 내부의 정규화된 ID로 변환
   */
  private static toCanonicalMethodId(methodId: string): string {
    const map: Record<string, string> = {
      // ANOVA 사후검정 ID 정합성
      bonferroniPostHoc: 'bonferroni',
      gamesHowellPostHoc: 'gamesHowell',

      // 고급분석: UI id → 내부 id
      principalComponentAnalysis: 'pca'
    }
    return map[methodId] || methodId
  }

  /**
   * 통계 방법에 따라 적절한 계산 함수 호출
   */
  static async calculate(
    methodId: string,
    data: any[],
    parameters: Record<string, any>
  ): Promise<CalculationResult> {
    try {
      // 캐시 확인
      const cacheStore = useAnalysisCacheStore.getState()
      const cached = await cacheStore.getCachedResult(methodId, data, parameters)
      if (cached && cached.result) {
        console.log(`[통계계산] 캐시에서 결과 반환: ${methodId}`)
        return { success: true, data: cached.result }
      }

      // Pyodide 초기화 확인 (중복 방지)
      if (!this.pyodideCore.isInitialized()) {
        if (!this.initializationPromise) {
          this.initializationPromise = this.pyodideCore.initialize()
        }
        await this.initializationPromise
      }

      // 라우터 초기화 (Pyodide 초기화 후)
      if (!this.router) {
        this.router = new MethodRouter({
          pyodideCore: this.pyodideCore,
          pyodideService: this.pyodideService
        })
      }

      // 메서드별 계산 실행
      const canonicalId = this.toCanonicalMethodId(methodId)
      const result = await this.executeCalculation(canonicalId, data, parameters)

      // 계산 성공 시 결과 캐싱
      if (result.success && result.data) {
        await cacheStore.setCachedResult(methodId, data, parameters, result.data)
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '계산 중 오류 발생'
      }
    }
  }

  private static async executeCalculation(
    canonicalId: string,
    data: any[],
    parameters: Record<string, any>
  ): Promise<CalculationResult> {
    // 모든 메서드를 라우터로 처리
    if (this.router && this.router.supports(canonicalId)) {
      return await this.router.dispatch(canonicalId as any, data, parameters)
    }

    // 라우터가 지원하지 않는 메서드
    return {
      success: false,
      error: `통계 방법 '${canonicalId}'는 지원되지 않습니다`
    }
  }
}
