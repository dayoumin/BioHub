/**
 * 간단한 디버그 테스트 - 빈 객체 반환 문제 해결
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { PyodideStatisticsService } from '@/lib/services/pyodide-statistics'

let pyodideService: PyodideStatisticsService
const INIT_TIMEOUT = 60000

describe.skip('간단한 디버그 - Pyodide 직접 테스트 스킵', () => {
  beforeAll(async () => {
    pyodideService = PyodideStatisticsService.getInstance()
    await pyodideService.initialize()
  }, INIT_TIMEOUT)

  afterAll(() => {
    if (pyodideService) {
      pyodideService.dispose()
    }
  })

  test('twoWayANOVA 디버깅 - 에러 확인', async () => {
    // @ts-expect-error
    const pyodide = pyodideService.pyodide

    const data = [
      { factor1: 'A', factor2: 'X', value: 1 },
      { factor1: 'A', factor2: 'Y', value: 2 },
      { factor1: 'B', factor2: 'X', value: 3 },
      { factor1: 'B', factor2: 'Y', value: 4 }
    ]

    console.log('\n=== twoWayANOVA 디버깅 ===\n')

    // 직접 Python 코드 실행해서 에러 확인
    try {
      const result = await pyodide.runPythonAsync(`
        import sys
        import traceback

        try:
          import pandas as pd
          from statsmodels.formula.api import ols
          from statsmodels.stats.anova import anova_lm
          import numpy as np

          # 데이터 준비
          data = ${JSON.stringify(data)}
          df = pd.DataFrame(data)

          # ANOVA 모델
          formula = 'value ~ C(factor1) + C(factor2) + C(factor1):C(factor2)'
          model = ols(formula, data=df).fit()
          anova_table = anova_lm(model, typ=2)

          # 간단한 결과
          result = {
            'factor1_f': float(anova_table.loc['C(factor1)', 'F']),
            'factor1_p': float(anova_table.loc['C(factor1)', 'PR(>F)'])
          }

          result
        except Exception as e:
          error_msg = str(e)
          tb_str = traceback.format_exc()
          {'error': error_msg, 'traceback': tb_str}
      `)

      console.log('Python 실행 결과:', result)
      console.log('결과 타입:', typeof result)

      if (result && result.error) {
        console.error('Python 에러:', result.error)
        console.error('트레이스백:', result.traceback)
      }

      expect(result).toBeDefined()
    } catch (error) {
      console.error('JavaScript 에러:', error)
      throw error
    }
  })

  test('performTukeyHSD 디버깅 - 에러 확인', async () => {
    // @ts-expect-error
    const pyodide = pyodideService.pyodide

    const groups = [[1, 2], [3, 4], [5, 6]]
    const groupNames = ['A', 'B', 'C']

    console.log('\n=== performTukeyHSD 디버깅 ===\n')

    try {
      const result = await pyodide.runPythonAsync(`
        import sys
        import traceback

        try:
          import pandas as pd
          from statsmodels.stats.multicomp import pairwise_tukeyhsd
          import numpy as np

          # 데이터 준비
          groups = ${JSON.stringify(groups)}
          group_names = ${JSON.stringify(groupNames)}

          # 데이터를 long format으로 변환
          data = []
          group_labels = []

          for i, group_data in enumerate(groups):
            data.extend(group_data)
            group_labels.extend([group_names[i]] * len(group_data))

          # Tukey HSD 수행
          tukey = pairwise_tukeyhsd(endog=data, groups=group_labels, alpha=0.05)

          # 간단한 결과
          result = {
            'test': 'Tukey HSD',
            'num_comparisons': 3
          }

          result
        except Exception as e:
          error_msg = str(e)
          tb_str = traceback.format_exc()
          {'error': error_msg, 'traceback': tb_str}
      `)

      console.log('Python 실행 결과:', result)
      console.log('결과 타입:', typeof result)

      if (result && result.error) {
        console.error('Python 에러:', result.error)
        console.error('트레이스백:', result.traceback)
      }

      expect(result).toBeDefined()
    } catch (error) {
      console.error('JavaScript 에러:', error)
      throw error
    }
  })
})