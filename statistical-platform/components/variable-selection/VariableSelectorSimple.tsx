'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Sparkles,
  HelpCircle,
  TrendingUp,
  Users,
  Calendar,
  Hash,
  Type,
  Binary
} from 'lucide-react'
import { cn } from '@/lib/utils'

import {
  VariableType,
  StatisticalMethodRequirements,
  getMethodRequirements
} from '@/lib/statistics/variable-requirements'
import {
  analyzeDataset,
  getVariableTypeLabel,
  ColumnAnalysis
} from '@/lib/services/variable-type-detector'

interface VariableSelectorSimpleProps {
  methodId: string
  data: Record<string, unknown>[]
  onVariablesSelected: (variables: VariableAssignment) => void
  onBack?: () => void
  className?: string
}

export interface VariableAssignment {
  [role: string]: string | string[]
}

/**
 * 사용자 친화적인 변수 선택 UI
 * 드롭다운과 체크박스를 활용한 간단한 인터페이스
 */
export function VariableSelectorSimple({
  methodId,
  data,
  onVariablesSelected,
  onBack,
  className
}: VariableSelectorSimpleProps) {
  const [assignments, setAssignments] = useState<VariableAssignment>({})
  const [isValid, setIsValid] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // 메서드 요구사항
  const methodRequirements = useMemo(() => {
    return getMethodRequirements(methodId)
  }, [methodId])

  // 데이터 분석
  const dataAnalysis = useMemo(() => {
    if (!data || data.length === 0) return null
    return analyzeDataset(data, { detectIdColumns: true })
  }, [data])

  // 변수 타입별 아이콘
  const getVariableIcon = (type: VariableType) => {
    const icons = {
      continuous: <TrendingUp className="w-4 h-4" />,
      categorical: <Type className="w-4 h-4" />,
      binary: <Binary className="w-4 h-4" />,
      ordinal: <Hash className="w-4 h-4" />,
      date: <Calendar className="w-4 h-4" />,
      count: <Users className="w-4 h-4" />
    }
    return icons[type] || <Info className="w-4 h-4" />
  }

  // 타입별 색상
  const getTypeColor = (type: VariableType) => {
    const colors = {
      continuous: 'text-blue-600',
      categorical: 'text-green-600',
      binary: 'text-purple-600',
      ordinal: 'text-orange-600',
      date: 'text-pink-600',
      count: 'text-indigo-600'
    }
    return colors[type] || 'text-gray-600'
  }

  // 변수 필터링
  const getFilteredColumns = (types: VariableType[]) => {
    if (!dataAnalysis) return []
    return dataAnalysis.columns.filter(col => types.includes(col.type))
  }

  // 할당 업데이트
  const updateAssignment = (role: string, value: string | string[]) => {
    setAssignments(prev => ({
      ...prev,
      [role]: value
    }))
  }

  // 자동 추천
  const handleAutoAssign = () => {
    if (!methodRequirements || !dataAnalysis) return

    const newAssignments: VariableAssignment = {}

    methodRequirements.variables.forEach(varReq => {
      const matchingColumns = getFilteredColumns(varReq.types)

      if (matchingColumns.length > 0) {
        if (varReq.multiple) {
          // 복수 선택: minCount 만큼 선택
          const count = varReq.minCount || 1
          newAssignments[varReq.role] = matchingColumns
            .slice(0, Math.min(count, matchingColumns.length))
            .map(c => c.name)
        } else {
          // 단일 선택: 첫 번째 선택
          newAssignments[varReq.role] = matchingColumns[0].name
        }
      }
    })

    setAssignments(newAssignments)
  }

  // 검증
  useEffect(() => {
    if (!methodRequirements) {
      setIsValid(false)
      return
    }

    const allRequiredFilled = methodRequirements.variables
      .filter(v => v.required)
      .every(v => {
        const assigned = assignments[v.role]
        if (!assigned) return false
        if (Array.isArray(assigned)) {
          return assigned.length >= (v.minCount || 1)
        }
        return true
      })

    setIsValid(allRequiredFilled)
  }, [assignments, methodRequirements])

  // 완료 처리
  const handleComplete = () => {
    if (isValid) {
      onVariablesSelected(assignments)
    }
  }

  // 미리보기 생성
  const generatePreview = () => {
    if (!methodRequirements) return ''

    const parts: string[] = []
    methodRequirements.variables.forEach(varReq => {
      const assigned = assignments[varReq.role]
      if (assigned) {
        const value = Array.isArray(assigned) ? assigned.join(', ') : assigned
        parts.push(`${varReq.label}: ${value}`)
      }
    })
    return parts.join(' | ')
  }

  if (!methodRequirements || !dataAnalysis) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          데이터를 불러올 수 없습니다
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className={className} role="region" aria-label="변수 선택 폼">
      <CardHeader>
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{methodRequirements.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {methodRequirements.description}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoAssign}
              aria-label="변수 자동 선택"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              자동 선택
            </Button>
          </div>

          {/* 요구사항 요약 */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary">
              최소 {methodRequirements.minSampleSize}개 샘플 필요
            </Badge>
            {methodRequirements.assumptions.map((assumption, i) => (
              <Badge key={i} variant="outline">
                {assumption}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 변수 선택 폼 */}
        {methodRequirements.variables.map(varReq => {
          const matchingColumns = getFilteredColumns(varReq.types)
          const assigned = assignments[varReq.role]

          return (
            <div key={varReq.role} className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">
                  {varReq.label}
                  {varReq.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <HoverCard>
                  <HoverCardTrigger>
                    <HelpCircle className="w-4 h-4 text-muted-foreground" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-2">
                      <p className="text-sm">{varReq.description}</p>
                      {varReq.example && (
                        <p className="text-xs text-muted-foreground">
                          예시: {varReq.example}
                        </p>
                      )}
                      <div className="flex gap-1">
                        {varReq.types.map(type => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {getVariableTypeLabel(type)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>

              {/* 변수 선택 UI */}
              {varReq.multiple ? (
                // 복수 선택: 체크박스
                <div className="space-y-2">
                  {matchingColumns.length === 0 ? (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        적합한 변수가 없습니다 ({varReq.types.map(t => getVariableTypeLabel(t)).join(', ')} 타입 필요)
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {matchingColumns.map(column => {
                        const isChecked = Array.isArray(assigned)
                          ? assigned.includes(column.name)
                          : false

                        return (
                          <div key={column.name} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${varReq.role}-${column.name}`}
                              checked={isChecked}
                              aria-label={`${column.name} 변수 선택`}
                              aria-describedby={`${varReq.role}-desc`}
                              onCheckedChange={(checked) => {
                                const current = (assignments[varReq.role] || []) as string[]
                                if (checked) {
                                  updateAssignment(varReq.role, [...current, column.name])
                                } else {
                                  updateAssignment(
                                    varReq.role,
                                    current.filter(c => c !== column.name)
                                  )
                                }
                              }}
                            />
                            <Label
                              htmlFor={`${varReq.role}-${column.name}`}
                              className="flex items-center gap-1 cursor-pointer"
                            >
                              <span className={getTypeColor(column.type)}>
                                {getVariableIcon(column.type)}
                              </span>
                              <span className="text-sm">{column.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({column.uniqueCount})
                              </span>
                            </Label>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {varReq.minCount && (
                    <p className="text-xs text-muted-foreground">
                      최소 {varReq.minCount}개 선택 필요
                      {Array.isArray(assigned) && ` (현재: ${assigned.length}개)`}
                    </p>
                  )}
                </div>
              ) : (
                // 단일 선택: 드롭다운 또는 라디오
                matchingColumns.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      적합한 변수가 없습니다 ({varReq.types.map(t => getVariableTypeLabel(t)).join(', ')} 타입 필요)
                    </AlertDescription>
                  </Alert>
                ) : matchingColumns.length <= 5 ? (
                  // 5개 이하: 라디오 버튼
                  <RadioGroup
                    value={assigned as string || ''}
                    onValueChange={(value) => updateAssignment(varReq.role, value)}
                    aria-label={varReq.label}
                    aria-required={varReq.required}
                  >
                    {matchingColumns.map(column => (
                      <div key={column.name} className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={column.name}
                          id={`${varReq.role}-${column.name}`}
                        />
                        <Label
                          htmlFor={`${varReq.role}-${column.name}`}
                          className="flex items-center gap-1 cursor-pointer"
                        >
                          <span className={getTypeColor(column.type)}>
                            {getVariableIcon(column.type)}
                          </span>
                          <span className="text-sm">{column.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({column.uniqueCount}개 고유값)
                          </span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  // 6개 이상: 드롭다운
                  <Select
                    value={assigned as string || ''}
                    onValueChange={(value) => updateAssignment(varReq.role, value)}
                    aria-label={varReq.label}
                    aria-required={varReq.required}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="변수를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {matchingColumns.map(column => (
                        <SelectItem key={column.name} value={column.name}>
                          <div className="flex items-center gap-2">
                            <span className={getTypeColor(column.type)}>
                              {getVariableIcon(column.type)}
                            </span>
                            <span>{column.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({column.uniqueCount})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              )}
            </div>
          )
        })}

        {/* 선택 미리보기 */}
        {showPreview && Object.keys(assignments).length > 0 && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-1">선택한 변수:</p>
              <p className="text-sm">{generatePreview()}</p>
            </AlertDescription>
          </Alert>
        )}

        {/* 주의사항 */}
        {methodRequirements.notes && methodRequirements.notes.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-1">참고사항:</p>
              <ul className="text-sm space-y-1">
                {methodRequirements.notes.map((note, i) => (
                  <li key={i}>• {note}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* 액션 버튼 */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={onBack}
            aria-label="이전 단계로 돌아가기"
          >
            이전
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              aria-label="선택한 변수 미리보기"
              aria-expanded={showPreview}
            >
              미리보기
            </Button>
            <Button
              onClick={handleComplete}
              disabled={!isValid}
              aria-label={isValid ? "분석 시작" : "변수 선택 필요"}
              aria-disabled={!isValid}
            >
              {isValid ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  분석 시작
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  변수 선택 필요
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}