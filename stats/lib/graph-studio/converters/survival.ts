/**
 * Survival analysis chart converters: Kaplan-Meier curve, ROC curve.
 */

import type { EChartsOption } from 'echarts';
import type { ConverterContext } from './types';
import {
  toNumber, toStr,
  applyMarkLineAnnotations,
  xAxisBase, yAxisBase,
  getBaseGraphics,
  buildLegend,
} from './shared';

// ── km-curve ──────────────────────────────────────────────

export function buildKmCurveChart(ctx: ConverterContext): EChartsOption {
  const { spec, rows, style, base, xField, yField, colorField } = ctx;
  const timeField = xField;
  const survivalField = yField;

  const groupMap = new Map<string, {
    time: number[];
    survival: number[];
    ciLo: number[];
    ciHi: number[];
    censoredTimes: number[];
  }>();

  for (const r of rows) {
    const grp = colorField ? toStr(r[colorField]) : '__single__';
    if (!groupMap.has(grp)) {
      groupMap.set(grp, { time: [], survival: [], ciLo: [], ciHi: [], censoredTimes: [] });
    }
    const entry = groupMap.get(grp);
    if (!entry) continue;
    const t = toNumber(r[timeField]);
    const s = toNumber(r[survivalField]);
    if (isNaN(t) || isNaN(s)) continue;
    entry.time.push(t);
    entry.survival.push(s);
    const lo = toNumber(r['ciLo']);
    const hi = toNumber(r['ciHi']);
    entry.ciLo.push(isNaN(lo) ? s : lo);
    entry.ciHi.push(isNaN(hi) ? s : hi);
    if (toNumber(r['isCensored']) === 1) entry.censoredTimes.push(t);
  }

  const logRankP = toNumber(rows[0]?.['__logRankP']);

  const allSeries: Record<string, unknown>[] = [];
  const groupNames = [...groupMap.keys()].filter(g => g !== '__single__');
  let colorIdx = 0;

  for (const [grp, data] of groupMap) {
    const color = style.colors[colorIdx % style.colors.length];
    const displayName = grp === '__single__' ? survivalField : grp;

    const sortedIndices = data.time
      .map((t, i) => ({ t, i }))
      .sort((a, b) => a.t - b.t)
      .map(({ i }) => i);
    const sortedTime = sortedIndices.map(i => data.time[i]);
    const sortedSurvival = sortedIndices.map(i => data.survival[i]);
    const sortedCiLo = sortedIndices.map(i => data.ciLo[i]);
    const sortedCiHi = sortedIndices.map(i => data.ciHi[i]);

    const ciStackName = `ci_${colorIdx}`;
    allSeries.push({
      type: 'line',
      name: `${displayName}_ciLo`,
      step: 'end',
      data: sortedTime.map((t, i) => [t, sortedCiLo[i]]),
      lineStyle: { width: 0, opacity: 0 },
      areaStyle: { color: style.background, opacity: 1 },
      symbol: 'none',
      stack: ciStackName,
      legendHoverLink: false,
      tooltip: { show: false },
      z: 1,
    });
    allSeries.push({
      type: 'line',
      name: `${displayName}_ciHi`,
      step: 'end',
      data: sortedTime.map((t, i) => [t, Math.max(0, sortedCiHi[i] - sortedCiLo[i])]),
      lineStyle: { width: 0, opacity: 0 },
      areaStyle: { color, opacity: 0.15 },
      symbol: 'none',
      stack: ciStackName,
      legendHoverLink: false,
      tooltip: { show: false },
      z: 1,
    });

    const mainSeries: Record<string, unknown> = {
      type: 'line',
      name: displayName,
      step: 'end',
      data: sortedTime.map((t, i) => [t, sortedSurvival[i]]),
      lineStyle: { color, width: 2 },
      symbol: 'none',
      z: 3,
    };

    if (data.censoredTimes.length > 0) {
      const censoredMarkData = data.censoredTimes.map(ct => {
        let survAtCt = 1.0;
        for (let i = 0; i < sortedTime.length; i++) {
          if (sortedTime[i] <= ct) survAtCt = sortedSurvival[i];
          else break;
        }
        return { coord: [ct, survAtCt], name: `Censored t=${ct.toFixed(2)}` };
      });
      mainSeries['markPoint'] = {
        symbol: 'path://M0,-5 L0,5',
        symbolSize: 8,
        itemStyle: { color },
        data: censoredMarkData,
        label: { show: false },
      };
    }

    allSeries.push(mainSeries);
    colorIdx++;
  }

  const kmGraphics: Record<string, unknown>[] = [];
  if (!isNaN(logRankP)) {
    const pLabel = logRankP < 0.001 ? 'p < 0.001' : `p = ${logRankP.toFixed(4)}`;
    kmGraphics.push({
      type: 'text',
      right: '8%',
      top: spec.title ? '18%' : '8%',
      style: {
        text: `Log-rank ${pLabel}`,
        fill: '#444444',
        fontSize: style.labelSize,
        fontFamily: style.fontFamily,
      },
    });
  }

  return applyMarkLineAnnotations({
    ...base,
    tooltip: { trigger: 'axis' },
    legend: groupNames.length > 0 ? buildLegend(spec, style) : { show: false },
    xAxis: { ...xAxisBase(spec, style, 'value'), min: 0 },
    yAxis: { ...yAxisBase(spec, style), name: spec.encoding.y.title ?? 'Survival Probability', min: 0, max: 1 },
    series: allSeries,
    graphic: [...getBaseGraphics(base), ...kmGraphics],
  }, spec.annotations);
}

