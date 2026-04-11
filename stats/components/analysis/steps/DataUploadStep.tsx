'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { AlertCircle, Loader2, Clock, FileSpreadsheet, X, Lightbulb, CloudUpload } from 'lucide-react'
import { toast } from 'sonner'
import { getUserFriendlyErrorMessage } from '@/lib/constants/error-messages'
import { findCriticalParseError, parseWarningMessage } from '@/lib/utils/csv-parse-errors'
import { useTerminology } from '@/hooks/use-terminology'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { cn } from '@/lib/utils'
import { focusRing } from '@/components/common/card-styles'
import { formatTimeAgo } from '@/lib/utils/format-time'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { DataValidationService, DATA_LIMITS, LargeFileProcessor, ExcelProcessor } from '@/lib/services'
import { DataRow } from '@/types/analysis'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ProcessingProgress, SheetInfo } from '@/lib/services'

import type { DataUploadStepProps } from '@/types/analysis-navigation'
import { RefreshCw } from 'lucide-react'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'

// 최근 파일 타입
interface RecentFile {
  name: string
  size: number
  rows: number
  uploadedAt: number
}

// localStorage 키
const RECENT_FILES_KEY = STORAGE_KEYS.analysis.recentFiles
const MAX_RECENT_FILES = 5

