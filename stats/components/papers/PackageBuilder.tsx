'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { loadPackage, savePackage } from '@/lib/research/paper-package-storage'
import { assemblePaperPackage, generateFigurePatternSummary } from '@/lib/research/paper-package-assembler'
import {
  JOURNAL_PRESETS,
  generatePackageId,
  generatePackageItemId,
  generatePackageRefId,
} from '@/lib/research/paper-package-types'
import type {
  PaperPackage,
  PackageItem,
  PackageReference,
  JournalPreset,
  AssemblyResult,
  SummaryStatus,
} from '@/lib/research/paper-package-types'
import type { PackageDataSources } from '@/lib/research/paper-package-assembler'
import {
  listProjectEntityRefs,
  loadResearchProject,
  RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT,
} from '@/lib/research/project-storage'
import {
  GRAPH_PROJECTS_CHANGED_EVENT,
  listProjects,
} from '@/lib/graph-studio/project-storage'
import { getAllHistory } from '@/lib/utils/storage'
import PackagePreview from './PackagePreview'

// ── Types ────────────────────────────────────────────────

export interface PackageBuilderProps {
  packageId?: string
  projectId?: string
  onBack: () => void
}

type Step = 1 | 2 | 3 | 4 | 5

const STEP_LABELS: Record<Step, string> = {
  1: '연구 개요',
  2: '결과 배치',
  3: '참고문헌',
  4: '저널 설정',
  5: '미리보기',
}

const ROLE_OPTIONS: { value: PackageReference['role']; label: string }[] = [
  { value: 'background', label: '배경 이론' },
  { value: 'methodology', label: '방법론 근거' },
  { value: 'comparison', label: '비교 데이터' },
  { value: 'theory', label: '이론적 배경' },
  { value: 'other', label: '기타' },
]

const ITEM_TYPE_LABELS: Record<PackageItem['type'], string> = {
  analysis: '분석',
  figure: '그림',
  table: '표',
}

// ── 초기 패키지 팩토리 ──────────────────────────────────

