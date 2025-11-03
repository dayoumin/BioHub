'use client'

import dynamic from 'next/dynamic'
import { memo, useState, useEffect, useRef } from 'react'
import type { Data, Layout, Config } from 'plotly.js'
import { getDefaultLayout, DEFAULT_CONFIG } from '@/lib/plotly-config'

// Dynamic import for Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js').then(mod => mod.default || mod) as any, {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="animate-pulse">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-2 text-sm text-muted-foreground">차트 로딩중...</p>
      </div>
    </div>
  )
}) as any

interface PlotlyChartProps {
  data: Data[]
  layout?: Partial<Layout>
  config?: Partial<Config>
  className?: string
  onPlotUpdate?: (figure: { data: Data[]; layout: Partial<Layout> }) => void
  onError?: (error: Error) => void
}

export const PlotlyChartImproved = memo(function PlotlyChartImproved({
  data,
  layout = {},
  config = {},
  className = '',
  onPlotUpdate,
  onError
}: PlotlyChartProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    // Cleanup flag for preventing memory leaks
    isMountedRef.current = true

    const validateData = async () => {
      try {
        // Check if component is still mounted
        if (!isMountedRef.current) return

        // Validate data
        if (!Array.isArray(data)) {
          throw new Error('Chart data must be an array')
        }

        if (data.length === 0) {
          throw new Error('Chart data cannot be empty')
        }

        // Only update state if still mounted
        if (isMountedRef.current) {
          setIsLoading(false)
          setError(null)
        }
      } catch (err) {
        if (isMountedRef.current) {
          const error = err instanceof Error ? err : new Error('Chart validation failed')
          setError(error)
          onError?.(error)
          setIsLoading(false)
        }
      }
    }

    validateData()

    // Cleanup function to prevent memory leaks
    return () => {
      isMountedRef.current = false
    }
  }, [data, onError])

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4 border rounded-lg bg-destructive/10">
        <div className="text-center">
          <svg
            className="w-12 h-12 text-destructive mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-destructive font-medium">차트 로딩 실패</p>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        </div>
      </div>
    )
  }

  // Use centralized configuration
  const defaultLayout = getDefaultLayout(layout)
  const defaultConfig = { ...DEFAULT_CONFIG, ...config }

  return (
    <div
      className={`w-full relative ${className}`}
      role="img"
      aria-label={layout.title?.text || 'Statistical chart'}
      style={{ position: 'relative', zIndex: 1 }}
    >
      {!isLoading && (
        <Plot
          data={data}
          layout={defaultLayout}
          config={defaultConfig}
          style={{ width: '100%', height: '100%', position: 'relative' }}
          useResizeHandler={true}
          onUpdate={onPlotUpdate}
          onError={onError}
        />
      )}
    </div>
  )
})