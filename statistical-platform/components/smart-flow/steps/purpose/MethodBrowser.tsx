'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Search, Check, Sparkles, ChevronDown, ChevronRight, AlertCircle, AlertTriangle, Info, BookOpen, BarChart3, Database } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { StatisticalMethod } from '@/types/smart-flow'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { useTerminology } from '@/hooks/use-terminology'
import type { CompatibilityResult, CompatibilityStatus } from '@/lib/statistics/data-method-compatibility'
import { getCompatibilityForMethod } from '@/lib/statistics/data-method-compatibility'

interface MethodGroup {
  category: string
  categoryLabel: string
  methods: StatisticalMethod[]
}

interface MethodBrowserProps {
  methodGroups: MethodGroup[]
  selectedMethod: StatisticalMethod | null
  recommendedMethodId?: string  // AI recommended method
  onMethodSelect: (method: StatisticalMethod) => void
  dataProfile?: {
    totalRows: number
    numericVars: number
    categoricalVars: number
  }
}

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\uac00-\ud7a3]/g, '')

const SEARCH_SYNONYMS: Record<string, string[]> = {
  ttest: ['t-test', 'ttest', 't test'],
  anova: ['analysis of variance', 'anova', 'anova test'],
  regression: ['prediction', 'predict'],
  correlation: ['association', 'relationship'],
  chisquare: ['chi-square', 'chi square', 'contingency'],
  nonparametric: ['nonparametric', 'non parametric', 'rank'],
  distribution: ['distribution', 'normality'],
  timeseries: ['time series', 'trend', 'seasonality'],
  survival: ['survival', 'cox'],
  clustering: ['cluster', 'clustering'],
  pca: ['principal component', 'factor', 'dimension reduction']
}

const expandQueryTokens = (query: string): string[] => {
  const base = normalizeText(query)
  if (!base) return []

  const tokens = new Set<string>([base])

  Object.entries(SEARCH_SYNONYMS).forEach(([rawKey, rawValues]) => {
    const key = normalizeText(rawKey)
    const values = rawValues.map(normalizeText)
    const hasKey = base.includes(key)
    const hasValue = values.some(v => v && base.includes(v))

    if (hasKey || hasValue) {
      if (key) tokens.add(key)
      values.forEach(v => v && tokens.add(v))
    }
  })

  return Array.from(tokens).filter(Boolean)
}

const CATEGORY_LABELS: Record<string, string> = {
  't-test': 'T-검정',
  'anova': '분산분석 (ANOVA)',
  'nonparametric': '비모수 검정',
  'correlation': '상관분석',
  'chi-square': '카이제곱 / 빈도분석',
  'regression': '회귀분석',
  'advanced': '고급 분석',
  'timeseries': '시계열 분석',
  'pca': '차원축소',
  'clustering': '군집분석',
  'psychometrics': '심리측정',
  'design': '실험설계',
  'survival': '생존분석',
}

/**
 * MethodBrowser - Browse and select statistical methods
 *
 * Features:
 * - Two-column layout: method list (left) + detail panel (right)
 * - Incompatible methods hidden from list
 * - AI recommended method highlighted at top
 * - Search/filter functionality
 * - Category collapsibles
 * - Hover/select detail preview
 */
