'use client'

import { AlertTriangle, CheckCircle2, ClipboardCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { buildDocumentWritingDevelopmentChecklist } from '@/lib/research/document-writing-development-checklist'
import { cn } from '@/lib/utils'

export default function PaperWritingDevelopmentChecklist(): React.ReactElement {
  const checklist = buildDocumentWritingDevelopmentChecklist()
  const hasAttention = checklist.summary.attentionItems > 0

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 bg-surface-container-lowest"
          aria-label="자료 작성 개발 점검 열기"
        >
          <ClipboardCheck className="h-4 w-4" />
          개발 점검
          <Badge
            variant={hasAttention ? 'destructive' : 'secondary'}
            className="ml-1 rounded-full px-2 text-[10px]"
          >
            {checklist.summary.passedItems}/{checklist.summary.totalItems}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[420px] max-w-[calc(100vw-2rem)] p-0">
        <div className="bg-surface-container-lowest p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">자료 작성 개발 점검</p>
              <p className="mt-1 text-xs text-muted-foreground">
                통계, Bio-Tools, 유전 분석이 바뀔 때 writer 정책과 fallback 경계를 같이 확인합니다.
              </p>
            </div>
            <Badge variant={hasAttention ? 'destructive' : 'secondary'} className="shrink-0">
              {hasAttention ? `${checklist.summary.attentionItems}개 확인` : '정상'}
            </Badge>
          </div>

          <div className="mt-4 rounded-xl bg-surface-container-low p-3 text-xs text-muted-foreground">
            ready Bio-Tools {checklist.summary.readyBioToolCount}개 중{' '}
            {checklist.summary.dedicatedReadyBioToolCount}개 전용 writer 적용
          </div>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto bg-surface-container p-4">
          {checklist.sections.map((section) => (
            <section key={section.id} className="rounded-2xl bg-surface-container-lowest p-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">{section.title}</p>
                <p className="text-[11px] leading-4 text-muted-foreground">{section.description}</p>
              </div>
              <div className="mt-3 space-y-2">
                {section.items.map((item) => {
                  const Icon = item.status === 'pass' ? CheckCircle2 : AlertTriangle

                  return (
                    <div key={item.id} className="flex items-start gap-2 rounded-xl bg-surface-container-low px-3 py-2">
                      <Icon
                        className={cn(
                          'mt-0.5 h-3.5 w-3.5 shrink-0',
                          item.status === 'pass' ? 'text-sky-700' : 'text-destructive',
                        )}
                      />
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-medium text-foreground">{item.label}</p>
                        <p className="text-[11px] leading-4 text-muted-foreground">{item.detail}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
