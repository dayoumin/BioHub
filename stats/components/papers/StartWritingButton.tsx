'use client'

import type { LucideIcon } from 'lucide-react'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StartWritingButtonProps {
  label: string
  pendingLabel?: string
  onClick: () => void
  disabled?: boolean
  pending?: boolean
  testId?: string
  title?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  icon?: LucideIcon
}

export default function StartWritingButton({
  label,
  pendingLabel = '문서 준비 중...',
  onClick,
  disabled = false,
  pending = false,
  testId,
  title,
  variant = 'default',
  size = 'default',
  className,
  icon: Icon = Plus,
}: StartWritingButtonProps): React.ReactElement {
  const CurrentIcon = pending ? Loader2 : Icon

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled || pending}
      data-testid={testId}
      title={title}
      className={className}
    >
      <CurrentIcon className={`w-4 h-4 ${pending ? 'animate-spin' : ''}`} />
      {pending ? pendingLabel : label}
    </Button>
  )
}
