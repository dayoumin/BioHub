import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, CheckCircle2, AlertCircle, BarChart3, Ruler } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NextStepsCardProps {
    isSignificant: boolean
    testType?: string
    assumptionsPassed: boolean
    hasPostHoc?: boolean
    className?: string
    onAction?: (action: string) => void
}

export function NextStepsCard({
    isSignificant,
    testType,
    assumptionsPassed,
    hasPostHoc,
    className,
    onAction
}: NextStepsCardProps) {

    const getSteps = () => {
        const steps = []

        if (isSignificant) {
            steps.push({
                icon: BarChart3,
                text: "박스플롯으로 그룹 간 차이를 시각화하세요",
                action: "visualize"
            })
            steps.push({
                icon: Ruler,
                text: "효과크기를 확인하여 실질적 의미를 평가하세요",
                action: "effect_size"
            })
            if (hasPostHoc) {
                steps.push({
                    icon: CheckCircle2,
                    text: "사후 검정(Post-hoc)으로 구체적인 차이의 위치를 확인하세요",
                    action: "post_hoc"
                })
            }
            steps.push({
                icon: CheckCircle2,
                text: "다른 변수들도 같은 패턴을 보이는지 확인하세요",
                action: "check_others"
            })
        } else {
            steps.push({
                icon: Ruler,
                text: "더 많은 데이터를 수집하여 검정력을 높여보세요",
                action: "collect_more"
            })
            if (!assumptionsPassed) {
                steps.push({
                    icon: AlertCircle,
                    text: "가정 위반 시 비모수 검정(Mann-Whitney U 등)을 고려하세요",
                    action: "alternatives"
                })
            }
            steps.push({
                icon: CheckCircle2,
                text: "다른 요인(공변량)이 결과에 영향을 주는지 확인하세요",
                action: "check_covariates"
            })
        }
        return steps
    }

    const steps = getSteps()

    return (
        <Card className={cn("bg-blue-50/30 border-blue-100", className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-blue-700">
                    <ArrowRight className="w-4 h-4" />
                    📝 다음 단계
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2">
                    {steps.map((step, idx) => (
                        <li
                            key={idx}
                            className={cn(
                                "flex items-start gap-2 text-sm text-slate-700 p-2 rounded-md transition-colors",
                                onAction && "hover:bg-blue-100/50 cursor-pointer"
                            )}
                            onClick={() => onAction?.(step.action)}
                        >
                            <step.icon className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                            <span>{step.text}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    )
}
