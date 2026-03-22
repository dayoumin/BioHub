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
  onMove: (sessionId: string, projectId: string | null) => void | Promise<void>
}

export const MoveSessionDialog: React.FC<MoveSessionDialogProps> = ({
  open,
  onOpenChange,
  session,
  projects,
  onMove,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && session) {
      setSelectedProjectId(session.projectId ?? null)
      setIsSubmitting(false)
      setError(null)
    }
  }, [open, session])

  const handleMove = async (): Promise<void> => {
    if (!session) return
    setIsSubmitting(true)
    setError(null)

    try {
      await onMove(session.id, selectedProjectId)
      onOpenChange(false)
    } catch {
      setError('이동에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>대화 이동</DialogTitle>
          <DialogDescription>
            &quot;{session?.title}&quot;를 다른 프로젝트로 이동합니다.
          </DialogDescription>
        </DialogHeader>

        <div>
          <Label>이동할 위치</Label>
          <Select
            value={selectedProjectId ?? 'root'}
            onValueChange={(val) =>
              setSelectedProjectId(val === 'root' ? null : val)
            }
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="root">📂 루트 (프로젝트 없음)</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.emoji || '📁'} {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            취소
          </Button>
          <Button onClick={() => void handleMove()} disabled={isSubmitting}>이동</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
