/**
 * 논문 초안 템플릿 엔진 (한글 / 영문 stub)
 *
 * 카테고리별 기본 + 메서드별 override 구조:
 *   METHOD_OVERRIDES[methodId] ?? CATEGORY_TEMPLATES[category] ?? GENERIC_TEMPLATE
 *
 * APA 이탤릭 규칙: *t*, *p*, *F*, *M*, *SD*, *n*, *W*, *r*, *d*
 * (마크다운 이탤릭 — UI/DOCX 렌더 시 변환)
 */

import type { AnalysisResult, EffectSizeInfo } from '@/types/analysis'
import type { DraftContext, FlatAssumption, CaptionItem, PaperDraftOptions } from './paper-types'
import { getMethodDisplayName } from './terminology-utils'

// ─── 포맷 헬퍼 ──────────────────────────────────────────────────────────────

/** APA p값 포맷: p < .001이면 "< .001", 그 이상은 "= .xxx" */
export function fmtP(p: number): string {
  if (p < 0.001) return '< .001'
  // 소수점 3자리, 앞의 0 제거
  return `= ${p.toFixed(3).replace(/^0\./, '.')}`
}

/** 소수점 2자리 포맷 */
export function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null || !isFinite(n)) return '—'
  return n.toFixed(2)
}

/** 자유도 포맷: 단일 숫자 또는 [df1, df2] */
function fmtDf(df: number | [number, number] | undefined): string {
  if (df === undefined || df === null) return ''
  if (Array.isArray(df)) return `${df[0]}, ${df[1]}`
  return String(df)
}

/** 효과크기 숫자값 추출 */
function esValue(es: number | EffectSizeInfo | undefined | null): number | undefined {
  if (es === undefined || es === null) return undefined
  if (typeof es === 'number') return es
  return es.value
}

/** 효과크기 타입 레이블 추출 */
function esLabel(
  es: number | EffectSizeInfo | undefined | null,
  defaultLabel: string
): string {
  if (es && typeof es === 'object' && 'type' in es) {
    // "Cohen's d" → "Cohen's *d*", "Cramér's V" → "Cramér's *V*"
    return es.type.replace(/\b([drgfV]|eta|omega)\b/g, '*$1*')
  }
  return defaultLabel
}

/** DraftContext에서 그룹/변수 표시명 조회 */
function label(name: string | undefined, ctx: DraftContext): string {
  if (!name) return ''
  return ctx.groupLabels[name] ?? ctx.variableLabels[name] ?? name
}

/** DraftContext에서 단위 문자열 조회 (있으면 " (cm)" 형태) */
function unitStr(col: string, ctx: DraftContext): string {
  const u = ctx.variableUnits[col]
  return u ? ` (${u})` : ''
}

/** 종속변수 컬럼키 → 단위 역조회 (variableLabels 역방향) */
function depUnit(ctx: DraftContext): string {
  if (!ctx.dependentVariable) return ''
  const col = Object.entries(ctx.variableLabels).find(
    ([, v]) => v === ctx.dependentVariable
  )?.[0]
  return col ? unitStr(col, ctx) : ''
}

/** 정규성 가정 텍스트 생성 (Methods용) */
function buildNormalityText(normTests: FlatAssumption[], lang: 'ko' | 'en'): string {
  if (!normTests.length) return ''
  const testName = normTests[0].testName  // 'Shapiro-Wilk' 등

  if (lang === 'en') {
    const parts = normTests.map(a => {
      const base = a.statistic !== undefined ? `*W* = ${fmt(a.statistic)}` : ''
      const p = a.pValue !== undefined ? `, *p* ${fmtP(a.pValue)}` : ''
      const grp = a.group ? ` [${a.group}]` : ''
      return `${base}${p}${grp}`.trim()
    })
    return `Normality was assessed using the ${testName} test (${parts.join('; ')}).`
  }

  const parts = normTests.map(a => {
    const base = a.statistic !== undefined ? `*W* = ${fmt(a.statistic)}` : ''
    const p = a.pValue !== undefined ? `, *p* ${fmtP(a.pValue)}` : ''
    const grp = a.group ? `[${a.group}] ` : ''
    return `${grp}${base}${p}`.trim()
  })
  return `${testName} 검정으로 정규성을 확인하였다(${parts.join('; ')}).`
}

/** 등분산 가정 텍스트 생성 (Methods용) */
function buildHomogeneityText(homoTests: FlatAssumption[], lang: 'ko' | 'en'): string {
  if (!homoTests.length) return ''
  const a = homoTests[0]
  const statPart = a.statistic !== undefined ? `*F* = ${fmt(a.statistic)}` : ''
  const pPart = a.pValue !== undefined ? `, *p* ${fmtP(a.pValue)}` : ''

  if (lang === 'en') {
    return `Homogeneity of variance was examined using ${a.testName}'s test (${statPart}${pPart}).`
  }
  return `${a.testName} 검정으로 등분산성을 확인하였다(${statPart}${pPart}).`
}

/** 구형성 가정 텍스트 생성 (Methods용) */
function buildSphericityText(spherTests: FlatAssumption[], lang: 'ko' | 'en'): string {
  if (!spherTests.length) return ''
  const a = spherTests[0]
  const statPart = a.statistic !== undefined ? `*W* = ${fmt(a.statistic)}` : ''
  const pPart = a.pValue !== undefined ? `, *p* ${fmtP(a.pValue)}` : ''

  if (lang === 'en') {
    return `Sphericity was tested using Mauchly's test (${statPart}${pPart}).`
  }
  return `Mauchly 검정으로 구형성을 확인하였다(${statPart}${pPart}).`
}

/** alpha + 소프트웨어 인용 문구 */
function buildAlphaSoftware(alpha: number, lang: 'ko' | 'en'): string {
  if (lang === 'en') {
    return `The significance level was set at α = ${alpha}. All analyses were performed using BioHub (SciPy-based).`
  }
  return `유의수준은 α = ${alpha}로 설정하였다. 통계 분석은 BioHub(SciPy 기반)를 사용하여 수행하였다.`
}

