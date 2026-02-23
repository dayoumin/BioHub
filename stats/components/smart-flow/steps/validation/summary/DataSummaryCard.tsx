'use client'

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'
import { ValidationResults } from '@/types/smart-flow'
import { useTerminology } from '@/hooks/use-terminology'

interface DataSummaryCardProps {
  validationResults: ValidationResults
}

export const DataSummaryCard = memo(function DataSummaryCard({
  validationResults
}: DataSummaryCardProps) {
  const t = useTerminology()
  const vs = t.validationSummary

  const hasErrors = validationResults.errors.length > 0
  const hasWarnings = validationResults.warnings.length > 0

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{vs.cardTitle}</span>
          <Badge
            variant={hasErrors ? 'destructive' : hasWarnings ? 'secondary' : 'default'}
            className="ml-2"
          >
            {hasErrors
              ? vs.errorCount(validationResults.errors.length)
              : hasWarnings
              ? vs.warningCount(validationResults.warnings.length)
              : vs.statusNormal}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{vs.summaryLabels.totalRows}</p>
            <p className="text-2xl font-bold">{validationResults.totalRows}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{vs.summaryLabels.totalColumns}</p>
            <p className="text-2xl font-bold">{validationResults.totalColumns}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{vs.summaryLabels.missingValues}</p>
            <p className="text-2xl font-bold">{validationResults.missingValues}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{vs.summaryLabels.duplicateRows}</p>
            <p className="text-2xl font-bold">{validationResults.duplicateRows || 0}</p>
          </div>
        </div>

        {hasErrors && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              {vs.sectionLabels.errors}
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
              <AlertTriangle className="h-4 w-4 text-warning" />
              {vs.sectionLabels.warnings}
            </h4>
            <ul className="space-y-1">
              {validationResults.warnings.map((warning, idx) => (
                <li key={idx} className="text-sm text-warning">{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {!hasErrors && !hasWarnings && (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">{vs.allPassedMessage}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
})