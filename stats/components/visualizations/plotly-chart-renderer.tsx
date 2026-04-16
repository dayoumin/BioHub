'use client'

import React, { useEffect, useRef } from 'react'
import { downloadTextFile } from '@/lib/utils/download-file'
import type { Data, Layout, Config, ModeBarDefaultButtons } from 'plotly.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Maximize2, Camera } from 'lucide-react'
import { logger } from '@/lib/utils/logger'
import { escapeHtml } from '@/lib/utils/html-escape'

const PLOTLY_EXPORT_BUNDLE_PATH = '/vendor/plotly-basic-3.1.0.js'
let plotlyExportBundlePromise: Promise<string> | null = null

async function loadStandalonePlotlyBundle(): Promise<string> {
  if (!plotlyExportBundlePromise) {
    plotlyExportBundlePromise = fetch(PLOTLY_EXPORT_BUNDLE_PATH)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Plotly export bundle load failed: ${response.status}`)
        }
        return response.text()
      })
  }

  return plotlyExportBundlePromise
}

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

  const downloadAsHTML = async () => {
    if (!chartRef.current || !chartData) return
    const plotlyBundle = (await loadStandalonePlotlyBundle()).replace(/<\/script/gi, '<\\/script')

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title || 'Statistical Analysis Chart')}</title>
    <style>
        :root {
            color-scheme: light;
            --canvas: #f7f9fb;
            --section: #eceef0;
            --card: #ffffff;
            --ink: #191c1e;
            --muted: #515f74;
            --accent: #188ace;
            --ghost: rgba(118, 119, 125, 0.16);
        }
        body { 
            font-family: 'Pretendard Variable', Pretendard, Inter, -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0;
            padding: 32px;
            background: var(--canvas);
            color: var(--ink);
        }
        main {
            max-width: 1280px;
            margin: 0 auto;
        }
        .frame {
            background:
              linear-gradient(180deg, rgba(15, 23, 42, 0.02), rgba(15, 23, 42, 0)),
              var(--section);
            border-radius: 16px;
            padding: 20px;
        }
        .meta {
            display: flex;
            align-items: end;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 18px;
        }
        h1 {
            margin: 0;
            font-size: 1.5rem;
            line-height: 1.2;
            letter-spacing: -0.02em;
            font-weight: 600;
        }
        .eyebrow {
            margin: 0 0 6px;
            color: var(--muted);
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .chip {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 999px;
            background: rgba(24, 138, 206, 0.10);
            color: var(--accent);
            font-size: 0.75rem;
            font-weight: 600;
        }
        #chart {
            background: var(--card);
            border-radius: 12px;
            min-height: 560px;
            padding: 20px;
        }
        @media (max-width: 960px) {
            body {
                padding: 16px;
            }
            .meta {
                flex-direction: column;
                align-items: stretch;
            }
            #chart {
                min-height: 420px;
                padding: 14px;
            }
        }
    </style>
    <script>${plotlyBundle}</script>
</head>
<body>
    <main>
      <div class="frame">
        <div class="meta">
          <div>
            <p class="eyebrow">BioHub Chart Export</p>
            <h1>${escapeHtml(title || 'Statistical Analysis Chart')}</h1>
          </div>
          <div class="chip">Standalone HTML · Plotly 3.1.0</div>
        </div>
        <div id="chart"></div>
      </div>
    </main>
    <script>
        const data = ${JSON.stringify(chartData.data).replace(/<\//g, '<\\/')};
        const layout = ${JSON.stringify(chartData.layout).replace(/<\//g, '<\\/')};
        const config = ${JSON.stringify({ responsive: true, ...(chartData.config ?? {}) }).replace(/<\//g, '<\\/')};
        Plotly.newPlot('chart', data, layout, config);
    </script>
</body>
</html>`
    
    downloadTextFile(htmlContent, 'interactive-chart.html', 'text/html')
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
              onClick={() => { void downloadAsHTML().catch((error: unknown) => logger.error('Failed to export Plotly HTML:', error)) }}
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
