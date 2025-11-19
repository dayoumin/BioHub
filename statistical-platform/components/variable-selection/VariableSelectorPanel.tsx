'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Search,
  X,
  Hash,
  Type,
  Calendar,
  CheckCircle,
  Plus,
  ArrowRight,
  Info,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getMethodRequirements,
  VariableRequirement,
  VariableType,
} from '@/lib/statistics/variable-requirements'
import {
  isTypeCompatibleWithValues,
  getCompatibleUITypes,
} from '@/lib/utils/variable-type-mapper'

// 변수 역할 정의 (레거시 호환용 - 향후 제거 예정)
export interface VariableRole {
  id: string
  label: string
  description: string
  required: boolean
  multiple: boolean
  acceptTypes: ('number' | 'string' | 'date' | 'boolean')[]
  /** variable-requirements.ts의 원본 타입 (binary 검증용) */
  allowedVariableTypes?: VariableType[]
}

// 변수 할당 결과
export interface VariableAssignment {
  [roleId: string]: string | string[] | undefined
}

interface VariableSelectorPanelProps {
  /** 통계 메서드 ID (variable-requirements.ts 기준) - roles 미제공 시 필수 */
  methodId?: string
  /** 데이터 배열 */
  data: Record<string, unknown>[]
  /** 열 이름 배열 */
  columns: string[]
  /** 현재 할당 상태 */
  assignment?: VariableAssignment
  /** 할당 변경 콜백 */
  onAssignmentChange: (assignment: VariableAssignment) => void
  /** 완료 콜백 */
  onComplete?: () => void
  /** 열 타입 정보 (제공되지 않으면 자동 감지) */
  columnTypes?: Record<string, 'number' | 'string' | 'date' | 'boolean'>
  /** @deprecated 레거시 호환용 - methodId 사용 권장 */
  roles?: VariableRole[]
}

/**
 * VariableSelectorPanel - 클릭 기반 변수 선택 컴포넌트
 *
 * 특징:
 * - 좌측: 사용 가능한 변수 목록
 * - 우측: 역할별 드롭존
 * - 클릭하여 역할 선택 (팝오버)
 * - 타입 검증 및 시각적 피드백
 */
