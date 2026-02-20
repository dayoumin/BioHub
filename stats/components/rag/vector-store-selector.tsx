/**
 * Vector Store Selector Component
 *
 * Displays available vector stores and allows the user to select one.
 * The embedding model is automatically configured based on the selected store.
 */

import { useMemo } from 'react'
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
import { Info, Database } from 'lucide-react'
import type { VectorStore } from '@/lib/rag/providers/base-provider'

export interface VectorStoreSelectorProps {
  /** Available vector stores */
  vectorStores: VectorStore[]
  /** Currently selected vector store ID */
  selectedStoreId: string | null
  /** Callback when selection changes */
  onSelectStore: (storeId: string) => void
  /** Disabled state */
  disabled?: boolean
}

export function VectorStoreSelector({
  vectorStores,
  selectedStoreId,
  onSelectStore,
  disabled = false
}: VectorStoreSelectorProps) {
  // Find the currently selected store
  const selectedStore = useMemo(
    () => vectorStores.find((store) => store.id === selectedStoreId),
    [vectorStores, selectedStoreId]
  )

  return (
    <>
      {/* Vector Store Selection */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="vector-store">Vector Store</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="font-semibold">Vector Store란?</p>
                <p className="text-xs mt-1">
                  특정 임베딩 모델로 사전 생성된 벡터 DB입니다.
                  선택 시 해당 모델로 자동 설정되며, 임베딩을 재생성하지 않아 22배 빠릅니다.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Select
          value={selectedStoreId || ''}
          onValueChange={onSelectStore}
          disabled={disabled}
        >
          <SelectTrigger id="vector-store">
            <SelectValue placeholder="Vector Store 선택">
              {selectedStore ? (
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span>{selectedStore.name}</span>
                </div>
              ) : (
                'Vector Store 선택'
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {vectorStores.map((store) => (
              <SelectItem key={store.id} value={store.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{store.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {store.docCount}개 문서 · {store.fileSize} · {store.dimensions}차원
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Embedding Model Display (Read-only) - 컴팩트 버전 */}
      {selectedStore && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>임베딩</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-xs">
                    Vector Store 선택 시 자동으로 설정됩니다.
                    다른 모델을 사용하려면 다른 Vector Store를 선택하세요.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center rounded-md border bg-muted/30 px-3 py-2.5">
            <code className="text-sm font-mono text-foreground font-medium">
              {selectedStore.embeddingModel}
            </code>
          </div>
        </div>
      )}
    </>
  )
}