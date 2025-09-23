'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertCircle,
  CheckCircle2,
  Info,
  ChevronRight,
  Sparkles,
  X,
  HelpCircle,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types
import {
  VariableType,
  VariableRole,
  StatisticalMethodRequirements,
  getMethodRequirements
} from '@/lib/statistics/variable-requirements'
import {
  analyzeDataset,
  getVariableTypeIcon,
  getVariableTypeColor,
  getVariableTypeLabel,
  ColumnAnalysis
} from '@/lib/services/variable-type-detector'

interface VariableSelectorProps {
  methodId: string
  data: Record<string, any>[]
  onVariablesSelected: (variables: VariableAssignment) => void
  onValidation?: (valid: boolean, errors: string[]) => void
  className?: string
}

export interface VariableAssignment {
  [role: string]: string | string[]
}

interface DragItem {
  columnName: string
  analysis: ColumnAnalysis
}

/**
 * 변수 선택 UI 컴포넌트
 * 드래그 앤 드롭으로 통계 메서드에 필요한 변수를 할당
 */
export function VariableSelector({
  methodId,
  data,
  onVariablesSelected,
  onValidation,
  className
}: VariableSelectorProps) {
  const [assignments, setAssignments] = useState<VariableAssignment>({})
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showHelp, setShowHelp] = useState(false)

  // 메서드 요구사항 가져오기
  const methodRequirements = useMemo(() => {
    return getMethodRequirements(methodId)
  }, [methodId])

  // 데이터 분석
  const dataAnalysis = useMemo(() => {
    if (!data || data.length === 0) return null
    return analyzeDataset(data, { detectIdColumns: true })
  }, [data])

  // 변수 할당 검증
  const validateAssignments = useCallback(() => {
    if (!methodRequirements) return { valid: false, errors: ['메서드를 찾을 수 없습니다'] }

    const errors: string[] = []

    methodRequirements.variables.forEach(varReq => {
      const assigned = assignments[varReq.role]

      // 필수 변수 체크
      if (varReq.required && !assigned) {
        errors.push(`${varReq.label}이(가) 필요합니다`)
        return
      }

      if (!assigned) return

      // 배열 변환
      const assignedArray = Array.isArray(assigned) ? assigned : [assigned]

      // 개수 체크
      if (varReq.minCount && assignedArray.length < varReq.minCount) {
        errors.push(`${varReq.label}은(는) 최소 ${varReq.minCount}개 필요합니다`)
      }
      if (varReq.maxCount && assignedArray.length > varReq.maxCount) {
        errors.push(`${varReq.label}은(는) 최대 ${varReq.maxCount}개까지 가능합니다`)
      }

      // 타입 체크
      assignedArray.forEach(colName => {
        const column = dataAnalysis?.columns.find(c => c.name === colName)
        if (column && !varReq.types.includes(column.type)) {
          errors.push(
            `'${colName}'은(는) ${varReq.types.map(t => getVariableTypeLabel(t)).join(', ')} 타입이어야 합니다`
          )
        }
      })
    })

    return { valid: errors.length === 0, errors }
  }, [assignments, methodRequirements, dataAnalysis])

  // 검증 실행
  useEffect(() => {
    const validation = validateAssignments()
    setValidationErrors(validation.errors)
    onValidation?.(validation.valid, validation.errors)
  }, [assignments, validateAssignments, onValidation])

  // 드래그 시작
  const handleDragStart = (e: React.DragEvent, item: DragItem) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'copy'
  }

  // 드래그 종료
  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  // 드롭 허용
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  // 드롭 처리
  const handleDrop = (e: React.DragEvent, role: string, multiple: boolean) => {
    e.preventDefault()
    if (!draggedItem) return

    setAssignments(prev => {
      const newAssignments = { ...prev }

      if (multiple) {
        // 다중 선택
        const current = prev[role] || []
        const currentArray = Array.isArray(current) ? current : [current]

        // 중복 체크
        if (!currentArray.includes(draggedItem.columnName)) {
          newAssignments[role] = [...currentArray, draggedItem.columnName]
        }
      } else {
        // 단일 선택
        newAssignments[role] = draggedItem.columnName
      }

      return newAssignments
    })
  }

  // 변수 제거
  const handleRemoveVariable = (role: string, columnName?: string) => {
    setAssignments(prev => {
      const newAssignments = { ...prev }

      if (columnName && Array.isArray(prev[role])) {
        // 배열에서 특정 항목 제거
        newAssignments[role] = (prev[role] as string[]).filter(c => c !== columnName)
        if (newAssignments[role].length === 0) {
          delete newAssignments[role]
        }
      } else {
        // 전체 제거
        delete newAssignments[role]
      }

      return newAssignments
    })
  }

  // 자동 변수 추천
  const handleAutoAssign = () => {
    if (!methodRequirements || !dataAnalysis) return

    const newAssignments: VariableAssignment = {}

    methodRequirements.variables.forEach(varReq => {
      // 타입이 맞는 컬럼 찾기
      const matchingColumns = dataAnalysis.columns
        .filter(col => varReq.types.includes(col.type))
        .map(col => col.name)

      if (matchingColumns.length > 0) {
        if (varReq.multiple) {
          const count = varReq.minCount || 1
          newAssignments[varReq.role] = matchingColumns.slice(0, count)
        } else {
          newAssignments[varReq.role] = matchingColumns[0]
        }
      }
    })

    setAssignments(newAssignments)
  }

  // 완료 처리
  const handleComplete = () => {
    const validation = validateAssignments()
    if (validation.valid) {
      onVariablesSelected(assignments)
    }
  }

  if (!methodRequirements) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          메서드를 찾을 수 없습니다: {methodId}
        </AlertDescription>
      </Alert>
    )
  }

  if (!dataAnalysis || dataAnalysis.columns.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          분석할 데이터가 없습니다
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={cn("space-y-4", className)} role="region" aria-label="변수 선택 인터페이스">
      {/* 헤더 */}
      <div className="flex items-center justify-between" role="banner">
        <div>
          <h3 className="text-lg font-semibold">{methodRequirements.name} 변수 선택</h3>
          <p className="text-sm text-muted-foreground">
            {methodRequirements.description}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHelp(!showHelp)}
            aria-label="도움말 보기"
            aria-expanded={showHelp}
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            도움말
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoAssign}
            aria-label="변수 자동 추천"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            자동 추천
          </Button>
        </div>
      </div>

      {/* 도움말 */}
      {showHelp && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p className="font-medium">변수 선택 방법:</p>
            <ul className="text-sm space-y-1 ml-4">
              <li>• 왼쪽 패널에서 변수를 드래그하여 오른쪽 슬롯에 드롭</li>
              <li>• 변수 타입(색상/아이콘)을 확인하여 올바른 슬롯에 배치</li>
              <li>• 자동 추천 버튼으로 빠르게 시작</li>
              <li>• 필수 항목은 * 표시</li>
            </ul>
            {methodRequirements.notes && (
              <>
                <p className="font-medium mt-2">주의사항:</p>
                <ul className="text-sm space-y-1 ml-4">
                  {methodRequirements.notes.map((note, i) => (
                    <li key={i}>• {note}</li>
                  ))}
                </ul>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* 메인 콘텐츠 */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* 왼쪽: 사용 가능한 변수 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">사용 가능한 변수</CardTitle>
            <CardDescription>
              {dataAnalysis.columns.length}개 변수 (드래그하여 이동)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {dataAnalysis.columns.map(column => (
                  <div
                    key={column.name}
                    draggable
                    onDragStart={(e) => handleDragStart(e, { columnName: column.name, analysis: column })}
                    onDragEnd={handleDragEnd}
                    className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent cursor-move transition-colors"
                    role="listitem"
                    aria-label={`${column.name} 변수, ${getVariableTypeLabel(column.type)} 타입, 드래그하여 이동 가능`}
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getVariableTypeIcon(column.type)}</span>
                      <div>
                        <p className="font-medium text-sm">{column.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {column.uniqueCount}개 고유값
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn("text-xs", getVariableTypeColor(column.type))}
                    >
                      {getVariableTypeLabel(column.type)}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* 오른쪽: 변수 할당 슬롯 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">변수 할당</CardTitle>
            <CardDescription>
              필요한 변수를 여기에 드롭하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {methodRequirements.variables.map(varReq => {
                  const assigned = assignments[varReq.role]
                  const assignedArray = assigned
                    ? (Array.isArray(assigned) ? assigned : [assigned])
                    : []

                  return (
                    <div
                      key={varReq.role}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">
                          {varReq.label}
                          {varReq.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <div className="flex items-center gap-1">
                          {varReq.types.map(type => (
                            <Badge
                              key={type}
                              variant="outline"
                              className="text-xs"
                            >
                              {getVariableTypeLabel(type)}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, varReq.role, varReq.multiple)}
                        data-drop-zone
                        role="region"
                        aria-label={`${varReq.label} 변수 할당 영역`}
                        aria-dropeffect="move"
                        className={cn(
                          "min-h-[60px] p-2 rounded-lg border-2 border-dashed transition-colors",
                          draggedItem && "border-primary bg-primary/5",
                          assignedArray.length === 0 && "bg-muted/30"
                        )}
                      >
                        {assignedArray.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            {varReq.description}
                            {varReq.example && (
                              <span className="block mt-1 italic">
                                예: {varReq.example}
                              </span>
                            )}
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {assignedArray.map(colName => {
                              const column = dataAnalysis.columns.find(c => c.name === colName)
                              if (!column) return null

                              return (
                                <div
                                  key={colName}
                                  className="flex items-center justify-between p-2 rounded bg-background"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">
                                      {getVariableTypeIcon(column.type)}
                                    </span>
                                    <span className="text-sm font-medium">
                                      {colName}
                                    </span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => handleRemoveVariable(
                                      varReq.role,
                                      varReq.multiple ? colName : undefined
                                    )}
                                    aria-label={`${colName} 변수 제거`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {varReq.minCount && assignedArray.length < varReq.minCount && (
                        <p className="text-xs text-amber-600">
                          최소 {varReq.minCount}개 필요 (현재: {assignedArray.length}개)
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* 검증 메시지 */}
      {validationErrors.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">다음 항목을 확인하세요:</p>
            <ul className="text-sm space-y-1">
              {validationErrors.map((error, i) => (
                <li key={i}>• {error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* 가정 사항 */}
      {methodRequirements.assumptions.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-1">통계적 가정:</p>
            <p className="text-sm">
              {methodRequirements.assumptions.join(', ')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              이 가정들이 충족되는지 확인하세요
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* 액션 버튼 */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => setAssignments({})}
          aria-label="변수 선택 초기화"
        >
          초기화
        </Button>
        <Button
          onClick={handleComplete}
          disabled={validationErrors.length > 0}
          aria-label={validationErrors.length > 0 ? "검증 필요" : "분석 시작"}
          aria-disabled={validationErrors.length > 0}
        >
          {validationErrors.length === 0 ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              완료
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 mr-2" />
              검증 필요
            </>
          )}
        </Button>
      </div>
    </div>
  )
}