'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2, HardDrive, Cpu, Layers } from 'lucide-react'
import type { CategorizedModel } from '@/lib/rag/services/ollama-model-service'

interface ModelCardProps {
  model: CategorizedModel
  onDelete: (modelName: string) => Promise<void>
}

/**
 * 개별 모델 카드
 *
 * 표시 정보: 이름, 카테고리 뱃지, 파라미터 크기, 양자화, VRAM, 삭제 버튼
 */
/** 파일 크기를 사람이 읽기 쉬운 형태로 변환 */
function formatSize(bytes?: number): string {
  if (!bytes) return '-'
  const gb = bytes / (1024 ** 3)
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  const mb = bytes / (1024 ** 2)
  return `${mb.toFixed(0)} MB`
}

export function ModelCard({ model, onDelete }: ModelCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = useCallback(async () => {
    setIsDeleting(true)
    try {
      await onDelete(model.name)
    } finally {
      setIsDeleting(false)
    }
  }, [model.name, onDelete])

  return (
    <Card className="group relative">
      <CardContent className="flex items-center gap-4 p-4">
        {/* 카테고리 아이콘 */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          {model.category === 'embedding' ? (
            <Layers className="h-5 w-5 text-blue-500" />
          ) : (
            <Cpu className="h-5 w-5 text-green-500" />
          )}
        </div>

        {/* 모델 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{model.name}</span>
            <Badge variant={model.category === 'embedding' ? 'secondary' : 'default'}>
              {model.category === 'embedding' ? '임베딩' : '추론'}
            </Badge>
          </div>

          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {model.details?.family && (
              <span>{model.details.family}</span>
            )}
            {model.details?.parameter_size && (
              <span>{model.details.parameter_size}</span>
            )}
            {model.details?.quantization_level && (
              <span>{model.details.quantization_level}</span>
            )}
          </div>
        </div>

        {/* VRAM + 크기 */}
        <div className="flex items-center gap-4 shrink-0 text-sm text-muted-foreground">
          <div className="flex items-center gap-1" title="예상 VRAM">
            <HardDrive className="h-3.5 w-3.5" />
            <span>{model.vramGB} GB</span>
          </div>
          <div className="text-xs">
            {formatSize(model.size)}
          </div>
        </div>

        {/* 삭제 버튼 */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>모델 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>{model.name}</strong> 모델을 삭제하시겠습니까?
                삭제 후 다시 다운로드해야 합니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
