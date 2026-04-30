'use client'

import type React from 'react'
import { Button } from '@/components/ui/button'
import type { DocumentTable, FigureRef } from '@/lib/research/document-blueprint-types'

interface DocumentArtifactListsProps {
  tables?: DocumentTable[]
  figures?: FigureRef[]
  onOpenAnalysis: (analysisId: string) => void
  onOpenFigure: (figureId: string) => void
}

function DocumentTableList({
  tables,
  onOpenAnalysis,
}: {
  tables: DocumentTable[]
  onOpenAnalysis: (analysisId: string) => void
}): React.ReactElement {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">표</h3>
      {tables.map((table, index) => {
        const sourceAnalysisId = table.sourceAnalysisId

        return (
          <div
            key={table.id ?? index}
            data-doc-target={table.id ? `table:${table.id}` : undefined}
            className="border rounded-lg overflow-hidden"
          >
            <div className="flex items-center gap-2 bg-muted/50 p-2">
              <p className="min-w-0 flex-1 text-xs font-medium">{table.caption}</p>
              {sourceAnalysisId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onOpenAnalysis(sourceAnalysisId)}
                >
                  통계 열기
                </Button>
              )}
            </div>
            {table.sourceAnalysisLabel && (
              <div className="px-2 pb-2 text-xs text-muted-foreground">
                관련 분석: {table.sourceAnalysisLabel}
              </div>
            )}
            {table.htmlContent ? (
              <div
                className="p-2 text-sm overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: table.htmlContent }}
              />
            ) : (
              <div className="p-2 overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr>
                      {table.headers.map((header, headerIndex) => (
                        <th key={headerIndex} className="border px-2 py-1 bg-muted/30 text-left">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="border px-2 py-1">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function DocumentFigureList({
  figures,
  onOpenAnalysis,
  onOpenFigure,
}: {
  figures: FigureRef[]
  onOpenAnalysis: (analysisId: string) => void
  onOpenFigure: (figureId: string) => void
}): React.ReactElement {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground">그림</h3>
      {figures.map((figure) => {
        const relatedAnalysisId = figure.relatedAnalysisId

        return (
          <div
            key={figure.entityId}
            data-doc-target={`figure:${figure.entityId}`}
            className="rounded border bg-muted/20 p-2 text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{figure.label}</span>
              <span className="text-muted-foreground">{figure.caption}</span>
              <div className="ml-auto flex items-center gap-2">
                {relatedAnalysisId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onOpenAnalysis(relatedAnalysisId)}
                  >
                    통계 열기
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onOpenFigure(figure.entityId)}
                >
                  Graph Studio
                </Button>
              </div>
            </div>
            {(figure.relatedAnalysisLabel || figure.patternSummary) && (
              <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                {figure.relatedAnalysisLabel && (
                  <p>관련 분석: {figure.relatedAnalysisLabel}</p>
                )}
                {figure.patternSummary && (
                  <p>패턴 요약: {figure.patternSummary}</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function DocumentArtifactLists({
  tables,
  figures,
  onOpenAnalysis,
  onOpenFigure,
}: DocumentArtifactListsProps): React.ReactElement | null {
  const hasTables = Boolean(tables?.length)
  const hasFigures = Boolean(figures?.length)

  if (!hasTables && !hasFigures) {
    return null
  }

  return (
    <>
      {hasTables && (
        <DocumentTableList
          tables={tables ?? []}
          onOpenAnalysis={onOpenAnalysis}
        />
      )}
      {hasFigures && (
        <DocumentFigureList
          figures={figures ?? []}
          onOpenAnalysis={onOpenAnalysis}
          onOpenFigure={onOpenFigure}
        />
      )}
    </>
  )
}
