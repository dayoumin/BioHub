/**
 * Design System - Central Export
 *
 * Single entry point for design system components, utilities, and types.
 */

// Core system
export { themes, getCurrentTheme, getComponentStyles } from './tokens'
export type { ThemeName, ComponentName, ComponentVariant } from './tokens'

// Theme provider and hooks
export { ThemeProvider, useTheme, useComponentStyles } from './theme-provider'

// Components
export { AnalysisCategory } from '@/components/design-system/analysis-category'
export { ThemedTabs } from '@/components/design-system/themed-tabs'

// Types
export type {
  Theme,
  ThemeConfig,
  ComponentStyles,
  AnalysisCategoryProps,
  AnalysisItemProps,
  ThemedTabsProps,
} from './types'
