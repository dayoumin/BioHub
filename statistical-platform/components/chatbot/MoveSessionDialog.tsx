/**
 * MoveSessionDialog - 세션 이동 모달
 *
 * 기능:
 * - 세션을 다른 프로젝트로 이동
 * - 프로젝트 목록 드롭다운
 * - "루트로 이동" 옵션 (projectId = null)
 * - 현재 속한 프로젝트 표시
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
import { ChatStorage } from '@/lib/services/chat-storage'

interface MoveSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string | null
  onComplete: () => void
}

export const MoveSessionDialog: React.FC<MoveSessionDialogProps> = ({
  open,
  onOpenChange,
  sessionId,
  onComplete,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  const projects = ChatStorage.getProjects()
  const session = sessionId ? ChatStorage.loadSession(sessionId) : null

  useEffect(() => {
    if (session) {
      setSelectedProjectId(session.projectId || null)
    }
  }, [session, open])

  const handleMove = () => {
    if (!sessionId) return

    ChatStorage.moveSessionToProject(sessionId, selectedProjectId)
    onComplete()
    onOpenChange(false)
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

        <div className="space-y-4">
          <div>
            <Label>이동할 위치</Label>
            <Select
              value={selectedProjectId || 'root'}
              onValueChange={(val) =>
                setSelectedProjectId(val === 'root' ? null : val)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">📂 루트 (프로젝트 없음)</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.emoji} {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
