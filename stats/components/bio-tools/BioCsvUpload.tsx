'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { FileSpreadsheet, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { uploadZoneClassName, UploadDropZoneContent } from '@/components/common/UploadDropZone'

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
}

export function BioCsvUpload({
  onDataLoaded,
  onClear,
  description = 'CSV 파일을 드래그하거나 클릭하여 업로드',
  className,
}: BioCsvUploadProps): React.ReactElement {
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
          if (result.errors.length > 0) {
            setError(`파싱 오류: ${result.errors[0].message}`)
            return
          }

          const headers = result.meta.fields ?? []
          if (headers.length < 2) {
            setError('최소 2개 이상의 열이 필요합니다')
            return
          }

          const rows = result.data as Record<string, string | number>[]
          if (rows.length === 0) {
            setError('데이터가 비어 있습니다')
            return
          }

          setFileName(file.name)
          onDataLoaded({ headers, rows, fileName: file.name })
        },
        error: (err) => {
          setError(`파일 읽기 실패: ${err.message}`)
        },
      })
    },
    [onDataLoaded],
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

  if (fileName) {
    return (
      <div className={cn('flex items-center gap-3 p-4 rounded-xl border border-border bg-card', className)}>
        <FileSpreadsheet className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <p className="text-xs text-muted-foreground">데이터 로드 완료</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClear} className="flex-shrink-0">
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
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  )
}
