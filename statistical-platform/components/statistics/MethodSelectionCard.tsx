'use client'

import React, { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CheckCircle, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MethodInfo {
  title: string
  subtitle: string
  description: string
  icon: ReactNode
  example: string
  assumptions: string[]
  equation?: string
}

interface MethodSelectionCardProps {
  methodInfo: MethodInfo
  isSelected: boolean
  onSelect: () => void
}

// 가정(assumptions) 툴팁 내용
const assumptionDescriptions: Record<string, string> = {
  '정규성': '데이터가 정규분포를 따라야 합니다',
  '등분산성': '각 집단의 분산이 동일해야 합니다',
  '독립성': '관측값들이 서로 독립적이어야 합니다',
  '선형성': '변수 간 선형 관계가 존재해야 합니다',
  '구형성': '반복측정 간 분산-공분산 행렬이 구형 가정을 만족해야 합니다',
  '선형성(로짓)': '로짓 변환된 확률과 독립변수 간 선형 관계가 있어야 합니다',
  '큰 표본': '충분히 큰 표본 크기가 필요합니다 (일반적으로 n > 30)',
  '다중공선성 없음': '독립변수들 간 강한 상관관계가 없어야 합니다'
}

export function MethodSelectionCard({
  methodInfo,
  isSelected,
  onSelect
}: MethodSelectionCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "cursor-pointer border-2 transition-all h-full",
          isSelected
            ? "border-primary bg-primary/5 shadow-lg"
            : "border-border hover:border-primary/50 hover:shadow-md"
        )}
        onClick={onSelect}
      >
        <CardHeader className="pb-3">
          {/* 아이콘 + 제목 (가로 배치) */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex-shrink-0">
              {methodInfo.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <CardTitle className="text-base leading-tight">
                    {methodInfo.title}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {methodInfo.subtitle}
                  </CardDescription>
                </div>
                {isSelected && (
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {methodInfo.description}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* 예시 */}
          <div className="text-xs">
            <span className="font-medium text-muted-foreground">예:</span>{' '}
            <span className="text-foreground">{methodInfo.example}</span>
          </div>

          {/* 가정 (툴팁 포함) */}
          <TooltipProvider>
            <div className="flex flex-wrap gap-1.5">
              {methodInfo.assumptions.map((assumption, idx) => (
                <Tooltip key={idx}>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="text-xs cursor-help hover:bg-primary/10 transition-colors"
                    >
                      {assumption}
                      <HelpCircle className="w-3 h-3 ml-1 opacity-50" />
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-sm">
                      {assumptionDescriptions[assumption] || assumption}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>

          {/* 수식 (선택적) */}
          {methodInfo.equation && (
            <div className="pt-2 border-t">
              <code className="text-xs bg-muted px-2 py-1 rounded block">
                {methodInfo.equation}
              </code>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
