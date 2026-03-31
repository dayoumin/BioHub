'use client'

import { useState, useCallback } from 'react'
import { BookOpen, FileText, Layers } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { PRESET_REGISTRY } from '@/lib/research/document-preset-registry'
import { assembleDocument } from '@/lib/research/document-assembler'
import { saveDocumentBlueprint } from '@/lib/research/document-blueprint-storage'
import { listProjectEntityRefs } from '@/lib/research/project-storage'
import { useHistoryStore } from '@/lib/stores/history-store'
import { listProjects as listGraphProjects } from '@/lib/graph-studio/project-storage'
import type { DocumentBlueprint, DocumentPreset } from '@/lib/research/document-blueprint-types'

// ── 프리셋 아이콘 ──

const PRESET_ICONS: Record<DocumentPreset, React.ElementType> = {
  paper: BookOpen,
  report: FileText,
  custom: Layers,
}

// ── Props ──

interface DocumentAssemblyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  onCreated: (doc: DocumentBlueprint) => void
}

export default function DocumentAssemblyDialog({
  open, onOpenChange, projectId, projectName, onCreated,
}: DocumentAssemblyDialogProps): React.ReactElement {
  const [selectedPreset, setSelectedPreset] = useState<DocumentPreset>('paper')
  const [title, setTitle] = useState('')
  const [language, setLanguage] = useState<'ko' | 'en'>('ko')
  const [isCreating, setIsCreating] = useState(false)
  const { analysisHistory } = useHistoryStore()

  const handleCreate = useCallback(async () => {
    if (!title.trim()) return
    setIsCreating(true)

    try {
      const entityRefs = listProjectEntityRefs(projectId)
      const allGraphProjects = listGraphProjects()

      const doc = assembleDocument(
        {
          projectId,
          preset: selectedPreset,
          language,
          title: title.trim(),
        },
        {
          entityRefs,
          allHistory: analysisHistory,
          allGraphProjects,
        },
      )

      await saveDocumentBlueprint(doc)
      onCreated(doc)
    } finally {
      setIsCreating(false)
    }
  }, [title, selectedPreset, language, projectId, analysisHistory, onCreated])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>새 문서 만들기</DialogTitle>
          <DialogDescription>
            {projectName} 프로젝트의 분석 결과를 문서로 조립합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* 프리셋 선택 */}
          <div className="space-y-2">
            <Label>문서 유형</Label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_REGISTRY.map(preset => {
                const Icon = PRESET_ICONS[preset.id]
                const isSelected = selectedPreset === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPreset(preset.id)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/30',
                    )}
                  >
                    <Icon className={cn('w-5 h-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                    <span className={cn('text-xs font-medium', isSelected ? 'text-primary' : 'text-muted-foreground')}>
                      {preset.label.ko}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {PRESET_REGISTRY.find(p => p.id === selectedPreset)?.description.ko}
            </p>
          </div>

          {/* 제목 */}
          <div className="space-y-2">
            <Label htmlFor="doc-title">문서 제목</Label>
            <Input
              id="doc-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="연구 논문 제목을 입력하세요"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </div>

          {/* 언어 */}
          <div className="space-y-2">
            <Label>작성 언어</Label>
            <div className="flex gap-2">
              {(['ko', 'en'] as const).map(lang => (
                <Button
                  key={lang}
                  variant={language === lang ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLanguage(lang)}
                >
                  {lang === 'ko' ? '한국어' : 'English'}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || isCreating}
          >
            {isCreating ? '조립 중...' : '문서 만들기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
