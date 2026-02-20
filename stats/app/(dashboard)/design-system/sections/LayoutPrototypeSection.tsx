'use client'

/**
 * Layout Prototype Section
 *
 * Linear/Vercel 하이브리드 스타일의 새로운 레이아웃 프로토타입
 * - 상단 스테퍼 (sticky)
 * - 전체 페이지 스크롤
 * - 좌측 사이드바 제거
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Check,
  ChevronRight,
  BarChart3,
  Target,
  Settings,
  Play,
  ArrowLeft,
  ArrowRight
} from 'lucide-react'

// 스텝 정의 (2025-11-26: 5단계 → 4단계로 축소)
const STEPS = [
  { id: 1, label: '탐색', icon: BarChart3, shortLabel: '1' },
  { id: 2, label: '방법', icon: Target, shortLabel: '2' },
  { id: 3, label: '변수', icon: Settings, shortLabel: '3' },
  { id: 4, label: '분석', icon: Play, shortLabel: '4' },
]

export function LayoutPrototypeSection() {
  const [currentStep, setCurrentStep] = useState(2)
  const [isCompact, setIsCompact] = useState(false)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold mb-2">Layout Prototype</h1>
        <p className="text-muted-foreground">
          Linear/Vercel 하이브리드 스타일 - 상단 스테퍼 + 전체 페이지 스크롤
        </p>
      </div>

      {/* 컨트롤 패널 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">프로토타입 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">현재 단계:</span>
            <div className="flex gap-2">
              {STEPS.map((step) => (
                <Button
                  key={step.id}
                  variant={currentStep === step.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentStep(step.id)}
                >
                  {step.id}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">헤더 모드:</span>
            <Button
              variant={!isCompact ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsCompact(false)}
            >
              기본
            </Button>
            <Button
              variant={isCompact ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsCompact(true)}
            >
              컴팩트 (스크롤 시)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 프로토타입 미리보기 */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            라이브 프로토타입
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* 프로토타입 컨테이너 */}
          <div className="h-[600px] bg-muted/20 overflow-hidden flex flex-col">

            {/* ===== 상단 헤더 (Sticky) - 스테퍼만 ===== */}
            <header className={cn(
              "sticky top-0 z-50 bg-background/95 backdrop-blur border-b transition-all duration-200",
              isCompact ? "py-2" : "py-3"
            )}>
              <div className="max-w-5xl mx-auto px-6">
                <div className="flex items-center justify-center">
                  {/* 중앙: 스테퍼 */}
                  <nav className="flex items-center">
                    {STEPS.map((step, idx) => {
                      const isActive = step.id === currentStep
                      const isCompleted = step.id < currentStep

                      return (
                        <div key={step.id} className="flex items-center">
                          <button
                            onClick={() => setCurrentStep(step.id)}
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all text-sm",
                              "hover:bg-muted",
                              isActive && "bg-primary text-primary-foreground hover:bg-primary",
                              isCompleted && "text-muted-foreground"
                            )}
                          >
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
                              isCompleted && "bg-primary text-primary-foreground",
                              !isActive && !isCompleted && "bg-muted"
                            )}>
                              {isCompleted ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <span>{step.id}</span>
                              )}
                            </div>
                            <span>{step.label}</span>
                          </button>
                          {idx < STEPS.length - 1 && (
                            <div className={cn(
                              "w-6 h-px mx-1",
                              step.id < currentStep ? "bg-primary" : "bg-border"
                            )} />
                          )}
                        </div>
                      )
                    })}
                  </nav>
                </div>
              </div>
            </header>

            {/* ===== 메인 콘텐츠 (전체 스크롤) ===== */}
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
                {/* 콘텐츠 헤더: 제목 + 네비게이션 버튼 */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        Step {currentStep} / {STEPS.length}
                      </Badge>
                    </div>
                    <h2 className="text-2xl font-bold">
                      {STEPS[currentStep - 1]?.label}
                    </h2>
                    <p className="text-muted-foreground">
                      {currentStep === 1 && "데이터를 업로드하고 탐색하세요"}
                      {currentStep === 2 && "분석 방법을 선택하세요 (AI 추천)"}
                      {currentStep === 3 && "분석에 사용할 변수를 선택하세요"}
                      {currentStep === 4 && "분석을 실행하고 결과를 확인하세요"}
                    </p>
                  </div>

                  {/* 네비게이션 버튼 */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                      disabled={currentStep === 1}
                      className="gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      이전
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
                      disabled={currentStep === 4}
                      className="gap-1"
                    >
                      다음
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* 카드 그리드 (샘플) */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="border-2 border-success-border bg-success-bg">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Check className="w-4 h-4 text-success" />
                        데이터 준비 완료
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">표본 크기</p>
                          <p className="text-2xl font-bold">30</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">변수</p>
                          <p className="text-2xl font-bold">6개</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">분석 가능 항목</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Badge variant="secondary">t-검정</Badge>
                          2집단 비교
                        </li>
                        <li className="flex items-center gap-2">
                          <Badge variant="secondary">ANOVA</Badge>
                          다집단 비교
                        </li>
                        <li className="flex items-center gap-2">
                          <Badge variant="secondary">상관분석</Badge>
                          변수 관계
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* 테이블 (제한 높이 내부 스크롤) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">기초 통계량</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[200px] overflow-y-auto border rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted">
                          <tr>
                            <th className="text-left p-3 font-medium">변수명</th>
                            <th className="text-right p-3 font-medium">평균</th>
                            <th className="text-right p-3 font-medium">표준편차</th>
                            <th className="text-right p-3 font-medium">최소값</th>
                            <th className="text-right p-3 font-medium">최대값</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {['학습점수', '집중도', '참여도', 'ID', '나이', '경험'].map((name, i) => (
                            <tr key={name} className="hover:bg-muted/50">
                              <td className="p-3 font-medium">{name}</td>
                              <td className="p-3 text-right">{(50 + Math.random() * 40).toFixed(2)}</td>
                              <td className="p-3 text-right">{(5 + Math.random() * 10).toFixed(2)}</td>
                              <td className="p-3 text-right">{(10 + Math.random() * 20).toFixed(0)}</td>
                              <td className="p-3 text-right">{(80 + Math.random() * 20).toFixed(0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* 추가 콘텐츠 (스크롤 테스트) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">AI 추천</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-highlight-bg border border-highlight-border rounded-lg">
                      <p className="text-sm">
                        <strong>추천 분석:</strong> 이원분산분석 (Two-way ANOVA)
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        데이터에 2개의 범주형 변수와 1개의 연속형 변수가 있어
                        두 요인의 주효과와 상호작용 효과를 분석할 수 있습니다.
                      </p>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </main>

          </div>
        </CardContent>
      </Card>

      {/* 구조 비교 */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="text-lg text-red-700 dark:text-red-300">
              ❌ 현재 구조 (문제)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`SmartFlowLayout (h-screen)
├── 상단 헤더 (히스토리/도움말)
└── TwoPanelLayout (h-full)
    ├── 좌측 사이드바 (240px)
    └── 메인 영역
        ├── Breadcrumb
        └── 콘텐츠 (overflow-y-auto)
            ↑ 이중 스크롤 발생!`}
            </pre>
            <ul className="text-muted-foreground space-y-1">
              <li>• 좌측 사이드바가 공간 차지 (240px)</li>
              <li>• 콘텐츠 영역만 스크롤 → 이중 스크롤</li>
              <li>• 액션 버튼이 콘텐츠 내부</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="text-lg text-green-700 dark:text-green-300">
              ✅ 제안 구조 (개선)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`SmartFlowPage
├── 상단 헤더 (sticky, 얇음)
│   ├── 브랜드
│   └── 스테퍼 (1-7)
└── 메인 콘텐츠 (전체 스크롤)
    ├── 콘텐츠 헤더
    │   ├── 제목/설명
    │   └── [이전] [다음] 버튼
    ├── 카드 그리드
    └── 테이블 (max-h 제한)`}
            </pre>
            <ul className="text-muted-foreground space-y-1">
              <li>• 사이드바 제거 → 콘텐츠 30% 확대</li>
              <li>• 전체 페이지 스크롤 → 단일 스크롤</li>
              <li>• 액션 버튼 상단 고정</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* 핵심 변경 사항 */}
      <Card>
        <CardHeader>
          <CardTitle>핵심 변경 사항</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">항목</th>
                  <th className="text-left p-3 font-medium">현재</th>
                  <th className="text-left p-3 font-medium">변경</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-3 font-medium">사이드바</td>
                  <td className="p-3 text-red-600">240px 고정</td>
                  <td className="p-3 text-green-600">제거 (상단 스테퍼로 대체)</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">스테퍼 위치</td>
                  <td className="p-3 text-red-600">좌측 세로</td>
                  <td className="p-3 text-green-600">상단 가로 (sticky)</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">스크롤</td>
                  <td className="p-3 text-red-600">콘텐츠 영역만</td>
                  <td className="p-3 text-green-600">전체 페이지</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">헤더</td>
                  <td className="p-3 text-red-600">2줄 (헤더 + breadcrumb)</td>
                  <td className="p-3 text-green-600">1줄 (통합, 스크롤 시 축소)</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">액션 버튼</td>
                  <td className="p-3 text-red-600">콘텐츠 내부 (스크롤 필요)</td>
                  <td className="p-3 text-green-600">콘텐츠 헤더 우측 (스크롤 없이 접근)</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">테이블/로그</td>
                  <td className="p-3 text-red-600">무제한 높이</td>
                  <td className="p-3 text-green-600">max-h-[400px] 내부 스크롤</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
