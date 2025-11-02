'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { STATISTICS_MENU } from '@/lib/statistics/menu-config'
import { cn } from '@/lib/utils'

// 카테고리별 용도 매핑
const CATEGORY_PURPOSE: Record<string, string> = {
  'descriptive': '데이터 요약 및 기본 특성 파악',
  'hypothesis': '평균 차이 검정 및 가설 검증',
  'anova': '다집단 간 평균 비교 분석',
  'regression': '변수 간 관계 분석 및 예측',
  'nonparametric': '정규분포 가정 없이 분석',
  'advanced': '복잡한 다변량 및 고급 분석'
}

// 메뉴 아이템 타입
interface MenuItem {
  id: string
  title: string
  subtitle?: string
  badge?: string
  href: string
  implemented: boolean
  comingSoon?: boolean
}

export default function StatisticsPage() {
  const [favorites, setFavorites] = useState<string[]>([])

  // localStorage에서 즐겨찾기 로드
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

  // 즐겨찾기 토글
  const toggleFavorite = useCallback((itemId: string) => {
    setFavorites((prev) => {
      const newFavorites = prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]

      localStorage.setItem('statisticsFavorites', JSON.stringify(newFavorites))
      return newFavorites
    })
  }, [])

  // 통계 카드 컴포넌트
  const StatCard = useCallback(({ item }: { item: MenuItem }) => {
    const isFavorite = favorites.includes(item.id)

    return (
      <Card className={cn('hover:shadow-lg transition-all', !item.implemented && 'opacity-60')}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight">{item.title}</CardTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.badge && (
                <Badge variant="secondary" className="text-xs">
                  {item.badge}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => toggleFavorite(item.id)}
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
          {item.subtitle && (
            <CardDescription className="text-xs leading-relaxed">
              {item.subtitle}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {item.implemented ? (
            <Link href={item.href}>
              <Button className="w-full" size="sm">
                분석 시작
              </Button>
            </Link>
          ) : (
            <Button className="w-full" size="sm" disabled>
              {item.comingSoon ? '준비 중' : '미구현'}
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }, [favorites, toggleFavorite])

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold mb-2">통계 분석</h1>
        <p className="text-muted-foreground">
          <Star className="inline h-4 w-4 mr-1" />
          별표를 클릭하면 홈 화면에 즐겨찾기로 추가됩니다
        </p>
      </div>

      {/* 6개 카테고리별 섹션 */}
      {STATISTICS_MENU.map((category) => (
        <div key={category.id} className="space-y-4">
          {/* 카테고리 헤더 */}
          <Card className="bg-muted/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <category.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl">{category.title}</CardTitle>
                  <CardDescription className="text-base mt-1">
                    {category.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">용도</Badge>
                <span className="text-muted-foreground">
                  {CATEGORY_PURPOSE[category.id]}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 메서드 카드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {category.items.map((item) => (
              <StatCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}

      {/* 하단 안내 */}
      <div className="text-center text-sm text-muted-foreground pt-8">
        <p>모든 통계 분석은 Python SciPy 라이브러리를 기반으로 정확하게 계산됩니다</p>
      </div>
    </div>
  )
}
