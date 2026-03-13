'use client'

/**
 * 용도별 카테고리 브라우저
 *
 * /analysis 페이지에서 사용.
 * 9개 용도 카테고리 그리드 → 클릭 시 확장 → 하위 메서드 리스트 → 메서드 클릭 시 분석 시작
 */

import { useState, useCallback, useMemo } from 'react'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { categoryCardBase } from '@/components/common/card-styles'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import type { PurposeCategory } from '@/lib/constants/purpose-categories'

interface CategoryBrowserProps {
  categories: PurposeCategory[]
  onMethodSelect: (methodId: string) => void
  searchable?: boolean
}

export function CategoryBrowser({ categories, onMethodSelect, searchable = true }: CategoryBrowserProps): React.ReactElement {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const handleToggle = useCallback((categoryId: string) => {
    setExpandedId(prev => prev === categoryId ? null : categoryId)
  }, [])

  // 검색 필터링: 카테고리 라벨 또는 메서드명(한글/영문) 매칭
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories
    const q = searchQuery.toLowerCase()
    return categories.filter(cat => {
      if (cat.label.toLowerCase().includes(q)) return true
      if (cat.description.toLowerCase().includes(q)) return true
      return cat.methodIds.some(id => {
        const method = STATISTICAL_METHODS[id]
        if (!method) return false
        return (
          method.name.toLowerCase().includes(q) ||
          (method.koreanName?.toLowerCase().includes(q)) ||
          id.toLowerCase().includes(q)
        )
      })
    })
  }, [categories, searchQuery])

  return (
    <div className="space-y-4">
      {/* 검색 입력 */}
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="분석 방법 검색 (예: 회귀, t-test, 상관)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2.5 rounded-xl text-sm',
              'border border-border bg-card',
              'placeholder:text-muted-foreground/60',
              'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50',
            )}
            data-testid="category-browser-search"
          />
        </div>
      )}

      {/* 카테고리 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredCategories.map(cat => {
          const Icon = cat.icon
          const isExpanded = expandedId === cat.id
          const activeMethodCount = cat.methodIds.filter(id => STATISTICAL_METHODS[id]).length

          return (
            <div key={cat.id} className={cn(
              isExpanded && 'sm:col-span-2 lg:col-span-3',
            )}>
              {/* 카테고리 카드 */}
              <button
                type="button"
                onClick={() => !cat.disabled && handleToggle(cat.id)}
                disabled={cat.disabled}
                className={cn(
                  categoryCardBase,
                  'w-full',
                  cat.disabled && 'opacity-50 cursor-not-allowed hover:border-border hover:shadow-none',
                  isExpanded && 'border-primary/50 bg-primary/5',
                )}
                data-testid={`category-${cat.id}`}
              >
                <div className={cn(
                  'p-2.5 rounded-lg transition-colors',
                  isExpanded ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                  !cat.disabled && 'group-hover:bg-primary/10 group-hover:text-primary',
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{cat.label}</p>
                    {cat.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground/60 font-medium flex-shrink-0">
                        {cat.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{cat.description}</p>
                </div>
                {!cat.disabled && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">{activeMethodCount}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                )}
              </button>

              {/* 확장 영역: 메서드 리스트 */}
              {isExpanded && !cat.disabled && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pl-2">
                  {cat.methodIds.map(methodId => {
                    const method = STATISTICAL_METHODS[methodId]
                    if (!method) return null
                    return (
                      <button
                        key={methodId}
                        type="button"
                        onClick={() => onMethodSelect(methodId)}
                        className={cn(
                          'flex flex-col gap-0.5 p-3 rounded-lg text-left',
                          'border border-border/60 bg-card',
                          'hover:border-primary/40 hover:bg-primary/5',
                          'transition-colors duration-150',
                        )}
                        data-testid={`method-${methodId}`}
                      >
                        <p className="text-sm font-medium text-foreground">
                          {method.koreanName ?? method.name}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {method.koreanDescription ?? method.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 검색 결과 없음 */}
      {filteredCategories.length === 0 && searchQuery.trim() && (
        <p className="text-center text-sm text-muted-foreground py-8">
          &quot;{searchQuery}&quot;에 해당하는 분석 방법이 없습니다
        </p>
      )}
    </div>
  )
}
