/**
 * 통합 통계 실행자 (Executor 기반)
 * 모든 통계 방법을 개별 Executor를 통해 실행하는 중앙 컨트롤러
 */

import { DescriptiveExecutor } from './descriptive-executor'
import { TTestExecutor } from './t-test-executor'
import { AnovaExecutor } from './anova-executor'
import { RegressionExecutor } from './regression-executor'
import { NonparametricExecutor } from './nonparametric-executor'
import { AdvancedExecutor } from './advanced-executor'
import { AnalysisResult } from './types'
import { StatisticalMethod } from '@/lib/statistics/method-mapping'
import { logger } from '@/lib/utils/logger'

export class StatisticalExecutor {
  private static instance: StatisticalExecutor | null = null

  // 카테고리별 실행자
  private descriptiveExecutor: DescriptiveExecutor
  private tTestExecutor: TTestExecutor
  private anovaExecutor: AnovaExecutor
  private regressionExecutor: RegressionExecutor
  private nonparametricExecutor: NonparametricExecutor
  private advancedExecutor: AdvancedExecutor

  private constructor() {
    this.descriptiveExecutor = new DescriptiveExecutor()
    this.tTestExecutor = new TTestExecutor()
    this.anovaExecutor = new AnovaExecutor()
    this.regressionExecutor = new RegressionExecutor()
    this.nonparametricExecutor = new NonparametricExecutor()
    this.advancedExecutor = new AdvancedExecutor()
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  static getInstance(): StatisticalExecutor {
    if (!StatisticalExecutor.instance) {
      StatisticalExecutor.instance = new StatisticalExecutor()
    }
    return StatisticalExecutor.instance
  }

  /**
   * 통계 방법 실행
   */
  async executeMethod(
    method: StatisticalMethod,
    data: unknown[],
    variableMapping: Record<string, unknown> = {}
  ): Promise<AnalysisResult> {
    logger.info(`통계 분석 실행: ${method.name} (${method.category})`)

    try {
      // 카테고리별로 적절한 실행자 선택
      switch (method.category) {
        case 'descriptive':
          return await this.descriptiveExecutor.execute(data, { method: method.id, ...variableMapping })

        case 't-test':
          return await this.tTestExecutor.execute(data, { method: method.id, ...variableMapping })

        case 'anova':
          return await this.anovaExecutor.execute(data, { method: method.id, ...variableMapping })

        case 'regression':
          return await this.regressionExecutor.execute(data, { method: method.id, ...variableMapping })

        case 'nonparametric':
          return await this.nonparametricExecutor.execute(data, { method: method.id, ...variableMapping })

        case 'advanced':
          return await this.advancedExecutor.execute(data, { method: method.id, ...variableMapping })

        default:
          throw new Error(`지원하지 않는 카테고리: ${method.category}`)
      }
    } catch (error) {
      logger.error(`통계 분석 실행 오류: ${method.name}`, error)

      // 에러를 AnalysisResult 형태로 반환
      return {
        metadata: {
          method: method.name,
          timestamp: new Date().toISOString(),
          duration: 0,
          dataSize: data.length
        },
        mainResults: {
          statistic: 0,
          pvalue: 1,
          interpretation: `분석 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
        },
        additionalInfo: {}
      }
    }
  }
}
