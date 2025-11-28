'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Palette, Type, Zap, ChevronDown, Settings, GitCompare } from 'lucide-react'

/**
 * Sidebar Styles Section
 *
 * Design System Sidebar Navigation Style Options
 * - Style A: Light (hover animation + dot indicator)
 * - Style B: Medium (glassmorphism + count badge)
 * - Style C: Full (search + keyboard shortcuts)
 */
export function SidebarStylesSection() {
  const [sidebarStyle, setSidebarStyle] = useState<'A' | 'B' | 'C'>('A')
  const [activeSidebarItem, setActiveSidebarItem] = useState('colors')
  const [expandedCats, setExpandedCats] = useState(['foundations'])

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold mb-2">Sidebar Styles</h1>
        <p className="text-muted-foreground">
          Design System sidebar navigation style options
        </p>
      </div>

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
                      placeholder="Search sections..."
                      className="w-full px-3 py-1.5 text-sm rounded-lg bg-muted/50 border-0 focus:ring-2 focus:ring-primary/20"
                    />
                    <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
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
                      <strong>Dot indicator</strong> - Category color display
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <strong>Hover animation</strong> - Slight translate-x movement
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <strong>Color hover</strong> - Category color on hover
                    </li>
                  </ul>
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-sm">
                    <p className="text-green-700 dark:text-green-300">Minimal changes from current style</p>
                  </div>
                </div>
              )}

              {sidebarStyle === 'B' && (
                <div className="space-y-3">
                  <h4 className="font-medium">Style B: Medium</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <strong>Glassmorphism header</strong> - backdrop-blur + translucent
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <strong>Gradient background</strong> - Subtle depth
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <strong>Count badge</strong> - Items per category
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <strong>Soft active style</strong> - Background + text color
                    </li>
                  </ul>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
                    <p className="text-blue-700 dark:text-blue-300">Modern but not overwhelming</p>
                  </div>
                </div>
              )}

              {sidebarStyle === 'C' && (
                <div className="space-y-3">
                  <h4 className="font-medium">Style C: Full</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <strong>Search bar</strong> - Quick section search with ⌘K
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <strong>Keyboard shortcuts</strong> - Number keys for quick nav
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <strong>Monochrome design</strong> - No colors, clean look
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <strong>VS Code style</strong> - Developer tool feel
                    </li>
                  </ul>
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg text-sm">
                    <p className="text-purple-700 dark:text-purple-300">For power users</p>
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
          <CardTitle>Quick Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Style</th>
                  <th className="text-left p-2 font-medium">Features</th>
                  <th className="text-left p-2 font-medium">Best For</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-2 font-medium">A: Light</td>
                  <td className="p-2 text-muted-foreground">Dot + hover animation + color hover</td>
                  <td className="p-2 text-muted-foreground">Minimal change, clean look</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">B: Medium</td>
                  <td className="p-2 text-muted-foreground">Glassmorphism + gradient + count badge</td>
                  <td className="p-2 text-muted-foreground">Modern feel, visual hierarchy</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">C: Full</td>
                  <td className="p-2 text-muted-foreground">Search + keyboard + monochrome</td>
                  <td className="p-2 text-muted-foreground">Power users, large nav</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
