'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  ChartScatter, BarChart3, LineChart, Table2, Flame, GitCommitHorizontal, Info,
  Palette, Type, Zap, ChevronDown, Settings, GitCompare, ToggleLeft, PanelLeft
} from 'lucide-react'

/**
 * Styles Section (Combined Tab + Sidebar Styles)
 *
 * Internal tabs for switching between:
 * - Tab Styles: 2024-2025 Modern Tab/Segmented Control Styles
 * - Sidebar Styles: Design System Sidebar Navigation Options
 */
export function StylesSection() {
  // Main tab state
  const [activeTab, setActiveTab] = useState<'tabs' | 'sidebar'>('tabs')

  // Tab styles state
  const [style1Tab, setStyle1Tab] = useState('scatter')
  const [style2Tab, setStyle2Tab] = useState('scatter')
  const [style3Tab, setStyle3Tab] = useState('scatter')
  const [style4Tab, setStyle4Tab] = useState('histogram')
  const [style5Tab, setStyle5Tab] = useState('scatter')

  // Sidebar styles state
  const [sidebarStyle, setSidebarStyle] = useState<'A' | 'B' | 'C'>('A')
  const [activeSidebarItem, setActiveSidebarItem] = useState('colors')
  const [expandedCats, setExpandedCats] = useState(['foundations'])

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">스타일</h1>
        <p className="text-muted-foreground">
          UI 컴포넌트 스타일 - 탭, 사이드바 등
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="border-b">
        <div className="flex gap-6">
          {[
            { id: 'tabs' as const, label: '탭 스타일', icon: ToggleLeft },
            { id: 'sidebar' as const, label: '사이드바 스타일', icon: PanelLeft },
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
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Styles Content */}
      {activeTab === 'tabs' && (
        <div className="space-y-8">
          {/* Usage Guidelines */}
          <Card className="border-2 border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                사용 가이드라인
              </CardTitle>
              <CardDescription>
                용도에 따른 두 가지 탭 스타일
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* ContentTabs */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-500">ContentTabs</Badge>
                    <span className="text-sm font-medium">Style 3: Underline</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <strong>다른 콘텐츠 뷰</strong> 간 전환에 사용
                  </p>
                  <div className="bg-muted/50 p-3 rounded-lg text-xs space-y-1">
                    <p className="font-medium">예시:</p>
                    <ul className="text-muted-foreground space-y-0.5">
                      <li>산점도 ↔ 히트맵 (다른 시각화)</li>
                      <li>통계 ↔ 데이터 미리보기 (다른 정보)</li>
                    </ul>
                  </div>
                  <div className="border rounded-lg p-3 bg-background">
                    <div className="border-b">
                      <div className="flex gap-4">
                        {[
                          { id: 'scatter', label: 'Scatter' },
                          { id: 'heatmap', label: 'Heatmap' }
                        ].map(tab => (
                          <button
                            key={tab.id}
                            className={cn(
                              "pb-2 text-sm font-medium transition-colors relative",
                              style3Tab === tab.id
                                ? "text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {tab.label}
                            {style3Tab === tab.id && (
                              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* FilterToggle */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-500">FilterToggle</Badge>
                    <span className="text-sm font-medium">Style 4: Pill</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <strong>같은 콘텐츠 내 옵션</strong> 토글에 사용
                  </p>
                  <div className="bg-muted/50 p-3 rounded-lg text-xs space-y-1">
                    <p className="font-medium">예시:</p>
                    <ul className="text-muted-foreground space-y-0.5">
                      <li>히스토그램 ↔ 박스플롯 (같은 데이터, 다른 차트)</li>
                      <li>보기 모드 토글</li>
                    </ul>
                  </div>
                  <div className="border rounded-lg p-3 bg-background">
                    <div className="flex gap-2">
                      {[
                        { id: 'histogram', label: 'Histogram', icon: BarChart3 },
                        { id: 'boxplot', label: 'Boxplot', icon: GitCommitHorizontal }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                            style4Tab === tab.id
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}
                        >
                          <tab.icon className="h-3 w-3" />
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
                <p className="text-sm font-medium mb-2">빠른 결정:</p>
                <div className="text-sm text-muted-foreground">
                  <p><strong>Q: 클릭 시 전체 콘텐츠 영역이 바뀌나요?</strong></p>
                  <p className="ml-4">예: <Badge variant="outline" className="text-xs">ContentTabs</Badge> (밑줄)</p>
                  <p className="ml-4">아니오, 표시 방식만 변경: <Badge variant="outline" className="text-xs">FilterToggle</Badge> (필)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Style 3: Underline */}
          <Card className="border-blue-500/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Style 3: Underline Tabs</CardTitle>
                <Badge className="bg-blue-500">ContentTabs</Badge>
              </div>
              <CardDescription>Google / GitHub style</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-b">
                <div className="flex gap-6">
                  {[
                    { id: 'scatter', label: 'Scatter Plot', icon: ChartScatter },
                    { id: 'heatmap', label: 'Correlation Heatmap', icon: Flame }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setStyle3Tab(tab.id)}
                      className={cn(
                        "flex items-center gap-1.5 pb-3 text-sm font-medium transition-colors relative",
                        style3Tab === tab.id
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                      {style3Tab === tab.id && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 h-24 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                {style3Tab === 'scatter' ? 'Scatter Plot Content' : 'Heatmap Content'}
              </div>
            </CardContent>
          </Card>

          {/* Style 4: Pill */}
          <Card className="border-purple-500/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Style 4: Pill Toggle</CardTitle>
                <Badge className="bg-purple-500">FilterToggle</Badge>
              </div>
              <CardDescription>Stripe / Tailwind UI style</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {[
                  { id: 'histogram', label: 'Histogram', icon: BarChart3 },
                  { id: 'boxplot', label: 'Boxplot', icon: GitCommitHorizontal }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setStyle4Tab(tab.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                      style4Tab === tab.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 h-24 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                {style4Tab === 'histogram' ? 'Histogram Chart' : 'Boxplot Chart'}
              </div>
            </CardContent>
          </Card>

          {/* Reference Styles */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-muted-foreground">참조 스타일</h2>

            <div className="grid md:grid-cols-3 gap-4">
              {/* Style 1 */}
              <Card className="border-yellow-500/30 opacity-75">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">Style 1: Traditional</CardTitle>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600 text-[10px]">REF</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={style1Tab} onValueChange={setStyle1Tab}>
                    <TabsList className="grid w-full grid-cols-2 h-8">
                      <TabsTrigger value="scatter" className="text-xs">Scatter</TabsTrigger>
                      <TabsTrigger value="heatmap" className="text-xs">Heatmap</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Style 2 */}
              <Card className="border-yellow-500/30 opacity-75">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">Style 2: Segmented</CardTitle>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600 text-[10px]">REF</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={style2Tab} onValueChange={setStyle2Tab}>
                    <TabsList className="inline-flex h-8 w-auto">
                      <TabsTrigger value="scatter" className="text-xs">Scatter</TabsTrigger>
                      <TabsTrigger value="heatmap" className="text-xs">Heatmap</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Style 5 */}
              <Card className="border-yellow-500/30 opacity-75">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">Style 5: Icon-Only</CardTitle>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600 text-[10px]">REF</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="inline-flex items-center rounded-lg bg-muted p-1">
                    {[
                      { id: 'scatter', icon: ChartScatter },
                      { id: 'heatmap', icon: Flame },
                      { id: 'bar', icon: BarChart3 },
                      { id: 'line', icon: LineChart },
                      { id: 'table', icon: Table2 }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setStyle5Tab(tab.id)}
                        className={cn(
                          "p-1.5 rounded-md transition-all",
                          style5Tab === tab.id
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <tab.icon className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Styles Content */}
      {activeTab === 'sidebar' && (
        <div className="space-y-6">
          {/* Style Selector */}
          <div className="flex gap-2 p-4 bg-muted/30 rounded-lg">
            {(['A', 'B', 'C'] as const).map(style => (
              <button
                key={style}
                onClick={() => setSidebarStyle(style)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  sidebarStyle === style
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                )}
              >
                Style {style}: {style === 'A' ? 'Light' : style === 'B' ? 'Medium' : 'Full'}
              </button>
            ))}
          </div>

          {/* Sidebar Preview */}
          <Card>
            <CardHeader>
              <CardTitle>
                Style {sidebarStyle}: {sidebarStyle === 'A' ? 'Light' : sidebarStyle === 'B' ? 'Medium' : 'Full'}
              </CardTitle>
              <CardDescription>
                {sidebarStyle === 'A' && 'Minimal hover effects with dot indicator'}
                {sidebarStyle === 'B' && 'Glassmorphism header with item count badges'}
                {sidebarStyle === 'C' && 'Search bar with keyboard shortcuts'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6">
                {/* Sidebar Preview */}
                <div className={cn(
                  "w-64 rounded-xl border overflow-hidden",
                  sidebarStyle === 'B' && "bg-gradient-to-b from-background to-muted/30",
                  sidebarStyle === 'C' && "bg-background"
                )}>
                  {/* Header */}
                  <div className={cn(
                    "p-4 border-b",
                    sidebarStyle === 'B' && "backdrop-blur-sm bg-background/80"
                  )}>
                    {sidebarStyle === 'C' && (
                      <div className="mb-3 relative">
                        <input
                          type="text"
                          placeholder="섹션 검색..."
                          className="w-full px-3 py-1.5 text-sm rounded-lg bg-muted/50 border-0 focus:ring-2 focus:ring-primary/20"
                        />
                        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">K</kbd>
                      </div>
                    )}
                    <h3 className="font-semibold text-sm">Design System</h3>
                    <p className="text-xs text-muted-foreground">UI Showcase</p>
                  </div>

                  {/* Nav Items */}
                  <nav className="p-2 space-y-1">
                    {/* Foundations Category */}
                    <div className="space-y-0.5">
                      <button
                        onClick={() => setExpandedCats(prev =>
                          prev.includes('foundations')
                            ? prev.filter(c => c !== 'foundations')
                            : [...prev, 'foundations']
                        )}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                          sidebarStyle === 'A' && "hover:bg-violet-500/10 hover:text-violet-600",
                          sidebarStyle === 'B' && "hover:bg-violet-500/10",
                          sidebarStyle === 'C' && "hover:bg-muted"
                        )}
                      >
                        {sidebarStyle === 'A' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                        )}
                        <Palette className={cn(
                          "h-4 w-4",
                          sidebarStyle !== 'C' && "text-violet-500"
                        )} />
                        <span className="flex-1 text-left">Foundations</span>
                        {sidebarStyle === 'B' && (
                          <span className="text-[10px] bg-violet-500/20 text-violet-600 px-1.5 py-0.5 rounded-full">4</span>
                        )}
                        <ChevronDown className={cn(
                          "h-3.5 w-3.5 transition-transform",
                          expandedCats.includes('foundations') ? "rotate-0" : "-rotate-90"
                        )} />
                      </button>

                      {expandedCats.includes('foundations') && (
                        <div className={cn(
                          "ml-4 space-y-0.5",
                          sidebarStyle !== 'C' && "border-l-2 border-violet-200 dark:border-violet-800 pl-2"
                        )}>
                          {[
                            { id: 'colors', label: 'Colors', icon: Palette },
                            { id: 'typography', label: 'Typography', icon: Type },
                            { id: 'animations', label: 'Animations', icon: Zap },
                          ].map(item => (
                            <button
                              key={item.id}
                              onClick={() => setActiveSidebarItem(item.id)}
                              className={cn(
                                "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all",
                                activeSidebarItem === item.id
                                  ? sidebarStyle === 'A'
                                    ? "bg-violet-500 text-white"
                                    : sidebarStyle === 'B'
                                      ? "bg-violet-500/20 text-violet-700 dark:text-violet-300 font-medium"
                                      : "bg-primary text-primary-foreground"
                                  : cn(
                                      "text-muted-foreground",
                                      sidebarStyle === 'A' && "hover:bg-violet-500/10 hover:text-violet-600 hover:translate-x-1",
                                      sidebarStyle === 'B' && "hover:bg-muted/50",
                                      sidebarStyle === 'C' && "hover:bg-muted"
                                    )
                              )}
                            >
                              <item.icon className="h-3.5 w-3.5" />
                              {item.label}
                              {sidebarStyle === 'C' && item.id === 'colors' && (
                                <kbd className="ml-auto text-[9px] text-muted-foreground bg-muted px-1 rounded">1</kbd>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Components Category (collapsed) */}
                    <button className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-muted-foreground",
                      sidebarStyle === 'A' && "hover:bg-blue-500/10 hover:text-blue-600",
                      sidebarStyle === 'B' && "hover:bg-blue-500/10",
                      sidebarStyle === 'C' && "hover:bg-muted"
                    )}>
                      {sidebarStyle === 'A' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 opacity-50" />
                      )}
                      <GitCompare className={cn(
                        "h-4 w-4",
                        sidebarStyle !== 'C' && "text-blue-500 opacity-50"
                      )} />
                      <span className="flex-1 text-left">Components</span>
                      {sidebarStyle === 'B' && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-600 px-1.5 py-0.5 rounded-full opacity-50">5</span>
                      )}
                      <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                    </button>

                    {/* Dev Tools Category (collapsed) */}
                    <button className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-muted-foreground",
                      sidebarStyle === 'A' && "hover:bg-amber-500/10 hover:text-amber-600",
                      sidebarStyle === 'B' && "hover:bg-amber-500/10",
                      sidebarStyle === 'C' && "hover:bg-muted"
                    )}>
                      {sidebarStyle === 'A' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 opacity-50" />
                      )}
                      <Settings className={cn(
                        "h-4 w-4",
                        sidebarStyle !== 'C' && "text-amber-500 opacity-50"
                      )} />
                      <span className="flex-1 text-left">Developer Tools</span>
                      {sidebarStyle === 'B' && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded-full opacity-50">6</span>
                      )}
                      <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                    </button>
                  </nav>
                </div>

                {/* Style Description */}
                <div className="flex-1 space-y-4">
                  {sidebarStyle === 'A' && (
                    <div className="space-y-3">
                      <h4 className="font-medium">Style A: Light</h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <strong>점 표시자</strong> - 카테고리 색상 표시
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <strong>호버 애니메이션</strong> - 살짝 이동
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <strong>색상 호버</strong> - 호버 시 카테고리 색상
                        </li>
                      </ul>
                      <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-sm">
                        <p className="text-green-700 dark:text-green-300">현재 대비 최소 변경</p>
                      </div>
                    </div>
                  )}

                  {sidebarStyle === 'B' && (
                    <div className="space-y-3">
                      <h4 className="font-medium">Style B: Medium</h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <strong>글래스모피즘</strong> - backdrop-blur 헤더
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <strong>그라데이션</strong> - 미묘한 깊이감
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <strong>카운트 배지</strong> - 카테고리별 아이템 수
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <strong>소프트 활성</strong> - 배경 + 텍스트
                        </li>
                      </ul>
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
                        <p className="text-blue-700 dark:text-blue-300">모던하지만 과하지 않음</p>
                      </div>
                    </div>
                  )}

                  {sidebarStyle === 'C' && (
                    <div className="space-y-3">
                      <h4 className="font-medium">Style C: Full</h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <strong>검색바</strong> - 빠른 섹션 검색
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <strong>키보드 단축키</strong> - 숫자 키
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <strong>모노크롬</strong> - 색상 없음, 깔끔
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <strong>VS Code 스타일</strong> - 개발 도구 느낌
                        </li>
                      </ul>
                      <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg text-sm">
                        <p className="text-purple-700 dark:text-purple-300">파워 유저용</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle>빠른 참조</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">스타일</th>
                      <th className="text-left p-2 font-medium">특징</th>
                      <th className="text-left p-2 font-medium">적합한 용도</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-2 font-medium">A: Light</td>
                      <td className="p-2 text-muted-foreground">점 + 호버 애니메이션 + 색상 호버</td>
                      <td className="p-2 text-muted-foreground">최소 변경, 깔끔</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">B: Medium</td>
                      <td className="p-2 text-muted-foreground">글래스모피즘 + 그라데이션 + 카운트</td>
                      <td className="p-2 text-muted-foreground">모던, 시각적 계층</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">C: Full</td>
                      <td className="p-2 text-muted-foreground">검색 + 키보드 + 모노크롬</td>
                      <td className="p-2 text-muted-foreground">파워 유저, 대규모 네비</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