/** 집단별 기술통계 문장 (t-test, nonparametric용) */
function buildGroupStatsText(
  r: AnalysisResult,
  ctx: DraftContext,
  lang: 'ko' | 'en',
  nonparametric = false
): string {
  const gs = r.groupStats ?? []
  if (gs.length < 2) return ''
  const unit = depUnit(ctx)

  if (nonparametric) {
    if (lang === 'en') {
      return gs
        .map(g => `${label(g.name, ctx)} (*Mdn* = ${fmt(g.median ?? g.mean)}${unit}, *n* = ${g.n})`)
        .join(', ')
    }
    return gs
      .map(g => `${label(g.name, ctx)}(*Mdn* = ${fmt(g.median ?? g.mean)}${unit}, *n* = ${g.n})`)
      .join(', ')
  }

  if (lang === 'en') {
    return gs
      .map(g => `${label(g.name, ctx)} (*M* = ${fmt(g.mean)}${unit}, *SD* = ${fmt(g.std)}, *n* = ${g.n})`)
      .join(', ')
  }
  return gs
    .map(g => `${label(g.name, ctx)}(*M* = ${fmt(g.mean)}${unit}, *SD* = ${fmt(g.std)}, *n* = ${g.n})`)
    .join(', ')
}

/** 신뢰구간 문장 */
function buildCIText(r: AnalysisResult, lang: 'ko' | 'en'): string {
  if (!r.confidence) return ''
  const level = ((r.confidence.level ?? 0.95) * 100).toFixed(0)
  const ci = `[${fmt(r.confidence.lower)}, ${fmt(r.confidence.upper)}]`

  if (lang === 'en') return ` The ${level}% CI for the mean difference was ${ci}.`
  return ` 평균 차이의 ${level}% 신뢰구간은 ${ci}이었다.`
}

/** 사후검정 결과 문장 (ANOVA용) */
function buildPostHocText(
  r: AnalysisResult,
  ctx: DraftContext,
  lang: 'ko' | 'en',
  mode: 'significant-only' | 'all' = 'significant-only'
): string {
  const ph = r.postHoc
  if (!ph?.length) return ''
  const method = r.postHocMethod ?? '사후검정'
  const pairs = mode === 'significant-only' ? ph.filter(p => p.significant) : ph

  if (!pairs.length) return ''

  const pairTexts = pairs.map(p => {
    const g1 = label(String(p.group1), ctx)
    const g2 = label(String(p.group2), ctx)
    const pv = p.pvalueAdjusted ?? p.pvalue
    return `${g1}–${g2}(*p* ${fmtP(pv)})`
  })

  if (lang === 'en') {
    return ` Post hoc comparisons using ${method} indicated significant differences between: ${pairTexts.join(', ')}.`
  }
  return ` ${method} 사후검정 결과, 다음 집단 간에 유의한 차이가 있었다: ${pairTexts.join(', ')}.`
}

/** 그림 캡션 빌더 (vizType별) */
function buildFigureCaption(
  vizType: string,
  r: AnalysisResult,
  ctx: DraftContext,
  lang: 'ko' | 'en'
): string {
  const depVar = ctx.dependentVariable ?? ''
  const unit = depUnit(ctx)

  const descriptions: Record<string, { ko: string; en: string }> = {
    boxplot: {
      ko: `성별에 따른 ${depVar}${unit} 분포. 상자는 사분위 범위, 가운데 선은 중앙값, 수염은 1.5×IQR 범위를 나타낸다.`,
      en: `Distribution of ${depVar}${unit} by group. Box represents IQR, center line is median, whiskers extend to 1.5×IQR.`,
    },
    scatter: {
      ko: `변수 간 산점도. 각 점은 관측치, 실선은 회귀직선을 나타낸다.`,
      en: `Scatterplot of variables. Each dot represents an observation; solid line indicates the regression line.`,
    },
    bar: {
      ko: `집단별 ${depVar}${unit} 평균. 오차막대는 표준오차를 나타낸다.`,
      en: `Mean ${depVar}${unit} by group. Error bars represent standard error.`,
    },
    histogram: {
      ko: `${depVar}${unit} 분포 히스토그램. 막대는 빈도를 나타낸다.`,
      en: `Histogram of ${depVar}${unit}. Bars represent frequency counts.`,
    },
    line: {
      ko: `시계열 추이. 선은 관측값의 시간적 변화를 나타낸다.`,
      en: `Time series plot. Line represents observed values over time.`,
    },
    heatmap: {
      ko: `상관계수 히트맵. 색상은 Pearson *r* 값의 크기를 나타낸다.`,
      en: `Correlation heatmap. Color intensity represents the magnitude of Pearson *r*.`,
    },
    'pca-biplot': {
      ko: `주성분 분석 바이플롯. 화살표는 주성분 적재량을 나타낸다.`,
      en: `PCA biplot. Arrows represent principal component loadings.`,
    },
    'roc-curve': {
      ko: `ROC 곡선. 점선은 무정보 모형(AUC = 0.5)을 나타낸다.`,
      en: `ROC curve. Dashed line indicates the no-information model (AUC = 0.5).`,
    },
    survival: {
      ko: `Kaplan-Meier 생존 곡선. 계단 함수는 생존률 추정값, 십자 표시는 중도절단을 나타낸다.`,
      en: `Kaplan-Meier survival curve. Step function shows estimated survival probability; crosses indicate censored observations.`,
    },
  }

  const desc = descriptions[vizType] ?? {
    ko: `분석 결과 그래프.`,
    en: `Analysis result chart.`,
  }
  return lang === 'ko' ? desc.ko : desc.en
}

// ─── 템플릿 입력 타입 ────────────────────────────────────────────────────────

export interface TemplateInput {
  r: AnalysisResult
  assumptions: FlatAssumption[]
  ctx: DraftContext
  lang: 'ko' | 'en'
  methodId: string
  options: PaperDraftOptions
}

/** 카테고리 템플릿 인터페이스 */
export interface CategoryTemplate {
  methods: (input: TemplateInput) => string
  results: (input: TemplateInput) => string
  captions: (input: TemplateInput) => CaptionItem[]
}

