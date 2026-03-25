/**
 * WarningBanner — amber 경고 배너 공통 컴포넌트
 *
 * shadcn Alert의 warning variant 위에 얹은 편의 래퍼.
 * 12+ 곳에서 수동 작성되던 amber 배너 패턴을 통일.
 *
 * @example
 * <WarningBanner>선택한 변수가 분석 조건에 맞지 않습니다.</WarningBanner>
 * <WarningBanner title="주의" items={['결측값 5건', '이상치 3건']} />
 */

import { AlertTriangle } from 'lucide-react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface WarningBannerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** 제목 (선택) */
  title?: string
  /** 본문 또는 children */
  children?: React.ReactNode
  /** 경고 항목 목록 (선택) */
  items?: string[]
  /** 아이콘 교체 (기본: AlertTriangle) */
  icon?: React.ReactNode
}

export function WarningBanner({ title, children, items, icon, className, ...rest }: WarningBannerProps): React.ReactElement {
  return (
    <Alert variant="warning" className={cn('text-sm', className)} {...rest}>
      {icon ?? <AlertTriangle />}
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>
        {children}
        {items && items.length > 0 && (
          <ul className="mt-1 list-disc pl-4 space-y-0.5">
            {items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  )
}
