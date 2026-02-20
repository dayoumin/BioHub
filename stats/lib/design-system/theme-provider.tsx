"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { themes, type ThemeName, getComponentStyles, type ComponentName, type ComponentVariant } from './tokens'

interface ThemeContextType {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
  getStyles: <T extends ComponentName>(
    component: T,
    variant?: ComponentVariant<T>
  ) => string
  currentTheme: typeof themes.perplexity
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: ThemeName
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = 'perplexity',
  storageKey = 'stats-theme',
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeName>(defaultTheme)

  useEffect(() => {
    // Load theme from localStorage on mount with error handling
    try {
      const stored = localStorage.getItem(storageKey) as ThemeName
      if (stored && themes[stored]) {
        setTheme(stored)
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error)
      // Fallback to default theme
    }
  }, [storageKey])

  useEffect(() => {
    // Save theme to localStorage when changed
    localStorage.setItem(storageKey, theme)
  }, [theme, storageKey])

  const getStyles = <T extends ComponentName>(
    component: T,
    variant?: ComponentVariant<T>
  ) => {
    return getComponentStyles(theme, component, variant)
  }

  const value: ThemeContextType = {
    theme,
    setTheme,
    getStyles,
    currentTheme: themes[theme] as typeof themes.perplexity
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  
  return context
}

/**
 * Hook for getting component styles with theme awareness
 */
export function useComponentStyles<T extends ComponentName>(
  component: T,
  variant?: ComponentVariant<T>
) {
  const { getStyles } = useTheme()
  return getStyles(component, variant)
}

