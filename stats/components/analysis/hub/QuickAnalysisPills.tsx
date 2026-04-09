'use client'

/**
 * QuickAnalysisPills — 빠른 분석 메서드 pills
 *
 * Hero 섹션 바로 아래, 빠른 시작 그리드 위에 배치
 * - 커스텀 가능한 메서드 pill 목록
 * - 편집 다이얼로그로 사용자 설정
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { focusRing } from '@/components/common'
import { useTerminology } from '@/hooks/use-terminology'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'
import { loadQuickMethods, saveQuickMethods } from '@/lib/utils/quick-methods-storage'

// ===== Constants =====

const STORAGE_KEY = STORAGE_KEYS.analysis.quickAnalysis
const DEFAULT_QUICK_METHODS = ['two-sample-t', 'one-way-anova', 'pearson-correlation', 'simple-regression', 'chi-square-independence']

/** Runtime에 평가하여 registerMethod()로 추가된 메서드도 포함 */
function buildMethodsByCategory(): Record<string, Array<{ id: string; name: string; description: string }>> {
  return Object.entries(STATISTICAL_METHODS).reduce((acc, [id, method]) => {
    const cat = method.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push({
      id,
      name: method.koreanName || method.name,
      description: method.koreanDescription || method.description
    })
    return acc
  }, {} as Record<string, Array<{ id: string; name: string; description: string }>>)
}

// ===== Props =====

interface QuickAnalysisPillsProps {
  onQuickAnalysis: (methodId: string) => void
}

// ===== Component =====

export function QuickAnalysisPills({ onQuickAnalysis }: QuickAnalysisPillsProps) {
  const t = useTerminology()

  const [quickMethods, setQuickMethods] = useState<string[]>(DEFAULT_QUICK_METHODS)

  // localStorage는 useEffect에서 로드하여 hydration mismatch 방지
  useEffect(() => {
    const saved = loadQuickMethods(STORAGE_KEY, DEFAULT_QUICK_METHODS)
    if (JSON.stringify(saved) !== JSON.stringify(DEFAULT_QUICK_METHODS)) {
      setQuickMethods(saved)
    }
  }, [])
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingMethods, setEditingMethods] = useState<string[]>([])

  // Lazy 평가: module-scope 대신 render 시점에 계산하여 import 순서 의존성 제거
  const methodsByCategory = useMemo(() => buildMethodsByCategory(), [])

  const quickMethodsInfo = useMemo(() => {
    return quickMethods
      .map(id => {
        const method = STATISTICAL_METHODS[id]
        return method ? { id, name: t.hub.quickMethodNames[id] || method.koreanName || method.name } : null
      })
      .filter(Boolean) as Array<{ id: string; name: string }>
  }, [quickMethods, t])

  const handleOpenEdit = useCallback(() => {
    setEditingMethods([...quickMethods])
    setShowEditDialog(true)
  }, [quickMethods])

  const handleSaveEdit = useCallback(() => {
    setQuickMethods(editingMethods)
    saveQuickMethods(STORAGE_KEY, editingMethods)
    setShowEditDialog(false)
  }, [editingMethods])

  const handleToggleMethod = useCallback((methodId: string) => {
    setEditingMethods(prev =>
      prev.includes(methodId)
        ? prev.filter(id => id !== methodId)
        : [...prev, methodId]
    )
  }, [])

  return (
    <>
      <div className="flex items-center justify-center gap-2.5 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground/80 mr-1">
          {t.hub.quickAnalysis.title}
        </span>

        {quickMethodsInfo.map(method => (
          <button
            key={method.id}
            type="button"
            data-testid={`quick-pill-${method.id}`}
            onClick={() => onQuickAnalysis(method.id)}
            className={cn(
              'h-8 px-3.5 text-xs rounded-full',
              'border border-border/50 bg-background',
              'text-foreground/80 hover:text-primary hover:border-primary/35 hover:bg-primary/5',
              'transition-colors duration-150',
              focusRing
            )}
          >
            {method.name}
          </button>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="quick-analysis-settings"
          onClick={handleOpenEdit}
          className="h-8 px-3 gap-1.5 border-border/50 bg-background text-muted-foreground hover:text-foreground"
          title={t.hub.quickAnalysis.editTooltip}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>{t.hub.quickAnalysis.editButton}</span>
        </Button>
      </div>

      {/* 편집 다이얼로그 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.hub.editDialog.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-4">
              {Object.entries(methodsByCategory).map(([category, methods]) => (
                <div key={category}>
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    {t.hub.categoryLabels[category] || category}
                  </div>
                  <div className="space-y-1">
                    {methods.map(method => (
                      <label
                        key={method.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                      >
                        <Checkbox
                          checked={editingMethods.includes(method.id)}
                          onCheckedChange={() => handleToggleMethod(method.id)}
                        />
                        <span className="text-sm">{method.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-muted-foreground">
                {t.hub.editDialog.selectedCount(editingMethods.length)}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowEditDialog(false)}>
                  {t.hub.editDialog.cancel}
                </Button>
                <Button size="sm" onClick={handleSaveEdit}>
                  {t.hub.editDialog.save}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
