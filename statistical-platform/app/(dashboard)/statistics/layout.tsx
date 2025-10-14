'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  Home,
  ChevronDown,
  ChevronRight,
  Info,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react'
import { STATISTICS_MENU, STATISTICS_SUMMARY } from '@/lib/statistics/menu-config'

export default function StatisticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [openCategories, setOpenCategories] = useState<string[]>([])

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  return (
    <div className="flex h-screen">
      {/* 사이드바 */}
      <aside className="w-72 border-r bg-muted/10 flex-shrink-0">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                <span className="font-semibold">통계 분석</span>
              </div>
              <Badge variant="outline">
                {STATISTICS_SUMMARY.implementedMethods}/{STATISTICS_SUMMARY.totalMethods}
              </Badge>
            </div>

            <div className="text-sm text-muted-foreground px-2">
              <div>구현 완료: {STATISTICS_SUMMARY.completionRate}%</div>
            </div>

            <nav className="space-y-2">
              {STATISTICS_MENU.map((category) => (
                <Collapsible
                  key={category.id}
                  open={openCategories.includes(category.id)}
                  onOpenChange={() => toggleCategory(category.id)}
                >
                  <CollapsibleTrigger className="w-full">
                    <Button
                      variant="ghost"
                      className="w-full justify-between hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <category.icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{category.title}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {category.items.filter(item => item.implemented).length}/{category.items.length}
                        </Badge>
                        {openCategories.includes(category.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 px-2">
                    {category.items.map((item) => (
                      <Link
                        key={item.id}
                        href={item.implemented ? item.href : '#'}
                        className={cn(
                          !item.implemented && 'pointer-events-none opacity-50'
                        )}
                      >
                        <Button
                          variant="ghost"
                          className={cn(
                            'w-full justify-start pl-6',
                            pathname === item.href && 'bg-muted'
                          )}
                          disabled={!item.implemented}
                        >
                          <div className="flex items-center gap-2 w-full min-w-0">
                            <div className="flex-1 text-left min-w-0">
                              <div className="text-sm font-medium truncate">{item.title}</div>
                              {item.subtitle && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {item.subtitle}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {item.badge && (
                                <Badge variant="default" className="text-xs">
                                  {item.badge}
                                </Badge>
                              )}
                              {item.implemented ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : item.comingSoon ? (
                                <Clock className="w-4 h-4 text-yellow-500" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </Button>
                      </Link>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </nav>

            <div className="pt-4 border-t space-y-2">
              <Link href="/dashboard">
                <Button variant="outline" className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  대시보드로
                </Button>
              </Link>
              <div className="px-2 py-1.5 rounded-md bg-muted/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="w-4 h-4" />
                  <span>41개 통계 메서드 제공</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}