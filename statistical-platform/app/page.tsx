"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, Pin, Plus, X } from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useCallback, useRef } from "react"
import { STATISTICS_MENU } from "@/lib/statistics/menu-config"
import { PyodideCoreService } from "@/lib/services/pyodide/core/pyodide-core.service"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function HomePage() {
  // 즐겨찾기 상태 관리
  const [favorites, setFavorites] = useState<string[]>([])
  // 모달 열림 상태
  const [isModalOpen, setIsModalOpen] = useState(false)
  // 선택된 카테고리 (모달 내부용)
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

  // 카테고리 토글 (모달 내부)
  const toggleCategory = useCallback((categoryId: string) => {
    setSelectedCategory((prev) => (prev === categoryId ? null : categoryId))
  }, [])

  // 모달 열기
  const openModal = useCallback(() => {
    setIsModalOpen(true)
    setSelectedCategory(null)
  }, [])

  // Pyodide prefetch (hover 시 1회만 실행)
  const prefetchStartedRef = useRef(false)
  const handlePyodidePrefetch = useCallback(() => {
    if (prefetchStartedRef.current) return
    prefetchStartedRef.current = true
    PyodideCoreService.getInstance().initialize().catch(() => {})
  }, [])

  // 모든 메뉴 아이템 평탄화
  const allItems = STATISTICS_MENU.flatMap((category) => category.items)
  const favoriteItems = allItems.filter((item) => favorites.includes(item.id))

  return (
    <div className="space-y-12 max-w-5xl mx-auto pt-24 pb-16">
      {/* 1. 스마트 분석 (Hero Section) */}
      <section className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            스마트 데이터 분석
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            데이터만 업로드하면 분석 방법 추천부터 결과까지 한번에
          </p>
        </div>

        <Link href="/smart-flow" className="block max-w-md mx-auto">
          <Button
            size="lg"
            className="w-full h-16 text-xl font-bold gap-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 hover:scale-[1.02] shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl"
            onMouseEnter={handlePyodidePrefetch}
          >
            <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
            분석 시작하기
          </Button>
        </Link>
      </section>

      {/* 2. 내 통계 도구 (My Tools) */}
      <section className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <Pin className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">내 통계 도구</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground hover:text-primary"
            onClick={openModal}
          >
            <Plus className="h-4 w-4" />
            추가
          </Button>
        </div>

        <Card className={cn(
          "transition-all shadow-sm border-dashed",
          favorites.length === 0 ? "bg-muted/30" : "bg-card"
        )}>
          <CardContent className={cn(
            "flex flex-col items-center justify-center",
            favorites.length === 0 ? "min-h-[200px] p-6" : "p-6"
          )}>
            {favorites.length === 0 ? (
              <div className="text-center space-y-3">
                <div className="bg-background p-3 rounded-full w-fit mx-auto shadow-sm">
                  <Pin className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    우측 상단 <strong>+ 추가</strong> 버튼을 눌러 자주 쓰는 도구를 추가하세요
                  </p>
                </div>
              </div>
            ) : (
              <div className={cn(
                "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 w-full",
                favorites.length > 18 && "max-h-[400px] overflow-y-auto pr-2"
              )}>
                {favoriteItems.map((item) => (
                  <div
                    key={item.id}
                    className="group relative border rounded-md p-2 hover:shadow-md hover:border-primary/50 transition-all duration-200 bg-background"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-xs leading-tight truncate flex-1">{item.title}</h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity -mr-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(item.id)
                          }}
                          aria-label="즐겨찾기 해제"
                        >
                          <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                      {item.implemented ? (
                        <Link href={item.href} className="block">
                          <Button size="sm" variant="outline" className="w-full h-7 text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            분석하기
                          </Button>
                        </Link>
                      ) : (
                        <Button size="sm" variant="outline" className="w-full h-7 text-xs opacity-50 cursor-not-allowed" disabled>
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

      {/* 하단 안내 */}
      <div className="text-center text-sm text-muted-foreground pt-8">
        <p>모든 통계 분석은 검증된 Python 과학 라이브러리(SciPy, statsmodels 등)를 기반으로 정확하게 계산됩니다</p>
      </div>

      {/* 통계 도구 추가 모달 */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>통계 도구 추가</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {/* 카테고리 버튼들 */}
            <div className="flex flex-wrap gap-2">
              {STATISTICS_MENU.map((category) => {
                const Icon = category.icon
                const isSelected = selectedCategory === category.id

                return (
                  <Button
                    key={category.id}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-auto py-2 px-3 flex items-center gap-2 transition-all",
                      !isSelected && "hover:border-primary/50 hover:bg-accent/50"
                    )}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium text-sm">{category.title}</span>
                  </Button>
                )
              })}
            </div>

            {/* 선택된 카테고리의 분석 방법들 */}
            {selectedCategory && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <Card className="border-primary/20 bg-accent/5">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {STATISTICS_MENU.find(cat => cat.id === selectedCategory)?.items.map((item) => {
                        const isFavorite = favorites.includes(item.id)
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "border bg-background rounded-md p-2 transition-all duration-200 cursor-pointer",
                              isFavorite
                                ? "border-primary bg-primary/5"
                                : "hover:shadow-md hover:border-primary/50"
                            )}
                            onClick={() => toggleFavorite(item.id)}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="font-medium text-xs leading-tight">{item.title}</h4>
                              <Pin className={cn(
                                'h-3 w-3 flex-shrink-0 transition-colors',
                                isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground/30'
                              )} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {!selectedCategory && (
              <div className="text-center py-8 text-muted-foreground">
                <p>카테고리를 선택하여 통계 도구를 추가하세요</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
