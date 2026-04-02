import { memo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NONE_VALUE } from './bio-styles'

interface BioColumnSelectProps {
  label: string
  headers: string[]
  value: string
  onChange: (value: string) => void
  width?: number
  labelSize?: 'sm' | 'xs'
  allowNone?: boolean
  noneLabel?: string
  layout?: 'inline' | 'stacked'
}

export const BioColumnSelect = memo(function BioColumnSelect({
  label,
  headers,
  value,
  onChange,
  width = 180,
  labelSize = 'sm',
  allowNone = false,
  noneLabel = '없음',
  layout = 'inline',
}: BioColumnSelectProps): React.ReactElement {
  const displayValue = allowNone && !value ? NONE_VALUE : (value || undefined)
  const handleChange = (v: string): void => {
    onChange(allowNone && v === NONE_VALUE ? '' : v)
  }

  const wrapperClass = layout === 'stacked' ? 'space-y-1' : 'flex items-center gap-2'
  const labelSuffix = layout === 'stacked' ? '' : ':'

  return (
    <div className={wrapperClass}>
      <label className={`${labelSize === 'xs' ? 'text-xs' : 'text-sm'} text-muted-foreground whitespace-nowrap`}>{label}{labelSuffix}</label>
      <Select value={displayValue} onValueChange={handleChange}>
        <SelectTrigger className="h-8 text-sm" style={{ width: `${width}px` }}>
          <SelectValue placeholder="선택..." />
        </SelectTrigger>
        <SelectContent>
          {allowNone && <SelectItem value={NONE_VALUE}>{noneLabel}</SelectItem>}
          {headers.map((h) => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
})
