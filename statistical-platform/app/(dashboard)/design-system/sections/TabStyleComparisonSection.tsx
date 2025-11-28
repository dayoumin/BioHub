'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { ChartScatter, BarChart3, LineChart, Table2, Flame, GitCommitHorizontal, Info } from 'lucide-react'

/**
 * Tab Style Comparison Section
 *
 * 2024-2025 Modern Tab/Segmented Control Styles
 *
 * Usage Guide:
 * - ContentTabs (Style 3: Underline): For switching between different content views
 * - FilterToggle (Style 4: Pill): For toggling options/filters within same content
 */
export function TabStyleComparisonSection() {
  const [style1Tab, setStyle1Tab] = useState('scatter')
  const [style2Tab, setStyle2Tab] = useState('scatter')
  const [style3Tab, setStyle3Tab] = useState('scatter')
  const [style4Tab, setStyle4Tab] = useState('histogram')
  const [style5Tab, setStyle5Tab] = useState('scatter')

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold mb-2">Tab Style Comparison</h1>
        <p className="text-muted-foreground">
          2024-2025 Modern Tab/Segmented Control Styles
        </p>
      </div>

      {/* ============================================
          Usage Guidelines (IMPORTANT)
      ============================================ */}
      <Card className="border-2 border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Usage Guidelines
          </CardTitle>
          <CardDescription>
            This app uses two tab styles for different purposes
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
                Use for switching between <strong>different content views</strong>
              </p>
              <div className="bg-muted/50 p-3 rounded-lg text-xs space-y-1">
                <p className="font-medium">Examples:</p>
                <ul className="text-muted-foreground space-y-0.5">
                  <li>• Scatter Plot ↔ Heatmap (different visualizations)</li>
                  <li>• Basic Stats ↔ Data Preview (different info)</li>
                  <li>• Analysis tabs in results page</li>
                </ul>
              </div>
              {/* Live Preview */}
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
                Use for toggling <strong>options within same content</strong>
              </p>
              <div className="bg-muted/50 p-3 rounded-lg text-xs space-y-1">
                <p className="font-medium">Examples:</p>
                <ul className="text-muted-foreground space-y-0.5">
                  <li>• Histogram ↔ Boxplot (same data, different chart)</li>
                  <li>• View mode toggles</li>
                  <li>• Chart type selectors</li>
                </ul>
              </div>
              {/* Live Preview */}
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

          {/* Quick Decision Guide */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
            <p className="text-sm font-medium mb-2">Quick Decision:</p>
            <div className="text-sm text-muted-foreground">
              <p><strong>Q: Does clicking change the entire content area?</strong></p>
              <p className="ml-4">→ Yes: Use <Badge variant="outline" className="text-xs">ContentTabs</Badge> (Underline)</p>
              <p className="ml-4">→ No, just changes how data is displayed: Use <Badge variant="outline" className="text-xs">FilterToggle</Badge> (Pill)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================
          Style 3: Underline (ContentTabs) - PRIMARY
      ============================================ */}
      <Card className="border-blue-500/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Style 3: Underline Tabs</CardTitle>
            <Badge className="bg-blue-500">ContentTabs</Badge>
          </div>
          <CardDescription>
            Google / GitHub style - For switching between different content views
          </CardDescription>
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
          <div className="mt-4 h-32 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
            {style3Tab === 'scatter' ? 'Scatter Plot Content' : 'Heatmap Content'}
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
            <p className="font-medium text-blue-800 dark:text-blue-200">When to use:</p>
            <ul className="text-blue-700 dark:text-blue-300 text-xs mt-1 space-y-0.5">
              <li>• Switching between different content/views</li>
              <li>• Tab content is substantially different</li>
              <li>• Navigation-like behavior within a section</li>
            </ul>
          </div>

          {/* Code Example */}
          <div className="mt-4">
            <p className="text-xs font-medium mb-2">Implementation:</p>
            <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
              <code>{`// ContentTabs - Underline Style
<div className="border-b">
  <div className="flex gap-6">
    {tabs.map(tab => (
      <button
        onClick={() => setActiveTab(tab.id)}
        className={cn(
          "flex items-center gap-1.5 pb-3 text-sm font-medium relative",
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
</div>`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* ============================================
          Style 4: Pill Toggle (FilterToggle) - PRIMARY
      ============================================ */}
      <Card className="border-purple-500/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Style 4: Pill Toggle</CardTitle>
            <Badge className="bg-purple-500">FilterToggle</Badge>
          </div>
          <CardDescription>
            Stripe / Tailwind UI style - For toggling display options
          </CardDescription>
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
          <div className="mt-4 h-32 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
            {style4Tab === 'histogram' ? 'Histogram Chart' : 'Boxplot Chart'}
          </div>

          <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg text-sm">
            <p className="font-medium text-purple-800 dark:text-purple-200">When to use:</p>
            <ul className="text-purple-700 dark:text-purple-300 text-xs mt-1 space-y-0.5">
              <li>• Same data, different visualization</li>
              <li>• Filter or view mode toggles</li>
              <li>• Options that don&apos;t change the overall context</li>
            </ul>
          </div>

          {/* Code Example */}
          <div className="mt-4">
            <p className="text-xs font-medium mb-2">Implementation:</p>
            <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
              <code>{`// FilterToggle - Pill Style
<div className="flex gap-2">
  {options.map(option => (
    <button
      onClick={() => setSelected(option.id)}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
        selected === option.id
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
    >
      <option.icon className="h-4 w-4" />
      {option.label}
    </button>
  ))}
</div>`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* ============================================
          Reference Styles (1, 2, 5)
      ============================================ */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-muted-foreground">Reference Styles (Not Recommended)</h2>
        <p className="text-sm text-muted-foreground">
          These styles are shown for comparison. They are either outdated or for specific use cases.
        </p>
      </div>

      {/* Style 1: Traditional (Reference) */}
      <Card className="border-yellow-500/30 opacity-75">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Style 1: Traditional Tabs</CardTitle>
            <Badge variant="outline" className="text-yellow-600 border-yellow-600 text-xs">REFERENCE</Badge>
          </div>
          <CardDescription className="text-xs">
            shadcn/ui default - Full width grid. Looks similar to Style 2 due to default styling.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={style1Tab} onValueChange={setStyle1Tab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="scatter">
                <ChartScatter className="h-4 w-4 mr-2" />
                Scatter
              </TabsTrigger>
              <TabsTrigger value="heatmap">
                <Flame className="h-4 w-4 mr-2" />
                Heatmap
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="mt-3 text-xs text-muted-foreground">
            Note: Uses <code>grid w-full grid-cols-2</code> but shadcn defaults make it look like segmented control.
          </p>
        </CardContent>
      </Card>

      {/* Style 2: Segmented Control (Reference) */}
      <Card className="border-yellow-500/30 opacity-75">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Style 2: Segmented Control</CardTitle>
            <Badge variant="outline" className="text-yellow-600 border-yellow-600 text-xs">REFERENCE</Badge>
          </div>
          <CardDescription className="text-xs">
            Apple/Vercel style - Compact inline. Visually similar to Style 1 with shadcn defaults.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={style2Tab} onValueChange={setStyle2Tab} className="w-full">
            <TabsList className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-auto">
              <TabsTrigger value="scatter">
                <ChartScatter className="h-4 w-4 mr-1.5" />
                Scatter
              </TabsTrigger>
              <TabsTrigger value="heatmap">
                <Flame className="h-4 w-4 mr-1.5" />
                Heatmap
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="mt-3 text-xs text-muted-foreground">
            Note: Uses <code>inline-flex w-auto</code> for content-fit width.
          </p>
        </CardContent>
      </Card>

      {/* Style 5: Icon-Only (Reference) */}
      <Card className="border-yellow-500/30 opacity-75">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Style 5: Icon-Only Segment</CardTitle>
            <Badge variant="outline" className="text-yellow-600 border-yellow-600 text-xs">REFERENCE</Badge>
          </div>
          <CardDescription className="text-xs">
            Figma/VS Code style - Ultra compact. Use only when icons are self-explanatory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="inline-flex items-center rounded-lg bg-muted p-1">
            {[
              { id: 'scatter', icon: ChartScatter, label: 'Scatter Plot' },
              { id: 'heatmap', icon: Flame, label: 'Heatmap' },
              { id: 'bar', icon: BarChart3, label: 'Bar Chart' },
              { id: 'line', icon: LineChart, label: 'Line Chart' },
              { id: 'table', icon: Table2, label: 'Table' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStyle5Tab(tab.id)}
                title={tab.label}
                className={cn(
                  "p-2 rounded-md transition-all",
                  style5Tab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Best for 5+ options or toolbar-like interfaces. Requires tooltips.
          </p>
        </CardContent>
      </Card>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Style</th>
                  <th className="text-left p-2 font-medium">Name</th>
                  <th className="text-left p-2 font-medium">Use Case</th>
                  <th className="text-center p-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr className="bg-blue-50/50 dark:bg-blue-950/20">
                  <td className="p-2">3</td>
                  <td className="p-2 font-medium">ContentTabs (Underline)</td>
                  <td className="p-2 text-muted-foreground">Different content views</td>
                  <td className="p-2 text-center"><Badge className="bg-blue-500 text-xs">USE</Badge></td>
                </tr>
                <tr className="bg-purple-50/50 dark:bg-purple-950/20">
                  <td className="p-2">4</td>
                  <td className="p-2 font-medium">FilterToggle (Pill)</td>
                  <td className="p-2 text-muted-foreground">Options/filters</td>
                  <td className="p-2 text-center"><Badge className="bg-purple-500 text-xs">USE</Badge></td>
                </tr>
                <tr className="opacity-60">
                  <td className="p-2">1</td>
                  <td className="p-2">Traditional (Grid)</td>
                  <td className="p-2 text-muted-foreground">Legacy reference</td>
                  <td className="p-2 text-center"><Badge variant="outline" className="text-xs">REF</Badge></td>
                </tr>
                <tr className="opacity-60">
                  <td className="p-2">2</td>
                  <td className="p-2">Segmented Control</td>
                  <td className="p-2 text-muted-foreground">Legacy reference</td>
                  <td className="p-2 text-center"><Badge variant="outline" className="text-xs">REF</Badge></td>
                </tr>
                <tr className="opacity-60">
                  <td className="p-2">5</td>
                  <td className="p-2">Icon-Only</td>
                  <td className="p-2 text-muted-foreground">Toolbar (5+ options)</td>
                  <td className="p-2 text-center"><Badge variant="outline" className="text-xs">REF</Badge></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}