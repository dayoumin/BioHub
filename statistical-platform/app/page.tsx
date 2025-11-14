"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import { STATISTICS_MENU } from "@/lib/statistics/menu-config"
import { cn } from "@/lib/utils"

export default function HomePage() {
  // 즐겨찾기 상태 관리
  const [favorites, setFavorites] = useState<string[]>([])
  // 선택된 카테고리 (토글용)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('statPlatform_favorites')
    if (saved) {
      try {
        setFavorites(JSON.parse(saved))
      } catch (error) {
        console.error('Failed to load favorites:', error)
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

  // 카테고리 토글
  const toggleCategory = useCallback((categoryId: string) => {
    setSelectedCategory((prev) => (prev === categoryId ? null : categoryId))
  }, [])

  // 모든 메뉴 아이템 평탄화
  const allItems = STATISTICS_MENU.flatMap((category) => category.items)
  const favoriteItems = allItems.filter((item) => favorites.includes(item.id))

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-8">
      {/* 1. 스마트 분석 버튼 */}
      <Link href="/smart-analysis" className="block max-w-md mx-auto">
        <Button
          size="lg"
          className="w-full h-16 text-lg font-semibold gap-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all"
        >
          <Star className="h-6 w-6" />
          스마트 분석 시작하기
        </Button>
      </Link>

      {/* 2. 통계 분석 카테고리 */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center">통계 분석 카테고리</h2>

        {/* 카테고리 버튼 그리드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-4xl mx-auto">
          {STATISTICS_MENU.map((category) => {
            const Icon = category.icon
            const isSelected = selectedCategory === category.id

            return (
              <Button
                key={category.id}
                variant={isSelected ? "default" : "outline"}
                className={cn(
                  "h-auto py-2 px-3 flex items-center justify-center gap-1.5 transition-all",
                  !isSelected && "hover:bg-accent"
                )}
                onClick={() => toggleCategory(category.id)}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <div className="text-xs font-semibold">{category.title}</div>
              </Button>
            )
          })}
        </div>
      </div>

      {/* 3. 선택된 카테고리의 분석 방법들 (내 통계 도구 상단에 표시) */}
      {selectedCategory && (
        <div className="max-w-4xl mx-auto">
          <Card className="border-primary/50 shadow-lg">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {STATISTICS_MENU.find(cat => cat.id === selectedCategory)?.title} 분석 방법
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                  >
                    닫기
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {STATISTICS_MENU.find(cat => cat.id === selectedCategory)?.items.map((item) => {
                    const isFavorite = favorites.includes(item.id)
                    return (
                      <div key={item.id} className="border rounded-lg p-3 hover:shadow-md hover:border-primary/50 transition-all">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex-1">
                              <h4 className="font-semibold text-xs leading-tight">{item.title}</h4>
                              {item.subtitle && (
                                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{item.subtitle}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleFavorite(item.id)
                              }}
                              aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                            >
                              <Star className={cn(
                                'h-3 w-3',
                                isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                              )} />
                            </Button>
                          </div>
                          {item.implemented ? (
                            <Link href={item.href}>
                              <Button size="sm" variant="outline" className="w-full h-7 text-xs">
                                분석 시작
                              </Button>
                            </Link>
                          ) : (
                            <Button size="sm" variant="outline" className="w-full h-7 text-xs" disabled>
                              준비 중
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. 내 통계 도구 */}
      <div className="space-y-4 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
          내 통계 도구
        </h2>

        <Card className={cn(
          "transition-all",
          favorites.length === 0 ? "text-center bg-muted/30" : ""
        )}>
          <CardContent className={cn(
            "flex items-center justify-center",
            favorites.length === 0 ? "min-h-[280px]" : "min-h-[280px] p-4"
          )}>
            {favorites.length === 0 ? (
              <div className="text-center">
                <Star className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">즐겨찾기한 통계가 없습니다</h3>
                <p className="text-sm text-muted-foreground">
                  카테고리에서 분석 방법을 선택하고 별표를 클릭하세요
                </p>
              </div>
            ) : (
              <div className={cn(
                "grid grid-cols-2 md:grid-cols-4 gap-3 w-full",
                favorites.length > 8 && "max-h-[560px] overflow-y-auto pr-2"
              )}>
                {favoriteItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-3 hover:shadow-md hover:border-primary/50 transition-all">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1">
                          <h4 className="font-semibold text-xs leading-tight">{item.title}</h4>
                          {item.subtitle && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{item.subtitle}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(item.id)
                          }}
                          aria-label="즐겨찾기 해제"
                        >
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        </Button>
                      </div>
                      {item.implemented ? (
                        <Link href={item.href}>
                          <Button size="sm" variant="outline" className="w-full h-7 text-xs">
                            분석 시작
                          </Button>
                        </Link>
                      ) : (
                        <Button size="sm" variant="outline" className="w-full h-7 text-xs" disabled>
                          준비 중
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 하단 안내 */}
      <div className="text-center text-sm text-muted-foreground pt-8">
        <p>모든 통계 분석은 검증된 Python 과학 라이브러리(SciPy, statsmodels 등)를 기반으로 정확하게 계산됩니다</p>
      </div>
    </div>
  )
}
