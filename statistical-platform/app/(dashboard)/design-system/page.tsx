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
  ExternalLink, Table, Zap, GitCompare, Code, Shield, MessageCircle, FlaskConical, Layout, Calculator, ToggleLeft,
  ChevronDown, Settings, Vote, Server, Route
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
import { FeedbackPanelDemo } from './components/FeedbackPanelDemo'
import { COMPONENT_LIST } from './constants'

// 로딩 스켈레톤 (dynamic import용) - 2025 Modern Style
const LoadingSpinner = () => (
  <div className="p-8 space-y-4">
    <div className="space-y-3">
      <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      <div className="h-4 w-64 bg-muted rounded animate-pulse" />
    </div>
    <div className="space-y-2">
      <div className="h-32 w-full bg-muted rounded-lg animate-pulse" />
      <div className="flex gap-3">
        <div className="h-10 w-24 bg-muted rounded animate-pulse" />
        <div className="h-10 w-24 bg-muted rounded animate-pulse" />
      </div>
    </div>
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

// Styles 섹션 (Tab + Sidebar 통합)
const StylesSection = dynamic(
  () => import('./sections/StylesSection').then(mod => ({ default: mod.StylesSection })),
  { ssr: false, loading: LoadingSpinner }
)

// Animations 섹션 (2025 Modern 스타일 비교)
const AnimationsSection = dynamic(
  () => import('./sections/AnimationsSection').then(mod => ({ default: mod.AnimationsSection })),
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

// Method Card Comparison Section (UI 개선 비교) - 개발 전용
const MethodCardComparisonSection = process.env.NODE_ENV !== 'production'
  ? dynamic(() => import('./sections/MethodCardComparisonSection').then(mod => ({ default: mod.MethodCardComparisonSection })), {
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

// Statistical Methods Section (Smart Flow pipeline + ID mapping) - 개발 전용
const StatisticalMethodsSection = process.env.NODE_ENV !== 'production'
  ? dynamic(() => import('./sections/StatisticalMethodsSection').then(mod => ({ default: mod.StatisticalMethodsSection })), {
      ssr: false,
      loading: LoadingSpinner
    })
  : null

// Deployment Log Section (always available - useful for troubleshooting)
const DeploymentLogSection = dynamic(
  () => import('./sections/DeploymentLogSection').then(mod => ({ default: mod.DeploymentLogSection })),
  { ssr: false, loading: LoadingSpinner }
)

// 네비게이션 카테고리 정의 (그룹화)
interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  isNew?: boolean
  devOnly?: boolean
}

interface NavCategory {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
  color: {
    bg: string        // 카테고리 헤더 배경 (활성)
    text: string      // 카테고리 헤더 텍스트
    border: string    // 아이템 좌측 border
    activeBg: string  // 아이템 활성 배경
  }
}

// 상단 탭 타입 정의
type TopTab = 'design' | 'dev'

// Design 탭 카테고리
const DESIGN_CATEGORIES: NavCategory[] = [
  {
    id: 'foundations',
    label: 'Foundations',
    icon: Palette,
    color: {
      bg: 'bg-violet-500/10',
      text: 'text-violet-600 dark:text-violet-400',
      border: 'border-violet-300 dark:border-violet-700',
      activeBg: 'bg-violet-600 dark:bg-violet-500',
    },
    items: [
      { id: 'colors', label: 'Colors', icon: Palette },
      { id: 'typography', label: 'Typography', icon: Type },
      { id: 'animations', label: 'Animations', icon: Zap },
      { id: 'styles', label: 'Styles', icon: ToggleLeft, isNew: true },
    ]
  },
  {
    id: 'components',
    label: 'Components',
    icon: GitCompare,
    color: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-300 dark:border-blue-700',
      activeBg: 'bg-blue-600 dark:bg-blue-500',
    },
    items: [
      { id: 'buttons', label: 'Buttons', icon: SquareStack },
      { id: 'components', label: 'Common Components', icon: GitCompare },
      { id: 'visualizations', label: 'Visualizations', icon: SquareStack },
      { id: 'data-utils', label: 'Data Utilities', icon: Table },
      { id: 'layout-prototype', label: 'Layout Prototype', icon: Layout },
      { id: 'feedback-panel', label: 'Feedback Panel', icon: Vote, isNew: true },
    ]
  },
]

// Dev Tools 탭 카테고리
const DEV_CATEGORIES: NavCategory[] = [
  {
    id: 'dev-tools',
    label: 'Developer Tools',
    icon: Settings,
    color: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-300 dark:border-amber-700',
      activeBg: 'bg-amber-600 dark:bg-amber-500',
    },
    items: [
      { id: 'tech-stack', label: 'Tech Stack', icon: Cpu },
      { id: 'deployment-log', label: 'Deployment Log', icon: Server, isNew: true },
      ...(process.env.NODE_ENV !== 'production' ? [
        { id: 'statistical-methods', label: 'Statistical Methods', icon: Route, isNew: true, devOnly: true },
        { id: 'method-card-comparison', label: 'Method Card Comparison', icon: GitCompare, devOnly: true },
        { id: 'stats-pattern', label: 'Statistics Pattern', icon: Code, devOnly: true },
        { id: 'stats-formatting', label: 'Statistical Formatting', icon: Calculator, devOnly: true },
        { id: 'type-guards', label: 'Type Guards', icon: Shield, devOnly: true },
        { id: 'rag-components', label: 'RAG Components', icon: MessageCircle, devOnly: true },
        { id: 'test-snippets', label: 'Test Snippets', icon: FlaskConical, devOnly: true },
      ] : [])
    ]
  }
]

// 탭에 따른 카테고리 반환
const getCategories = (tab: TopTab): NavCategory[] => {
  return tab === 'design' ? DESIGN_CATEGORIES : DEV_CATEGORIES
}

// 탭에 따른 기본 섹션
const getDefaultSection = (tab: TopTab): string => {
  return tab === 'design' ? 'colors' : 'tech-stack'
}

// 플랫 섹션 목록 (헤더 표시용)
const ALL_SECTIONS = [...DESIGN_CATEGORIES, ...DEV_CATEGORIES].flatMap(cat => cat.items)

// 색상 데이터 - 카테고리별 분류
const COLOR_CATEGORIES = {
  core: {
    title: 'Core Colors',
    description: 'shadcn/ui 기본 색상',
    convention: null,
    colors: [
      { name: 'Primary', value: 'bg-primary text-primary-foreground', usage: '주요 액션, 링크', cssVar: '--primary' },
      { name: 'Secondary', value: 'bg-secondary text-secondary-foreground', usage: '보조 버튼', cssVar: '--secondary' },
      { name: 'Muted', value: 'bg-muted text-muted-foreground', usage: '배경, 비활성', cssVar: '--muted' },
      { name: 'Accent', value: 'bg-accent text-accent-foreground', usage: '강조', cssVar: '--accent' },
      { name: 'Destructive', value: 'bg-destructive text-destructive-foreground', usage: '삭제, 에러', cssVar: '--destructive' },
    ]
  },
  semantic: {
    title: 'Semantic Colors',
    description: '상태 표시용 시맨틱 색상',
    convention: null,
    colors: [
      { name: 'Success', value: 'bg-success text-success-foreground', usage: '성공, 완료', cssVar: '--success' },
      { name: 'Error', value: 'bg-error text-error-foreground', usage: '에러, 실패', cssVar: '--error' },
      { name: 'Warning', value: 'bg-warning text-warning-foreground', usage: '경고, 주의', cssVar: '--warning' },
      { name: 'Info', value: 'bg-info text-info-foreground', usage: '정보, 안내', cssVar: '--info' },
    ]
  },
  statistical: {
    title: 'Statistical Significance',
    description: 'p-value 유의성 표시',
    convention: 'ggplot2/ggpubr: Grey=중립(비유의), Color intensity=유의수준',
    colors: [
      { name: 'Highly Sig', value: 'bg-stat-highly-significant text-white', usage: 'p < 0.01 ***', cssVar: '--stat-highly-significant' },
      { name: 'Significant', value: 'bg-stat-significant text-white', usage: 'p < 0.05 *', cssVar: '--stat-significant' },
      { name: 'Non-Sig', value: 'bg-stat-non-significant text-foreground', usage: 'p >= 0.05', cssVar: '--stat-non-significant' },
    ]
  },
  correlation: {
    title: 'Correlation Heatmap',
    description: 'Blue-Red Diverging 팔레트',
    convention: 'R/seaborn/matplotlib 표준: Blue=양(+), Red=음(-)',
    colors: [
      { name: 'Strong +', value: 'bg-correlation-strong-pos text-white', usage: 'r > 0.7', cssVar: '--correlation-strong-pos' },
      { name: 'Medium +', value: 'bg-correlation-medium-pos text-white', usage: '0.3~0.7', cssVar: '--correlation-medium-pos' },
      { name: 'Weak', value: 'bg-correlation-weak text-foreground', usage: '|r| < 0.3', cssVar: '--correlation-weak' },
      { name: 'Medium -', value: 'bg-correlation-medium-neg text-white', usage: '-0.7~-0.3', cssVar: '--correlation-medium-neg' },
      { name: 'Strong -', value: 'bg-correlation-strong-neg text-white', usage: 'r < -0.7', cssVar: '--correlation-strong-neg' },
    ]
  },
  highlight: {
    title: 'Highlight / AI',
    description: 'AI 추천, 강조 표시',
    convention: null,
    colors: [
      { name: 'Highlight', value: 'bg-highlight text-highlight-foreground', usage: 'AI 추천', cssVar: '--highlight' },
      { name: 'Highlight BG', value: 'bg-highlight-bg text-foreground', usage: '강조 배경', cssVar: '--highlight-bg' },
    ]
  },
  chart: {
    title: 'Chart Colors',
    description: '차트 시각화용 (Grayscale)',
    convention: null,
    colors: [
      { name: 'Chart 1', value: 'bg-chart-1 text-white', usage: '1번 계열', cssVar: '--chart-1' },
      { name: 'Chart 2', value: 'bg-chart-2 text-white', usage: '2번 계열', cssVar: '--chart-2' },
      { name: 'Chart 3', value: 'bg-chart-3 text-white', usage: '3번 계열', cssVar: '--chart-3' },
      { name: 'Chart 4', value: 'bg-chart-4 text-foreground', usage: '4번 계열', cssVar: '--chart-4' },
      { name: 'Chart 5', value: 'bg-chart-5 text-foreground', usage: '5번 계열', cssVar: '--chart-5' },
    ]
  },
}

export default function ComponentsShowcasePage() {
  // 상단 탭 상태
  const [activeTab, setActiveTab] = useState<TopTab>('design')

  // 네비게이션 상태
  const [activeSection, setActiveSection] = useState('colors')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false) // 모바일 초기 상태: 닫힘 (데스크탑은 CSS로 항상 열림)
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['foundations', 'components', 'dev-tools']) // 모두 열림

  // 탭 변경 핸들러
  const handleTabChange = useCallback((tab: TopTab) => {
    setActiveTab(tab)
    setActiveSection(getDefaultSection(tab))
  }, [])

  // 카테고리 토글 함수
  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }, [])

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
          "fixed inset-y-0 left-0 z-50 w-72 bg-background border-r transition-transform duration-300 ease-in-out",
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

        {/* 상단 탭 (Design / Dev Tools) */}
        <div className="p-3 border-b">
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <button
              onClick={() => handleTabChange('design')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                activeTab === 'design'
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Palette className="h-4 w-4" />
              Design
            </button>
            <button
              onClick={() => handleTabChange('dev')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                activeTab === 'dev'
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Code className="h-4 w-4" />
              Dev Tools
              {process.env.NODE_ENV !== 'production' && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0">
                  DEV
                </Badge>
              )}
            </button>
          </div>
        </div>

        {/* 네비게이션 (카테고리별 그룹화) */}
        <nav className="p-4 space-y-1 overflow-y-auto flex-1">
          {getCategories(activeTab).map((category) => {
            const CategoryIcon = category.icon
            const isExpanded = expandedCategories.includes(category.id)
            const hasActiveItem = category.items.some(item => item.id === activeSection)

            return (
              <div key={category.id} className="space-y-1">
                {/* 카테고리 헤더 */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors",
                    hasActiveItem
                      ? cn(category.color.bg, category.color.text)
                      : "hover:bg-muted/50 text-foreground"
                  )}
                >
                  <CategoryIcon className={cn("h-4 w-4", hasActiveItem && category.color.text)} />
                  <span className="flex-1 text-left">{category.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isExpanded ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </button>

                {/* 카테고리 아이템 */}
                {isExpanded && (
                  <div className={cn("ml-3 pl-3 border-l-2 space-y-1", category.color.border)}>
                    {category.items.map((item) => {
                      const ItemIcon = item.icon
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveSection(item.id)
                            setIsSidebarOpen(false)
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                            activeSection === item.id
                              ? cn(category.color.activeBg, "text-white")
                              : "hover:bg-muted text-muted-foreground"
                          )}
                        >
                          <ItemIcon className="h-4 w-4" />
                          {item.label}
                          {item.isNew && (
                            <Badge className="ml-auto text-[10px] px-1.5 py-0 bg-green-500">
                              NEW
                            </Badge>
                          )}
                          {item.devOnly && (
                            <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                              DEV
                            </Badge>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
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
            {ALL_SECTIONS.find(s => s.id === activeSection)?.label}
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

              {/* 카테고리별 색상 카드 */}
              {Object.entries(COLOR_CATEGORIES).map(([key, category]) => (
                <div key={key} className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{category.title}</h3>
                      <span className="text-xs text-muted-foreground">({category.description})</span>
                    </div>
                    {category.convention && (
                      <p className="text-xs text-muted-foreground/80 italic pl-1">
                        Convention: {category.convention}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
                    {category.colors.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => copyToClipboard(`var(${color.cssVar})`, color.name)}
                        className={cn(
                          "group relative overflow-hidden rounded-lg border transition-all duration-200",
                          "hover:scale-105 hover:shadow-lg",
                          color.value
                        )}
                      >
                        <div className="h-14 flex items-center justify-center relative">
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {copiedCode === color.name ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </div>
                          <span className="text-xs font-semibold">{color.name}</span>
                        </div>
                        <div className="p-1.5 border-t bg-background">
                          <p className="text-[10px] text-muted-foreground truncate">{color.usage}</p>
                          <code className="text-[10px] font-mono text-muted-foreground/70 truncate block">
                            {color.cssVar}
                          </code>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
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
            <AnimationsSection />
          )}

          {/* ========================================
              5. Styles (Tab + Sidebar)
          ======================================== */}
          {activeSection === 'styles' && (
            <StylesSection />
          )}

          {/* ========================================
              6. 공통 컴포넌트
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
              8.5. Feedback Panel (NEW)
          ======================================== */}
          {activeSection === 'feedback-panel' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div>
                <h1 className="text-4xl font-bold mb-2">피드백 패널</h1>
                <p className="text-muted-foreground">
                  사용자 투표 및 피드백 사이드바 컴포넌트 - 원하는 스타일을 선택하세요
                </p>
              </div>
              <FeedbackPanelDemo />
            </div>
          )}

          {/* ========================================
              Method Card Comparison (리팩토링 비교)
          ======================================== */}
          {activeSection === 'method-card-comparison' && MethodCardComparisonSection && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div>
                <h1 className="text-4xl font-bold mb-2">Method Card 리팩토링</h1>
                <p className="text-muted-foreground">
                  통계 페이지 방법 선택 UI를 PurposeCard로 통일하는 개선안
                </p>
              </div>
              <MethodCardComparisonSection />
            </div>
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

          {/* ========================================
              14. Statistical Methods (개발 전용)
          ======================================== */}
          {activeSection === 'statistical-methods' && StatisticalMethodsSection && (
            <StatisticalMethodsSection />
          )}

          {/* ========================================
              15. Deployment Log (항상 사용 가능)
          ======================================== */}
          {activeSection === 'deployment-log' && (
            <DeploymentLogSection />
          )}
        </div>
      </main>
    </div>
  )
}
