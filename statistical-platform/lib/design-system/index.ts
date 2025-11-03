/**
 * Design System - Central Export
 * 
 * This file provides a single entry point for all design system components,
 * utilities, and types. Import everything you need from here.
 */

// Core system
export { designTokens, themes, getCurrentTheme, getComponentStyles } from './tokens'
export type { ThemeName, ComponentName, ComponentVariant } from './tokens'

// Import types and functions needed internally in this file
import { getComponentStyles, getCurrentTheme } from './tokens'
import type { ThemeName, ComponentName } from './tokens'
import { themes } from './tokens'

// Theme provider and hooks
export { ThemeProvider, useTheme, useComponentStyles, withTheme } from './theme-provider'

// Components (relative imports to avoid circular dependencies)
export { AnalysisCategory } from '@/components/design-system/analysis-category'
export { ThemedTabs } from '@/components/design-system/themed-tabs'

// Type utilities
export type { 
  // Theme types
  Theme,
  ThemeConfig,
  ComponentStyles,
  
  // Component prop types
  AnalysisCategoryProps,
  AnalysisItemProps,
  ThemedTabsProps,
} from './types'

/**
 * Utility functions for common design system operations
 */

/**
 * Get theme-aware class names for a component
 */
export function getThemeClasses(
  component: ComponentName,
  variant?: string,
  theme: ThemeName = 'perplexity'
) {
  return getComponentStyles(theme, component, variant as any)
}

/**
 * Merge theme styles with custom styles
 */
export function mergeThemeStyles(
  themeStyles: string,
  customStyles?: string
): string {
  return [themeStyles, customStyles].filter(Boolean).join(' ')
}

/**
 * Check if a theme is available
 */
export function isThemeAvailable(theme: string): theme is ThemeName {
  return theme in themes
}

/**
 * Get all available themes
 */
export function getAvailableThemes() {
  return Object.keys(themes) as ThemeName[]
}

/**
 * Design system version
 */
export const VERSION = '1.0.0'

/**
 * Default configuration
 */
export const DEFAULT_CONFIG = {
  theme: 'perplexity' as ThemeName,
  storageKey: 'statistical-platform-theme',
  enableTransitions: true,
  enableAnimations: true,
} as const