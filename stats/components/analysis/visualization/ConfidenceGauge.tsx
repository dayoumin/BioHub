'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useTerminology } from '@/hooks/use-terminology'

interface ConfidenceGaugeProps {
    value: number // 0-100
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export function ConfidenceGauge({
    value,
    size = 'md',
    className
}: ConfidenceGaugeProps) {
    const t = useTerminology()
    // Animation state
    const [animatedValue, setAnimatedValue] = useState(0)

    useEffect(() => {
        const timer = setTimeout(() => setAnimatedValue(value), 100)
        return () => clearTimeout(timer)
    }, [value])

    const sizes = {
        sm: { width: 80, radius: 30, strokeWidth: 6, fontSize: 'text-xl' },
        md: { width: 112, radius: 40, strokeWidth: 8, fontSize: 'text-3xl' },
        lg: { width: 144, radius: 50, strokeWidth: 10, fontSize: 'text-4xl' }
    }

    const config = sizes[size]
    const circumference = 2 * Math.PI * config.radius
    const offset = circumference - (animatedValue / 100) * circumference

    // Color based on confidence level
    const colorClass = value >= 85 ? 'text-success' :
        value >= 70 ? 'text-info' :
            'text-warning'

    return (
        <div className={cn("relative inline-flex", className)} style={{ width: config.width, height: config.width }}>
            <svg className="transform -rotate-90" viewBox={`0 0 ${config.width} ${config.width}`}>
                {/* Background circle */}
                <circle
                    cx={config.width / 2}
                    cy={config.width / 2}
                    r={config.radius}
                    stroke="currentColor"
                    strokeWidth={config.strokeWidth}
                    fill="none"
                    className="text-muted opacity-20"
                />
                {/* Progress circle with animation */}
                <circle
                    cx={config.width / 2}
                    cy={config.width / 2}
                    r={config.radius}
                    stroke="currentColor"
                    strokeWidth={config.strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className={cn(colorClass, "transition-all duration-1000 ease-out")}
                    strokeLinecap="round"
                />
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn("font-bold", config.fontSize, colorClass)}>
                    {Math.round(animatedValue)}%
                </span>
                <span className="text-xs text-muted-foreground mt-1">{t.fitScore.confidenceLabel}</span>
            </div>
        </div>
    )
}
