'use client'

import { useState, useCallback, useEffect } from 'react'
import { Upload, AlertCircle, Loader2, Clock, FileSpreadsheet, X } from 'lucide-react'
import { toast } from 'sonner'
import { getUserFriendlyErrorMessage } from '@/lib/constants/error-messages'
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
      const errorMsg = `파일이 너무 큽니다. 최대 ${maxSize / 1024 / 1024}MB까지 가능합니다.`
      setError(errorMsg)
      toast.error('파일 크기 초과', {
        description: `현재: ${(file.size / 1024 / 1024).toFixed(1)}MB`
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
          toast.error('파일 검증 실패', {
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
            setError('파일에 데이터가 없습니다.')
            toast.error('데이터 없음', {
              description: '파일에 처리 가능한 데이터가 없습니다'
            })
            setIsUploading(false)
            return
          }

          setUploadedFileName(file.name)
          addToRecentFiles(file.name, file.size, dataRows.length)
          onUploadComplete(file, dataRows)
          toast.success('파일 업로드 성공', {
            description: `${dataRows.length.toLocaleString()}행의 데이터를 불러왔습니다`
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
                const errorMsg = `데이터가 너무 많습니다. 최대 ${DATA_LIMITS.MAX_ROWS.toLocaleString()}행까지 가능합니다.`
                setError(errorMsg)
                toast.error('데이터 크기 초과', {
                  description: `현재: ${dataRows.length.toLocaleString()}행`
                })
                setIsUploading(false)
                return
              }

              if (dataRows.length === 0) {
                setError('파일에 데이터가 없습니다.')
                setIsUploading(false)
                return
              }

              setUploadedFileName(file.name)
              addToRecentFiles(file.name, file.size, dataRows.length)
              onUploadComplete(file, dataRows)
              toast.success('파일 업로드 성공', {
                description: `${dataRows.length.toLocaleString()}행의 데이터를 불러왔습니다`
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
        setError(err instanceof Error ? err.message : '파일 처리 중 오류가 발생했습니다.')
        setIsUploading(false)
        setProgress(null)
      }
    } else if (isExcel) {
      // Excel 파일 처리
      try {
        // Excel 파일 유효성 검증
        const validation = ExcelProcessor.validateExcelFile(file)
        if (!validation.isValid) {
          setError(validation.error || 'Excel 파일 검증 실패')
          toast.error('Excel 파일 오류', {
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
          toast.success('Excel 파일 업로드 성공', {
            description: `${data.length.toLocaleString()}행의 데이터를 불러왔습니다`
          })
          setIsUploading(false)
        } else {
          // 다중 시트면 선택 UI 표시
          setExcelSheets(sheets)
          setPendingExcelFile(file)
          setIsUploading(false)
          toast.info('시트 선택', {
            description: `${sheets.length}개의 시트가 발견되었습니다. 분석할 시트를 선택하세요.`
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Excel 파일 처리 중 오류가 발생했습니다.')
        setIsUploading(false)
      }
    } else {
      setError('지원하지 않는 파일 형식입니다.')
      toast.error('지원하지 않는 파일 형식', {
        description: 'CSV 파일을 업로드해주세요'
      })
      setIsUploading(false)
    }
  }, [onUploadComplete])

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
      toast.success('Excel 시트 로드 성공', {
        description: `${data.length.toLocaleString()}행의 데이터를 불러왔습니다`
      })

      // 상태 초기화
      setExcelSheets(null)
      setPendingExcelFile(null)
      setSelectedSheet(0)
      setIsUploading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Excel 시트 처리 중 오류가 발생했습니다.')
      setIsUploading(false)
    }
  }, [pendingExcelFile, selectedSheet, onUploadComplete])

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
              업로드 중...
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              파일 변경
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

    if (minutes < 1) return '방금 전'
    if (minutes < 60) return `${minutes}분 전`
    if (hours < 24) return `${hours}시간 전`
    if (days < 7) return `${days}일 전`
    return new Date(timestamp).toLocaleDateString()
  }

  return (
    <div className="space-y-4">
      {/* 업로드 영역 (컴팩트) */}
      {!uploadedFileName ? (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
            isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
            isUploading && "pointer-events-none opacity-50"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <h3 className="text-sm font-medium mb-1">
            {isDragActive ? '파일을 놓으세요' : '파일을 드래그하거나 클릭하여 업로드'}
          </h3>
          <p className="text-xs text-muted-foreground mb-2">최대 100,000행 | 지원 형식: CSV, Excel</p>
          <Button variant="outline" size="sm" disabled={isUploading}>
            {isUploading ? '업로드 중...' : '파일 선택'}
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg p-3 flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{uploadedFileName}</span>
          </div>
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <Button variant="outline" size="sm" disabled={isUploading}>
              파일 변경
            </Button>
          </div>
        </div>
      )}

      {/* 최근 업로드 파일 (업로드 전에만 표시) */}
      {!uploadedFileName && recentFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>최근 업로드한 파일</span>
          </div>
          <div className="grid gap-1.5">
            {recentFiles.map((file) => (
              <div
                key={file.name}
                className="group flex items-center justify-between p-2 rounded-md border bg-background hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.rows.toLocaleString()}행 · {formatFileSize(file.size)} · {formatRelativeTime(file.uploadedAt)}
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
                  aria-label="최근 파일 삭제"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            * 최근 파일 목록은 참고용입니다. 파일을 다시 업로드해주세요.
          </p>
        </div>
      )}

      {/* Excel 시트 선택 UI */}
      {excelSheets && excelSheets.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Excel 시트 선택</CardTitle>
            <CardDescription>
              {excelSheets.length}개의 시트가 발견되었습니다. 분석할 시트를 선택하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={selectedSheet.toString()}
              onValueChange={(value) => setSelectedSheet(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="시트를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {excelSheets.map((sheet) => (
                  <SelectItem key={sheet.index} value={sheet.index.toString()}>
                    {sheet.name} ({sheet.rows.toLocaleString()}행 × {sheet.cols}열)
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
                취소
              </Button>
              <Button onClick={handleSheetSelect} disabled={isUploading}>
                {isUploading ? '불러오는 중...' : '선택한 시트 불러오기'}
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
              처리 중... {progress.processedRows.toLocaleString()} / {progress.totalRows.toLocaleString()}행
            </span>
            <span className="font-medium">{Math.round(progress.percentage)}%</span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
          {progress.estimatedTimeRemaining && progress.estimatedTimeRemaining > 0 && (
            <p className="text-xs text-muted-foreground text-right">
              예상 남은 시간: {progress.estimatedTimeRemaining}초
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
              메모리 사용량 높음
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              브라우저 메모리 사용량이 높습니다. 다른 탭을 닫거나 더 작은 데이터셋을 사용해주세요.
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
              파일을 분석하고 있습니다...
            </p>
          </div>
        </div>
      )}

      {/* 도움말 (업로드 전에만 표시, 컴팩트) */}
      {!uploadedFileName && (
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <span>💡</span>
            <span>첫 번째 행은 변수명(헤더)이어야 합니다. Excel 파일의 경우 여러 시트가 있으면 선택할 수 있습니다.</span>
          </p>
        </div>
      )}
    </div>
  )
}
