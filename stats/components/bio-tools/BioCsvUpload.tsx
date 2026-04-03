'use client'

import { memo, useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { FileSpreadsheet, X, Loader2, FileDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { uploadZoneClassName, UploadDropZoneContent } from '@/components/common/UploadDropZone'
import { toast } from 'sonner'

export interface CsvData {
  headers: string[]
  rows: Record<string, string | number>[]
  fileName: string
}

interface BioCsvUploadProps {
  onDataLoaded: (data: CsvData) => void
  onClear?: () => void
  description?: string
  className?: string
  /** 예제 데이터 경로 (예: "/example-data/condition-factor.csv") */
  exampleDataPath?: string
  /** 예제 데이터 버튼 라벨 */
  exampleLabel?: string
}

export const BioCsvUpload = memo(function BioCsvUpload({
  onDataLoaded,
  onClear,
  description = 'CSV 파일을 드래그하거나 클릭하여 업로드',
  className,
  exampleDataPath,
  exampleLabel,
}: BioCsvUploadProps): React.ReactElement {
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingExample, setIsLoadingExample] = useState(false)

  /** 파싱 결과 검증 + 상태 반영 (File 업로드 / 예제 로드 공용) */
  const applyParsed = useCallback(
    (result: Papa.ParseResult<Record<string, string | number>>, name: string) => {
      if (result.errors.length > 0) {
        setError(`파싱 오류: ${result.errors[0].message}`)
        return
      }
      const headers = result.meta.fields ?? []
      if (headers.length < 2) {
        setError('최소 2개 이상의 열이 필요합니다')
        return
      }
      const rows = result.data
      if (rows.length === 0) {
        setError('데이터가 비어 있습니다')
        return
      }
      setFileName(name)
      onDataLoaded({ headers, rows, fileName: name })
    },
    [onDataLoaded],
  )

  const processCsvText = useCallback(
    (text: string, name: string) => {
      const result = Papa.parse<Record<string, string | number>>(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
      })
      applyParsed(result, name)
    },
    [applyParsed],
  )

  const handleFile = useCallback(
    (file: File) => {
      setError(null)

      if (file.size > 100 * 1024 * 1024) {
        setError('파일이 100MB를 초과합니다')
        return
      }

      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (result) => {
          applyParsed(result as Papa.ParseResult<Record<string, string | number>>, file.name)
        },
        error: (err) => {
          setError(`파일 읽기 실패: ${err.message}`)
        },
      })
    },
    [applyParsed],
  )

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'text/plain': ['.txt', '.tsv'] },
    multiple: false,
  })

  const handleClear = useCallback(() => {
    setFileName(null)
    setError(null)
    onClear?.()
  }, [onClear])

  const handleLoadExample = useCallback(async () => {
    if (!exampleDataPath) return
    setIsLoadingExample(true)
    setError(null)

    try {
      const res = await fetch(exampleDataPath)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      const name = exampleDataPath.split('/').pop() ?? 'example.csv'
      processCsvText(text, name)
    } catch {
      toast.error('예제 데이터를 불러오지 못했습니다')
    } finally {
      setIsLoadingExample(false)
    }
  }, [exampleDataPath, processCsvText])

  if (fileName) {
    return (
      <div className={cn('flex items-center gap-3 p-4 rounded-2xl border border-border bg-card', className)}>
        <FileSpreadsheet className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <p className="text-xs text-muted-foreground">데이터 로드 완료</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClear} className="flex-shrink-0" aria-label="초기화">
          <X className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={cn(uploadZoneClassName(isDragActive, { clickable: true }), 'group')}
      >
        <input {...getInputProps()} />
        <UploadDropZoneContent
          isDragActive={isDragActive}
          label={description}
          subtitle="CSV, TSV 파일 지원"
          buttonLabel="파일 선택"
        />
      </div>

      {/* 예제 데이터 버튼 */}
      {exampleDataPath && (
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 border-t border-border/50" />
          <button
            type="button"
            onClick={handleLoadExample}
            disabled={isLoadingExample}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs',
              'text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors',
              'disabled:opacity-50 disabled:pointer-events-none',
            )}
          >
            {isLoadingExample ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
            {exampleLabel ?? '예제 데이터로 시작'}
          </button>
          <div className="flex-1 border-t border-border/50" />
        </div>
      )}

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  )
})
