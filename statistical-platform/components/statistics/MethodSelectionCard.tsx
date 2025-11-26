'use client'

import React, { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CheckCircle2 } from 'lucide-react'
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

export function MethodSelectionCard({
  methodInfo,
  isSelected,
  onSelect
}: MethodSelectionCardProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              className={cn(
                "cursor-pointer border transition-all h-full",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
              onClick={onSelect}
            >
              <CardContent className="p-4">
                {/* 아이콘 + 제목 */}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded flex-shrink-0">
                    {methodInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-sm leading-tight">
                          {methodInfo.title}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {methodInfo.subtitle}
                        </CardDescription>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </div>

                {/* 가정 태그 */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {methodInfo.assumptions.map((assumption, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-xs"
                    >
                      {assumption}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-md p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/20 rounded">
                {methodInfo.icon}
              </div>
              <p className="font-medium text-sm text-white">{methodInfo.title}</p>
            </div>
            <p className="text-xs text-white/80">{methodInfo.description}</p>
            <div className="pt-2 border-t border-white/20">
              <p className="text-xs text-white/90">
                <span className="font-medium">💡 예:</span> {methodInfo.example}
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
