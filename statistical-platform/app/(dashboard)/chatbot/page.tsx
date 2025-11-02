'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bot } from 'lucide-react'

export default function ChatbotPage() {
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold mb-2">AI 챗봇</h1>
        <p className="text-muted-foreground">
          AI가 데이터 분석과 통계 방법을 추천해드립니다
        </p>
      </div>

      {/* 메인 카드 */}
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
    </div>
  )
}