// ── roc-curve ─────────────────────────────────────────────

export function buildRocCurveChart(ctx: ConverterContext): EChartsOption {
  const { spec, rows, style, base, xField, yField } = ctx;
  const fprField = xField;
  const tprField = yField;

  const auc = toNumber(rows[0]?.['__auc']);
  const aucLo = toNumber(rows[0]?.['__aucLo']);
  const aucHi = toNumber(rows[0]?.['__aucHi']);

  const rocData: [number, number][] = rows
    .map(r => [toNumber(r[fprField]), toNumber(r[tprField])] as [number, number])
    .filter(([f, t]) => !isNaN(f) && !isNaN(t))
    .sort((a, b) => a[0] - b[0]);

  const primaryColor = style.colors[0] ?? '#5470c6';

  const rocSeries: Record<string, unknown>[] = [
    {
      type: 'line',
      name: 'Reference',
      data: [[0, 0], [1, 1]] as [number, number][],
      lineStyle: { color: '#aaaaaa', width: 1, type: [4, 4] as number[] },
      symbol: 'none',
      tooltip: { show: false },
      legendHoverLink: false,
      z: 1,
    },
    {
      type: 'line',
      name: 'ROC Curve',
      data: rocData,
      lineStyle: { color: primaryColor, width: 2 },
      symbol: 'none',
      smooth: false,
      areaStyle: { color: primaryColor, opacity: 0.08 },
      z: 3,
    },
  ];

  const rocGraphics: Record<string, unknown>[] = [];
  if (!isNaN(auc)) {
    let aucText = `AUC = ${auc.toFixed(4)}`;
    if (!isNaN(aucLo) && !isNaN(aucHi)) {
      aucText += `\n95% CI [${aucLo.toFixed(3)}, ${aucHi.toFixed(3)}]`;
    }
    rocGraphics.push({
      type: 'text',
      left: '15%',
      bottom: '22%',
      style: {
        text: aucText,
        fill: primaryColor,
        fontSize: style.labelSize + 1,
        fontFamily: style.fontFamily,
        fontWeight: 'bold',
        lineHeight: 18,
      },
    });
  }

  return applyMarkLineAnnotations({
    ...base,
    tooltip: { trigger: 'axis' },
    legend: { show: false },
    xAxis: {
      ...xAxisBase(spec, style, 'value'),
      name: spec.encoding.x.title ?? 'False Positive Rate (1 - Specificity)',
      min: 0, max: 1,
    },
    yAxis: {
      ...yAxisBase(spec, style),
      name: spec.encoding.y.title ?? 'True Positive Rate (Sensitivity)',
      min: 0, max: 1,
    },
    series: rocSeries,
    graphic: [...getBaseGraphics(base), ...rocGraphics],
  }, spec.annotations);
}
