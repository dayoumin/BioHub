/**
 * Design System Types
 *
 * Type definitions for design system components
 */

import { LucideIcon } from 'lucide-react'
import { themes, type ThemeName } from './tokens'

// Core theme types
export type Theme = typeof themes[ThemeName]
export type ThemeConfig = Theme
export type ComponentStyles = Record<string, string>

// Analysis Category Types
export interface AnalysisCategoryProps {
  categoryId: string
  children: React.ReactNode
  className?: string
}

export interface AnalysisCategoryHeaderProps {
  icon: LucideIcon
  title: string
  description: string
  count: number
  className?: string
}

export interface AnalysisCategoryGridProps {
  children: React.ReactNode
  className?: string
}

export interface AnalysisItemProps {
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

// Themed Tabs Types
export interface ThemedTabsProps {
  children: React.ReactNode
  defaultValue: string
  className?: string
}

export interface ThemedTabsListProps {
  children: React.ReactNode
  className?: string
}

export interface ThemedTabsTriggerProps {
  value: string
  icon: LucideIcon
  title: string
  className?: string
}

export interface ThemedTabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
}

// Statistical Analysis Types
export interface StatisticalTest {
  name: string
  englishName: string
  description: string
  tooltip: string
  whenToUse: string
  example: string
  icon: LucideIcon
  category: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  requirements?: string[]
  assumptions?: string[]
}

export interface StatisticalCategory {
  id: string
  title: string
  description: string
  icon: LucideIcon
  tests: StatisticalTest[]
  color?: string
  bgColor?: string
  borderColor?: string
}
