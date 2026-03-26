/**
 * Bio-Tools 도구별 내보내기 테이블 빌더
 *
 * toolId → results → ExportableTable[] 매핑.
 * 각 도구의 결과 타입에 맞게 CSV 행을 구성한다.
 */

import type { ExportableTable } from './bio-export-csv'
import type { BioToolId } from './bio-tool-registry'
import type {
  AlphaDiversityResult,
  BetaDiversityResult,
  ConditionFactorResult,
  FstResult,
  HardyWeinbergResult,
  IccResult,
  LengthWeightResult,
  MantelResult,
  MetaAnalysisResult,
  NmdsResult,
  PermanovaResult,
  RarefactionResult,
  RocAucResult,
  SurvivalResult,
  VbgfResult,
} from '@/types/bio-tools-results'

type ExportFn = (results: unknown) => ExportableTable[]

// ─── 공유 상수 ──────────────────────────────────

/** Alpha Diversity 지수 라벨 (AlphaDiversityTool.tsx에서도 사용) */
export const ALPHA_INDEX_LABELS: Record<string, string> = {
  shannonH: "Shannon H'",
  simpsonDiversity: 'Simpson 1-D',
  simpsonReciprocal: 'Simpson 1/D',
  margalef: 'Margalef d',
  pielou: "Pielou J'",
}

// ─── 헬퍼 ───────────────────────────────────────

/** 항목-값 2열 테이블 (가장 흔한 패턴) */
function kvTable(title: string, rows: (string | number | null)[][]): ExportableTable {
  return { title, headers: ['항목', '값'], rows }
}

// ─── 빌더 ───────────────────────────────────────

