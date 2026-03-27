"use client"

import { useState, useCallback, useRef } from "react"
import { X, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { uploadZoneClassName, UploadDropZoneContent } from "@/components/common/UploadDropZone"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"

interface SimpleUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SimpleUploadDialog({ open, onOpenChange }: SimpleUploadDialogProps) {
  const [uploadState, setUploadState] = useState({
    isUploading: false,
    progress: 0,
    fileName: "",
    error: "",
    success: false
  })
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.match(/\.(csv|xlsx?|tsv)$/i)) {
      setUploadState(prev => ({ ...prev, error: "CSV, Excel, TSV 파일만 지원됩니다" }))
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadState(prev => ({ ...prev, error: "파일 크기는 50MB 이하여야 합니다" }))
      return
    }

    setUploadState({
      isUploading: false,
      progress: 100,
      fileName: file.name,
      error: "",
      success: true
    })

    // 검증 통과 → /data 페이지로 이동 (실제 업로드는 해당 페이지에서 수행)
    setTimeout(() => {
      router.push("/data")
      onOpenChange(false)
    }, 1200)
  }, [router, onOpenChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      const dt = new DataTransfer()
      dt.items.add(file)
      if (fileInputRef.current) {
        fileInputRef.current.files = dt.files
        fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>스마트 분석 시작</DialogTitle>
          <DialogDescription>
            데이터를 업로드하면 AI가 자동으로 분석하고 최적의 통계 방법을 추천합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {uploadState.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                {uploadState.error}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUploadState(prev => ({ ...prev, error: "" }))}
                  aria-label="오류 메시지 닫기"
                >
                  <X className="h-4 w-4" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {uploadState.success ? (
            <div className="flex items-center gap-3 py-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">파일 확인 완료</p>
                <p className="text-xs text-muted-foreground truncate">{uploadState.fileName}</p>
              </div>
              <p className="text-xs text-muted-foreground flex-shrink-0">
                업로드 페이지로 이동 중...
              </p>
            </div>
          ) : (
            <div
              className={cn(uploadZoneClassName(false, { clickable: true }), 'group')}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls,.tsv"
                onChange={handleFileSelect}
              />
              <UploadDropZoneContent
                label="파일을 드래그하거나 클릭하여 선택"
                subtitle="CSV, Excel, TSV · 최대 50MB"
                buttonLabel="파일 선택"
                showIcon={true}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}