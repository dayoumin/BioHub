/**
 * Model Settings Component
 *
 * 모델 설정 UI를 관리하는 컴포넌트
 * - Vector Store 선택
 * - 임베딩 모델 선택
 * - 추론 모델 (LLM) 선택
 * - 검색 모드 선택 (FTS5, Vector, Hybrid)
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Settings, Loader2, RefreshCw } from 'lucide-react'
import { VectorStoreSelector } from '@/components/rag/vector-store-selector'
import type { VectorStore, SearchMode } from '@/lib/rag/providers/base-provider'

export interface OllamaModel {
  name: string
  size?: number
  modified_at?: string
}

export interface ModelSettingsProps {
  /** Vector Store 목록 */
  availableVectorStores: VectorStore[]
  /** 선택된 Vector Store ID */
  selectedVectorStoreId: string | null
  /** Vector Store 선택 핸들러 */
  onVectorStoreSelect: (storeId: string) => void

  /** 사용 가능한 Ollama 모델 목록 */
  availableModels: OllamaModel[]
  /** 모델 목록 로딩 중 */
  isLoadingModels: boolean
  /** 모델 목록 새로고침 */
  onRefreshModels: () => void

  /** 선택된 임베딩 모델 */
  selectedEmbeddingModel: string
  /** 임베딩 모델 변경 핸들러 */
  onEmbeddingModelChange: (model: string) => void

  /** 선택된 추론 모델 */
  selectedInferenceModel: string
  /** 추론 모델 변경 핸들러 */
  onInferenceModelChange: (model: string) => void

  /** 검색 모드 */
  searchMode: SearchMode
  /** 검색 모드 변경 핸들러 */
  onSearchModeChange: (mode: SearchMode) => void

  /** 비활성화 상태 */
  disabled?: boolean
}

export function ModelSettings({
  availableVectorStores,
  selectedVectorStoreId,
  onVectorStoreSelect,
  availableModels,
  isLoadingModels,
  onRefreshModels,
  selectedEmbeddingModel,
  onEmbeddingModelChange,
  selectedInferenceModel,
  onInferenceModelChange,
  searchMode,
  onSearchModeChange,
  disabled = false
}: ModelSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          모델 설정
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vector Store + 임베딩 + 추론 모델 (한 줄 배치) */}
        <div className="grid grid-cols-3 gap-4">
          {/* Vector Store 선택 + 임베딩 표시 */}
          <VectorStoreSelector
            vectorStores={availableVectorStores}
            selectedStoreId={selectedVectorStoreId}
            onSelectStore={onVectorStoreSelect}
            disabled={disabled}
          />

          {/* 추론 모델 선택 */}
          <div className="space-y-2">
            <Label htmlFor="inference-model">추론 모델 (LLM)</Label>
            <div className="flex gap-2">
              <Select
                value={selectedInferenceModel}
                onValueChange={onInferenceModelChange}
                disabled={isLoadingModels}
              >
                <SelectTrigger id="inference-model">
                  <SelectValue placeholder="추론 모델 선택">
                    {selectedInferenceModel || '추론 모델 선택'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {/* 현재 선택된 모델이 목록에 없을 경우 추가 */}
                  {selectedInferenceModel &&
                    !availableModels.some((m) => m.name === selectedInferenceModel) && (
                      <SelectItem value={selectedInferenceModel}>
                        {selectedInferenceModel} (현재 선택)
                      </SelectItem>
                    )}
                  {/* 필터링된 추론 모델 목록 */}
                  {availableModels
                    .filter((m) => !m.name.toLowerCase().includes('embed'))
                    .map((model) => (
                      <SelectItem key={model.name} value={model.name}>
                        {model.name}
                      </SelectItem>
                    ))}
                  {/* 모델이 하나도 없을 때 기본값 표시 */}
                  {availableModels.filter((m) => !m.name.toLowerCase().includes('embed'))
                    .length === 0 &&
                    selectedInferenceModel !== 'qwen3:4b' && (
                      <SelectItem value="qwen3:4b">qwen3:4b (기본값)</SelectItem>
                    )}
                </SelectContent>
              </Select>
              <Button
                onClick={onRefreshModels}
                disabled={isLoadingModels}
                variant="outline"
                size="icon"
                title="모델 목록 새로고침"
              >
                {isLoadingModels ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* 검색 모드 선택 */}
        <div className="mt-4 space-y-3">
          <Label className="text-base font-semibold">검색 모드</Label>
          <TooltipProvider>
            <RadioGroup
              value={searchMode}
              onValueChange={(value) => onSearchModeChange(value as SearchMode)}
              className="grid grid-cols-3 gap-3"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col space-y-1 rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fts5" id="mode-fts5" />
                      <Label htmlFor="mode-fts5" className="cursor-pointer font-medium">
                        FTS5
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      키워드 · 빠름 (~50ms)
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-xs bg-white dark:bg-gray-900 border shadow-lg"
                >
                  <p className="font-semibold text-foreground">SQLite Full-Text Search</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    키워드 기반 검색 · 빠름 (~50ms) · 현재 구현: 단순 .includes()
                  </p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col space-y-1 rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="vector" id="mode-vector" />
                      <Label htmlFor="mode-vector" className="cursor-pointer font-medium">
                        Vector DB
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      의미 · 느림 (~10-20초)
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-xs bg-white dark:bg-gray-900 border shadow-lg"
                >
                  <p className="font-semibold text-foreground">임베딩 검색</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    의미론적 검색 · 느림 (~10-20초) · 코사인 유사도 계산
                  </p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col space-y-1 rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="hybrid" id="mode-hybrid" />
                      <Label htmlFor="mode-hybrid" className="cursor-pointer font-medium">
                        Hybrid
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">결합 · 가장 정확</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-xs bg-white dark:bg-gray-900 border shadow-lg"
                >
                  <p className="font-semibold text-foreground">FTS5 + Vector 결합</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    RRF 알고리즘 결합 · 가장 느림 (~10-20초) · 가장 정확
                  </p>
                </TooltipContent>
              </Tooltip>
            </RadioGroup>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  )
}
