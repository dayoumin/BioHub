'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowUp, Home } from 'lucide-react'
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

export default function StatisticsMainPage() {
  const [activeSection, setActiveSection] = useState<string>('')
  const [showScrollTop, setShowScrollTop] = useState(false)

  // Intersection Observer를 사용한 섹션 감지 (성능 개선)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      {
        threshold: 0.3, // 섹션의 30%가 보이면 활성화
        rootMargin: '-80px 0px -50% 0px' // Sticky nav 높이만큼 offset
      }
    )

    // 모든 섹션 관찰 시작
    STATISTICS_MENU.forEach((category) => {
      const element = document.getElementById(category.id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [])

  // Scroll-to-top 버튼 표시 감지 (별도 이벤트)
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 섹션으로 스크롤 + URL Hash 업데이트
  const scrollToSection = (sectionId: string) => {
    // URL Hash 업데이트 (북마크/공유 가능)
    window.history.pushState(null, '', `#${sectionId}`)

    const element = document.getElementById(sectionId)
    if (element) {
      const offset = 80 // Sticky nav 높이
      const bodyRect = document.body.getBoundingClientRect().top
      const elementRect = element.getBoundingClientRect().top
      const elementPosition = elementRect - bodyRect
      const offsetPosition = elementPosition - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  // 초기 로드 시 URL Hash 읽기
  useEffect(() => {
    if (window.location.hash) {
      const sectionId = window.location.hash.slice(1) // "#descriptive" → "descriptive"
      // 약간의 딜레이 후 스크롤 (페이지 로드 완료 대기)
      setTimeout(() => {
        const element = document.getElementById(sectionId)
        if (element) {
          const offset = 80
          const bodyRect = document.body.getBoundingClientRect().top
          const elementRect = element.getBoundingClientRect().top
          const elementPosition = elementRect - bodyRect
          const offsetPosition = elementPosition - offset

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          })
        }
      }, 100)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 상단으로 스크롤
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Navigation */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  홈
                </Button>
              </Link>
              <span className="text-sm text-muted-foreground">|</span>
              <h1 className="text-lg font-bold">통계 분석</h1>
            </div>

            {/* 카테고리 빠른 링크 */}
            <div className="hidden lg:flex items-center gap-2 overflow-x-auto">
              {STATISTICS_MENU.map((category) => (
                <Button
                  key={category.id}
                  variant={activeSection === category.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => scrollToSection(category.id)}
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <category.icon className="w-3 h-3" />
                  <span className="text-xs">{category.title}</span>
                </Button>
              ))}
            </div>

            {/* 모바일: 드롭다운 메뉴 */}
            <div className="lg:hidden">
              <select
                className="text-sm border rounded px-2 py-1"
                onChange={(e) => scrollToSection(e.target.value)}
                value={activeSection}
              >
                <option value="">카테고리 선택</option>
                {STATISTICS_MENU.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </nav>

      {/* 메인 콘텐츠 */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 헤더 섹션 */}
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">전문 통계 분석 도구</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            SciPy 기반의 정확한 통계 계산과 다양한 분석 방법을 제공합니다
          </p>
        </div>

        {/* 카테고리별 섹션 */}
        <div className="space-y-16">
          {STATISTICS_MENU.map((category) => (
            <section
              key={category.id}
              id={category.id}
              className="scroll-mt-20"
            >
              {/* 카테고리 헤더 */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <category.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{category.title}</h3>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  <span className="font-medium">용도:</span>{' '}
                  <span className="text-muted-foreground">{CATEGORY_PURPOSE[category.id]}</span>
                </div>
              </div>

              {/* 메서드 카드 그리드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.items.map((item) => (
                  <Card
                    key={item.id}
                    className={cn(
                      'hover:shadow-lg transition-all',
                      !item.implemented && 'opacity-60'
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-tight">
                          {item.title}
                        </CardTitle>
                        <div className="flex-shrink-0">
                          {item.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {item.badge}
                            </Badge>
                          )}
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
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* 하단 안내 */}
        <div className="mt-16 text-center text-sm text-muted-foreground">
          <p>모든 통계 분석은 Python SciPy 라이브러리를 기반으로 정확하게 계산됩니다</p>
        </div>
      </main>

      {/* Scroll-to-top 버튼 */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 w-12 h-12 rounded-full shadow-lg z-40"
          size="icon"
          aria-label="맨 위로"
        >
          <ArrowUp className="w-5 h-5" />
        </Button>
      )}
    </div>
  )
}