// ─── 공통 캡션 빌더 ──────────────────────────────────────────────────────────

function buildCaptions(input: TemplateInput, tableText = ''): CaptionItem[] {
  const { r, ctx, lang } = input
  const items: CaptionItem[] = []
  const depVar = ctx.dependentVariable ?? ''
  const unit = depUnit(ctx)

  if (tableText) {
    items.push({ kind: 'table', label: 'Table 1', text: tableText })
  } else if (r.groupStats?.length) {
    const txt = lang === 'ko'
      ? `집단별 ${depVar}${unit}의 기술통계량. 값은 평균 ± 표준편차로 표시하였다.`
      : `Descriptive statistics of ${depVar}${unit} by group. Values are presented as mean ± SD.`
    items.push({ kind: 'table', label: 'Table 1', text: txt })
  }

  const vizType = r.visualizationData?.type
  if (vizType) {
    items.push({
      kind: 'figure',
      label: 'Figure 1',
      text: buildFigureCaption(vizType, r, ctx, lang),
    })
  }

  return items
}

// ─── GENERIC 템플릿 (fallback) ───────────────────────────────────────────────

const GENERIC_TEMPLATE: CategoryTemplate = {
  methods({ r, assumptions, ctx, lang, methodId }) {
    if (lang === 'en') return 'English template coming soon.'
    const methodName = getMethodDisplayName(methodId, 'ko')
    const alpha = r.additional?.alpha ?? 0.05
    const normTests = assumptions.filter(a => a.category === 'normality')
    const homoTests = assumptions.filter(a => a.category === 'homogeneity')

    const intro = ctx.researchContext
      ? `${ctx.researchContext}를 위해 ${methodName}을(를) 실시하였다.`
      : `${ctx.dependentVariable ?? '종속변수'}의 분석을 위해 ${methodName}을(를) 실시하였다.`

    const parts = [intro]
    if (normTests.length) parts.push(buildNormalityText(normTests, lang))
    if (homoTests.length) parts.push(buildHomogeneityText(homoTests, lang))
    parts.push(buildAlphaSoftware(alpha, lang))
    return parts.filter(Boolean).join(' ')
  },

  results({ r, ctx, lang, methodId }) {
    if (lang === 'en') return 'English template coming soon.'
    const methodName = getMethodDisplayName(methodId, 'ko')
    const alpha = r.additional?.alpha ?? 0.05
    const significant = r.pValue < alpha
    const df = fmtDf(r.df)
    const dfStr = df ? `(${df})` : ''

    let text = `${methodName} 결과, 통계적으로 유의한 차이가 ${significant ? '있었다' : '없었다'} `
    text += `(통계량${dfStr} = ${fmt(r.statistic)}, *p* ${fmtP(r.pValue)}).`
    return text
  },

  captions(input) {
    return buildCaptions(input, '')
  },
}

// ─── T-TEST 템플릿 ───────────────────────────────────────────────────────────

const T_TEST_TEMPLATE: CategoryTemplate = {
  methods({ r, assumptions, ctx, lang, methodId }) {
    if (lang === 'en') return 'English template coming soon.'
    const methodName = getMethodDisplayName(methodId, 'ko')
    const alpha = r.additional?.alpha ?? 0.05
    const normTests = assumptions.filter(a => a.category === 'normality')
    const homoTests = assumptions.filter(a => a.category === 'homogeneity')

    const depVar = ctx.dependentVariable ?? '종속변수'
    const intro = ctx.researchContext
      ? `${ctx.researchContext}를 위해 ${methodName}을 실시하였다.`
      : `두 집단 간 ${depVar} 차이를 검증하기 위해 ${methodName}을 실시하였다.`

    const parts = [`분석에 앞서`]
    if (normTests.length) parts.push(buildNormalityText(normTests, lang))
    if (homoTests.length) parts.push(buildHomogeneityText(homoTests, lang))
    if (normTests.length || homoTests.length) {
      const allPassed = [...normTests, ...homoTests].every(a => a.passed)
      parts.push(allPassed
        ? '모든 가정이 충족되었다.'
        : '일부 가정이 충족되지 않았으나 분석을 진행하였다.')
    }

    return [intro, parts.join(' '), buildAlphaSoftware(alpha, lang)].join(' ')
  },

  results({ r, ctx, lang, options }) {
    if (lang === 'en') return 'English template coming soon.'
    const alpha = r.additional?.alpha ?? 0.05
    const significant = r.pValue < alpha
    const df = fmtDf(r.df)
    const es = esValue(r.effectSize)
    const esLbl = esLabel(r.effectSize, "Cohen's *d*")

    const depVar = ctx.dependentVariable ?? '종속변수'
    const gs = r.groupStats ?? []
    const g1 = gs[0]
    const g2 = gs[1]
    const g1Name = label(g1?.name, ctx) || '집단 1'
    const g2Name = label(g2?.name, ctx) || '집단 2'

    let text = `독립표본 t-검정 결과, ${g1Name}과 ${g2Name} 간 ${depVar}에 `
    text += `통계적으로 유의한 차이가 ${significant ? '있었다' : '없었다'} `
    text += `(*t*(${df}) = ${fmt(r.statistic)}, *p* ${fmtP(r.pValue)}`
    if (es !== undefined) text += `, ${esLbl} = ${fmt(es)}`
    text += ').'

    if (gs.length >= 2 && g1 && g2) {
      const unit = depUnit(ctx)
      text += ` ${g1Name}(*M* = ${fmt(g1.mean)}${unit}, *SD* = ${fmt(g1.std)}, *n* = ${g1.n})`
      text += significant ? '이' : '과'
      text += ` ${g2Name}(*M* = ${fmt(g2.mean)}${unit}, *SD* = ${fmt(g2.std)}, *n* = ${g2.n})보다`
      text += significant ? ' 유의하게 높았다.' : ' 차이가 없었다.'
    }

    text += buildCIText(r, lang)
    return text
  },

  captions(input) {
    return buildCaptions(input, '')
  },
}

// ─── ONE-SAMPLE T-TEST override ───────────────────────────────────────────────

