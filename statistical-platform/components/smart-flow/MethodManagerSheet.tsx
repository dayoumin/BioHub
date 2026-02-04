'use client'

import { useState } from 'react'
import { Star, ChevronDown, ChevronRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { STATISTICS_MENU, DATA_TOOLS_MENU, type StatisticsCategory } from '@/lib/statistics/menu-config'

interface MethodManagerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  favorites: string[]
  onToggleFavorite: (id: string) => void
  onSelectCategory?: (categoryId: string) => void
  onSelectMethod?: (methodId: string) => void
}

export function MethodManagerSheet({
  open,
  onOpenChange,
  favorites,
  onToggleFavorite,
  onSelectCategory,
  onSelectMethod
}: MethodManagerSheetProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleCategoryClick = (category: StatisticsCategory) => {
    if (onSelectCategory) {
      onSelectCategory(category.id)
      onOpenChange(false)
    }
  }

  const handleMethodClick = (methodId: string, implemented: boolean) => {
    if (implemented && onSelectMethod) {
      onSelectMethod(methodId)
      onOpenChange(false)
    }
  }

  const allMenus = [...STATISTICS_MENU, ...DATA_TOOLS_MENU]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 sm:w-96 overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle>통계 방법 관리</SheetTitle>
        </SheetHeader>

        <div className="py-4 space-y-1">
          {allMenus.map((category) => {
            const isExpanded = expandedCategories.includes(category.id)
            const favoriteCount = category.items.filter(item => favorites.includes(item.id)).length

            return (
              <Collapsible
                key={category.id}
                open={isExpanded}
                onOpenChange={() => toggleCategory(category.id)}
              >
                <div className="flex items-center gap-1">
                  {/* 카테고리 펼치기/접기 */}
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>

                  {/* 카테고리명 (클릭하면 해당 카테고리로 분석 시작) */}
                  <button
                    className="flex-1 text-left py-2 px-2 rounded hover:bg-muted transition-colors"
                    onClick={() => handleCategoryClick(category)}
                  >
                    <span className="font-medium text-sm">{category.title}</span>
                    {favoriteCount > 0 && (
                      <span className="ml-2 text-xs text-yellow-600">
                        ★{favoriteCount}
                      </span>
                    )}
                  </button>

                  {/* 바로 시작 버튼 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-primary"
                    onClick={() => handleCategoryClick(category)}
                    title={`${category.title} 분석 시작`}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>

                <CollapsibleContent className="pl-8 space-y-0.5">
                  {category.items.map((item) => {
                    const isFavorite = favorites.includes(item.id)

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center gap-2 py-1.5 px-2 rounded",
                          item.implemented ? "hover:bg-muted cursor-pointer" : "opacity-50"
                        )}
                      >
                        {/* 즐겨찾기 토글 */}
                        <button
                          className="p-1 hover:bg-muted rounded"
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleFavorite(item.id)
                          }}
                        >
                          <Star
                            className={cn(
                              "h-4 w-4",
                              isFavorite ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
                            )}
                          />
                        </button>

                        {/* 메서드명 (클릭하면 해당 메서드로 분석 시작) */}
                        <button
                          className="flex-1 text-left text-sm"
                          onClick={() => handleMethodClick(item.id, item.implemented)}
                          disabled={!item.implemented}
                        >
                          {item.title}
                          {!item.implemented && (
                            <span className="ml-1 text-xs text-muted-foreground">(준비중)</span>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
