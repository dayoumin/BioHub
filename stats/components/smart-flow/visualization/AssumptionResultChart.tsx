'use client'

import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTerminology } from '@/hooks/use-terminology'

interface Assumption {
    name: string
    passed: boolean
    pValue?: number
}

interface AssumptionResultChartProps {
    assumptions: Assumption[]
    className?: string
}

export function AssumptionResultChart({
    assumptions,
    className
}: AssumptionResultChartProps) {
    const t = useTerminology()
    const passedCount = assumptions.filter(a => a.passed).length
    const totalCount = assumptions.length
    const passRate = (passedCount / totalCount) * 100

    return (
        <div className={cn("space-y-3", className)}>
            {/* Summary Bar */}
            <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                        className="h-full bg-success transition-all duration-1000"
                        style={{ width: `${passRate}%` }}
                    />
                </div>
                <span className="text-sm font-medium whitespace-nowrap">
                    {passedCount}/{totalCount} {t.dataExploration.assumptions.passed}
                </span>
            </div>

            {/* Individual Results */}
            <div className="space-y-2">
                {assumptions.map((assumption, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "flex items-center justify-between p-2.5 rounded-lg",
                            "transition-colors",
                            assumption.passed ? "bg-success-bg" : "bg-error-bg"
                        )}
                    >
                        <span className="text-sm font-medium">{assumption.name}</span>
                        <div className="flex items-center gap-2">
                            {assumption.pValue !== undefined && (
                                <span className="text-xs text-muted-foreground font-mono">
                                    p = {assumption.pValue.toFixed(3)}
                                </span>
                            )}
                            {assumption.passed ? (
                                <div className="flex items-center gap-1 text-success">
                                    <Check className="w-4 h-4" />
                                    <span className="text-xs font-medium">{t.dataExploration.assumptions.passed}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 text-error">
                                    <X className="w-4 h-4" />
                                    <span className="text-xs font-medium">{t.dataExploration.assumptions.failed}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
