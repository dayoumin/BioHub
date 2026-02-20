'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Download, HardDrive, Layers, Cpu } from 'lucide-react'
import {
  RECOMMENDED_EMBEDDING_MODELS,
  RECOMMENDED_INFERENCE_MODELS,
  type RecommendedModel,
} from '@/lib/rag/constants/recommended-models'
import { ModelPullProgress } from './ModelPullProgress'
import type { PullProgress } from '@/lib/rag/services/ollama-model-service'

interface ModelPullPanelProps {
  /** 이미 설치된 모델 이름 목록 (중복 다운로드 방지) */
  installedModelNames: string[]
  /** 다운로드 시작 */
  onPullModel: (modelName: string) => Promise<void>
  /** 다운로드 취소 */
  onCancelPull: () => void
  /** 현재 다운로드 중인 모델명 */
  pullingModelName: string | null
  /** 현재 진행률 */
  pullProgress: PullProgress | null
}

/**
 * 모델 다운로드 패널
 *
 * - 추천 모델 목록 (임베딩 + 추론)
 * - 커스텀 모델명 입력
 * - 다운로드 진행률 표시
 */
export function ModelPullPanel({
  installedModelNames,
  onPullModel,
  onCancelPull,
  pullingModelName,
  pullProgress,
}: ModelPullPanelProps) {
  const [customModelName, setCustomModelName] = useState('')

  const isPulling = pullingModelName !== null

  const handleCustomPull = useCallback(async () => {
    const name = customModelName.trim()
    if (!name) return
    setCustomModelName('')
    await onPullModel(name)
  }, [customModelName, onPullModel])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isPulling) {
        handleCustomPull()
      }
    },
    [handleCustomPull, isPulling],
  )

  /** 모델이 이미 설치되었는지 확인 */
  const isInstalled = useCallback(
    (modelName: string): boolean => {
      return installedModelNames.some(
        (name) => name === modelName || name.startsWith(`${modelName}:`),
      )
    },
    [installedModelNames],
  )

  return (
    <ScrollArea className="h-[calc(100vh-280px)]">
      <div className="space-y-6 pr-4">
        {/* 다운로드 진행률 */}
        {pullingModelName && (
          <ModelPullProgress
            modelName={pullingModelName}
            progress={pullProgress}
            onCancel={onCancelPull}
          />
        )}

        {/* 커스텀 모델 입력 */}
        <section>
          <h3 className="text-sm font-medium mb-2">커스텀 모델 다운로드</h3>
          <div className="flex gap-2">
            <Input
              placeholder="모델명 입력 (예: llama3.2:1b)"
              value={customModelName}
              onChange={(e) => setCustomModelName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isPulling}
              className="flex-1"
            />
            <Button
              onClick={handleCustomPull}
              disabled={isPulling || !customModelName.trim()}
              size="sm"
            >
              <Download className="h-4 w-4 mr-1" />
              다운로드
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Ollama 모델 라이브러리의 모델명을 입력하세요
          </p>
        </section>

        {/* 추천 임베딩 모델 */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-medium">추천 임베딩 모델</h3>
          </div>
          <div className="space-y-2">
            {RECOMMENDED_EMBEDDING_MODELS.map((model) => (
              <RecommendedModelCard
                key={model.name}
                model={model}
                isInstalled={isInstalled(model.name)}
                isPulling={isPulling}
                onPull={onPullModel}
              />
            ))}
          </div>
        </section>

        {/* 추천 추론 모델 */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="h-4 w-4 text-green-500" />
            <h3 className="text-sm font-medium">추천 추론 모델</h3>
          </div>
          <div className="space-y-2">
            {RECOMMENDED_INFERENCE_MODELS.map((model) => (
              <RecommendedModelCard
                key={model.name}
                model={model}
                isInstalled={isInstalled(model.name)}
                isPulling={isPulling}
                onPull={onPullModel}
              />
            ))}
          </div>
        </section>
      </div>
    </ScrollArea>
  )
}

// ── 추천 모델 카드 (내부 컴포넌트) ──────────────────────

interface RecommendedModelCardProps {
  model: RecommendedModel
  isInstalled: boolean
  isPulling: boolean
  onPull: (modelName: string) => Promise<void>
}

function RecommendedModelCard({
  model,
  isInstalled,
  isPulling,
  onPull,
}: RecommendedModelCardProps) {
  const handlePull = useCallback(async () => {
    await onPull(model.name)
  }, [model.name, onPull])

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        {/* 모델 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{model.name}</span>
            <Badge variant="outline" className="text-xs">
              {model.parameterSize}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {model.description}
          </p>
        </div>

        {/* VRAM 정보 */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <HardDrive className="h-3 w-3" />
          <span>{model.minVram} GB+</span>
        </div>

        {/* 다운로드 / 설치됨 */}
        {isInstalled ? (
          <Badge variant="secondary" className="shrink-0">설치됨</Badge>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={isPulling}
            onClick={handlePull}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            다운로드
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
