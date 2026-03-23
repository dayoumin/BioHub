/**
 * ProjectDialog - 채팅 프로젝트 생성 모달
 *
 * 생성 전용 (편집 모드 제거됨).
 * 저장소 직접 호출 없이 onCreate 콜백으로 위임.
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string) => void | Promise<void>
}

export const ProjectDialog: React.FC<ProjectDialogProps> = ({
  open,
  onOpenChange,
  onCreate,
}) => {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setIsSubmitting(false)
      setError(null)
    }
  }, [open])

  const handleCreate = async (): Promise<void> => {
    if (!name.trim()) return
    setIsSubmitting(true)
    setError(null)

    try {
      await onCreate(name.trim())
      onOpenChange(false)
    } catch {
      setError('저장에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 프로젝트 만들기</DialogTitle>
          <DialogDescription>
            채팅 세션을 묶어둘 새 프로젝트 이름을 입력하세요.
          </DialogDescription>
        </DialogHeader>

        <div>
          <Label htmlFor="project-name">이름</Label>
          <Input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 논문 리뷰, 실험 계획"
            autoFocus
            disabled={isSubmitting}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim() && !isSubmitting) void handleCreate()
            }}
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            취소
          </Button>
          <Button onClick={() => void handleCreate()} disabled={!name.trim() || isSubmitting}>
            만들기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
