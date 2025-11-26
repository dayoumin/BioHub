'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Search, Check, ChevronDown, CheckCircle2, XCircle, AlertCircle, Sparkles, ArrowUp, ArrowDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { StatisticalMethod } from '@/types/smart-flow'

interface MethodSelectorProps {
  methods: StatisticalMethod[]
  selectedMethod: StatisticalMethod | null
  dataProfile: any
  assumptionResults?: any
  onMethodSelect: (method: StatisticalMethod) => void
  checkMethodRequirements: (method: StatisticalMethod, profile: any) => any
  recommendedMethods?: StatisticalMethod[]
}

// 체크리스트 아이템 컴포넌트
function ChecklistItem({
  passed,
  label,
  type = 'check'
}: {
  passed: boolean | undefined
  label: string
  type?: 'check' | 'warning'
}) {
  const Icon = passed === undefined
    ? AlertCircle
    : passed
      ? CheckCircle2
      : type === 'warning' ? AlertCircle : XCircle

  const color = passed === undefined
    ? 'text-muted-foreground'
    : passed
      ? 'text-success'
      : type === 'warning'
        ? 'text-amber-500'
        : 'text-error'

  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-3 w-3 flex-shrink-0 ${color}`} />
      <span className="text-xs">{label}</span>
    </div>
  )
}

// 요구사항 체크리스트
function RequirementsChecklist({
  method,
  dataProfile,
  assumptionResults
}: {
  method: StatisticalMethod
  dataProfile: any
  assumptionResults?: any
}) {
  const methodReq = method.requirements

  // 신뢰도 점수 계산
  let passedCount = 0
  let totalCount = 0

  // 샘플 크기 체크
  if (methodReq?.minSampleSize) {
    totalCount++
    if (dataProfile.totalRows >= methodReq.minSampleSize) passedCount++
  }

  // 변수 타입 체크
  if (methodReq?.variableTypes) {
    if (methodReq.variableTypes.includes('numeric')) {
      totalCount++
      if (dataProfile.numericVars > 0) passedCount++
    }
    if (methodReq.variableTypes.includes('categorical')) {
      totalCount++
      if (dataProfile.categoricalVars > 0) passedCount++
    }
  }

  // 가정 체크 (assumptionResults 우선, dataProfile fallback)
  if (methodReq?.assumptions) {
    methodReq.assumptions.forEach((assumption) => {
      if (assumption === '정규성') {
        const normalityPassed =
          assumptionResults?.normality?.shapiroWilk?.isNormal ??
          assumptionResults?.normality?.kolmogorovSmirnov?.isNormal ??
          dataProfile.normalityPassed

        if (normalityPassed !== undefined) {
          totalCount++
          if (normalityPassed) passedCount++
        }
      }

      if (assumption === '등분산성') {
        const homogeneityPassed =
          assumptionResults?.homogeneity?.levene?.equalVariance ??
          assumptionResults?.homogeneity?.bartlett?.equalVariance ??
          dataProfile.homogeneityPassed

        if (homogeneityPassed !== undefined) {
          totalCount++
          if (homogeneityPassed) passedCount++
        }
      }
    })
  }

  const confidence = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0

  return (
    <div className="space-y-2">
      {/* 신뢰도 점수 */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">일치율</span>
        <Badge variant={confidence >= 80 ? 'default' : confidence >= 60 ? 'secondary' : 'outline'}>
          {confidence}%
        </Badge>
      </div>

      {/* 체크리스트 */}
      <div className="space-y-1">
        {/* 샘플 크기 */}
        {methodReq?.minSampleSize && (
          <ChecklistItem
            passed={dataProfile.totalRows >= methodReq.minSampleSize}
            label={`샘플 크기 충분 (n=${dataProfile.totalRows}, 필요: ${methodReq.minSampleSize})`}
          />
        )}

        {/* 변수 타입 */}
        {methodReq?.variableTypes?.includes('numeric') && (
          <ChecklistItem
            passed={dataProfile.numericVars > 0}
            label={`수치형 변수 있음 (${dataProfile.numericVars}개)`}
          />
        )}
        {methodReq?.variableTypes?.includes('categorical') && (
          <ChecklistItem
            passed={dataProfile.categoricalVars > 0}
            label={`범주형 변수 있음 (${dataProfile.categoricalVars}개)`}
          />
        )}

        {/* 가정 검정 */}
        {methodReq?.assumptions?.includes('정규성') && (() => {
          const normalityPassed =
            assumptionResults?.normality?.shapiroWilk?.isNormal ??
            assumptionResults?.normality?.kolmogorovSmirnov?.isNormal ??
            dataProfile.normalityPassed

          return (
            <ChecklistItem
              passed={normalityPassed}
              label={`정규성 검정 ${normalityPassed === undefined ? '미실행' : normalityPassed ? '통과' : '실패'}`}
              type="warning"
            />
          )
        })()}
        {methodReq?.assumptions?.includes('등분산성') && (() => {
          const homogeneityPassed =
            assumptionResults?.homogeneity?.levene?.equalVariance ??
            assumptionResults?.homogeneity?.bartlett?.equalVariance ??
            dataProfile.homogeneityPassed

          return (
            <ChecklistItem
              passed={homogeneityPassed}
              label={`등분산성 검정 ${homogeneityPassed === undefined ? '미실행' : homogeneityPassed ? '통과' : '실패'}`}
              type="warning"
            />
          )
        })()}
      </div>
    </div>
  )
}

// 개별 메서드 아이템
function MethodItem({
  method,
  isSelected,
  isFocused,
  isRecommended,
  requirements,
  dataProfile,
  assumptionResults,
  onSelect,
  onToggleExpand,
  isExpanded
}: {
  method: StatisticalMethod
  isSelected: boolean
  isFocused: boolean
  isRecommended: boolean
  requirements: { canUse: boolean; warnings: string[] }
  dataProfile: any
  assumptionResults?: any
  onSelect: () => void
  onToggleExpand: () => void
  isExpanded: boolean
}) {
  return (
    <div
      className={`border rounded-lg transition-all ${
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : isFocused
            ? 'border-primary/50 bg-accent/50'
            : 'border-border hover:border-primary/30'
      } ${!requirements.canUse ? 'opacity-60' : ''}`}
    >
      <button
        onClick={onSelect}
        className="w-full text-left p-3 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{method.name}</span>
              {isRecommended && (
                <Badge variant="default" className="text-xs bg-amber-500 hover:bg-amber-600">
                  <Sparkles className="w-3 h-3 mr-1" />
                  추천
                </Badge>
              )}
              {method.subcategory && (
                <Badge variant="secondary" className="text-xs">
                  {method.subcategory}
                </Badge>
              )}
              {!requirements.canUse && (
                <Badge variant="destructive" className="text-xs">
                  요구사항 미충족
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {method.description}
            </p>
          </div>
          {isSelected && (
            <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          )}
        </div>
      </button>

      {/* 경고 메시지 인라인 표시 */}
      {requirements.warnings.length > 0 && (
        <div className="px-3 pb-2 space-y-1">
          {requirements.warnings.map((warning, idx) => (
            <p key={idx} className="text-xs text-amber-600 dark:text-amber-400">
              ⚠️ {warning}
            </p>
          ))}
        </div>
      )}

      {/* 요구사항 체크리스트 Collapsible */}
      {dataProfile && method.requirements && (
        <Collapsible open={isExpanded} onOpenChange={() => onToggleExpand()}>
          <CollapsibleTrigger className="w-full px-3 pb-2 text-xs text-primary hover:underline flex items-center gap-1">
            요구사항 확인
            <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 pb-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <RequirementsChecklist
                  method={method}
                  dataProfile={dataProfile}
                  assumptionResults={assumptionResults}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}

export function MethodSelector({
  methods,
  selectedMethod,
  dataProfile,
  assumptionResults,
  onMethodSelect,
  checkMethodRequirements,
  recommendedMethods = []
}: MethodSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // 추천 메서드 ID Set
  const recommendedIds = useMemo(() =>
    new Set(recommendedMethods.map(m => m.id)),
    [recommendedMethods]
  )

  // 검색 필터링
  const filteredMethods = useMemo(() => {
    if (!searchQuery.trim()) return methods

    const query = searchQuery.toLowerCase()
    return methods.filter(method =>
      method.name.toLowerCase().includes(query) ||
      method.description?.toLowerCase().includes(query) ||
      method.subcategory?.toLowerCase().includes(query)
    )
  }, [methods, searchQuery])

  // 추천 + 일반 그룹 분리
  const groupedMethods = useMemo(() => {
    const recommended: StatisticalMethod[] = []
    const others: StatisticalMethod[] = []

    filteredMethods.forEach(method => {
      if (recommendedIds.has(method.id)) {
        recommended.push(method)
      } else {
        others.push(method)
      }
    })

    return { recommended, others }
  }, [filteredMethods, recommendedIds])

  // 전체 메서드 리스트 (네비게이션용)
  const allDisplayedMethods = useMemo(() =>
    [...groupedMethods.recommended, ...groupedMethods.others],
    [groupedMethods]
  )

  // 키보드 네비게이션
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex(prev =>
          Math.min(prev + 1, allDisplayedMethods.length - 1)
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (allDisplayedMethods[focusedIndex]) {
          onMethodSelect(allDisplayedMethods[focusedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setSearchQuery('')
        inputRef.current?.blur()
        break
    }
  }, [allDisplayedMethods, focusedIndex, onMethodSelect])

  // 포커스된 아이템 스크롤
  useEffect(() => {
    if (listRef.current && focusedIndex >= 0) {
      const focusedElement = listRef.current.querySelector(`[data-index="${focusedIndex}"]`)
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [focusedIndex])

  // 검색어 변경 시 포커스 리셋
  useEffect(() => {
    setFocusedIndex(0)
  }, [searchQuery])

  // 메서드별 인덱스 맵 (렌더링 중 변수 변경 방지)
  const methodIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    let index = 0
    groupedMethods.recommended.forEach(m => {
      map.set(m.id, index++)
    })
    groupedMethods.others.forEach(m => {
      map.set(m.id, index++)
    })
    return map
  }, [groupedMethods])

  return (
    <div className="space-y-3">
      {/* 검색 입력 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="통계 방법 검색... (↑↓ 이동, Enter 선택)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-4"
        />
        {searchQuery && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
              <ArrowUp className="w-3 h-3 inline" />
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
              <ArrowDown className="w-3 h-3 inline" />
            </kbd>
          </div>
        )}
      </div>

      {/* 결과 카운트 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {filteredMethods.length}개 방법
          {searchQuery && ` (검색: "${searchQuery}")`}
        </span>
        {selectedMethod && (
          <span className="text-primary font-medium">
            선택됨: {selectedMethod.name}
          </span>
        )}
      </div>

      {/* 메서드 리스트 */}
      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-3" ref={listRef}>
          {/* 추천 그룹 */}
          {groupedMethods.recommended.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400 sticky top-0 bg-background/95 backdrop-blur py-1">
                <Sparkles className="w-3.5 h-3.5" />
                AI 추천 ({groupedMethods.recommended.length})
              </div>
              <div className="grid gap-2">
                {groupedMethods.recommended.map((method) => {
                  const index = methodIndexMap.get(method.id) ?? 0
                  const requirements = dataProfile
                    ? checkMethodRequirements(method, dataProfile)
                    : { canUse: true, warnings: [] }

                  return (
                    <div key={method.id} data-index={index}>
                      <MethodItem
                        method={method}
                        isSelected={selectedMethod?.id === method.id}
                        isFocused={focusedIndex === index}
                        isRecommended={true}
                        requirements={requirements}
                        dataProfile={dataProfile}
                        assumptionResults={assumptionResults}
                        onSelect={() => onMethodSelect(method)}
                        onToggleExpand={() =>
                          setExpandedMethod(expandedMethod === method.id ? null : method.id)
                        }
                        isExpanded={expandedMethod === method.id}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 기타 방법 그룹 */}
          {groupedMethods.others.length > 0 && (
            <div className="space-y-2">
              {groupedMethods.recommended.length > 0 && (
                <div className="text-xs font-medium text-muted-foreground sticky top-0 bg-background/95 backdrop-blur py-1">
                  기타 방법 ({groupedMethods.others.length})
                </div>
              )}
              <div className="grid gap-2">
                {groupedMethods.others.map((method) => {
                  const index = methodIndexMap.get(method.id) ?? 0
                  const requirements = dataProfile
                    ? checkMethodRequirements(method, dataProfile)
                    : { canUse: true, warnings: [] }

                  return (
                    <div key={method.id} data-index={index}>
                      <MethodItem
                        method={method}
                        isSelected={selectedMethod?.id === method.id}
                        isFocused={focusedIndex === index}
                        isRecommended={false}
                        requirements={requirements}
                        dataProfile={dataProfile}
                        assumptionResults={assumptionResults}
                        onSelect={() => onMethodSelect(method)}
                        onToggleExpand={() =>
                          setExpandedMethod(expandedMethod === method.id ? null : method.id)
                        }
                        isExpanded={expandedMethod === method.id}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 검색 결과 없음 */}
          {filteredMethods.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">"{searchQuery}"에 해당하는 방법이 없습니다</p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-primary hover:underline mt-2"
              >
                검색 초기화
              </button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
