/**
 * MoveSessionDialog - 세션 이동 모달
 *
 * 저장소 직접 호출 없이 props로 데이터를 받고 onMove 콜백으로 위임.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { ChatProject, ChatSession } from '@/lib/types/chat'

interface MoveSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: ChatSession | null
  projects: ChatProject[]
  onMove: (sessionId: string, projectId: string | null) => void
}

export const MoveSessionDialog: React.FC<MoveSessionDialogProps> = ({
  open,
  onOpenChange,
  session,
  projects,
  onMove,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  useEffect(() => {
    if (open && session) {
      setSelectedProjectId(session.projectId ?? null)
    }
  }, [open, session])

  const handleMove = (): void => {
    if (!session) return
    onMove(session.id, selectedProjectId)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>대화 이동</DialogTitle>
          <DialogDescription>
            &quot;{session?.title}&quot;를 다른 주제로 이동합니다.
          </DialogDescription>
        </DialogHeader>

        <div>
          <Label>이동할 위치</Label>
          <Select
            value={selectedProjectId ?? 'root'}
            onValueChange={(val) =>
              setSelectedProjectId(val === 'root' ? null : val)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="root">📂 루트 (주제 없음)</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.emoji || '📁'} {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleMove}>이동</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
