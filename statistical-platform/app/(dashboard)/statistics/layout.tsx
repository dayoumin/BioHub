import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  BarChart3,
  GitBranch,
  TrendingUp,
  Binary,
  Users,
  Calculator,
  Home
} from 'lucide-react'

const statisticsMenu = [
  {
    title: 'T-검정',
    href: '/statistics/t-test',
    icon: GitBranch,
    description: '평균 비교'
  },
  {
    title: 'ANOVA',
    href: '/statistics/anova',
    icon: BarChart3,
    description: '분산분석'
  },
  {
    title: '회귀분석',
    href: '/statistics/regression',
    icon: TrendingUp,
    description: '예측 모델'
  },
  {
    title: '상관분석',
    href: '/statistics/correlation',
    icon: Binary,
    description: '관계 분석'
  },
  {
    title: '비모수 검정',
    href: '/statistics/non-parametric',
    icon: Users,
    description: '분포무관'
  },
  {
    title: '카이제곱',
    href: '/statistics/chi-square',
    icon: Calculator,
    description: '범주형 분석'
  }
]

export default function StatisticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full">
      {/* 사이드바 */}
      <aside className="w-64 border-r bg-muted/10">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 px-2">
            <BarChart3 className="w-5 h-5" />
            <span className="font-semibold">통계 분석</span>
          </div>

          <nav className="space-y-1">
            {statisticsMenu.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.description}
                    </div>
                  </div>
                </Button>
              </Link>
            ))}
          </nav>

          <div className="pt-4 border-t">
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                대시보드로
              </Button>
            </Link>
          </div>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}