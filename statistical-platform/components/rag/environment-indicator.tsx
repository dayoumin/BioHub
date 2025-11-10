/**
 * Environment Indicator Component
 *
 * 현재 환경 상태를 시각적으로 표시
 * - 웹/로컬 환경
 * - Docling 사용 가능 여부
 * - Ollama 사용 가능 여부
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Loader2, Globe, Monitor, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getCachedEnvironmentInfo,
  invalidateEnvironmentCache,
  type EnvironmentInfo,
} from '@/lib/utils/environment-detector'

export function EnvironmentIndicator() {
  const [envInfo, setEnvInfo] = useState<EnvironmentInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadEnvInfo = useCallback(async () => {
    setIsLoading(true)
    try {
      const info = await getCachedEnvironmentInfo()
      setEnvInfo(info)
    } catch (error) {
      console.error('Failed to load environment info:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEnvInfo()
  }, [loadEnvInfo])

  const handleRefresh = useCallback(async () => {
    invalidateEnvironmentCache()
    await loadEnvInfo()
  }, [loadEnvInfo])

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">환경 확인 중...</span>
        </div>
      </Card>
    )
  }

  if (!envInfo) {
    return null
  }

  const isLocal = envInfo.type === 'local'

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {/* 환경 타입 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLocal ? (
              <>
                <Monitor className="h-4 w-4 text-green-600" />
                <span className="font-medium">로컬 환경</span>
              </>
            ) : (
              <>
                <Globe className="h-4 w-4 text-blue-600" />
                <span className="font-medium">웹 환경</span>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-7 w-7 p-0"
            title="새로고침"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>

        {/* 상태 정보 */}
        <div className="space-y-2 text-sm">
          {/* Docling */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">PDF 파싱 (Docling)</span>
            {envInfo.doclingAvailable ? (
              <Badge variant="default" className="gap-1 bg-green-600">
                <CheckCircle className="h-3 w-3" />
                사용 가능
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" />
                {isLocal ? '서버 꺼짐' : '웹에서 불가'}
              </Badge>
            )}
          </div>

          {/* Ollama */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">AI 모델 (Ollama)</span>
            {envInfo.ollamaAvailable ? (
              <Badge variant="default" className="gap-1 bg-green-600">
                <CheckCircle className="h-3 w-3" />
                연결됨
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" />
                연결 안 됨
              </Badge>
            )}
          </div>
        </div>

        {/* 안내 메시지 */}
        {isLocal && !envInfo.doclingAvailable && (
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950 rounded-md border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-900 dark:text-amber-100">
              💡 <strong>고품질 PDF 파싱을 원하시면:</strong>
            </p>
            <code className="block mt-1 text-xs text-amber-800 dark:text-amber-200">
              uvicorn scripts.docling-server:app --port 8000
            </code>
          </div>
        )}

        {!isLocal && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-900 dark:text-blue-100">
              💡 <strong>웹 환경:</strong> PDF.js로 파싱됩니다. 고품질 파싱은 로컬에서 Docling을
              사용하세요.
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}