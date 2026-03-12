'use client'

/**
 * AnalysisOptions — 분석 옵션 섹션
 *
 * Step 3 (VariableSelectionStep) 하단에 CollapsibleSection으로 표시.
 * alpha, 가정검정, 효과크기 토글 + one-sample 시 testValue 입력.
 */

import { useCallback } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'

interface AnalysisOptionsSectionProps {
  /** one-sample 메서드일 때 testValue 입력 표시 */
  showTestValue?: boolean
  className?: string
}

export function AnalysisOptionsSection({
  showTestValue = false,
  className,
}: AnalysisOptionsSectionProps) {
  const analysisOptions = useSmartFlowStore(state => state.analysisOptions)
  const setAnalysisOptions = useSmartFlowStore(state => state.setAnalysisOptions)

  const handleAlphaChange = useCallback((value: string) => {
    setAnalysisOptions({ alpha: parseFloat(value) })
  }, [setAnalysisOptions])

  const handleTestValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (raw === '' || raw === '-') {
      setAnalysisOptions({ testValue: undefined })
      return
    }
    const num = parseFloat(raw)
    if (!isNaN(num)) {
      setAnalysisOptions({ testValue: num })
    }
  }, [setAnalysisOptions])

  return (
    <div className={className} data-testid="analysis-options">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {/* Alpha (significance level) */}
        <div className="flex items-center justify-between">
          <Label htmlFor="alpha-select" className="text-xs text-muted-foreground">
            유의수준 (α)
          </Label>
          <Select
            value={String(analysisOptions.alpha)}
            onValueChange={handleAlphaChange}
          >
            <SelectTrigger id="alpha-select" className="w-[90px] h-8 text-xs" data-testid="alpha-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.01">0.01</SelectItem>
              <SelectItem value="0.05">0.05</SelectItem>
              <SelectItem value="0.1">0.10</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* testValue (one-sample only) */}
        {showTestValue && (
          <div className="flex items-center justify-between">
            <Label htmlFor="test-value-input" className="text-xs text-muted-foreground">
              기준값 (μ₀)
            </Label>
            <Input
              id="test-value-input"
              type="number"
              value={analysisOptions.testValue ?? ''}
              onChange={handleTestValueChange}
              placeholder="0"
              className="w-[90px] h-8 text-xs"
              data-testid="test-value-input"
            />
          </div>
        )}

        {/* Assumption tests toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="show-assumptions" className="text-xs text-muted-foreground">
            가정검정
          </Label>
          <Switch
            id="show-assumptions"
            checked={analysisOptions.showAssumptions}
            onCheckedChange={(checked) => setAnalysisOptions({ showAssumptions: checked })}
            data-testid="show-assumptions-switch"
          />
        </div>

        {/* Effect size toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="show-effect-size" className="text-xs text-muted-foreground">
            효과크기
          </Label>
          <Switch
            id="show-effect-size"
            checked={analysisOptions.showEffectSize}
            onCheckedChange={(checked) => setAnalysisOptions({ showEffectSize: checked })}
            data-testid="show-effect-size-switch"
          />
        </div>
      </div>
    </div>
  )
}
