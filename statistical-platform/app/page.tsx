'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, FlaskConical } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

interface UserTrack {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  journey: string
  color: string
  comingSoon?: boolean
}

const USER_TRACKS: UserTrack[] = [
  {
    id: 'design',
    title: '실험 설계',
    icon: FlaskConical,
    journey: '/experimental-design',
    color: 'bg-gradient-design',
    comingSoon: true
  },
  {
    id: 'analysis',
    title: '통계 분석',
    icon: BarChart3,
    journey: '/smart-flow',
    color: 'bg-gradient-analysis'
  }
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-4xl mx-auto p-6 space-y-16">

        {/* Hero */}
        <div className="text-center space-y-8 pt-12">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight">
              실험계획 및 통계분석 시스템
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              연구 설계부터 데이터 분석까지 한 곳에서 빠르게 완료하세요.
            </p>
          </div>
        </div>

        {/* Tracks */}
        <div className="text-center space-y-8">
          <h2 className="text-3xl font-semibold">무엇을 도와드릴까요?</h2>

          <div className="grid gap-8 md:grid-cols-2">
            {USER_TRACKS.map((track) => {
              const Icon = track.icon
              return (
                <Link key={track.id} href={track.journey}>
                  <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 cursor-pointer h-full">
                    <div
                      className="absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
                      style={{ background: `linear-gradient(135deg, var(--primary), var(--primary-foreground))` }}
                    />

                    <div className="relative p-8 flex flex-col items-center justify-center space-y-4 min-h-[200px]">
                      <div className={`p-4 rounded-xl ${track.color} text-white`}>
                        <Icon className="w-12 h-12" />
                      </div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-semibold">{track.title}</h3>
                        {track.comingSoon && (
                          <Badge variant="secondary" className="text-xs">
                            준비중
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
