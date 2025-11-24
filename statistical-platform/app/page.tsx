"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, Pin } from "lucide-react"
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
    <div className="space-y-8 max-w-5xl mx-auto pt-16 pb-8">
      {/* 1. 스마트 분석 버튼 */}
      <Link href="/smart-flow" className="block max-w-xl mx-auto">
        <Button
          size="lg"
          className="w-full h-28 text-2xl font-bold gap-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 hover:scale-[1.02] shadow-xl hover:shadow-2xl transition-all duration-200"
        >
          <Star className="h-8 w-8" />
          스마트 분석
        </Button>
      </Link>

      {/* 2. 통계 분석 카테고리 */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-center">통계 분석 카테고리</h2>

        {/* 카테고리 버튼 그리드 */}
        <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
          {STATISTICS_MENU.map((category) => {
            const Icon = category.icon
            const isSelected = selectedCategory === category.id

            return (
              <Button
                key={category.id}
                variant={isSelected ? "default" : "outline"}
                className={cn(
                  "h-auto py-2 px-4 flex items-center justify-center gap-1.5 transition-all whitespace-nowrap",
                  !isSelected && "hover:bg-accent"
                )}
                onClick={() => toggleCategory(category.id)}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <div className="text-base font-semibold">{category.title}</div>
              </Button>
            )
          })}
        </div>
      </div>

      {/* 3. 선택된 카테고리의 분석 방법들 (내 통계 도구 상단에 표시) */}
      {selectedCategory && (
        <div className="max-w-4xl mx-auto">
          <Card className="border-primary/50 shadow-sm">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {STATISTICS_MENU.find(cat => cat.id === selectedCategory)?.title}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    className="h-7"
                  >
                    닫기
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {STATISTICS_MENU.find(cat => cat.id === selectedCategory)?.items.map((item) => {
                    const isFavorite = favorites.includes(item.id)
                    return (
                      <div key={item.id} className="group relative border rounded-xl p-3 hover:shadow-lg hover:border-primary/50 transition-all duration-200 bg-card">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-base leading-tight truncate">{item.title}</h4>
                              {item.subtitle && (
                                <p className="text-sm text-muted-foreground mt-0.5 leading-tight line-clamp-2">{item.subtitle}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleFavorite(item.id)
                              }}
                              aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                            >
                              <Pin className={cn(
                                'h-3 w-3',
                                isFavorite ? 'fill-current' : 'text-muted-foreground'
                              )} />
                            </Button>
                          </div>
                          {item.implemented ? (
                            <Link href={item.href}>
                              <Button size="sm" variant="outline" className="w-full h-8 text-sm">
                                분석 시작
                              </Button>
                            </Link>
                          ) : (
                            <Button size="sm" variant="outline" className="w-full h-8 text-sm" disabled>
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
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <Pin className="h-7 w-7" />
          내 통계 도구
        </h2>

        <Card className={cn(
          "transition-all shadow-sm",
          favorites.length === 0 ? "text-center bg-muted/30" : ""
        )}>
          <CardContent className={cn(
            "flex items-center justify-center",
            favorites.length === 0 ? "min-h-[180px]" : "p-4"
          )}>
            {favorites.length === 0 ? (
              <div className="text-center">
                <Pin className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">즐겨찾기한 통계가 없습니다</h3>
                <p className="text-base text-muted-foreground">
                  카테고리에서 분석 방법을 선택하고 핀 아이콘을 클릭하세요
                </p>
              </div>
            ) : (
              <div className={cn(
                "grid grid-cols-2 md:grid-cols-4 gap-4 w-full",
                favorites.length > 8 && "max-h-[480px] overflow-y-auto pr-2"
              )}>
                {favoriteItems.map((item) => (
                  <div key={item.id} className="group relative border rounded-xl p-3 hover:shadow-lg hover:border-primary/50 transition-all duration-200 bg-card">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-base leading-tight truncate">{item.title}</h4>
                          {item.subtitle && (
                            <p className="text-sm text-muted-foreground mt-0.5 leading-tight line-clamp-2">{item.subtitle}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(item.id)
                          }}
                          aria-label="즐겨찾기 해제"
                        >
                          <Pin className="h-3 w-3 fill-current" />
                        </Button>
                      </div>
                      {item.implemented ? (
                        <Link href={item.href}>
                          <Button size="sm" variant="outline" className="w-full h-8 text-sm">
                            분석 시작
                          </Button>
                        </Link>
                      ) : (
                        <Button size="sm" variant="outline" className="w-full h-8 text-sm" disabled>
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