const ONE_SAMPLE_T_TEMPLATE: CategoryTemplate = {
  methods({ r, assumptions, ctx, lang }) {
    if (lang === 'en') return 'English template coming soon.'
    const alpha = r.additional?.alpha ?? 0.05
    const normTests = assumptions.filter(a => a.category === 'normality')
    const depVar = ctx.dependentVariable ?? '변수'
    const testValue = r.additional?.testValue ?? r.additional?.mu ?? 0

    const intro = `단일표본 t-검정을 실시하여 ${depVar}의 평균이 ${testValue}과 차이가 있는지 검증하였다.`
    const parts = [intro]
    if (normTests.length) parts.push(`분석에 앞서 ${buildNormalityText(normTests, lang)}`)
    parts.push(buildAlphaSoftware(alpha, lang))
    return parts.filter(Boolean).join(' ')
  },

  results({ r, ctx, lang }) {
    if (lang === 'en') return 'English template coming soon.'
    const alpha = r.additional?.alpha ?? 0.05
    const significant = r.pValue < alpha
    const testValue = r.additional?.testValue ?? r.additional?.mu ?? 0
    const depVar = ctx.dependentVariable ?? '변수'
    const es = esValue(r.effectSize)

    let text = `단일표본 t-검정 결과, ${depVar}의 평균은 기준값(${testValue})과 `
    text += `통계적으로 유의한 차이가 ${significant ? '있었다' : '없었다'} `
    text += `(*t*(${fmtDf(r.df)}) = ${fmt(r.statistic)}, *p* ${fmtP(r.pValue)}`
    if (es !== undefined) text += `, Cohen's *d* = ${fmt(es)}`
    text += ').'
    text += buildCIText(r, lang)
    return text
  },

  captions(input) {
    return buildCaptions(input, '')
  },
}

// ─── PAIRED T-TEST override ───────────────────────────────────────────────────

const PAIRED_T_TEMPLATE: CategoryTemplate = {
  methods({ r, assumptions, ctx, lang }) {
    if (lang === 'en') return 'English template coming soon.'
    const alpha = r.additional?.alpha ?? 0.05
    const normTests = assumptions.filter(a => a.category === 'normality')
    const depVar = ctx.dependentVariable ?? '변수'

    const intro = `반복 측정 전후 ${depVar}의 차이를 검증하기 위해 대응표본 t-검정을 실시하였다.`
    const parts = [intro]
    if (normTests.length) parts.push(`차이 점수의 정규성은 ${buildNormalityText(normTests, lang)}`)
    parts.push(buildAlphaSoftware(alpha, lang))
    return parts.filter(Boolean).join(' ')
  },

  results({ r, ctx, lang }) {
    if (lang === 'en') return 'English template coming soon.'
    const alpha = r.additional?.alpha ?? 0.05
    const significant = r.pValue < alpha
    const depVar = ctx.dependentVariable ?? '변수'
    const es = esValue(r.effectSize)
    const gs = r.groupStats ?? []

    let text = `대응표본 t-검정 결과, ${depVar}의 처치 전후 차이는 `
    text += `통계적으로 유의${significant ? '하였다' : '하지 않았다'} `
    text += `(*t*(${fmtDf(r.df)}) = ${fmt(r.statistic)}, *p* ${fmtP(r.pValue)}`
    if (es !== undefined) text += `, Cohen's *d* = ${fmt(es)}`
    text += ').'

    if (gs.length >= 2) {
      const unit = depUnit(ctx)
      const g1 = gs[0]
      const g2 = gs[1]
      text += ` 처치 전(*M* = ${fmt(g1.mean)}${unit}, *SD* = ${fmt(g1.std)})`
      text += ` 및 처치 후(*M* = ${fmt(g2.mean)}${unit}, *SD* = ${fmt(g2.std)}).`
    }

    text += buildCIText(r, lang)
    return text
  },

  captions(input) {
    return buildCaptions(input, '')
  },
}

// ─── ANOVA 템플릿 ────────────────────────────────────────────────────────────

const ANOVA_TEMPLATE: CategoryTemplate = {
  methods({ r, assumptions, ctx, lang, methodId }) {
    if (lang === 'en') return 'English template coming soon.'
    const methodName = getMethodDisplayName(methodId, 'ko')
    const alpha = r.additional?.alpha ?? 0.05
    const normTests = assumptions.filter(a => a.category === 'normality')
    const homoTests = assumptions.filter(a => a.category === 'homogeneity')
    const spherTests = assumptions.filter(a => a.category === 'sphericity')
    const depVar = ctx.dependentVariable ?? '종속변수'

    const intro = ctx.researchContext
      ? `${ctx.researchContext}를 위해 ${methodName}을 실시하였다.`
      : `집단 간 ${depVar} 차이를 검증하기 위해 ${methodName}을 실시하였다.`

    const parts = [`분석에 앞서`]
    if (normTests.length) parts.push(buildNormalityText(normTests, lang))
    if (homoTests.length) parts.push(buildHomogeneityText(homoTests, lang))
    if (spherTests.length) parts.push(buildSphericityText(spherTests, lang))
    if (r.postHocMethod) {
      parts.push(`유의한 주효과에 대해서는 ${r.postHocMethod} 방법으로 사후검정을 실시하였다.`)
    }
    parts.push(buildAlphaSoftware(alpha, lang))

    return [intro, parts.join(' ')].join(' ')
  },

  results({ r, ctx, lang, options }) {
    if (lang === 'en') return 'English template coming soon.'
    const alpha = r.additional?.alpha ?? 0.05
    const significant = r.pValue < alpha
    const df = fmtDf(r.df)
    const depVar = ctx.dependentVariable ?? '종속변수'

    // 효과크기 — ANOVA는 η² 또는 ω² (r.effectSize 우선)
    const esInput = r.effectSize ?? r.omegaSquared
    const es = esValue(esInput)
    const esLbl = esLabel(esInput, 'η²')

    let text = `분산분석 결과, ${depVar}에 대한 집단 간 차이가 `
    text += `통계적으로 유의${significant ? '하였다' : '하지 않았다'} `
    text += `(*F*(${df}) = ${fmt(r.statistic)}, *p* ${fmtP(r.pValue)}`
    if (es !== undefined) text += `, ${esLbl} = ${fmt(es)}`
    text += ').'

    // 집단별 기술통계
    const gsText = buildGroupStatsText(r, ctx, lang)
    if (gsText) text += ` ${gsText}.`

    // 사후검정
    const phMode = options.postHocDisplay ?? 'significant-only'
    text += buildPostHocText(r, ctx, lang, phMode)

    return text
  },

  captions(input) {
    return buildCaptions(input, '')
  },
}

