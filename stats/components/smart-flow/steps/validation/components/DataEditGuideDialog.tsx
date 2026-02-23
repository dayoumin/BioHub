'use client'

import { memo } from 'react'
import { FileEdit, Info, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTerminology } from '@/hooks/use-terminology'

interface DataEditGuideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DataEditGuideDialog = memo(function DataEditGuideDialog({
  open,
  onOpenChange
}: DataEditGuideDialogProps) {
  const t = useTerminology()
  const vd = t.validationDetails.dataEditGuide

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            {vd.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Alert className="border-info-border bg-info-bg">
            <Info className="h-4 w-4" />
            <AlertDescription>
              {vd.introMessage}
            </AlertDescription>
          </Alert>

          {/* 정규성 문제 해결 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{vd.normality.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium text-sm mb-2">{vd.normality.methodsLabel}</h4>
                <div className="space-y-2 text-sm">
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="font-mono text-xs mb-1">np.log(data)</p>
                    <p className="text-xs text-muted-foreground">{vd.normality.logTransform}</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="font-mono text-xs mb-1">np.sqrt(data)</p>
                    <p className="text-xs text-muted-foreground">{vd.normality.sqrtTransform}</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="font-mono text-xs mb-1">scipy.stats.boxcox(data)</p>
                    <p className="text-xs text-muted-foreground">{vd.normality.boxCoxTransform}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 이상치 처리 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{vd.outlierHandling.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium text-sm mb-2">{vd.outlierHandling.methodsLabel}</h4>
                <div className="space-y-2 text-sm">
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="font-medium text-xs mb-1">{vd.outlierHandling.removal}</p>
                    <p className="font-mono text-xs">data = data[data['col'] &lt; threshold]</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="font-medium text-xs mb-1">{vd.outlierHandling.winsorization}</p>
                    <p className="font-mono text-xs">data.clip(lower=q1, upper=q3)</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="font-medium text-xs mb-1">{vd.outlierHandling.iqrMethod}</p>
                    <p className="font-mono text-xs">Q1 - 1.5*IQR, Q3 + 1.5*IQR</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 결측값 처리 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{vd.missingValues.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium text-sm mb-2">{vd.missingValues.methodsLabel}</h4>
                <div className="space-y-2 text-sm">
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="font-medium text-xs mb-1">{vd.missingValues.meanImputation}</p>
                    <p className="font-mono text-xs">data.fillna(data.mean())</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="font-medium text-xs mb-1">{vd.missingValues.medianImputation}</p>
                    <p className="font-mono text-xs">data.fillna(data.median())</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="font-medium text-xs mb-1">{vd.missingValues.deletion}</p>
                    <p className="font-mono text-xs">data.dropna()</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert className="border-warning-border bg-warning-bg">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {vd.warningMessage}
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  )
})
