'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { Home, BarChart2, Bot, Settings, Star, Sparkles } from 'lucide-react'
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

export default function StatisticsMainPage() {
  const [activeTab, setActiveTab] = useState<string>('home')
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

  // 모든 메뉴 아이템을 평탄화
  const allItems: MenuItem[] = STATISTICS_MENU.flatMap((category) => category.items)

  // 즐겨찾기 아이템만 필터링
  const favoriteItems = allItems.filter((item) => favorites.includes(item.id))

  // 통계 카드 컴포넌트 (작은 버전 - 홈용)
  const SmallStatCard = useCallback(({ item }: { item: MenuItem }) => (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h4 className="font-medium text-sm leading-tight">{item.title}</h4>
          {item.badge && (
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {item.badge}
            </Badge>
          )}
        </div>
        {item.implemented ? (
          <Link href={item.href}>
            <Button size="sm" className="w-full">
              시작
            </Button>
          </Link>
        ) : (
          <Button size="sm" className="w-full" disabled>
            준비 중
          </Button>
        )}
      </CardContent>
    </Card>
  ), [])

  // 통계 카드 컴포넌트 (일반 버전 - 통계분석 탭용)
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
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* 메인 탭 (4개) */}
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="home" className="text-base">
              <Home className="h-4 w-4 mr-2" />
              홈
            </TabsTrigger>
            <TabsTrigger value="all-statistics" className="text-base">
              <BarChart2 className="h-4 w-4 mr-2" />
              통계분석
            </TabsTrigger>
            <TabsTrigger value="chatbot" className="text-base">
              <Bot className="h-4 w-4 mr-2" />
              챗봇
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-base">
              <Settings className="h-4 w-4 mr-2" />
              설정
            </TabsTrigger>
          </TabsList>

          {/* 탭 1: 홈 (대시보드) */}
          <TabsContent value="home" className="space-y-6">
            {/* 스마트 분석 - 큰 버튼 */}
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
                  <h3 className="text-xl font-bold">내 통계 도구</h3>
                  <p className="text-sm text-muted-foreground">
                    자주 사용하는 분석을 빠르게 시작하세요
                  </p>
                </div>
                {favorites.length > 0 && (
                  <Badge variant="secondary">{favorites.length}개</Badge>
                )}
              </div>

              {favorites.length === 0 ? (
                <Card className="text-center py-12 bg-muted/30">
                  <CardContent>
                    <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h4 className="font-semibold mb-2">즐겨찾기한 통계가 없습니다</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      통계분석 탭에서 별표(⭐)를 눌러 즐겨찾기를 추가하세요
                    </p>
                    <Button onClick={() => setActiveTab('all-statistics')}>
                      통계분석 보기
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {favoriteItems.map((item) => (
                    <SmallStatCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>

            {/* 빠른 시작 안내 */}
            {favorites.length > 0 && (
              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <p className="text-sm text-center text-muted-foreground">
                    더 많은 통계 분석이 필요하신가요?{' '}
                    <Button
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => setActiveTab('all-statistics')}
                    >
                      모든 통계 보기 →
                    </Button>
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 탭 2: 통계분석 (전체 카탈로그) */}
          <TabsContent value="all-statistics" className="space-y-8">
            {/* 상단 설명 */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  <Star className="inline h-4 w-4 mr-1" />
                  별표를 클릭하면 홈 화면의 "내 통계 도구"에 추가됩니다
                </p>
              </CardContent>
            </Card>

            {/* 카테고리별 섹션 */}
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
          </TabsContent>

          {/* 탭 3: 챗봇 (준비 중) */}
          <TabsContent value="chatbot" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">AI 통계 상담</CardTitle>
                    <CardDescription className="text-base mt-1">
                      AI가 데이터 분석과 통계 방법을 추천해드립니다
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-8 text-center">
                  <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">준비 중입니다</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    AI 챗봇 기능은 곧 추가될 예정입니다.
                    데이터 분석 방법 추천, 통계 상담, 실험 설계 조언 등을 제공할 예정입니다.
                  </p>
                </div>

                {/* 예정된 기능 안내 */}
                <div className="space-y-3">
                  <h4 className="font-semibold">예정된 기능</h4>
                  <div className="grid gap-2">
                    {[
                      { title: '통계 방법 추천', desc: '"두 그룹 비교하고 싶어요" → t-검정 추천' },
                      { title: '데이터 분석 상담', desc: '데이터 특성에 맞는 분석 방법 안내' },
                      { title: '실험 설계 조언', desc: '연구 설계와 표본 크기 계산' },
                      { title: '결과 해석 도움', desc: '통계 결과의 의미 설명' }
                    ].map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        <Badge variant="outline" className="mt-0.5">{idx + 1}</Badge>
                        <div>
                          <div className="font-medium text-sm">{feature.title}</div>
                          <div className="text-xs text-muted-foreground">{feature.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 탭 4: 설정 */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>설정</CardTitle>
                <CardDescription>
                  애플리케이션 설정을 관리하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-8 text-center">
                  <Settings className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">설정 페이지</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    테마, 언어, 알림 등 다양한 설정 기능이 추가될 예정입니다.
                  </p>
                </div>

                {/* 즐겨찾기 관리 링크 */}
                <div className="space-y-2">
                  <h4 className="font-semibold">빠른 작업</h4>
                  <div className="grid gap-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        const allItemIds = allItems.map((item) => item.id)
                        setFavorites(allItemIds)
                        localStorage.setItem('statisticsFavorites', JSON.stringify(allItemIds))
                      }}
                    >
                      모든 통계를 즐겨찾기에 추가
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        setFavorites([])
                        localStorage.setItem('statisticsFavorites', JSON.stringify([]))
                      }}
                    >
                      모든 즐겨찾기 해제
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 하단 안내 */}
        <div className="mt-16 text-center text-sm text-muted-foreground">
          <p>모든 통계 분석은 Python SciPy 라이브러리를 기반으로 정확하게 계산됩니다</p>
        </div>
      </main>
    </div>
  )
}
