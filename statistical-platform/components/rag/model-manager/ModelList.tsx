'use client'

import { useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Layers, Cpu } from 'lucide-react'
import { ModelCard } from './ModelCard'
import type { CategorizedModel } from '@/lib/rag/services/ollama-model-service'

interface ModelListProps {
  models: CategorizedModel[]
  onDeleteModel: (modelName: string) => Promise<void>
}

/**
 * 설치된 모델 목록
 *
 * 임베딩 모델과 추론 모델을 섹션으로 분리하여 표시.
 */
export function ModelList({ models, onDeleteModel }: ModelListProps) {
  const embeddingModels = useMemo(
    () => models.filter((m) => m.category === 'embedding'),
    [models],
  )

  const inferenceModels = useMemo(
    () => models.filter((m) => m.category === 'inference'),
    [models],
  )

  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">설치된 모델이 없습니다</p>
        <p className="text-xs mt-1">&quot;모델 다운로드&quot; 탭에서 모델을 다운로드하세요</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[calc(100vh-280px)]">
      <div className="space-y-6 pr-4">
        {/* 임베딩 모델 섹션 */}
        {embeddingModels.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-medium">
                임베딩 모델 ({embeddingModels.length})
              </h3>
            </div>
            <div className="space-y-2">
              {embeddingModels.map((model) => (
                <ModelCard
                  key={model.name}
                  model={model}
                  onDelete={onDeleteModel}
                />
              ))}
            </div>
          </section>
        )}

        {/* 추론 모델 섹션 */}
        {inferenceModels.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="h-4 w-4 text-green-500" />
              <h3 className="text-sm font-medium">
                추론 모델 ({inferenceModels.length})
              </h3>
            </div>
            <div className="space-y-2">
              {inferenceModels.map((model) => (
                <ModelCard
                  key={model.name}
                  model={model}
                  onDelete={onDeleteModel}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </ScrollArea>
  )
}