// ─── NONPARAMETRIC 템플릿 ────────────────────────────────────────────────────

const NONPARAMETRIC_TEMPLATE: CategoryTemplate = {
  methods({ r, assumptions, ctx, lang, methodId }) {
    if (lang === 'en') return 'English template coming soon.'
    const methodName = getMethodDisplayName(methodId, 'ko')
    const alpha = r.additional?.alpha ?? 0.05
    const normTests = assumptions.filter(a => a.category === 'normality')
    const depVar = ctx.dependentVariable ?? '종속변수'

    const intro = ctx.researchContext
      ? `${ctx.researchContext}를 위해 ${methodName}을 실시하였다.`
      : `집단 간 ${depVar} 차이를 검증하기 위해 ${methodName}을 실시하였다.`

    const reason = normTests.some(a => !a.passed)
      ? '데이터가 정규분포 가정을 충족하지 않아 비모수 검정을 적용하였다.'
      : '비모수적 방법으로 집단 간 차이를 검증하였다.'

    const parts = [intro, reason]
    if (normTests.length) parts.push(buildNormalityText(normTests, lang))
    parts.push('집단 간 차이는 중앙값(Mdn)과 사분위 범위(IQR)로 기술하였다.')
    parts.push(buildAlphaSoftware(alpha, lang))
    return parts.filter(Boolean).join(' ')
  },

  results({ r, ctx, lang }) {
    if (lang === 'en') return 'English template coming soon.'
    const alpha = r.additional?.alpha ?? 0.05
    const significant = r.pValue < alpha
    const df = fmtDf(r.df)
    const dfStr = df ? `(${df})` : ''
    const depVar = ctx.dependentVariable ?? '종속변수'
    const es = esValue(r.effectSize)

    // 비모수 통계량 기호 추정 (U, H, W, Z 등 statistic 크기로 구분 불가 → method 이름 활용)
    const method = r.method?.toLowerCase() ?? ''
    const statSymbol = method.includes('mann') || method.includes('whitney') ? '*U*'
      : method.includes('kruskal') ? '*H*'
      : method.includes('wilcoxon') ? '*W*'
      : '통계량'

    let text = `${depVar}에 대한 집단 간 차이가 `
    text += `통계적으로 유의${significant ? '하였다' : '하지 않았다'} `
    text += `(${statSymbol}${dfStr} = ${fmt(r.statistic)}, *p* ${fmtP(r.pValue)}`
    if (es !== undefined) text += `, *r* = ${fmt(es)}`
    text += ').'

    // 중앙값 기반 기술통계
    const gsText = buildGroupStatsText(r, ctx, lang, true)
    if (gsText) text += ` 집단별 중앙값: ${gsText}.`

    text += buildPostHocText(r, ctx, lang)
    return text
  },

  captions(input) {
    return buildCaptions(input, '')
  },
}

// ─── CORRELATION 템플릿 ──────────────────────────────────────────────────────

const CORRELATION_TEMPLATE: CategoryTemplate = {
  methods({ r, assumptions, ctx, lang, methodId }) {
    if (lang === 'en') return 'English template coming soon.'
    const methodName = getMethodDisplayName(methodId, 'ko')
    const alpha = r.additional?.alpha ?? 0.05
    const normTests = assumptions.filter(a => a.category === 'normality')

    const varNames = Object.values(ctx.variableLabels).join('와 ')
    const intro = ctx.researchContext
      ? `${ctx.researchContext}를 위해 ${methodName}을 실시하였다.`
      : `${varNames} 간의 상관관계를 분석하기 위해 ${methodName}을 실시하였다.`

    const parts = [intro]
    if (normTests.length) parts.push(`분석에 앞서 ${buildNormalityText(normTests, lang)}`)
    parts.push(buildAlphaSoftware(alpha, lang))
    return parts.filter(Boolean).join(' ')
  },

  results({ r, ctx, lang }) {
    if (lang === 'en') return 'English template coming soon.'
    const alpha = r.additional?.alpha ?? 0.05
    const significant = r.pValue < alpha
    const es = esValue(r.effectSize) ?? r.statistic  // r 값이 statistic일 수 있음

    const strength = Math.abs(es) >= 0.7 ? '강한' : Math.abs(es) >= 0.4 ? '중간 수준의' : '약한'
    const direction = es >= 0 ? '정적' : '부적'

    let text = `상관분석 결과, 변수 간에 ${significant ? '' : '통계적으로 유의하지 않은 '}`
    text += `${direction} ${strength} 상관관계가 ${significant ? '있었다' : '확인되었다'} `
    text += `(*r* = ${fmt(es)}, *p* ${fmtP(r.pValue)}).`
    text += buildCIText(r, lang)
    return text
  },

  captions(input) {
    const { ctx, lang } = input
    const varNames = Object.values(ctx.variableLabels).join('와 ')
    const tableText = lang === 'ko'
      ? `${varNames}의 상관계수 행렬.`
      : `Correlation matrix.`
    return buildCaptions(input, tableText)
  },
}

// ─── REGRESSION 템플릿 ───────────────────────────────────────────────────────

