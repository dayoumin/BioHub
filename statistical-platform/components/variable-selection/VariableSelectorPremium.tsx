'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Sparkles,
  Search,
  Plus,
  Minus,
  ArrowRight,
  BookOpen,
  Lightbulb,
  Target,
  Zap,
  ChevronDown,
  TrendingUp,
  Users,
  Calendar,
  Hash,
  Binary,
  Type,
  Eye,
  RefreshCw,
  Lock,
  Unlock
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

interface VariableSelectorPremiumProps {
  methodId: string
  data: Record<string, any>[]
  onVariablesSelected: (variables: VariableAssignment) => void
  onBack?: () => void
  className?: string
}

export interface VariableAssignment {
  [role: string]: string | string[]
}

interface VariableSlot {
  role: string
  label: string
  description: string
  required: boolean
  types: VariableType[]
  multiple: boolean
  minCount?: number
  maxCount?: number
  assigned: string[]
  isValid: boolean
  message?: string
}

/**
 * 프리미엄 변수 선택 UI
 * 최상의 사용자 경험을 제공하는 인터랙티브 인터페이스
 */
export function VariableSelectorPremium({
  methodId,
  data,
  onVariablesSelected,
  onBack,
  className
}: VariableSelectorPremiumProps) {
  const [slots, setSlots] = useState<VariableSlot[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0)
  const [showGuide, setShowGuide] = useState(true)
  const [autoMode, setAutoMode] = useState(false)
  const [completionProgress, setCompletionProgress] = useState(0)

  // 메서드 요구사항
  const methodRequirements = useMemo(() => {
    return getMethodRequirements(methodId)
  }, [methodId])

  // 데이터 분석
  const dataAnalysis = useMemo(() => {
    if (!data || data.length === 0) return null
    return analyzeDataset(data, { detectIdColumns: true })
  }, [data])

  // 슬롯 초기화
  useEffect(() => {
    if (!methodRequirements) return

    const initialSlots: VariableSlot[] = methodRequirements.variables.map(varReq => ({
      role: varReq.role,
      label: varReq.label,
      description: varReq.description,
      required: varReq.required,
      types: varReq.types,
      multiple: varReq.multiple,
      minCount: varReq.minCount,
      maxCount: varReq.maxCount,
      assigned: [],
      isValid: !varReq.required,
      message: varReq.example ? `예: ${varReq.example}` : undefined
    }))

    setSlots(initialSlots)
  }, [methodRequirements])

  // 진행률 계산
  useEffect(() => {
    const requiredSlots = slots.filter(s => s.required)
    const filledRequiredSlots = requiredSlots.filter(s => s.assigned.length > 0)
    const progress = requiredSlots.length > 0
      ? (filledRequiredSlots.length / requiredSlots.length) * 100
      : 0
    setCompletionProgress(progress)
  }, [slots])

  // 변수 타입 아이콘
  const getTypeIcon = (type: VariableType) => {
    const icons: Record<VariableType, React.ReactNode> = {
      continuous: <TrendingUp className="w-4 h-4" />,
      categorical: <Type className="w-4 h-4" />,
      binary: <Binary className="w-4 h-4" />,
      ordinal: <Hash className="w-4 h-4" />,
      date: <Calendar className="w-4 h-4" />,
      count: <Users className="w-4 h-4" />
    }
    return icons[type] || <Info className="w-4 h-4" />
  }

  // 타입 색상
  const getTypeGradient = (type: VariableType) => {
    const gradients: Record<VariableType, string> = {
      continuous: 'from-blue-500 to-blue-600',
      categorical: 'from-green-500 to-green-600',
      binary: 'from-purple-500 to-purple-600',
      ordinal: 'from-orange-500 to-orange-600',
      date: 'from-pink-500 to-pink-600',
      count: 'from-indigo-500 to-indigo-600'
    }
    return gradients[type] || 'from-gray-500 to-gray-600'
  }

  // 필터링된 컬럼
  const filteredColumns = useMemo(() => {
    if (!dataAnalysis) return []

    const currentSlot = slots[selectedSlotIndex]
    if (!currentSlot) return []

    return dataAnalysis.columns.filter(col => {
      // 타입 필터
      if (!currentSlot.types.includes(col.type)) return false

      // 검색 필터
      if (searchQuery) {
        return col.name.toLowerCase().includes(searchQuery.toLowerCase())
      }

      return true
    })
  }, [dataAnalysis, slots, selectedSlotIndex, searchQuery])

  // 추천 변수
  const recommendedColumns = useMemo(() => {
    if (!dataAnalysis) return []

    const currentSlot = slots[selectedSlotIndex]
    if (!currentSlot) return []

    // 타입이 맞고 신뢰도가 높은 상위 3개
    return dataAnalysis.columns
      .filter(col => currentSlot.types.includes(col.type))
      .filter(col => col.metadata.confidence >= 0.8)
      .slice(0, 3)
  }, [dataAnalysis, slots, selectedSlotIndex])

  // 변수 할당
  const assignVariable = (slotIndex: number, columnName: string) => {
    setSlots(prev => {
      const newSlots = [...prev]
      const slot = newSlots[slotIndex]

      if (!slot.assigned.includes(columnName)) {
        if (slot.multiple) {
          slot.assigned = [...slot.assigned, columnName]
        } else {
          slot.assigned = [columnName]
        }
      }

      // 유효성 검사
      slot.isValid = validateSlot(slot)

      return newSlots
    })
  }

  // 변수 제거
  const removeVariable = (slotIndex: number, columnName: string) => {
    setSlots(prev => {
      const newSlots = [...prev]
      const slot = newSlots[slotIndex]

      slot.assigned = slot.assigned.filter(c => c !== columnName)
      slot.isValid = validateSlot(slot)

      return newSlots
    })
  }

  // 슬롯 유효성 검사
  const validateSlot = (slot: VariableSlot): boolean => {
    if (slot.required && slot.assigned.length === 0) return false
    if (slot.minCount && slot.assigned.length < slot.minCount) return false
    if (slot.maxCount && slot.assigned.length > slot.maxCount) return false
    return true
  }

  // 자동 할당
  const handleAutoAssign = () => {
    if (!dataAnalysis) return

    setAutoMode(true)

    // 애니메이션과 함께 순차적 할당
    slots.forEach((slot, index) => {
      setTimeout(() => {
        const matchingColumns = dataAnalysis.columns
          .filter(col => slot.types.includes(col.type))

        if (matchingColumns.length > 0) {
          const count = slot.minCount || 1
          const selectedColumns = matchingColumns
            .slice(0, Math.min(count, matchingColumns.length))
            .map(c => c.name)

          setSlots(prev => {
            const newSlots = [...prev]
            newSlots[index].assigned = selectedColumns
            newSlots[index].isValid = validateSlot(newSlots[index])
            return newSlots
          })
        }
      }, index * 200)
    })

    setTimeout(() => setAutoMode(false), slots.length * 200 + 500)
  }

  // 완료 처리
  const handleComplete = () => {
    const assignments: VariableAssignment = {}

    slots.forEach(slot => {
      if (slot.assigned.length > 0) {
        assignments[slot.role] = slot.multiple ? slot.assigned : slot.assigned[0]
      }
    })

    onVariablesSelected(assignments)
  }

  // 전체 유효성
  const isValid = slots.every(slot => slot.isValid)

  if (!methodRequirements || !dataAnalysis) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>데이터를 불러올 수 없습니다</AlertDescription>
      </Alert>
    )
  }

  return (
    <TooltipProvider>
      <div className={cn("space-y-6", className)}>
        {/* 헤더 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">
                {methodRequirements.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {methodRequirements.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1">
                <Target className="w-3 h-3 mr-1" />
                {dataAnalysis.columns.length}개 변수
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                <Users className="w-3 h-3 mr-1" />
                {data.length}개 샘플
              </Badge>
            </div>
          </div>

          {/* 진행 상태 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">완료율</span>
              <span className="font-medium">{Math.round(completionProgress)}%</span>
            </div>
            <Progress value={completionProgress} className="h-2" />
          </div>

          {/* 빠른 액션 */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoAssign}
              disabled={autoMode}
            >
              {autoMode ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  자동 할당 중...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  자동 추천
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuide(!showGuide)}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              가이드
            </Button>
          </div>
        </div>

        {/* 가이드 */}
        <AnimatePresence>
          {showGuide && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">빠른 시작 가이드</p>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div className="flex items-start gap-2">
                        <Badge className="mt-0.5">1</Badge>
                        <div className="text-xs">
                          왼쪽에서 변수 슬롯 선택
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge className="mt-0.5">2</Badge>
                        <div className="text-xs">
                          오른쪽에서 적합한 변수 선택
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge className="mt-0.5">3</Badge>
                        <div className="text-xs">
                          모든 필수 항목 완료 후 분석 시작
                        </div>
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 메인 콘텐츠 */}
        <div className="grid md:grid-cols-5 gap-4">
          {/* 왼쪽: 변수 슬롯 */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">변수 슬롯</h3>
              <span className="text-xs text-muted-foreground">
                {slots.filter(s => s.assigned.length > 0).length} / {slots.length}
              </span>
            </div>

            <div className="space-y-2">
              {slots.map((slot, index) => (
                <motion.div
                  key={slot.role}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className={cn(
                      "cursor-pointer transition-all",
                      selectedSlotIndex === index && "ring-2 ring-primary",
                      slot.assigned.length > 0 && "bg-accent/20",
                      !slot.isValid && slot.required && "border-red-200"
                    )}
                    onClick={() => setSelectedSlotIndex(index)}
                  >
                    <CardHeader className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              slot.isValid ? "bg-green-500" :
                              slot.required ? "bg-red-500" : "bg-gray-300"
                            )} />
                            <span className="font-medium text-sm">
                              {slot.label}
                              {slot.required && <span className="text-red-500 ml-1">*</span>}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {slot.assigned.length > 0 ? (
                              <Badge variant="secondary" className="text-xs">
                                {slot.assigned.length}개
                              </Badge>
                            ) : slot.required ? (
                              <Lock className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Unlock className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {slot.description}
                        </p>

                        {slot.assigned.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {slot.assigned.map(col => (
                              <Badge
                                key={col}
                                variant="outline"
                                className="text-xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeVariable(index, col)
                                }}
                              >
                                {col}
                                <Minus className="w-3 h-3 ml-1" />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* 가운데: 구분선 */}
          <div className="hidden md:flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-muted-foreground" />
          </div>

          {/* 오른쪽: 변수 선택 */}
          <div className="md:col-span-2">
            <div className="space-y-4">
              {/* 검색 */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="변수 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* 추천 변수 */}
              {recommendedColumns.length > 0 && !searchQuery && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="w-4 h-4" />
                    추천 변수
                  </div>
                  <div className="grid gap-2">
                    {recommendedColumns.map(column => (
                      <motion.div
                        key={column.name}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card
                          className="cursor-pointer hover:shadow-md transition-all"
                          onClick={() => assignVariable(selectedSlotIndex, column.name)}
                        >
                          <CardHeader className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "p-1 rounded-md bg-gradient-to-r text-white",
                                  getTypeGradient(column.type)
                                )}>
                                  {getTypeIcon(column.type)}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{column.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {getVariableTypeLabel(column.type)} • {column.uniqueCount}개 고유값
                                  </p>
                                </div>
                              </div>
                              <Plus className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </CardHeader>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* 모든 변수 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>사용 가능한 변수</span>
                  <span>{filteredColumns.length}개</span>
                </div>

                <div className="grid gap-2 max-h-[400px] overflow-y-auto">
                  {filteredColumns.length === 0 ? (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        현재 슬롯에 맞는 변수가 없습니다
                      </AlertDescription>
                    </Alert>
                  ) : (
                    filteredColumns.map(column => {
                      const isAssigned = slots[selectedSlotIndex]?.assigned.includes(column.name)

                      return (
                        <motion.div
                          key={column.name}
                          whileHover={{ x: 4 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Card
                            className={cn(
                              "cursor-pointer transition-all",
                              isAssigned && "opacity-50 bg-accent/20"
                            )}
                            onClick={() => {
                              if (!isAssigned) {
                                assignVariable(selectedSlotIndex, column.name)
                              }
                            }}
                          >
                            <CardHeader className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "p-1 rounded-md",
                                    `bg-${getVariableTypeLabel(column.type)}-100`,
                                    `text-${getVariableTypeLabel(column.type)}-600`
                                  )}>
                                    {getTypeIcon(column.type)}
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{column.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {column.uniqueCount}개 고유값
                                      {column.missingCount > 0 && ` • ${column.missingCount}개 결측`}
                                    </p>
                                  </div>
                                </div>
                                {isAssigned ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Plus className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                            </CardHeader>
                          </Card>
                        </motion.div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 액션 */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack}>
            이전
          </Button>

          <div className="flex items-center gap-4">
            {!isValid && (
              <p className="text-sm text-muted-foreground">
                필수 항목을 모두 선택하세요
              </p>
            )}

            <Button
              onClick={handleComplete}
              disabled={!isValid}
              className={cn(
                "transition-all",
                isValid && "shadow-lg"
              )}
            >
              {isValid ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  분석 시작
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {slots.filter(s => s.required && !s.isValid).length}개 항목 필요
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}