export function VariableSelectorPanel({
  methodId,
  data,
  columns,
  assignment = {},
  onAssignmentChange,
  onComplete,
  columnTypes: providedColumnTypes,
  roles: legacyRoles,
}: VariableSelectorPanelProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVariable, setSelectedVariable] = useState<string | null>(null)

  // methodId에서 역할 정의 가져오기
  const roles = useMemo(() => {
    // 레거시 roles prop이 제공되면 사용 (하위 호환)
    if (legacyRoles && legacyRoles.length > 0) {
      return legacyRoles
    }

    // methodId가 없으면 빈 배열
    if (!methodId) {
      console.warn('VariableSelectorPanel: methodId or roles prop is required')
      return []
    }

    // methodId로 variable-requirements.ts에서 가져오기
    const methodReqs = getMethodRequirements(methodId)
    if (!methodReqs) {
      console.warn(`Method "${methodId}" not found in variable-requirements.ts`)
      return []
    }

    // VariableRequirement → VariableRole 변환
    return methodReqs.variables.map((req: VariableRequirement): VariableRole => ({
      id: req.role,
      label: req.label,
      description: req.description,
      required: req.required,
      multiple: req.multiple,
      acceptTypes: getCompatibleUITypes(req.types),
      allowedVariableTypes: req.types, // binary 검증용 원본 타입 보존
    }))
  }, [methodId, legacyRoles])

  // 열 타입 자동 감지
  const columnTypes = useMemo(() => {
    if (providedColumnTypes) return providedColumnTypes

    const types: Record<string, 'number' | 'string' | 'date' | 'boolean'> = {}

    columns.forEach(col => {
      const samples = data.slice(0, 20).map(row => row[col])
      const validSamples = samples.filter(v => v !== null && v !== undefined)

      if (validSamples.length === 0) {
        types[col] = 'string'
        return
      }

      const numericCount = validSamples.filter(v => typeof v === 'number' || (typeof v === 'string' && !isNaN(Number(v)))).length
      const booleanCount = validSamples.filter(v => typeof v === 'boolean').length

      if (booleanCount > validSamples.length / 2) {
        types[col] = 'boolean'
      } else if (numericCount > validSamples.length / 2) {
        types[col] = 'number'
      } else {
        types[col] = 'string'
      }
    })

    return types
  }, [columns, data, providedColumnTypes])

  // 이미 할당된 변수들
  const assignedVariables = useMemo(() => {
    const assigned = new Set<string>()
    Object.values(assignment).forEach(value => {
      if (Array.isArray(value)) {
        value.forEach(v => assigned.add(v))
      } else if (value) {
        assigned.add(value)
      }
    })
    return assigned
  }, [assignment])

  // 검색 필터링
  const filteredColumns = useMemo(() => {
    if (!searchTerm) return columns
    const term = searchTerm.toLowerCase()
    return columns.filter(col => col.toLowerCase().includes(term))
  }, [columns, searchTerm])

  // 변수를 역할에 할당
  const assignVariable = useCallback((variable: string, roleId: string) => {
    const role = roles.find(r => r.id === roleId)
    if (!role) return

    const newAssignment = { ...assignment }

    // 다른 역할에서 제거 (multiple이 아닌 경우)
    Object.keys(newAssignment).forEach(key => {
      const value = newAssignment[key]
      if (Array.isArray(value)) {
        newAssignment[key] = value.filter(v => v !== variable)
        if ((newAssignment[key] as string[]).length === 0) {
          delete newAssignment[key]
        }
      } else if (value === variable) {
        delete newAssignment[key]
      }
    })

    // 새 역할에 할당
    if (role.multiple) {
      const current = newAssignment[roleId]
      if (Array.isArray(current)) {
        newAssignment[roleId] = [...current, variable]
      } else {
        newAssignment[roleId] = [variable]
      }
    } else {
      newAssignment[roleId] = variable
    }

    onAssignmentChange(newAssignment)
    setSelectedVariable(null)
  }, [assignment, roles, onAssignmentChange])

  // 변수를 역할에서 제거
  const removeVariable = useCallback((variable: string, roleId: string) => {
    const newAssignment = { ...assignment }
    const value = newAssignment[roleId]

    if (Array.isArray(value)) {
      newAssignment[roleId] = value.filter(v => v !== variable)
      if ((newAssignment[roleId] as string[]).length === 0) {
        delete newAssignment[roleId]
      }
    } else if (value === variable) {
      delete newAssignment[roleId]
    }

    onAssignmentChange(newAssignment)
  }, [assignment, onAssignmentChange])

  // 검증: 필수 역할이 모두 할당되었는지
  const isValid = useMemo(() => {
    return roles.every(role => {
      if (!role.required) return true
      const value = assignment[role.id]
      if (Array.isArray(value)) return value.length > 0
      return !!value
    })
  }, [roles, assignment])

  // 타입 아이콘
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'number':
        return <Hash className="w-3 h-3" />
      case 'date':
        return <Calendar className="w-3 h-3" />
      default:
        return <Type className="w-3 h-3" />
    }
  }

  // 컬럼별 샘플 값 캐시 (성능 최적화)
  const columnSamples = useMemo(() => {
    const samples: Record<string, unknown[]> = {}
    const sampleSize = Math.min(100, data.length) // 최대 100개 샘플

    columns.forEach(col => {
      samples[col] = data.slice(0, sampleSize).map(row => row[col])
    })

    return samples
  }, [columns, data])

  // 타입 호환성 체크 (variable-type-mapper 유틸리티 사용)
  const checkTypeCompatibility = useCallback((variable: string, role: VariableRole) => {
    const type = columnTypes[variable]

    // allowedVariableTypes가 있으면 실제 값 검증 포함
    if (role.allowedVariableTypes) {
      // 캐시된 샘플 사용 (성능 최적화)
      const columnValues = columnSamples[variable] || []
      return isTypeCompatibleWithValues(type, role.allowedVariableTypes, columnValues)
    }

    // 레거시 방식: acceptTypes만 사용
    return role.acceptTypes.includes(type)
  }, [columnTypes, columnSamples])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 좌측: 사용 가능한 변수 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            사용 가능한 변수
            <Badge variant="secondary" className="ml-auto">
              {columns.length}개
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="변수 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchTerm('')}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* 변수 목록 */}
          <ScrollArea className="h-[300px]">
            <div className="space-y-1">
              {filteredColumns.map(col => {
                const isAssigned = assignedVariables.has(col)
                const type = columnTypes[col]

                return (
                  <Popover key={col}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={isAssigned ? 'secondary' : 'ghost'}
                        className={cn(
                          'w-full justify-start h-9 px-3',
                          isAssigned && 'bg-primary/10'
                        )}
                        onClick={() => setSelectedVariable(col)}
                      >
                        <Badge variant="outline" className="h-5 px-1 mr-2">
                          {getTypeIcon(type)}
                        </Badge>
                        <span className="truncate flex-1 text-left">{col}</span>
                        {isAssigned ? (
                          <CheckCircle className="w-4 h-4 text-primary ml-2" />
                        ) : (
                          <Plus className="w-4 h-4 text-muted-foreground ml-2" />
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="end">
                      <div className="space-y-1">
                        <p className="text-sm font-medium px-2 py-1">역할 선택</p>
                        {roles.map(role => {
                          const compatible = checkTypeCompatibility(col, role)
                          return (
                            <Button
                              key={role.id}
                              variant="ghost"
                              size="sm"
                              className={cn(
                                'w-full justify-start',
                                !compatible && 'opacity-50'
                              )}
                              onClick={() => {
                                if (compatible) {
                                  assignVariable(col, role.id)
                                }
                              }}
                              disabled={!compatible}
                            >
                              <ArrowRight className="w-3 h-3 mr-2" />
                              {role.label}
                              {role.required && (
                                <span className="text-destructive ml-1">*</span>
                              )}
                              {!compatible && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="w-3 h-3 ml-auto text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    타입 불일치: {type} → {role.acceptTypes.join('/')}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </Button>
                          )
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                )
              })}
              {filteredColumns.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  {searchTerm ? '검색 결과가 없습니다' : '변수가 없습니다'}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 우측: 역할별 할당 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">변수 역할 할당</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScrollArea className="h-[300px]">
            <div className="space-y-4 pr-4">
              {roles.map(role => {
                const value = assignment[role.id]
                const values = Array.isArray(value) ? value : value ? [value] : []
                const hasValue = values.length > 0

                return (
                  <div key={role.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {role.label}
                        {role.required && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </span>
                      {role.multiple && (
                        <Badge variant="outline" className="text-xs">
                          다중 선택
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {role.description}
                    </p>

                    {/* 할당된 변수들 */}
                    <div
                      className={cn(
                        'min-h-[48px] rounded-lg border-2 border-dashed p-2 transition-colors',
                        hasValue
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-muted-foreground/20'
                      )}
                    >
                      <AnimatePresence mode="popLayout">
                        {values.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {values.map(v => (
                              <motion.div
                                key={v}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                              >
                                <Badge
                                  variant="default"
                                  className="h-7 pl-2 pr-1 gap-1"
                                >
                                  <span className="truncate max-w-[100px]">
                                    {v}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 hover:bg-destructive/20"
                                    onClick={() => removeVariable(v, role.id)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </Badge>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            변수를 클릭하여 할당하세요
                          </span>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>

          {/* 완료 버튼 */}
          {onComplete && (
            <div className="pt-2 border-t">
              <Button
                onClick={onComplete}
                disabled={!isValid}
                className="w-full"
              >
                {isValid ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    변수 선택 완료
                  </>
                ) : (
                  '필수 변수를 모두 선택해주세요'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * @deprecated COMMON_ROLES는 더 이상 사용되지 않습니다.
 * variable-requirements.ts의 getMethodRequirements를 사용하세요.
 *
 * @example
 * // 이전 방식 (deprecated)
 * <VariableSelectorPanel roles={COMMON_ROLES.descriptive} ... />
 *
 * // 새로운 방식 (권장)
 * <VariableSelectorPanel methodId="descriptive-stats" ... />
 */
export const COMMON_ROLES: Record<string, VariableRole[]> = {
  // 회귀분석
  regression: [
    {
      id: 'dependent',
      label: '종속변수 (Y)',
      description: '예측하려는 결과 변수',
      required: true,
      multiple: false,
      acceptTypes: ['number'],
    },
    {
      id: 'independent',
      label: '독립변수 (X)',
      description: '예측에 사용할 변수',
      required: true,
      multiple: true,
      acceptTypes: ['number'],
    },
  ],

  // 분산분석
  anova: [
    {
      id: 'dependent',
      label: '종속변수',
      description: '측정값 (수치형)',
      required: true,
      multiple: false,
      acceptTypes: ['number'],
    },
    {
      id: 'factor',
      label: '요인 (그룹)',
      description: '그룹을 나누는 범주형 변수',
      required: true,
      multiple: true,
      acceptTypes: ['string', 'number'],
    },
  ],

  // 상관분석
  correlation: [
    {
      id: 'variables',
      label: '분석 변수',
      description: '상관관계를 분석할 수치형 변수',
      required: true,
      multiple: true,
      acceptTypes: ['number'],
    },
  ],

  // 기술통계
  descriptive: [
    {
      id: 'variables',
      label: '분석 변수',
      description: '기술통계를 계산할 수치형 변수',
      required: true,
      multiple: true,
      acceptTypes: ['number'],
    },
  ],
}
