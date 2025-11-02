"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Star, BarChart2 } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { STATISTICS_MENU } from "@/lib/statistics/menu-config"

export default function DashboardPage() {
  // 즐겨찾기 상태 관리
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('statisticsFavorites')
    if (saved) {
      try {
        setFavorites(JSON.parse(saved))
      } catch (error) {
        console.error('Failed to load favorites:', error)
      }
    }
  }, [])

  // 모든 메뉴 아이템 평탄화
  const allItems = STATISTICS_MENU.flatMap((category) => category.items)
  const favoriteItems = allItems.filter((item) => favorites.includes(item.id))

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold">통계 분석 플랫폼</h1>
        <p className="text-lg text-muted-foreground">
          전문가급 통계 분석 도구 - SPSS와 R Studio의 강력함을 웹에서
        </p>
      </div>

      {/* 스마트 분석 */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">스마트 분석</h2>
              <p className="text-muted-foreground">
                AI가 데이터를 분석하고 최적의 통계 방법을 추천해드립니다
              </p>
            </div>
            <Button size="lg" className="text-lg px-8" disabled>
              <Sparkles className="mr-2 h-5 w-5" />
              스마트 분석 시작 (준비 중)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 즐겨찾기 통계 도구 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
              내 통계 도구
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              자주 사용하는 분석을 빠르게 시작하세요
            </p>
          </div>
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
              <p className="text-sm text-muted-foreground mb-6">
                통계분석 페이지에서 별표(⭐)를 눌러 자주 사용하는 분석을 즐겨찾기에 추가하세요
              </p>
              <Link href="/statistics">
                <Button size="lg">
                  <BarChart2 className="mr-2 h-5 w-5" />
                  통계분석 보기
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

      {/* 빠른 시작 가이드 */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 text-center">빠른 시작</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-xl font-bold text-primary">1</span>
              </div>
              <p className="font-medium">통계분석 페이지 이동</p>
              <p className="text-muted-foreground text-xs">45개 통계 분석 방법 제공</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-xl font-bold text-primary">2</span>
              </div>
              <p className="font-medium">데이터 업로드</p>
              <p className="text-muted-foreground text-xs">CSV, Excel 파일 지원</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-xl font-bold text-primary">3</span>
              </div>
              <p className="font-medium">분석 실행 및 결과 확인</p>
              <p className="text-muted-foreground text-xs">SciPy 기반 정확한 계산</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
