'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  RotateCcw
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AssumptionItem {
  /** Assumption ID */
  id: string
  /** Assumption name */
  name: string
  /** Detailed description */
  description?: string
  /** How to check this assumption */
  howToCheck?: string
  /** What to do if violated */
  ifViolated?: string
  /** Importance level */
  importance?: 'critical' | 'important' | 'optional'
}

export interface AssumptionChecklistProps {
  /** List of assumptions to check */
  assumptions: AssumptionItem[]
  /** Callback when check state changes */
  onCheckChange?: (checkedIds: string[]) => void
  /** Initial checked items */
  initialChecked?: string[]
  /** Show progress bar */
  showProgress?: boolean
  /** Allow collapsible details */
  collapsible?: boolean
  /** Title override */
  title?: string
  /** Description override */
  description?: string
  /** Custom class name */
  className?: string
  /** Compact mode */
  compact?: boolean
}

/**
 * AssumptionChecklist - Pre-analysis assumption verification
 *
 * Interactive checklist for verifying statistical assumptions before analysis.
 * Shows progress and provides guidance on checking each assumption.
 *
 * @example
 * const assumptions = method.assumptions.map((a, i) => ({
 *   id: `assumption-${i}`,
 *   name: a,
 *   importance: 'critical' as const
 * }))
 * <AssumptionChecklist assumptions={assumptions} />
 */
export function AssumptionChecklist({
  assumptions,
  onCheckChange,
  initialChecked = [],
  showProgress = true,
  collapsible = true,
  title = '분석 가정 확인',
  description = '분석 전 다음 가정들을 확인해주세요.',
  className,
  compact = false
}: AssumptionChecklistProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(
    new Set(initialChecked)
  )
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const progress = (checkedItems.size / assumptions.length) * 100
  const allChecked = checkedItems.size === assumptions.length

  const handleCheck = useCallback((id: string, checked: boolean) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(id)
      } else {
        newSet.delete(id)
      }
      onCheckChange?.(Array.from(newSet))
      return newSet
    })
  }, [onCheckChange])

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const handleReset = useCallback(() => {
    setCheckedItems(new Set())
    onCheckChange?.([])
  }, [onCheckChange])

  const getImportanceBadge = (importance?: 'critical' | 'important' | 'optional') => {
    switch (importance) {
      case 'critical':
        return <Badge variant="destructive" className="text-xs">필수</Badge>
      case 'important':
        return <Badge variant="default" className="text-xs">중요</Badge>
      case 'optional':
        return <Badge variant="outline" className="text-xs">권장</Badge>
      default:
        return null
    }
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className={cn(compact ? 'p-4 pb-2' : 'pb-2')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className={cn(compact ? 'text-base' : 'text-lg')}>
              {title}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            초기화
          </Button>
        </div>
        <CardDescription>{description}</CardDescription>

        {showProgress && (
          <div className="space-y-1 pt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>확인 진행률</span>
              <span>
                {checkedItems.size} / {assumptions.length}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardHeader>

      <CardContent className={cn(compact ? 'p-4 pt-0' : 'pt-0')}>
        <div className="space-y-2">
          {assumptions.map((assumption) => {
            const isChecked = checkedItems.has(assumption.id)
            const isExpanded = expandedItems.has(assumption.id)
            const hasDetails = assumption.description || assumption.howToCheck || assumption.ifViolated

            return (
              <div
                key={assumption.id}
                className={cn(
                  'rounded-lg border p-3 transition-colors',
                  isChecked && 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900'
                )}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={assumption.id}
                    checked={isChecked}
                    onCheckedChange={(checked) => handleCheck(assumption.id, checked === true)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label
                        htmlFor={assumption.id}
                        className={cn(
                          'text-sm font-medium cursor-pointer',
                          isChecked && 'line-through text-muted-foreground'
                        )}
                      >
                        {assumption.name}
                      </label>
                      {getImportanceBadge(assumption.importance)}
                    </div>

                    {hasDetails && collapsible && (
                      <Collapsible open={isExpanded}>
                        <CollapsibleTrigger
                          onClick={() => handleToggleExpand(assumption.id)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1"
                        >
                          <Info className="h-3 w-3" />
                          상세 보기
                          <ChevronDown
                            className={cn(
                              'h-3 w-3 transition-transform',
                              isExpanded && 'rotate-180'
                            )}
                          />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 space-y-2">
                          {assumption.description && (
                            <p className="text-xs text-muted-foreground">
                              {assumption.description}
                            </p>
                          )}
                          {assumption.howToCheck && (
                            <div className="flex items-start gap-2 text-xs">
                              <CheckCircle2 className="h-3 w-3 text-blue-500 mt-0.5 shrink-0" />
                              <div>
                                <span className="font-medium">확인 방법:</span>{' '}
                                <span className="text-muted-foreground">{assumption.howToCheck}</span>
                              </div>
                            </div>
                          )}
                          {assumption.ifViolated && (
                            <div className="flex items-start gap-2 text-xs">
                              <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                              <div>
                                <span className="font-medium">위반 시:</span>{' '}
                                <span className="text-muted-foreground">{assumption.ifViolated}</span>
                              </div>
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {hasDetails && !collapsible && (
                      <div className="pt-2 space-y-1">
                        {assumption.description && (
                          <p className="text-xs text-muted-foreground">
                            {assumption.description}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {allChecked && (
          <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">
                모든 가정이 확인되었습니다. 분석을 진행할 수 있습니다.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Helper function to convert string assumptions to AssumptionItem[]
 */
export function createAssumptionItems(
  assumptions: string[],
  options?: {
    importance?: 'critical' | 'important' | 'optional'
    descriptionMap?: Record<string, string>
    howToCheckMap?: Record<string, string>
    ifViolatedMap?: Record<string, string>
  }
): AssumptionItem[] {
  return assumptions.map((name, index) => ({
    id: `assumption-${index}`,
    name,
    importance: options?.importance || 'important',
    description: options?.descriptionMap?.[name],
    howToCheck: options?.howToCheckMap?.[name],
    ifViolated: options?.ifViolatedMap?.[name]
  }))
}
