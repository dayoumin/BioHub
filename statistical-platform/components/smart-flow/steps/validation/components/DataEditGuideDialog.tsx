'use client'

import { memo } from 'react'
import { FileEdit, Info, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface DataEditGuideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DataEditGuideDialog = memo(function DataEditGuideDialog({
  open,
  onOpenChange
}: DataEditGuideDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            데이터 편집 가이드
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <Info className="h-4 w-4" />
            <AlertDescription>
              통계 가정 충족을 위해 데이터를 변환하거나 편집해야 할 수 있습니다.
              아래 방법들을 참고하여 데이터를 준비하세요.
            </AlertDescription>
          </Alert>

          {/* 정규성 문제 해결 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">📉 정규성 문제 해결</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium text-sm mb-2">변환 방법:</h4>
                <div className="space-y-2 text-sm">
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="font-mono text-xs mb-1">np.log(data)</p>
                    <p className="text-xs text-muted-foreground">로그 변환: 오른쪽으로 치우친 데이터</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="font-mono text-xs mb-1">np.sqrt(data)</p>
                    <p className="text-xs text-muted-foreground">제곱근 변환: 약한 치우침</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="font-mono text-xs mb-1">scipy.stats.boxcox(data)</p>
                    <p className="text-xs text-muted-foreground">Box-Cox 변환: 최적 람다 자동 결정</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 이상치 처리 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">⚠️ 이상치 처리</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium text-sm mb-2">처리 방법:</h4>
                <div className="space-y-2 text-sm">
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="font-medium text-xs mb-1">제거 (Removal):</p>
                    <p className="font-mono text-xs">data = data[data['col'] &lt; threshold]</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="font-medium text-xs mb-1">Winsorization:</p>
                    <p className="font-mono text-xs">data.clip(lower=q1, upper=q3)</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="font-medium text-xs mb-1">IQR 방법:</p>
                    <p className="font-mono text-xs">Q1 - 1.5*IQR, Q3 + 1.5*IQR</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 결측값 처리 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">🕳️ 결측값 처리</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium text-sm mb-2">대체 방법:</h4>
                <div className="space-y-2 text-sm">
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="font-medium text-xs mb-1">평균 대체:</p>
                    <p className="font-mono text-xs">data.fillna(data.mean())</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="font-medium text-xs mb-1">중앙값 대체:</p>
                    <p className="font-mono text-xs">data.fillna(data.median())</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="font-medium text-xs mb-1">삭제:</p>
                    <p className="font-mono text-xs">data.dropna()</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>주의:</strong> 데이터 변환 전 원본을 반드시 백업하세요.
              변환은 해석에 영향을 줄 수 있으므로 신중하게 선택하세요.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  )
})
