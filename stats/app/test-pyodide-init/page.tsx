'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { pyodideStats } from '@/lib/services/pyodide-statistics'

export default function TestPyodideInitPage() {
  const [status, setStatus] = useState<'loading' | 'initialized' | 'error'>('loading')
  const [numpyLoaded, setNumpyLoaded] = useState(false)
  const [scipyLoaded, setScipyLoaded] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loadingTime, setLoadingTime] = useState(0)
  const [workerTests, setWorkerTests] = useState<Array<{name: string, status: string, result?: string}>>([])
  const [testingWorkers, setTestingWorkers] = useState(false)

  useEffect(() => {
    const initPyodide = async () => {
      const startTime = Date.now()

      try {
        console.log('[Test] Pyodide 초기화 시작...')

        // Pyodide 초기화
        await pyodideStats.initialize()

        // NumPy 테스트
        const numpyTest = await pyodideStats.pyodide?.runPythonAsync(`
          import numpy as np
          np.array([1, 2, 3]).mean()
        `)
        setNumpyLoaded(numpyTest !== undefined)
        console.log('[Test] NumPy 로딩 성공:', numpyTest)

        // SciPy 테스트
        const scipyTest = await pyodideStats.pyodide?.runPythonAsync(`
          from scipy import stats
          stats.norm.cdf(0)
        `)
        setScipyLoaded(scipyTest !== undefined)
        console.log('[Test] SciPy 로딩 성공:', scipyTest)

        const endTime = Date.now()
        setLoadingTime(endTime - startTime)

        setStatus('initialized')
        console.log('[Test] Pyodide 초기화 완료')
      } catch (error) {
        console.error('[Test] Pyodide 초기화 실패:', error)
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : String(error))
      }
    }

    initPyodide()
  }, [])

  const runWorkerTests = async () => {
    setTestingWorkers(true)
    setWorkerTests([])

    try {
      // Test 1: Worker 1 binomtest
      setWorkerTests(prev => [...prev, {name: 'Worker 1: binomtest', status: 'running'}])

      const worker1Code = await fetch('/workers/python/worker1-descriptive.py').then(r => r.text())
      await pyodideStats.pyodide?.runPythonAsync(worker1Code)

      const test1Result = await pyodideStats.pyodide?.runPythonAsync(`
import json
result = one_sample_proportion_test(60, 100, 0.5)
json.dumps(result)
      `)

      const result1 = JSON.parse(test1Result)
      setWorkerTests(prev => prev.map(t =>
        t.name === 'Worker 1: binomtest'
          ? {...t, status: 'success', result: `proportion=${result1.sampleProportion}, p=${result1.pValueExact.toFixed(6)}`}
          : t
      ))

      // Test 2: Worker 2 paired t-test
      setWorkerTests(prev => [...prev, {name: 'Worker 2: paired t-test', status: 'running'}])

      const worker2Code = await fetch('/workers/python/worker2-hypothesis.py').then(r => r.text())
      await pyodideStats.pyodide?.runPythonAsync(worker2Code)

      const test2Result = await pyodideStats.pyodide?.runPythonAsync(`
import json
values1 = [10, None, 30, 40]
values2 = [12, 15, None, 42]
result = t_test_paired(values1, values2)
json.dumps(result)
      `)

      const result2 = JSON.parse(test2Result)
      const test2Status = result2.nPairs === 2 ? 'success' : 'failed'
      setWorkerTests(prev => prev.map(t =>
        t.name === 'Worker 2: paired t-test'
          ? {...t, status: test2Status, result: `nPairs=${result2.nPairs} (expected:2), t=${result2.statistic.toFixed(4)}`}
          : t
      ))

      // Test 3: Worker 4 linear regression
      setWorkerTests(prev => [...prev, {name: 'Worker 4: linear regression', status: 'running'}])

      const worker4Code = await fetch('/workers/python/worker4-regression-advanced.py').then(r => r.text())
      await pyodideStats.pyodide?.runPythonAsync(worker4Code)

      const test4Result = await pyodideStats.pyodide?.runPythonAsync(`
import json
x = [1, None, 3, 4, 5]
y = [2, 4, None, 8, 10]
result = linear_regression(x, y)
json.dumps(result)
      `)

      const result4 = JSON.parse(test4Result)
      const test4Status = result4.nPairs === 3 ? 'success' : 'failed'
      setWorkerTests(prev => prev.map(t =>
        t.name === 'Worker 4: linear regression'
          ? {...t, status: test4Status, result: `nPairs=${result4.nPairs} (expected:3), slope=${result4.slope.toFixed(4)}, R²=${result4.rSquared.toFixed(4)}`}
          : t
      ))

    } catch (error) {
      setWorkerTests(prev => [...prev, {name: 'Error', status: 'failed', result: String(error)}])
    } finally {
      setTestingWorkers(false)
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pyodide 초기화 테스트</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div
              data-pyodide-status={status}
              className="text-lg font-semibold"
            >
              상태: {status === 'loading' ? '로딩 중...' : status === 'initialized' ? '초기화 완료' : '오류 발생'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded">
              <div className="font-medium">NumPy</div>
              <div
                data-numpy-loaded={numpyLoaded.toString()}
                className={numpyLoaded ? 'text-green-600' : 'text-gray-400'}
              >
                {numpyLoaded ? '✓ 로딩 완료' : '⏳ 대기 중'}
              </div>
            </div>

            <div className="p-4 border rounded">
              <div className="font-medium">SciPy</div>
              <div
                data-scipy-loaded={scipyLoaded.toString()}
                className={scipyLoaded ? 'text-green-600' : 'text-gray-400'}
              >
                {scipyLoaded ? '✓ 로딩 완료' : '⏳ 대기 중'}
              </div>
            </div>
          </div>

          {loadingTime > 0 && (
            <div className="p-4 bg-blue-50 rounded">
              <div className="font-medium">로딩 시간</div>
              <div className="text-2xl font-bold">{(loadingTime / 1000).toFixed(2)}초</div>
            </div>
          )}

          {status === 'error' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <div className="font-medium text-red-800">에러 메시지</div>
              <div className="text-sm text-red-600 mt-2">{errorMessage}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Worker 1-4 Critical Bug Fix 검증</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={runWorkerTests}
            disabled={status !== 'initialized' || testingWorkers}
          >
            {testingWorkers ? 'Testing...' : 'Run Worker Tests'}
          </Button>

          {workerTests.length > 0 && (
            <div className="space-y-2">
              {workerTests.map((test, idx) => (
                <div key={idx} className="p-4 border rounded">
                  <div className="flex items-center gap-2">
                    <div className={`font-medium ${test.status === 'success' ? 'text-green-600' : test.status === 'failed' ? 'text-red-600' : 'text-gray-600'}`}>
                      {test.status === 'success' ? '✓' : test.status === 'failed' ? '✗' : '⏳'} {test.name}
                    </div>
                  </div>
                  {test.result && (
                    <div className="text-sm text-gray-600 mt-1 font-mono">
                      {test.result}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
