'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Activity,
  Zap,
  BookOpen,
  Target,
  Users
} from 'lucide-react'
import { STATISTICS_SUMMARY, STATISTICS_MENU } from '@/lib/statistics/menu-config'

export default function StatisticsMainPage() {
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">통계 분석</h1>
        <p className="text-muted-foreground text-lg">
          41개의 전문 통계 분석 도구로 데이터를 탐색하세요
        </p>
      </div>

      {/* 주요 기능 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">통계 방법</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{STATISTICS_SUMMARY.totalMethods}개</div>
            <p className="text-xs text-muted-foreground">
              전문가급 통계 분석 도구
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">분석 카테고리</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{STATISTICS_SUMMARY.categories}개</div>
            <p className="text-xs text-muted-foreground">
              체계적으로 분류된 통계 분야
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">분석 플로우</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4단계</div>
            <p className="text-xs text-muted-foreground">
              변수선택부터 결과해석까지
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 카테고리별 미리보기 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">분석 카테고리</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STATISTICS_MENU.map((category) => {
            const completedCount = category.items.filter(item => item.implemented).length
            const totalCount = category.items.length
            const completionRate = Math.round((completedCount / totalCount) * 100)

            return (
              <Card key={category.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <category.icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{category.title}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {completedCount}/{totalCount}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {category.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <Progress value={completionRate} className="h-1.5" />
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{completionRate}% 완료</span>
                      <span>
                        {category.items.filter(item => item.comingSoon).length > 0 && '🕐 개발 중'}
                      </span>
                    </div>
                  </div>

                  {/* 대표 메서드들 미리보기 */}
                  <div className="mt-3 space-y-1">
                    {category.items.slice(0, 2).map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        {item.implemented ? (
                          <Link
                            href={item.href}
                            className="hover:text-primary hover:underline cursor-pointer flex-1 text-left"
                          >
                            {item.title}
                          </Link>
                        ) : (
                          <span className="opacity-50 flex-1 text-left">
                            {item.title}
                          </span>
                        )}
                        {item.implemented ? (
                          <Badge variant="outline" className="text-xs px-1 py-0">✓</Badge>
                        ) : item.comingSoon ? (
                          <Badge variant="outline" className="text-xs px-1 py-0">🕐</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs px-1 py-0 opacity-50">⏳</Badge>
                        )}
                      </div>
                    ))}
                    {category.items.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{category.items.length - 2}개 더
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* 시작하기 안내 */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            시작하기
          </CardTitle>
          <CardDescription>
            왼쪽 사이드바에서 원하는 통계 분석 방법을 선택하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                초보자 추천
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 기술통계 → 데이터 기본 정보 파악</li>
                <li>• 빈도분석 → 범주형 데이터 분포</li>
                <li>• T-검정 → 평균 차이 검정</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                고급 사용자
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• ANOVA → 다집단 비교 분석</li>
                <li>• 회귀분석 → 예측 모델 구축</li>
                <li>• 비모수검정 → 분포 가정 없는 검정</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}