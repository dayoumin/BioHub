'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, BarChart3, FlaskConical, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

interface UserTrack {
  id: string
  title: string
  subtitle: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  examples: string[]
  journey: string
  color: string
}

const USER_TRACKS: UserTrack[] = [
  {
    id: 'analysis',
    title: '데이터 분석하기',
    subtitle: '',
    description: '엑셀·CSV 파일을 업로드해서 통계 결과를 빠르게 확인하세요.',
    icon: BarChart3,
    examples: ['설문조사 결과 분석', '실험 데이터 해석'],
    journey: '/smart-flow',
    color: 'bg-gradient-analysis'
  },
  {
    id: 'design',
    title: '실험 설계하기',
    subtitle: '',
    description: '연구 목적에 맞는 실험 설계와 분석 전략을 단계별로 안내합니다.',
    icon: FlaskConical,
    examples: ['신약 효과 검증', '교육 방법 비교'],
    journey: '/experimental-design',
    color: 'bg-gradient-design'
  }
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-7xl mx-auto p-6 space-y-16">

        {/* Hero */}
        <div className="text-center space-y-8 pt-12">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight">
              모두의 통계 플랫폼
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              연구 설계부터 데이터 분석까지 한 곳에서 빠르게 완료하세요.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-gradient-analysis text-white border-0"
            >
              <Link href="/smart-flow">
                데이터 분석 시작
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Link href="/experimental-design">
                실험 설계 시작
              </Link>
            </Button>
          </div>
        </div>

        {/* Tracks */}
        <div className="text-center space-y-8">
          <h2 className="text-3xl font-semibold">무엇을 도와드릴까요?</h2>

          <div className="grid gap-8 max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto md:grid-cols-2">
            {USER_TRACKS.map((track) => {
              const Icon = track.icon
              return (
                <Card
                  key={track.id}
                  className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50"
                >
                  <div
                    className="absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
                    style={{ background: `linear-gradient(135deg, var(--primary), var(--primary-foreground))` }}
                  />

                  <CardHeader className="relative">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${track.color} text-white`}>
                          <Icon className="w-8 h-8" />
                        </div>
                        <div className="text-left">
                          <CardTitle className="text-2xl">{track.title}</CardTitle>
                          <CardDescription className="text-base">{track.subtitle || '\u00A0'}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground text-sm">{track.description}</p>

                    <div className="flex flex-wrap gap-2">
                      {track.examples.map((example, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {example}
                        </Badge>
                      ))}
                    </div>

                    <Button
                      asChild
                      className={`w-full ${track.color} hover:opacity-90 transition-all duration-300 text-white border-0`}
                    >
                      <Link href={track.journey}>
                        {track.title.replace('하기', ' 시작')}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
