'use client'

/**
 * VariableSelectorModern - 현대적인 변수 선택 UI
 *
 * 목표:
 * - 버튼 기반 모달 선택 (드래그앤드롭 제거)
 * - 공간 효율 300% 개선 (1단 레이아웃)
 * - 선택 시간 50% 단축 (20초 → 10초)
 *
 * 디자인 참고: SPSS, Jamovi
 * CLAUDE.md 규칙: any 금지, unknown + 타입 가드 사용
 */

import React, { useState, useMemo, useCallback } from 'react'
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
import {
  AlertCircle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

  // 변수 할당 상태
  const [assignments, setAssignments] = useState<VariableAssignment>({})

  // 모달 상태 (어떤 역할에 대해 모달이 열려 있는지)
  const [activeRole, setActiveRole] = useState<VariableRole | null>(null)

  // 미리보기 모드
  const [showPreview, setShowPreview] = useState(false)

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

  // AI 자동 추천
  const handleAutoAssign = useCallback(() => {
    if (!requirements || !analysis) return

    const recommendations: VariableAssignment = {}

    requirements.variables.forEach(varReq => {
      // 타입 매칭 후보
      const candidates = analysis.columns.filter(col =>
        varReq.types.includes(col.type)
      )

      if (candidates.length === 0) return

      // 휴리스틱 기반 추천
      const colNameLower = (col: ColumnAnalysis) => col.name.toLowerCase()

      if (varReq.role === 'dependent') {
        // 종속변수: score, result, outcome, y, target
        const best = candidates.find(col =>
          /score|result|outcome|target|y_|dependent/.test(colNameLower(col))
        )
        if (best) {
          recommendations[varReq.role] = best.name
          return
        }
      }

      if (varReq.role === 'independent' || varReq.role === 'factor') {
        // 독립변수/요인: group, treatment, condition, x
        const best = candidates.find(col =>
          /group|treatment|condition|method|x_|independent|factor/.test(colNameLower(col))
        )
        if (best) {
          recommendations[varReq.role] = best.name
          return
        }
      }

      // 기본: 첫 번째 후보
      if (varReq.multiple) {
        recommendations[varReq.role] = [candidates[0].name]
      } else {
        recommendations[varReq.role] = candidates[0].name
      }
    })

    setAssignments(recommendations)
  }, [requirements, analysis])

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
    <div className={cn('space-y-6', className)}>
      {/* ========================================
          헤더: 제목 + AI 자동 설정 + 초기화
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
            <div className="flex gap-2">
              <Button
                onClick={handleAutoAssign}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                AI 자동 설정
              </Button>
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
          </div>
        </CardHeader>
      </Card>

      {/* ========================================
          역할별 변수 선택 필드 (Phase 1.2에서 구현)
          ======================================== */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {requirements.variables.map(varReq => (
            <div key={varReq.role} className="space-y-2">
              {/* 라벨 */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  {varReq.label}
                  {varReq.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <Button
                  onClick={() => setActiveRole(varReq.role as VariableRole)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  변수 선택
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              {/* 선택된 변수 칩 영역 */}
              <div className="min-h-[48px] p-3 border rounded-md bg-muted/50">
                {(() => {
                  const assigned = assignments[varReq.role]
                  if (!assigned) {
                    return (
                      <p className="text-sm text-muted-foreground">
                        + 변수 추가
                      </p>
                    )
                  }

                  const vars = Array.isArray(assigned) ? assigned : [assigned]
                  return (
                    <div className="flex flex-wrap gap-2">
                      {vars.map(varName => (
                        <Badge key={varName} variant="secondary" className="gap-2">
                          {varName}
                          <button
                            onClick={() => {
                              // 변수 제거
                              setAssignments(prev => {
                                const current = prev[varReq.role]
                                if (!current) return prev

                                if (Array.isArray(current)) {
                                  const filtered = current.filter(v => v !== varName)
                                  if (filtered.length === 0) {
                                    const { [varReq.role]: _, ...rest } = prev
                                    return rest
                                  }
                                  return { ...prev, [varReq.role]: filtered }
                                }

                                const { [varReq.role]: _, ...rest } = prev
                                return rest
                              })
                            }}
                            className="hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )
                })()}
              </div>

              {/* 설명 */}
              <p className="text-xs text-muted-foreground">
                {varReq.description}
                {varReq.example && ` (예: ${varReq.example})`}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ========================================
          검증 피드백 (Phase 1.5에서 구현)
          ======================================== */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          {/* 필수 변수 체크 */}
          <div className="flex items-start gap-2">
            {validation.isValid ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
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
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
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
          변수 선택 모달 (Phase 1.3에서 구현)
          지금은 간단한 placeholder
          ======================================== */}
      {activeRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[600px] max-h-[80vh] overflow-auto">
            <CardHeader>
              <CardTitle>변수 선택 - {activeRole}</CardTitle>
              <CardDescription>
                Phase 1.3에서 모달 UI 구현 예정
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                사용 가능한 변수: {analysis.columns.length}개
              </p>
              <div className="space-y-2">
                {analysis.columns.map(col => (
                  <div
                    key={col.name}
                    className="p-2 border rounded hover:bg-muted cursor-pointer"
                    onClick={() => {
                      const varReq = requirements.variables.find(v => v.role === activeRole)
                      if (!varReq) return

                      if (varReq.multiple) {
                        const current = assignments[activeRole] || []
                        const currentArray = Array.isArray(current) ? current : [current]
                        handleVariableSelect(activeRole, [...currentArray, col.name])
                      } else {
                        handleVariableSelect(activeRole, col.name)
                      }
                      setActiveRole(null)
                    }}
                  >
                    <span className="font-medium">{col.name}</span>
                    <Badge variant="outline" className="ml-2">{col.type}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
            <div className="p-4 border-t">
              <Button
                onClick={() => setActiveRole(null)}
                variant="outline"
                className="w-full"
              >
                닫기
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
