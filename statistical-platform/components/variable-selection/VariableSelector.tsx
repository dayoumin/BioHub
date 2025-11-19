'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { VariableAssignment } from '@/types/statistics-converters'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  Binary,
  BarChart3,
  GitBranch,
  Lightbulb,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Eye,
  Zap,
  Brain,
  FileText,
  Database,
  Beaker
} from 'lucide-react'
import { cn } from '@/lib/utils'

import {
  VariableType,
  StatisticalMethodRequirements,
  getMethodRequirements,
  VariableRole
} from '@/lib/statistics/variable-requirements'
import {
  analyzeDataset,
  getVariableTypeLabel,
  detectVariableType,
  ColumnAnalysis,
  DatasetAnalysis
} from '@/lib/services/variable-type-detector'

interface VariableSelectorProps {
  methodId: string
  data: Record<string, unknown>[]
  onVariablesSelected: (variables: VariableAssignment) => void
  onBack?: () => void
  className?: string
}

export type { VariableAssignment } from '@/types/statistics-converters'

// 통계 분석별 시각적 가이드
const METHOD_VISUAL_GUIDES = {
  'two-sample-t': {
    icon: <GitBranch className="w-5 h-5" />,
    color: 'blue',
    diagram: `
      [그룹 A] ─→ 비교 ←─ [그룹 B]
             ↓
         종속변수(Y)
    `,
    example: '약물 효과: 신약 vs 위약의 혈압 차이',
    formula: 't = (μ₁ - μ₂) / SE',
    assumptions: ['정규성', '등분산성', '독립성']
  },
  'anova-one-way': {
    icon: <BarChart3 className="w-5 h-5" />,
    color: 'green',
    diagram: `
      [A] [B] [C] [D] → 그룹들
           ↓
       종속변수(Y)
    `,
    example: '교육방법: 4가지 학습법의 성적 차이',
    formula: 'F = MS_between / MS_within',
    assumptions: ['정규성', '등분산성', '독립성']
  },
  'regression-linear': {
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'purple',
    diagram: `
      X₁ ─┐
      X₂ ─┼→ 예측 → Y
      X₃ ─┘
    `,
    example: '주택가격 = f(면적, 방수, 위치)',
    formula: 'Y = β₀ + β₁X₁ + β₂X₂ + ε',
    assumptions: ['선형성', '정규성', '등분산성', '독립성']
  },
  'correlation-pearson': {
    icon: <Binary className="w-5 h-5" />,
    color: 'orange',
    diagram: `
      X ↔ Y (상관관계)
    `,
    example: '키와 몸무게의 관계',
    formula: 'r = Σ(x-x̄)(y-ȳ) / √[Σ(x-x̄)²Σ(y-ȳ)²]',
    assumptions: ['선형성', '정규성', '연속형']
  }
}

// 변수 역할별 상세 설명
const ROLE_EXPLANATIONS = {
  dependent: {
    icon: <TrendingUp className="w-4 h-4" />,
    color: 'text-blue-600',
    title: '종속변수 (Y, Outcome)',
    description: '예측하거나 설명하려는 결과 변수',
    examples: ['시험 점수', '매출액', '생존 여부', '만족도'],
    required: true
  },
  independent: {
    icon: <GitBranch className="w-4 h-4" />,
    color: 'text-success',
    title: '독립변수 (X, Predictor)',
    description: '종속변수에 영향을 주는 예측 변수',
    examples: ['교육 방법', '광고비', '나이', '성별'],
    required: true
  },
  factor: {
    icon: <Users className="w-4 h-4" />,
    color: 'text-purple-600',
    title: '요인 (Factor, Group)',
    description: '그룹을 구분하는 범주형 변수',
    examples: ['처리 그룹', '지역', '제품 유형'],
    required: false
  },
  covariate: {
    icon: <RefreshCw className="w-4 h-4" />,
    color: 'text-orange-600',
    title: '공변량 (Covariate)',
    description: '통제해야 할 연속형 변수',
    examples: ['기초 점수', '연령', '경험 년수'],
    required: false
  },
  blocking: {
    icon: <Database className="w-4 h-4" />,
    color: 'text-pink-600',
    title: '블록 변수 (Block)',
    description: '실험 설계의 블록을 나타내는 변수',
    examples: ['실험실', '날짜', '관찰자'],
    required: false
  }
}