export function MethodBrowser({
  methodGroups,
  selectedMethod,
  recommendedMethodId,
  onMethodSelect,
  dataProfile
}: MethodBrowserProps) {
  const t = useTerminology()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [hoveredMethod, setHoveredMethod] = useState<StatisticalMethod | null>(null)

  // Get compatibility map from store
  const methodCompatibility = useSmartFlowStore(state => state.methodCompatibility)

  // Get compatibility info for a method
  const getCompatibility = useCallback((methodId: string): CompatibilityResult | null => {
    if (!methodCompatibility) return null
    return getCompatibilityForMethod(methodCompatibility, methodId) ?? null  // undefined→null 변환 (return type 통일)
  }, [methodCompatibility])

  // Expand all categories by default on mount or when methodGroups changes
  useEffect(() => {
    const allCategories = new Set(methodGroups.map(g => g.category))
    setExpandedCategories(allCategories)
  }, [methodGroups])

  // Filter methods by search query and hide incompatible methods
  const filteredGroups = useMemo(() => {
    const tokens = expandQueryTokens(searchQuery)

    const matchesQuery = (method: StatisticalMethod) => {
      if (!searchQuery.trim() || tokens.length === 0) return true
      const haystack = [
        method.name,
        method.description,
        method.id,
        method.category,
        method.subcategory || ''
      ]
        .map(normalizeText)
        .filter(Boolean)

      return tokens.some(token =>
        haystack.some(field => field.includes(token))
      )
    }

    const isNotIncompatible = (method: StatisticalMethod) => {
      const compat = getCompatibility(method.id)
      return !compat || compat.status !== 'incompatible'
    }

    return methodGroups
      .map(group => ({
        ...group,
        methods: group.methods.filter(m => matchesQuery(m) && isNotIncompatible(m))
      }))
      .filter(group => group.methods.length > 0)
  }, [methodGroups, searchQuery, getCompatibility])

  // Get recommended method object
  const recommendedMethod = useMemo(() => {
    if (!recommendedMethodId) return null
    for (const group of methodGroups) {
      const found = group.methods.find(m => m.id === recommendedMethodId)
      if (found) return found
    }
    return null
  }, [methodGroups, recommendedMethodId])

  // Toggle category expansion
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  // Expand all categories
  const expandAll = useCallback(() => {
    setExpandedCategories(new Set(methodGroups.map(g => g.category)))
  }, [methodGroups])

  // Collapse all categories
  const collapseAll = useCallback(() => {
    setExpandedCategories(new Set())
  }, [])

  // Check if method can be used with current data
  const checkRequirements = useCallback((method: StatisticalMethod): {
    canUse: boolean
    warnings: string[]
    status: CompatibilityStatus
  } => {
    const compat = getCompatibility(method.id)
    if (compat) {
      return {
        canUse: compat.status !== 'incompatible',
        warnings: compat.reasons,
        status: compat.status
      }
    }

    if (!dataProfile || !method.requirements) {
      return { canUse: true, warnings: [], status: 'compatible' }
    }

    const warnings: string[] = []
    let canUse = true

    if (method.requirements.minSampleSize && dataProfile.totalRows < method.requirements.minSampleSize) {
      warnings.push(`최소 표본 크기: n ≥ ${method.requirements.minSampleSize}`)
      canUse = false
    }

    if (method.requirements.variableTypes?.includes('numeric') && dataProfile.numericVars === 0) {
      warnings.push('연속형 변수 필요')
      canUse = false
    }

    if (method.requirements.variableTypes?.includes('categorical') && dataProfile.categoricalVars === 0) {
      warnings.push('범주형 변수 필요')
      canUse = false
    }

    return {
      canUse,
      warnings,
      status: canUse ? 'compatible' : 'incompatible'
    }
  }, [dataProfile, getCompatibility])

  // Total method count
  const totalMethods = useMemo(() =>
    filteredGroups.reduce((sum, g) => sum + g.methods.length, 0),
    [filteredGroups]
  )

  // The method to show in detail panel (hovered > selected)
  const detailMethod = hoveredMethod || selectedMethod

  return (
    <div className="space-y-4">
      {/* Header: AI Recommendation (if exists) */}
      {recommendedMethod && (() => {
        const { canUse, warnings } = checkRequirements(recommendedMethod)
        return (
          <div className={cn(
            "p-4 border rounded-lg",
            canUse
              ? "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800"
              : "bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/30 dark:to-gray-800/30 border-gray-300 dark:border-gray-700"
          )}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className={cn("w-5 h-5", canUse ? "text-amber-500" : "text-gray-400")} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{t.methodBrowser.aiRecommendation.label}</span>
                    <Badge variant="secondary" className="text-xs">{t.methodBrowser.aiRecommendation.badge}</Badge>
                    {!canUse && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {t.methodBrowser.requirementsNotMet}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {recommendedMethod.name}
                  </p>
                  {warnings.length > 0 && (
                    <p className="text-xs text-destructive mt-1">
                      {warnings.join(', ')}
                    </p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant={selectedMethod?.id === recommendedMethod.id ? 'default' : 'outline'}
                onClick={() => onMethodSelect(recommendedMethod)}
                disabled={!canUse}
                className="shrink-0"
              >
                {selectedMethod?.id === recommendedMethod.id ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    {t.methodBrowser.selectedLabel}
                  </>
                ) : (
                  t.methodBrowser.useThisButton
                )}
              </Button>
            </div>
          </div>
        )
      })()}

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t.methodBrowser.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="method-search-input"
          />
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={expandAll}>
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Method Count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {totalMethods}개 분석 방법
          {searchQuery && ` "${searchQuery}" 검색 결과`}
        </span>
        {selectedMethod && (
          <span className="text-primary font-medium">
            {t.methodBrowser.selectedPrefix}{selectedMethod.name}
          </span>
        )}
      </div>

      {/* Two-Column Layout: Method List + Detail Panel */}
      <div className="flex gap-5">
        {/* Left: Method List */}
        <ScrollArea className="h-[460px] flex-1 min-w-0">
          <div className="space-y-3 pr-4">
            {filteredGroups.map(group => (
              <Collapsible
                key={group.category}
                open={expandedCategories.has(group.category)}
                onOpenChange={() => toggleCategory(group.category)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    {expandedCategories.has(group.category) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <span className="font-medium">{group.categoryLabel}</span>
                    <Badge variant="outline" className="text-xs">
                      {group.methods.length}
                    </Badge>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="pl-6 pt-2 space-y-1">
                    <TooltipProvider delayDuration={300}>
                      {group.methods.map(method => {
                        const isRecommended = method.id === recommendedMethodId
                        const isSelected = selectedMethod?.id === method.id
                        const requirements = checkRequirements(method)
                        const hasWarnings = requirements.warnings.length > 0

                        const methodButton = (
                          <button
                            key={method.id}
                            onClick={() => onMethodSelect(method)}
                            onMouseEnter={() => setHoveredMethod(method)}
                            onMouseLeave={() => setHoveredMethod(null)}
                            className={cn(
                              "w-full text-left p-3 rounded-lg border transition-all",
                              "hover:border-primary/50 hover:bg-accent/30",
                              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                              isSelected && "border-primary bg-primary/5 ring-2 ring-primary/20",
                              isRecommended && !isSelected && "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20",
                              hasWarnings && "border-amber-200 dark:border-amber-800"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {hasWarnings && (
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                  )}
                                  <span className={cn(
                                    "font-medium text-sm",
                                    isSelected && "text-primary"
                                  )}>
                                    {method.name}
                                  </span>
                                  {isRecommended && (
                                    <Badge className="text-xs bg-amber-500 hover:bg-amber-600">
                                      <Sparkles className="w-3 h-3 mr-1" />
                                      AI
                                    </Badge>
                                  )}
                                  {hasWarnings && (
                                    <Badge variant="outline" className="text-xs border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950/30">
                                      {t.methodBrowser.compatibilityStatus.warning}
                                    </Badge>
                                  )}
                                  {method.subcategory && (
                                    <Badge variant="secondary" className="text-xs">
                                      {method.subcategory}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs mt-1 line-clamp-1 text-muted-foreground">
                                  {method.description}
                                </p>
                              </div>
                              {isSelected && (
                                <Check className="w-5 h-5 text-primary shrink-0" />
                              )}
                            </div>
                          </button>
                        )

                        // Wrap with tooltip if there are warnings
                        if (hasWarnings) {
                          return (
                            <Tooltip key={method.id}>
                              <TooltipTrigger asChild>
                                {methodButton}
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-medium text-sm">
                                    {t.methodBrowser.tooltips.warning}
                                  </p>
                                  <ul className="text-xs space-y-0.5">
                                    {requirements.warnings.map((w, i) => (
                                      <li key={i} className="flex items-start gap-1">
                                        <span className="text-muted-foreground">•</span>
                                        <span>{w}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )
                        }

                        return methodButton
                      })}
                    </TooltipProvider>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}

            {filteredGroups.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{t.methodBrowser.noResultsMessage(searchQuery)}</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-primary hover:underline text-sm mt-2"
                >
                  {t.methodBrowser.clearSearchButton}
                </button>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Right: Detail Panel */}
        <div className="w-[320px] shrink-0 hidden lg:block">
          <div className="sticky top-0">
            {detailMethod ? (
              <MethodDetailPanel
                method={detailMethod}
                isSelected={selectedMethod?.id === detailMethod.id}
                isRecommended={detailMethod.id === recommendedMethodId}
                requirements={checkRequirements(detailMethod)}
                categoryLabel={CATEGORY_LABELS[detailMethod.category] || detailMethod.category}
                dataProfile={dataProfile}
                onSelect={() => onMethodSelect(detailMethod)}
              />
            ) : (
              <div className="h-[460px] border border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground/60 gap-3 p-6">
                <BookOpen className="w-10 h-10" />
                <p className="text-sm text-center leading-relaxed">
                  분석 방법 위에 마우스를 올리면<br />상세 정보를 확인할 수 있습니다
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Method Detail Panel - Shows on hover/select */
function MethodDetailPanel({
  method,
  isSelected,
  isRecommended,
  requirements,
  categoryLabel,
  dataProfile,
  onSelect
}: {
  method: StatisticalMethod
  isSelected: boolean
  isRecommended: boolean
  requirements: { canUse: boolean; warnings: string[]; status: CompatibilityStatus }
  categoryLabel: string
  dataProfile?: { totalRows: number; numericVars: number; categoricalVars: number }
  onSelect: () => void
}) {
  return (
    <div className={cn(
      "border rounded-xl overflow-hidden transition-all",
      isSelected && "border-primary/40 shadow-sm shadow-primary/10",
      isRecommended && !isSelected && "border-amber-300/60"
    )}>
      {/* Header */}
      <div className={cn(
        "px-5 py-4 border-b",
        isSelected
          ? "bg-primary/5"
          : isRecommended
            ? "bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-amber-950/20 dark:to-orange-950/20"
            : "bg-muted/30"
      )}>
        <div className="flex items-center gap-2 mb-1.5">
          {isRecommended && (
            <Sparkles className="w-4 h-4 text-amber-500" />
          )}
          <Badge variant="outline" className="text-[10px]">
            {categoryLabel}
          </Badge>
          {requirements.status === 'warning' && (
            <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950/30">
              <AlertTriangle className="w-3 h-3 mr-0.5" />
              주의
            </Badge>
          )}
        </div>
        <h4 className="font-semibold text-base tracking-tight">{method.name}</h4>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {method.description}
        </p>

        {/* Requirements */}
        {method.requirements && (
          <div className="space-y-2.5">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              요구 조건
            </h5>
            <div className="space-y-2">
              {method.requirements.minSampleSize && (
                <div className="flex items-center gap-2 text-sm">
                  <Database className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span>최소 표본: <span className="font-medium">n ≥ {method.requirements.minSampleSize}</span></span>
                </div>
              )}
              {method.requirements.variableTypes && method.requirements.variableTypes.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <BarChart3 className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span>변수 타입: <span className="font-medium">{method.requirements.variableTypes.join(', ')}</span></span>
                </div>
              )}
              {method.requirements.assumptions && method.requirements.assumptions.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <Info className="w-3.5 h-3.5 text-muted-foreground/70 mt-0.5" />
                  <div>
                    <span className="text-muted-foreground">가정:</span>
                    <ul className="mt-1 space-y-0.5">
                      {method.requirements.assumptions.map((a, i) => (
                        <li key={i} className="text-xs text-muted-foreground">• {a}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data Compatibility */}
        {dataProfile && (
          <div className="space-y-2.5">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              현재 데이터
            </h5>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-muted/40">
                <div className="text-lg font-semibold">{dataProfile.totalRows}</div>
                <div className="text-[10px] text-muted-foreground">표본</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/40">
                <div className="text-lg font-semibold">{dataProfile.numericVars}</div>
                <div className="text-[10px] text-muted-foreground">연속형</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/40">
                <div className="text-lg font-semibold">{dataProfile.categoricalVars}</div>
                <div className="text-[10px] text-muted-foreground">범주형</div>
              </div>
            </div>
          </div>
        )}

        {/* Warnings */}
        {requirements.warnings.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">주의 사항</span>
            </div>
            <ul className="space-y-1">
              {requirements.warnings.map((w, i) => (
                <li key={i} className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                  <span className="mt-0.5">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer: Select Button */}
      <div className="px-5 pb-4">
        <Button
          className="w-full gap-2"
          variant={isSelected ? 'default' : 'outline'}
          onClick={onSelect}
        >
          {isSelected ? (
            <>
              <Check className="w-4 h-4" />
              선택됨
            </>
          ) : (
            '이 방법 사용'
          )}
        </Button>
      </div>
    </div>
  )
}