'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Search, Check, Sparkles, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { StatisticalMethod } from '@/types/smart-flow'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Expand all categories by default on mount or when methodGroups changes
  useEffect(() => {
    const allCategories = new Set(methodGroups.map(g => g.category))
    setExpandedCategories(allCategories)
  }, [methodGroups])

  // Filter methods by search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return methodGroups

    const q = searchQuery.toLowerCase()
    return methodGroups
      .map(group => ({
        ...group,
        methods: group.methods.filter(m =>
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q)
        )
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
  const checkRequirements = useCallback((method: StatisticalMethod): { canUse: boolean; warnings: string[] } => {
    if (!dataProfile || !method.requirements) {
      return { canUse: true, warnings: [] }
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

    return { canUse, warnings }
  }, [dataProfile])

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
                    <span className="font-semibold">AI Recommended</span>
                    <Badge variant="secondary" className="text-xs">Best Match</Badge>
                    {!canUse && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Requirements not met
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
                    Selected
                  </>
                ) : (
                  'Use This'
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
            placeholder="Search methods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
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
          {totalMethods} methods
          {searchQuery && ` matching "${searchQuery}"`}
        </span>
        {selectedMethod && (
          <span className="text-primary font-medium">
            Selected: {selectedMethod.name}
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
                  {group.methods.map(method => {
                    const isRecommended = method.id === recommendedMethodId
                    const isSelected = selectedMethod?.id === method.id
                    const requirements = checkRequirements(method)

                    return (
                      <button
                        key={method.id}
                        onClick={() => onMethodSelect(method)}
                        disabled={!requirements.canUse}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-all",
                          "hover:border-primary/50 hover:bg-accent/30",
                          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                          isSelected && "border-primary bg-primary/5 ring-2 ring-primary/20",
                          isRecommended && !isSelected && "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20",
                          !requirements.canUse && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
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
                              {method.subcategory && (
                                <Badge variant="secondary" className="text-xs">
                                  {method.subcategory}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {method.description}
                            </p>
                            {requirements.warnings.length > 0 && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                                <AlertCircle className="w-3 h-3" />
                                <span>{requirements.warnings.join(', ')}</span>
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="w-5 h-5 text-primary shrink-0" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}

          {filteredGroups.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No methods found for "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-primary hover:underline text-sm mt-2"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}