'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import type { AnalysisResult } from '@/types/analysis'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'
import type { DraftContext } from '@/lib/services/paper-draft/paper-types'
import { LangToggle } from '@/components/common/LangToggle'

interface DraftContextEditorProps {
  analysisResult: AnalysisResult
  variableMapping: VariableMapping | null
  /** 재진입 시 이전 컨텍스트로 프리필 */
  initialContext?: DraftContext
  onConfirm: (context: DraftContext, options: { language: 'ko' | 'en'; postHocDisplay: 'significant-only' | 'all' }) => void
  onCancel: () => void
}

// ── 유틸 ──────────────────────────────────────────────────────

/** variableMapping에서 실제 컬럼명 추출 (그룹코드 아님) */
function detectColumnsFromMapping(mapping: VariableMapping | null): string[] {
  if (!mapping) return []
  const cols = new Set<string>()
  const add = (v: string | string[] | undefined) => {
    if (!v) return
    if (Array.isArray(v)) v.forEach((c) => { if (c) cols.add(c) })
    else cols.add(v)
  }
  add(mapping.dependentVar)
  add(mapping.independentVar)
  add(mapping.variables)
  add(mapping.covariate)
  add(mapping.within)
  add(mapping.between)
  add(mapping.groupVar)  // 그룹 컬럼명 ('sex', 'group' 등) — 그룹값('M','F')과 다름
  add(mapping.timeVar)
  return Array.from(cols)
}

/** groupStats.name 에서 집단 코드 추출 ('M', 'F', '실험군' 등) */
function detectGroupKeys(result: AnalysisResult): string[] {
  return (result.groupStats ?? []).map((g) => g.name ?? '').filter(Boolean)
}

/** variableMapping에서 종속변수 컬럼명 조회 */
function getDependentVarCol(mapping: VariableMapping | null): string | undefined {
  if (!mapping?.dependentVar) return undefined
  return Array.isArray(mapping.dependentVar)
    ? mapping.dependentVar[0]
    : mapping.dependentVar
}

/** 한글 포함 여부 */
function hasKorean(s: string): boolean {
  return /[\uAC00-\uD7A3]/.test(s)
}

// ── 컴포넌트 ──────────────────────────────────────────────────

const FOLD_THRESHOLD = 4