export function VariableSelector({
  methodId,
  data,
  onVariablesSelected,
  onBack,
  className
}: VariableSelectorProps) {
  const [assignments, setAssignments] = useState<VariableAssignment>({})
  const [selectedVariable, setSelectedVariable] = useState<string | null>(null)
  const [hoveredRole, setHoveredRole] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])

  // 메서드 요구사항
  const methodRequirements = useMemo(() => {
    return getMethodRequirements(methodId)
  }, [methodId])

  // 데이터 분석
  const dataAnalysis = useMemo(() => {
    if (!data || data.length === 0) return null
    return analyzeDataset(data, { detectIdColumns: true })
  }, [data])

  // 시각적 가이드 정보
  const visualGuide = METHOD_VISUAL_GUIDES[methodId as keyof typeof METHOD_VISUAL_GUIDES]

  // 변수 할당
  const assignVariable = useCallback((role: string, variable: string, isMultiple: boolean = false) => {
    setAssignments((prev: VariableAssignment) => {
      const newAssignments = { ...prev }
      if (isMultiple) {
        const current = prev[role] || []
        const currentArray = Array.isArray(current) ? current : [current]
        if (currentArray.includes(variable)) {
          // 제거
          newAssignments[role] = currentArray.filter(v => v !== variable)
        } else {
          // 추가
          newAssignments[role] = [...currentArray, variable]
        }
      } else {
        newAssignments[role] = variable
      }
      return newAssignments
    })
  }, [])

  // 자동 추천 (AI 기반 시뮬레이션)
  const handleAutoRecommend = useCallback(() => {
    if (!methodRequirements || !dataAnalysis) return

    const recommendations: VariableAssignment = {}

    methodRequirements.variables.forEach(varReq => {
      // 변수 타입과 이름 패턴 매칭
      const candidates = dataAnalysis.columns.filter(col => {
        // 타입 매칭
        if (!varReq.types.includes(col.type)) return false

        // 이름 패턴 매칭 (휴리스틱)
        const colNameLower = col.name.toLowerCase()
        if (varReq.role === 'dependent') {
          // 종속변수 패턴: score, result, outcome, y, target
          return /score|result|outcome|target|y_|dependent/.test(colNameLower)
        } else if (varReq.role === 'independent') {
          // 독립변수 패턴: group, treatment, condition, x
          return /group|treatment|condition|method|x_|independent/.test(colNameLower)
        } else if (varReq.role === 'factor') {
          // 요인 패턴: 범주형이면서 그룹을 나타냄
          return col.type === 'categorical' || col.type === 'binary'
        }
        return true
      })

      if (candidates.length > 0) {
        if (varReq.multiple) {
          recommendations[varReq.role] = candidates
            .slice(0, varReq.minCount || 2)
            .map(c => c.name)
        } else {
          recommendations[varReq.role] = candidates[0].name
        }
      }
    })

    setAssignments(recommendations)
  }, [methodRequirements, dataAnalysis])

  // 검증
  const validateAssignments = useCallback(() => {
    if (!methodRequirements) return []

    const errors: string[] = []
    const warns: string[] = []

    methodRequirements.variables.forEach(varReq => {
      const assigned = assignments[varReq.role]

      // 필수 변수 체크
      if (varReq.required && !assigned) {
        errors.push(`${varReq.label}를 선택해주세요`)
      }

      // 최소 개수 체크
      if (varReq.minCount && Array.isArray(assigned) && assigned.length < varReq.minCount) {
        errors.push(`${varReq.label}는 최소 ${varReq.minCount}개 필요합니다`)
      }

      // 타입 체크
      if (assigned && dataAnalysis) {
        const vars = Array.isArray(assigned) ? assigned : [assigned]
        vars.forEach(v => {
          const column = dataAnalysis.columns.find(c => c.name === v)
          if (column && !varReq.types.includes(column.type)) {
            warns.push(`${v}는 ${varReq.label}로 적합하지 않을 수 있습니다 (${getVariableTypeLabel(column.type)} 타입)`)
          }
        })
      }
    })

    // 통계적 가정 체크
    if (methodRequirements.assumptions) {
      methodRequirements.assumptions.forEach(assumption => {
        if (assumption === '정규성' && dataAnalysis) {
          const depVar = assignments['dependent']
          if (depVar && typeof depVar === 'string') {
            const column = dataAnalysis.columns.find(c => c.name === depVar)
            if (column && column.statistics?.skewness && Math.abs(column.statistics.skewness) > 2) {
              warns.push(`${depVar}의 분포가 정규성을 만족하지 않을 수 있습니다 (왜도: ${column.statistics.skewness.toFixed(2)})`)
            }
          }
        }
      })
    }

    setValidationErrors(errors)
    setWarnings(warns)
    return errors
  }, [assignments, methodRequirements, dataAnalysis])

  // 검증 실행
  useEffect(() => {
    validateAssignments()
  }, [validateAssignments])

  // 완료 처리
  const handleComplete = useCallback(() => {
    const errors = validateAssignments()
    if (errors.length === 0) {
      onVariablesSelected(assignments)
    }
  }, [validateAssignments, assignments, onVariablesSelected])

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
    <div className={cn("space-y-6", className)}>
      {/* 헤더 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                {visualGuide?.icon}
                {methodRequirements.name} 변수 설정
              </CardTitle>
              <CardDescription>
                {methodRequirements.description}
              </CardDescription>

              {/* 분석 공식 */}
              {visualGuide?.formula && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {visualGuide.formula}
                  </Badge>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{visualGuide.example}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGuide(!showGuide)}
              >
                <Lightbulb className={cn("w-4 h-4 mr-2", showGuide && "text-yellow-500")} />
                가이드
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoRecommend}
              >
                <Brain className="w-4 h-4 mr-2" />
                AI 추천
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 시각적 가이드 */}
      <AnimatePresence>
        {showGuide && visualGuide && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Alert>
              <Beaker className="h-4 w-4" />
              <AlertTitle>분석 구조</AlertTitle>
              <AlertDescription>
                <pre className="mt-2 p-2 bg-muted rounded text-xs">
                  {visualGuide.diagram}
                </pre>
                <div className="mt-3 space-y-1">
                  <p className="text-sm font-medium">예시: {visualGuide.example}</p>
                  <div className="flex gap-2">
                    {visualGuide.assumptions.map((assumption, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {assumption}
                      </Badge>
                    ))}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 왼쪽: 사용 가능한 변수 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-4 h-4" />
              데이터 변수
            </CardTitle>
            <CardDescription>
              {dataAnalysis.columns.length}개 변수 ({dataAnalysis.rows}행)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {dataAnalysis.columns.map(column => {
                  const isAssigned = Object.values(assignments).some(v =>
                    Array.isArray(v) ? v.includes(column.name) : v === column.name
                  )

                  return (
                    <motion.div
                      key={column.name}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card
                        className={cn(
                          "p-3 cursor-pointer transition-all",
                          selectedVariable === column.name && "ring-2 ring-primary",
                          isAssigned && "bg-muted/50 opacity-75"
                        )}
                        onClick={() => setSelectedVariable(column.name)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-lg",
                                column.type === 'continuous' && "text-info",
                                column.type === 'categorical' && "text-success",
                                column.type === 'binary' && "text-purple-500"
                              )}>
                                {column.type === 'continuous' && <TrendingUp className="w-4 h-4" />}
                                {column.type === 'categorical' && <Type className="w-4 h-4" />}
                                {column.type === 'binary' && <Binary className="w-4 h-4" />}
                              </span>
                              <span className="font-medium text-sm">{column.name}</span>
                            </div>

                            <div className="mt-1 space-y-1">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{getVariableTypeLabel(column.type)}</span>
                                <span>•</span>
                                <span>{column.uniqueCount} 고유값</span>
                              </div>

                              {column.type === 'continuous' && (
                                <div className="text-xs text-muted-foreground">
                                  범위: {column.statistics?.min?.toFixed(2)} ~ {column.statistics?.max?.toFixed(2)}
                                </div>
                              )}

                              {column.missingCount > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  결측 {column.missingCount}개
                                </Badge>
                              )}
                            </div>
                          </div>

                          {isAssigned && (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* 가운데: 역할 할당 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              변수 역할 할당
            </CardTitle>
            <CardDescription>
              각 변수의 통계적 역할을 지정하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {methodRequirements.variables.map(varReq => {
                const roleInfo = ROLE_EXPLANATIONS[varReq.role as keyof typeof ROLE_EXPLANATIONS]
                const assigned = assignments[varReq.role]
                const assignedArray = assigned
                  ? (Array.isArray(assigned) ? assigned : [assigned])
                  : []

                return (
                  <motion.div
                    key={varReq.role}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onMouseEnter={() => setHoveredRole(varReq.role)}
                    onMouseLeave={() => setHoveredRole(null)}
                  >
                    <Card className={cn(
                      "border-2 transition-all",
                      hoveredRole === varReq.role && "border-primary shadow-lg",
                      assignedArray.length > 0 && "bg-accent/5"
                    )}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className={roleInfo?.color}>
                              {roleInfo?.icon}
                            </span>
                            <div>
                              <h4 className="font-medium text-sm">
                                {varReq.label}
                                {varReq.required && (
                                  <span className="text-red-500 ml-1">*</span>
                                )}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {varReq.description}
                              </p>
                            </div>
                          </div>

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
                      </CardHeader>

                      <CardContent>
                        <div className={cn(
                          "min-h-[60px] p-3 rounded-lg border-2 border-dashed",
                          "transition-all",
                          selectedVariable && "border-primary bg-primary/5"
                        )}>
                          {assignedArray.length === 0 ? (
                            <div className="flex items-center justify-center h-full py-2">
                              <p className="text-xs text-muted-foreground text-center">
                                {varReq.example ? (
                                  <>
                                    변수를 선택하거나 클릭하세요
                                    <br />
                                    <span className="italic">예: {varReq.example}</span>
                                  </>
                                ) : (
                                  '변수를 선택하거나 클릭하세요'
                                )}
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {assignedArray.map(varName => {
                                const column = dataAnalysis.columns.find(c => c.name === varName)
                                if (!column) return null

                                return (
                                  <Badge
                                    key={varName}
                                    variant="secondary"
                                    className="px-3 py-1 cursor-pointer"
                                    onClick={() => assignVariable(
                                      varReq.role,
                                      varName,
                                      varReq.multiple
                                    )}
                                  >
                                    <span className="mr-1">
                                      {column.type === 'continuous' && '📊'}
                                      {column.type === 'categorical' && '📝'}
                                      {column.type === 'binary' && '⚡'}
                                    </span>
                                    {varName}
                                    <span className="ml-2 text-xs opacity-60">×</span>
                                  </Badge>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        {varReq.minCount && (
                          <p className={cn(
                            "text-xs mt-2",
                            assignedArray.length < varReq.minCount
                              ? "text-amber-600"
                              : "text-success"
                          )}>
                            {assignedArray.length} / {varReq.minCount}개 선택됨
                          </p>
                        )}

                        {/* 빠른 선택 버튼 */}
                        {selectedVariable && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 w-full"
                            onClick={() => {
                              assignVariable(varReq.role, selectedVariable, varReq.multiple)
                              setSelectedVariable(null)
                            }}
                          >
                            <ArrowRight className="w-4 h-4 mr-2" />
                            {selectedVariable} 할당
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 경고 및 오류 */}
      {warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>주의사항</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {warnings.map((warning, i) => (
                <li key={i} className="text-sm">{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>변수 선택 오류</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {validationErrors.map((error, i) => (
                <li key={i} className="text-sm">{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* 미리보기 및 액션 버튼 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onBack}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                이전
              </Button>
              <Button
                variant="outline"
                onClick={() => setAssignments({})}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                초기화
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="w-4 h-4 mr-2" />
                미리보기
              </Button>
            </div>

            <Button
              onClick={handleComplete}
              disabled={validationErrors.length > 0}
              className={cn(
                validationErrors.length === 0 && "bg-gradient-to-r from-blue-500 to-purple-500"
              )}
            >
              {validationErrors.length === 0 ? (
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

          {/* 미리보기 */}
          <AnimatePresence>
            {showPreview && Object.keys(assignments).length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <Separator className="mb-4" />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    분석 설정 요약
                  </h4>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>역할</TableHead>
                        <TableHead>변수</TableHead>
                        <TableHead>타입</TableHead>
                        <TableHead>특성</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(assignments).map(([role, variables]) => {
                        const varArray = Array.isArray(variables) ? variables : [variables]
                        return varArray.map((varName, idx) => {
                          const column = dataAnalysis?.columns.find(c => c.name === varName)
                          if (!column) return null

                          return (
                            <TableRow key={`${role}-${varName}`}>
                              {idx === 0 && (
                                <TableCell rowSpan={varArray.length}>
                                  <Badge variant="outline">
                                    {methodRequirements?.variables.find(v => v.role === role)?.label}
                                  </Badge>
                                </TableCell>
                              )}
                              <TableCell className="font-mono text-sm">{varName}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  {getVariableTypeLabel(column.type)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {column.uniqueCount}개 고유값
                                {column.missingCount > 0 && ` • 결측 ${column.missingCount}개`}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      })}
                    </TableBody>
                  </Table>

                  {/* 분석 명령 미리보기 */}
                  <Alert>
                    <Zap className="h-4 w-4" />
                    <AlertDescription>
                      <p className="text-xs font-mono">
                        {methodRequirements?.name}(
                        {Object.entries(assignments).map(([role, vars]) =>
                          `${role}=${Array.isArray(vars) ? `[${vars.join(', ')}]` : vars}`
                        ).join(', ')}
                        )
                      </p>
                    </AlertDescription>
                  </Alert>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
}