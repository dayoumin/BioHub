'use client'

/**
 * QuickAnalysisPills - quick analysis method shortcuts.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Settings2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { focusRing } from '@/components/common'
import { useTerminology } from '@/hooks/use-terminology'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'
import { loadQuickMethods, saveQuickMethods } from '@/lib/utils/quick-methods-storage'

const STORAGE_KEY = STORAGE_KEYS.analysis.quickAnalysis
const DEFAULT_QUICK_METHODS = ['two-sample-t', 'one-way-anova', 'pearson-correlation', 'simple-regression', 'chi-square-independence']

function buildMethodsByCategory(): Record<string, Array<{ id: string; name: string; description: string }>> {
  return Object.entries(STATISTICAL_METHODS).reduce((acc, [id, method]) => {
    const category = method.category
    if (!acc[category]) acc[category] = []
    acc[category].push({
      id,
      name: method.koreanName || method.name,
      description: method.koreanDescription || method.description,
    })
    return acc
  }, {} as Record<string, Array<{ id: string; name: string; description: string }>>)
}

interface QuickAnalysisPillsProps {
  onQuickAnalysis: (methodId: string) => void
}

export function QuickAnalysisPills({ onQuickAnalysis }: QuickAnalysisPillsProps) {
  const t = useTerminology()
  const [quickMethods, setQuickMethods] = useState<string[]>(DEFAULT_QUICK_METHODS)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingMethods, setEditingMethods] = useState<string[]>([])

  useEffect((): void => {
    const saved = loadQuickMethods(STORAGE_KEY, DEFAULT_QUICK_METHODS)
    if (JSON.stringify(saved) !== JSON.stringify(DEFAULT_QUICK_METHODS)) {
      setQuickMethods(saved)
    }
  }, [])

  const methodsByCategory = useMemo(() => buildMethodsByCategory(), [])
  const quickMethodsInfo = useMemo(() => {
    return quickMethods
      .map((id) => {
        const method = STATISTICAL_METHODS[id]
        return method ? { id, name: t.hub.quickMethodNames[id] || method.koreanName || method.name } : null
      })
      .filter(Boolean) as Array<{ id: string; name: string }>
  }, [quickMethods, t])

  const handleOpenEdit = useCallback((): void => {
    setEditingMethods([...quickMethods])
    setShowEditDialog(true)
  }, [quickMethods])

  const handleSaveEdit = useCallback((): void => {
    setQuickMethods(editingMethods)
    saveQuickMethods(STORAGE_KEY, editingMethods)
    setShowEditDialog(false)
  }, [editingMethods])

  const handleToggleMethod = useCallback((methodId: string): void => {
    setEditingMethods((prev) => (
      prev.includes(methodId)
        ? prev.filter((id) => id !== methodId)
        : [...prev, methodId]
    ))
  }, [])

  return (
    <>
      <div
        role="group"
        aria-label={t.hub.quickAnalysis.title}
        className="flex flex-wrap items-center justify-center gap-2.5"
      >
        <div
          aria-hidden="true"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border/20 bg-transparent text-foreground"
        >
          <Zap className="h-4.5 w-4.5" />
        </div>

        {quickMethodsInfo.map((method) => (
          <button
            key={method.id}
            type="button"
            data-testid={`quick-pill-${method.id}`}
            onClick={() => onQuickAnalysis(method.id)}
            className={cn(
              'h-11 rounded-full px-3.5 text-xs',
              'border border-border/20 bg-transparent',
              'text-foreground/80 hover:border-border/35 hover:bg-transparent hover:text-foreground',
              'transition-colors duration-150',
              focusRing,
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
          className="h-11 gap-1.5 border-0 bg-transparent px-3 text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground"
          title={t.hub.quickAnalysis.editTooltip}
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span>{t.hub.quickAnalysis.editButton}</span>
        </Button>
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.hub.editDialog.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-4">
              {Object.entries(methodsByCategory).map(([category, methods]) => (
                <div key={category}>
                  <div className="mb-2 text-xs font-medium text-muted-foreground">
                    {t.hub.categoryLabels[category] || category}
                  </div>
                  <div className="space-y-1">
                    {methods.map((method) => (
                      <label
                        key={method.id}
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-accent"
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
            <div className="flex w-full items-center justify-between">
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
