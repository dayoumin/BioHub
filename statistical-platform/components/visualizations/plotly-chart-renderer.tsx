'use client'

import React, { useEffect, useRef } from 'react'
// @ts-expect-error - plotly.js-basic-dist types not available
import Plotly from 'plotly.js-basic-dist'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Maximize2, Camera } from 'lucide-react'

interface PlotlyChartRendererProps {
  chartData: {
    data: any[]
    layout: any
    config?: any
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
  const chartId = useRef<string>('plotly-chart-default')

  useEffect(() => {
    // 클라이언트 사이드에서만 ID 생성
    chartId.current = `plotly-chart-${Date.now()}-${Math.random()}`
  }, [])

  useEffect(() => {
    if (!chartRef.current || !chartData) return

    // Plotly 차트 렌더링
    const config = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      modeBarButtonsToAdd: [],
      toImageButtonOptions: {
        format: 'png',
        filename: `chart-export`,
        height: 800,
        width: 1200,
        scale: 2
      },
      ...chartData.config
    }

    Plotly.newPlot(chartRef.current, chartData.data, chartData.layout, config)

    // 윈도우 리사이즈 대응
    const handleResize = () => {
      if (chartRef.current) {
        Plotly.Plots.resize(chartRef.current)
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartRef.current) {
        Plotly.purge(chartRef.current)
      }
    }
  }, [chartData])

  const downloadAsImage = () => {
    if (!chartRef.current) return
    
    Plotly.downloadImage(chartRef.current, {
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
    
    const elem = chartRef.current as any
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
          id={chartId.current}
          className="w-full h-[500px]"
        />
      </CardContent>
    </Card>
  )
}