'use client'

import { memo, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  FileText,
  Clock,
  ChevronRight,
  Sparkles,
  Trash2,
  MoreVertical
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useTemplateStore } from '@/lib/stores/template-store'
import type { AnalysisTemplate } from '@/types/smart-flow'
import { cn } from '@/lib/utils'

interface TemplateSelectorProps {
  /** 템플릿 선택 시 콜백 */
  onSelect?: (template: AnalysisTemplate) => void
  /** 전체보기 클릭 시 콜백 */
  onViewAll?: () => void
  /** 컴팩트 모드 (Step 1 내장용) */
  compact?: boolean
  /** 최대 표시 개수 */
  maxItems?: number
  /** 클래스명 */
  className?: string
}

/**
 * 템플릿 선택 컴포넌트
 * Step 1 데이터 업로드 화면에 표시됨
 */
export const TemplateSelector = memo(function TemplateSelector({
  onSelect,
  onViewAll,
  compact = false,
  maxItems = 5,
  className
}: TemplateSelectorProps) {
  const {
    recentTemplates,
    isLoading,
    loadTemplates,
    selectTemplate,
    removeTemplate
  } = useTemplateStore()

  // 초기 로드
  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const handleSelect = useCallback((template: AnalysisTemplate) => {
    selectTemplate(template)
    onSelect?.(template)
  }, [selectTemplate, onSelect])

  const handleDelete = useCallback(async (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation()
    await removeTemplate(templateId)
  }, [removeTemplate])

  // 상대 시간 포맷
  const formatRelativeTime = useCallback((timestamp: number | null): string => {
    if (!timestamp) return ''

    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '방금 전'
    if (minutes < 60) return `${minutes}분 전`
    if (hours < 24) return `${hours}시간 전`
    if (days < 7) return `${days}일 전`
    return new Date(timestamp).toLocaleDateString('ko-KR')
  }, [])

  // 카테고리 한글 변환
  const getCategoryLabel = useCallback((category: string): string => {
    const labels: Record<string, string> = {
      'descriptive': '기술통계',
      't-test': 't-검정',
      'anova': '분산분석',
      'regression': '회귀분석',
      'correlation': '상관분석',
      'chi-square': '카이제곱',
      'nonparametric': '비모수',
      'advanced': '고급분석',
      'timeseries': '시계열',
      'pca': 'PCA',
      'clustering': '군집분석',
      'psychometrics': '심리측정',
      'design': '실험설계',
      'survival': '생존분석'
    }
    return labels[category] || category
  }, [])

  // 템플릿이 없으면 표시 안 함
  if (recentTemplates.length === 0 && !isLoading) {
    return null
  }

  const displayTemplates = recentTemplates.slice(0, maxItems)

  // 컴팩트 모드 (Step 1 내장)
  if (compact) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>저장된 템플릿</span>
            <Badge variant="secondary" className="text-xs">
              {recentTemplates.length}
            </Badge>
          </div>
          {recentTemplates.length > maxItems && onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll} className="h-7 text-xs">
              전체보기
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            불러오는 중...
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {displayTemplates.map(template => (
              <Button
                key={template.id}
                variant="outline"
                size="sm"
                onClick={() => handleSelect(template)}
                className="h-auto py-1.5 px-3 text-left justify-start gap-2 group hover:border-primary/50"
              >
                <Badge variant="secondary" className="text-[10px] px-1.5">
                  {getCategoryLabel(template.method.category)}
                </Badge>
                <span className="truncate max-w-[120px]">{template.name}</span>
                {template.usageCount > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    ({template.usageCount}회)
                  </span>
                )}
              </Button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // 전체 모드 (패널/모달용)
  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5" />
            저장된 템플릿
          </CardTitle>
          <Badge variant="outline">{recentTemplates.length}개</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="space-y-1 p-4 pt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              displayTemplates.map(template => (
                <div
                  key={template.id}
                  className="group flex items-center gap-3 p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => handleSelect(template)}
                >
                  {/* 아이콘 */}
                  <div className="shrink-0 p-2 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{template.name}</span>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {getCategoryLabel(template.method.category)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{template.method.name}</span>
                      {template.description && (
                        <>
                          <span>·</span>
                          <span className="truncate">{template.description}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(template.lastUsedAt || template.createdAt)}
                      </span>
                      {template.usageCount > 0 && (
                        <span>{template.usageCount}회 사용</span>
                      )}
                    </div>
                  </div>

                  {/* 액션 */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => handleDelete(e as unknown as React.MouseEvent, template.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* 화살표 */}
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
})

export default TemplateSelector
