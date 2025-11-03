'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { pyodideStats } from '@/lib/services/pyodide-statistics'

export default function TestPyodideDescriptivePage() {
  const [input, setInput] = useState('1,2,3,4,5')
  const [result, setResult] = useState<{
    mean: number
    std: number
    min: number
    max: number
    median: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const runTest = async () => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      // 입력 파싱
      const data = input.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n))

      if (data.length === 0) {
        throw new Error('유효한 숫자 데이터가 없습니다')
      }

      console.log('[Test] 기술통계 실행 시작:', data)

      // Pyodide 초기화
      await pyodideStats.initialize()

      // 기술통계 계산
      const stats = await pyodideStats.descriptiveStats(data)

      console.log('[Test] 기술통계 결과:', stats)

      setResult({
        mean: stats.mean,
        std: stats.std,
        min: stats.min,
        max: stats.max,
        median: stats.median
      })
    } catch (err) {
      console.error('[Test] 기술통계 오류:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>기술통계 (Descriptive Statistics) 실제 실행 테스트</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              테스트 데이터 (쉼표로 구분)
            </label>
            <Input
              data-test-input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="1,2,3,4,5"
            />
          </div>

          <Button
            data-run-test
            onClick={runTest}
            disabled={loading}
            className="w-full"
          >
            {loading ? '계산 중...' : '기술통계 실행'}
          </Button>

          {result && (
            <div data-result-ready className="space-y-3 mt-6">
              <div className="text-lg font-semibold">결과</div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded">
                  <div className="text-sm text-muted-foreground">평균 (Mean)</div>
                  <div data-result-mean className="text-2xl font-bold">
                    {result.mean.toFixed(4)}
                  </div>
                </div>

                <div className="p-4 border rounded">
                  <div className="text-sm text-muted-foreground">표준편차 (Std)</div>
                  <div data-result-std className="text-2xl font-bold">
                    {result.std.toFixed(4)}
                  </div>
                </div>

                <div className="p-4 border rounded">
                  <div className="text-sm text-muted-foreground">중앙값 (Median)</div>
                  <div data-result-median className="text-2xl font-bold">
                    {result.median.toFixed(4)}
                  </div>
                </div>

                <div className="p-4 border rounded">
                  <div className="text-sm text-muted-foreground">최소값 (Min)</div>
                  <div data-result-min className="text-2xl font-bold">
                    {result.min.toFixed(4)}
                  </div>
                </div>

                <div className="p-4 border rounded">
                  <div className="text-sm text-muted-foreground">최대값 (Max)</div>
                  <div data-result-max className="text-2xl font-bold">
                    {result.max.toFixed(4)}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <div className="font-medium text-green-800">검증 정보</div>
                <div className="text-sm text-green-600 mt-2">
                  <div>데이터: [{input}]</div>
                  <div>예상 평균: {(input.split(',').map(Number).reduce((a, b) => a + b, 0) / input.split(',').length).toFixed(4)}</div>
                  <div>실제 평균: {result.mean.toFixed(4)}</div>
                  <div className={Math.abs(result.mean - (input.split(',').map(Number).reduce((a, b) => a + b, 0) / input.split(',').length)) < 0.0001 ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                    {Math.abs(result.mean - (input.split(',').map(Number).reduce((a, b) => a + b, 0) / input.split(',').length)) < 0.0001 ? '✓ 검증 통과' : '✗ 검증 실패'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <div className="font-medium text-red-800">에러 발생</div>
              <div className="text-sm text-red-600 mt-2">{error}</div>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            <div className="font-medium">테스트 설명</div>
            <div className="mt-2">
              이 페이지는 Pyodide를 사용한 실제 기술통계 계산을 테스트합니다.
              NumPy와 SciPy를 사용하여 평균, 표준편차, 최소값, 최대값, 중앙값을 계산합니다.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
