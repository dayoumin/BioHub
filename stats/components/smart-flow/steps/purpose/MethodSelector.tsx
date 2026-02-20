'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Search, Check, ChevronDown, CheckCircle2, XCircle, AlertCircle, Sparkles, ArrowUp, ArrowDown, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { FitScoreIndicator, FitScoreBadge } from '@/components/smart-flow/visualization/FitScoreIndicator'
import { useTerminology } from '@/hooks/use-terminology'
import type { StatisticalMethod } from '@/types/smart-flow'

interface DataProfile {
  totalRows: number
  numericVars: number
  categoricalVars: number
  normalityPassed?: boolean
  homogeneityPassed?: boolean
}

interface AssumptionResults {
  normality?: {
    shapiroWilk?: { isNormal?: boolean }
    kolmogorovSmirnov?: { isNormal?: boolean }
  }
  homogeneity?: {
    levene?: { equalVariance?: boolean }
    bartlett?: { equalVariance?: boolean }
  }
}

interface MethodSelectorProps {
  methods: StatisticalMethod[]
  selectedMethod: StatisticalMethod | null
  dataProfile: DataProfile | null
  assumptionResults?: AssumptionResults
  onMethodSelect: (method: StatisticalMethod) => void
  checkMethodRequirements: (method: StatisticalMethod, profile: DataProfile) => { canUse: boolean; warnings: string[] }
  recommendedMethods?: StatisticalMethod[]
}

// 적합도 점수 계산 함수
function calculateFitScore(
  method: StatisticalMethod,
  dataProfile: DataProfile | null,
  assumptionResults?: AssumptionResults
): number {
  if (!dataProfile) return 0

  const methodReq = method.requirements
  let passedCount = 0
  let totalCount = 0

  if (methodReq?.minSampleSize) {
    totalCount++
    if (dataProfile.totalRows >= methodReq.minSampleSize) passedCount++
  }

  if (methodReq?.variableTypes) {
    if (methodReq.variableTypes.includes('numeric')) {
      totalCount++
      if (dataProfile.numericVars > 0) passedCount++
    }
    if (methodReq.variableTypes.includes('categorical')) {
      totalCount++
      if (dataProfile.categoricalVars > 0) passedCount++
    }
  }

  if (methodReq?.assumptions) {
    methodReq.assumptions.forEach((assumption) => {
      if (assumption === '정규성') {
        const normalityPassed =
          assumptionResults?.normality?.shapiroWilk?.isNormal ??
          assumptionResults?.normality?.kolmogorovSmirnov?.isNormal ??
          dataProfile.normalityPassed

        if (normalityPassed !== undefined) {
          totalCount++
          if (normalityPassed) passedCount++
        }
      }

      if (assumption === '등분산성') {
        const homogeneityPassed =
          assumptionResults?.homogeneity?.levene?.equalVariance ??
          assumptionResults?.homogeneity?.bartlett?.equalVariance ??
          dataProfile.homogeneityPassed

        if (homogeneityPassed !== undefined) {
          totalCount++
          if (homogeneityPassed) passedCount++
        }
      }
    })
  }

  return totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 75
}

