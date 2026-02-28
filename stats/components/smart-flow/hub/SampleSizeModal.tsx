'use client'

/**
 * SampleSizeModal — 표본 크기 계산기
 *
 * 6가지 통계 검정의 사전 표본 수 계산.
 * 순수 TS 수식 (Pyodide 불필요) — 입력 변경 시 실시간 계산.
 * G*Power 대비 정확도 ±5% 이내.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  calcTwoSample,
  calcPaired,
  calcOneSample,
  calcAnova,
  calcTwoProportions,
  calcCorrelation,
  type SampleSizeResult,
} from '@/lib/sample-size/calculator'

// ─── Types ─────────────────────────────────────────────────────────────────

type TestType =
  | 'two-sample'
  | 'paired'
  | 'one-sample'
  | 'anova'
  | 'proportions'
  | 'correlation'

export interface SampleSizeModalProps {
  open: boolean
  onClose: () => void
}

// ─── Preset constants ──────────────────────────────────────────────────────

const ALPHA_PRESETS = [
  { label: '0.05', value: 0.05 },
  { label: '0.01', value: 0.01 },
]

const POWER_PRESETS = [
  { label: '0.80', value: 0.80 },
  { label: '0.90', value: 0.90 },
  { label: '0.95', value: 0.95 },
]

const COHEN_D_PRESETS = [
  { label: '소 0.2', value: 0.2 },
  { label: '중 0.5', value: 0.5 },
  { label: '대 0.8', value: 0.8 },
]

const COHEN_F_PRESETS = [
  { label: '소 0.10', value: 0.10 },
  { label: '중 0.25', value: 0.25 },
  { label: '대 0.40', value: 0.40 },
]

const PEARSON_R_PRESETS = [
  { label: '소 0.10', value: 0.10 },
  { label: '중 0.30', value: 0.30 },
  { label: '대 0.50', value: 0.50 },
]

// ─── Sub-components ─────────────────────────────────────────────────────────

interface FieldLabelProps {
  label: string
  tooltip: string
}

function FieldLabel({ label, tooltip }: FieldLabelProps) {
  return (
    <div className="flex items-center gap-1 mb-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info
            className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help shrink-0"
            aria-label={`${label} 설명`}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-64 text-xs leading-relaxed">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

interface PresetRowProps {
  presets: Array<{ label: string; value: number }>
  current: string
  onSelect: (v: number) => void
}

function PresetRow({ presets, current, onSelect }: PresetRowProps) {
  const currentNum = parseFloat(current)
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {presets.map(p => (
        <button
          key={p.label}
          type="button"
          onClick={() => onSelect(p.value)}
          className={cn(
            'text-xs px-2 py-0.5 rounded-md border transition-colors',
            Math.abs(currentNum - p.value) < 1e-9
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border hover:border-foreground/40 text-muted-foreground hover:text-foreground',
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

interface ResultBadgeProps {
  result: SampleSizeResult | null
  subLabel: string
}

function ResultBadge({ result, subLabel }: ResultBadgeProps) {
  if (!result) return null

  if (result.error) {
    return (
      <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
        {result.error}
      </div>
    )
  }

  return (
    <div className="mt-4 p-4 rounded-xl border bg-primary/5 border-primary/20">
      <div className="text-xs text-muted-foreground mb-0.5">필요 표본 수</div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums text-primary">
          {result.n.toLocaleString()}
        </span>
        <span className="text-sm text-muted-foreground">{result.label}</span>
      </div>
      {subLabel && (
        <div className="text-xs text-muted-foreground mt-1">{subLabel}</div>
      )}
    </div>
  )
}

interface CommonInputsProps {
  alpha: string
  power: string
  onAlpha: (v: string) => void
  onPower: (v: string) => void
}

function CommonInputs({ alpha, power, onAlpha, onPower }: CommonInputsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <FieldLabel
          label="유의수준 α"
          tooltip="1종 오류율 — 귀무가설이 참인데 기각할 확률. 일반적으로 0.05 사용. 임상시험은 0.01도 사용."
        />
        <Input
          type="number"
          value={alpha}
          onChange={e => onAlpha(e.target.value)}
          min={0.001}
          max={0.2}
          step={0.01}
          className="h-9"
        />
        <PresetRow presets={ALPHA_PRESETS} current={alpha} onSelect={v => onAlpha(String(v))} />
      </div>
      <div>
        <FieldLabel
          label="검정력 1-β"
          tooltip="실제 효과가 존재할 때 이를 감지할 확률. 0.80이 표준 (2종 오류율 20%). 높일수록 더 많은 표본 필요."
        />
        <Input
          type="number"
          value={power}
          onChange={e => onPower(e.target.value)}
          min={0.5}
          max={0.999}
          step={0.05}
          className="h-9"
        />
        <PresetRow presets={POWER_PRESETS} current={power} onSelect={v => onPower(String(v))} />
      </div>
    </div>
  )
}

// ─── CohenDInput — 직접 입력 + 평균/SD 보조 계산 ──────────────────────────────

interface CohenDInputProps {
  value: string
  onChange: (v: string) => void
}

function CohenDInput({ value, onChange }: CohenDInputProps) {
  const [showHelper, setShowHelper] = useState(false)
  const [mean1, setMean1] = useState('')
  const [mean2, setMean2] = useState('')
  const [pooledSd, setPooledSd] = useState('')

  // 세 값이 모두 유효하면 d 자동 계산
  useEffect(() => {
    const m1 = parseFloat(mean1)
    const m2 = parseFloat(mean2)
    const s = parseFloat(pooledSd)
    if (isFinite(m1) && isFinite(m2) && isFinite(s) && s > 0) {
      onChange(Math.abs((m1 - m2) / s).toFixed(3))
    }
  }, [mean1, mean2, pooledSd, onChange])

  return (
    <div>
      <FieldLabel
        label="효과 크기 (Cohen's d)"
        tooltip="두 조건의 평균 차이 ÷ 표준편차. 선행 연구의 평균과 SD로 직접 계산하거나 예상값 없으면 중간 효과(0.5) 권장."
      />
      <Input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        min={0.01}
        step={0.1}
        className="h-9"
      />
      <PresetRow presets={COHEN_D_PRESETS} current={value} onSelect={v => onChange(String(v))} />

      {/* 평균/SD 보조 계산 토글 */}
      <button
        type="button"
        onClick={() => setShowHelper(v => !v)}
        className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
      >
        <span>{showHelper ? '▲' : '▼'}</span>
        평균/SD로 계산
      </button>

      {showHelper && (
        <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border/50 space-y-2">
          <p className="text-xs text-muted-foreground">
            평균 1, 평균 2, 공통 SD 입력 시 Cohen's d = |μ₁−μ₂|/σ 자동 계산
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs mb-1 block">평균 1 (μ₁)</Label>
              <Input
                type="number"
                value={mean1}
                onChange={e => setMean1(e.target.value)}
                placeholder="예: 10.5"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">평균 2 (μ₂)</Label>
              <Input
                type="number"
                value={mean2}
                onChange={e => setMean2(e.target.value)}
                placeholder="예: 12.0"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">공통 SD (σ)</Label>
              <Input
                type="number"
                value={pooledSd}
                onChange={e => setPooledSd(e.target.value)}
                placeholder="예: 3.0"
                min={0.001}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SampleSizeModal({ open, onClose }: SampleSizeModalProps) {
  const [testType, setTestType] = useState<TestType>('two-sample')

  // 공통 파라미터
  const [alpha, setAlpha] = useState('0.05')
  const [power, setPower] = useState('0.80')

  // 검정별 파라미터
  const [cohenD, setCohenD] = useState('0.5')
  const [cohenF, setCohenF] = useState('0.25')
  const [groups, setGroups] = useState('3')
  const [p1, setP1] = useState('0.5')
  const [p2, setP2] = useState('0.3')
  const [pearsonR, setPearsonR] = useState('0.3')

  const handleOpenChange = useCallback((v: boolean) => {
    if (!v) onClose()
  }, [onClose])

  const result = useMemo<SampleSizeResult | null>(() => {
    const a = parseFloat(alpha)
    const pw = parseFloat(power)
    if (!isFinite(a) || !isFinite(pw)) return null

    switch (testType) {
      case 'two-sample': {
        const d = parseFloat(cohenD)
        return isFinite(d) ? calcTwoSample(d, a, pw) : null
      }
      case 'paired': {
        const d = parseFloat(cohenD)
        return isFinite(d) ? calcPaired(d, a, pw) : null
      }
      case 'one-sample': {
        const d = parseFloat(cohenD)
        return isFinite(d) ? calcOneSample(d, a, pw) : null
      }
      case 'anova': {
        const f = parseFloat(cohenF)
        const k = Math.round(parseFloat(groups))
        return isFinite(f) && isFinite(k) ? calcAnova(f, a, pw, k) : null
      }
      case 'proportions': {
        const pv1 = parseFloat(p1)
        const pv2 = parseFloat(p2)
        return isFinite(pv1) && isFinite(pv2) ? calcTwoProportions(pv1, pv2, a, pw) : null
      }
      case 'correlation': {
        const r = parseFloat(pearsonR)
        return isFinite(r) ? calcCorrelation(r, a, pw) : null
      }
    }
  }, [testType, alpha, power, cohenD, cohenF, groups, p1, p2, pearsonR])

  const subLabel = useMemo(() => {
    if (!result || result.error) return ''
    const k = Math.round(parseFloat(groups))
    switch (testType) {
      case 'two-sample':
      case 'proportions':
        return `총 N = ${(result.n * 2).toLocaleString()}명`
      case 'anova':
        return isFinite(k)
          ? `총 N = ${(result.n * k).toLocaleString()}명 (${k}그룹 × ${result.n})`
          : ''
      default:
        return ''
    }
  }, [result, testType, groups])

  // 공통 Cohen's d 입력 블록 (독립/대응/단일 t-검정 공용) — CohenDInput 컴포넌트로 위임
  const cohendBlock = (
    <CohenDInput value={cohenD} onChange={setCohenD} />
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg h-[90vh] max-h-[640px] flex flex-col overflow-hidden">
        <TooltipProvider delayDuration={200}>
          <DialogHeader className="shrink-0">
            <DialogTitle>표본 크기 계산기</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1">
          <Tabs
            value={testType}
            onValueChange={v => setTestType(v as TestType)}
            className="mt-2"
          >
            {/* 검정 유형 선택 — 3×2 그리드 */}
            <TabsList className="grid grid-cols-3 h-auto gap-1 p-1">
              <TabsTrigger value="two-sample" className="text-xs py-1.5">
                독립 t-검정
              </TabsTrigger>
              <TabsTrigger value="paired" className="text-xs py-1.5">
                대응 t-검정
              </TabsTrigger>
              <TabsTrigger value="one-sample" className="text-xs py-1.5">
                단일 t-검정
              </TabsTrigger>
              <TabsTrigger value="anova" className="text-xs py-1.5">
                일원 ANOVA
              </TabsTrigger>
              <TabsTrigger value="proportions" className="text-xs py-1.5">
                두 비율 비교
              </TabsTrigger>
              <TabsTrigger value="correlation" className="text-xs py-1.5">
                피어슨 상관
              </TabsTrigger>
            </TabsList>

            {/* ── 독립 t-검정 ── */}
            <TabsContent value="two-sample" className="mt-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                두 독립 그룹의 평균이 유의하게 다른지 검정. 예: 대조군 vs. 처리군.
              </p>
              {cohendBlock}
              <CommonInputs alpha={alpha} power={power} onAlpha={setAlpha} onPower={setPower} />
            </TabsContent>

            {/* ── 대응 t-검정 ── */}
            <TabsContent value="paired" className="mt-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                동일 대상의 처리 전/후 측정 비교 (matched pairs). 예: 투약 전/후 혈압.
              </p>
              {cohendBlock}
              <CommonInputs alpha={alpha} power={power} onAlpha={setAlpha} onPower={setPower} />
            </TabsContent>

            {/* ── 단일 t-검정 ── */}
            <TabsContent value="one-sample" className="mt-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                단일 그룹의 평균을 알려진 기준값과 비교. 예: 특정 유전자 발현 vs. 정상 기준치.
              </p>
              {cohendBlock}
              <CommonInputs alpha={alpha} power={power} onAlpha={setAlpha} onPower={setPower} />
            </TabsContent>

            {/* ── 일원 ANOVA ── */}
            <TabsContent value="anova" className="mt-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                3개 이상 그룹의 평균을 동시 비교. 예: 농도 3단계 실험군 비교.
              </p>
              <div>
                <FieldLabel
                  label="효과 크기 (Cohen's f)"
                  tooltip="그룹 간 분산(σ_m) ÷ 그룹 내 표준편차(σ). η²(에타 제곱)을 알면 f = √(η²÷(1-η²))로 변환. 소=0.10, 중=0.25, 대=0.40."
                />
                <Input
                  type="number"
                  value={cohenF}
                  onChange={e => setCohenF(e.target.value)}
                  min={0.01}
                  step={0.05}
                  className="h-9"
                />
                <PresetRow
                  presets={COHEN_F_PRESETS}
                  current={cohenF}
                  onSelect={v => setCohenF(String(v))}
                />
              </div>
              <div>
                <FieldLabel
                  label="그룹 수 (k)"
                  tooltip="비교할 그룹의 수. 최소 3 (2그룹 비교는 독립 t-검정 사용)."
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={groups}
                    onChange={e => setGroups(e.target.value)}
                    onBlur={e => {
                      const v = Math.round(parseFloat(e.target.value))
                      if (isFinite(v)) setGroups(String(Math.max(3, v)))
                    }}
                    min={3}
                    max={20}
                    step={1}
                    className="h-9 w-20"
                  />
                  <div className="flex gap-1">
                    {[3, 4, 5, 6].map(k => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setGroups(String(k))}
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-md border transition-colors',
                          Math.round(parseFloat(groups)) === k
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:border-foreground/40 text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {k}그룹
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <CommonInputs alpha={alpha} power={power} onAlpha={setAlpha} onPower={setPower} />
            </TabsContent>

            {/* ── 두 비율 비교 ── */}
            <TabsContent value="proportions" className="mt-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                두 그룹의 반응 비율 비교. 예: 대조군 생존율 30% vs. 처리군 50%.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel
                    label="비율 1 (p₁)"
                    tooltip="대조군 또는 기준 그룹의 예상 반응 비율. 예: 대조군 치료 성공률 0.30."
                  />
                  <Input
                    type="number"
                    value={p1}
                    onChange={e => setP1(e.target.value)}
                    min={0.01}
                    max={0.99}
                    step={0.05}
                    className="h-9"
                  />
                </div>
                <div>
                  <FieldLabel
                    label="비율 2 (p₂)"
                    tooltip="처리군 또는 비교 그룹의 예상 반응 비율. 예: 처리군 치료 성공률 0.50."
                  />
                  <Input
                    type="number"
                    value={p2}
                    onChange={e => setP2(e.target.value)}
                    min={0.01}
                    max={0.99}
                    step={0.05}
                    className="h-9"
                  />
                </div>
              </div>
              <CommonInputs alpha={alpha} power={power} onAlpha={setAlpha} onPower={setPower} />
            </TabsContent>

            {/* ── 피어슨 상관 ── */}
            <TabsContent value="correlation" className="mt-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                두 연속형 변수 사이의 상관관계 검출. 예: 체중 vs. 혈당 상관.
              </p>
              <div>
                <FieldLabel
                  label="예측 상관계수 (r)"
                  tooltip="검출하려는 최소 상관계수 크기. 선행 연구나 파일럿 데이터에서 추정. 소=0.10, 중=0.30, 대=0.50."
                />
                <Input
                  type="number"
                  value={pearsonR}
                  onChange={e => setPearsonR(e.target.value)}
                  min={0.01}
                  max={0.99}
                  step={0.05}
                  className="h-9"
                />
                <PresetRow
                  presets={PEARSON_R_PRESETS}
                  current={pearsonR}
                  onSelect={v => setPearsonR(String(v))}
                />
              </div>
              <CommonInputs alpha={alpha} power={power} onAlpha={setAlpha} onPower={setPower} />
            </TabsContent>
          </Tabs>

          {/* 결과 */}
          <ResultBadge result={result} subLabel={subLabel} />

          <p className="text-[11px] text-muted-foreground/50 mt-2">
            정규 근사 기반 계산 (G*Power 대비 ±5%). 중요한 연구는 G*Power로 재확인 권장.
          </p>
          </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  )
}