const BUILDERS: Partial<Record<BioToolId, ExportFn>> = {
  'alpha-diversity': (raw) => {
    const r = raw as AlphaDiversityResult
    const tables: ExportableTable[] = [
      {
        title: '지점별 다양성 지수',
        headers: ['지점', '종수(S)', '개체수(N)', "Shannon H'", 'Simpson 1-D', 'Margalef d', "Pielou J'"],
        rows: r.siteResults.map((s) => [
          s.siteName, s.speciesRichness, s.totalAbundance,
          s.shannonH, s.simpsonDiversity, s.margalef, s.pielou,
        ]),
      },
    ]
    if (r.summaryTable.length > 0) {
      tables.push({
        title: '요약 통계',
        headers: ['지수', '평균', '표준편차', '최소', '최대'],
        rows: r.summaryTable.map((s) => [
          ALPHA_INDEX_LABELS[s.index] ?? s.index, s.mean, s.sd, s.min, s.max,
        ]),
      })
    }
    return tables
  },

  'beta-diversity': (raw) => {
    const r = raw as BetaDiversityResult
    return [{
      title: `거리 행렬 (${r.metric})`,
      headers: ['', ...r.siteLabels],
      rows: r.distanceMatrix.map((row, i) => [r.siteLabels[i], ...row]),
    }]
  },

  rarefaction: (raw) => {
    const r = raw as RarefactionResult
    return [{
      title: '희박화 곡선',
      headers: ['지점', '개체수', '기대종수'],
      rows: r.curves.flatMap((c) =>
        c.steps.map((s, i) => [c.siteName, s, c.expectedSpecies[i]]),
      ),
    }]
  },

  nmds: (raw) => {
    const r = raw as NmdsResult
    const headers = ['지점', 'NMDS1', 'NMDS2']
    if (r.groups) headers.push('그룹')
    return [
      {
        title: 'NMDS 좌표',
        headers,
        rows: r.coordinates.map((c, i) => {
          const row: (string | number)[] = [r.siteLabels[i], c[0], c[1]]
          if (r.groups) row.push(r.groups[i])
          return row
        }),
      },
      kvTable('적합도', [
        ['Stress', r.stress],
        ['해석', r.stressInterpretation],
      ]),
    ]
  },

  permanova: (raw) => {
    const r = raw as PermanovaResult
    return [kvTable('PERMANOVA 결과', [
      ['Pseudo-F', r.pseudoF],
      ['p-value', r.pValue],
      ['R²', r.rSquared],
      ['순열 수', r.permutations],
      ['SS (집단 간)', r.ssBetween],
      ['SS (집단 내)', r.ssWithin],
      ['SS (전체)', r.ssTotal],
    ])]
  },

  'mantel-test': (raw) => {
    const r = raw as MantelResult
    return [kvTable('Mantel Test 결과', [
      ['Mantel r', r.r],
      ['p-value (양측)', r.pValue],
      ['방법', r.method],
      ['순열 수', r.permutations],
    ])]
  },

  vbgf: (raw) => {
    const r = raw as VbgfResult
    const fitRows: (string | number)[][] = [['R²', r.rSquared]]
    if (r.aic != null) fitRows.push(['AIC', r.aic])
    fitRows.push(['N', r.nObservations])
    return [
      {
        title: '매개변수',
        headers: ['Parameter', 'Unit', 'Estimate', 'SE', 'CI Lower', 'CI Upper'],
        rows: r.parameterTable.map((p) => [
          p.name, p.unit, p.estimate, p.standardError, p.ciLower, p.ciUpper,
        ]),
      },
      kvTable('적합도', fitRows),
    ]
  },

  'length-weight': (raw) => {
    const r = raw as LengthWeightResult
    return [kvTable('매개변수', [
      ['a (intercept)', r.a],
      ['b (slope)', r.b],
      ['b SE', r.bStdError],
      ['log(a)', r.logA],
      ['R²', r.rSquared],
      ['Isometric t', r.isometricTStat],
      ['Isometric p', r.isometricPValue],
      ['성장 유형', r.growthType],
      ['N', r.nObservations],
    ])]
  },

  'condition-factor': (raw) => {
    const r = raw as ConditionFactorResult
    const tables: ExportableTable[] = [
      kvTable('전체 요약', [
        ['평균 K', r.mean],
        ['표준편차', r.std],
        ['중앙값', r.median],
        ['최소', r.min],
        ['최대', r.max],
        ['표본 수', r.n],
      ]),
    ]
    if (r.groupStats) {
      tables.push({
        title: '그룹별 통계',
        headers: ['그룹', '평균 K', 'SD', '중앙값', 'N'],
        rows: Object.entries(r.groupStats).map(([name, g]) => [name, g.mean, g.std, g.median, g.n]),
      })
    }
    if (r.comparison) {
      const compRows: (string | number)[][] = [
        ['검정', r.comparison.test],
        ['통계량', r.comparison.statistic],
        ['p-value', r.comparison.pValue],
        ['df', r.comparison.df],
      ]
      if (r.comparison.df2 != null) compRows.push(['df2', r.comparison.df2])
      tables.push(kvTable('그룹 비교 검정', compRows))
    }
    return tables
  },

  'hardy-weinberg': (raw) => {
    const r = raw as HardyWeinbergResult
    const tables: ExportableTable[] = [
      kvTable('검정 결과', [
        ['p (빈도)', r.alleleFreqP],
        ['q (빈도)', r.alleleFreqQ],
        ['χ²', r.chiSquare],
        ['exact p-value', r.exactPValue],
        ['N', r.nTotal],
        ['판정', r.isMonomorphic ? '단형성' : r.inEquilibrium ? 'HW 평형 유지' : 'HW 평형 이탈'],
      ]),
      {
        title: '관측 vs 기대 빈도',
        headers: ['유전자형', '관측', '기대'],
        rows: ['AA', 'Aa', 'aa'].map((gt, i) => [gt, r.observedCounts[i], r.expectedCounts[i]]),
      },
    ]
    if (r.locusResults && r.locusResults.length > 1) {
      tables.push({
        title: '유전자좌별 결과',
        headers: ['유전자좌', 'p', 'q', 'χ²', 'χ² p', 'exact p', '판정'],
        rows: r.locusResults.map((lr) => [
          lr.locus, lr.alleleFreqP, lr.alleleFreqQ,
          lr.isMonomorphic ? '—' : lr.chiSquare,
          lr.isMonomorphic ? '—' : lr.pValue,
          lr.isMonomorphic ? '—' : lr.exactPValue,
          lr.isMonomorphic ? '단형성' : lr.inEquilibrium ? '평형' : '이탈',
        ]),
      })
    }
    return tables
  },

  fst: (raw) => {
    const r = raw as FstResult
    const summaryRows: (string | number)[][] = [
      ['Global Fst', r.globalFst],
      ['집단 수', r.nPopulations],
    ]
    if (r.nIndividuals != null) summaryRows.push(['개체 수', r.nIndividuals])
    if (r.nLoci != null) summaryRows.push(['유전자좌 수', r.nLoci])
    if (r.permutationPValue != null) summaryRows.push(['permutation p-value', r.permutationPValue])
    if (r.bootstrapCi != null) {
      summaryRows.push(['Bootstrap CI (하한)', r.bootstrapCi[0]])
      summaryRows.push(['Bootstrap CI (상한)', r.bootstrapCi[1]])
    }
    return [
      kvTable('요약', summaryRows),
      {
        title: '쌍별 Fst 행렬',
        headers: ['', ...r.populationLabels],
        rows: r.pairwiseFst.map((row, i) => [r.populationLabels[i], ...row]),
      },
    ]
  },

  'meta-analysis': (raw) => {
    const r = raw as MetaAnalysisResult
    return [
      kvTable('통합 결과', [
        ['모델', r.model],
        ['통합 효과', r.pooledEffect],
        ['95% CI 하한', r.ci[0]],
        ['95% CI 상한', r.ci[1]],
        ['z', r.zValue],
        ['p-value', r.pValue],
        ['Q', r.Q],
        ['Q p-value', r.QpValue],
        ['I²', r.iSquared],
        ['τ²', r.tauSquared],
      ]),
      {
        title: '개별 연구',
        headers: ['Study', 'Effect Size', 'CI Lower', 'CI Upper', 'Weight (%)'],
        rows: r.studyNames.map((name, i) => [
          name, r.effectSizes[i], r.studyCiLower[i], r.studyCiUpper[i], r.weights[i],
        ]),
      },
    ]
  },

  'roc-auc': (raw) => {
    const r = raw as RocAucResult
    return [
      kvTable('ROC-AUC 요약', [
        ['AUC', r.auc],
        ['AUC CI 하한', r.aucCI.lower],
        ['AUC CI 상한', r.aucCI.upper],
        ['최적 임계값', r.optimalThreshold],
        ['민감도', r.sensitivity],
        ['특이도', r.specificity],
      ]),
      {
        title: 'ROC 곡선 좌표',
        headers: ['FPR', 'TPR'],
        rows: r.rocPoints.map((p) => [p.fpr, p.tpr]),
      },
    ]
  },

  icc: (raw) => {
    const r = raw as IccResult
    return [
      kvTable('ICC 결과', [
        ['ICC 유형', r.iccType],
        ['ICC', r.icc],
        ['95% CI 하한', r.ci[0]],
        ['95% CI 상한', r.ci[1]],
        ['해석', r.interpretation],
        ['F', r.fValue],
        ['df1', r.df1],
        ['df2', r.df2],
        ['p-value', r.pValue],
        ['피험자 수', r.nSubjects],
        ['평가자 수', r.nRaters],
      ]),
      {
        title: '분산 분석',
        headers: ['변동원', '평균제곱'],
        rows: [
          ['피험자 간 (Between Subjects)', r.msRows],
          ['평가자 간 (Between Raters)', r.msCols],
          ['잔차 (Residual)', r.msError],
        ],
      },
    ]
  },

  survival: (raw) => {
    const r = raw as SurvivalResult
    const entries = Object.entries(r.curves)
    const tables: ExportableTable[] = [
      {
        title: '그룹별 요약',
        headers: ['그룹', '중앙 생존 시간', '관측 수', '사건 수', '중도절단 수'],
        rows: entries.map(([name, curve]) => [
          name,
          curve.medianSurvival ?? '—',
          curve.atRisk[0],
          curve.nEvents,
          curve.censored.length,
        ]),
      },
    ]
    if (r.logRankP !== null) {
      tables.push(kvTable('Log-rank 검정', [['p-value', r.logRankP]]))
    }
    tables.push({
      title: '생존 곡선 데이터',
      headers: ['그룹', '시간', '생존율', 'CI(하한)', 'CI(상한)'],
      rows: entries.flatMap(([name, curve]) =>
        curve.time.map((t, i) => [name, t, curve.survival[i], curve.ciLo[i], curve.ciHi[i]]),
      ),
    })
    return tables
  },
}

/** toolId에 대한 내보내기 테이블 생성 */
export function getBioExportTables(toolId: BioToolId, results: unknown): ExportableTable[] {
  if (!results) return []
  return BUILDERS[toolId]?.(results) ?? []
}