const REGRESSION_TEMPLATE: CategoryTemplate = {
  methods({ r, assumptions, ctx, lang, methodId }) {
    if (lang === 'en') return 'English template coming soon.'
    const methodName = getMethodDisplayName(methodId, 'ko')
    const alpha = r.additional?.alpha ?? 0.05
    const normTests = assumptions.filter(a => a.category === 'normality')
    const homoTests = assumptions.filter(a => a.category === 'homogeneity')
    const indepTests = assumptions.filter(a => a.category === 'independence')
    const depVar = ctx.dependentVariable ?? '종속변수'

    const intro = ctx.researchContext
      ? `${ctx.researchContext}를 위해 ${methodName}을 실시하였다.`
      : `${depVar}에 대한 예측 모형을 구축하기 위해 ${methodName}을 실시하였다.`

    const parts = [`분석에 앞서 선형성, 잔차의 정규성 및 등분산성, 독립성 가정을 확인하였다.`]
    if (normTests.length) parts.push(buildNormalityText(normTests, lang))
    if (homoTests.length) parts.push(buildHomogeneityText(homoTests, lang))
    if (indepTests.length) {
      const d = indepTests[0]
      parts.push(`독립성은 Durbin-Watson 검정으로 확인하였다(*DW* = ${fmt(d.statistic)}).`)
    }
    parts.push(buildAlphaSoftware(alpha, lang))
    return [intro, parts.join(' ')].join(' ')
  },

  results({ r, ctx, lang }) {
    if (lang === 'en') return 'English template coming soon.'
    const alpha = r.additional?.alpha ?? 0.05
    const significant = r.pValue < alpha
    const df = fmtDf(r.df)
    const rSq = r.additional?.rSquared
    const adjRSq = r.additional?.adjustedRSquared ?? r.additional?.adjRSquared
    const depVar = ctx.dependentVariable ?? '종속변수'

    let text = `회귀분석 결과, 회귀모형은 통계적으로 유의${significant ? '하였다' : '하지 않았다'} `
    text += `(*F*(${df}) = ${fmt(r.statistic)}, *p* ${fmtP(r.pValue)}`
    if (rSq !== undefined) text += `, *R*² = ${fmt(rSq)}`
    if (adjRSq !== undefined) text += `, 수정 *R*² = ${fmt(adjRSq)}`
    text += ').'
    text += ` 모형은 ${depVar} 분산의 ${rSq !== undefined ? fmt(rSq * 100) : '—'}%를 설명하였다.`

    // 회귀계수
    if (r.coefficients?.length) {
      const sigCoefs = r.coefficients.filter(c => c.pvalue < alpha)
      if (sigCoefs.length) {
        const coefTexts = sigCoefs.map(c =>
          `${c.name}(β = ${fmt(c.value)}, *p* ${fmtP(c.pvalue)})`
        )
        text += ` 유의한 예측변수: ${coefTexts.join(', ')}.`
      }
    }

    return text
  },

  captions(input) {
    const { ctx, lang } = input
    const depVar = ctx.dependentVariable ?? '종속변수'
    const tableText = lang === 'ko'
      ? `${depVar}에 대한 회귀분석 결과. B = 비표준화 계수, SE = 표준오차, β = 표준화 계수.`
      : `Regression analysis for ${depVar}. B = unstandardized coefficient, SE = standard error, β = standardized coefficient.`
    return buildCaptions(input, tableText)
  },
}

// ─── CHI-SQUARE 템플릿 ───────────────────────────────────────────────────────

const CHI_SQUARE_TEMPLATE: CategoryTemplate = {
  methods({ r, assumptions, ctx, lang, methodId }) {
    if (lang === 'en') return 'English template coming soon.'
    const methodName = getMethodDisplayName(methodId, 'ko')
    const alpha = r.additional?.alpha ?? 0.05

    const intro = ctx.researchContext
      ? `${ctx.researchContext}를 위해 ${methodName}을 실시하였다.`
      : `범주형 변수 간의 독립성을 검증하기 위해 ${methodName}을 실시하였다.`

    const parts = [
      intro,
      `분석에 앞서 모든 셀의 기대빈도가 5 이상인지 확인하였다.`,
      buildAlphaSoftware(alpha, lang),
    ]
    return parts.join(' ')
  },

  results({ r, ctx, lang }) {
    if (lang === 'en') return 'English template coming soon.'
    const alpha = r.additional?.alpha ?? 0.05
    const significant = r.pValue < alpha
    const df = fmtDf(r.df)
    const es = esValue(r.effectSize)
    const esLbl = esLabel(r.effectSize, "Cramér's *V*")

    let text = `카이제곱 검정 결과, 변수 간의 관계가 `
    text += `통계적으로 유의${significant ? '하였다' : '하지 않았다'} `
    text += `(χ²(${df}) = ${fmt(r.statistic)}, *p* ${fmtP(r.pValue)}`
    if (es !== undefined) text += `, ${esLbl} = ${fmt(es)}`
    text += ').'
    return text
  },

  captions(input) {
    const { ctx, lang } = input
    const tableText = lang === 'ko'
      ? `변수 간 교차표. 괄호 안은 기대빈도를 나타낸다.`
      : `Contingency table. Values in parentheses indicate expected frequencies.`
    return buildCaptions(input, tableText)
  },
}

// ─── DESCRIPTIVE 템플릿 ──────────────────────────────────────────────────────

