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

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
  Copy, Check, Menu, X, Palette, Type, SquareStack, Cpu,
  ExternalLink, Table, Zap, GitCompare, Code, Shield, MessageCircle, FlaskConical, Layout, Calculator
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

// 데모 컴포넌트 import
import { PurposeCardDemo } from './components/PurposeCardDemo'
import { AIProgressDemo } from './components/AIProgressDemo'
import { DataPreviewDemo } from './components/DataPreviewDemo'
import { DataProfileSummaryDemo } from './components/DataProfileSummaryDemo'
import { GuidanceCardDemo } from './components/GuidanceCardDemo'
import { VariableSelectorDemo } from './components/VariableSelectorDemo'
import { VisualizationDemo } from './components/VisualizationDemo'
import { ResultContextDemo } from './components/ResultContextDemo'
import { StatisticalResultDemo } from './components/StatisticalResultDemo'
import { FloatingStepIndicatorDemo } from './components/FloatingStepIndicatorDemo'
import { FitScoreIndicatorDemo } from './components/FitScoreIndicatorDemo'
import { COMPONENT_LIST } from './constants'

// 로딩 스피너 (dynamic import용)
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    <span className="ml-3 text-muted-foreground">Loading...</span>
  </div>
);

// Tech Stack 섹션

// Tech Stack Section
const TechStackSection = dynamic(
  () => import('./sections/TechStackSection').then(mod => ({ default: mod.TechStackSection })),
  { ssr: false, loading: LoadingSpinner }
)

// Layout Prototype 섹션 (항상 사용 가능)
const LayoutPrototypeSection = dynamic(
  () => import('./sections/LayoutPrototypeSection').then(mod => ({ default: mod.LayoutPrototypeSection })),
  { ssr: false, loading: LoadingSpinner }
)

// 개발 전용 섹션 (프로덕션에서 제외)

const StatisticsPagePatternSection = process.env.NODE_ENV !== 'production'
  ? dynamic(() => import('./sections/StatisticsPagePatternSection').then(mod => ({ default: mod.StatisticsPagePatternSection })), {
      ssr: false,
      loading: LoadingSpinner
    })
  : null

const TypeGuardsSection = process.env.NODE_ENV !== 'production'
  ? dynamic(() => import('./sections/TypeGuardsSection').then(mod => ({ default: mod.TypeGuardsSection })), {
      ssr: false,
      loading: LoadingSpinner
    })
  : null

const RAGComponentsSection = process.env.NODE_ENV !== 'production'
  ? dynamic(() => import('./sections/RAGComponentsSection').then(mod => ({ default: mod.RAGComponentsSection })), {
      ssr: false,
      loading: LoadingSpinner
    })
  : null

const TestSnippetsSection = process.env.NODE_ENV !== 'production'
  ? dynamic(() => import('./sections/TestSnippetsSection').then(mod => ({ default: mod.TestSnippetsSection })), {
      ssr: false,
      loading: LoadingSpinner
    })
  : null

const StatisticalFormattingSection = process.env.NODE_ENV !== 'production'
  ? dynamic(() => import('./sections/StatisticalFormattingSection').then(mod => ({ default: mod.StatisticalFormattingSection })), {
      ssr: false,
      loading: LoadingSpinner
    })
  : null

