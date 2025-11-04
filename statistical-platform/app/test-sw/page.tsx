'use client'

/**
 * Service Worker 테스트 페이지
 *
 * 브라우저에서 직접 SW 동작 확인
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  registerServiceWorker,
  unregisterServiceWorker,
  getCacheStats,
  clearCache,
  getServiceWorkerStatus,
  type CacheStats
} from '@/lib/utils/register-sw'

export default function TestServiceWorkerPage() {
  const [status, setStatus] = useState<{
    registered: boolean
    state?: string
    scope?: string
  }>({ registered: false })

  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string>('')

  // 초기 상태 로드
  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    const currentStatus = await getServiceWorkerStatus()
    setStatus(currentStatus)

    if (currentStatus.registered) {
      const stats = await getCacheStats()
      setCacheStats(stats)
    }
  }

  const handleRegister = async () => {
    setLoading(true)
    setMessage('')

    try {
      const result = await registerServiceWorker()
      if (result.success) {
        setMessage('✅ Service Worker 등록 성공!')
        await loadStatus()
      } else {
        setMessage(`❌ 등록 실패: ${result.error}`)
      }
    } catch (error) {
      setMessage(`❌ 에러: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUnregister = async () => {
    setLoading(true)
    setMessage('')

    try {
      const success = await unregisterServiceWorker()
      if (success) {
        setMessage('✅ Service Worker 등록 해제 성공!')
        await loadStatus()
      } else {
        setMessage('❌ 등록 해제 실패')
      }
    } catch (error) {
      setMessage(`❌ 에러: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshStats = async () => {
    setLoading(true)
    const stats = await getCacheStats()
    setCacheStats(stats)
    setLoading(false)
    setMessage('✅ 캐시 통계 새로고침 완료')
  }

  const handleClearCache = async (type: 'all' | 'pyodide' | 'app') => {
    setLoading(true)
    setMessage('')

    try {
      const success = await clearCache(type)
      if (success) {
        setMessage(`✅ ${type} 캐시 삭제 완료!`)
        await handleRefreshStats()
      } else {
        setMessage('❌ 캐시 삭제 실패')
      }
    } catch (error) {
      setMessage(`❌ 에러: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleTestPyodideLoad = async () => {
    setMessage('📦 Pyodide CDN 로딩 테스트 중...')
    setLoading(true)

    try {
      const start = performance.now()

      // Pyodide CDN에서 작은 파일 테스트 로드
      const response = await fetch('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js', {
        method: 'HEAD' // HEAD 요청으로 캐싱만 테스트
      })

      const end = performance.now()
      const time = (end - start).toFixed(0)

      if (response.ok) {
        setMessage(`✅ Pyodide CDN 응답 성공! (${time}ms)`)
      } else {
        setMessage(`⚠️ 응답 실패: ${response.status}`)
      }
    } catch (error) {
      setMessage(`❌ 네트워크 에러: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Service Worker 테스트</h1>
        <p className="text-muted-foreground">
          PWA 및 Pyodide CDN 캐싱 동작 확인
        </p>
      </div>

      {message && (
        <Card>
          <CardContent className="pt-6">
            <p className="font-mono text-sm">{message}</p>
          </CardContent>
        </Card>
      )}

      {/* 상태 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>Service Worker 상태</CardTitle>
          <CardDescription>현재 등록 상태 및 정보</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-medium">등록 여부:</span>
            <Badge variant={status.registered ? 'default' : 'secondary'}>
              {status.registered ? '등록됨' : '미등록'}
            </Badge>
          </div>

          {status.registered && (
            <>
              <div className="flex items-center gap-2">
                <span className="font-medium">상태:</span>
                <Badge variant="outline">{status.state || 'unknown'}</Badge>
              </div>

              <div className="space-y-1">
                <span className="font-medium">Scope:</span>
                <p className="text-sm text-muted-foreground font-mono">
                  {status.scope || 'N/A'}
                </p>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleRegister}
              disabled={loading || status.registered}
            >
              등록
            </Button>
            <Button
              onClick={handleUnregister}
              variant="destructive"
              disabled={loading || !status.registered}
            >
              등록 해제
            </Button>
            <Button
              onClick={loadStatus}
              variant="outline"
              disabled={loading}
            >
              새로고침
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 캐시 통계 카드 */}
      {status.registered && (
        <Card>
          <CardHeader>
            <CardTitle>캐시 통계</CardTitle>
            <CardDescription>Pyodide CDN 캐싱 현황</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {cacheStats ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-medium">캐시 버전:</span>
                  <Badge variant="outline">{cacheStats.version}</Badge>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-medium">캐시된 파일 수:</span>
                  <Badge>{cacheStats.pyodideCacheSize}</Badge>
                </div>

                {cacheStats.items.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-medium">캐시된 파일:</span>
                    <div className="max-h-48 overflow-y-auto space-y-1 text-sm">
                      {cacheStats.items.map((item, index) => (
                        <div key={index} className="font-mono text-xs text-muted-foreground">
                          {item.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">캐시 통계를 불러올 수 없습니다</p>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleRefreshStats}
                variant="outline"
                disabled={loading}
              >
                통계 새로고침
              </Button>
              <Button
                onClick={() => handleClearCache('pyodide')}
                variant="destructive"
                disabled={loading}
              >
                Pyodide 캐시 삭제
              </Button>
              <Button
                onClick={() => handleClearCache('all')}
                variant="destructive"
                disabled={loading}
              >
                전체 캐시 삭제
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 테스트 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>CDN 로딩 테스트</CardTitle>
          <CardDescription>Pyodide CDN 캐싱 효과 확인</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleTestPyodideLoad}
            disabled={loading}
            className="w-full"
          >
            Pyodide CDN 로드 테스트
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            * 첫 번째 실행: 네트워크에서 다운로드 (느림)
            <br />* 두 번째 실행: 캐시에서 로드 (빠름)
          </p>
        </CardContent>
      </Card>

      {/* 사용 방법 */}
      <Card>
        <CardHeader>
          <CardTitle>테스트 방법</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ol className="list-decimal list-inside space-y-2">
            <li>Service Worker 등록 버튼 클릭</li>
            <li>&quot;Pyodide CDN 로드 테스트&quot; 버튼 클릭 (첫 실행 - 느림)</li>
            <li>다시 &quot;Pyodide CDN 로드 테스트&quot; 버튼 클릭 (두 번째 - 빠름)</li>
            <li>캐시 통계에서 캐시된 파일 확인</li>
            <li>Chrome DevTools &gt; Application &gt; Cache Storage 확인</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
