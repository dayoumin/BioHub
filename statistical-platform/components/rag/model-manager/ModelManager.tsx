'use client'

import { useState, useCallback, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw, Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import {
  OllamaModelService,
  type CategorizedModel,
  type PullProgress,
} from '@/lib/rag/services/ollama-model-service'
import { ModelList } from './ModelList'
import { ModelPullPanel } from './ModelPullPanel'

interface ModelManagerProps {
  /** Ollama 서버 엔드포인트 */
  endpoint?: string
}

/**
 * 모델 관리 메인 컨테이너
 *
 * Tabs: "설치된 모델" / "모델 다운로드"
 * DocumentManager 패턴: useState + useCallback + Service
 */
export function ModelManager({ endpoint = 'http://localhost:11434' }: ModelManagerProps) {
  // ── 상태 ─────────────────────────────────────────────
  const [models, setModels] = useState<CategorizedModel[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serverOnline, setServerOnline] = useState<boolean | null>(null)

  // 다운로드 상태
  const [pullingModelName, setPullingModelName] = useState<string | null>(null)
  const [pullProgress, setPullProgress] = useState<PullProgress | null>(null)

  // ── 서버 상태 확인 + 모델 목록 로드 ─────────────────

  const loadModels = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const isOnline = await OllamaModelService.isServerRunning(endpoint)
      setServerOnline(isOnline)

      if (!isOnline) {
        setModels([])
        setError('Ollama 서버에 연결할 수 없습니다. Ollama가 실행 중인지 확인하세요.')
        return
      }

      const result = await OllamaModelService.listModels(endpoint)
      setModels(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : '모델 목록을 불러올 수 없습니다'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [endpoint])

  // 최초 로드
  useEffect(() => {
    loadModels()
  }, [loadModels])

  // ── 모델 삭제 ────────────────────────────────────────

  const handleDeleteModel = useCallback(
    async (modelName: string) => {
      try {
        await OllamaModelService.deleteModel(endpoint, modelName)
        // 목록 갱신
        setModels((prev) => prev.filter((m) => m.name !== modelName))
      } catch (err) {
        const message = err instanceof Error ? err.message : '모델 삭제에 실패했습니다'
        setError(message)
      }
    },
    [endpoint],
  )

  // ── 모델 다운로드 ────────────────────────────────────

  const handlePullModel = useCallback(
    async (modelName: string) => {
      setPullingModelName(modelName)
      setPullProgress(null)
      setError(null)

      try {
        await OllamaModelService.pullModel(endpoint, modelName, (progress) => {
          setPullProgress(progress)
        })

        // 다운로드 완료 → 목록 갱신
        setPullingModelName(null)
        setPullProgress(null)
        await loadModels()
      } catch (err) {
        const message = err instanceof Error ? err.message : '모델 다운로드에 실패했습니다'
        setError(message)
        setPullingModelName(null)
        setPullProgress(null)
      }
    },
    [endpoint, loadModels],
  )

  const handleCancelPull = useCallback(() => {
    OllamaModelService.cancelPull()
    setPullingModelName(null)
    setPullProgress(null)
  }, [])

  // ── 렌더링 ───────────────────────────────────────────

  const installedModelNames = models.map((m) => m.name)

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">모델 관리</h2>
          {serverOnline !== null && (
            serverOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-destructive" />
            )
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadModels}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          새로고침
        </Button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 탭 콘텐츠 */}
      <Tabs defaultValue="installed">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="installed">
            설치된 모델 ({models.length})
          </TabsTrigger>
          <TabsTrigger value="download">
            모델 다운로드
          </TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ModelList models={models} onDeleteModel={handleDeleteModel} />
          )}
        </TabsContent>

        <TabsContent value="download" className="mt-4">
          <ModelPullPanel
            installedModelNames={installedModelNames}
            onPullModel={handlePullModel}
            onCancelPull={handleCancelPull}
            pullingModelName={pullingModelName}
            pullProgress={pullProgress}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
