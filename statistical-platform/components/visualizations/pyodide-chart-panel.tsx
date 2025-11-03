'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  LineChart, 
  ScatterChart,
  BoxIcon,
  Activity,
  Loader2,
  Download
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import * as viz from '@/lib/pyodide-visualizations'
// import { PyodideStatusCard } from '@/components/analysis/pyodide-status-card'
import { 
  subscribeToPyodide, 
  getPyodideState,
  loadPyodideRuntime,
  type PyodideState 
} from '@/lib/pyodide-runtime-loader'

interface PyodideChartPanelProps {
  datasetId: string
}

export function PyodideChartPanel({ datasetId }: PyodideChartPanelProps) {
  const { datasets } = useAppStore()
  const [pyodideState, setPyodideState] = useState<PyodideState>(getPyodideState())
  const [chartType, setChartType] = useState<string>('histogram')
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [groupColumn, setGroupColumn] = useState<string>('')
  const [chartImage, setChartImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const dataset = datasets.find(d => d.id === datasetId)
  
  // Pyodide 상태 구독
  useEffect(() => {
    const unsubscribe = subscribeToPyodide(setPyodideState)
    return unsubscribe  // unsubscribe는 이미 함수를 반환함
  }, [])
  
  if (!dataset) {
    return (
      <Alert>
        <AlertDescription>Dataset not found</AlertDescription>
      </Alert>
    )
  }
  
  if (!dataset.data || dataset.data?.length === 0) {
    return (
      <Alert>
        <AlertDescription>Dataset has no data</AlertDescription>
      </Alert>
    )
  }
  
  const columnNames = Object.keys(dataset.data?.[0] || {})
  const numericColumns = columnNames.filter(col => {
    const value = dataset.data?.[0][col]
    return !isNaN(parseFloat(String(value)))
  })
  
  const generateChart = async () => {
    if (pyodideState.status !== 'ready') {
      setError('Pyodide is not ready. Please wait for it to load.')
      return
    }

    setIsGenerating(true)
    setError(null)
    
    try {
      let imageData = ''
      
      switch (chartType) {
        case 'histogram': {
          if (selectedColumns.length !== 1) {
            throw new Error('Please select exactly one column for histogram')
          }

          const data = ((dataset.data as Record<string, unknown>[]) ?? [])
            .map((row: Record<string, unknown>) => parseFloat(String(row[selectedColumns[0]])))
            .filter(val => !isNaN(val))
          
          imageData = await viz.createHistogram(
            data,
            `Histogram of ${selectedColumns[0]}`,
            selectedColumns[0],
            'Frequency'
          )
          break
        }
        
        case 'boxplot': {
          if (selectedColumns.length !== 1 || !groupColumn) {
            throw new Error('Please select one value column and one group column')
          }

          const groups = new Map<string, number[]>()
          ;((dataset.data as Record<string, unknown>[]) ?? []).forEach((row: Record<string, unknown>) => {
            const group = String(row[groupColumn])
            const value = parseFloat(String(row[selectedColumns[0]]))

            if (!isNaN(value)) {
              if (!groups.has(group)) {
                groups.set(group, [])
              }
              groups.get(group)!.push(value)
            }
          })
          
          imageData = await viz.createBoxplot(
            Array.from(groups.values()),
            Array.from(groups.keys()),
            `Box Plot: ${selectedColumns[0]} by ${groupColumn}`,
            groupColumn,
            selectedColumns[0]
          )
          break
        }
        
        case 'scatter': {
          if (selectedColumns.length !== 2) {
            throw new Error('Please select exactly two columns for scatter plot')
          }
          
          const xData: number[] = []
          const yData: number[] = []

          ((dataset.data as Record<string, unknown>[]) ?? []).forEach((row: Record<string, unknown>) => {
            const x = parseFloat(String(row[selectedColumns[0]]))
            const y = parseFloat(String(row[selectedColumns[1]]))
            
            if (!isNaN(x) && !isNaN(y)) {
              xData.push(x)
              yData.push(y)
            }
          })
          
          imageData = await viz.createScatterPlot(
            xData,
            yData,
            `Scatter Plot: ${selectedColumns[0]} vs ${selectedColumns[1]}`,
            selectedColumns[0],
            selectedColumns[1]
          )
          break
        }
        
        case 'qqplot': {
          if (selectedColumns.length !== 1) {
            throw new Error('Please select exactly one column for Q-Q plot')
          }
          
          const data = (dataset.data ?? [])
            .map(row => parseFloat(String(row[selectedColumns[0]])))
            .filter(val => !isNaN(val))
          
          imageData = await viz.createQQPlot(
            data,
            `Q-Q Plot of ${selectedColumns[0]}`
          )
          break
        }
        
        case 'bar': {
          if (!groupColumn || selectedColumns.length !== 1) {
            throw new Error('Please select one value column and one group column')
          }

          const groups = new Map<string, number[]>()
          ;((dataset.data as Record<string, unknown>[]) ?? []).forEach((row: Record<string, unknown>) => {
            const group = String(row[groupColumn])
            const value = parseFloat(String(row[selectedColumns[0]]))

            if (!isNaN(value)) {
              if (!groups.has(group)) {
                groups.set(group, [])
              }
              groups.get(group)!.push(value)
            }
          })
          
          const categories = Array.from(groups.keys())
          const means = Array.from(groups.values()).map(vals => 
            vals.reduce((a, b) => a + b, 0) / vals.length
          )
          const stds = Array.from(groups.values()).map(vals => {
            const mean = vals.reduce((a, b) => a + b, 0) / vals.length
            const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length
            return Math.sqrt(variance)
          })
          
          imageData = await viz.createBarChart(
            categories,
            means,
            `Mean ${selectedColumns[0]} by ${groupColumn}`,
            groupColumn,
            selectedColumns[0],
            stds
          )
          break
        }
        
        default:
          throw new Error(`Chart type "${chartType}" is not yet implemented`)
      }
      
      setChartImage(imageData)
    } catch (err: any) {
      setError(err.message || 'An error occurred while generating the chart')
    } finally {
      setIsGenerating(false)
    }
  }
  
  const downloadChart = () => {
    if (!chartImage) return
    
    const link = document.createElement('a')
    link.href = chartImage
    link.download = `chart_${chartType}_${Date.now()}.png`
    link.click()
  }
  
  return (
    <div className="space-y-4">
      {/* Pyodide 상태 카드 - PyodideStatusCard는 아직 구현되지 않음 */}
      {/* <PyodideStatusCard
        pyodideState={pyodideState}
        onStartLoading={loadPyodideRuntime}
      /> */}
      
      {/* Chart Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Visualization Settings</CardTitle>
          <CardDescription>Configure your chart parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Chart Type Selection */}
          <div>
            <p className="text-sm font-medium mb-2">Chart Type:</p>
            <Select value={chartType} onValueChange={setChartType}>
              <SelectTrigger>
                <SelectValue placeholder="Select chart type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="histogram">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Histogram
                  </div>
                </SelectItem>
                <SelectItem value="boxplot">
                  <div className="flex items-center gap-2">
                    <BoxIcon className="h-4 w-4" />
                    Box Plot
                  </div>
                </SelectItem>
                <SelectItem value="scatter">
                  <div className="flex items-center gap-2">
                    <ScatterChart className="h-4 w-4" />
                    Scatter Plot
                  </div>
                </SelectItem>
                <SelectItem value="qqplot">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Q-Q Plot
                  </div>
                </SelectItem>
                <SelectItem value="bar">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Bar Chart
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Column Selection */}
          <div>
            <p className="text-sm font-medium mb-2">
              Select Column(s): 
              {chartType === 'scatter' && ' (Select 2 columns)'}
              {chartType === 'histogram' && ' (Select 1 column)'}
              {chartType === 'qqplot' && ' (Select 1 column)'}
              {(chartType === 'boxplot' || chartType === 'bar') && ' (Select 1 value column)'}
            </p>
            <div className="flex flex-wrap gap-2">
              {numericColumns.map(col => (
                <Button
                  key={col}
                  variant={selectedColumns.includes(col) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    if (chartType === 'scatter') {
                      if (selectedColumns.includes(col)) {
                        setSelectedColumns(selectedColumns.filter(c => c !== col))
                      } else if (selectedColumns.length < 2) {
                        setSelectedColumns([...selectedColumns, col])
                      } else {
                        setSelectedColumns([selectedColumns[1], col])
                      }
                    } else {
                      setSelectedColumns([col])
                    }
                  }}
                >
                  {col}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Group Column for Box Plot and Bar Chart */}
          {(chartType === 'boxplot' || chartType === 'bar') && (
            <div>
              <p className="text-sm font-medium mb-2">Group Column:</p>
              <Select value={groupColumn} onValueChange={setGroupColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Select group column" />
                </SelectTrigger>
                <SelectContent>
                  {columnNames.filter(col => !numericColumns.includes(col)).map(col => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Generate Button */}
          <div className="flex gap-2">
            <Button 
              onClick={generateChart} 
              disabled={isGenerating || selectedColumns.length === 0 || pyodideState.status !== 'ready'}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Generate Chart
                </>
              )}
            </Button>
            
            {chartImage && (
              <Button onClick={downloadChart} variant="outline">
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Chart Display */}
      {chartImage && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <img 
              src={chartImage} 
              alt="Generated chart" 
              className="w-full h-auto rounded-md shadow-lg"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}