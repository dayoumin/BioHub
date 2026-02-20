'use client'

import { useState, useCallback, useEffect } from 'react'
import { Upload, AlertCircle, Loader2, Clock, FileSpreadsheet, X, Lightbulb } from 'lucide-react'
import { toast } from 'sonner'
import { getUserFriendlyErrorMessage } from '@/lib/constants/error-messages'
import { useTerminology } from '@/hooks/use-terminology'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { DataValidationService, DATA_LIMITS } from '@/lib/services/data-validation-service'
import { LargeFileProcessor, ProcessingProgress } from '@/lib/services/large-file-processor'
import { ExcelProcessor, SheetInfo } from '@/lib/services/excel-processor'
import { DataRow } from '@/types/smart-flow'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { DataUploadStepProps } from '@/types/smart-flow-navigation'
import { RefreshCw } from 'lucide-react'

// 최근 파일 타입
interface RecentFile {
  name: string
  size: number
  rows: number
  uploadedAt: number
}

// localStorage 키
const RECENT_FILES_KEY = 'statPlatform_recentFiles'
const MAX_RECENT_FILES = 5

export function DataUploadStep({
  onUploadComplete,
  onNext,
  canGoNext,
  currentStep,
  totalSteps,
  existingFileName,
  compact = false
}: DataUploadStepProps & { existingFileName?: string; compact?: boolean }) {
  const t = useTerminology()
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProcessingProgress | null>(null)
  const [memoryWarning, setMemoryWarning] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(existingFileName || null)
  const [excelSheets, setExcelSheets] = useState<SheetInfo[] | null>(null)
  const [selectedSheet, setSelectedSheet] = useState<number>(0)
  const [pendingExcelFile, setPendingExcelFile] = useState<File | null>(null)
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])

  // 최근 파일 목록 로드
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_FILES_KEY)
    if (saved) {
      try {
        setRecentFiles(JSON.parse(saved))
      } catch {
        // 파싱 실패 시 무시
      }
    }
  }, [])

  // 최근 파일 목록에 추가
  const addToRecentFiles = useCallback((fileName: string, fileSize: number, rowCount: number) => {
    setRecentFiles(prev => {
      const newFile: RecentFile = {
        name: fileName,
        size: fileSize,
        rows: rowCount,
        uploadedAt: Date.now()
      }
      // 중복 제거 후 최신 파일 앞에 추가
      const filtered = prev.filter(f => f.name !== fileName)
      const updated = [newFile, ...filtered].slice(0, MAX_RECENT_FILES)
      localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  // 최근 파일 삭제
  const removeRecentFile = useCallback((fileName: string) => {
    setRecentFiles(prev => {
      const updated = prev.filter(f => f.name !== fileName)
      localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const handleFileProcess = useCallback(async (file: File) => {
    setIsUploading(true)
    setError(null)
    setProgress(null)
    setMemoryWarning(false)

    // 파일 타입별 크기 제한
    const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv')
    const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    file.type === 'application/vnd.ms-excel' ||
                    file.name.endsWith('.xlsx') ||
                    file.name.endsWith('.xls')

    const maxSize = isCSV ? 100 * 1024 * 1024 : isExcel ? 20 * 1024 * 1024 : DATA_LIMITS.MAX_FILE_SIZE

    if (file.size > maxSize) {
      const errorMsg = t.dataUpload.errors.fileTooLarge(maxSize / 1024 / 1024)
      setError(errorMsg)
      toast.error(t.dataUpload.errors.fileSizeExceeded, {
        description: t.dataUpload.errors.currentFileSize((file.size / 1024 / 1024).toFixed(1))
      })
      setIsUploading(false)
      return
    }

    // CSV 파일 처리
    if (isCSV) {
      try {
        // 보안 검증 수행
        const securityCheck = await DataValidationService.validateFileContent(file)
        if (!securityCheck.isValid) {
          const errorMsg = getUserFriendlyErrorMessage(securityCheck.error || 'File security validation failed')
          setError(errorMsg)
          toast.error(t.dataUpload.errors.validationFailed, {
            description: errorMsg
          })
          setIsUploading(false)
          return
        }

        // 대용량 파일 여부 확인
        if (LargeFileProcessor.isLargeFile(file)) {
          // 메모리 체크
          const memoryInfo = LargeFileProcessor.getMemoryInfo()
          if (memoryInfo && memoryInfo.percentage > 70) {
            setMemoryWarning(true)
          }

          // 청크 방식으로 처리
          const dataRows = await LargeFileProcessor.processInChunks(file, {
            chunkSize: 10000,
            maxRows: DATA_LIMITS.MAX_ROWS,
            onProgress: (progress) => {
              setProgress(progress)
            },
            onChunk: (_, chunkIndex) => {
              // 메모리 모니터링
              if (chunkIndex % 5 === 0) {
                const mem = LargeFileProcessor.getMemoryInfo()
                if (mem && mem.percentage > 80) {
                  setMemoryWarning(true)
                }
              }
            }
          })

          if (dataRows.length === 0) {
            setError(t.dataUpload.errors.noDataInFile)
            toast.error(t.dataUpload.errors.noDataTitle, {
              description: t.dataUpload.errors.noValidData
            })
            setIsUploading(false)
            return
          }

          setUploadedFileName(file.name)
          addToRecentFiles(file.name, file.size, dataRows.length)
          onUploadComplete(file, dataRows)
          toast.success(t.dataUpload.success.fileUploaded, {
            description: t.dataUpload.success.dataLoaded(dataRows.length.toLocaleString())
          })
          setIsUploading(false)
          setProgress(null)
        } else {
          // 일반 처리 (작은 파일)
          Papa.parse(file, {
            encoding: 'UTF-8', // UTF-8 인코딩 명시
            complete: (result) => {
              if (result.errors.length > 0) {
                const errorMessages = result.errors.map(e => e.message).join(', ')
                const friendlyError = getUserFriendlyErrorMessage(`CSV parsing error: ${errorMessages}`)
                setError(friendlyError)
                setIsUploading(false)
                return
              }

              const dataRows = result.data as DataRow[]
              if (dataRows.length > DATA_LIMITS.MAX_ROWS) {
                const errorMsg = t.dataUpload.errors.tooManyRows(DATA_LIMITS.MAX_ROWS.toLocaleString())
                setError(errorMsg)
                toast.error(t.dataUpload.errors.dataSizeExceeded, {
                  description: t.dataUpload.errors.currentRowCount(dataRows.length.toLocaleString())
                })
                setIsUploading(false)
                return
              }

              if (dataRows.length === 0) {
                setError(t.dataUpload.errors.noDataInFile)
                setIsUploading(false)
                return
              }

              setUploadedFileName(file.name)
              addToRecentFiles(file.name, file.size, dataRows.length)
              onUploadComplete(file, dataRows)
              toast.success(t.dataUpload.success.fileUploaded, {
                description: t.dataUpload.success.dataLoaded(dataRows.length.toLocaleString())
              })
              setIsUploading(false)
            },
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            error: (error) => {
              setError(getUserFriendlyErrorMessage(error))
              setIsUploading(false)
            }
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t.dataUpload.errors.processingError)
        setIsUploading(false)
        setProgress(null)
      }
    } else if (isExcel) {
      // Excel 파일 처리
      try {
        // Excel 파일 유효성 검증
        const validation = ExcelProcessor.validateExcelFile(file)
        if (!validation.isValid) {
          setError(validation.error || t.dataUpload.errors.excelValidationFailed)
          toast.error(t.dataUpload.errors.excelFileError, {
            description: validation.error
          })
          setIsUploading(false)
          return
        }

        // 시트 목록 가져오기
        const sheets = await ExcelProcessor.getSheetList(file)

        if (sheets.length === 1) {
          // 단일 시트면 바로 처리
          const data = await ExcelProcessor.parseExcelFile(file, {
            sheetIndex: 0,
            maxRows: DATA_LIMITS.MAX_ROWS
          })

          setUploadedFileName(file.name)
          addToRecentFiles(file.name, file.size, data.length)
          onUploadComplete(file, data)
          toast.success(t.dataUpload.success.excelFileUploaded, {
            description: t.dataUpload.success.dataLoaded(data.length.toLocaleString())
          })
          setIsUploading(false)
        } else {
          // 다중 시트면 선택 UI 표시
          setExcelSheets(sheets)
          setPendingExcelFile(file)
          setIsUploading(false)
          toast.info(t.dataUpload.toast.selectSheet, {
            description: t.dataUpload.toast.sheetsFoundDescription(sheets.length)
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t.dataUpload.errors.excelProcessingError)
        setIsUploading(false)
      }
    } else {
      setError(t.dataUpload.errors.unsupportedFormat)
      toast.error(t.dataUpload.errors.unsupportedFormatTitle, {
        description: t.dataUpload.errors.csvRequired
      })
      setIsUploading(false)
    }
  }, [onUploadComplete, addToRecentFiles, t])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      handleFileProcess(acceptedFiles[0])
    }
  }, [handleFileProcess])

  // Excel 시트 선택 후 처리
  const handleSheetSelect = useCallback(async () => {
    if (!pendingExcelFile || selectedSheet === null) return

    setIsUploading(true)
    setError(null)

    try {
      const data = await ExcelProcessor.parseExcelFile(pendingExcelFile, {
        sheetIndex: selectedSheet,
        maxRows: DATA_LIMITS.MAX_ROWS
      })

      setUploadedFileName(pendingExcelFile.name)
      addToRecentFiles(pendingExcelFile.name, pendingExcelFile.size, data.length)
      onUploadComplete(pendingExcelFile, data)
      toast.success(t.dataUpload.success.sheetLoaded, {
        description: t.dataUpload.success.dataLoaded(data.length.toLocaleString())
      })

      // 상태 초기화
      setExcelSheets(null)
      setPendingExcelFile(null)
      setSelectedSheet(0)
      setIsUploading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.dataUpload.errors.sheetProcessingError)
      setIsUploading(false)
    }
  }, [pendingExcelFile, selectedSheet, onUploadComplete, addToRecentFiles, t])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
    disabled: isUploading, // 업로드 중에는 드롭존 비활성화
    noClick: compact, // compact 모드에서는 드롭존 클릭 비활성화 (버튼으로 대체)
    noDrag: compact // compact 모드에서는 드래그 비활성화
  })

  // Compact 모드: 파일 변경 버튼만 표시
  if (compact) {
    return (
      <div className="relative">
        <input {...getInputProps()} />
        <Button
          variant="outline"
          size="sm"
          onClick={open}
          disabled={isUploading}
          className="gap-1.5"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t.dataUpload.buttons.uploading}
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              {t.dataUpload.buttons.changeFile}
            </>
          )}
        </Button>
        {error && (
          <div className="absolute top-full mt-1 right-0 bg-destructive/10 border border-destructive/20 rounded-lg p-2 text-xs text-destructive whitespace-nowrap z-50">
            {error}
          </div>
        )}
      </div>
    )
  }

  // 파일 크기 포맷
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  }

  // 상대 시간 포맷
  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return t.hub.timeAgo.justNow
    if (minutes < 60) return t.hub.timeAgo.minutesAgo(minutes)
    if (hours < 24) return t.hub.timeAgo.hoursAgo(hours)
    if (days < 7) return t.hub.timeAgo.daysAgo(days)
    return new Date(timestamp).toLocaleDateString()
  }

  return (
    <div className="space-y-4">
      {/* 업로드 영역 */}
      {!uploadedFileName ? (
        <div
          {...getRootProps()}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer group",
            isDragActive
              ? "border-primary bg-primary/5 shadow-[0_0_0_4px_rgba(var(--primary-rgb,0,0,0),0.05)]"
              : "border-border/60 hover:border-primary/40 hover:bg-muted/20",
            isUploading && "pointer-events-none opacity-50"
          )}
        >
          <input {...getInputProps()} />
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-muted/50 border border-border/40 flex items-center justify-center group-hover:bg-primary/5 group-hover:border-primary/20 transition-colors duration-300">
            <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
          </div>
          <h3 className="text-sm font-semibold tracking-tight mb-1">
            {isDragActive ? t.dataUpload.labels.dropHere : t.dataUpload.labels.dragOrClick}
          </h3>
          <p className="text-xs text-muted-foreground/80 mb-3">{t.dataUpload.labels.fileSpecifications}</p>
          <Button variant="outline" size="sm" disabled={isUploading} className="shadow-sm">
            {isUploading ? t.dataUpload.buttons.uploading : t.dataUpload.buttons.selectFile}
          </Button>
        </div>
      ) : (
        <div className="border border-border/40 rounded-xl p-4 flex items-center justify-between bg-muted/20 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium tracking-tight">{uploadedFileName}</span>
          </div>
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <Button variant="outline" size="sm" disabled={isUploading} className="shadow-sm">
              {t.dataUpload.buttons.changeFile}
            </Button>
          </div>
        </div>
      )}

      {/* 최근 업로드 파일 (업로드 전에만 표시) */}
      {!uploadedFileName && recentFiles.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
            <Clock className="h-3 w-3" />
            <span>{t.dataUpload.labels.recentFiles}</span>
          </div>
          <div className="grid gap-1">
            {recentFiles.map((file) => (
              <div
                key={file.name}
                className="group flex items-center justify-between p-2.5 rounded-lg border border-transparent bg-muted/20 hover:bg-muted/40 hover:border-border/30 transition-all duration-200"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate tracking-tight">{file.name}</p>
                    <p className="text-[11px] text-muted-foreground/70">
                      {t.dataUpload.labels.fileMetadata(file.rows.toLocaleString(), formatFileSize(file.size), formatRelativeTime(file.uploadedAt))}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeRecentFile(file.name)
                  }}
                  aria-label={t.dataUpload.buttons.deleteRecentFile}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground/60">
            {t.dataUpload.labels.recentFilesNote}
          </p>
        </div>
      )}

      {/* Excel 시트 선택 UI */}
      {excelSheets && excelSheets.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.dataUpload.labels.selectSheet}</CardTitle>
            <CardDescription>
              {t.dataUpload.labels.sheetsFound(excelSheets.length)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={selectedSheet.toString()}
              onValueChange={(value) => setSelectedSheet(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t.dataUpload.labels.selectSheetPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {excelSheets.map((sheet) => (
                  <SelectItem key={sheet.index} value={sheet.index.toString()}>
                    {t.dataUpload.labels.sheetInfo(sheet.name, sheet.rows.toLocaleString(), sheet.cols)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setExcelSheets(null)
                  setPendingExcelFile(null)
                  setSelectedSheet(0)
                }}
              >
                {t.dataUpload.buttons.cancel}
              </Button>
              <Button onClick={handleSheetSelect} disabled={isUploading}>
                {isUploading ? t.dataUpload.buttons.loading : t.dataUpload.buttons.loadSelectedSheet}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 진행률 표시 */}
      {progress && isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t.dataUpload.labels.processing(progress.processedRows.toLocaleString(), progress.totalRows.toLocaleString())}
            </span>
            <span className="font-medium">{Math.round(progress.percentage)}%</span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
          {progress.estimatedTimeRemaining && progress.estimatedTimeRemaining > 0 && (
            <p className="text-xs text-muted-foreground text-right">
              {t.dataUpload.labels.estimatedTime(progress.estimatedTimeRemaining)}
            </p>
          )}
        </div>
      )}

      {/* 메모리 경고 */}
      {memoryWarning && (
        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
              {t.dataUpload.warnings.highMemoryTitle}
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              {t.dataUpload.warnings.highMemoryDescription}
            </p>
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* 대용량 파일 처리 중 메시지 */}
      {isUploading && !progress && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <p className="text-sm text-blue-900 dark:text-blue-100">
              {t.dataUpload.labels.analyzing}
            </p>
          </div>
        </div>
      )}

      {/* 도움말 (업로드 전에만 표시) */}
      {!uploadedFileName && (
        <div className="bg-muted/30 border border-border/20 rounded-xl p-4">
          <p className="text-xs text-muted-foreground/80 flex items-start gap-2 leading-relaxed">
            <Lightbulb className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-muted-foreground/50" />
            <span>{t.dataUpload.labels.helpText}</span>
          </p>
        </div>
      )}
    </div>
  )
}
