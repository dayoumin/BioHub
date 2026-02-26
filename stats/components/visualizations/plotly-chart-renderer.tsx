'use client'

import React, { useEffect, useRef } from 'react'
import type { Data, Layout, Config, ModeBarDefaultButtons } from 'plotly.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Maximize2, Camera } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

// 벤더 접두사 fullscreen API (표준 HTMLElement 타입에 미포함)
interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>
  msRequestFullscreen?: () => Promise<void>
}

// 이 컴포넌트에서 사용하는 Plotly API만 정의 (plotly.js-basic-dist 타입 부재 대응)
interface PlotlyStatic {
  newPlot(element: HTMLElement, data: Data[], layout: Partial<Layout>, config?: Partial<Config>): Promise<unknown>
  Plots: { resize(element: HTMLElement): void }
  purge(element: HTMLElement): void
  downloadImage(element: HTMLElement, opts: { format: string; width: number; height: number; filename: string }): Promise<unknown>
}

interface PlotlyChartRendererProps {
  chartData: {
    data: Data[]
    // Plotly layout — Record<string, unknown>으로 선언해 v2/v3 title 호환성 유지
    // (Plotly v3: title: Title 객체, v2: title: string)
    layout: Record<string, unknown>
    config?: Record<string, unknown>
  }
  title?: string
  onDownload?: () => void
}

export function PlotlyChartRenderer({
  chartData,
  title,
  onDownload
}: PlotlyChartRendererProps) {
  const chartRef = useRef<HTMLDivElement>(null)

  // Plotly 인스턴스를 ref로 관리 (dynamic import)
  const plotlyRef = useRef<PlotlyStatic | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!chartRef.current || !chartData) return

    let cancelled = false
    const currentElement = chartRef.current

    async function renderChart() {
      // Dynamic import: plotly.js-basic-dist (~2MB)
      if (!plotlyRef.current) {
        const mod = await import('plotly.js-basic-dist') as unknown as { default?: PlotlyStatic } & PlotlyStatic
        plotlyRef.current = mod.default ?? mod
      }
      const Plotly = plotlyRef.current
      if (cancelled || !currentElement) return

      const config: Partial<Config> = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'] as ModeBarDefaultButtons[],
        modeBarButtonsToAdd: [],
        toImageButtonOptions: {
          format: 'png',
          filename: `chart-export`,
          height: 800,
          width: 1200,
          scale: 2
        },
        ...(chartData.config as Partial<Config>)
      }

      Plotly.newPlot(currentElement, chartData.data, chartData.layout as Partial<Layout>, config)

      const handleResize = () => {
        Plotly.Plots.resize(currentElement)
      }

      window.addEventListener('resize', handleResize)

      // Store cleanup in ref (not on DOM element)
      cleanupRef.current = () => {
        window.removeEventListener('resize', handleResize)
        Plotly.purge(currentElement)
      }
    }

    renderChart().catch((error) => {
      if (!cancelled) {
        logger.error('Failed to render Plotly chart:', error)
      }
    })

    return () => {
      cancelled = true
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [chartData])

  const downloadAsImage = () => {
    if (!chartRef.current || !plotlyRef.current) return

    plotlyRef.current.downloadImage(chartRef.current, {
      format: 'png',
      width: 1200,
      height: 800,
      filename: `chart-export`
    })
  }

  const downloadAsHTML = () => {
    if (!chartRef.current || !chartData) return
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Statistical Chart</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 20px;
            background: #f5f5f5;
        }
        #chart { 
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 20px;
        }
        h1 {
            color: #333;
            text-align: center;
        }
    </style>
</head>
<body>
    <h1>${title || 'Statistical Analysis Chart'}</h1>
    <div id="chart"></div>
    <script>
        const data = ${JSON.stringify(chartData.data)};
        const layout = ${JSON.stringify(chartData.layout)};
        const config = { responsive: true };
        Plotly.newPlot('chart', data, layout, config);
    </script>
</body>
</html>`
    
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `interactive-chart.html`
    link.click()
    URL.revokeObjectURL(url)
  }

  const openFullscreen = () => {
    if (!chartRef.current) return
    
    const elem = chartRef.current as FullscreenElement
    if (elem.requestFullscreen) {
      elem.requestFullscreen()
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen()
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen()
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title || 'Interactive Chart'}</CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={downloadAsImage}
              size="sm"
              variant="outline"
              title="Download as PNG"
            >
              <Camera className="h-4 w-4" />
            </Button>
            <Button
              onClick={downloadAsHTML}
              size="sm"
              variant="outline"
              title="Download as Interactive HTML"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              onClick={openFullscreen}
              size="sm"
              variant="outline"
              title="Fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          ref={chartRef}
          className="w-full h-[500px]"
        />
      </CardContent>
    </Card>
  )
}