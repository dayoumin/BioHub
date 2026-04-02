"use client"

import { useState } from "react"
import { Sparkles, Brain, ChevronRight, CheckCircle2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { SimpleUploadDialog } from "./simple-upload-dialog"

const benefits = [
  "데이터 타입 자동 감지",
  "이상치 및 결측값 확인",
  "최적 통계 방법 추천",
  "쉬운 결과 해석"
]

const processSteps = [
  {
    title: "데이터 업로드",
    description: "CSV, Excel 파일 드래그 또는 선택",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    highlight: false,
  },
  {
    title: "자동 검증",
    description: "데이터 구조, 타입, 품질 분석",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    highlight: false,
  },
  {
    title: "AI 추천",
    description: "최적의 통계 분석 방법 제안",
    color: "text-primary",
    bgColor: "bg-primary/10",
    highlight: true,
  },
  {
    title: "결과 확인",
    description: "전문가 수준의 분석을 쉬운 언어로",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    highlight: false,
  }
]

export function SmartAnalysisHero() {
  const [isUploadOpen, setIsUploadOpen] = useState(false)

  return (
    <section className="space-y-12 py-8">
      {/* 메인 헤더 */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">AI 기반 통계 분석</span>
        </div>
        
        <h1 className="text-5xl sm:text-6xl font-bold">
          통계 지식이 없어도
          <br />
          <span className="text-primary">
            전문가 수준의 분석
          </span>
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          데이터를 업로드하면 AI가 자동으로 데이터를 분석하고,
          가장 적합한 통계 방법을 추천하며, 결과를 쉽게 설명해드립니다.
        </p>

        {/* CTA 버튼 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
            onClick={() => setIsUploadOpen(true)}
          >
            <Brain className="mr-2 h-5 w-5" />
            스마트 분석 시작하기
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="text-lg px-8 py-6"
            onClick={() => setIsUploadOpen(true)}
          >
            샘플 데이터로 체험하기
          </Button>
        </div>
      </div>

      {/* 혜택 리스트 */}
      <div className="flex flex-wrap gap-4 justify-center">
        {benefits.map((benefit, i) => (
          <div key={i} className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">{benefit}</span>
          </div>
        ))}
      </div>

      {/* 프로세스 카드 */}
      <div className="grid md:grid-cols-4 gap-4">
        {processSteps.map((step, i) => (
          <Card key={i} className={`relative overflow-hidden transition-shadow ${
            step.highlight ? 'border-primary/40 shadow-md ring-1 ring-primary/20' : ''
          }`}>
            <div className={`absolute top-0 left-0 right-0 h-1 ${step.highlight ? 'bg-primary' : 'bg-border'}`} />
            <CardHeader className="pb-3">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${step.bgColor} mb-3`}>
                <span className={`text-xl font-bold ${step.color}`}>{i + 1}</span>
              </div>
              <CardTitle className="text-lg">{step.title}</CardTitle>
              {step.highlight && (
                <Badge variant="secondary" className="w-fit text-xs bg-primary/10 text-primary border-0">
                  핵심 기능
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <CardDescription>{step.description}</CardDescription>
            </CardContent>
            {i < processSteps.length - 1 && (
              <ChevronRight className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground/30 hidden md:block" />
            )}
          </Card>
        ))}
      </div>

      {/* 정보 박스 */}
      <Card className="bg-muted/30">
        <CardContent className="flex items-start gap-4 p-6">
          <Info className="h-5 w-5 text-primary mt-0.5" />
          <div className="space-y-2">
            <p className="font-medium">통계 초보자도 걱정 없어요!</p>
            <p className="text-sm text-muted-foreground">
              AI가 데이터를 분석하여 t-검정, ANOVA, 회귀분석 등 29가지 통계 방법 중
              가장 적합한 것을 자동으로 추천합니다. 복잡한 통계 용어 대신 쉬운 설명으로
              결과를 제공하며, 다음 단계도 안내해드립니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 업로드 다이얼로그 */}
      <SimpleUploadDialog 
        open={isUploadOpen} 
        onOpenChange={setIsUploadOpen} 
      />
    </section>
  )
}