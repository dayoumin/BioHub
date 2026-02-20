"use client"

import { useState, useCallback } from "react"
import { Upload, X, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
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

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 검증
    if (!file.name.match(/\.(csv|xlsx?|tsv)$/i)) {
      setUploadState(prev => ({ ...prev, error: "CSV, Excel, TSV 파일만 지원됩니다" }))
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadState(prev => ({ ...prev, error: "파일 크기는 50MB 이하여야 합니다" }))
      return
    }

    // 업로드 시작
    setUploadState({
      isUploading: true,
      progress: 0,
      fileName: file.name,
      error: "",
      success: false
    })

    // 업로드 시뮬레이션 (실제로는 파일 처리 로직)
    const steps = [10, 25, 40, 60, 75, 90, 100]
    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 500))
      setUploadState(prev => ({ ...prev, progress: step }))
    }

    // 완료
    setUploadState(prev => ({
      ...prev,
      isUploading: false,
      success: true
    }))

    // 3초 후 자동으로 데이터 페이지로 이동
    setTimeout(() => {
      router.push("/data")
      onOpenChange(false)
    }, 3000)
  }, [router, onOpenChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      const input = document.getElementById('file-input') as HTMLInputElement
      const dt = new DataTransfer()
      dt.items.add(file)
      input.files = dt.files
      const event = new Event('change', { bubbles: true })
      input.dispatchEvent(event)
    }
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

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
            <div className="text-center py-12 space-y-4">
              <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
              <div>
                <p className="text-xl font-semibold">업로드 완료!</p>
                <p className="text-muted-foreground">{uploadState.fileName}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                데이터 분석 페이지로 이동합니다...
              </p>
            </div>
          ) : uploadState.isUploading ? (
            <div className="text-center py-12 space-y-4">
              <div className="animate-spin mx-auto">
                <Upload className="h-16 w-16 text-primary" />
              </div>
              <div>
                <p className="text-xl font-semibold">데이터 분석 중...</p>
                <p className="text-muted-foreground">{uploadState.fileName}</p>
              </div>
              <Progress value={uploadState.progress} className="max-w-xs mx-auto" />
              <p className="text-sm text-muted-foreground">
                {uploadState.progress}% 완료
              </p>
            </div>
          ) : (
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center hover:bg-muted/50 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">
                파일을 드래그하거나 클릭하여 선택하세요
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                CSV, Excel (xlsx, xls), TSV 지원 • 최대 50MB
              </p>
              <Button variant="outline" asChild>
                <label htmlFor="file-input" className="cursor-pointer">
                  파일 선택
                </label>
              </Button>
              <input
                id="file-input"
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls,.tsv"
                onChange={handleFileSelect}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}