'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { BookOpen, HelpCircle, Keyboard, Database, FileText, Search, X } from 'lucide-react'
import {
  HELP_CATEGORIES,
  getHelpSectionsByCategory,
  searchHelp,
  highlightMatch,
  SUGGESTED_QUERIES,
  type HelpCategory,
  type HelpSearchResult,
} from '@/lib/help'

interface HelpModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORY_ICONS: Record<HelpCategory, React.ReactNode> = {
  guide: <BookOpen className="h-4 w-4" />,
  faq: <HelpCircle className="h-4 w-4" />,
  shortcuts: <Keyboard className="h-4 w-4" />,
  variables: <FileText className="h-4 w-4" />,
  'data-format': <Database className="h-4 w-4" />,
}

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<HelpCategory | 'search'>('guide')

  // 검색 결과
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    return searchHelp(searchQuery, 15)
  }, [searchQuery])

  // 검색어 변경 시 검색 탭으로 전환
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (value.trim()) {
      setActiveTab('search')
    } else {
      // 검색어가 비워지면 가이드 탭으로 복귀
      setActiveTab('guide')
    }
  }, [])

  // 검색어 초기화
  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setActiveTab('guide')
  }, [])

  // 추천 검색어 클릭
  const handleSuggestedClick = useCallback((query: string) => {
    setSearchQuery(query)
    setActiveTab('search')
  }, [])

  // 검색 결과 항목의 카테고리로 이동
  const handleResultClick = useCallback((result: HelpSearchResult) => {
    setSearchQuery('')
    setActiveTab(result.item.category)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] w-[95vw]">
        <DialogHeader>
          <DialogTitle>도움말</DialogTitle>
          <DialogDescription>
            NIFS 통계 분석 플랫폼 사용 가이드
          </DialogDescription>
        </DialogHeader>

        {/* 검색창 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="검색어를 입력하세요 (예: 결측값, CSV, t-검정)"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 추천 검색어 */}
        {!searchQuery && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">추천:</span>
            {SUGGESTED_QUERIES.map((query) => (
              <Badge
                key={query}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80 text-xs"
                onClick={() => handleSuggestedClick(query)}
              >
                {query}
              </Badge>
            ))}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as HelpCategory | 'search')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {/* 검색 결과 탭 (검색어 있을 때만) */}
            {searchQuery && (
              <TabsTrigger value="search" className="gap-1">
                <Search className="h-4 w-4" />
                검색 ({searchResults.length})
              </TabsTrigger>
            )}
            {HELP_CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id} className="gap-1">
                {CATEGORY_ICONS[cat.id]}
                <span className="hidden sm:inline">{cat.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="h-[55vh] max-h-[450px] mt-4">
            {/* 검색 결과 */}
            <TabsContent value="search" className="space-y-3">
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>&quot;{searchQuery}&quot;에 대한 검색 결과가 없습니다.</p>
                  <p className="text-sm mt-1">다른 검색어를 입력해보세요.</p>
                </div>
              ) : (
                searchResults.map((result) => (
                  <Card
                    key={result.item.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleResultClick(result)}
                  >
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          <span
                            dangerouslySetInnerHTML={{
                              __html: highlightMatch(result.item.title, searchQuery),
                            }}
                          />
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {HELP_CATEGORIES.find(c => c.id === result.item.category)?.label}
                        </Badge>
                      </div>
                      {result.item.description && (
                        <CardDescription className="text-xs">
                          <span
                            dangerouslySetInnerHTML={{
                              __html: highlightMatch(result.item.description, searchQuery),
                            }}
                          />
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="py-2 px-4 pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        <span
                          dangerouslySetInnerHTML={{
                            __html: highlightMatch(result.item.content, searchQuery),
                          }}
                        />
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* 사용 가이드 */}
            <TabsContent value="guide" className="space-y-4">
              {getHelpSectionsByCategory('guide').map((section) => (
                <Card key={section.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    {section.description && (
                      <CardDescription>{section.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {section.items.map((item) => (
                      <div key={item.id}>
                        <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.content}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* FAQ */}
            <TabsContent value="faq" className="space-y-4">
              {getHelpSectionsByCategory('faq').flatMap((section) =>
                section.items.map((item) => (
                  <Card key={item.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{item.content}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* 단축키 */}
            <TabsContent value="shortcuts" className="space-y-4">
              {getHelpSectionsByCategory('shortcuts').map((section) => (
                <Card key={section.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {section.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <span className="text-sm">{item.title}</span>
                        <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600">
                          {item.content}
                        </kbd>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* 변수 선택 */}
            <TabsContent value="variables" className="space-y-4">
              {getHelpSectionsByCategory('variables').map((section) => (
                <Card key={section.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    {section.description && (
                      <CardDescription>{section.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {section.items.map((item) => (
                      <div key={item.id}>
                        <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{item.content}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* 데이터 형식 */}
            <TabsContent value="data-format" className="space-y-4">
              {getHelpSectionsByCategory('data-format').map((section) => (
                <Card key={section.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    {section.description && (
                      <CardDescription>{section.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {section.items.map((item) => (
                      <div key={item.id}>
                        <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{item.content}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
