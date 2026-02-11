'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Search, Check, Sparkles, ChevronDown, ChevronRight, AlertCircle, AlertTriangle, Info } from 'lucide-react'
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
  descriptive: ['summary', 'basic stats', 'descriptives'],
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

/**
 * MethodBrowser - Browse and select statistical methods
 *
 * Features:
 * - Shows ALL methods in the selected purpose category
 * - AI recommended method highlighted at top
 * - Search/filter functionality
 * - Category collapsibles
 * - Requirements check display
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

  // Get compatibility map from store
  const methodCompatibility = useSmartFlowStore(state => state.methodCompatibility)

  // Get compatibility info for a method
  const getCompatibility = useCallback((methodId: string): CompatibilityResult | null => {
    if (!methodCompatibility) return null
    return getCompatibilityForMethod(methodCompatibility, methodId) ?? null
  }, [methodCompatibility])

  // Expand all categories by default on mount or when methodGroups changes
  useEffect(() => {
    const allCategories = new Set(methodGroups.map(g => g.category))
    setExpandedCategories(allCategories)
  }, [methodGroups])

  // Filter methods by search query
  const filteredGroups = useMemo(() => {
    const tokens = expandQueryTokens(searchQuery)
    if (!searchQuery.trim() || tokens.length === 0) return methodGroups

    const matchesQuery = (method: StatisticalMethod) => {
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

    return methodGroups
      .map(group => ({
        ...group,
        methods: group.methods.filter(matchesQuery)
      }))
      .filter(group => group.methods.length > 0)
  }, [methodGroups, searchQuery])

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
  // Now uses compatibility layer from store
  const checkRequirements = useCallback((method: StatisticalMethod): {
    canUse: boolean
    warnings: string[]
    status: CompatibilityStatus
  } => {
    // Try to get from compatibility map first (more accurate)
    const compat = getCompatibility(method.id)
    if (compat) {
      return {
        canUse: compat.status !== 'incompatible',
        warnings: compat.reasons,
        status: compat.status
      }
    }

    // Fallback to basic dataProfile check if compatibility not available
    if (!dataProfile || !method.requirements) {
      return { canUse: true, warnings: [], status: 'compatible' }
    }

    const warnings: string[] = []
    let canUse = true

    if (method.requirements.minSampleSize && dataProfile.totalRows < method.requirements.minSampleSize) {
      warnings.push(`n >= ${method.requirements.minSampleSize}`)
      canUse = false
    }

    if (method.requirements.variableTypes?.includes('numeric') && dataProfile.numericVars === 0) {
      warnings.push('numeric var needed')
      canUse = false
    }

    if (method.requirements.variableTypes?.includes('categorical') && dataProfile.categoricalVars === 0) {
      warnings.push('categorical var needed')
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
          {totalMethods} {t.methodBrowser.methodsLabel}
          {searchQuery && ` matching "${searchQuery}"`}
        </span>
        {selectedMethod && (
          <span className="text-primary font-medium">
            {t.methodBrowser.selectedPrefix}{selectedMethod.name}
          </span>
        )}
      </div>

      {/* Method List */}
      <ScrollArea className="h-[400px]">
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

                      // Determine status icon and colors
                      const statusConfig = {
                        compatible: {
                          icon: null,
                          badge: null,
                          borderClass: ''
                        },
                        warning: {
                          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
                          badge: <Badge variant="outline" className="text-xs border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950/30">{t.methodBrowser.compatibilityStatus.warning}</Badge>,
                          borderClass: 'border-amber-200 dark:border-amber-800'
                        },
                        incompatible: {
                          icon: <AlertCircle className="w-3.5 h-3.5 text-destructive" />,
                          badge: <Badge variant="destructive" className="text-xs">{t.methodBrowser.compatibilityStatus.incompatible}</Badge>,
                          borderClass: 'border-destructive/30'
                        }
                      }

                      const config = statusConfig[requirements.status]
                      const hasWarnings = requirements.warnings.length > 0

                      const methodButton = (
                        <button
                          key={method.id}
                          onClick={() => requirements.canUse && onMethodSelect(method)}
                          disabled={!requirements.canUse}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border transition-all",
                            requirements.canUse && "hover:border-primary/50 hover:bg-accent/30",
                            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                            isSelected && "border-primary bg-primary/5 ring-2 ring-primary/20",
                            isRecommended && !isSelected && requirements.canUse && "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20",
                            !requirements.canUse && "opacity-40 cursor-not-allowed bg-muted/30",
                            config.borderClass
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {config.icon}
                                <span className={cn(
                                  "font-medium text-sm",
                                  isSelected && "text-primary",
                                  !requirements.canUse && "text-muted-foreground"
                                )}>
                                  {method.name}
                                </span>
                                {isRecommended && requirements.canUse && (
                                  <Badge className="text-xs bg-amber-500 hover:bg-amber-600">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    AI
                                  </Badge>
                                )}
                                {config.badge}
                                {method.subcategory && (
                                  <Badge variant="secondary" className="text-xs">
                                    {method.subcategory}
                                  </Badge>
                                )}
                              </div>
                              <p className={cn(
                                "text-xs mt-1 line-clamp-2",
                                requirements.canUse ? "text-muted-foreground" : "text-muted-foreground/60"
                              )}>
                                {method.description}
                              </p>
                              {/* Show first warning inline for quick info */}
                              {hasWarnings && requirements.warnings.length <= 2 && (
                                <div className={cn(
                                  "flex items-center gap-1 mt-1.5 text-xs",
                                  requirements.status === 'incompatible' ? "text-destructive" : "text-amber-600"
                                )}>
                                  <Info className="w-3 h-3 shrink-0" />
                                  <span className="line-clamp-1">{requirements.warnings[0]}</span>
                                </div>
                              )}
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
                            <TooltipContent side="right" className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-medium text-sm">
                                  {requirements.status === 'incompatible' ? t.methodBrowser.tooltips.incompatible : t.methodBrowser.tooltips.warning}
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
    </div>
  )
}
