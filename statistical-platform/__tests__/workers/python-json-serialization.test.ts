/**
 * Python Worker JSON 직렬화 테스트
 *
 * 목적: NumPy boolean 타입이 JSON 직렬화 시 Python native bool로 변환되는지 확인
 * 배경: numpy.bool_ 타입은 Python 3.13의 json.dumps()에서 직렬화 실패
 * 해결: _safe_bool() 함수를 모든 Worker에 적용
 */

import { describe, it, expect } from '@jest/globals'
import { execSync } from 'child_process'

describe('Python Worker JSON Serialization', () => {
  const pythonPath = 'C:/Users/User/AppData/Local/Programs/Python/Python313/python.exe'
  const workerPath = 'statistical-platform/public/workers/python'

  const runPythonTest = (code: string): { type: string; json: unknown } => {
    try {
      const stdout = execSync(`${pythonPath} -c "${code.replace(/"/g, '\\"')}"`, {
        cwd: process.cwd().replace(/statistical-platform$/, ''),
        encoding: 'utf-8',
        timeout: 10000
      })

      const lines = stdout.split('\n').filter(l => l.trim())
      const typeLine = lines.find(l => l.startsWith('TYPE:'))
      const jsonLine = lines.find(l => l.startsWith('JSON:'))

      if (!typeLine || !jsonLine) {
        throw new Error(`Missing output lines:\n${stdout}`)
      }

      const type = typeLine.replace('TYPE:', '')
      const json = JSON.parse(jsonLine.replace('JSON:', ''))

      return { type, json }
    } catch (error) {
      console.error('Python execution error:', error)
      throw error
    }
  }

  describe('Worker 1 - Descriptive Statistics', () => {
    it('normality_test should return Python bool for isNormal', () => {
      const code = `
import sys, json
sys.path.append('${workerPath}')
exec(open('${workerPath}/worker1-descriptive.py', encoding='utf-8').read())
result = normality_test([1,2,3,4,5])
print('TYPE:' + str(type(result['isNormal']).__name__))
print('JSON:' + json.dumps(result))
`

      const { type, json } = runPythonTest(code)

      expect(type).toBe('bool')
      expect(json).toHaveProperty('isNormal')
      expect(typeof (json as { isNormal: boolean }).isNormal).toBe('boolean')
    })

    it('kolmogorov_smirnov_test should serialize without errors', () => {
      const code = `
import sys, json
sys.path.append('${workerPath}')
exec(open('${workerPath}/worker1-descriptive.py', encoding='utf-8').read())
result = kolmogorov_smirnov_test([1,2,3,4,5,6,7,8,9,10])
print('TYPE:' + str(type(result['isNormal']).__name__))
print('JSON:' + json.dumps(result))
`

      const { type, json } = runPythonTest(code)

      expect(type).toBe('bool')
      expect(json).toHaveProperty('isNormal')
      expect(typeof (json as { isNormal: boolean }).isNormal).toBe('boolean')
    })
  })

  describe('Worker 2 - Hypothesis Testing', () => {
    it('levene_test should return Python bool for equalVariance', () => {
      const code = `
import sys, json
sys.path.append('${workerPath}')
exec(open('${workerPath}/worker2-hypothesis.py', encoding='utf-8').read())
result = levene_test([[1,2,3],[2,3,4]])
print('TYPE:' + str(type(result['equalVariance']).__name__))
print('JSON:' + json.dumps(result))
`

      const { type, json } = runPythonTest(code)

      expect(type).toBe('bool')
      expect(json).toHaveProperty('equalVariance')
      expect(typeof (json as { equalVariance: boolean }).equalVariance).toBe('boolean')
    })

    it('bartlett_test should serialize without errors', () => {
      const code = `
import sys, json
sys.path.append('${workerPath}')
exec(open('${workerPath}/worker2-hypothesis.py', encoding='utf-8').read())
result = bartlett_test([[1,2,3,4,5],[2,3,4,5,6]])
print('TYPE:' + str(type(result['equalVariance']).__name__))
print('JSON:' + json.dumps(result))
`

      const { type, json } = runPythonTest(code)

      expect(type).toBe('bool')
      expect(json).toHaveProperty('equalVariance')
      expect(typeof (json as { equalVariance: boolean }).equalVariance).toBe('boolean')
    })
  })

  describe('Worker 3 - Nonparametric ANOVA', () => {
    it('mcnemar_test should return Python bool for continuityCorrection', () => {
      const code = `
import sys, json
sys.path.append('${workerPath}')
exec(open('${workerPath}/worker3-nonparametric-anova.py', encoding='utf-8').read())
result = mcnemar_test([[10, 5], [3, 12]])
print('TYPE:' + str(type(result['continuityCorrection']).__name__))
print('JSON:' + json.dumps(result))
`

      const { type, json } = runPythonTest(code)

      expect(type).toBe('bool')
      expect(json).toHaveProperty('continuityCorrection')
      expect(typeof (json as { continuityCorrection: boolean }).continuityCorrection).toBe('boolean')
    })
  })

  describe('Worker 4 - Advanced Regression', () => {
    it('discriminant_analysis should return Python bool for correct field', () => {
      const code = `
import sys, json
sys.path.append('${workerPath}')
exec(open('${workerPath}/worker4-regression-advanced.py', encoding='utf-8').read())
result = discriminant_analysis([[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]], ['A','A','A','B','B','B'])
print('TYPE:' + str(type(result['classificationResults'][0]['correct']).__name__))
print('JSON:' + json.dumps(result))
`

      const { type, json } = runPythonTest(code)

      expect(type).toBe('bool')
      expect(json).toHaveProperty('classificationResults')
      const results = (json as { classificationResults: { correct: boolean }[] }).classificationResults
      expect(results.length).toBeGreaterThan(0)
      expect(typeof results[0].correct).toBe('boolean')
    })
  })
})
