'use client'

import { FileText, BarChart3, FlaskConical, Clock, AlertTriangle, CheckCircle2, XCircle, Database } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatisticalMethod, ValidationResults, StatisticalAssumptions } from '@/types/smart-flow'
import { VariableMapping } from '@/lib/statistics/variable-mapping'
import { cn } from '@/lib/utils'

// p-value 포맷팅 (매우 작은 값 처리)
function formatPValue(p: number): string {
    if (p < 0.001) return 'p < .001'
    return `p = ${p.toFixed(3)}`
}

interface AnalysisInfoCardProps {
    fileName?: string | null
    dataRows?: number
    dataColumns?: number
    method?: StatisticalMethod | null
    timestamp?: Date
    variableMapping?: VariableMapping | null
    validationResults?: ValidationResults | null
    assumptionResults?: StatisticalAssumptions | null
}

export function AnalysisInfoCard({
    fileName,
    dataRows,
    dataColumns,
    method,
    timestamp,
    variableMapping,
    validationResults,
    assumptionResults
}: AnalysisInfoCardProps) {
    // 변수 정보 추출
    const getVariablesInfo = () => {
        if (!variableMapping) return null

        const info: { label: string; value: string }[] = []

        // 종속변수
        if (variableMapping.dependentVar) {
            const vars = Array.isArray(variableMapping.dependentVar)
                ? variableMapping.dependentVar.join(', ')
                : variableMapping.dependentVar
            info.push({ label: '종속변수', value: vars })
        }

        // 독립변수
        if (variableMapping.independentVar) {
            const vars = Array.isArray(variableMapping.independentVar)
                ? variableMapping.independentVar.join(', ')
                : variableMapping.independentVar
            info.push({ label: '독립변수', value: vars })
        }

        // 그룹변수
        if (variableMapping.groupVar) {
            info.push({ label: '그룹변수', value: variableMapping.groupVar })
        }

        // Factor 변수들 (ANOVA)
        if (variableMapping.factors && Array.isArray(variableMapping.factors) && variableMapping.factors.length > 0) {
            info.push({ label: 'Factor 변수', value: variableMapping.factors.join(', ') })
        }

        // Paired 변수들
        if (variableMapping.pairedVars && Array.isArray(variableMapping.pairedVars) && variableMapping.pairedVars.length === 2) {
            info.push({ label: 'Paired 변수', value: variableMapping.pairedVars.join(' vs ') })
        }

        return info.length > 0 ? info : null
    }

    // 데이터 품질 요약
    const getDataQualitySummary = () => {
        if (!validationResults) return null

        const issues: { type: 'warning' | 'info'; text: string }[] = []

        // 결측값
        if (validationResults.missingValues > 0) {
            const totalCells = (dataRows ?? 0) * (validationResults.columnCount || 1)
            const missingPercent = totalCells > 0
                ? ((validationResults.missingValues / totalCells) * 100).toFixed(1)
                : '?'
            issues.push({
                type: 'warning',
                text: `결측값 ${validationResults.missingValues}개 (${missingPercent}%)`
            })
        }

        // 중복 행
        if (validationResults.duplicateRows && validationResults.duplicateRows > 0) {
            issues.push({
                type: 'warning',
                text: `중복 행 ${validationResults.duplicateRows}개`
            })
        }

        // 경고
        if (validationResults.warnings && validationResults.warnings.length > 0) {
            issues.push({
                type: 'warning',
                text: `${validationResults.warnings.length}개 경고`
            })
        }

        return issues
    }

    // 가정 검정 요약
    const getAssumptionSummary = () => {
        if (!assumptionResults) return null

        const checks: { name: string; passed: boolean; detail?: string }[] = []

        // 정규성 검정
        if (assumptionResults.normality) {
            const normalityResult = assumptionResults.normality
            let isNormal = true
            let detail = ''

            if (normalityResult.shapiroWilk) {
                isNormal = normalityResult.shapiroWilk.isNormal
                if (normalityResult.shapiroWilk.pValue !== undefined) {
                    detail = formatPValue(normalityResult.shapiroWilk.pValue)
                }
            } else if (normalityResult.group1 || normalityResult.group2) {
                const g1Normal = normalityResult.group1?.isNormal ?? true
                const g2Normal = normalityResult.group2?.isNormal ?? true
                isNormal = g1Normal && g2Normal
                detail = isNormal ? '모든 그룹 정규' : '일부 그룹 비정규'
            }

            checks.push({ name: '정규성', passed: isNormal, detail })
        }

        // 등분산성 검정
        if (assumptionResults.homogeneity) {
            const homogeneityResult = assumptionResults.homogeneity
            let isEqual = true
            let detail = ''

            if (homogeneityResult.levene) {
                isEqual = homogeneityResult.levene.equalVariance
                if (homogeneityResult.levene.pValue !== undefined) {
                    detail = formatPValue(homogeneityResult.levene.pValue)
                }
            }

            checks.push({ name: '등분산성', passed: isEqual, detail })
        }

        // 독립성 검정
        if (assumptionResults.independence?.durbin) {
            const durbinResult = assumptionResults.independence.durbin
            checks.push({
                name: '독립성',
                passed: durbinResult.isIndependent,
                detail: durbinResult.pValue !== undefined ? formatPValue(durbinResult.pValue) : undefined
            })
        }

        // 요약 결과
        if (assumptionResults.summary) {
            return {
                checks,
                meetsAssumptions: assumptionResults.summary.meetsAssumptions,
                recommendation: assumptionResults.summary.recommendation
            }
        }

        return checks.length > 0 ? { checks, meetsAssumptions: checks.every(c => c.passed) } : null
    }

    const variablesInfo = getVariablesInfo()
    const dataQuality = getDataQualitySummary()
    const assumptionSummary = getAssumptionSummary()

    return (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    분석 정보
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* 기본 정보 그리드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {fileName && (
                        <div className="flex items-start gap-3">
                            <FileText className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">파일명</p>
                                <p className="text-sm font-medium truncate" title={fileName}>
                                    {fileName}
                                </p>
                            </div>
                        </div>
                    )}

                    {(dataRows !== undefined || dataColumns !== undefined) && (
                        <div className="flex items-start gap-3">
                            <Database className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">데이터 크기</p>
                                <p className="text-sm font-medium">
                                    {dataRows !== undefined && `${dataRows.toLocaleString()}행`}
                                    {dataRows !== undefined && dataColumns !== undefined && ' × '}
                                    {dataColumns !== undefined && `${dataColumns}개 변수`}
                                </p>
                            </div>
                        </div>
                    )}

                    {method && (
                        <div className="flex items-start gap-3">
                            <FlaskConical className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">분석 방법</p>
                                <p className="text-sm font-medium">{method.name}</p>
                            </div>
                        </div>
                    )}

                    {timestamp && (
                        <div className="flex items-start gap-3">
                            <Clock className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">분석 시간</p>
                                <p className="text-sm font-medium">
                                    {timestamp.toLocaleString('ko-KR', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* 데이터 품질 요약 */}
                {dataQuality && dataQuality.length > 0 && (
                    <div className="pt-3 border-t">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            데이터 품질
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {dataQuality.map((item, idx) => (
                                <Badge
                                    key={idx}
                                    variant={item.type === 'warning' ? 'secondary' : 'outline'}
                                    className={cn(
                                        "text-xs",
                                        item.type === 'warning' && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                    )}
                                >
                                    {item.text}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* 가정 검정 요약 */}
                {assumptionSummary && assumptionSummary.checks.length > 0 && (
                    <div className="pt-3 border-t">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                {assumptionSummary.meetsAssumptions ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                ) : (
                                    <XCircle className="w-3.5 h-3.5 text-amber-600" />
                                )}
                                가정 검정
                            </p>
                            <Badge
                                variant="outline"
                                className={cn(
                                    "text-xs",
                                    assumptionSummary.meetsAssumptions
                                        ? "border-green-500 text-green-700 dark:text-green-400"
                                        : "border-amber-500 text-amber-700 dark:text-amber-400"
                                )}
                            >
                                {assumptionSummary.meetsAssumptions ? '충족' : '일부 위반'}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {assumptionSummary.checks.map((check, idx) => (
                                <Badge
                                    key={idx}
                                    variant="outline"
                                    className={cn(
                                        "text-xs gap-1",
                                        check.passed
                                            ? "border-green-300 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                            : "border-red-300 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                    )}
                                >
                                    {check.passed ? (
                                        <CheckCircle2 className="w-3 h-3" />
                                    ) : (
                                        <XCircle className="w-3 h-3" />
                                    )}
                                    {check.name}
                                    {check.detail && <span className="opacity-70">({check.detail})</span>}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* 변수 구성 */}
                {variablesInfo && variablesInfo.length > 0 && (
                    <div className="pt-3 border-t">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">변수 구성</p>
                        <div className="space-y-1.5">
                            {variablesInfo.map((item, idx) => (
                                <div key={idx} className="flex items-baseline gap-2 text-sm">
                                    <span className="text-muted-foreground min-w-[80px]">{item.label}:</span>
                                    <span className="font-medium">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