// 체크리스트 아이템 컴포넌트
function ChecklistItem({
  passed,
  label,
  type = 'check'
}: {
  passed: boolean | undefined
  label: string
  type?: 'check' | 'warning'
}) {
  const Icon = passed === undefined
    ? AlertCircle
    : passed
      ? CheckCircle2
      : type === 'warning' ? AlertCircle : XCircle

  const color = passed === undefined
    ? 'text-muted-foreground'
    : passed
      ? 'text-green-600 dark:text-green-400'
      : type === 'warning'
        ? 'text-amber-500'
        : 'text-red-500'

  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${color}`} />
      <span className="text-xs">{label}</span>
    </div>
  )
}

// 요구사항 체크리스트 (확장 시 표시)
function RequirementsChecklist({
  method,
  dataProfile,
  assumptionResults
}: {
  method: StatisticalMethod
  dataProfile: DataProfile | null
  assumptionResults?: AssumptionResults
}) {
  const t = useTerminology()

  if (!dataProfile) {
    return (
      <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
        <Info className="w-4 h-4 inline mr-1" />
        {t.methodSelector.noDataProfile}
      </div>
    )
  }

  const methodReq = method.requirements

  return (
    <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
      <h5 className="text-xs font-medium text-muted-foreground">{t.methodSelector.fitScoreDetails}</h5>

      <div className="space-y-1.5">
        {methodReq?.minSampleSize && (
          <ChecklistItem
            passed={dataProfile.totalRows >= methodReq.minSampleSize}
            label={t.methodSelector.sampleSizeRequirement(dataProfile.totalRows, methodReq.minSampleSize)}
          />
        )}

        {methodReq?.variableTypes?.includes('numeric') && (
          <ChecklistItem
            passed={dataProfile.numericVars > 0}
            label={t.methodSelector.numericVarsCount(dataProfile.numericVars)}
          />
        )}
        {methodReq?.variableTypes?.includes('categorical') && (
          <ChecklistItem
            passed={dataProfile.categoricalVars > 0}
            label={t.methodSelector.categoricalVarsCount(dataProfile.categoricalVars)}
          />
        )}

        {methodReq?.assumptions?.includes('정규성') && (() => {
          const normalityPassed =
            assumptionResults?.normality?.shapiroWilk?.isNormal ??
            assumptionResults?.normality?.kolmogorovSmirnov?.isNormal ??
            dataProfile.normalityPassed

          return (
            <ChecklistItem
              passed={normalityPassed}
              label={`${t.methodSelector.assumptions.normality}: ${normalityPassed === undefined ? t.methodSelector.assumptions.needsTest : normalityPassed ? t.methodSelector.assumptions.met : t.methodSelector.assumptions.notMet}`}
              type="warning"
            />
          )
        })()}
        {methodReq?.assumptions?.includes('등분산성') && (() => {
          const homogeneityPassed =
            assumptionResults?.homogeneity?.levene?.equalVariance ??
            assumptionResults?.homogeneity?.bartlett?.equalVariance ??
            dataProfile.homogeneityPassed

          return (
            <ChecklistItem
              passed={homogeneityPassed}
              label={`${t.methodSelector.assumptions.homogeneity}: ${homogeneityPassed === undefined ? t.methodSelector.assumptions.needsTest : homogeneityPassed ? t.methodSelector.assumptions.met : t.methodSelector.assumptions.notMet}`}
              type="warning"
            />
          )
        })()}
      </div>
    </div>
  )
}

// 개별 메서드 아이템
function MethodItem({
  method,
  isSelected,
  isFocused,
  isRecommended,
  fitScore,
  dataProfile,
  assumptionResults,
  canUse,
  warnings,
  onSelect,
  onToggleExpand,
  isExpanded
}: {
  method: StatisticalMethod
  isSelected: boolean
  isFocused: boolean
  isRecommended: boolean
  fitScore: number
  dataProfile: DataProfile | null
  assumptionResults?: AssumptionResults
  canUse: boolean
  warnings: string[]
  onSelect: () => void
  onToggleExpand: () => void
  isExpanded: boolean
}) {
  const t = useTerminology()

  return (
    <div
      className={`border-2 rounded-lg transition-all ${
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : isFocused
            ? 'border-primary/50 bg-accent/50'
            : 'border-border hover:border-primary/30'
      } ${!canUse ? 'opacity-60' : ''}`}
    >
      <button
        onClick={onSelect}
        className="w-full text-left p-3 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{method.name}</span>
              {isRecommended && (
                <Badge variant="default" className="text-xs bg-amber-500 hover:bg-amber-600">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {t.methodSelector.recommendedBadge}
                </Badge>
              )}
              {method.subcategory && (
                <Badge variant="secondary" className="text-xs">
                  {method.subcategory}
                </Badge>
              )}
              {!canUse && (
                <Badge variant="destructive" className="text-xs">
                  {t.methodSelector.requirementNotMet}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {method.description}
            </p>

            {/* 적합도 표시 (간단 버전) */}
            {dataProfile && (
              <div className="mt-2">
                <FitScoreIndicator score={fitScore} compact />
              </div>
            )}
          </div>
          {isSelected && (
            <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          )}
        </div>
      </button>

      {/* 경고 메시지 인라인 표시 */}
      {warnings.length > 0 && (
        <div className="px-3 pb-2 space-y-1">
          {warnings.map((warning, idx) => (
            <p key={idx} className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1">
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{warning}</span>
            </p>
          ))}
        </div>
      )}

      {/* 요구사항 체크리스트 (점진적 공개) */}
      {dataProfile && method.requirements && (
        <Collapsible open={isExpanded} onOpenChange={() => onToggleExpand()}>
          <CollapsibleTrigger className="w-full px-3 pb-2 text-xs text-primary hover:underline flex items-center justify-center gap-1 border-t border-border/50 pt-2">
            {isExpanded ? t.methodSelector.showBrief : t.methodSelector.showDetails}
            <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 pb-3">
              <RequirementsChecklist
                method={method}
                dataProfile={dataProfile}
                assumptionResults={assumptionResults}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}

export function MethodSelector({
  methods,
  selectedMethod,
  dataProfile,
  assumptionResults,
  onMethodSelect,
  checkMethodRequirements,
  recommendedMethods = []
}: MethodSelectorProps) {
  const t = useTerminology()
  const [searchQuery, setSearchQuery] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const recommendedIds = useMemo(() =>
    new Set(recommendedMethods.map(m => m.id)),
    [recommendedMethods]
  )

  const filteredMethods = useMemo(() => {
    if (!searchQuery.trim()) return methods

    const query = searchQuery.toLowerCase()
    return methods.filter(method =>
      method.name.toLowerCase().includes(query) ||
      method.description?.toLowerCase().includes(query) ||
      method.subcategory?.toLowerCase().includes(query)
    )
  }, [methods, searchQuery])

  const groupedMethods = useMemo(() => {
    const recommended: StatisticalMethod[] = []
    const others: StatisticalMethod[] = []

    filteredMethods.forEach(method => {
      if (recommendedIds.has(method.id)) {
        recommended.push(method)
      } else {
        others.push(method)
      }
    })

    return { recommended, others }
  }, [filteredMethods, recommendedIds])

  const allDisplayedMethods = useMemo(() =>
    [...groupedMethods.recommended, ...groupedMethods.others],
    [groupedMethods]
  )

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex(prev =>
          Math.min(prev + 1, allDisplayedMethods.length - 1)
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (allDisplayedMethods[focusedIndex]) {
          onMethodSelect(allDisplayedMethods[focusedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setSearchQuery('')
        inputRef.current?.blur()
        break
    }
  }, [allDisplayedMethods, focusedIndex, onMethodSelect])

  useEffect(() => {
    if (listRef.current && focusedIndex >= 0) {
      const focusedElement = listRef.current.querySelector(`[data-index="${focusedIndex}"]`)
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [focusedIndex])

  useEffect(() => {
    setFocusedIndex(0)
  }, [searchQuery])

  const methodIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    let index = 0
    groupedMethods.recommended.forEach(m => {
      map.set(m.id, index++)
    })
    groupedMethods.others.forEach(m => {
      map.set(m.id, index++)
    })
    return map
  }, [groupedMethods])

  return (
    <div className="space-y-3">
      {/* 검색 입력 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={t.methodSelector.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-4"
        />
        {searchQuery && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
              <ArrowUp className="w-3 h-3 inline" />
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
              <ArrowDown className="w-3 h-3 inline" />
            </kbd>
          </div>
        )}
      </div>

      {/* 결과 카운트 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {t.methodSelector.methodCount(filteredMethods.length)}
          {searchQuery && ` (${t.methodSelector.searchPrefix}"${searchQuery}")`}
        </span>
        {selectedMethod && (
          <span className="text-primary font-medium">
            {t.methodSelector.selected}{selectedMethod.name}
          </span>
        )}
      </div>

      {/* 메서드 리스트 */}
      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-3" ref={listRef}>
          {/* 추천 그룹 */}
          {groupedMethods.recommended.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400 sticky top-0 bg-background/95 backdrop-blur py-1 z-10">
                <Sparkles className="w-3.5 h-3.5" />
                {t.methodSelector.aiRecommended(groupedMethods.recommended.length)}
              </div>
              <div className="grid gap-2">
                {groupedMethods.recommended.map((method) => {
                  const index = methodIndexMap.get(method.id) ?? 0
                  const requirements = dataProfile
                    ? checkMethodRequirements(method, dataProfile)
                    : { canUse: true, warnings: [] }
                  const fitScore = calculateFitScore(method, dataProfile, assumptionResults)

                  return (
                    <div key={method.id} data-index={index}>
                      <MethodItem
                        method={method}
                        isSelected={selectedMethod?.id === method.id}
                        isFocused={focusedIndex === index}
                        isRecommended={true}
                        fitScore={fitScore}
                        dataProfile={dataProfile}
                        assumptionResults={assumptionResults}
                        canUse={requirements.canUse}
                        warnings={requirements.warnings}
                        onSelect={() => onMethodSelect(method)}
                        onToggleExpand={() =>
                          setExpandedMethod(expandedMethod === method.id ? null : method.id)
                        }
                        isExpanded={expandedMethod === method.id}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 기타 방법 그룹 */}
          {groupedMethods.others.length > 0 && (
            <div className="space-y-2">
              {groupedMethods.recommended.length > 0 && (
                <div className="text-xs font-medium text-muted-foreground sticky top-0 bg-background/95 backdrop-blur py-1 z-10">
                  {t.methodSelector.otherMethods(groupedMethods.others.length)}
                </div>
              )}
              <div className="grid gap-2">
                {groupedMethods.others.map((method) => {
                  const index = methodIndexMap.get(method.id) ?? 0
                  const requirements = dataProfile
                    ? checkMethodRequirements(method, dataProfile)
                    : { canUse: true, warnings: [] }
                  const fitScore = calculateFitScore(method, dataProfile, assumptionResults)

                  return (
                    <div key={method.id} data-index={index}>
                      <MethodItem
                        method={method}
                        isSelected={selectedMethod?.id === method.id}
                        isFocused={focusedIndex === index}
                        isRecommended={false}
                        fitScore={fitScore}
                        dataProfile={dataProfile}
                        assumptionResults={assumptionResults}
                        canUse={requirements.canUse}
                        warnings={requirements.warnings}
                        onSelect={() => onMethodSelect(method)}
                        onToggleExpand={() =>
                          setExpandedMethod(expandedMethod === method.id ? null : method.id)
                        }
                        isExpanded={expandedMethod === method.id}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 검색 결과 없음 */}
          {filteredMethods.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t.methodSelector.noSearchResults(searchQuery)}</p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-primary hover:underline mt-2"
              >
                {t.methodSelector.clearSearch}
              </button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
