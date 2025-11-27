'use client'

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Maximize2 } from 'lucide-react'
import { ColumnStatistics, DataRow } from '@/types/smart-flow'
import { Histogram } from '@/components/charts/histogram'
import { BoxPlot } from '@/components/charts/boxplot'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface VariableDetailPanelProps {
    variable: ColumnStatistics
    data: DataRow[]
    onClose: () => void
}

export const VariableDetailPanel = memo(function VariableDetailPanel({
    variable,
    data,
    onClose
}: VariableDetailPanelProps) {
    const numericData = variable.type === 'numeric'
        ? data.map(row => Number(row[variable.name])).filter(v => !isNaN(v))
        : []

    return (
        <div className="h-full flex flex-col bg-background border-l shadow-xl w-[400px] fixed right-0 top-0 bottom-0 z-50 animate-in slide-in-from-right">
            <div className="flex items-center justify-between p-4 border-b">
                <div>
                    <h3 className="font-semibold text-lg">{variable.name}</h3>
                    <p className="text-sm text-muted-foreground">
                        {variable.type === 'numeric' ? '수치형 변수 상세 분석' : '범주형 변수 상세 분석'}
                    </p>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="w-5 h-5" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Statistics Summary */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">기초 통계량</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground block">총 데이터</span>
                                <span className="font-mono font-medium">{variable.count}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block">결측치</span>
                                <span className="font-mono font-medium text-destructive">{variable.missingCount}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block">고유값</span>
                                <span className="font-mono font-medium">{variable.uniqueValues}</span>
                            </div>
                            {variable.type === 'numeric' && (
                                <>
                                    <div>
                                        <span className="text-muted-foreground block">평균</span>
                                        <span className="font-mono font-medium">{variable.mean?.toFixed(3)}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">표준편차</span>
                                        <span className="font-mono font-medium">{variable.std?.toFixed(3)}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">중앙값</span>
                                        <span className="font-mono font-medium">{variable.median?.toFixed(3)}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">최소/최대</span>
                                        <span className="font-mono font-medium">{variable.min?.toFixed(2)} ~ {variable.max?.toFixed(2)}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">왜도</span>
                                        <span className="font-mono font-medium">{variable.skewness?.toFixed(3)}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">첨도</span>
                                        <span className="font-mono font-medium">{variable.kurtosis?.toFixed(3)}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Visualization */}
                {variable.type === 'numeric' && numericData.length > 0 && (
                    <div className="space-y-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">분포 시각화</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="histogram">
                                    <TabsList className="grid w-full grid-cols-2 mb-4">
                                        <TabsTrigger value="histogram">히스토그램</TabsTrigger>
                                        <TabsTrigger value="boxplot">박스플롯</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="histogram" className="h-[250px]">
                                        <Histogram
                                            data={numericData}
                                            title={`${variable.name} 분포`}
                                            height={250}
                                        />
                                    </TabsContent>
                                    <TabsContent value="boxplot" className="h-[250px]">
                                        <BoxPlot
                                            data={[{
                                                name: variable.name,
                                                min: variable.min || 0,
                                                q1: variable.q1 || 0,
                                                median: variable.median || 0,
                                                q3: variable.q3 || 0,
                                                max: variable.max || 0,
                                                outliers: [] // TODO: Pass actual outliers
                                            }]}
                                            height={250}
                                        />
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    )
})