export function DraftContextEditor({
  analysisResult,
  variableMapping,
  initialContext,
  onConfirm,
  onCancel,
}: DraftContextEditorProps) {
  const cols = useMemo(() => detectColumnsFromMapping(variableMapping), [variableMapping])
  const groupKeys = useMemo(() => detectGroupKeys(analysisResult), [analysisResult])
  const depVarCol = useMemo(() => getDependentVarCol(variableMapping), [variableMapping])
  const hasGroups = groupKeys.length > 0
  const hasPostHoc = (analysisResult.postHoc ?? []).length > 0

  // 언어 (최상단 — 입력 전에 결정)
  const [language, setLanguage] = useState<'ko' | 'en'>('ko')

  // 변수 표시명 (컬럼명 → 사람이 읽는 이름)
  const [variableLabels, setVariableLabels] = useState<Record<string, string>>(
    () => initialContext?.variableLabels ?? Object.fromEntries(cols.map((c) => [c, c]))
  )
  // 단위 (컬럼명 → 단위)
  const [variableUnits, setVariableUnits] = useState<Record<string, string>>(
    () => initialContext?.variableUnits ?? {}
  )
  // 집단명 (그룹코드 → 표시명)
  const [groupLabels, setGroupLabels] = useState<Record<string, string>>(
    () => initialContext?.groupLabels ?? Object.fromEntries(groupKeys.map((k) => [k, k]))
  )
  // 연구 맥락
  const [researchContext, setResearchContext] = useState(
    initialContext?.researchContext ?? ''
  )
  // 사후검정 옵션
  const [postHocDisplay, setPostHocDisplay] = useState<'significant-only' | 'all'>('significant-only')

  // 접기/펼치기
  const totalFields = cols.length + groupKeys.length
  const showFold = totalFields >= FOLD_THRESHOLD && cols.length > 1
  const [extraExpanded, setExtraExpanded] = useState(!showFold)

  // 핵심 컬럼 = 종속변수 컬럼 우선, 없으면 첫 번째
  const primaryColKey = depVarCol ?? cols[0]
  const primaryCols = primaryColKey ? [primaryColKey] : []
  const extraCols = cols.filter((c) => c !== primaryColKey)

  // 영문 + 한글 값 경고
  const hasKoreanInLabels =
    language === 'en' &&
    (Object.values(variableLabels).some(hasKorean) ||
      Object.values(groupLabels).some(hasKorean) ||
      hasKorean(researchContext))

  const handleConfirm = useCallback(() => {
    // dependentVariable = 종속변수 컬럼의 현재 표시명
    const dependentVariable = depVarCol ? (variableLabels[depVarCol] || depVarCol) : undefined
    const context: DraftContext = {
      variableLabels,
      variableUnits,
      groupLabels,
      dependentVariable,
      researchContext: researchContext.trim() || undefined,
    }
    onConfirm(context, { language, postHocDisplay })
  }, [variableLabels, variableUnits, groupLabels, researchContext, language, postHocDisplay, depVarCol, onConfirm])

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="max-w-lg w-full p-0">

        {/* 헤더 + 언어 토글 (최상단) */}
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-base font-semibold leading-none">
              논문 초안 생성 — 정보 확인
            </DialogTitle>
            <LangToggle value={language} onChange={setLanguage} />
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[68vh]">
          <div className="px-6 py-4 space-y-5">

            {/* 영문 + 한글 경고 — 언어 토글 바로 아래 */}
            {hasKoreanInLabels && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  영문 초안을 선택하셨지만 아래 변수명·집단명에 한글이 포함되어 있습니다.
                  영문 표기로 수정 후 생성하세요.
                </span>
              </div>
            )}

            {/* 변수 정보 (표시명 + 단위 통합, 컬럼별 1행) */}
            {cols.length > 0 && (
              <section>
                <SectionLabel>변수 정보</SectionLabel>
                <div className="space-y-1.5">
                  <VariableHeaderRow />
                  {cols.map((col) => {
                    const isExtra = col !== primaryColKey
                    if (isExtra && showFold && !extraExpanded) return null
                    return (
                      <VariableUnitRow
                        key={col}
                        colKey={col}
                        label={variableLabels[col] ?? col}
                        unit={variableUnits[col] ?? ''}
                        onLabelChange={(v) => setVariableLabels((p) => ({ ...p, [col]: v }))}
                        onUnitChange={(v) => setVariableUnits((p) => ({ ...p, [col]: v }))}
                      />
                    )
                  })}
                </div>

                {showFold && extraCols.length > 0 && (
                  <button
                    type="button"
                    className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setExtraExpanded((v) => !v)}
                  >
                    {extraExpanded
                      ? <><ChevronUp className="h-3 w-3" />접기</>
                      : <><ChevronDown className="h-3 w-3" />추가 변수 설정 ({extraCols.length}개)</>
                    }
                  </button>
                )}
              </section>
            )}

            {/* 집단명 */}
            {hasGroups && (
              <section>
                <SectionLabel>집단명</SectionLabel>
                <div className="space-y-1.5">
                  {groupKeys.map((key) => (
                    <SimpleRow
                      key={key}
                      colKey={key}
                      value={groupLabels[key] ?? key}
                      onChange={(v) => setGroupLabels((p) => ({ ...p, [key]: v }))}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 연구 맥락 */}
            <section>
              <Label
                htmlFor="research-context"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
              >
                연구 맥락{' '}
                <span className="normal-case font-normal text-muted-foreground/70">(선택)</span>
              </Label>
              <Textarea
                id="research-context"
                className="mt-2 resize-none text-sm"
                rows={2}
                placeholder="예: 양식 어류의 성별에 따른 성장 차이 비교"
                value={researchContext}
                onChange={(e) => setResearchContext(e.target.value)}
              />
            </section>

            {/* 사후검정 옵션 */}
            {hasPostHoc && (
              <section>
                <SectionLabel>사후검정 표시</SectionLabel>
                <RadioGroup
                  value={postHocDisplay}
                  onValueChange={(v) => setPostHocDisplay(v as 'significant-only' | 'all')}
                  className="flex gap-4"
                >
                  <RadioItem value="significant-only" id="posthoc-sig" label="유의한 쌍만" />
                  <RadioItem value="all" id="posthoc-all" label="전체" />
                </RadioGroup>
              </section>
            )}

          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t gap-2">
          <Button variant="outline" onClick={onCancel}>취소</Button>
          <Button onClick={handleConfirm}>생성하기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── 내부 서브 컴포넌트 ─────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  )
}

function VariableHeaderRow() {
  return (
    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 pb-0.5">
      <span className="w-24 shrink-0">컬럼</span>
      <span className="w-3 shrink-0" />
      <span className="flex-1">표시명</span>
      <span className="w-20 shrink-0">단위</span>
    </div>
  )
}

interface VariableUnitRowProps {
  colKey: string
  label: string
  unit: string
  onLabelChange: (v: string) => void
  onUnitChange: (v: string) => void
}

function VariableUnitRow({ colKey, label, unit, onLabelChange, onUnitChange }: VariableUnitRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 truncate font-mono text-xs text-muted-foreground" title={colKey}>
        {colKey}
      </span>
      <span className="text-muted-foreground/50 text-xs shrink-0">→</span>
      <Input
        className="h-7 text-sm flex-1 min-w-0"
        value={label}
        placeholder="표시명"
        onChange={(e) => onLabelChange(e.target.value)}
      />
      <Input
        className="h-7 text-sm w-20 shrink-0"
        value={unit}
        placeholder="단위"
        onChange={(e) => onUnitChange(e.target.value)}
      />
    </div>
  )
}

interface SimpleRowProps {
  colKey: string
  value: string
  onChange: (v: string) => void
}

function SimpleRow({ colKey, value, onChange }: SimpleRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 truncate font-mono text-xs text-muted-foreground" title={colKey}>
        {colKey}
      </span>
      <span className="text-muted-foreground/50 text-xs shrink-0">→</span>
      <Input
        className="h-7 text-sm flex-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

interface RadioItemProps {
  value: string
  id: string
  label: string
}

function RadioItem({ value, id, label }: RadioItemProps) {
  return (
    <div className="flex items-center gap-1.5">
      <RadioGroupItem value={value} id={id} />
      <Label htmlFor={id} className="text-sm cursor-pointer">{label}</Label>
    </div>
  )
}

