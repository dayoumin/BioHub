/**
 * AnalysisResult → AnalysisContext 변환 어댑터
 * Smart Flow 분석 결과를 Graph Studio DataPackage의 analysisContext로 변환
 */

import type { AnalysisResult as SmartFlowResult } from '@/types/smart-flow'
import type {
  AnalysisContext,
  Comparison,
  GroupStat,
  TestInfo,
  ComparisonMeta,
  ColumnMeta,
} from '@/types/graph-studio'
import type {
  KaplanMeierAnalysisResult,
  KmCurveData,
  RocCurveAnalysisResult,
} from '@/lib/generated/method-types.generated'

// ─── DataPackage 컬럼 빌더 (KM/ROC 전용) ────────────────────

/** buildKmCurveColumns 반환 형태 */
export interface KmColumnsResult {
  columns: ColumnMeta[];
  data: Record<string, unknown[]>;
  xField: 'time';
  yField: 'survival';
  colorField: 'group' | undefined;
}

/**
 * KaplanMeierAnalysisResult → DataPackage 컬럼 변환.
 * echarts-converter 의 km-curve 컬럼 규약에 맞춰 빌드.
 */
export function buildKmCurveColumns(kmData: KaplanMeierAnalysisResult): KmColumnsResult {
  const groups = Object.keys(kmData.curves);
  // 단일 그룹이 'all'이거나 unnamed이면 colorField 생략
  const isGrouped = groups.length > 1;

  const timeArr: number[] = [];
  const survArr: number[] = [];
  const ciLoArr: number[] = [];
  const ciHiArr: number[] = [];
  const groupArr: string[] = [];
  const isCensoredArr: number[] = [];

  // step function에서 주어진 시간의 생존율 조회 (마지막 ≤ t 스텝 값)
  function survivalAtTime(curve: KmCurveData, t: number): { s: number; lo: number; hi: number } {
    let idx = 0;
    for (let i = 0; i < curve.time.length; i++) {
      if (curve.time[i] <= t) idx = i;
      else break;
    }
    return { s: curve.survival[idx], lo: curve.ciLo[idx], hi: curve.ciHi[idx] };
  }

  for (const [groupName, curve] of Object.entries(kmData.curves)) {
    // 주 KM 스텝 포인트 (event times) — isCensored=0
    for (let i = 0; i < curve.time.length; i++) {
      timeArr.push(curve.time[i]);
      survArr.push(curve.survival[i]);
      ciLoArr.push(curve.ciLo[i]);
      ciHiArr.push(curve.ciHi[i]);
      groupArr.push(groupName);
      isCensoredArr.push(0);
    }
    // 중도절단 시점 — isCensored=1 (KM plot의 tick 마커)
    for (const ct of curve.censored ?? []) {
      const sv = survivalAtTime(curve, ct);
      timeArr.push(ct);
      survArr.push(sv.s);
      ciLoArr.push(sv.lo);
      ciHiArr.push(sv.hi);
      groupArr.push(groupName);
      isCensoredArr.push(1);
    }
  }

  const n = timeArr.length;

  // __logRankP: row 0에 값, 나머지 null (이벤트 시점 행이 앞쪽에 오도록 보장됨)
  const logRankPArr: (number | null)[] = new Array(n).fill(null);
  if (n > 0 && kmData.logRankP !== null) logRankPArr[0] = kmData.logRankP;

  const data: Record<string, unknown[]> = {
    time: timeArr,
    survival: survArr,
    ciLo: ciLoArr,
    ciHi: ciHiArr,
    isCensored: isCensoredArr,
    ...(isGrouped ? { group: groupArr } : {}),
    __logRankP: logRankPArr,
  };

  const uniqCount = (arr: (string | number)[]) => new Set(arr).size;

  const columns: ColumnMeta[] = [
    { name: 'time', type: 'quantitative', uniqueCount: uniqCount(timeArr), sampleValues: timeArr.slice(0, 5).map(String), hasNull: false },
    { name: 'survival', type: 'quantitative', uniqueCount: uniqCount(survArr), sampleValues: survArr.slice(0, 5).map(String), hasNull: false },
    { name: 'ciLo', type: 'quantitative', uniqueCount: uniqCount(ciLoArr), sampleValues: ciLoArr.slice(0, 5).map(String), hasNull: false },
    { name: 'ciHi', type: 'quantitative', uniqueCount: uniqCount(ciHiArr), sampleValues: ciHiArr.slice(0, 5).map(String), hasNull: false },
    { name: 'isCensored', type: 'quantitative', uniqueCount: 2, sampleValues: ['0', '1'], hasNull: false },
    ...(isGrouped ? [{ name: 'group', type: 'nominal' as const, uniqueCount: groups.length, sampleValues: groups.slice(0, 5), hasNull: false }] : []),
    { name: '__logRankP', type: 'quantitative', uniqueCount: 2, sampleValues: [], hasNull: true },
  ];

  return { columns, data, xField: 'time', yField: 'survival', colorField: isGrouped ? 'group' : undefined };
}