const DESCRIPTIVE_TEMPLATE: CategoryTemplate = {
  methods({ r, assumptions, ctx, lang }) {
    if (lang === 'en') return 'English template coming soon.'
    const alpha = r.additional?.alpha ?? 0.05
    const normTests = assumptions.filter(a => a.category === 'normality')
    const depVar = ctx.dependentVariable ?? '변수'

    const intro = ctx.researchContext
      ? `${ctx.researchContext}를 위해 ${depVar}의 기술통계를 산출하였다.`
      : `${depVar}의 분포 특성을 파악하기 위해 기술통계를 산출하였다.`

    const parts = [intro]
    if (normTests.length) parts.push(buildNormalityText(normTests, lang))
    parts.push(buildAlphaSoftware(alpha, lang))
    return parts.filter(Boolean).join(' ')
  },

  results({ r, ctx, lang }) {
    if (lang === 'en') return 'English template coming soon.'
    const alpha = r.additional?.alpha ?? 0.05
    const depVar = ctx.dependentVariable ?? '변수'
    const add = r.additional ?? {}

    const parts: string[] = [`${depVar}의 기술통계 결과는 다음과 같다.`]

    if (add.mean !== undefined) {
      parts.push(`평균(*M*) = ${fmt(add.mean)}, 표준편차(*SD*) = ${fmt(add.std)}.`)
    }
    if (add.median !== undefined) {
      parts.push(`중앙값(*Mdn*) = ${fmt(add.median)}, 사분위 범위(IQR) = ${fmt(add.iqr)}.`)
    }
    if (add.skewness !== undefined) {
      const normalJudge = r.pValue > alpha ? '정규분포에 가깝다' : '정규분포를 따르지 않는다'
      parts.push(`왜도 = ${fmt(add.skewness)}, 첨도 = ${fmt(add.kurtosis)}.`)
      parts.push(`Shapiro-Wilk 검정 결과, 데이터는 ${normalJudge}(*p* ${fmtP(r.pValue)}).`)
    }

    return parts.join(' ')
  },

  captions(input) {
    const { ctx, lang } = input
    const depVar = ctx.dependentVariable ?? '변수'
    const tableText = lang === 'ko'
      ? `${depVar}의 기술통계량 요약. *M* = 평균, *SD* = 표준편차, *Mdn* = 중앙값, IQR = 사분위 범위.`
      : `Descriptive statistics summary for ${depVar}. *M* = mean, *SD* = standard deviation, *Mdn* = median, IQR = interquartile range.`
    return buildCaptions(input, tableText)
  },
}

// ─── TIMESERIES 템플릿 ───────────────────────────────────────────────────────

const TIMESERIES_TEMPLATE: CategoryTemplate = {
  methods({ r, assumptions, ctx, lang, methodId }) {
    if (lang === 'en') return 'English template coming soon.'
    const methodName = getMethodDisplayName(methodId, 'ko')
    const alpha = r.additional?.alpha ?? 0.05
    const statTests = assumptions.filter(a => a.category === 'stationarity')

    const intro = ctx.researchContext
      ? `${ctx.researchContext}를 위해 ${methodName}을 실시하였다.`
      : `시계열 데이터 분석을 위해 ${methodName}을 실시하였다.`

    const parts = [intro]
    if (statTests.length) {
      const adf = statTests.find(a => a.testName === 'ADF')
      if (adf) {
        parts.push(`분석에 앞서 ADF 검정으로 정상성을 확인하였다(*ADF* = ${fmt(adf.statistic)}, *p* ${adf.pValue !== undefined ? fmtP(adf.pValue) : '—'}).`)
      }
    }
    parts.push(buildAlphaSoftware(alpha, lang))
    return parts.filter(Boolean).join(' ')
  },

  results({ r, ctx, lang }) {
    if (lang === 'en') return 'English template coming soon.'
    const aic = r.additional?.aic
    const bic = r.additional?.bic
    const model = r.additional?.model ?? r.additional?.modelType ?? ''

    let text = `시계열 분석 결과`
    if (model) text += `, ${model} 모형을 선정하였다`
    text += '.'
    if (aic !== undefined) text += ` 모형 적합 지표: AIC = ${fmt(aic)}`
    if (bic !== undefined) text += `, BIC = ${fmt(bic)}`
    if (aic !== undefined || bic !== undefined) text += '.'

    return text
  },

  captions(input) {
    return buildCaptions(input, '')
  },
}

// ─── SURVIVAL 템플릿 ─────────────────────────────────────────────────────────

const SURVIVAL_TEMPLATE: CategoryTemplate = {
  methods({ r, assumptions, ctx, lang, methodId }) {
    if (lang === 'en') return 'English template coming soon.'
    const methodName = getMethodDisplayName(methodId, 'ko')
    const alpha = r.additional?.alpha ?? 0.05
    const hazardTests = assumptions.filter(a => a.category === 'proportionalHazards')

    const intro = ctx.researchContext
      ? `${ctx.researchContext}를 위해 ${methodName}을 실시하였다.`
      : `생존 분석을 위해 ${methodName}을 실시하였다.`

    const parts = [intro]
    if (hazardTests.length) {
      parts.push(`비례위험 가정은 Schoenfeld 잔차 검정으로 확인하였다.`)
    }
    parts.push(buildAlphaSoftware(alpha, lang))
    return parts.filter(Boolean).join(' ')
  },

  results({ r, ctx, lang }) {
    if (lang === 'en') return 'English template coming soon.'
    const alpha = r.additional?.alpha ?? 0.05
    const significant = r.pValue < alpha
    const es = esValue(r.effectSize)

    let text = `생존 분석 결과, 집단 간 생존율의 차이가 `
    text += `통계적으로 유의${significant ? '하였다' : '하지 않았다'} `
    text += `(*p* ${fmtP(r.pValue)}`
    if (es !== undefined) text += `, HR = ${fmt(es)}`
    text += ').'
    text += buildCIText(r, lang)
    return text
  },

  captions(input) {
    const { ctx, lang } = input
    const tableText = lang === 'ko'
      ? `생존 분석 결과 요약. HR = 위험비, CI = 신뢰구간.`
      : `Survival analysis summary. HR = hazard ratio, CI = confidence interval.`
    return buildCaptions(input, tableText)
  },
}

// ─── MULTIVARIATE 템플릿 ─────────────────────────────────────────────────────

const MULTIVARIATE_TEMPLATE: CategoryTemplate = {
  methods({ r, assumptions, ctx, lang, methodId }) {
    if (lang === 'en') return 'English template coming soon.'
    const methodName = getMethodDisplayName(methodId, 'ko')
    const alpha = r.additional?.alpha ?? 0.05

    const intro = ctx.researchContext
      ? `${ctx.researchContext}를 위해 ${methodName}을 실시하였다.`
      : `다변량 분석을 위해 ${methodName}을 실시하였다.`

    return [intro, buildAlphaSoftware(alpha, lang)].join(' ')
  },

  results({ r, ctx, lang }) {
    if (lang === 'en') return 'English template coming soon.'
    const add = r.additional ?? {}
    const expVar = add.explainedVarianceRatio

    let text = `다변량 분석 결과`

    if (expVar?.length) {
      const cumVar = expVar.reduce((a: number, b: number) => a + b, 0)
      text += `, 추출된 성분/요인이 전체 분산의 ${fmt(cumVar * 100)}%를 설명하였다`
    }
    text += '.'

    if (add.silhouetteScore !== undefined) {
      text += ` 군집 분석의 실루엣 점수는 ${fmt(add.silhouetteScore)}이었다.`
    }

    return text
  },

  captions(input) {
    const { ctx, lang } = input
    const tableText = lang === 'ko'
      ? `성분/요인 적재량 행렬.`
      : `Component/factor loading matrix.`
    return buildCaptions(input, tableText)
  },
}

