'use client'

import { memo, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Hash, Type } from 'lucide-react'
import { ColumnStatistics } from '@/types/smart-flow'

interface VariableGalleryProps {
    variables: ColumnStatistics[]
    data: any[]
    onVariableSelect: (variable: ColumnStatistics) => void
    selectedVariableId?: string
}

// Mini Histogram for Numeric Variables
const MiniHistogram = memo(({ data, variable }: { data: any[], variable: string }) => {
    const histogramData = useMemo(() => {
        if (!data) return []
        const values = data.map(d => Number(d[variable])).filter(v => !isNaN(v))
        if (values.length === 0) return []

        const min = Math.min(...values)
        const max = Math.max(...values)
        const range = max - min || 1
        const binCount = 10
        const binSize = range / binCount
        const bins = new Array(binCount).fill(0)

        values.forEach(v => {
            const binIndex = Math.min(Math.floor((v - min) / binSize), binCount - 1)
            bins[binIndex]++
        })

        const maxFreq = Math.max(...bins)
        return bins.map(count => count / (maxFreq || 1)) // Normalize to 0-1
    }, [data, variable])

    if (histogramData.length === 0) return <div className="h-full w-full bg-muted/20 rounded" />

    return (
        <div className="flex items-end h-full gap-[2px] w-full">
            {histogramData.map((height, i) => (
                <div
                    key={i}
                    className="bg-primary/60 hover:bg-primary/80 transition-colors rounded-t-[1px] flex-1"
                    style={{ height: `${Math.max(height * 100, 5)}%` }}
                />
            ))}
        </div>
    )
})

// Mini Bar Chart for Categorical Variables
const MiniBarChart = memo(({ topValues }: { topValues: { value: string; count: number }[] }) => {
    const normalizedData = useMemo(() => {
        if (!topValues || topValues.length === 0) return []
        const maxCount = Math.max(...topValues.map(v => v.count))
        return topValues.slice(0, 5).map(v => ({
            ...v,
            height: v.count / (maxCount || 1)
        }))
    }, [topValues])

    if (normalizedData.length === 0) return <div className="h-full w-full bg-muted/20 rounded" />

    return (
        <div className="flex flex-col justify-end h-full w-full gap-1">
            {normalizedData.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] h-1/5">
                    <div className="w-12 truncate text-muted-foreground text-right">{item.value}</div>
                    <div className="flex-1 h-full flex items-center">
                        <div
                            className="h-1.5 bg-secondary hover:bg-secondary/80 rounded-full transition-all"
                            style={{ width: `${Math.max(item.height * 100, 5)}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    )
})

export const VariableGallery = memo(function VariableGallery({
    variables,
    data,
    onVariableSelect,
    selectedVariableId
}: VariableGalleryProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {variables.map((variable) => (
                <Card
                    key={variable.name}
                    className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${selectedVariableId === variable.name ? 'border-primary ring-1 ring-primary' : ''
                        }`}
                    onClick={() => onVariableSelect(variable)}
                >
                    <CardHeader className="p-4 pb-2">
                        <div className="flex items-center justify-between">
                            <Badge variant={variable.type === 'numeric' ? 'default' : 'secondary'} className="text-xs">
                                {variable.type === 'numeric' ? <Hash className="w-3 h-3 mr-1" /> : <Type className="w-3 h-3 mr-1" />}
                                {variable.type === 'numeric' ? '수치형' : '범주형'}
                            </Badge>
                            {variable.missingCount > 0 && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 h-5">
                                    결측 {variable.missingCount}
                                </Badge>
                            )}
                        </div>
                        <CardTitle className="text-sm font-medium truncate mt-2" title={variable.name}>
                            {variable.name}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex justify-between">
                                <span>유효값</span>
                                <span className="font-mono">{(variable.count || variable.numericCount + variable.textCount) - variable.missingCount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>고유값</span>
                                <span className="font-mono">{variable.uniqueValues}</span>
                            </div>
                            {variable.type === 'numeric' && (
                                <>
                                    <div className="flex justify-between">
                                        <span>평균</span>
                                        <span className="font-mono">{variable.mean?.toFixed(2) ?? '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>표준편차</span>
                                        <span className="font-mono">{variable.std?.toFixed(2) ?? '-'}</span>
                                    </div>
                                </>
                            )}
                            {variable.type === 'categorical' && variable.topValues && variable.topValues.length > 0 && (
                                <div className="flex justify-between">
                                    <span>최빈값</span>
                                    <span className="font-mono truncate max-w-[80px]" title={String(variable.topValues[0].value)}>
                                        {String(variable.topValues[0].value)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Mini Visualization */}
                        <div className="mt-3 h-12 bg-muted/10 rounded overflow-hidden">
                            {variable.type === 'numeric' ? (
                                <MiniHistogram data={data} variable={variable.name} />
                            ) : (
                                <MiniBarChart topValues={variable.topValues || []} />
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div >
    )
})
