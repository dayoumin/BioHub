'use client'

import React from 'react'

// Mock PyodideContext
export const PyodideContext = React.createContext<{
  isLoaded: boolean
  isLoading: boolean
  error: string | null
  service: {
    checkAllAssumptions: jest.Mock
  } | null
}>({
  isLoaded: true,
  isLoading: false,
  error: null,
  service: {
    checkAllAssumptions: jest.fn().mockResolvedValue({
      normality: { passed: true, pValue: 0.15, method: 'Shapiro-Wilk' },
      homogeneity: { passed: true, pValue: 0.20, method: "Levene's Test" },
      sphericity: { passed: true, pValue: 0.25, method: "Mauchly's Test" },
      independence: { passed: true, durbinWatson: 2.1, method: 'Durbin-Watson' },
    }),
  },
})

// Mock usePyodide hook
export const usePyodide = jest.fn(() => ({
  isLoaded: true,
  isLoading: false,
  error: null,
  service: {
    checkAllAssumptions: jest.fn().mockResolvedValue({
      normality: { passed: true, pValue: 0.15, method: 'Shapiro-Wilk' },
      homogeneity: { passed: true, pValue: 0.20, method: "Levene's Test" },
      sphericity: { passed: true, pValue: 0.25, method: "Mauchly's Test" },
      independence: { passed: true, durbinWatson: 2.1, method: 'Durbin-Watson' },
    }),
  },
}))

// Mock PyodideProvider component
export function PyodideProvider({ children }: { children: React.ReactNode }) {
  return (
    <PyodideContext.Provider
      value={{
        isLoaded: true,
        isLoading: false,
        error: null,
        service: {
          checkAllAssumptions: jest.fn().mockResolvedValue({
            normality: { passed: true, pValue: 0.15, method: 'Shapiro-Wilk' },
            homogeneity: { passed: true, pValue: 0.20, method: "Levene's Test" },
            sphericity: { passed: true, pValue: 0.25, method: "Mauchly's Test" },
            independence: { passed: true, durbinWatson: 2.1, method: 'Durbin-Watson' },
          }),
        },
      }}
    >
      {children}
    </PyodideContext.Provider>
  )
}
