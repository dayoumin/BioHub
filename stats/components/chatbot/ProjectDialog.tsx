/**
 * ProjectDialog - 프로젝트 생성/편집 모달
 *
 * 기능:
 * - 프로젝트 생성 또는 편집
 * - 필드: 이름 (필수), 설명, 이모지, 색상
 * - 생성 모드: "프로젝트 만들기" 버튼
 * - 편집 모드: "저장" 버튼 + 기존 값 채우기
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ChatStorage } from '@/lib/services/chat-storage'

interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId?: string | null // null이면 생성 모드
  onComplete: () => void
}

export const ProjectDialog: React.FC<ProjectDialogProps> = ({
  open,
  onOpenChange,
  projectId,
  onComplete,
}) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('📁')
  const [color, setColor] = useState('#3B82F6')

  useEffect(() => {
    if (projectId) {
      const project = ChatStorage.getProjects().find((p) => p.id === projectId)
      if (project) {
        setName(project.name)
        setDescription(project.description || '')
        setEmoji(project.emoji || '📁')
        setColor(project.color || '#3B82F6')
      }
    } else {
      // 생성 모드 - 초기화
      setName('')
      setDescription('')
      setEmoji('📁')
      setColor('#3B82F6')
    }
  }, [projectId, open])

  const handleSave = () => {
    if (!name.trim()) return

    if (projectId) {
      ChatStorage.updateProject(projectId, { name, description, emoji, color })
    } else {
      ChatStorage.createProject(name, { description, emoji, color })
    }

    onComplete()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {projectId ? '프로젝트 편집' : '새 프로젝트'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>이름 *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="프로젝트 이름"
            />
          </div>

          <div>
            <Label>설명</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="프로젝트 설명 (선택)"
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Label>이모지</Label>
              <Input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="📁"
                maxLength={2}
              />
            </div>

            <div className="flex-1">
              <Label>색상</Label>
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {projectId ? '저장' : '만들기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
