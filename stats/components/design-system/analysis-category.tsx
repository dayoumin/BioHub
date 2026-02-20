"use client"

import React from 'react'
import { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useComponentStyles } from '@/lib/design-system/theme-provider'
import { cn } from '@/lib/utils'

// Types for compound component
interface AnalysisCategoryContextType {
  categoryId: string
}

const AnalysisCategoryContext = React.createContext<AnalysisCategoryContextType | undefined>(undefined)

// Main compound component
interface AnalysisCategoryProps {
  children: React.ReactNode
  categoryId: string
  className?: string
}

function AnalysisCategory({ children, categoryId, className }: AnalysisCategoryProps) {
  const headerStyles = useComponentStyles('analysisCategory', 'header')
  
  return (
    <AnalysisCategoryContext.Provider value={{ categoryId }}>
      <Card className={cn(headerStyles, className)}>
        {children}
      </Card>
    </AnalysisCategoryContext.Provider>
  )
}

// Header subcomponent
interface AnalysisCategoryHeaderProps {
  icon: LucideIcon
  title: string
  description: string
  count: number
  className?: string
}

function AnalysisCategoryHeader({ 
  icon: Icon, 
  title, 
  description, 
  count,
  className 
}: AnalysisCategoryHeaderProps) {
  const titleStyles = useComponentStyles('analysisCategory', 'title')
  const descriptionStyles = useComponentStyles('analysisCategory', 'description')
  const badgeStyles = useComponentStyles('analysisCategory', 'badge')
  const iconStyles = useComponentStyles('analysisCategory', 'icon')
  
  return (
    <CardHeader className={cn("pb-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-muted/30 border border-border">
            <Icon className={iconStyles} />
          </div>
          <div className="space-y-1">
            <h2 className={titleStyles}>{title}</h2>
            <p className={descriptionStyles}>{description}</p>
          </div>
        </div>
        <div className={cn(badgeStyles, "font-medium")}>
          {count}개 분석
        </div>
      </div>
    </CardHeader>
  )
}

// Grid subcomponent  
interface AnalysisCategoryGridProps {
  children: React.ReactNode
  className?: string
}

function AnalysisCategoryGrid({ children, className }: AnalysisCategoryGridProps) {
  const gridStyles = useComponentStyles('analysisGrid', 'container')
  
  return (
    <CardContent className={cn("pt-0", className)}>
      <div className={gridStyles}>
        {children}
      </div>
    </CardContent>
  )
}

// Individual analysis item
interface AnalysisItemProps {
  name: string
  englishName: string
  description: string
  tooltip: string
  whenToUse: string
  example: string
  icon: LucideIcon
  onExecute: () => void
  className?: string
}

function AnalysisItem({
  name,
  englishName, 
  description,
  tooltip,
  whenToUse,
  example,
  icon: Icon,
  onExecute,
  className
}: AnalysisItemProps) {
  const cardStyles = useComponentStyles('analysisCard', 'default')
  const hoverStyles = useComponentStyles('analysisCard', 'hover') 
  const buttonStyles = useComponentStyles('button', 'secondary')
  
  return (
    <div className={cn(cardStyles, hoverStyles, "p-4 group", className)}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-foreground" />
            <h3 className="font-semibold text-sm leading-tight">{name}</h3>
          </div>
        </div>
        
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-mono">{englishName}</p>
          <p className="text-xs leading-relaxed line-clamp-2">{description}</p>
        </div>
        
        <button 
          onClick={onExecute}
          className={cn(
            buttonStyles,
            "w-full rounded-md font-medium transition-all duration-200 text-xs px-3 py-2",
            "hover:shadow-sm group-hover:shadow-sm"
          )}
        >
          <Icon className="h-3 w-3 mr-1" />
          실행
        </button>
      </div>
    </div>
  )
}

// Compound component assignment
AnalysisCategory.Header = AnalysisCategoryHeader
AnalysisCategory.Grid = AnalysisCategoryGrid
AnalysisCategory.Item = AnalysisItem

export { AnalysisCategory }