/** buildRocCurveColumns 반환 형태 */
export interface RocColumnsResult {
  columns: ColumnMeta[];
  data: Record<string, unknown[]>;
  xField: 'fpr';
  yField: 'tpr';
  colorField: undefined;
}

/**
 * RocCurveAnalysisResult → DataPackage 컬럼 변환.
 * echarts-converter 의 roc-curve 컬럼 규약에 맞춰 빌드.
 */
export function buildRocCurveColumns(rocData: RocCurveAnalysisResult): RocColumnsResult {
  const n = rocData.rocPoints.length;
  const fprArr = rocData.rocPoints.map(p => p.fpr);
  const tprArr = rocData.rocPoints.map(p => p.tpr);

  // AUC 메타: row 0에 값, 나머지 null
  const aucArr: (number | null)[] = new Array(n).fill(null);
  const aucLoArr: (number | null)[] = new Array(n).fill(null);
  const aucHiArr: (number | null)[] = new Array(n).fill(null);
  if (n > 0) {
    aucArr[0] = rocData.auc;
    aucLoArr[0] = rocData.aucCI?.lower ?? null;
    aucHiArr[0] = rocData.aucCI?.upper ?? null;
  }

  const data: Record<string, unknown[]> = {
    fpr: fprArr,
    tpr: tprArr,
    __auc: aucArr,
    __aucLo: aucLoArr,
    __aucHi: aucHiArr,
  };

  const uniqCount = (arr: number[]) => new Set(arr).size;
  const columns: ColumnMeta[] = [
    { name: 'fpr', type: 'quantitative', uniqueCount: uniqCount(fprArr), sampleValues: fprArr.slice(0, 5).map(String), hasNull: false },
    { name: 'tpr', type: 'quantitative', uniqueCount: uniqCount(tprArr), sampleValues: tprArr.slice(0, 5).map(String), hasNull: false },
    { name: '__auc', type: 'quantitative', uniqueCount: 2, sampleValues: [], hasNull: true },
    { name: '__aucLo', type: 'quantitative', uniqueCount: 2, sampleValues: [], hasNull: true },
    { name: '__aucHi', type: 'quantitative', uniqueCount: 2, sampleValues: [], hasNull: true },
  ];

  return { columns, data, xField: 'fpr', yField: 'tpr', colorField: undefined };
}

/**
 * SmartFlowResult를 AnalysisContext로 변환
 * @param result Smart Flow 분석 결과 (result-transformer.ts 출력)
 * @param groupNames 정수 인덱스 → 그룹명 매핑 (C-2: group ID resolution)
 */
export function toAnalysisContext(
  result: SmartFlowResult,
  groupNames?: string[],
): AnalysisContext {
  // C-2: group ID resolution — 정수 인덱스를 라벨로 변환
  const resolveGroupName = (raw: string | number): string => {
    if (typeof raw === 'string') return raw;
    if (groupNames?.[raw] !== undefined) return groupNames[raw];
    const gs = result.groupStats?.[raw];
    if (gs?.name) return gs.name;
    return String(raw);
  };

  // comparisons 변환 (PostHocResult[] → Comparison[])
  const comparisons: Comparison[] | undefined = result.postHoc?.map(ph => ({
    group1: resolveGroupName(ph.group1),
    group2: resolveGroupName(ph.group2),
    pValue: ph.pvalueAdjusted ?? ph.pvalue,
    significant: ph.significant,
    meanDiff: ph.meanDiff,
  }));

  // groupStats 변환 (GroupStats[] → GroupStat[])
  const groupStats: GroupStat[] | undefined = result.groupStats?.map(gs => ({
    name: gs.name ?? '',
    mean: gs.mean,
    std: gs.std,
    n: gs.n,
    se: gs.n > 0 ? gs.std / Math.sqrt(gs.n) : undefined,
    median: gs.median,
  }));

  // effectSize 추출 (number | EffectSizeInfo | undefined → number | undefined)
  const effectSize =
    typeof result.effectSize === 'number'
      ? result.effectSize
      : result.effectSize?.value;
  const effectSizeType =
    typeof result.effectSize === 'number' ? undefined : result.effectSize?.type;

  const testInfo: TestInfo = {
    statistic: result.statistic,
    df: result.df,
    effectSize,
    effectSizeType,
  };

  // H-4: allPairsIncluded 판별 — 전쌍 포함 시만 CLD 생성 가능
  const k = result.groupStats?.length;
  const nComparisons = comparisons?.length;
  const allPairsIncluded =
    k !== undefined &&
    nComparisons !== undefined &&
    nComparisons === (k * (k - 1)) / 2;

  // comparisonMeta — postHoc가 있을 때만 생성
  const comparisonMeta: ComparisonMeta | undefined =
    comparisons && comparisons.length > 0
      ? {
          alpha: 0.05,
          adjustmentMethod: result.postHocMethod ?? 'unknown',
          allPairsIncluded,
        }
      : undefined;

  return {
    method: result.method,
    pValue: result.pValue,
    comparisons,
    groupStats,
    testInfo,
    comparisonMeta,
  };
}
