'use client'

/**
 * VariableSelectorModern - 현대적인 변수 선택 UI
 *
 * 목표:
 * - 드래그앤드롭 + 모달 병행 선택 (Jamovi/JASP 방식)
 * - 공간 효율 300% 개선 (1단 레이아웃)
 * - 선택 시간 50% 단축 (20초 → 10초)
 *
 * 디자인 참고: SPSS, Jamovi, JASP
 * CLAUDE.md 규칙: any 금지, unknown + 타입 가드 사용
 */

import React, { useState, useMemo, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { VariableAssignment } from '@/types/statistics-converters'
import {
  VariableRole,
  getMethodRequirements,
  StatisticalMethodRequirements,
  VariableRequirement
} from '@/lib/statistics/variable-requirements'
import {
  analyzeDataset,
  DatasetAnalysis,
  ColumnAnalysis
} from '@/lib/services/variable-type-detector'
import { isRecord } from '@/lib/utils/type-guards'

// shadcn/ui 컴포넌트
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Eye,
  Search,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DraggableVariable, DraggableVariableOverlay } from './draggable/DraggableVariable'
import { DroppableRoleZone } from './draggable/DroppableRoleZone'

// Props 인터페이스
export interface VariableSelectorModernProps {
  methodId: string
  data: Record<string, unknown>[]
  onVariablesSelected: (variables: VariableAssignment) => void
  onBack?: () => void
  className?: string
}

// 검증 결과 타입
interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  requiredMissing: string[]
}

/**
 * 메인 컴포넌트
 */
