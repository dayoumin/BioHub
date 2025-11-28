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
    <div className="space-y-12 max-w-5xl mx-auto pt-12 pb-16">
      {/* 1. 스마트 분석 (Hero Section) */}
      <section className="grid lg:grid-cols-2 gap-8 items-center py-8 lg:py-12">
        <div className="space-y-6 text-center lg:text-left order-2 lg:order-1">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
              스마트 데이터 분석
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0">
              데이터만 업로드하면 분석 방법 추천부터 결과까지 한번에
            </p>
          </div>

          <Link href="/smart-flow" className="block max-w-xl mx-auto lg:mx-0">
            <Button
              size="lg"
              className="w-full h-20 text-xl font-bold gap-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 hover:scale-[1.02] shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl"
            >
              <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
              분석 시작하기
            </Button>
          </Link>
        </div>

      </section>

      {/* 2. 내 통계 도구 (My Tools) */}
      <section className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 border-b pb-2">
          <Pin className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">내 통계 도구</h2>
        </div>

        <Card className={cn(
          "transition-all shadow-sm border-dashed",
          favorites.length === 0 ? "bg-muted/30" : "bg-card"
        )}>
          <CardContent className={cn(
            "flex items-center justify-center",
            favorites.length === 0 ? "min-h-[200px]" : "p-6"
          )}>
            {favorites.length === 0 ? (
              <div className="text-center space-y-3">
                <div className="bg-background p-3 rounded-full w-fit mx-auto shadow-sm">
                  <Pin className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">자주 쓰는 도구를 추가해보세요</h3>
                  <p className="text-sm text-muted-foreground">
                    아래 <strong>분석 방법 탐색</strong>에서 원하는 도구를 찾아 핀(<Pin className="h-3 w-3 inline" />)을 눌러보세요.
                  </p>
                </div>
              </div>
            ) : (
              <div className={cn(
                "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full",
                favorites.length > 9 && "max-h-[500px] overflow-y-auto pr-2"
              )}>
                {favoriteItems.map((item) => (
                  <div key={item.id} className="group relative border rounded-xl p-4 hover:shadow-md hover:border-primary/50 transition-all duration-200 bg-background">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-base leading-tight truncate">{item.title}</h4>
                          {item.subtitle && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.subtitle}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(item.id)
                          }}
                          aria-label="즐겨찾기 해제"
                        >
                          <Pin className="h-4 w-4 fill-primary text-primary" />
                        </Button>
                      </div>
                      {item.implemented ? (
                        <Link href={item.href} className="block">
                          <Button size="sm" variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            분석 시작
                          </Button>
                        </Link>
                      ) : (
                        <Button size="sm" variant="outline" className="w-full opacity-50 cursor-not-allowed" disabled>
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
      </section>

      {/* 3. 통계 분석 방법 탐색 (Catalog) */}
      <section className="space-y-8 pt-8 border-t">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">통계 분석 방법 탐색</h2>
          <p className="text-muted-foreground">
            카테고리를 선택하여 필요한 분석 도구를 찾고 내 도구함에 추가하세요.
          </p>
        </div>

        {/* 카테고리 버튼 그리드 */}
        <div className="flex flex-wrap justify-center gap-3 max-w-5xl mx-auto">
          {STATISTICS_MENU.map((category) => {
            const Icon = category.icon
            const isSelected = selectedCategory === category.id

            return (
              <Button
                key={category.id}
                variant={isSelected ? "default" : "outline"}
                size="lg"
                className={cn(
                  "h-auto py-3 px-5 flex items-center gap-2 transition-all rounded-full",
                  !isSelected && "hover:border-primary/50 hover:bg-accent/50"
                )}
                onClick={() => toggleCategory(category.id)}
              >
                <Icon className="h-5 w-5" />
                <span className="font-semibold">{category.title}</span>
              </Button>
            )
          })}
        </div>

        {/* 선택된 카테고리의 분석 방법들 */}
        {selectedCategory && (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="border-primary/20 shadow-lg bg-accent/5">
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b pb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
                      {STATISTICS_MENU.find(cat => cat.id === selectedCategory)?.icon && (
                        (() => {
                          const Icon = STATISTICS_MENU.find(cat => cat.id === selectedCategory)!.icon;
                          return <Icon className="h-6 w-6" />
                        })()
                      )}
                      {STATISTICS_MENU.find(cat => cat.id === selectedCategory)?.title}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCategory(null)}
                      className="hover:bg-background/80"
                    >
                      닫기
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {STATISTICS_MENU.find(cat => cat.id === selectedCategory)?.items.map((item) => {
                      const isFavorite = favorites.includes(item.id)
                      return (
                        <div key={item.id} className="group relative border bg-background rounded-xl p-4 hover:shadow-md hover:border-primary/50 transition-all duration-200">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-base leading-tight truncate">{item.title}</h4>
                                {item.subtitle && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 h-8">{item.subtitle}</p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "h-8 w-8 flex-shrink-0 transition-all",
                                  isFavorite ? "opacity-100" : "opacity-40 group-hover:opacity-100"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleFavorite(item.id)
                                }}
                                aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                              >
                                <Pin className={cn(
                                  'h-4 w-4 transition-colors',
                                  isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground hover:text-primary'
                                )} />
                              </Button>
                            </div>
                            {item.implemented ? (
                              <Link href={item.href} className="block">
                                <Button size="sm" variant="secondary" className="w-full h-9 text-sm group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                  분석 시작
                                </Button>
                              </Link>
                            ) : (
                              <Button size="sm" variant="ghost" className="w-full h-9 text-sm bg-muted/50" disabled>
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
      </section>

      {/* 하단 안내 */}
      <div className="text-center text-sm text-muted-foreground pt-12 pb-4">
        <p>모든 통계 분석은 검증된 Python 과학 라이브러리(SciPy, statsmodels 등)를 기반으로 정확하게 계산됩니다</p>
      </div>
    </div>
  )
}
