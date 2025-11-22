'use client'

/**
 * 디자인 시스템 & 컴포넌트 쇼케이스
 *
 * 2024년 모던 디자인 적용:
 * - 사이드바 네비게이션 (Storybook 스타일)
 * - 코드 복사 버튼 (원클릭)
 * - 인터랙티브 색상 팔레트
 * - 버튼 라이브 플레이그라운드
 * - 반응형 디자인 (모바일 햄버거 메뉴)
 * - Hydration 안정화 (깜빡임 방지)
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { PurposeCard } from '@/components/common/analysis/PurposeCard'
import { AIAnalysisProgress } from '@/components/common/analysis/AIAnalysisProgress'
import { DataProfileSummary } from '@/components/common/analysis/DataProfileSummary'
import { DataPreviewTable } from '@/components/common/analysis/DataPreviewTable'
import { GuidanceCard } from '@/components/common/analysis/GuidanceCard'
import { VariableSelectorToggle } from '@/components/common/VariableSelectorToggle'
import {
  GitCompare, TrendingUp, PieChart, LineChart, Clock, Play, Pause,
  Copy, Check, Menu, X, Palette, Type, SquareStack, Sparkles, ArrowRight, AlertTriangle,
  ExternalLink, Table
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// 네비게이션 섹션 정의
const NAV_SECTIONS = [
  { id: 'colors', label: 'Colors', icon: Palette },
  { id: 'buttons', label: 'Buttons', icon: SquareStack },
  { id: 'typography', label: 'Typography', icon: Type },
  { id: 'components', label: 'Components', icon: GitCompare },
  { id: 'data-utils', label: 'Data Utilities', icon: Table },
]

// 색상 데이터
const COLOR_PALETTE = [
  { name: 'Primary', value: 'bg-primary text-primary-foreground', usage: '주요 액션, 링크', cssVar: 'hsl(var(--primary))' },
  { name: 'Secondary', value: 'bg-secondary text-secondary-foreground', usage: '보조 버튼', cssVar: 'hsl(var(--secondary))' },
  { name: 'Muted', value: 'bg-muted text-muted-foreground', usage: '배경, 비활성', cssVar: 'hsl(var(--muted))' },
  { name: 'Accent', value: 'bg-accent text-accent-foreground', usage: '강조', cssVar: 'hsl(var(--accent))' },
  { name: 'Destructive', value: 'bg-destructive text-destructive-foreground', usage: '삭제, 에러', cssVar: 'hsl(var(--destructive))' },
  { name: 'Success', value: 'bg-success text-white', usage: '성공, 완료', cssVar: 'hsl(var(--success))' },
]

export default function ComponentsShowcasePage() {
  // 네비게이션 상태
  const [activeSection, setActiveSection] = useState('colors')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false) // 모바일 초기 상태: 닫힘 (데스크탑은 CSS로 항상 열림)

  // 복사 상태
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // 버튼 플레이그라운드 상태
  const [buttonVariant, setButtonVariant] = useState<'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'>('default')
  const [buttonSize, setButtonSize] = useState<'sm' | 'default' | 'lg'>('default')

  // PurposeCard 상태
  const [selectedPurpose, setSelectedPurpose] = useState<string | null>(null)

  // AIAnalysisProgress 상태
  const [progress, setProgress] = useState(0)
  const [isProgressing, setIsProgressing] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // 코드 복사 함수
  const copyToClipboard = useCallback((code: string, label: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(label)
    toast.success(`${label} 복사됨!`)

    setTimeout(() => setCopiedCode(null), 2000)
  }, [])

  // AIAnalysisProgress 시뮬레이션
  const startProgress = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    setIsProgressing(true)
    setProgress(0)

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          setIsProgressing(false)
          return 100
        }
        return prev + 10
      })
    }, 500)
  }, [])

  const resetProgress = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setProgress(0)
    setIsProgressing(false)
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // VariableSelectorToggle 샘플 데이터
  const sampleData = [
    { group: 'A', value: 12.5, age: 25, score: 85, time: 120 },
    { group: 'B', value: 10.3, age: 22, score: 78, time: 105 },
    { group: 'A', value: 13.2, age: 28, score: 92, time: 135 },
    { group: 'B', value: 9.7, age: 20, score: 73, time: 98 },
    { group: 'A', value: 11.8, age: 26, score: 88, time: 125 }
  ]

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 사이드바 (좌측 고정) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-background border-r transition-transform duration-300 ease-in-out",
          "lg:translate-x-0 lg:static",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* 사이드바 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-semibold">Design System</h2>
            <p className="text-xs text-muted-foreground">UI Showcase</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 네비게이션 */}
        <nav className="p-4 space-y-2">
          {NAV_SECTIONS.map((section) => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(section.id)
                  setIsSidebarOpen(false)
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  activeSection === section.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </button>
            )
          })}
        </nav>

        {/* 사이드바 하단 정보 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Design System v1.0
          </p>
        </div>
      </aside>

      {/* 모바일 오버레이 */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-y-auto">
        {/* 상단 헤더 (모바일 햄버거 메뉴) */}
        <div className="sticky top-0 z-30 bg-background border-b px-6 py-4 flex items-center justify-between lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">
            {NAV_SECTIONS.find(s => s.id === activeSection)?.label}
          </h1>
          <div className="w-10" />
        </div>

        <div className="max-w-5xl mx-auto p-6 lg:p-8">
          {/* ========================================
              1. 색상 시스템
          ======================================== */}
          {activeSection === 'colors' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div>
                <h1 className="text-4xl font-bold mb-2">색상 시스템</h1>
                <p className="text-muted-foreground">
                  shadcn/ui 기반 시맨틱 색상 팔레트. 클릭하여 CSS 변수를 복사하세요.
                </p>
              </div>

              {/* 인터랙티브 색상 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => copyToClipboard(color.cssVar, color.name)}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border transition-all duration-200",
                      "hover:scale-105 hover:shadow-xl",
                      color.value
                    )}
                  >
                    <div className="aspect-video flex items-center justify-center relative">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {copiedCode === color.name ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </div>
                      <span className="text-2xl font-bold">{color.name}</span>
                    </div>
                    <div className={cn(
                      "p-3 border-t",
                      color.name === 'Muted' ? 'bg-background text-foreground' : 'bg-background'
                    )}>
                      <p className="text-xs text-muted-foreground">{color.usage}</p>
                      <code className="text-xs font-mono mt-1 block truncate">
                        {color.cssVar}
                      </code>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ========================================
              2. 버튼 시스템
          ======================================== */}
          {activeSection === 'buttons' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div>
                <h1 className="text-4xl font-bold mb-2">버튼 시스템</h1>
                <p className="text-muted-foreground">
                  모든 버튼 variants와 sizes. 라이브 플레이그라운드로 실시간 테스트하세요.
                </p>
              </div>

              {/* 라이브 플레이그라운드 */}
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
                <CardHeader>
                  <CardTitle>라이브 플레이그라운드</CardTitle>
                  <CardDescription>
                    variant와 size를 선택하여 실시간으로 확인하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 컨트롤 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Variant</label>
                      <Select value={buttonVariant} onValueChange={(value) => setButtonVariant(value as typeof buttonVariant)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="destructive">Destructive</SelectItem>
                          <SelectItem value="outline">Outline</SelectItem>
                          <SelectItem value="secondary">Secondary</SelectItem>
                          <SelectItem value="ghost">Ghost</SelectItem>
                          <SelectItem value="link">Link</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Size</label>
                      <Select value={buttonSize} onValueChange={(value) => setButtonSize(value as typeof buttonSize)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sm">Small</SelectItem>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="lg">Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 프리뷰 */}
                  <div className="flex items-center justify-center p-8 bg-background rounded-lg border">
                    <Button variant={buttonVariant} size={buttonSize}>
                      Preview Button
                    </Button>
                  </div>

                  {/* 코드 스니펫 */}
                  <div className="relative">
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
                      <code>{`<Button variant="${buttonVariant}" size="${buttonSize}">
  Preview Button
</Button>`}</code>
                    </pre>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(
                        `<Button variant="${buttonVariant}" size="${buttonSize}">Preview Button</Button>`,
                        'Button code'
                      )}
                    >
                      {copiedCode === 'Button code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 모든 Variants */}
              <Card>
                <CardHeader>
                  <CardTitle>All Variants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="default">Default</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="link">Link</Button>
                  </div>
                </CardContent>
              </Card>

              {/* 모든 Sizes */}
              <Card>
                <CardHeader>
                  <CardTitle>All Sizes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="sm">Small</Button>
                    <Button size="default">Default</Button>
                    <Button size="lg">Large</Button>
                    <Button size="icon">
                      <GitCompare className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ========================================
              3. 타이포그래피
          ======================================== */}
          {activeSection === 'typography' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div>
                <h1 className="text-4xl font-bold mb-2">타이포그래피</h1>
                <p className="text-muted-foreground">
                  헤딩, 본문, 코드 등 모든 텍스트 스타일
                </p>
              </div>

              {/* Headings */}
              <Card>
                <CardHeader>
                  <CardTitle>Headings</CardTitle>
                  <CardDescription>H1 ~ H6 스타일</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h1 className="text-4xl font-bold mb-1">Heading 1</h1>
                    <code className="text-xs text-muted-foreground">text-4xl font-bold</code>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold mb-1">Heading 2</h2>
                    <code className="text-xs text-muted-foreground">text-3xl font-bold</code>
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold mb-1">Heading 3</h3>
                    <code className="text-xs text-muted-foreground">text-2xl font-semibold</code>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-1">Heading 4</h4>
                    <code className="text-xs text-muted-foreground">text-xl font-semibold</code>
                  </div>
                </CardContent>
              </Card>

              {/* Body Text */}
              <Card>
                <CardHeader>
                  <CardTitle>Body Text</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-base mb-1">Base - 기본 본문 텍스트입니다.</p>
                    <code className="text-xs text-muted-foreground">text-base</code>
                  </div>
                  <div>
                    <p className="text-sm mb-1">Small - 작은 본문 텍스트입니다.</p>
                    <code className="text-xs text-muted-foreground">text-sm</code>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Muted - 보조 설명 텍스트입니다.</p>
                    <code className="text-xs text-muted-foreground">text-muted-foreground</code>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ========================================
              4. 공통 컴포넌트
          ======================================== */}
          {activeSection === 'components' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div>
                <h1 className="text-4xl font-bold mb-2">공통 컴포넌트</h1>
                <p className="text-muted-foreground">
                  프로젝트에서 사용하는 공통 컴포넌트 모음
                </p>
              </div>

              <Tabs defaultValue="purpose-card" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
                  <TabsTrigger value="purpose-card">PurposeCard</TabsTrigger>
                  <TabsTrigger value="ai-progress">AIProgress</TabsTrigger>
                  <TabsTrigger value="data-preview">DataPreview</TabsTrigger>
                  <TabsTrigger value="guidance-card">GuidanceCard 🆕</TabsTrigger>
                  <TabsTrigger value="variable-selector">VarSelector</TabsTrigger>
                </TabsList>

                {/* PurposeCard 탭 */}
                <TabsContent value="purpose-card" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>PurposeCard</CardTitle>
                      <CardDescription>선택 가능한 카드 컴포넌트 - 분석 목적 또는 방법 선택에 사용</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <PurposeCard
                          icon={<GitCompare className="h-6 w-6" />}
                          title="비교 분석"
                          description="그룹 간 차이를 비교합니다"
                          selected={selectedPurpose === 'compare'}
                          onClick={() => setSelectedPurpose('compare')}
                        />
                        <PurposeCard
                          icon={<TrendingUp className="h-6 w-6" />}
                          title="추세 분석"
                          description="시간에 따른 변화를 분석합니다"
                          selected={selectedPurpose === 'trend'}
                          onClick={() => setSelectedPurpose('trend')}
                        />
                      </div>

                      {/* Props 테이블 */}
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <h4 className="font-medium text-sm">Props:</h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>• <code>icon</code>: ReactNode - 카드 아이콘</li>
                          <li>• <code>title</code>: string - 카드 제목</li>
                          <li>• <code>description</code>: string - 카드 설명</li>
                          <li>• <code>selected</code>: boolean - 선택 상태</li>
                          <li>• <code>onClick</code>: () =&gt; void - 클릭 핸들러</li>
                        </ul>
                      </div>

                      {/* 사용 예제 */}
                      <div className="relative">
                        <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
                          <code>{`<PurposeCard
  icon={<GitCompare className="h-6 w-6" />}
  title="비교 분석"
  description="그룹 간 차이를 비교합니다"
  selected={selected === 'compare'}
  onClick={() => setSelected('compare')}
/>`}</code>
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* AIAnalysisProgress 탭 */}
                <TabsContent value="ai-progress" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>AIAnalysisProgress</CardTitle>
                      <CardDescription>AI 분석 진행률 표시 - 프로그레스 바와 단계 정보</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <AIAnalysisProgress progress={progress} />
                      <div className="flex gap-2">
                        <Button onClick={startProgress} disabled={isProgressing}>
                          <Play className="mr-2 h-4 w-4" />
                          시작
                        </Button>
                        <Button onClick={resetProgress} variant="outline">
                          <Pause className="mr-2 h-4 w-4" />
                          리셋
                        </Button>
                      </div>

                      {/* Props 테이블 */}
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <h4 className="font-medium text-sm">Props:</h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>• <code>progress</code>: number - 진행률 (0-100)</li>
                        </ul>
                      </div>

                      {/* 사용 예제 */}
                      <div className="relative">
                        <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
                          <code>{`const [progress, setProgress] = useState(0)

<AIAnalysisProgress progress={progress} />`}</code>
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* DataPreviewTable 탭 */}
                <TabsContent value="data-preview" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>DataPreviewTable</CardTitle>
                      <CardDescription>데이터 미리보기 테이블 - 토글 방식으로 대용량 데이터 표시</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <DataPreviewTable
                        data={sampleData}
                        maxRows={50}
                        defaultOpen={true}
                        title="샘플 데이터"
                        height="300px"
                      />

                      {/* Props 테이블 */}
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <h4 className="font-medium text-sm">Props:</h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>• <code>data</code>: DataRow[] - 표시할 데이터</li>
                          <li>• <code>maxRows</code>: number - 최대 표시 행 (기본: 100)</li>
                          <li>• <code>defaultOpen</code>: boolean - 초기 열림 상태 (기본: false)</li>
                          <li>• <code>title</code>: string - 제목 (기본: "데이터 미리보기")</li>
                          <li>• <code>height</code>: string - 테이블 높이 (기본: "400px")</li>
                        </ul>
                      </div>

                      {/* 사용 예제 */}
                      <div className="relative">
                        <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
                          <code>{`<DataPreviewTable
  data={uploadedData}
  maxRows={100}
  defaultOpen={false}
  title="업로드된 데이터"
  height="400px"
/>`}</code>
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* GuidanceCard 탭 */}
                <TabsContent value="guidance-card" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        GuidanceCard
                        <Badge variant="default" className="text-xs">NEW</Badge>
                      </CardTitle>
                      <CardDescription>단계별 안내 카드 - Smart Flow에서 사용 (Step 2, Step 3)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* 기본 예제 */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm">기본 예제 (Step 2 스타일)</h4>
                        <GuidanceCard
                          title="데이터 준비 완료!"
                          description={
                            <>
                              총 <strong>1,234개</strong> 데이터, <strong>5개</strong> 변수가 분석 준비되었습니다.
                            </>
                          }
                          steps={[
                            { emoji: '1️⃣', text: '분석 목적 선택 (그룹 비교, 관계 분석 등)' },
                            { emoji: '2️⃣', text: 'AI가 데이터를 분석하여 최적의 통계 방법 추천' },
                            { emoji: '3️⃣', text: '변수 선택 후 자동 분석 실행' }
                          ]}
                          ctaText="분석 목적 선택하기"
                          ctaIcon={<Sparkles className="w-4 h-4" />}
                          onCtaClick={() => toast.success('분석 목적 선택 화면으로 이동합니다')}
                          data-testid="guidance-demo-basic"
                        />
                      </div>

                      {/* 경고 메시지 포함 예제 */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm">경고 메시지 포함</h4>
                        <GuidanceCard
                          title="데이터 준비 완료!"
                          description="경고가 있지만 분석을 계속할 수 있습니다."
                          steps={[
                            { emoji: '1️⃣', text: '분석 목적 선택' },
                            { emoji: '2️⃣', text: 'AI 추천 받기' },
                            { emoji: '3️⃣', text: '변수 선택 후 실행' }
                          ]}
                          ctaText="계속하기"
                          ctaIcon={<ArrowRight className="w-4 h-4" />}
                          onCtaClick={() => toast.info('경고를 무시하고 계속합니다')}
                          warningMessage="경고 사항이 있지만 분석을 계속할 수 있습니다"
                          data-testid="guidance-demo-warning"
                        />
                      </div>

                      {/* 비활성화 예제 */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm">CTA 버튼 비활성화 (중복 클릭 방지)</h4>
                        <GuidanceCard
                          title="분석 방법이 결정되었습니다!"
                          description={
                            <>
                              <strong>독립표본 t-검정</strong> 방법으로 분석합니다.
                            </>
                          }
                          steps={[
                            { emoji: '1️⃣', text: '분석에 사용할 변수 선택' },
                            { emoji: '2️⃣', text: '자동 분석 실행 + 가정 검정' },
                            { emoji: '3️⃣', text: '결과 확인 및 해석' }
                          ]}
                          ctaText="변수 선택하기"
                          ctaIcon={<ArrowRight className="w-4 h-4" />}
                          onCtaClick={() => {}}
                          ctaDisabled={true}
                          animationDelay={700}
                          data-testid="guidance-demo-disabled"
                        />
                      </div>

                      {/* Props 테이블 */}
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <h4 className="font-medium text-sm">Props:</h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>• <code>title</code>: string - 카드 제목 (필수)</li>
                          <li>• <code>description</code>: string | ReactNode - 부제목/설명 (선택)</li>
                          <li>• <code>steps</code>: {`Array<{emoji: string, text: string}>`} - 다음 단계 리스트 (필수)</li>
                          <li>• <code>ctaText</code>: string - CTA 버튼 텍스트 (필수)</li>
                          <li>• <code>ctaIcon</code>: ReactNode - CTA 버튼 아이콘 (선택)</li>
                          <li>• <code>onCtaClick</code>: () =&gt; void - CTA 클릭 핸들러 (필수)</li>
                          <li>• <code>ctaDisabled</code>: boolean - CTA 비활성화 여부 (선택, 기본: false)</li>
                          <li>• <code>warningMessage</code>: string - 경고 메시지 (선택)</li>
                          <li>• <code>animationDelay</code>: number - 애니메이션 딜레이 ms (선택, 기본: 700)</li>
                          <li>• <code>data-testid</code>: string - 테스트 ID (선택)</li>
                        </ul>
                      </div>

                      {/* 리팩토링 정보 */}
                      <div className="bg-success/10 border border-success rounded-lg p-4 space-y-2">
                        <h4 className="font-medium text-sm text-success">🎯 2025-11-22 리팩토링 완료!</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-destructive">❌ 이전 방식</p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              <li>• Step 2/3에서 각각 50줄씩 중복</li>
                              <li>• 중복 클릭 방지 없음</li>
                              <li>• 유지보수 어려움</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-success">✅ 새 방식</p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              <li>• 공통 컴포넌트로 추출 (55줄 감소)</li>
                              <li>• ctaDisabled prop으로 중복 방지</li>
                              <li>• 단일 파일 수정으로 모든 단계 업데이트</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* 디자인 특징 */}
                      <div className="bg-primary/5 rounded-lg p-4 space-y-2">
                        <h4 className="font-medium text-sm">✨ 디자인 특징:</h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>• ✅ 일관된 디자인 (border-dashed, bg-primary/5)</li>
                          <li>• ✅ 성공 아이콘 (CheckCircle, 16x16)</li>
                          <li>• ✅ 3단계 프로세스 리스트 (이모지 + 텍스트)</li>
                          <li>• ✅ CTA 버튼 + 아이콘 (size=lg)</li>
                          <li>• ✅ 선택적 경고 메시지 (AlertTriangle)</li>
                          <li>• ✅ prefers-reduced-motion 지원 (WCAG 2.3.3)</li>
                          <li>• ✅ 중복 클릭 방지 (ctaDisabled prop)</li>
                        </ul>
                      </div>

                      {/* 사용 예제 */}
                      <div className="relative">
                        <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
                          <code>{`// Step 2 예제 (✅ 최신: Try/Catch + useEffect Cleanup)
const [isNavigating, setIsNavigating] = useState(false)

const handleNext = useCallback(() => {
  if (isNavigating || !onNext) return

  setIsNavigating(true)
  try {
    onNext()
    // ✅ 정상: goToNextStep()은 동기 함수로 즉시 언마운트
  } catch (error) {
    // ⚠️ 엣지 케이스: 에러 시 수동 리셋
    logger.error('Navigation failed', { error })
    setIsNavigating(false)
  }
}, [isNavigating, onNext])

// ✅ Cleanup: 언마운트 시 자동 리셋
useEffect(() => {
  return () => {
    setIsNavigating(false)
  }
}, [])

<GuidanceCard
  title="데이터 준비 완료!"
  description={
    <>
      총 <strong>{totalRows.toLocaleString()}개</strong> 데이터,
      <strong>{columnCount}개</strong> 변수가 준비되었습니다.
    </>
  }
  steps={[
    { emoji: '1️⃣', text: '분석 목적 선택 (그룹 비교, 관계 분석 등)' },
    { emoji: '2️⃣', text: 'AI가 데이터를 분석하여 최적의 통계 방법 추천' },
    { emoji: '3️⃣', text: '변수 선택 후 자동 분석 실행' }
  ]}
  ctaText="분석 목적 선택하기"
  ctaIcon={<Sparkles className="w-4 h-4" />}
  onCtaClick={handleNext}
  ctaDisabled={isNavigating}
  warningMessage={hasWarnings ? '경고 사항이 있지만 분석을 계속할 수 있습니다' : undefined}
/>`}</code>
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* VariableSelectorToggle 탭 */}
                <TabsContent value="variable-selector" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        VariableSelectorToggle
                        <Badge variant="default" className="text-xs">NEW</Badge>
                      </CardTitle>
                      <CardDescription>토글 방식 변수 선택 - 클릭 한 번으로 즉시 선택/해제</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <VariableSelectorToggle
                        data={sampleData}
                        onComplete={(selection) => {
                          toast.success(`종속변수: ${selection.dependent}, 독립변수: ${selection.independent}`)
                        }}
                        title="변수 선택 (리뉴얼)"
                        description="클릭 한 번으로 즉시 선택/해제됩니다"
                      />

                      {/* Props 테이블 */}
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <h4 className="font-medium text-sm">Props:</h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>• <code>data</code>: DataRow[] - 원본 데이터</li>
                          <li>• <code>onComplete</code>: (selection) =&gt; void - 선택 완료 핸들러</li>
                          <li>• <code>onBack</code>: () =&gt; void - 이전 단계 핸들러 (선택)</li>
                          <li>• <code>title</code>: string - 제목 (선택)</li>
                          <li>• <code>description</code>: string - 설명 (선택)</li>
                        </ul>
                      </div>

                      {/* 리뉴얼 비교 */}
                      <div className="bg-success/10 border border-success rounded-lg p-4 space-y-2">
                        <h4 className="font-medium text-sm text-success">🎯 2025-11-22 리뉴얼 완료!</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-destructive">❌ 이전 방식</p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              <li>• 선택 후 변수 목록 숨김</li>
                              <li>• "변경" 버튼 클릭 필요</li>
                              <li>• 2단계 프로세스</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-success">✅ 새 방식</p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              <li>• 모든 변수 항상 표시</li>
                              <li>• 클릭 한 번에 토글</li>
                              <li>• 좌우 영역 분리</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* 디자인 특징 */}
                      <div className="bg-primary/5 rounded-lg p-4 space-y-2">
                        <h4 className="font-medium text-sm">✨ 디자인 특징:</h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>• ✅ 즉시 피드백 (클릭 시 바로 선택/해제)</li>
                          <li>• ✅ 시각적 하이라이트 (선택된 변수 강조)</li>
                          <li>• ✅ 좌우 영역 구분 (종속/독립 명확히)</li>
                          <li>• ✅ 선택 요약 표시 (하단에 현재 선택 상태)</li>
                          <li>• ✅ 체크 마크 애니메이션 (선택 시각화)</li>
                        </ul>
                      </div>

                      {/* 사용 예제 */}
                      <div className="relative">
                        <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
                          <code>{`<VariableSelectorToggle
  data={uploadedData}
  onComplete={(selection) => {
    console.log('종속:', selection.dependent)
    console.log('독립:', selection.independent)
    startAnalysis(selection)
  }}
  onBack={goToPreviousStep}
  title="분석 변수 선택"
  description="클릭 한 번으로 즉시 선택/해제됩니다"
/>`}</code>
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Data Utilities 섹션 */}
          {activeSection === 'data-utils' && (
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="w-5 h-5" />
                    새 창으로 데이터 보기
                    <Badge variant="default" className="text-xs">NEW</Badge>
                  </CardTitle>
                  <CardDescription>대용량 데이터를 별도 창에서 확인하는 유틸리티</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 라이브 데모 */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                      <div>
                        <h4 className="font-medium">샘플 데이터 (5행 × 5열)</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          group, value, age, score, time 변수
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          const sampleData = [
                            { group: 'A', value: 10, age: 25, score: 85, time: '10:30' },
                            { group: 'B', value: 20, age: 30, score: 90, time: '11:00' },
                            { group: 'A', value: 15, age: 28, score: 88, time: '10:45' },
                            { group: 'B', value: 25, age: 32, score: 92, time: '11:15' },
                            { group: 'A', value: 12, age: 26, score: 86, time: '10:35' }
                          ]

                          const columns = Object.keys(sampleData[0])
                          const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>샘플 데이터 - 디자인 시스템</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 100%;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 20px;
    }
    .header {
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #e5e5e5;
    }
    h1 {
      font-size: 24px;
      color: #333;
      margin-bottom: 8px;
    }
    .info {
      color: #666;
      font-size: 14px;
    }
    .table-wrapper {
      overflow: auto;
      max-height: calc(100vh - 140px);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th {
      position: sticky;
      top: 0;
      background: #f8f9fa;
      color: #333;
      font-weight: 600;
      padding: 12px 8px;
      text-align: left;
      border-bottom: 2px solid #dee2e6;
      z-index: 10;
    }
    td {
      padding: 10px 8px;
      border-bottom: 1px solid #e9ecef;
      color: #495057;
    }
    tr:hover {
      background-color: #f8f9fa;
    }
    .row-number {
      background: #f1f3f5;
      font-weight: 500;
      color: #868e96;
      text-align: center;
      width: 60px;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>샘플 데이터 (디자인 시스템)</h1>
      <div class="info">
        총 5행 × 5개 변수
      </div>
    </div>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th class="row-number">#</th>
            ${columns.map(col => `<th>${col}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${sampleData.map((row, idx) => `
            <tr>
              <td class="row-number">${idx + 1}</td>
              ${columns.map(col => `<td>${row[col as keyof typeof row] ?? ''}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
                          `

                          const newWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')
                          if (newWindow) {
                            newWindow.document.write(htmlContent)
                            newWindow.document.close()
                            toast.success('새 창에서 데이터를 열었습니다!')
                          }
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                        새 창으로 보기
                      </Button>
                    </div>
                  </div>

                  {/* 기능 설명 */}
                  <div className="bg-primary/5 rounded-lg p-4 space-y-2">
                    <h4 className="font-medium text-sm">✨ 주요 기능:</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• ✅ Sticky Header (스크롤 시 헤더 고정)</li>
                      <li>• ✅ 행 번호 표시 (#1, #2, #3...)</li>
                      <li>• ✅ Hover 효과 (마우스 오버 시 배경 변경)</li>
                      <li>• ✅ 인쇄 지원 (@media print)</li>
                      <li>• ✅ 반응형 디자인 (모바일/태블릿 대응)</li>
                      <li>• ✅ 대용량 데이터 최적화 (가상 스크롤 가능)</li>
                    </ul>
                  </div>

                  {/* 사용 시나리오 */}
                  <div className="bg-success/10 border border-success rounded-lg p-4 space-y-2">
                    <h4 className="font-medium text-sm text-success">🎯 사용 시나리오:</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• 📊 데이터 검증 후 원본 전체 확인</li>
                      <li>• 🔍 요약 정보가 이상할 때 원본 대조</li>
                      <li>• 📋 인쇄용 테이블 (보고서 작성)</li>
                      <li>• 💾 대용량 데이터 (10,000+ 행) 확인</li>
                      <li>• 📱 듀얼 모니터 환경 (데이터는 별도 창)</li>
                    </ul>
                  </div>

                  {/* Props 테이블 */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <h4 className="font-medium text-sm">함수 시그니처:</h4>
                    <pre className="text-xs"><code>{`const handleOpenDataInNewWindow = (
  data: DataRow[],
  fileName?: string,
  totalRows: number,
  columnCount: number
) => void`}</code></pre>
                  </div>

                  {/* 사용 예제 */}
                  <div className="relative">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        const code = `// DataValidationStep.tsx에서 사용 예제
const handleOpenDataInNewWindow = useCallback(() => {
  if (!data || data.length === 0) return

  const columns = Object.keys(data[0])
  const htmlContent = \`
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>전체 데이터 - \${fileName}</title>
  <style>
    /* Sticky header, 행 번호, hover 효과 등 */
    th { position: sticky; top: 0; background: #f8f9fa; }
  </style>
</head>
<body>
  <table>
    <thead>
      <tr>
        <th>#</th>
        \${columns.map(col => \`<th>\${col}</th>\`).join('')}
      </tr>
    </thead>
    <tbody>
      \${data.map((row, idx) => \`
        <tr>
          <td>\${idx + 1}</td>
          \${columns.map(col => \`<td>\${row[col] ?? ''}</td>\`).join('')}
        </tr>
      \`).join('')}
    </tbody>
  </table>
</body>
</html>
  \`

  const newWindow = window.open('', '_blank', 'width=1200,height=800')
  if (newWindow) {
    newWindow.document.write(htmlContent)
    newWindow.document.close()
  }
}, [data, fileName])

// 사용
<Button onClick={handleOpenDataInNewWindow}>
  <ExternalLink className="w-4 h-4" />
  새 창으로 보기
</Button>`
                        copyToClipboard(code, '새 창 열기 코드')
                      }}
                    >
                      {copiedCode === '새 창 열기 코드' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-[400px]">
                      <code>{`// DataValidationStep.tsx에서 사용 예제
const handleOpenDataInNewWindow = useCallback(() => {
  if (!data || data.length === 0) return

  const columns = Object.keys(data[0])
  const htmlContent = \`
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>전체 데이터 - \${fileName}</title>
  <style>
    /* Sticky header, 행 번호, hover 효과 등 */
    th { position: sticky; top: 0; background: #f8f9fa; }
  </style>
</head>
<body>
  <table>
    <thead>
      <tr>
        <th>#</th>
        \${columns.map(col => \`<th>\${col}</th>\`).join('')}
      </tr>
    </thead>
    <tbody>
      \${data.map((row, idx) => \`
        <tr>
          <td>\${idx + 1}</td>
          \${columns.map(col => \`<td>\${row[col] ?? ''}</td>\`).join('')}
        </tr>
      \`).join('')}
    </tbody>
  </table>
</body>
</html>
  \`

  const newWindow = window.open('', '_blank', 'width=1200,height=800')
  if (newWindow) {
    newWindow.document.write(htmlContent)
    newWindow.document.close()
  }
}, [data, fileName])

// 사용
<Button onClick={handleOpenDataInNewWindow}>
  <ExternalLink className="w-4 h-4" />
  새 창으로 보기
</Button>`}</code>
                    </pre>
                  </div>

                  {/* 보안 주의사항 */}
                  <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 space-y-2">
                    <h4 className="font-medium text-sm text-yellow-800 dark:text-yellow-300">⚠️ 보안 주의사항:</h4>
                    <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1">
                      <li>• XSS 방지: 사용자 데이터에 HTML escape 필요</li>
                      <li>• 권장: DOMPurify 라이브러리 사용</li>
                      <li>• 또는: <code>String(value).replace(/&lt;/g, '&amp;lt;')</code></li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