function createEmptyPackage(projectId: string): PaperPackage {
  return {
    id: generatePackageId(),
    projectId,
    version: 1,
    overview: {
      title: '',
      purpose: '',
      dataDescription: '',
      researchQuestion: '',
      hypothesis: '',
    },
    items: [],
    references: [],
    journal: JOURNAL_PRESETS[0],
    context: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ── Step 1: 연구 개요 ────────────────────────────────────

interface Step1Props {
  pkg: PaperPackage
  onChange: (updated: Partial<PaperPackage['overview']>) => void
}

function Step1({ pkg, onChange }: Step1Props): React.ReactElement {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <label className="text-sm font-medium">논문 제목 *</label>
        <Input
          placeholder="예: 한국 남해안 저서동물 군집 구조 분석"
          value={pkg.overview.title}
          onChange={e => onChange({ title: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">연구 목적 *</label>
        <Textarea
          placeholder="이 연구를 통해 무엇을 밝히려 하는지 1-2문장으로 기술하세요."
          rows={3}
          value={pkg.overview.purpose}
          onChange={e => onChange({ purpose: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">데이터 설명 *</label>
        <Textarea
          placeholder="사용한 데이터의 출처, 기간, 지역, 샘플 수 등을 기술하세요."
          rows={3}
          value={pkg.overview.dataDescription}
          onChange={e => onChange({ dataDescription: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">연구 질문 (선택)</label>
        <Input
          placeholder="예: 수온 변화가 저서동물 다양성에 영향을 미치는가?"
          value={pkg.overview.researchQuestion ?? ''}
          onChange={e => onChange({ researchQuestion: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">가설 (선택)</label>
        <Input
          placeholder="예: 수온이 높을수록 종 다양성이 감소할 것이다."
          value={pkg.overview.hypothesis ?? ''}
          onChange={e => onChange({ hypothesis: e.target.value })}
        />
      </div>
    </div>
  )
}

// ── Step 2: 결과 배치 ────────────────────────────────────

interface Step2Props {
  items: PackageItem[]
  onChange: (items: PackageItem[]) => void
}

function Step2({ items, onChange }: Step2Props): React.ReactElement {
  const moveItem = useCallback((index: number, dir: -1 | 1) => {
    const next = [...items]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next.map((item, i) => ({ ...item, order: i })))
  }, [items, onChange])

  const toggleItem = useCallback((id: string) => {
    onChange(items.map(item => item.id === id ? { ...item, included: !item.included } : item))
  }, [items, onChange])

  const updateLabel = useCallback((id: string, label: string) => {
    onChange(items.map(item => item.id === id ? { ...item, label } : item))
  }, [items, onChange])

  const updatePatternSummary = useCallback((id: string, patternSummary: string) => {
    onChange(items.map(item => item.id === id ? { ...item, patternSummary } : item))
  }, [items, onChange])

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
        분석 결과를 찾을 수 없습니다. 프로젝트에 분석 히스토리나 Graph Studio 프로젝트가 있어야 합니다.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={item.id}
          className={cn(
            'flex items-start gap-3 p-3 rounded-xl border bg-card transition-colors',
            !item.included && 'opacity-50',
          )}
        >
          {/* 순서 버튼 */}
          <div className="flex flex-col gap-0.5 mt-0.5">
            <button
              type="button"
              onClick={() => moveItem(index, -1)}
              disabled={index === 0}
              className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => moveItem(index, 1)}
              disabled={index === items.length - 1}
              className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 체크박스 */}
          <input
            type="checkbox"
            checked={item.included}
            onChange={() => toggleItem(item.id)}
            className="mt-1 accent-primary"
          />

          {/* 정보 */}
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] shrink-0">
                {ITEM_TYPE_LABELS[item.type]}
              </Badge>
              <Input
                value={item.label}
                onChange={e => updateLabel(item.id, e.target.value)}
                className="h-7 text-sm"
                placeholder="레이블 (예: Table 1)"
              />
            </div>
            {item.type === 'figure' && (
              <Textarea
                rows={2}
                value={item.patternSummary ?? ''}
                onChange={e => updatePatternSummary(item.id, e.target.value)}
                placeholder="그래프 패턴 요약 (예: A그룹 평균이 B그룹보다 높음)"
                className="text-xs"
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Step 3: 참고문헌 ─────────────────────────────────────

interface Step3Props {
  references: PackageReference[]
  onChange: (refs: PackageReference[]) => void
}

function Step3({ references, onChange }: Step3Props): React.ReactElement {
  const addRef = useCallback(() => {
    const newRef: PackageReference = {
      id: generatePackageRefId(),
      manualEntry: {
        authors: '',
        year: new Date().getFullYear(),
        title: '',
        journal: '',
        doi: '',
      },
      role: 'background',
      summaryStatus: 'missing',
      included: true,
    }
    onChange([...references, newRef])
  }, [references, onChange])

  const deleteRef = useCallback((id: string) => {
    onChange(references.filter(r => r.id !== id))
  }, [references, onChange])

  const toggleRef = useCallback((id: string) => {
    onChange(references.map(r => r.id === id ? { ...r, included: !r.included } : r))
  }, [references, onChange])

  const updateRef = useCallback((id: string, updates: Partial<PackageReference>) => {
    onChange(references.map(r => r.id === id ? { ...r, ...updates } : r))
  }, [references, onChange])

  const updateManualEntry = useCallback(
    (id: string, field: keyof NonNullable<PackageReference['manualEntry']>, value: string | number) => {
      onChange(references.map(r => {
        if (r.id !== id) return r
        return {
          ...r,
          manualEntry: {
            authors: '',
            year: new Date().getFullYear(),
            title: '',
            journal: '',
            ...r.manualEntry,
            [field]: value,
          },
        }
      }))
    },
    [references, onChange],
  )

  const updateSummary = useCallback((id: string, summary: string) => {
    onChange(references.map(r => {
      if (r.id !== id) return r
      return {
        ...r,
        summary,
        summaryStatus: summary.trim().length > 0 ? 'ready' as const : 'missing' as const,
      }
    }))
  }, [references, onChange])

  const statusBadgeClass: Record<SummaryStatus, string> = {
    missing: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    draft: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    ready: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  }

  const statusLabel: Record<SummaryStatus, string> = {
    missing: '요약 없음',
    draft: '미확인',
    ready: '완료',
  }

  return (
    <div className="space-y-4">
      {references.length === 0 && (
        <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground text-sm">
          참고문헌을 추가하세요. 요약을 입력하면 AI 서론 hallucination을 방지할 수 있습니다.
        </div>
      )}
      {references.map(ref => (
        <div key={ref.id} className={cn('rounded-xl border bg-card p-4 space-y-3', !ref.included && 'opacity-50')}>
          {/* 헤더 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={ref.included}
              onChange={() => toggleRef(ref.id)}
              className="accent-primary"
            />
            <select
              value={ref.role}
              onChange={e => updateRef(ref.id, { role: e.target.value as PackageReference['role'] })}
              className="text-xs border rounded px-2 py-1 bg-background"
            >
              {ROLE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', statusBadgeClass[ref.summaryStatus])}>
              {statusLabel[ref.summaryStatus]}
            </span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => deleteRef(ref.id)}
              className="p-1 rounded hover:bg-muted text-muted-foreground"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 수동 입력 필드 */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Input
              placeholder="저자 (예: 김철수, 박영희)"
              value={ref.manualEntry?.authors ?? ''}
              onChange={e => updateManualEntry(ref.id, 'authors', e.target.value)}
              className="h-7 text-xs col-span-2"
            />
            <Input
              placeholder="제목"
              value={ref.manualEntry?.title ?? ''}
              onChange={e => updateManualEntry(ref.id, 'title', e.target.value)}
              className="h-7 text-xs col-span-2"
            />
            <Input
              placeholder="저널명"
              value={ref.manualEntry?.journal ?? ''}
              onChange={e => updateManualEntry(ref.id, 'journal', e.target.value)}
              className="h-7 text-xs"
            />
            <Input
              type="number"
              placeholder="연도"
              value={ref.manualEntry?.year ?? ''}
              onChange={e => updateManualEntry(ref.id, 'year', Number(e.target.value))}
              className="h-7 text-xs"
            />
            <Input
              placeholder="DOI (선택)"
              value={ref.manualEntry?.doi ?? ''}
              onChange={e => updateManualEntry(ref.id, 'doi', e.target.value)}
              className="h-7 text-xs col-span-2"
            />
          </div>

          {/* 요약 */}
          <Textarea
            rows={2}
            placeholder="핵심 내용 1-2문장 요약 (서론 hallucination 방지에 필수)"
            value={ref.summary ?? ''}
            onChange={e => updateSummary(ref.id, e.target.value)}
            className="text-xs"
          />
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={addRef} className="gap-2 w-full">
        <Plus className="w-3.5 h-3.5" />
        + 문헌 추가
      </Button>
    </div>
  )
}

function mergeCollectedPackageItems(
  previousItems: PackageItem[],
  collectedItems: PackageItem[],
  referencedSourceKeys: ReadonlySet<string>,
): PackageItem[] {
  const previousBySource = new Map(
    previousItems.map((item) => [`${item.type}:${item.sourceId}`, item] as const)
  )
  const collectedSourceKeys = new Set(
    collectedItems.map((item) => `${item.type}:${item.sourceId}`)
  )

  const merged = collectedItems.map((item, index) => {
    const existing = previousBySource.get(`${item.type}:${item.sourceId}`)
    if (!existing) {
      return { ...item, order: index }
    }

    return {
      ...item,
      id: existing.id,
      label: existing.label,
      section: existing.section,
      order: existing.order,
      included: existing.included,
      patternSummary: item.patternSummary ?? existing.patternSummary,
    }
  })

  for (const item of previousItems) {
    const sourceKey = `${item.type}:${item.sourceId}`
    if (!referencedSourceKeys.has(sourceKey) || collectedSourceKeys.has(sourceKey)) {
      continue
    }
    merged.push(item)
  }

  return merged
    .sort((left, right) => left.order - right.order)
    .map((item, index) => ({ ...item, order: index }))
}

// ── Step 4: 저널 설정 + 추가 맥락 ───────────────────────

interface Step4Props {
  journal: JournalPreset
  context: PaperPackage['context']
  onJournalChange: (j: JournalPreset) => void
  onContextChange: (ctx: Partial<PaperPackage['context']>) => void
}

function Step4({ journal, context, onJournalChange, onContextChange }: Step4Props): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* 저널 프리셋 그리드 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">저널 / 스타일</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {JOURNAL_PRESETS.map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onJournalChange(preset)}
              className={cn(
                'p-3 rounded-xl border text-left transition-colors',
                journal.id === preset.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card hover:bg-muted/50',
              )}
            >
              <p className="text-xs font-semibold">{preset.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {preset.language === 'ko' ? '한국어' : 'English'} · {preset.sections.length}섹션
              </p>
            </button>
          ))}
        </div>
        {journal.referenceExample && (
          <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg p-2 font-mono">
            예시: {journal.referenceExample}
          </p>
        )}
      </div>

      {/* 추가 맥락 */}
      <div className="space-y-4">
        <p className="text-sm font-medium">추가 맥락 (선택)</p>
        {([
          ['priorWorkDiff', '선행연구와 차이점'],
          ['limitations', '연구의 한계'],
          ['highlights', '강조할 발견'],
          ['theoreticalImplications', '이론적 시사점'],
          ['practicalImplications', '실무적 시사점'],
          ['futureResearch', '후속 연구 제안'],
        ] as [keyof PaperPackage['context'], string][]).map(([field, label]) => (
          <div key={field} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{label}</label>
            <Textarea
              rows={2}
              value={context[field] ?? ''}
              onChange={e => onContextChange({ [field]: e.target.value })}
              placeholder={`${label}를 간략히 기술하세요`}
              className="text-xs"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Step 5: 미리보기 ──────────────────────────────────────

interface Step5Props {
  pkg: PaperPackage
  result: AssemblyResult | null
  onAssemble: () => Promise<void>
}

function Step5({ pkg, result, onAssemble }: Step5Props): React.ReactElement {
  if (!result) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <p className="text-sm text-muted-foreground">패키지를 조립하면 AI에게 보낼 마크다운이 생성됩니다.</p>
        <Button onClick={onAssemble} className="gap-2">
          패키지 조립하기
        </Button>
        <p className="text-xs text-muted-foreground">
          포함 항목: 분석 {pkg.items.filter(i => i.included).length}개 ·
          참고문헌 {pkg.references.filter(r => r.included).length}개
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PackagePreview result={result} packageTitle={pkg.overview.title} />
      <Button variant="outline" size="sm" onClick={onAssemble} className="gap-2">
        재조립
      </Button>
    </div>
  )
}

// ── PackageBuilder 메인 ───────────────────────────────────

const STEPS: Step[] = [1, 2, 3, 4, 5]

export default function PackageBuilder({ packageId, projectId, onBack }: PackageBuilderProps): React.ReactElement {
  const [step, setStep] = useState<Step>(1)
  const [pkg, setPkg] = useState<PaperPackage | null>(null)
  const [assemblyResult, setAssemblyResult] = useState<AssemblyResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [itemCollectionRefreshKey, setItemCollectionRefreshKey] = useState(0)

  // 초기 로드
  useEffect(() => {
    const init = async (): Promise<void> => {
      setIsLoading(true)
      try {
        if (packageId) {
          const loaded = await loadPackage(packageId)
          if (loaded) {
            setPkg(loaded)
            setIsLoading(false)
            return
          }
        }

        // 새 패키지 생성
        const pid = projectId ?? 'unknown'
        const newPkg = createEmptyPackage(pid)

        // 프로젝트 정보로 제목 자동 채우기
        if (pid !== 'unknown') {
          const project = loadResearchProject(pid)
          if (project?.paperConfig?.title) {
            newPkg.overview.title = project.paperConfig.title
          }
        }

        setPkg(newPkg)
      } finally {
        setIsLoading(false)
      }
    }

    void init()
  }, [packageId, projectId])

  // Step 2 진입 시 항목 자동 수집
  const currentProjectId = pkg?.projectId
  const hasItems = (pkg?.items.length ?? 0) > 0

  useEffect((): (() => void) => {
    const handleRefresh = (): void => {
      setItemCollectionRefreshKey(prev => prev + 1)
    }

    window.addEventListener(RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT, handleRefresh)
    window.addEventListener(GRAPH_PROJECTS_CHANGED_EVENT, handleRefresh)

    return (): void => {
      window.removeEventListener(RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT, handleRefresh)
      window.removeEventListener(GRAPH_PROJECTS_CHANGED_EVENT, handleRefresh)
    }
  }, [])

  useEffect(() => {
    const shouldRefreshExistingItems = itemCollectionRefreshKey > 0
    if (step !== 2 || !currentProjectId || (!shouldRefreshExistingItems && hasItems)) return

    const collectItems = async (): Promise<void> => {
      try {
        const historyRecords = await getAllHistory()
        const graphProjects = listProjects()
        const entityRefs = listProjectEntityRefs(currentProjectId)
        const referencedSourceKeys = new Set<string>()

        const historyById = new Map(historyRecords.map(h => [h.id, h]))
        const graphById = new Map(graphProjects.map(g => [g.id, g]))
        const newItems: PackageItem[] = []
        let tableCount = 0
        let figureCount = 0

        for (const ref of entityRefs) {
          if (ref.entityKind === 'analysis') {
            referencedSourceKeys.add(`analysis:${ref.entityId}`)
            const record = historyById.get(ref.entityId)
            if (record) {
              tableCount++
              newItems.push({
                id: generatePackageItemId(),
                type: 'analysis',
                sourceId: record.id,
                analysisIds: [`ANAL-${String(tableCount).padStart(2, '0')}`],
                label: `Table ${tableCount}`,
                section: 'results',
                order: newItems.length,
                included: true,
              })
            }
          } else if (ref.entityKind === 'figure') {
            referencedSourceKeys.add(`figure:${ref.entityId}`)
            const graph = graphById.get(ref.entityId)
            if (graph) {
              figureCount++
              const linkedRecord = graph.analysisId ? historyById.get(graph.analysisId) : undefined
              const patternSummary = generateFigurePatternSummary(graph, linkedRecord)
              newItems.push({
                id: generatePackageItemId(),
                type: 'figure',
                sourceId: graph.id,
                analysisIds: graph.analysisId ? [graph.analysisId] : [],
                label: `Figure ${figureCount}`,
                section: 'results',
                order: newItems.length,
                included: true,
                patternSummary,
              })
            }
          }
        }

        setPkg(prev => {
          if (!prev) return prev
          return {
            ...prev,
            items: mergeCollectedPackageItems(prev.items, newItems, referencedSourceKeys),
          }
        })
      } catch {
        // 수집 실패 시 빈 상태 유지
      }
    }

    void collectItems()
  }, [step, currentProjectId, hasItems, itemCollectionRefreshKey])

  const updateOverview = useCallback((updated: Partial<PaperPackage['overview']>) => {
    setPkg(prev => prev ? { ...prev, overview: { ...prev.overview, ...updated } } : prev)
    setAssemblyResult(null)
  }, [])

  const updateItems = useCallback((items: PackageItem[]) => {
    setPkg(prev => prev ? { ...prev, items } : prev)
    setAssemblyResult(null)
  }, [])

  const updateReferences = useCallback((references: PackageReference[]) => {
    setPkg(prev => prev ? { ...prev, references } : prev)
    setAssemblyResult(null)
  }, [])

  const updateJournal = useCallback((journal: JournalPreset) => {
    setPkg(prev => prev ? { ...prev, journal } : prev)
    setAssemblyResult(null)
  }, [])

  const updateContext = useCallback((ctx: Partial<PaperPackage['context']>) => {
    setPkg(prev => prev ? { ...prev, context: { ...prev.context, ...ctx } } : prev)
    setAssemblyResult(null)
  }, [])

  const handleSave = useCallback(async (current: PaperPackage): Promise<void> => {
    const updated = { ...current, updatedAt: new Date().toISOString() }
    await savePackage(updated)
  }, [])

  const handleNext = useCallback(() => {
    if (!pkg) return
    void handleSave(pkg)
    setStep(prev => Math.min(prev + 1, 5) as Step)
  }, [pkg, handleSave])

  const handlePrev = useCallback(() => {
    setStep(prev => Math.max(prev - 1, 1) as Step)
  }, [])

  const handleAssemble = useCallback(async (): Promise<void> => {
    if (!pkg) return
    try {
      const historyRecords = await getAllHistory()
      const graphProjects = listProjects()
      const sources: PackageDataSources = { historyRecords, graphProjects }
      const result = assemblePaperPackage(pkg, sources)
      setAssemblyResult(result)
    } catch {
      // 조립 실패 시 결과 초기화
      setAssemblyResult(null)
    }
  }, [pkg])

  if (isLoading || !pkg) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">패키지 불러오는 중...</p>
      </div>
    )
  }

  const steps = STEPS

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="p-1.5 rounded hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-bold">AI 패키지 조립</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          {steps.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s)}
              className={cn(
                'flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors',
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : s < step
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 스텝 레이블 */}
      <div>
        <p className="text-xs text-muted-foreground">Step {step} / 5</p>
        <h2 className="text-lg font-semibold">{STEP_LABELS[step]}</h2>
      </div>

      {/* 콘텐츠 */}
      <div className="min-h-[300px]">
        {step === 1 && <Step1 pkg={pkg} onChange={updateOverview} />}
        {step === 2 && <Step2 items={pkg.items} onChange={updateItems} />}
        {step === 3 && <Step3 references={pkg.references} onChange={updateReferences} />}
        {step === 4 && (
          <Step4
            journal={pkg.journal}
            context={pkg.context}
            onJournalChange={updateJournal}
            onContextChange={updateContext}
          />
        )}
        {step === 5 && (
          <Step5
            pkg={pkg}
            result={assemblyResult}
            onAssemble={handleAssemble}
          />
        )}
      </div>

      {/* 하단 내비게이션 */}
      <div className="flex items-center justify-between pt-4 border-t">
        {step === 1 ? (
          <Button variant="ghost" onClick={onBack} className="gap-1">
            취소
          </Button>
        ) : (
          <Button variant="outline" onClick={handlePrev} className="gap-1">
            <ChevronLeft className="w-4 h-4" />
            이전
          </Button>
        )}
        {step < 5 && (
          <Button onClick={handleNext} className="gap-1">
            다음
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
