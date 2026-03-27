"use client"

import React, { useCallback, useState, useRef } from "react"
import { Upload, AlertCircle, CheckCircle2, X, Eye, HelpCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { validateFile, parseCSVFile, validateData, createDatasetFromValidation } from "@/lib/data-processing"
import { useAppStore } from "@/lib/store"
import { toast } from "sonner"
import { DataFormatGuide } from "@/components/data/data-format-guide"
import { uploadZoneClassName, UploadDropZoneContent } from "@/components/common/UploadDropZone"

interface FileUploadProps {
  onUploadComplete?: (datasetId: string) => void
  className?: string
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
}

export function FileUpload({ onUploadComplete, className }: FileUploadProps): React.ReactElement {
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

      const parsedData = await parseCSVFile(file)
      setUploadState(prev => ({ ...prev, progress: 50 }))

      const validation = validateData(parsedData.headers, parsedData.rows)
      setUploadState(prev => ({ ...prev, progress: 75 }))

      const datasetData = createDatasetFromValidation(
        file.name.replace(/\.[^/.]+$/, ''),
        file,
        parsedData,
        validation
      )

      const dataset = addDataset(datasetData)

      if (validation.errors.length > 0) {
        toast.error(validation.errors[0], {
          description: "데이터 형식을 확인하세요."
        })
      } else if (validation.warnings.length > 0) {
        toast.warning(validation.warnings[0], {
          description: validation.warnings.length > 1
            ? `추가로 ${validation.warnings.length - 1}개의 경고가 있습니다.`
            : "데이터가 업로드되었지만 주의가 필요합니다."
        })
      } else {
        toast.success(`"${datasetData.name}" 업로드 완료`)
      }

      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 100,
        uploadedDataset: { id: dataset.id, name: datasetData.name },
      }))

      onUploadComplete?.(dataset.id)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '업로드 실패'
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
        <CardContent className="p-4">
          {uploadState.error && (
            <Alert variant="destructive" className="mb-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                {uploadState.error}
                <Button variant="ghost" size="sm" onClick={clearError} aria-label="오류 메시지 닫기">
                  <X className="h-4 w-4" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {uploadState.isUploading ? (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">데이터 처리 중...</p>
                  <p className="text-xs text-muted-foreground">
                    {uploadState.progress < 50 ? "파일 파싱 중..." :
                     uploadState.progress < 80 ? "데이터 검증 중..." :
                     "결과 준비 중..."}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{uploadState.progress}%</span>
              </div>
              <Progress value={uploadState.progress} className="h-1.5" />
            </div>
          ) : uploadState.progress === 100 && uploadState.uploadedDataset ? (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">업로드 완료</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {uploadState.uploadedDataset.name}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => { window.location.href = '/' }}
                >
                  분석 시작
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.location.href = `/data?view=${uploadState.uploadedDataset?.id}`
                  }}
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  데이터 보기
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUploadState({ isDragOver: false, isUploading: false, progress: 0 })
                  }}
                >
                  다른 파일
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                uploadZoneClassName(uploadState.isDragOver, { clickable: true }),
                'group'
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
            >
              <input
                type="file"
                className="hidden"
                accept=".csv,.tsv,.txt,.xls,.xlsx"
                onChange={handleFileSelect}
                disabled={uploadState.isUploading}
                ref={inputRef}
              />
              <UploadDropZoneContent
                isDragActive={uploadState.isDragOver}
                label="데이터 파일을 드래그하거나 클릭하여 선택"
                subtitle="CSV, Excel, TSV 지원 · 최대 50MB"
                buttonLabel="파일 선택"
                showIcon={true}
              />
            </div>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
            <p className="text-xs text-muted-foreground">
              첫 행에 열 이름 포함 필수
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground">
                  <HelpCircle className="h-3 w-3" />
                  형식 가이드
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

export function InlineFileUpload({ onUploadComplete, className }: InlineFileUploadProps): React.ReactElement {
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
        toast.error(`업로드 실패: ${dataValidation.errors[0]}`)
      } else {
        toast.success(`"${datasetData.name}" 업로드 완료`)
        onUploadComplete?.(dataset.id)
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '업로드 실패'
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
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                업로드 중...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                파일 업로드
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