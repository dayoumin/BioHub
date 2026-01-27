"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Star, ChevronDown, ChevronUp, Clock } from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useCallback, Fragment } from "react"
import { STATISTICS_MENU, DATA_TOOLS_MENU, type StatisticsCategory } from "@/lib/statistics/menu-config"
import { cn } from "@/lib/utils"

/**
 * CategoryItemCard - 분석 방법 카드 (펼침 영역 내부)
 */
function CategoryItemCard({
  item,
  isFavorite,
  onToggleFavorite
}: {
  item: StatisticsCategory['items'][number]
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
}) {
  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{item.title}</h4>
              {item.subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{item.subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {item.badge && (
                <Badge variant="secondary" className="text-xs">
                  {item.badge}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleFavorite(item.id)
                }}
                aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              >
                <Star
                  className={cn(
                    'h-4 w-4 transition-colors',
                    isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground hover:text-foreground'
                  )}
                />
              </Button>
            </div>
          </div>
          {item.implemented ? (
            <Link href={item.href}>
              <Button size="sm" className="w-full">
                분석 시작
              </Button>
            </Link>
          ) : (
            <Button size="sm" className="w-full" disabled>
              준비 중
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * CategoryGrid - 카테고리 그리드 + 인라인 펼침
 */
function CategoryGrid({
  categories,
  selectedCategory,
  onToggleCategory,
  favorites,
  onToggleFavorite,
  columns = 4
}: {
  categories: StatisticsCategory[]
  selectedCategory: string | null
  onToggleCategory: (id: string) => void
  favorites: string[]
  onToggleFavorite: (id: string) => void
  columns?: number
}) {
  // 선택된 카테고리가 몇 번째 행에 있는지 계산
  const selectedIndex = categories.findIndex(cat => cat.id === selectedCategory)
  const selectedRow = selectedIndex >= 0 ? Math.floor(selectedIndex / columns) : -1
  // 해당 행의 마지막 아이템 인덱스 (카테고리 수를 초과하지 않음)
  const rowLastIndex = selectedRow >= 0 ? Math.min((selectedRow + 1) * columns - 1, categories.length - 1) : -1

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className={cn("grid gap-4", columns === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2")}>
        {categories.map((category, index) => {
          const Icon = category.icon
          const isSelected = selectedCategory === category.id
          // 선택된 카테고리가 있는 행의 마지막 아이템 뒤에만 펼침 표시
          const showExpandAfter = selectedCategory && index === rowLastIndex

          return (
            <Fragment key={category.id}>
              <Card
                className={cn(
                  "cursor-pointer transition-all hover:shadow-lg",
                  isSelected && "ring-2 ring-primary"
                )}
                onClick={() => onToggleCategory(category.id)}
              >
                <CardContent className="p-6 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center",
                      isSelected ? "bg-primary/20" : "bg-muted"
                    )}>
                      <Icon className={cn(
                        "h-6 w-6",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{category.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{category.description}</p>
                    </div>
                    {isSelected ? (
                      <ChevronUp className="h-4 w-4 text-primary" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 행 끝에서 펼침 영역 표시 */}
              {showExpandAfter && selectedCategory && categories.find(c => c.id === selectedCategory) && (
                <div className="col-span-full animate-in fade-in slide-in-from-top-2 duration-200">
                  <Card className="border-primary/30 bg-muted/30">
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categories.find(c => c.id === selectedCategory)?.items.map((item) => (
                          <CategoryItemCard
                            key={item.id}
                            item={item}
                            isFavorite={favorites.includes(item.id)}
                            onToggleFavorite={onToggleFavorite}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  // 즐겨찾기 상태 관리
  const [favorites, setFavorites] = useState<string[]>([])
  // 최근 사용 상태 관리
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([])
  // 선택된 카테고리 (통계/데이터도구 각각)
  const [selectedStatCategory, setSelectedStatCategory] = useState<string | null>(null)
  const [selectedDataCategory, setSelectedDataCategory] = useState<string | null>(null)

  useEffect(() => {
    // 즐겨찾기 로드
    const savedFavorites = localStorage.getItem('statPlatform_favorites')
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites))
      } catch (error) {
        console.error('Failed to load favorites:', error)
      }
    }

    // 최근 사용 로드
    const savedRecent = localStorage.getItem('statPlatform_recent')
    if (savedRecent) {
      try {
        setRecentlyUsed(JSON.parse(savedRecent))
      } catch (error) {
        console.error('Failed to load recently used:', error)
      }
    }
  }, [])

  // 즐겨찾기 토글
  const toggleFavorite = useCallback((itemId: string) => {
    setFavorites((prev) => {
      const newFavorites = prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]

      localStorage.setItem('statPlatform_favorites', JSON.stringify(newFavorites))
      return newFavorites
    })
  }, [])

  // 통계 카테고리 토글
  const toggleStatCategory = useCallback((categoryId: string) => {
    setSelectedStatCategory((prev) => (prev === categoryId ? null : categoryId))
    setSelectedDataCategory(null) // 다른 섹션은 닫기
  }, [])

  // 데이터 도구 카테고리 토글
  const toggleDataCategory = useCallback((categoryId: string) => {
    setSelectedDataCategory((prev) => (prev === categoryId ? null : categoryId))
    setSelectedStatCategory(null) // 다른 섹션은 닫기
  }, [])

  // 모든 메뉴 아이템 평탄화 (통계 + 데이터 도구)
  const allMenus = [...STATISTICS_MENU, ...DATA_TOOLS_MENU]
  const allItems = allMenus.flatMap((category) => category.items)
  const favoriteItems = allItems.filter((item) => favorites.includes(item.id))
  const recentItems = allItems.filter((item) => recentlyUsed.includes(item.id)).slice(0, 5)

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-8 px-4">
      {/* 1. 스마트 분석 버튼 */}
      <Link href="/smart-flow">
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 max-w-md mx-auto hover:shadow-lg transition-all cursor-pointer group">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-primary">스마트 분석</h2>
            <p className="text-sm text-muted-foreground mt-2">데이터 업로드 → 분석 방법 추천 → 결과 확인</p>
          </CardContent>
        </Card>
      </Link>

      {/* 2. 최근 사용한 분석 섹션 */}
      {recentItems.length > 0 && (
        <div className="space-y-4 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-6 w-6 text-muted-foreground" />
              최근 사용한 분석
            </h2>
            <Badge variant="outline" className="text-base px-3 py-1">
              {recentItems.length}개
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {recentItems.map((item) => (
              <Link key={item.id} href={item.href}>
                <Card className="hover:shadow-md transition-all hover:scale-105 cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <h4 className="font-semibold text-xs leading-tight">{item.title}</h4>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 3. 즐겨찾기 섹션 */}
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500" />
            내 통계 도구
          </h2>
          {favorites.length > 0 && (
            <Badge variant="secondary" className="text-base px-3 py-1">
              {favorites.length}개
            </Badge>
          )}
        </div>

        {favorites.length === 0 ? (
          <Card className="text-center py-12 bg-muted/30">
            <CardContent>
              <h3 className="text-lg font-semibold mb-2">즐겨찾기한 통계가 없습니다</h3>
              <p className="text-sm text-muted-foreground">
                아래 카테고리에서 분석 방법을 선택하고 별표를 클릭하세요
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {favoriteItems.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-all hover:scale-105">
                <CardContent className="p-5">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm leading-tight flex-1">{item.title}</h4>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    {item.implemented ? (
                      <Link href={item.href}>
                        <Button size="sm" className="w-full">
                          시작하기
                        </Button>
                      </Link>
                    ) : (
                      <Button size="sm" className="w-full" disabled>
                        준비 중
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 4. 통계 분석 카테고리 */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center">통계 분석</h2>
        <CategoryGrid
          categories={STATISTICS_MENU}
          selectedCategory={selectedStatCategory}
          onToggleCategory={toggleStatCategory}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          columns={4}
        />
      </div>

      {/* 5. 데이터 도구 카테고리 */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center">데이터 도구</h2>
        <CategoryGrid
          categories={DATA_TOOLS_MENU}
          selectedCategory={selectedDataCategory}
          onToggleCategory={toggleDataCategory}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          columns={4}
        />
      </div>

      {/* 하단 안내 */}
      <div className="text-center text-sm text-muted-foreground pt-8">
        <p>모든 통계 분석은 검증된 Python 과학 라이브러리(SciPy, statsmodels 등)를 기반으로 정확하게 계산됩니다</p>
      </div>
    </div>
  )
}