export function VariableSelectorModern({
  methodId,
  data,
  onVariablesSelected,
  onBack,
  className
}: VariableSelectorModernProps) {
  // ========================================
  // 1. 상태 관리
  // ========================================

  // Toast hook
  const { toast } = useToast()

  // 변수 할당 상태
  const [assignments, setAssignments] = useState<VariableAssignment>({})

  // 모달 상태 (어떤 역할에 대해 모달이 열려 있는지)
  const [activeRole, setActiveRole] = useState<VariableRole | null>(null)

  // 미리보기 모드
  const [showPreview, setShowPreview] = useState(false)

  // 모달 내부 상태
  const [searchQuery, setSearchQuery] = useState('')
  const [tempSelection, setTempSelection] = useState<string[]>([])

  // 드래그앤드롭 상태
  const [activeId, setActiveId] = useState<string | null>(null)

  // 드래그앤드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이동 후 드래그 시작 (클릭과 구분)
      },
    })
  )

  // ========================================
  // 2. 메타데이터 로드 (기존 시스템 재사용)
  // ========================================

  // 통계 메서드 요구사항
  const requirements = useMemo<StatisticalMethodRequirements | null>(() => {
    const reqs = getMethodRequirements(methodId)
    return reqs || null
  }, [methodId])

  // 데이터 분석 (변수 타입 자동 감지)
  const analysis = useMemo<DatasetAnalysis | null>(() => {
    if (!data || data.length === 0) return null

    // 데이터가 올바른 형식인지 확인
    if (!Array.isArray(data)) return null
    if (data.length === 0) return null
    if (!isRecord(data[0])) return null

    return analyzeDataset(data, { detectIdColumns: true })
  }, [data])

  // ========================================
  // 3. 검증 로직
  // ========================================

  const validation = useMemo<ValidationResult>(() => {
    if (!requirements) {
      return {
        isValid: false,
        errors: ['통계 메서드 정보를 불러올 수 없습니다'],
        warnings: [],
        requiredMissing: []
      }
    }

    if (!analysis) {
      return {
        isValid: false,
        errors: ['데이터를 분석할 수 없습니다'],
        warnings: [],
        requiredMissing: []
      }
    }

    const errors: string[] = []
    const warnings: string[] = []
    const requiredMissing: string[] = []

    // 필수 변수 체크
    requirements.variables.forEach(varReq => {
      if (!varReq.required) return

      const assigned = assignments[varReq.role]

      if (!assigned) {
        errors.push(`${varReq.label}을(를) 선택해야 합니다`)
        requiredMissing.push(varReq.label)
        return
      }

      // 배열인 경우 길이 체크
      if (Array.isArray(assigned)) {
        if (assigned.length === 0) {
          errors.push(`${varReq.label}을(를) 최소 1개 선택해야 합니다`)
          requiredMissing.push(varReq.label)
        }

        if (varReq.minCount && assigned.length < varReq.minCount) {
          errors.push(`${varReq.label}을(를) 최소 ${varReq.minCount}개 선택해야 합니다`)
        }

        if (varReq.maxCount && assigned.length > varReq.maxCount) {
          errors.push(`${varReq.label}은(는) 최대 ${varReq.maxCount}개까지 선택 가능합니다`)
        }
      }
    })

    // 샘플 크기 체크
    if (analysis.summary.totalRows < requirements.minSampleSize) {
      warnings.push(
        `샘플 크기가 부족합니다 (현재: ${analysis.summary.totalRows}개, 권장: ${requirements.minSampleSize}개 이상)`
      )
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requiredMissing
    }
  }, [requirements, analysis, assignments])

  // ========================================
  // 4. 이벤트 핸들러
  // ========================================

  // 변수 선택 핸들러
  const handleVariableSelect = useCallback((role: string, variables: string | string[]) => {
    setAssignments(prev => ({
      ...prev,
      [role]: variables
    }))
  }, [])

  // 초기화
  const handleReset = useCallback(() => {
    setAssignments({})
  }, [])

  // 미리보기
  const handlePreview = useCallback(() => {
    setShowPreview(prev => !prev)
  }, [])

  // 제출
  const handleSubmit = useCallback(() => {
    if (!validation.isValid) return
    onVariablesSelected(assignments)
  }, [validation.isValid, assignments, onVariablesSelected])

  // 모달 열기
  const handleOpenModal = useCallback((role: VariableRole) => {
    setActiveRole(role)
    setSearchQuery('')

    // 현재 할당된 변수로 초기화
    const current = assignments[role]
    if (current) {
      setTempSelection(Array.isArray(current) ? current : [current])
    } else {
      setTempSelection([])
    }
  }, [assignments])

  // 모달 닫기
  const handleCloseModal = useCallback(() => {
    setActiveRole(null)
    setSearchQuery('')
    setTempSelection([])
  }, [])

  // 모달에서 변수 토글 (다중 선택)
  const handleToggleVariable = useCallback((varName: string) => {
    setTempSelection(prev => {
      if (prev.includes(varName)) {
        return prev.filter(v => v !== varName)
      } else {
        return [...prev, varName]
      }
    })
  }, [])

  // 모달에서 변수 선택 (단일 선택)
  const handleSelectSingleVariable = useCallback((varName: string) => {
    setTempSelection([varName])
  }, [])

  // 모달에서 변수 선택 확정
  const handleConfirmSelection = useCallback(() => {
    if (!activeRole) return

    const varReq = requirements?.variables.find(v => v.role === activeRole)
    if (!varReq) return

    if (tempSelection.length === 0) {
      // 선택 해제
      setAssignments(prev => {
        const { [activeRole]: _, ...rest } = prev
        return rest
      })
    } else if (varReq.multiple) {
      // 다중 선택
      handleVariableSelect(activeRole, tempSelection)
    } else {
      // 단일 선택
      handleVariableSelect(activeRole, tempSelection[0])
    }

    handleCloseModal()
  }, [activeRole, tempSelection, requirements, handleVariableSelect, handleCloseModal])

  // 드래그 시작
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  // 드래그 종료 (드롭 처리)
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return
    if (!analysis) return
    if (!requirements) return

    const variableName = active.id as string
    const targetRole = over.id as string

    // 해당 역할의 요구사항 찾기
    const varReq = requirements.variables.find(v => v.role === targetRole)
    if (!varReq) return

    // 변수 타입 확인
    const column = analysis.columns.find(c => c.name === variableName)
    if (!column) return

    // 타입 검증
    if (varReq.types && varReq.types.length > 0) {
      if (!varReq.types.includes(column.type)) {
        // 타입 불일치 - Toast 알림
        toast({
          title: "타입 불일치",
          description: `"${variableName}"은(는) ${varReq.label}에 할당할 수 없습니다. (${column.type} 타입)`,
          variant: "destructive"
        })
        return
      }
    }

    // 변수 할당
    if (varReq.multiple) {
      // 다중 선택: 기존 배열에 추가
      const current = assignments[targetRole]
      const currentArray = Array.isArray(current) ? current : current ? [current] : []

      // 이미 할당된 변수면 무시
      if (currentArray.includes(variableName)) {
        toast({
          title: "중복 할당",
          description: `"${variableName}"은(는) 이미 ${varReq.label}에 할당되어 있습니다.`,
          variant: "default"
        })
        return
      }

      handleVariableSelect(targetRole, [...currentArray, variableName])
      toast({
        title: "변수 할당 완료",
        description: `"${variableName}"을(를) ${varReq.label}에 추가했습니다.`,
        variant: "default"
      })
    } else {
      // 단일 선택: 덮어쓰기
      handleVariableSelect(targetRole, variableName)
      toast({
        title: "변수 할당 완료",
        description: `"${variableName}"을(를) ${varReq.label}로 설정했습니다.`,
        variant: "default"
      })
    }
  }, [analysis, requirements, assignments, handleVariableSelect, toast])

  // 변수 제거 핸들러
  const handleRemoveVariable = useCallback((role: string, varName: string) => {
    setAssignments(prev => {
      const current = prev[role]
      if (!current) return prev

      if (Array.isArray(current)) {
        const filtered = current.filter(v => v !== varName)
        if (filtered.length === 0) {
          const { [role]: _, ...rest } = prev
          return rest
        }
        return { ...prev, [role]: filtered }
      }

      const { [role]: _, ...rest } = prev
      return rest
    })
  }, [])

  // ========================================
  // 5. 렌더링
  // ========================================

  if (!requirements) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>오류</AlertTitle>
        <AlertDescription>
          통계 메서드 정보를 불러올 수 없습니다: {methodId}
        </AlertDescription>
      </Alert>
    )
  }

  if (!analysis) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>오류</AlertTitle>
        <AlertDescription>
          데이터를 분석할 수 없습니다. 올바른 CSV 파일을 업로드했는지 확인하세요.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={cn('space-y-6', className)}>
        {/* ========================================
            헤더: 제목 + 초기화
            ======================================== */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{requirements.name} 변수 설정</CardTitle>
                <CardDescription className="mt-1">
                  {requirements.description}
                </CardDescription>
              </div>
              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                초기화
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* ========================================
            2-컬럼 레이아웃: 변수 목록 + 역할별 드롭존
            ======================================== */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* 왼쪽: 드래그 가능한 변수 목록 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">변수 목록</CardTitle>
              <CardDescription>
                변수를 드래그하여 역할에 할당하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {analysis.columns.map(column => (
                  <DraggableVariable
                    key={column.name}
                    column={column}
                    showStats={true}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 오른쪽: 역할별 드롭존 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">변수 역할 할당</CardTitle>
              <CardDescription className="mt-1">
                각 역할 카드를 클릭하여 변수를 선택하세요 (드래그도 가능)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {requirements.variables.map(varReq => {
                const assigned = assignments[varReq.role]
                const assignedArray = assigned
                  ? (Array.isArray(assigned) ? assigned : [assigned])
                  : []

                return (
                  <DroppableRoleZone
                    key={varReq.role}
                    role={varReq.role}
                    label={varReq.label}
                    description={`${varReq.description}${varReq.example ? ` (예: ${varReq.example})` : ''}`}
                    required={varReq.required}
                    assignedVariables={assignedArray}
                    onRemoveVariable={(varName) => handleRemoveVariable(varReq.role, varName)}
                    onClick={() => handleOpenModal(varReq.role as VariableRole)}
                  />
                )
              })}
            </CardContent>
          </Card>
        </div>

      {/* ========================================
          검증 피드백 (Phase 1.5에서 구현)
          ======================================== */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          {/* 필수 변수 체크 */}
          <div className="flex items-start gap-2">
            {validation.isValid ? (
              <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">
                {validation.isValid
                  ? '✓ 모든 필수 변수가 설정되었습니다'
                  : `${validation.requiredMissing.length}개 필수 변수 누락`
                }
              </p>
            </div>
          </div>

          {/* 샘플 크기 */}
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
            <p className="text-sm">
              샘플 크기: {analysis.summary.totalRows}개
              {requirements.minSampleSize && (
                <span className="text-muted-foreground">
                  {' '}(권장: {requirements.minSampleSize}개 이상)
                </span>
              )}
            </p>
          </div>

          {/* 에러 메시지 */}
          {validation.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>필수 항목 확인</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {validation.errors.map((error, idx) => (
                    <li key={idx} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* 경고 메시지 */}
          {validation.warnings.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>주의사항</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {validation.warnings.map((warning, idx) => (
                    <li key={idx} className="text-sm">{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* ========================================
          하단 버튼
          ======================================== */}
      <div className="flex items-center justify-between pt-2">
        <Button
          onClick={onBack}
          variant="outline"
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          이전
        </Button>

        <div className="flex gap-2">
          <Button
            onClick={handlePreview}
            variant="outline"
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            미리보기
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!validation.isValid}
            className="gap-2"
            data-testid="run-analysis-btn"
          >
            분석 시작
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ========================================
          미리보기 (간단 구현)
          ======================================== */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">변수 할당 미리보기</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-md overflow-auto">
              {JSON.stringify(assignments, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* ========================================
          변수 선택 모달 (Phase 1.3 완성)
          ======================================== */}
      {activeRole && (() => {
        const varReq = requirements.variables.find(v => v.role === activeRole)
        if (!varReq) return null

        // 검색 필터링
        const filteredColumns = analysis.columns.filter(col => {
          // 검색어 필터
          if (searchQuery && !col.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false
          }

          // 타입 필터 (요구사항과 매치)
          if (varReq.types && varReq.types.length > 0) {
            return varReq.types.includes(col.type)
          }

          return true
        })

        // 타입별 그룹화
        const groupedByType = filteredColumns.reduce((acc, col) => {
          if (!acc[col.type]) acc[col.type] = []
          acc[col.type].push(col)
          return acc
        }, {} as Record<string, ColumnAnalysis[]>)

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-[700px] max-h-[85vh] flex flex-col">
              {/* 헤더 */}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{varReq.label} 선택</CardTitle>
                    <CardDescription className="mt-1">
                      {varReq.description}
                      {varReq.example && ` (예: ${varReq.example})`}
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleCloseModal}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* 검색바 */}
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="변수명 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>

              {/* 내용 */}
              <CardContent className="flex-1 overflow-y-auto">
                <div className="space-y-4">
                  {/* 안내 메시지 */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      {varReq.multiple
                        ? `다중 선택 가능${varReq.minCount ? ` (최소 ${varReq.minCount}개)` : ''}${varReq.maxCount ? ` (최대 ${varReq.maxCount}개)` : ''}`
                        : '단일 선택'}
                    </span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>
                      {tempSelection.length}개 선택됨
                    </span>
                  </div>

                  {/* 변수 목록 (타입별 그룹화) */}
                  {Object.entries(groupedByType).map(([type, columns]) => (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {columns.length}개
                        </span>
                      </div>

                      <div className="space-y-1">
                        {columns.map(col => {
                          const isSelected = tempSelection.includes(col.name)

                          return (
                            <div
                              key={col.name}
                              onClick={() => {
                                if (varReq.multiple) {
                                  handleToggleVariable(col.name)
                                } else {
                                  handleSelectSingleVariable(col.name)
                                }
                              }}
                              className={cn(
                                'flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-colors',
                                isSelected
                                  ? 'bg-primary/10 border-primary'
                                  : 'hover:bg-muted'
                              )}
                            >
                              {/* 체크박스/라디오 */}
                              {varReq.multiple ? (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleToggleVariable(col.name)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <div className={cn(
                                  'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                                  isSelected ? 'border-primary' : 'border-muted-foreground'
                                )}>
                                  {isSelected && (
                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                  )}
                                </div>
                              )}

                              {/* 변수 정보 */}
                              <div className="flex-1">
                                <p className="font-medium text-sm">{col.name}</p>
                                {col.statistics && (
                                  <p className="text-xs text-muted-foreground">
                                    {col.dataType === 'number' && col.statistics.min !== undefined && col.statistics.max !== undefined
                                      ? `범위: ${col.statistics.min.toFixed(2)} ~ ${col.statistics.max.toFixed(2)}`
                                      : `고유값: ${col.uniqueCount}개`}
                                  </p>
                                )}
                              </div>

                              {/* 타입 뱃지 */}
                              <Badge variant="outline" className="text-xs">
                                {col.type}
                              </Badge>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  {/* 검색 결과 없음 */}
                  {filteredColumns.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">검색 결과가 없습니다</p>
                    </div>
                  )}
                </div>
              </CardContent>

              {/* 하단 버튼 */}
              <div className="p-4 border-t flex gap-2">
                <Button
                  onClick={handleCloseModal}
                  variant="outline"
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  onClick={handleConfirmSelection}
                  disabled={varReq.required && tempSelection.length === 0}
                  className="flex-1"
                >
                  확인 ({tempSelection.length}개 선택)
                </Button>
              </div>
            </Card>
          </div>
        )
      })()}

      {/* 드래그 오버레이 (드래그 중 마우스를 따라다니는 카드) */}
      <DragOverlay>
        {activeId && (() => {
          const column = analysis.columns.find(c => c.name === activeId)
          return column ? <DraggableVariableOverlay column={column} /> : null
        })()}
      </DragOverlay>
    </div>
    </DndContext>
  )
}
