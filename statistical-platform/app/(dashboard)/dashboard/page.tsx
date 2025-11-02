"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Star, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import { STATISTICS_MENU } from "@/lib/statistics/menu-config"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
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
      <Link href="/smart-analysis">
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 max-w-md mx-auto hover:shadow-lg transition-all cursor-pointer group">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-primary">분석하기</h2>
          </CardContent>
        </Card>
      </Link>

      {/* 2. 즐겨찾기 섹션 */}
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
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
              <Star className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
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

      {/* 3. 통계 분석 카테고리 */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center">통계 분석 카테고리</h2>

        {/* 카테고리 아이콘 그리드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {STATISTICS_MENU.map((category) => {
            const Icon = category.icon
            const isSelected = selectedCategory === category.id

            return (
              <Card
                key={category.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-lg",
                  isSelected && "ring-2 ring-primary"
                )}
                onClick={() => toggleCategory(category.id)}
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
            )
          })}
        </div>

        {/* 선택된 카테고리의 분석 방법들 */}
        {selectedCategory && (
          <div className="max-w-4xl mx-auto">
            <Card className="border-primary/50">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {STATISTICS_MENU.find(cat => cat.id === selectedCategory)?.title} 분석 방법
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {STATISTICS_MENU.find(cat => cat.id === selectedCategory)?.items.map((item) => {
                      const isFavorite = favorites.includes(item.id)

                      return (
                        <Card key={item.id} className="hover:shadow-md transition-all">
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
                                      toggleFavorite(item.id)
                                    }}
                                    aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                                  >
                                    <Star
                                      className={cn(
                                        'h-4 w-4',
                                        isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
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
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* 하단 안내 */}
      <div className="text-center text-sm text-muted-foreground pt-8">
        <p>모든 통계 분석은 Python SciPy 라이브러리를 기반으로 정확하게 계산됩니다</p>
      </div>
    </div>
  )
}
