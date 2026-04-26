'use client'

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { BookOpen, FileText, Info, Layers, Plus, RotateCcw, Trash2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { PRESET_REGISTRY, createSectionBlueprints } from '@/lib/research/document-preset-registry'
import { assembleDocument } from '@/lib/research/document-assembler'
import { saveDocumentBlueprint } from '@/lib/research/document-blueprint-storage'
import { createTargetJournalProfileSnapshot } from '@/lib/research/document-journal-profile'
import { listProjectEntityRefs } from '@/lib/research/project-storage'
import { useHistoryStore } from '@/lib/stores/history-store'
import { listProjects as listGraphProjects } from '@/lib/graph-studio/project-storage'
import { loadBioToolHistory } from '@/lib/bio-tools/bio-tool-history'
import type {
  BoldHistoryEntry,
  PhylogenyHistoryEntry,
  ProteinHistoryEntry,
  SeqStatsHistoryEntry,
  SimilarityHistoryEntry,
  TranslationHistoryEntry,
} from '@/lib/genetics/analysis-history'
import { loadAnalysisHistory, loadGeneticsHistory } from '@/lib/genetics/analysis-history'
import type {
  DocumentBlueprint,
  DocumentPreset,
  DocumentSectionBlueprintDefinition,
  TargetJournalStylePreset,
} from '@/lib/research/document-blueprint-types'
import type { HistoryRecord } from '@/lib/utils/storage-types'

// ── 프리셋 아이콘 ──

const PRESET_ICONS: Record<DocumentPreset, React.ElementType> = {
  paper: BookOpen,
  report: FileText,
  custom: Layers,
}

const SECTION_GENERATOR_LABELS: Record<DocumentSectionBlueprintDefinition['generatedBy'], string> = {
  template: '템플릿 초안',
  llm: 'AI 초안 대상',
  user: '직접 작성',
}

const SECTION_GENERATOR_HELP: Record<DocumentSectionBlueprintDefinition['generatedBy'], string> = {
  template: '정해진 구조로 초안을 만듭니다.',
  llm: '작성 실행 시 설정된 AI/로컬/템플릿 방식으로 초안을 만듭니다.',
  user: '본문은 사용자가 직접 채웁니다.',
}

const JOURNAL_STYLE_OPTIONS: Array<{ value: TargetJournalStylePreset; label: string }> = [
  { value: 'imrad', label: 'IMRAD' },
  { value: 'apa', label: 'APA' },
  { value: 'kci', label: 'KCI' },
  { value: 'general', label: 'General' },
  { value: 'manual', label: 'Manual' },
]

function buildDefaultSectionBlueprints(
  preset: DocumentPreset,
  language: 'ko' | 'en',
): DocumentSectionBlueprintDefinition[] {
  return createSectionBlueprints(preset, language)
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
  const [titleError, setTitleError] = useState(false)
  const [language, setLanguage] = useState<'ko' | 'en'>('ko')
  const [journalStylePreset, setJournalStylePreset] = useState<TargetJournalStylePreset>('imrad')
  const [targetJournal, setTargetJournal] = useState('')
  const [sectionBlueprints, setSectionBlueprints] = useState<DocumentSectionBlueprintDefinition[]>(
    () => buildDefaultSectionBlueprints('paper', 'ko'),
  )
  const [isCreating, setIsCreating] = useState(false)
  const { analysisHistory } = useHistoryStore()

  useEffect(() => {
    if (!open) {
      return
    }
    setSectionBlueprints(buildDefaultSectionBlueprints(selectedPreset, language))
  }, [language, open, selectedPreset])

  const resetSectionBlueprints = useCallback(() => {
    setSectionBlueprints(buildDefaultSectionBlueprints(selectedPreset, language))
  }, [language, selectedPreset])

  // A2: 다이얼로그 닫힐 때 폼 리셋
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setTitle('')
      setTitleError(false)
      setSelectedPreset('paper')
      setLanguage('ko')
      setJournalStylePreset('imrad')
      setTargetJournal('')
      setSectionBlueprints(buildDefaultSectionBlueprints('paper', 'ko'))
    }
    onOpenChange(nextOpen)
  }, [onOpenChange])

  const handleSectionTitleChange = useCallback((index: number, value: string) => {
    setSectionBlueprints((prev) => prev.map((section, sectionIndex) => (
      sectionIndex === index ? { ...section, title: value } : section
    )))
  }, [])

  const handleSectionGeneratedByChange = useCallback((
    index: number,
    generatedBy: DocumentSectionBlueprintDefinition['generatedBy'],
  ) => {
    setSectionBlueprints((prev) => prev.map((section, sectionIndex) => (
      sectionIndex === index ? { ...section, generatedBy } : section
    )))
  }, [])

  const handleAddSection = useCallback(() => {
    setSectionBlueprints((prev) => [
      ...prev,
      {
        title: language === 'ko' ? `새 섹션 ${prev.length + 1}` : `New Section ${prev.length + 1}`,
        generatedBy: 'user',
        editable: true,
      },
    ])
  }, [language])

  const handleDeleteSection = useCallback((index: number) => {
    setSectionBlueprints((prev) => (
      prev.length <= 1 ? prev : prev.filter((_, sectionIndex) => sectionIndex !== index)
    ))
  }, [])

  const handleCreate = useCallback(async () => {
    if (!title.trim()) {
      setTitleError(true)
      return
    }
    const normalizedSectionBlueprints = sectionBlueprints
      .map((section) => ({
        ...section,
        title: section.title.trim(),
      }))
      .filter((section) => section.title.length > 0)

    if (normalizedSectionBlueprints.length === 0) {
      toast.error('최소 한 개 이상의 목차를 남겨주세요.')
      return
    }

    setIsCreating(true)

    try {
      const entityRefs = listProjectEntityRefs(projectId)
      const allGraphProjects = listGraphProjects()
      const blastHistory = loadAnalysisHistory()
      const bioToolHistory = loadBioToolHistory()

      const doc = assembleDocument(
        {
          projectId,
          preset: selectedPreset,
          language,
          title: title.trim(),
          sectionBlueprints: normalizedSectionBlueprints,
          metadata: {
            sectionBlueprints: normalizedSectionBlueprints,
            targetJournalProfile: selectedPreset === 'paper'
              ? createTargetJournalProfileSnapshot({
                  stylePreset: journalStylePreset,
                  label: targetJournal.trim() || `${journalStylePreset.toUpperCase()} manuscript`,
                  targetJournal: targetJournal.trim() || undefined,
                  articleType: 'research article',
                })
              : undefined,
          },
        },
        {
          entityRefs,
          allHistory: analysisHistory as unknown as HistoryRecord[],
          allGraphProjects,
          blastHistory,
          bioToolHistory,
          proteinHistory: loadGeneticsHistory('protein') as ProteinHistoryEntry[],
          seqStatsHistory: loadGeneticsHistory('seq-stats') as SeqStatsHistoryEntry[],
          similarityHistory: loadGeneticsHistory('similarity') as SimilarityHistoryEntry[],
          phylogenyHistory: loadGeneticsHistory('phylogeny') as PhylogenyHistoryEntry[],
          boldHistory: loadGeneticsHistory('bold') as BoldHistoryEntry[],
          translationHistory: loadGeneticsHistory('translation') as TranslationHistoryEntry[],
        },
      )

      await saveDocumentBlueprint(doc)
      onCreated(doc)
    } catch (err) {
      toast.error('문서 생성에 실패했습니다.')
      console.error('[DocumentAssemblyDialog] create failed:', err)
    } finally {
      setIsCreating(false)
    }
  }, [title, sectionBlueprints, selectedPreset, language, projectId, analysisHistory, onCreated, journalStylePreset, targetJournal])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100vh-48px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>새 문서 만들기</DialogTitle>
          <DialogDescription>
            {projectName} 프로젝트의 분석 결과를 조립합니다
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
                    aria-pressed={isSelected}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg bg-surface-container p-4 transition-colors',
                      isSelected
                        ? 'bg-surface-container-high text-on-surface'
                        : 'text-muted-foreground hover:bg-surface-container-high',
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">
                      {preset.label.ko}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {selectedPreset === 'paper' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label>Journal/style profile</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full text-muted-foreground"
                        aria-label="Journal style profile 설명"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-64 text-xs leading-relaxed">
                      초안 작성과 preflight가 같은 저널/스타일 기준을 사용합니다.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex flex-wrap gap-2">
                {JOURNAL_STYLE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setJournalStylePreset(option.value)}
                    aria-pressed={journalStylePreset === option.value}
                    className={cn(
                      'h-8 rounded-full',
                      journalStylePreset === option.value
                        ? 'bg-surface-container-high text-on-surface'
                        : 'bg-surface-container text-on-surface-variant',
                    )}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <Input
                value={targetJournal}
                onChange={(event) => setTargetJournal(event.target.value)}
                placeholder="Target journal (optional)"
                className="h-9 bg-surface"
              />
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Label>목차 구성</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full text-muted-foreground"
                        aria-label="목차 구성 설명"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-64 text-xs leading-relaxed">
                      섹션 이름을 바꾸거나 새 섹션을 미리 추가할 수 있습니다.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={resetSectionBlueprints}
                className="gap-1 rounded-full bg-surface-container"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                기본값 복원
              </Button>
            </div>

            <div className="space-y-2 rounded-2xl bg-surface-container p-3">
              {sectionBlueprints.map((section, index) => (
                <div
                  key={`${section.id ?? 'new'}-${index}`}
                  className="rounded-xl bg-surface-container-lowest px-3 py-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="min-w-6 text-xs font-medium text-muted-foreground">
                      {index + 1}
                    </span>
                    <Input
                      value={section.title}
                      onChange={(event) => handleSectionTitleChange(index, event.target.value)}
                      placeholder={language === 'ko' ? '섹션 제목' : 'Section title'}
                      className="h-9 bg-surface"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSection(index)}
                      disabled={sectionBlueprints.length <= 1}
                      className="h-9 w-9 shrink-0"
                      title="섹션 삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer list-none text-[11px] font-medium text-muted-foreground">
                      작성 방식: {SECTION_GENERATOR_LABELS[section.generatedBy]}
                    </summary>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(['user', 'template', 'llm'] as const).map((generatedBy) => (
                        <Button
                          key={generatedBy}
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSectionGeneratedByChange(index, generatedBy)}
                          aria-pressed={section.generatedBy === generatedBy}
                          className={cn(
                            'h-8 rounded-full',
                            section.generatedBy === generatedBy
                              ? 'bg-surface-container-high text-on-surface'
                              : 'bg-surface text-on-surface-variant',
                          )}
                          title={SECTION_GENERATOR_HELP[generatedBy]}
                        >
                          {SECTION_GENERATOR_LABELS[generatedBy]}
                        </Button>
                      ))}
                    </div>
                  </details>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddSection}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                섹션 추가
              </Button>
            </div>
          </div>

          {/* 제목 */}
          <div className="space-y-2">
            <Label htmlFor="doc-title">문서 제목</Label>
            <Input
              id="doc-title"
              value={title}
              onChange={e => { setTitle(e.target.value); setTitleError(false) }}
              placeholder="연구 논문 제목을 입력하세요"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className={titleError ? 'border-destructive' : ''}
            />
            {titleError && (
              <p className="text-xs text-destructive">제목을 입력해주세요</p>
            )}
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
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
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