export function DataUploadStep({
  onUploadComplete,
  onNext: _onNext,
  canGoNext: _canGoNext,
  currentStep: _currentStep,
  totalSteps: _totalSteps,
  existingFileName,
  compact = false,
  autoOpen = false,
  hideButton = false,
  onAutoOpenHandled
}: DataUploadStepProps & {
  existingFileName?: string
  compact?: boolean
  autoOpen?: boolean
  hideButton?: boolean
  onAutoOpenHandled?: () => void
}) {
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
  const autoOpenHandledRef = useRef(false)

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
                const critical = findCriticalParseError(result.errors)
                if (critical) {
                  setError(getUserFriendlyErrorMessage(`CSV parsing error: ${critical.message}`))
                  setIsUploading(false)
                  return
                }
                // FieldMismatch 등 경고 수준 — 계속 진행 (오류 행도 포함됨)
                toast.warning(parseWarningMessage(result.errors.length))
              }

              const dataRows = result.data as DataRow[]
              if (dataRows.length > DATA_LIMITS.MAX_ROWS) {
                const errorMsg = t.dataUpload.errors.tooManyRows(DATA_LIMITS.MAX_ROWS.toLocaleString())
                setError(errorMsg)
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
      <div className="relative space-y-2">
        <div className="relative">
          <input {...getInputProps()} />
          <Button
            variant="outline"
            size="sm"
            onClick={open}
            disabled={isUploading}
            className="gap-1.5"
            data-testid="replace-data-button"
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
        </div>
        {excelSheets && excelSheets.length > 1 && (
          <div className="absolute right-0 top-full z-50 mt-1.5 w-[320px] rounded-xl border border-border/40 bg-popover p-3 shadow-[0px_12px_32px_rgba(25,28,30,0.12)]">
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{t.dataUpload.labels.selectSheet}</p>
                <p className="text-xs text-muted-foreground">
                  {t.dataUpload.labels.sheetsFound(excelSheets.length)}
                </p>
              </div>
              <Select
                value={selectedSheet.toString()}
                onValueChange={(value) => setSelectedSheet(parseInt(value))}
              >
                <SelectTrigger className="border-outline-variant/20 bg-surface-container-low/50">
                  <SelectValue placeholder={t.dataUpload.labels.selectSheetPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {excelSheets.map((sheet) => (
                    <SelectItem key={sheet.index} value={sheet.index.toString()}>
                      <span className="tabular-nums">
                        {t.dataUpload.labels.sheetInfo(sheet.name, sheet.rows.toLocaleString(), sheet.cols)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setExcelSheets(null)
                    setPendingExcelFile(null)
                    setSelectedSheet(0)
                  }}
                >
                  {t.dataUpload.buttons.cancel}
                </Button>
                <Button size="sm" onClick={handleSheetSelect} disabled={isUploading}>
                  {isUploading ? t.dataUpload.buttons.loading : t.dataUpload.buttons.loadSelectedSheet}
                </Button>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute top-full mt-1.5 right-0 bg-destructive/8 rounded-lg p-2 text-xs text-destructive whitespace-nowrap z-50 shadow-[0px_4px_16px_rgba(25,28,30,0.06)]">
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

  const formatRelativeTime = (timestamp: number): string =>
    formatTimeAgo(timestamp, t.hub.timeAgo, 7)

  const showRecentFiles = !uploadedFileName && recentFiles.length > 0
  const showProcessingStatus = isUploading
  const showStandaloneMemoryWarning = memoryWarning && !showProcessingStatus

  return (
    <div className="space-y-6">
      <div className={cn('grid gap-5', !uploadedFileName && 'xl:grid-cols-[minmax(0,1fr)_320px]')}>
        {/* 업로드 영역 — PC에서 메인 행동에 집중 */}
        {!uploadedFileName ? (
          <div
            {...getRootProps()}
            className={cn(
              'group relative rounded-2xl px-8 py-12 text-center transition-all duration-200',
              'bg-surface-container-low',
              'border-2 border-dashed',
              isDragActive
                ? 'border-primary/60 bg-primary/5 shadow-[0_0_0_4px_rgba(var(--primary-rgb,0,0,0),0.05)]'
                : 'border-outline-variant/40 hover:border-primary/30',
              isUploading && 'pointer-events-none opacity-50',
              'cursor-pointer',
            )}
          >
            <input {...getInputProps()} />
            <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-[0px_6px_20px_rgba(25,28,30,0.06)] group-hover:shadow-[0px_8px_24px_rgba(25,28,30,0.08)] transition-shadow duration-200">
              <CloudUpload className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground mb-2" aria-live="polite">
              {isDragActive ? t.dataUpload.labels.dropHere : t.dataUpload.labels.dragOrClick}
            </h3>
            <p className="mx-auto max-w-xl text-sm text-muted-foreground leading-relaxed mb-6">
              {t.dataUpload.labels.fileSpecifications}
            </p>
            <Button
              size="default"
              className="h-10 px-5 shadow-sm"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t.dataUpload.buttons.uploading}
                </>
              ) : (
                t.dataUpload.buttons.selectFile
              )}
            </Button>
          </div>
        ) : (
          <div className="rounded-xl p-4 flex items-center justify-between bg-surface-container-lowest shadow-[0px_4px_16px_rgba(25,28,30,0.04)] border border-outline-variant/15">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="h-4.5 w-4.5 text-primary" />
              </div>
              <span className="text-sm font-medium tracking-tight text-foreground truncate">{uploadedFileName}</span>
            </div>
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <Button variant="outline" size="sm" disabled={isUploading} className="border-outline-variant/20 shadow-none hover:bg-surface-container-low">
                {t.dataUpload.buttons.changeFile}
              </Button>
            </div>
          </div>
        )}

        {!uploadedFileName && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/50 bg-surface-container-lowest p-5 shadow-[0px_4px_16px_rgba(25,28,30,0.04)]">
              <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5">
                <Lightbulb className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-muted-foreground/60" />
                <span>{t.dataUpload.labels.helpText}</span>
              </p>
            </div>

            {showRecentFiles && (
              <div className="rounded-2xl border border-border/50 bg-surface-container-lowest shadow-[0px_4px_16px_rgba(25,28,30,0.04)] overflow-hidden">
                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border/40">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <Clock className="h-3 w-3" />
                      <span>{t.dataUpload.labels.recentFiles}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground/70 leading-relaxed">
                      {t.dataUpload.labels.recentFilesClickHint}
                    </p>
                  </div>
                </div>

                <div className="max-h-[280px] overflow-y-auto">
                  {recentFiles.map((file, idx) => (
                    <div
                      key={file.name}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        'group flex items-center justify-between px-4 py-3 transition-colors duration-150 cursor-pointer',
                        idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low/40',
                        'hover:bg-surface-container-low',
                        focusRing,
                      )}
                      onClick={() => open()}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}
                      title={t.dataUpload.labels.recentFileClickTitle}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center flex-shrink-0">
                          <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate tracking-tight text-foreground">{file.name}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {t.dataUpload.labels.fileMetadata(file.rows.toLocaleString(), formatFileSize(file.size), formatRelativeTime(file.uploadedAt))}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
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
              </div>
            )}
          </div>
        )}
      </div>

      {/* Excel 시트 선택 UI — Axiom Slate: elevated card, no hard border */}
      {excelSheets && excelSheets.length > 1 && (
        <Card className="border-0 bg-surface-container-lowest shadow-[0px_12px_32px_rgba(25,28,30,0.04)]">
          <CardHeader>
            <CardTitle className="text-base font-semibold tracking-tight text-foreground">{t.dataUpload.labels.selectSheet}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {t.dataUpload.labels.sheetsFound(excelSheets.length)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Select
              value={selectedSheet.toString()}
              onValueChange={(value) => setSelectedSheet(parseInt(value))}
            >
              <SelectTrigger className="border-outline-variant/20 bg-surface-container-low/50">
                <SelectValue placeholder={t.dataUpload.labels.selectSheetPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {excelSheets.map((sheet) => (
                  <SelectItem key={sheet.index} value={sheet.index.toString()}>
                    <span className="tabular-nums">{t.dataUpload.labels.sheetInfo(sheet.name, sheet.rows.toLocaleString(), sheet.cols)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2.5">
              <Button
                variant="outline"
                className="border-outline-variant/20 shadow-none"
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

      {/* 에러 메시지 */}
      {error && (
        <Card className="border-error-border/70 bg-destructive/8 shadow-[0px_4px_16px_rgba(25,28,30,0.04)]">
          <CardContent className="px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold tracking-tight text-foreground">업로드를 완료하지 못했습니다</p>
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 업로드 상태 */}
      {showProcessingStatus && (
        <Card className="border-border/50 bg-surface-container-lowest shadow-[0px_4px_16px_rgba(25,28,30,0.04)]">
          <CardContent className="px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <p className="text-sm font-semibold tracking-tight text-foreground">파일을 처리하는 중입니다</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {progress ? t.dataUpload.labels.processing(progress.processedRows.toLocaleString(), progress.totalRows.toLocaleString()) : t.dataUpload.labels.analyzing}
                  </p>
                </div>

                {progress ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">진행률</span>
                      <span className="font-semibold tabular-nums text-foreground">{Math.round(progress.percentage)}%</span>
                    </div>
                    <Progress value={progress.percentage} className="h-1.5" />
                    {progress.estimatedTimeRemaining && progress.estimatedTimeRemaining > 0 && (
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {t.dataUpload.labels.estimatedTime(progress.estimatedTimeRemaining)}
                      </p>
                    )}
                  </div>
                ) : null}

                {memoryWarning && (
                  <div className="rounded-xl border border-warning-border/60 bg-warning-bg/80 px-3.5 py-3">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{t.dataUpload.warnings.highMemoryTitle}</p>
                        <p className="text-xs leading-relaxed text-warning-muted">
                          {t.dataUpload.warnings.highMemoryDescription}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showStandaloneMemoryWarning && (
        <Card className="border-warning-border/70 bg-warning-bg/80 shadow-[0px_4px_16px_rgba(25,28,30,0.04)]">
          <CardContent className="px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/10">
                <AlertCircle className="h-4 w-4 text-warning" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold tracking-tight text-foreground">{t.dataUpload.warnings.highMemoryTitle}</p>
                <p className="text-xs leading-relaxed text-warning-muted">
                  {t.dataUpload.warnings.highMemoryDescription}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
