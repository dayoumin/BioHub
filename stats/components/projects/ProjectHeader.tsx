'use client'

import { useState, useCallback } from 'react'
import { ArrowLeft, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { ResearchProject } from '@/lib/types/research'
import { useResearchProjectStore } from '@/lib/stores/research-project-store'
import { toast } from 'sonner'
import { TabSettingsDialog } from './TabSettingsDialog'

interface ProjectHeaderProps {
  project: ResearchProject
  totalCount: number
  onBack: () => void
}

export function ProjectHeader({ project, totalCount, onBack }: ProjectHeaderProps): React.ReactElement {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(project.name)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const updateProject = useResearchProjectStore(s => s.updateProject)

  const handleSave = useCallback(() => {
    const trimmed = editName.trim()
    if (!trimmed) return
    updateProject(project.id, { name: trimmed })
    setIsEditing(false)
    toast.success('프로젝트 이름이 변경되었습니다')
  }, [editName, project.id, updateProject])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      setEditName(project.name)
      setIsEditing(false)
    }
  }, [project.name])

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>

            {isEditing ? (
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="h-8 w-64 text-lg font-semibold"
                autoFocus
              />
            ) : (
              <button
                onClick={() => {
                  setEditName(project.name)
                  setIsEditing(true)
                }}
                className="text-lg font-semibold hover:underline decoration-dashed underline-offset-4"
              >
                {project.presentation?.emoji && (
                  <span className="mr-1.5">{project.presentation.emoji}</span>
                )}
                {project.name}
              </button>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="탭 설정"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <div className="ml-[2.75rem] mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {project.primaryDomain && (
            <Badge variant="outline" className="text-[10px]">
              {project.primaryDomain}
            </Badge>
          )}
          <span className="font-medium text-foreground">{totalCount}개 항목</span>
        </div>

        {project.description && (
          <p className="ml-[2.75rem] mt-1 text-xs text-muted-foreground">
            {project.description}
          </p>
        )}
      </div>

      <TabSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}
