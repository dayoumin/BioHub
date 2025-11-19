"use client"

import React, { useCallback, useState, useRef } from "react"
import { Upload, FileText, AlertCircle, CheckCircle2, X, BarChart3, Eye, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { validateFile, parseCSVFile, validateData, createDatasetFromValidation } from "@/lib/data-processing"
import { performSmartAnalysis, SmartAnalysisResult } from "@/lib/smart-analysis"
import { useAppStore } from "@/lib/store"
import { toast } from "sonner"
import { DataFormatGuide } from "@/components/data/data-format-guide"
// import { SmartAnalysisRecommendations } from "@/components/analysis/smart-analysis-recommendations"

interface FileUploadProps {
  onUploadComplete?: (datasetId: string) => void
  className?: string
  enableSmartAnalysis?: boolean // 스마트 분석 모드 활성화
}

interface UploadState {
  isDragOver: boolean
  isUploading: boolean
  progress: number
  error?: string
  uploadedDataset?: {
    id: string
    name: string
  }
  smartAnalysis?: SmartAnalysisResult
  showSmartAnalysis?: boolean
}

export function FileUpload({ onUploadComplete, className, enableSmartAnalysis = false }: FileUploadProps) {
  const { addDataset } = useAppStore()
  const [uploadState, setUploadState] = useState<UploadState>({
    isDragOver: false,
    isUploading: false,
    progress: 0
  })
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleFileValidation = useCallback((file: File) => {
    const validation = validateFile(file)
    if (!validation.isValid) {
      setUploadState(prev => ({ ...prev, error: validation.error }))
      return false
    }
    setUploadState(prev => ({ ...prev, error: undefined }))
    return true
  }, [])

  const processFile = useCallback(async (file: File) => {
    try {
      setUploadState(prev => ({ ...prev, isUploading: true, progress: 10 }))
      
      // Track timing for optimal user experience
      const startTime = Date.now()
      
      // Quick file validation with immediate feedback
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, progress: 25 }))
      }, 300)
      
      // Parse CSV file with progressive feedback
      const parsedData = await parseCSVFile(file)
      setUploadState(prev => ({ ...prev, progress: 45 }))
      
      // Show quick preview within 1 second
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, progress: 60 }))
      }, Math.max(0, 1000 - (Date.now() - startTime)))
      
      // Validate data
      const validation = validateData(parsedData.headers, parsedData.rows)
      setUploadState(prev => ({ ...prev, progress: 75 }))
      
      // Fast smart analysis with preliminary results in 2 seconds
      let smartAnalysisResult: SmartAnalysisResult | undefined
      if (enableSmartAnalysis && validation.isValid) {
        // Show preliminary analysis within 2 seconds
        setTimeout(() => {
          setUploadState(prev => ({ ...prev, progress: 85 }))
        }, Math.max(0, 2000 - (Date.now() - startTime)))
        
        smartAnalysisResult = performSmartAnalysis(
          validation.columns, 
          parsedData.rows, 
          validation.rowCount
        )
        setUploadState(prev => ({ ...prev, progress: 90 }))
      } else {
        setUploadState(prev => ({ ...prev, progress: 85 }))
      }
      
      // Create dataset
      const datasetData = createDatasetFromValidation(
        file.name.replace(/\.[^/.]+$/, ''),
        file,
        parsedData,
        validation
      )
      
      // Add to store
      const dataset = addDataset(datasetData)
      
      // Ensure minimum 3-second experience for perceived quality
      const elapsedTime = Date.now() - startTime
      const minDisplayTime = 3000
      
      if (elapsedTime < minDisplayTime) {
        setTimeout(() => {
          setUploadState(prev => ({ ...prev, progress: 100 }))
        }, minDisplayTime - elapsedTime)
      } else {
        setUploadState(prev => ({ ...prev, progress: 100 }))
      }
      
      // Show results
      if (validation.errors.length > 0) {
        const errorMessage = validation.errors[0]
        toast.error(errorMessage, {
          description: "데이터 형식을 확인하세요. 가이드를 참고하여 올바른 형식으로 업로드해주세요.",
          action: {
            label: "가이드 보기",
            onClick: () => {
              // 가이드 다이얼로그 열기를 위한 이벤트 트리거
              document.dispatchEvent(new CustomEvent('open-data-guide'))
            }
          }
        })
      } else if (validation.warnings.length > 0) {
        const warningMessage = validation.warnings[0]
        toast.warning(warningMessage, {
          description: validation.warnings.length > 1 
            ? `추가로 ${validation.warnings.length - 1}개의 경고가 있습니다. 데이터를 검토해보세요.`
            : "데이터가 업로드되었지만 주의가 필요합니다."
        })
      } else {
        toast.success(`✅ Dataset "${datasetData.name}" uploaded successfully! Ready for analysis.`)
      }
      
      // Show success state with action buttons (and smart analysis if enabled)
      setUploadState(prev => ({ 
        ...prev, 
        progress: 100,
        uploadedDataset: {
          id: dataset.id,
          name: datasetData.name
        },
        smartAnalysis: smartAnalysisResult,
        showSmartAnalysis: enableSmartAnalysis && !!smartAnalysisResult
      }))
      
      // 콜백 호출하지만 UI는 유지 (사용자 액션 대기)
      onUploadComplete?.(dataset.id)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setUploadState(prev => ({ ...prev, error: errorMessage, isUploading: false, progress: 0 }))
      toast.error(errorMessage)
    }
  }, [addDataset, onUploadComplete])

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setUploadState(prev => ({ ...prev, isDragOver: false }))
    
    const files = Array.from(event.dataTransfer.files)
    if (files.length === 0) return
    
    const file = files[0]
    if (handleFileValidation(file)) {
      processFile(file)
    }
  }, [handleFileValidation, processFile])

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    
    const file = files[0]
    if (handleFileValidation(file)) {
      processFile(file)
    }
    
    // Reset input
    event.target.value = ''
  }, [handleFileValidation, processFile])

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setUploadState(prev => ({ ...prev, isDragOver: true }))
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    // Only set isDragOver to false if we're leaving the drop zone entirely
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setUploadState(prev => ({ ...prev, isDragOver: false }))
    }
  }, [])

  const clearError = useCallback(() => {
    setUploadState(prev => ({ ...prev, error: undefined }))
  }, [])

  return (
    <div className={className}>
      <Card>
        <CardContent className="p-6">
          {uploadState.error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                {uploadState.error}
                <Button variant="ghost" size="sm" onClick={clearError} aria-label="오류 메시지 닫기">
                  <X className="h-4 w-4" />
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300",
              uploadState.isDragOver 
                ? "border-primary bg-primary/10 scale-[1.02] shadow-lg ring-2 ring-primary/20" 
                : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/20",
              uploadState.isUploading && "pointer-events-none opacity-60"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {uploadState.isUploading ? (
              <div className="space-y-6">
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <div className="animate-spin">
                      <BarChart3 className="h-16 w-16 text-primary" />
                    </div>
                    <div className="absolute inset-0 animate-pulse">
                      <div className="w-16 h-16 rounded-full border-2 border-primary/20" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-xl font-semibold text-primary">🎯 AI Magic in Progress</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {uploadState.progress < 40 ? "Parsing your data..." : 
                       uploadState.progress < 70 ? "Detecting data types and quality..." :
                       uploadState.progress < 90 ? "Running statistical analysis..." :
                       "Preparing results..."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Progress value={uploadState.progress} className="w-full max-w-sm mx-auto h-2" />
                    <p className="text-xs text-center text-muted-foreground">
                      {uploadState.progress}% complete • Usually done in 3 seconds
                    </p>
                  </div>
                </div>
              </div>
            ) : uploadState.progress === 100 && uploadState.uploadedDataset ? (
              <div className="space-y-6">
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <CheckCircle2 className="h-20 w-20 text-success animate-pulse" />
                    <div className="absolute -top-2 -right-2">
                      <div className="text-2xl animate-bounce">✨</div>
                    </div>
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-2xl font-bold text-success">🎉 Magic Complete!</p>
                  <p className="text-lg font-medium">
                    Dataset "{uploadState.uploadedDataset.name}" analyzed successfully
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ready for statistical analysis • Processing took just a few seconds
                  </p>
                </div>
                
                {/* 스마트 분석 결과 표시 */}
                {uploadState.showSmartAnalysis && uploadState.smartAnalysis && (
                  <div className="max-h-96 overflow-y-auto">
                    {/* <SmartAnalysisRecommendations
                      analysisResult={uploadState.smartAnalysis}
                      columns={[]} // 실제로는 데이터셋에서 가져와야 함
                      onRunTest={(testName, variables) => {
                        // 분석 시작
                        window.location.href = `/statistics?dataset=${uploadState.uploadedDataset?.id}&test=${encodeURIComponent(testName)}`
                      }}
                      onViewDataDetails={() => {
                        window.location.href = `/data?view=${uploadState.uploadedDataset?.id}`
                      }}
                    */ }
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => {
                      // Navigate to statistics page with this dataset selected
                      window.location.href = `/statistics?dataset=${uploadState.uploadedDataset?.id}`
                    }}
                    className="flex items-center gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    {uploadState.showSmartAnalysis ? 'Manual Analysis' : 'Start Statistical Analysis'}
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => {
                      // Navigate to data view page
                      window.location.href = `/data?view=${uploadState.uploadedDataset?.id}`
                    }}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Data
                  </Button>
                  
                  <Button 
                    variant="ghost"
                    onClick={() => {
                      // Reset upload state for new upload
                      setUploadState({
                        isDragOver: false,
                        isUploading: false,
                        progress: 0
                      })
                    }}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Another
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-center">
                  <div className={cn(
                    "transition-all duration-300",
                    uploadState.isDragOver 
                      ? "scale-110 text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  )}>
                    <Upload className="h-16 w-16" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className={cn(
                      "text-xl font-semibold transition-colors",
                      uploadState.isDragOver ? "text-primary" : "text-foreground"
                    )}>
                      {uploadState.isDragOver ? "Release to start magic analysis!" : "Drop your data here"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      AI will automatically analyze your data in 3 seconds
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="outline" className="text-xs">CSV</Badge>
                    <Badge variant="outline" className="text-xs">Excel</Badge>
                    <Badge variant="outline" className="text-xs">TSV</Badge>
                    <Badge variant="outline" className="text-xs">Max 50MB</Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-px w-12 bg-border" />
                    <span>or</span>
                    <div className="h-px w-12 bg-border" />
                  </div>
                </div>
                
                <div>
                  <Button
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploadState.isUploading}
                    aria-label="Browse files"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Browse Files
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".csv,.tsv,.txt,.xls,.xlsx"
                    onChange={handleFileSelect}
                    disabled={uploadState.isUploading}
                    ref={inputRef}
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-4 space-y-3">
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>지원 형식:</strong> CSV, TSV, Excel (.xls, .xlsx)</p>
              <p><strong>최대 파일 크기:</strong> 50MB</p>
              <p><strong>요구사항:</strong> 첫 번째 행에 열 이름 포함</p>
            </div>
            
            <div className="flex justify-center">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    데이터 형식 가이드
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>데이터 형식 가이드</DialogTitle>
                    <DialogDescription>
                      올바른 데이터 업로드를 위한 상세 가이드
                    </DialogDescription>
                  </DialogHeader>
                  <DataFormatGuide />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Simplified version for inline use
interface InlineFileUploadProps {
  onUploadComplete?: (datasetId: string) => void
  className?: string
}

export function InlineFileUpload({ onUploadComplete, className }: InlineFileUploadProps) {
  const { addDataset } = useAppStore()
  const [isUploading, setIsUploading] = useState(false)

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    
    const file = files[0]
    const validation = validateFile(file)
    
    if (!validation.isValid) {
      toast.error(validation.error)
      return
    }
    
    try {
      setIsUploading(true)
      
      const parsedData = await parseCSVFile(file)
      const dataValidation = validateData(parsedData.headers, parsedData.rows)
      const datasetData = createDatasetFromValidation(
        file.name.replace(/\.[^/.]+$/, ''),
        file,
        parsedData,
        dataValidation
      )
      
      const dataset = addDataset(datasetData)
      
      if (dataValidation.errors.length > 0) {
        toast.error(`Upload failed: ${dataValidation.errors[0]}`)
      } else {
        toast.success(`✅ Dataset uploaded successfully! Ready for analysis.`)
        onUploadComplete?.(dataset.id)
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      toast.error(errorMessage)
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }, [addDataset, onUploadComplete])

  return (
    <div className={className}>
      <label htmlFor="inline-file-upload">
        <Button variant="outline" className="cursor-pointer" disabled={isUploading} asChild>
          <span>
            {isUploading ? (
              <>
                <div className="animate-spin w-4 h-4 mr-2">
                  <Upload className="h-4 w-4" />
                </div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Dataset
              </>
            )}
          </span>
        </Button>
      </label>
      <input
        id="inline-file-upload"
        type="file"
        className="hidden"
        accept=".csv,.tsv,.txt,.xls,.xlsx"
        onChange={handleFileSelect}
        disabled={isUploading}
      />
    </div>
  )
}