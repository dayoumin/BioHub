import React from 'react'
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface EasyExplanationProps {
    pValue: number
    effectSize?: { value: number; type: string }
    isSignificant: boolean
    testType?: string
    alpha?: number
    className?: string
}

export function EasyExplanation({
    pValue,
    effectSize,
    isSignificant,
    testType,
    alpha = 0.05,
    className
}: EasyExplanationProps) {
    // Percentage for visual representation (probability of random occurrence)
    // p=0.05 means 5% chance. We show 100 blocks.
    const chancePercentage = Math.round(pValue * 1000) / 10

    // Generate 100 blocks
    // If p=0.023 (2.3%), we color 2 or 3 blocks.
    const totalBlocks = 100
    const coloredBlocks = Math.ceil(pValue * 100)

    return (
        <Card className={cn("overflow-hidden border-blue-100 bg-blue-50/20", className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    📊 이 결과가 의미하는 것은?
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <p className="text-sm leading-relaxed">
                        p = {pValue.toFixed(3)} → 이 차이가 우연히 나타날 확률은 <strong>{chancePercentage}%</strong>입니다.
                    </p>
                    <p className="text-sm leading-relaxed">
                        ➡️ 100번 중 {coloredBlocks}번만 우연히 나타날 정도로
                        <strong className={cn("ml-1", isSignificant ? "text-blue-700" : "text-gray-600")}>
                            {isSignificant ? "확실한 차이" : "차이가 불분명"}
                        </strong>
                        입니다!
                    </p>
                </div>

                {/* Visual Representation */}
                <div className="space-y-1">
                    <div className="flex flex-wrap gap-0.5">
                        {Array.from({ length: totalBlocks }).map((_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "w-1.5 h-4 rounded-[1px]",
                                    i < coloredBlocks ? "bg-red-500" : "bg-gray-200"
                                )}
                                title={i < coloredBlocks ? "우연히 나타날 가능성" : "신뢰할 수 있는 범위"}
                            />
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                        빨간색: 우연히 나타날 가능성 ({chancePercentage}%)
                    </p>
                </div>

                {/* Effect Size Explanation if available */}
                {effectSize && isSignificant && (
                    <div className="mt-2 text-sm bg-card/50 p-2 rounded border border-blue-100">
                        <span className="font-semibold">💡 효과 크기: </span>
                        {effectSize.value < 0.2 ? "차이가 있지만 실질적으로는 미미합니다." :
                            effectSize.value < 0.5 ? "중간 정도의 의미있는 차이입니다." :
                                "매우 크고 중요한 차이입니다!"}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
