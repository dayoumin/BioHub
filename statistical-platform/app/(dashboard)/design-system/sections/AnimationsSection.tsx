'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RefreshCw, Play, Zap, Sparkles, Clock } from 'lucide-react'

/**
 * Animations Section - 2025 Modern Update
 *
 * Tabs:
 * - Current: Existing fade-in, slide-in (2000s style)
 * - 2025 Trends: Modern micro-interactions, spring physics, skeleton
 */
export function AnimationsSection() {
  const [activeTab, setActiveTab] = useState<'current' | 'modern' | 'compare'>('current')
  const [demoKey, setDemoKey] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [isToggled, setIsToggled] = useState(false)
  const [isIconPlaying, setIsIconPlaying] = useState(false)

  const resetDemo = () => setDemoKey(prev => prev + 1)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">애니메이션</h1>
        <p className="text-muted-foreground">
          애니메이션 스타일 비교 - 현재 vs 2025 모던
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="border-b">
        <div className="flex gap-6">
          {[
            { id: 'current' as const, label: '현재 (기본)', icon: Clock },
            { id: 'modern' as const, label: '2025 모던', icon: Sparkles },
            { id: 'compare' as const, label: '나란히 비교', icon: Zap },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 pb-3 text-sm font-medium transition-colors relative",
                activeTab === tab.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.id === 'modern' && (
                <Badge className="bg-green-500 text-[10px] px-1.5 py-0">NEW</Badge>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={resetDemo} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          애니메이션 리셋
        </Button>
      </div>

      {/* Current (Basic) Tab */}
      {activeTab === 'current' && (
        <div className="space-y-6" key={demoKey}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Fade-in</CardTitle>
                <Badge variant="outline">Basic</Badge>
              </div>
              <CardDescription>opacity + translateY - 간단한 등장 효과</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-6 rounded-lg">
                <div className="animate-fade-in">
                  <div className="bg-background p-4 rounded-lg border shadow-sm">
                    <p className="font-medium">Fade-in 카드</p>
                    <p className="text-sm text-muted-foreground">0.5s ease-out</p>
                  </div>
                </div>
              </div>
              <pre className="mt-4 text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                <code>{`// CSS Keyframes
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in { animation: fade-in 0.5s ease-out; }`}</code>
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Slide-in Stagger</CardTitle>
                <Badge variant="outline">Basic</Badge>
              </div>
              <CardDescription>지연을 통한 순차적 등장</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-6 rounded-lg space-y-3">
                {[1, 2, 3].map((item, idx) => (
                  <div
                    key={item}
                    className="animate-slide-in"
                    style={{
                      animationDelay: `${idx * 150}ms`,
                      animationFillMode: 'backwards'
                    }}
                  >
                    <div className="bg-background p-3 rounded-lg border">
                      <p className="text-sm">Item #{item} - {idx * 150}ms delay</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
            <CardHeader>
              <CardTitle className="text-yellow-800 dark:text-yellow-200">한계점</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-yellow-700 dark:text-yellow-300 space-y-2">
              <p>선형 타이밍은 기계적으로 느껴짐</p>
              <p>물리 기반 움직임 없음</p>
              <p>마이크로 인터랙션 없음 (호버, 클릭)</p>
              <p>로딩 상태 없음 (스켈레톤)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2025 Modern Tab */}
      {activeTab === 'modern' && (
        <div className="space-y-6" key={demoKey}>
          {/* Spring Animation */}
          <Card className="border-green-500/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Spring Physics</CardTitle>
                <Badge className="bg-green-500">2025</Badge>
              </div>
              <CardDescription>자연스러운 바운스와 오버슈트 - 생동감 있음</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-6 rounded-lg">
                <div
                  className="animate-spring-in"
                  style={{
                    animation: 'spring-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}
                >
                  <div className="bg-background p-4 rounded-lg border shadow-sm">
                    <p className="font-medium">스프링 카드</p>
                    <p className="text-sm text-muted-foreground">cubic-bezier 오버슈트</p>
                  </div>
                </div>
              </div>
              <pre className="mt-4 text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                <code>{`// Spring curve with overshoot
cubic-bezier(0.34, 1.56, 0.64, 1)
// or use Framer Motion
<motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}
  transition={{ type: "spring", stiffness: 300, damping: 20 }} />`}</code>
              </pre>
            </CardContent>
          </Card>

          {/* Micro-interactions */}
          <Card className="border-green-500/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Micro-interactions</CardTitle>
                <Badge className="bg-green-500">2025</Badge>
              </div>
              <CardDescription>호버, 클릭, 토글 피드백</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Hover Scale */}
              <div>
                <p className="text-sm font-medium mb-3">호버 확대 + 글로우</p>
                <div className="flex gap-4">
                  <button
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className={cn(
                      "px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium",
                      "transition-all duration-200 ease-out",
                      isHovered && "scale-105 shadow-lg shadow-primary/25"
                    )}
                  >
                    호버
                  </button>
                  <div
                    className="px-4 py-2 rounded-lg bg-muted cursor-pointer transition-all duration-200 hover:scale-105 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    카드 호버
                  </div>
                </div>
              </div>

              {/* Press Effect */}
              <div>
                <p className="text-sm font-medium mb-3">클릭 피드백</p>
                <button
                  onMouseDown={() => setIsPressed(true)}
                  onMouseUp={() => setIsPressed(false)}
                  onMouseLeave={() => setIsPressed(false)}
                  className={cn(
                    "px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium",
                    "transition-transform duration-100",
                    isPressed ? "scale-95" : "scale-100"
                  )}
                >
                  클릭
                </button>
              </div>

              {/* Toggle Bounce */}
              <div>
                <p className="text-sm font-medium mb-3">바운스 토글</p>
                <button
                  onClick={() => setIsToggled(!isToggled)}
                  className={cn(
                    "w-14 h-8 rounded-full p-1 transition-colors duration-300",
                    isToggled ? "bg-green-500" : "bg-muted"
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300",
                      isToggled && "translate-x-6",
                      // Bounce effect via scale
                      "hover:scale-110"
                    )}
                    style={{
                      transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                  />
                </button>
              </div>

              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                <code>{`// Hover
hover:scale-105 hover:-translate-y-0.5 hover:shadow-md
transition-all duration-200

// Press
active:scale-95 transition-transform duration-100

// Toggle bounce
transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)`}</code>
              </pre>
            </CardContent>
          </Card>

          {/* Skeleton Loading */}
          <Card className="border-green-500/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Skeleton Loading</CardTitle>
                <Badge className="bg-green-500">2025</Badge>
              </div>
              <CardDescription>로딩 상태를 위한 쉬머 효과</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Skeleton Card */}
                <div className="p-4 rounded-lg border space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-muted rounded animate-pulse" />
                    <div className="h-3 w-4/5 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-3/5 bg-muted rounded animate-pulse" />
                  </div>
                </div>

                {/* Shimmer Skeleton */}
                <div className="p-4 rounded-lg border">
                  <div
                    className="h-20 rounded bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]"
                    style={{
                      animation: 'shimmer 1.5s ease-in-out infinite'
                    }}
                  />
                </div>
              </div>

              <pre className="mt-4 text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                <code>{`// Pulse (Tailwind built-in)
<div className="animate-pulse bg-muted" />

// Shimmer (custom)
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
bg-gradient-to-r from-muted via-muted/50 to-muted
bg-[length:200%_100%] animate-shimmer`}</code>
              </pre>
            </CardContent>
          </Card>

          {/* Morphing Icons */}
          <Card className="border-green-500/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Icon Morphing</CardTitle>
                <Badge className="bg-green-500">2025</Badge>
              </div>
              <CardDescription>부드러운 아이콘 상태 전환</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                {/* Play/Pause */}
                <button
                  onClick={() => setIsIconPlaying(!isIconPlaying)}
                  className="p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  <div className="relative w-6 h-6">
                    <Play
                      className={cn(
                        "absolute inset-0 transition-all duration-300",
                        isIconPlaying ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
                      )}
                    />
                    <div
                      className={cn(
                        "absolute inset-0 flex gap-1 items-center justify-center transition-all duration-300",
                        isIconPlaying ? "opacity-100 scale-100" : "opacity-0 scale-0"
                      )}
                    >
                      <div className="w-1.5 h-4 bg-foreground rounded-sm" />
                      <div className="w-1.5 h-4 bg-foreground rounded-sm" />
                    </div>
                  </div>
                </button>

                <p className="text-sm text-muted-foreground">클릭하여 전환</p>
              </div>
            </CardContent>
          </Card>

          {/* Real Component Demo - Applied to Project */}
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>실제 적용된 컴포넌트</CardTitle>
                <Badge className="bg-primary">APPLIED</Badge>
              </div>
              <CardDescription>프로젝트에 실제 적용된 Button/Card 컴포넌트 테스트</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Button Demo */}
              <div>
                <p className="text-sm font-medium mb-3">Button 컴포넌트 (hover:scale-[1.02] active:scale-[0.98])</p>
                <div className="flex flex-wrap gap-3">
                  <Button>Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="ghost">Ghost</Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">모든 버튼에 호버/클릭 시 미세한 확대/축소 효과가 적용됨</p>
              </div>

              {/* Card Interactive Demo */}
              <div>
                <p className="text-sm font-medium mb-3">Card interactive 속성 (hover:-translate-y-0.5 hover:shadow-md)</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="font-medium">일반 Card</p>
                      <p className="text-sm text-muted-foreground">호버 효과 없음</p>
                    </CardContent>
                  </Card>
                  <Card interactive>
                    <CardContent className="pt-6">
                      <p className="font-medium">Interactive Card</p>
                      <p className="text-sm text-muted-foreground">호버 시 부상 + 그림자</p>
                    </CardContent>
                  </Card>
                </div>
                <p className="text-xs text-muted-foreground mt-2">클릭 가능한 카드에만 interactive 속성 추가</p>
              </div>

              {/* Code Example */}
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                <code>{`// Button - 자동 적용
<Button>클릭</Button>

// Card - interactive 속성으로 활성화
<Card interactive>
  클릭 가능한 카드
</Card>`}</code>
              </pre>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Side by Side Comparison */}
      {activeTab === 'compare' && (
        <div className="space-y-6" key={demoKey}>
          <Card>
            <CardHeader>
              <CardTitle>등장 애니메이션 비교</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* 2000s Style */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline">Current</Badge>
                    <span className="text-sm text-muted-foreground">선형 ease-out</span>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="animate-fade-in">
                      <div className="bg-background p-4 rounded-lg border">
                        선형 fade-in
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2025 Style */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className="bg-green-500">2025</Badge>
                    <span className="text-sm text-muted-foreground">스프링 오버슈트</span>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <div
                      style={{
                        animation: 'spring-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                      }}
                    >
                      <div className="bg-background p-4 rounded-lg border">
                        스프링 바운스
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>호버 효과 비교</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* 2000s Style */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline">Current</Badge>
                    <span className="text-sm text-muted-foreground">배경만 변경</span>
                  </div>
                  <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    기본 호버
                  </button>
                </div>

                {/* 2025 Style */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className="bg-green-500">2025</Badge>
                    <span className="text-sm text-muted-foreground">확대 + 그림자 + 부상</span>
                  </div>
                  <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground transition-all duration-200 hover:scale-105 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25">
                    모던 호버
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>로딩 상태 비교</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* 2000s Style */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline">Current</Badge>
                    <span className="text-sm text-muted-foreground">스피너</span>
                  </div>
                  <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                </div>

                {/* 2025 Style */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className="bg-green-500">2025</Badge>
                    <span className="text-sm text-muted-foreground">스켈레톤</span>
                  </div>
                  <div className="p-4 bg-muted rounded-lg space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-background animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-2/3 bg-background rounded animate-pulse" />
                        <div className="h-3 w-1/2 bg-background rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle>요약</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">기능</th>
                    <th className="text-left p-2">현재</th>
                    <th className="text-left p-2">2025 모던</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="p-2 font-medium">타이밍</td>
                    <td className="p-2 text-muted-foreground">ease-out (선형 느낌)</td>
                    <td className="p-2 text-green-600">스프링 (자연스러운 바운스)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">호버</td>
                    <td className="p-2 text-muted-foreground">배경 변경</td>
                    <td className="p-2 text-green-600">확대 + 부상 + 글로우</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">클릭</td>
                    <td className="p-2 text-muted-foreground">없음</td>
                    <td className="p-2 text-green-600">축소 피드백</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">로딩</td>
                    <td className="p-2 text-muted-foreground">스피너</td>
                    <td className="p-2 text-green-600">스켈레톤 쉬머</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">아이콘</td>
                    <td className="p-2 text-muted-foreground">즉시 교체</td>
                    <td className="p-2 text-green-600">모핑 전환</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CSS for custom animations */}
      <style jsx global>{`
        @keyframes spring-in {
          0% {
            opacity: 0;
            transform: scale(0.9) translateY(10px);
          }
          50% {
            transform: scale(1.02) translateY(-2px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .animate-shimmer {
          animation: shimmer 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
