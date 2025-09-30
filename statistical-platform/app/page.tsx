'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, BarChart3, FlaskConical, TrendingUp, Users, Microscope } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

// 사용자 트랙 정의
interface UserTrack {
  id: string
  title: string
  subtitle: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  examples: string[]
  journey: string
  color: string
  stats?: string
}

const USER_TRACKS: UserTrack[] = [
  {
    id: 'analysis',
    title: '데이터 분석하기',
    subtitle: '이미 수집된 데이터를 분석',
    description: '엑셀, CSV 파일을 업로드해서 통계 분석 결과를 확인하세요',
    icon: BarChart3,
    badge: '즉시 시작',
    examples: ['설문조사 결과 분석', '실험 데이터 해석', '기존 연구 데이터 검증'],
    journey: '/smart-flow',
    color: 'bg-gradient-analysis',
    stats: '41개 통계 방법 지원'
  },
  {
    id: 'design',
    title: '실험 설계하기',
    subtitle: '앞으로 할 연구를 계획',
    description: '연구 목적에 맞는 실험 방법과 분석 계획을 세워보세요',
    icon: FlaskConical,
    badge: '연구 설계',
    examples: ['신약 효과 검증 설계', '교육 방법 비교 연구', '수산생물 실험 계획'],
    journey: '/experimental-design',
    color: 'bg-gradient-design',
    stats: '16개 실험설계 지원'
  }
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-7xl mx-auto p-6 space-y-12">

        {/* Hero 섹션 */}
        <div className="text-center space-y-6">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight">
              전문가급 통계 플랫폼
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              연구 설계부터 데이터 분석까지, 한 곳에서 완성하세요
            </p>
          </div>

          {/* 사용 통계 */}
          <div className="flex justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>41개 통계 방법</span>
            </div>
            <div className="flex items-center gap-2">
              <Microscope className="w-4 h-4" />
              <span>16개 실험설계</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>수산과학 특화</span>
            </div>
          </div>
        </div>

        {/* 핵심 질문 */}
        <div className="text-center space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold">무엇을 도와드릴까요?</h2>
            <p className="text-lg text-muted-foreground">
              연구 단계에 따라 적합한 도구를 선택하세요
            </p>
          </div>

          {/* 2-Track 선택 카드 */}
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {USER_TRACKS.map((track) => {
              const Icon = track.icon
              return (
                <Card key={track.id} className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50">
                  <div className="absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity duration-300"
                       style={{background: `linear-gradient(135deg, var(--primary), var(--primary-foreground))`}} />

                  <CardHeader className="relative">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${track.color} text-white`}>
                          <Icon className="w-8 h-8" />
                        </div>
                        <div className="text-left">
                          <CardTitle className="text-2xl">{track.title}</CardTitle>
                          <CardDescription className="text-base">{track.subtitle}</CardDescription>
                        </div>
                      </div>
                      {track.badge && (
                        <Badge variant="secondary" className="shrink-0">
                          {track.badge}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <p className="text-muted-foreground">{track.description}</p>

                    {/* 사용 예시 */}
                    <div>
                      <h4 className="font-medium mb-3">사용 예시</h4>
                      <ul className="space-y-2">
                        {track.examples.map((example, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0" />
                            {example}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 통계 정보 */}
                    {track.stats && (
                      <div className="text-sm text-muted-foreground font-medium">
                        ✨ {track.stats}
                      </div>
                    )}

                    {/* 시작 버튼 */}
                    <Link href={track.journey}>
                      <Button className={`w-full ${track.color} hover:opacity-90 transition-all duration-300 text-white border-0`}>
                        {track.title.replace('하기', ' 시작')}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* 빠른 가이드 */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-muted/30">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold">💡 어떤 것을 선택해야 할까요?</h3>
                <div className="grid md:grid-cols-2 gap-6 text-left">
                  <div className="space-y-2">
                    <div className="font-medium text-blue-700 dark:text-blue-300">
                      📊 연구를 시작하는 단계라면
                    </div>
                    <div className="text-sm text-muted-foreground">
                      → &ldquo;실험 설계하기&rdquo;로 연구 방법을 먼저 계획하세요
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium text-green-700 dark:text-green-300">
                      📈 데이터가 이미 있다면
                    </div>
                    <div className="text-sm text-muted-foreground">
                      → &ldquo;데이터 분석하기&rdquo;로 바로 통계 분석을 시작하세요
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}