// ─── PSYCHOMETRICS (reliability) override ────────────────────────────────────

const RELIABILITY_TEMPLATE: CategoryTemplate = {
  methods({ r, ctx, lang }) {
    if (lang === 'en') return 'English template coming soon.'
    const alpha = r.additional?.alpha ?? 0.05
    const n = r.additional?.n

    const intro = ctx.researchContext
      ? `${ctx.researchContext}를 위해 Cronbach α를 산출하여 신뢰도를 분석하였다.`
      : `척도의 내적 일관성을 검증하기 위해 Cronbach α를 산출하였다.`

    const nStr = n ? ` 문항 수는 ${n}개였다.` : ''
    return [intro + nStr, buildAlphaSoftware(alpha, lang)].join(' ')
  },

  results({ r, ctx, lang }) {
    if (lang === 'en') return 'English template coming soon.'
    // Cronbach alpha 값이 statistic에 있음
    const cronbachAlpha = r.statistic
    const interp = cronbachAlpha >= 0.9 ? '우수' : cronbachAlpha >= 0.8 ? '양호' : cronbachAlpha >= 0.7 ? '수용 가능' : '불충분'

    let text = `신뢰도 분석 결과, Cronbach α = ${fmt(cronbachAlpha)}으로 내적 일관성이 ${interp}한 것으로 나타났다.`

    const itc = r.additional?.itemTotalCorrelations
    if (itc?.length) {
      const minItc = Math.min(...itc)
      const maxItc = Math.max(...itc)
      text += ` 문항-전체 상관계수는 ${fmt(minItc)}에서 ${fmt(maxItc)} 범위였다.`
    }

    return text
  },

  captions(input) {
    const { lang } = input
    const tableText = lang === 'ko'
      ? `신뢰도 분석 결과. α = 문항 삭제 시 Cronbach α, r = 문항-전체 상관계수.`
      : `Reliability analysis. α = Cronbach's alpha if item deleted, r = item-total correlation.`
    return buildCaptions(input, tableText)
  },
}

// ─── DESIGN (power-analysis) override ────────────────────────────────────────

const POWER_ANALYSIS_TEMPLATE: CategoryTemplate = {
  methods({ r, ctx, lang }) {
    if (lang === 'en') return 'English template coming soon.'
    const add = r.additional ?? {}
    const analysisType = add.analysisType === 'post-hoc' ? '사후' : '사전'

    const intro = ctx.researchContext
      ? `${ctx.researchContext}를 위해 ${analysisType} 검정력 분석을 실시하였다.`
      : `적절한 표본 크기를 결정하기 위해 ${analysisType} 검정력 분석을 실시하였다.`

    return intro
  },

  results({ r, ctx, lang }) {
    if (lang === 'en') return 'English template coming soon.'
    const add = r.additional ?? {}
    const requiredN = add.requiredSampleSize ?? add.sampleSize
    const power = add.power
    const es = esValue(r.effectSize)
    const alpha = add.alpha ?? 0.05

    const parts: string[] = ['검정력 분석 결과:']
    if (es !== undefined) parts.push(`효과크기 = ${fmt(es)}`)
    if (alpha !== undefined) parts.push(`유의수준 α = ${alpha}`)
    if (power !== undefined) parts.push(`검정력(1-β) = ${fmt(power)}`)
    if (requiredN !== undefined) parts.push(`필요 표본 수 *n* = ${requiredN}`)

    return parts.join(', ') + '.'
  },

  captions(input) {
    const { lang } = input
    const tableText = lang === 'ko'
      ? `검정력 분석 결과. 효과크기별 필요 표본 수.`
      : `Power analysis results. Required sample size by effect size.`
    return buildCaptions(input, tableText)
  },
}

// ─── 카테고리 템플릿 레지스트리 ──────────────────────────────────────────────

const CATEGORY_TEMPLATES: Record<string, CategoryTemplate> = {
  't-test': T_TEST_TEMPLATE,
  anova: ANOVA_TEMPLATE,
  nonparametric: NONPARAMETRIC_TEMPLATE,
  correlation: CORRELATION_TEMPLATE,
  regression: REGRESSION_TEMPLATE,
  'chi-square': CHI_SQUARE_TEMPLATE,
  descriptive: DESCRIPTIVE_TEMPLATE,
  timeseries: TIMESERIES_TEMPLATE,
  survival: SURVIVAL_TEMPLATE,
  multivariate: MULTIVARIATE_TEMPLATE,
  // psychometrics, design: METHOD_OVERRIDES에서 처리
  psychometrics: RELIABILITY_TEMPLATE,
  design: POWER_ANALYSIS_TEMPLATE,
  other: GENERIC_TEMPLATE,
}

/** 메서드별 특화 override (카테고리 기본보다 우선) */
const METHOD_OVERRIDES: Record<string, CategoryTemplate> = {
  'one-sample-t': ONE_SAMPLE_T_TEMPLATE,
  'paired-t': PAIRED_T_TEMPLATE,
  reliability: RELIABILITY_TEMPLATE,
  'power-analysis': POWER_ANALYSIS_TEMPLATE,
}

/**
 * 템플릿 조회 — 메서드별 override → 카테고리별 기본 → generic fallback
 */
export function getTemplate(methodId: string, category: string): CategoryTemplate {
  return METHOD_OVERRIDES[methodId] ?? CATEGORY_TEMPLATES[category] ?? GENERIC_TEMPLATE
}

export { GENERIC_TEMPLATE, CATEGORY_TEMPLATES, METHOD_OVERRIDES }
