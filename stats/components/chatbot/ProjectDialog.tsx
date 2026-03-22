/**
 * ProjectDialog - 채팅 주제 폴더 생성 모달
 *
 * 생성 전용 (편집 모드 제거됨).
 * 저장소 직접 호출 없이 onCreate 콜백으로 위임.
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
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
  onCreate: (name: string) => void
}

export const ProjectDialog: React.FC<ProjectDialogProps> = ({
  open,
  onOpenChange,
  onCreate,
}) => {
  const [name, setName] = useState('')

  useEffect(() => {
    if (open) setName('')
  }, [open])

  const handleCreate = (): void => {
    if (!name.trim()) return
    onCreate(name.trim())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 주제 만들기</DialogTitle>
        </DialogHeader>

        <div>
          <Label>이름</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 논문 리뷰, 실험 계획"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) handleCreate()
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            만들기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
