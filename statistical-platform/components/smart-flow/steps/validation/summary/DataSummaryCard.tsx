'use client'

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'
import { ValidationResults } from '@/types/smart-flow'

interface DataSummaryCardProps {
  validationResults: ValidationResults
}

export const DataSummaryCard = memo(function DataSummaryCard({
  validationResults
}: DataSummaryCardProps) {
  const hasErrors = validationResults.errors.length > 0
  const hasWarnings = validationResults.warnings.length > 0

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>데이터 검증 결과</span>
          <Badge
            variant={hasErrors ? 'destructive' : hasWarnings ? 'secondary' : 'default'}
            className="ml-2"
          >
            {hasErrors
              ? `${validationResults.errors.length}개 오류`
              : hasWarnings
              ? `${validationResults.warnings.length}개 경고`
              : '정상'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">총 행 수</p>
            <p className="text-2xl font-bold">{validationResults.totalRows}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">총 열 수</p>
            <p className="text-2xl font-bold">{validationResults.totalColumns}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">결측값</p>
            <p className="text-2xl font-bold">{validationResults.missingValues}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">중복 행</p>
            <p className="text-2xl font-bold">{validationResults.duplicateRows || 0}</p>
          </div>
        </div>

        {hasErrors && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              오류
            </h4>
            <ul className="space-y-1">
              {validationResults.errors.map((error, idx) => (
                <li key={idx} className="text-sm text-destructive">{error}</li>
              ))}
            </ul>
          </div>
        )}

        {hasWarnings && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              경고
            </h4>
            <ul className="space-y-1">
              {validationResults.warnings.map((warning, idx) => (
                <li key={idx} className="text-sm text-yellow-600">{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {!hasErrors && !hasWarnings && (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">모든 데이터 검증을 통과했습니다.</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
})