// 네비게이션 섹션 정의
const NAV_SECTIONS = [
  { id: 'tech-stack', label: 'Tech Stack', icon: Cpu },
  { id: 'colors', label: 'Colors', icon: Palette },
  { id: 'buttons', label: 'Buttons', icon: SquareStack },
  { id: 'typography', label: 'Typography', icon: Type },
  { id: 'animations', label: 'Animations', icon: Zap },
  { id: 'components', label: 'Components', icon: GitCompare },
  { id: 'visualizations', label: 'Visualizations', icon: SquareStack },
  { id: 'data-utils', label: 'Data Utilities', icon: Table },
  { id: 'layout-prototype', label: 'Layout Prototype', icon: Layout },
  // 개발 전용 섹션 (프로덕션에서 제외)
  ...(process.env.NODE_ENV !== 'production' ? [
    { id: 'stats-pattern', label: 'Statistics Pattern', icon: Code, devOnly: true },
    { id: 'stats-formatting', label: 'Statistical Formatting', icon: Calculator, devOnly: true },
    { id: 'type-guards', label: 'Type Guards', icon: Shield, devOnly: true },
    { id: 'rag-components', label: 'RAG Components', icon: MessageCircle, devOnly: true },
    { id: 'test-snippets', label: 'Test Snippets', icon: FlaskConical, devOnly: true },
  ] : [])
] as const

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

  // 컴포넌트 선택 상태 (버튼 그리드용)
  const [selectedComponent, setSelectedComponent] = useState<string>('purpose-card')

  // 코드 복사 함수
  const copyToClipboard = useCallback((code: string, label: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(label)
    toast.success(`${label} 복사됨!`)

    setTimeout(() => setCopiedCode(null), 2000)
  }, [])

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
                {'devOnly' in section && section.devOnly && (
                  <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                    DEV
                  </Badge>
                )}
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
              0. Tech Stack
          ======================================== */}
          {activeSection === 'tech-stack' && (
            <TechStackSection />
          )}

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
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
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
              4. Animations
          ======================================== */}
          {activeSection === 'animations' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div>
                <h1 className="text-4xl font-bold mb-2">Animations</h1>
                <p className="text-muted-foreground">
                  프로젝트에서 사용하는 애니메이션 시스템 (Tailwind CSS 기반)
                </p>
              </div>

              {/* Fade-in Animation */}
              <Card>
                <CardHeader>
                  <CardTitle>Fade-in Animation</CardTitle>
                  <CardDescription>부드럽게 나타나는 기본 애니메이션</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted p-6 rounded-lg">
                    <div className="animate-fade-in">
                      <Card className="bg-background">
                        <CardHeader>
                          <CardTitle>Fade-in 예시</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            이 카드는 fade-in 애니메이션으로 나타납니다.
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">사용법</h4>
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                        <code>{`<div className="animate-fade-in">
  <YourComponent />
</div>`}</code>
                      </pre>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(`<div className="animate-fade-in">\n  <YourComponent />\n</div>`, 'Fade-in code')}
                      >
                        {copiedCode === 'Fade-in code' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">설정 (tailwind.config.mjs)</h4>
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                        <code>{`keyframes: {
  "fade-in": {
    "0%": { opacity: "0", transform: "translateY(10px)" },
    "100%": { opacity: "1", transform: "translateY(0)" }
  }
},
animation: {
  "fade-in": "fade-in 0.5s ease-out"
}`}</code>
                      </pre>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-medium">사용 위치</h4>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Smart Flow 각 Step 전환 (page.tsx Line 305-356)</li>
                      <li>모달, 드롭다운 등 새로 나타나는 UI</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Slide-in (Stagger) Animation */}
              <Card>
                <CardHeader>
                  <CardTitle>Slide-in (Stagger) Animation</CardTitle>
                  <CardDescription>아래에서 위로 순차 표시 애니메이션</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                        <Card className="bg-background">
                          <CardContent className="py-4">
                            <p className="text-sm">카드 #{item} - {idx * 150}ms 지연</p>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">사용법 (Stagger Effect)</h4>
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                        <code>{`{items.map((item, idx) => (
  <div
    key={item.id}
    className="animate-slide-in"
    style={{
      animationDelay: \`\${idx * 150}ms\`,
      animationFillMode: 'backwards'
    }}
  >
    <YourComponent />
  </div>
))}`}</code>
                      </pre>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(`{items.map((item, idx) => (\n  <div\n    key={item.id}\n    className="animate-slide-in"\n    style={{\n      animationDelay: \\\`\\\${idx * 150}ms\\\`,\n      animationFillMode: 'backwards'\n    }}\n  >\n    <YourComponent />\n  </div>\n))}`, 'Stagger code')}
                      >
                        {copiedCode === 'Stagger code' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">설정 (tailwind.config.mjs)</h4>
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                        <code>{`keyframes: {
  "slide-in-from-bottom": {
    "0%": { opacity: "0", transform: "translateY(20px)" },
    "100%": { opacity: "1", transform: "translateY(0)" }
  }
},
animation: {
  "slide-in": "slide-in-from-bottom 0.5s ease-out"
}`}</code>
                      </pre>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-medium">사용 위치</h4>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li><strong>PurposeInputStep</strong>: 5개 분석 목적 카드 (Line 301-305)</li>
                      <li><strong>PurposeInputStep</strong>: AI 추천 이유 리스트 (Line 363-366)</li>
                      <li>리스트 아이템 순차 표시</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Animation Best Practices */}
              <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                <CardHeader>
                  <CardTitle className="text-lg">💡 애니메이션 Best Practices</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <strong>1. prefers-reduced-motion 지원</strong>
                    <p className="text-muted-foreground mt-1">
                      사용자 설정에 따라 애니메이션 비활성화 (WCAG 2.3.3 준수)
                    </p>
                    <pre className="bg-muted p-2 rounded mt-2 text-xs overflow-x-auto">
                      <code>{`const prefersReducedMotion = useReducedMotion()

<div className={prefersReducedMotion ? '' : 'animate-slide-in'}>
  ...
</div>`}</code>
                    </pre>
                  </div>

                  <div>
                    <strong>2. animationFillMode: 'backwards'</strong>
                    <p className="text-muted-foreground mt-1">
                      애니메이션 시작 전 초기 상태 유지 (깜빡임 방지)
                    </p>
                  </div>

                  <div>
                    <strong>3. Stagger 간격 가이드</strong>
                    <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                      <li>50-100ms: 매우 빠른 순차 표시 (리스트 아이템)</li>
                      <li>150ms: 표준 간격 (카드, 버튼 그룹) ← <strong>권장</strong></li>
                      <li>200-300ms: 느린 순차 표시 (큰 요소)</li>
                    </ul>
                  </div>

                  <div>
                    <strong>4. 성능 최적화</strong>
                    <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                      <li>transform, opacity만 사용 (GPU 가속)</li>
                      <li>width, height 변경 지양 (리플로우 발생)</li>
                      <li>will-change 속성 최소화</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ========================================
              5. 공통 컴포넌트
          ======================================== */}
          {activeSection === 'components' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div>
                <h1 className="text-4xl font-bold mb-2">공통 컴포넌트</h1>
                <p className="text-muted-foreground">
                  프로젝트에서 사용하는 공통 컴포넌트 모음
                </p>
              </div>

              {/* 컴포넌트 선택 버튼 그리드 */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {COMPONENT_LIST.map((component) => (
                  <Button
                    key={component.id}
                    variant={selectedComponent === component.id ? 'default' : 'outline'}
                    className="h-auto py-3 px-4 flex flex-col items-center gap-1"
                    onClick={() => setSelectedComponent(component.id)}
                  >
                    <span className="font-medium">{component.label}</span>
                    {component.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {component.badge}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>

              {/* 선택된 컴포넌트 데모 표시 */}
              {selectedComponent === 'purpose-card' && (
                <PurposeCardDemo />
              )}

              {selectedComponent === 'ai-progress' && (
                <AIProgressDemo />
              )}

              {selectedComponent === 'data-preview' && (
                <DataPreviewDemo />
              )}

              {selectedComponent === 'data-profile' && (
                <DataProfileSummaryDemo />
              )}

              {selectedComponent === 'guidance-card' && (
                <GuidanceCardDemo />
              )}

              {selectedComponent === 'variable-selector' && (
                <VariableSelectorDemo />
              )}

              {selectedComponent === 'result-context' && (
                <ResultContextDemo />
              )}

              {selectedComponent === 'statistical-result' && (
                <StatisticalResultDemo />
              )}

              {selectedComponent === 'floating-step' && (
                <FloatingStepIndicatorDemo />
              )}

              {selectedComponent === 'fit-score' && (
                <FitScoreIndicatorDemo />
              )}
            </div>
          )}

          {/* ========================================
              6. 시각화 컴포넌트
          ======================================== */}
          {activeSection === 'visualizations' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div>
                <h1 className="text-4xl font-bold mb-2">데이터 시각화</h1>
                <p className="text-muted-foreground">
                  통계 분석용 차트 컴포넌트 (Histogram, BoxPlot, Scatterplot)
                </p>
              </div>

              <VisualizationDemo />
            </div>
          )}

          {/* ========================================
              7. Data Utilities
          ======================================== */}
          {activeSection === 'data-utils' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-4xl font-bold mb-2">Data Utilities</h1>
                <p className="text-muted-foreground">
                  데이터 처리를 위한 유틸리티 모음. 각 유틸리티의 공식 이름으로 의사소통하세요.
                </p>
              </div>

              {/* 1. 새 창으로 데이터 보기 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="w-5 h-5" />
                    새 창으로 데이터 보기
                    <Badge variant="default" className="text-xs">NEW</Badge>
                  </CardTitle>
                  <CardDescription>
                    <strong className="text-foreground">공식 이름:</strong> <code className="text-sm bg-muted px-2 py-0.5 rounded">handleOpenDataInNewWindow</code>
                    <br />
                    대용량 데이터를 별도 창에서 확인하는 유틸리티
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 라이브 데모 */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                      <div>
                        <h4 className="font-medium">샘플 데이터 (30행 × 5열)</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          group, value, age, score, time 변수 (스크롤 테스트용)
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          // 30 rows of sample data for scroll demonstration
                          const sampleData = Array.from({ length: 30 }, (_, i) => ({
                            group: i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C',
                            value: Math.round(10 + Math.random() * 90),
                            age: Math.round(20 + Math.random() * 40),
                            score: Math.round(60 + Math.random() * 40),
                            time: `${String(9 + Math.floor(i / 6)).padStart(2, '0')}:${String((i * 10) % 60).padStart(2, '0')}`
                          }))

                          const columns = Object.keys(sampleData[0])
                          // 2024 Modern Pattern: Monochrome Design System
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
    html, body {
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif;
      background: hsl(0 0% 96%);
    }
    .container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 24px;
      gap: 16px;
    }
    .header {
      flex-shrink: 0;
      background: hsl(0 0% 100%);
      border: 1px solid hsl(0 0% 90%);
      border-radius: 12px;
      padding: 20px 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    h1 {
      font-size: 18px;
      font-weight: 600;
      color: hsl(0 0% 10%);
      margin-bottom: 4px;
      letter-spacing: -0.01em;
    }
    .info {
      color: hsl(0 0% 45%);
      font-size: 14px;
      font-weight: 400;
    }
    .info strong {
      color: hsl(0 0% 20%);
      font-weight: 600;
    }
    .table-container {
      flex: 1;
      min-height: 0;
      background: hsl(0 0% 100%);
      border: 1px solid hsl(0 0% 90%);
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .table-wrapper {
      flex: 1;
      overflow: auto;
      min-height: 0;
    }
    .table-wrapper::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    .table-wrapper::-webkit-scrollbar-track {
      background: hsl(0 0% 96%);
    }
    .table-wrapper::-webkit-scrollbar-thumb {
      background: hsl(0 0% 80%);
      border-radius: 4px;
    }
    .table-wrapper::-webkit-scrollbar-thumb:hover {
      background: hsl(0 0% 65%);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    thead {
      position: sticky;
      top: 0;
      z-index: 10;
    }
    th {
      background: hsl(0 0% 98%);
      color: hsl(0 0% 25%);
      font-weight: 600;
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid hsl(0 0% 90%);
      white-space: nowrap;
    }
    td {
      padding: 10px 16px;
      border-bottom: 1px solid hsl(0 0% 95%);
      color: hsl(0 0% 30%);
      transition: background-color 0.1s ease;
    }
    tr:hover td {
      background-color: hsl(0 0% 98%);
    }
    tr:last-child td {
      border-bottom: none;
    }
    .row-number {
      background: hsl(0 0% 98%);
      font-weight: 500;
      color: hsl(0 0% 55%);
      text-align: center;
      width: 50px;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }
    tr:hover .row-number {
      background: hsl(0 0% 95%);
      color: hsl(0 0% 25%);
    }
    @media print {
      html, body {
        height: auto;
        overflow: visible;
        background: white;
      }
      .container {
        height: auto;
        padding: 0;
      }
      .header, .table-container {
        box-shadow: none;
        border: none;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>샘플 데이터 (디자인 시스템)</h1>
      <div class="info">
        총 <strong>${sampleData.length}</strong>행 × <strong>${columns.length}</strong>개 변수
      </div>
    </div>
    <div class="table-container">
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
  </div>
</body>
</html>
                          `

                          // scrollbars=yes removed for single scrollbar
                          const newWindow = window.open('', '_blank', 'width=1200,height=800,resizable=yes')
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

                  {/* 2024 Modern Pattern 특징 */}
                  <div className="bg-muted/30 rounded-lg p-4 space-y-3 border border-border">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-foreground"></span>
                      2024 Modern Pattern
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">Layout</p>
                        <ul className="text-muted-foreground space-y-0.5">
                          <li>• Flex-based Full Viewport</li>
                          <li>• Single scrollbar (no double)</li>
                          <li>• min-height: 0 (flex bug fix)</li>
                        </ul>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">Visual</p>
                        <ul className="text-muted-foreground space-y-0.5">
                          <li>• Glassmorphism header</li>
                          <li>• Gradient background</li>
                          <li>• Custom scrollbar</li>
                        </ul>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">Typography</p>
                        <ul className="text-muted-foreground space-y-0.5">
                          <li>• Tailwind color system</li>
                          <li>• tabular-nums for numbers</li>
                          <li>• letter-spacing: -0.02em</li>
                        </ul>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">UX</p>
                        <ul className="text-muted-foreground space-y-0.5">
                          <li>• Smooth hover transitions</li>
                          <li>• Sticky thead</li>
                          <li>• Print-friendly</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Modern Pattern 핵심 규칙 */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left p-3 font-medium border-b">항목</th>
                          <th className="text-left p-3 font-medium border-b border-l">권장 패턴</th>
                          <th className="text-left p-3 font-medium border-b border-l">설명</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="p-2.5 text-muted-foreground">레이아웃</td>
                          <td className="p-2.5 border-l"><code className="text-[10px]">flex + height: 100vh</code></td>
                          <td className="p-2.5 border-l text-muted-foreground">전체 화면 활용</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 text-muted-foreground">배경</td>
                          <td className="p-2.5 border-l"><code className="text-[10px]">hsl(0 0% 96%)</code></td>
                          <td className="p-2.5 border-l text-muted-foreground">모노크롬 시스템</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 text-muted-foreground">카드</td>
                          <td className="p-2.5 border-l"><code className="text-[10px]">border + box-shadow</code></td>
                          <td className="p-2.5 border-l text-muted-foreground">깊이감 표현</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 text-muted-foreground">스크롤</td>
                          <td className="p-2.5 border-l"><code className="text-[10px]">단일 + 커스텀</code></td>
                          <td className="p-2.5 border-l text-muted-foreground">이중 스크롤 방지</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 text-muted-foreground">높이</td>
                          <td className="p-2.5 border-l"><code className="text-[10px]">flex: 1; min-height: 0</code></td>
                          <td className="p-2.5 border-l text-muted-foreground">Flex 버그 방지</td>
                        </tr>
                      </tbody>
                    </table>
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
                    <h4 className="font-medium text-sm">공유 유틸리티 인터페이스:</h4>
                    <pre className="text-xs"><code>{`// lib/utils/open-data-window.ts
interface OpenDataWindowOptions {
  fileName: string
  columns: string[]
  data: Record<string, unknown>[]
  width?: number   // default: 1200
  height?: number  // default: 800
}

function openDataWindow(options: OpenDataWindowOptions): void`}</code></pre>
                  </div>

                  {/* 사용 예제 */}
                  <div className="relative">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        const code = `// 공유 유틸리티 사용 (권장)
import { openDataWindow } from '@/lib/utils/open-data-window'

const handleOpenNewWindow = useCallback(() => {
  if (!uploadedData) return
  openDataWindow({
    fileName: uploadedData.fileName,
    columns: uploadedData.columns,
    data: uploadedData.data
  })
}, [uploadedData])

// 사용
<Button onClick={handleOpenNewWindow}>
  <ExternalLink className="w-4 h-4" />
  새 창으로 보기
</Button>`
                        copyToClipboard(code, '새 창 열기 코드')
                      }}
                    >
                      {copiedCode === '새 창 열기 코드' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                      <code>{`// 공유 유틸리티 사용 (권장)
import { openDataWindow } from '@/lib/utils/open-data-window'

const handleOpenNewWindow = useCallback(() => {
  if (!uploadedData) return
  openDataWindow({
    fileName: uploadedData.fileName,
    columns: uploadedData.columns,
    data: uploadedData.data
  })
}, [uploadedData])

// 사용
<Button onClick={handleOpenNewWindow}>
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

          {/* ========================================
              8. Layout Prototype
          ======================================== */}
          {activeSection === 'layout-prototype' && (
            <LayoutPrototypeSection />
          )}

          {/* ========================================
              9. Statistics Pattern (개발 전용)
          ======================================== */}
          {activeSection === 'stats-pattern' && StatisticsPagePatternSection && (
            <StatisticsPagePatternSection />
          )}

          {/* ========================================
              10. Type Guards (개발 전용)
          ======================================== */}
          {activeSection === 'type-guards' && TypeGuardsSection && (
            <TypeGuardsSection />
          )}

          {/* ========================================
              11. RAG Components (개발 전용)
          ======================================== */}
          {activeSection === 'rag-components' && RAGComponentsSection && (
            <RAGComponentsSection />
          )}

          {/* ========================================
              12. Test Snippets (개발 전용)
          ======================================== */}
          {activeSection === 'test-snippets' && TestSnippetsSection && (
            <TestSnippetsSection />
          )}

          {/* ========================================
              13. Statistical Formatting (개발 전용)
          ======================================== */}
          {activeSection === 'stats-formatting' && StatisticalFormattingSection && (
            <StatisticalFormattingSection />
          )}
        </div>
      </main>
    </div>
  )
}
