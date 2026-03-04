/**
 * ChartSpec Zod 스키마
 *
 * 용도:
 * 1. AI 출력 검증 (patch가 올바른 형식인지)
 * 2. 런타임 데이터 검증
 * 3. chartSpec 직렬화/역직렬화 안전성
 */

import { z } from 'zod';

// ─── 기본 타입 ─────────────────────────────────────────────

const chartTypeSchema = z.enum([
  'bar', 'grouped-bar', 'stacked-bar',
  'line', 'scatter', 'boxplot',
  'histogram', 'error-bar', 'heatmap', 'violin',
]);

const dataTypeSchema = z.enum([
  'quantitative', 'nominal', 'ordinal', 'temporal',
]);

const stylePresetSchema = z.enum([
  'default', 'science', 'ieee', 'grayscale',
]);

const exportFormatSchema = z.enum([
  'svg', 'png', 'pdf', 'tiff',
]);

// ─── 하위 스키마 ───────────────────────────────────────────

const columnMetaSchema = z.object({
  name: z.string().min(1),
  type: dataTypeSchema,
  uniqueCount: z.number().int().nonnegative(),
  sampleValues: z.array(z.string()),
  hasNull: z.boolean(),
});

const scaleSchema = z.object({
  domain: z.union([
    z.tuple([z.number(), z.number()]),
    z.array(z.string()),
  ]).optional(),
  range: z.union([
    z.tuple([z.number(), z.number()]),
    z.array(z.string()),
  ]).optional(),
  zero: z.boolean().optional(),
  type: z.enum(['linear', 'log', 'sqrt', 'symlog']).optional(),
}).strict();

const legendSchema = z.object({
  title: z.string().optional(),
  orient: z.enum([
    'top', 'bottom', 'left', 'right',
    'top-left', 'top-right', 'bottom-left', 'bottom-right', 'none',
  ]).optional(),
  fontSize: z.number().positive().optional(),
  titleFontSize: z.number().positive().optional(),
}).strict();

const axisSchema = z.object({
  field: z.string().min(1),
  type: dataTypeSchema,
  title: z.string().optional(),
  labelAngle: z.number().min(-360).max(360).optional(),
  labelFontSize: z.number().positive().optional(),
  titleFontSize: z.number().positive().optional(),
  format: z.string().optional(),
  grid: z.boolean().optional(),
  scale: scaleSchema.optional(),
  sort: z.union([
    z.enum(['ascending', 'descending']),
    z.null(),
  ]).optional(),
}).strict();

const colorSchema = z.object({
  field: z.string().min(1),
  type: dataTypeSchema,
  scale: z.object({
    scheme: z.string().optional(),
    range: z.array(z.string()).optional(),
  }).strict().optional(),
  legend: legendSchema.optional(),
}).strict();

const shapeSchema = z.object({
  field: z.string().min(1),
  type: dataTypeSchema,
}).strict();

const errorBarSchema = z.object({
  type: z.enum(['ci', 'stderr', 'stdev', 'iqr']),
  value: z.number().positive().optional(),
}).strict();

const annotationSchema = z.object({
  type: z.enum(['text', 'line', 'rect']),
  text: z.string().optional(),
  x: z.union([z.number(), z.string()]).optional(),
  y: z.union([z.number(), z.string()]).optional(),
  x2: z.union([z.number(), z.string()]).optional(),
  y2: z.union([z.number(), z.string()]).optional(),
  color: z.string().optional(),
  fontSize: z.number().positive().optional(),
  strokeDash: z.array(z.number()).optional(),
}).strict();

const styleSchema = z.object({
  preset: stylePresetSchema,
  font: z.object({
    family: z.string().optional(),
    size: z.number().positive().optional(),
    titleSize: z.number().positive().optional(),
    labelSize: z.number().positive().optional(),
  }).strict().optional(),
  colors: z.array(z.string()).optional(),
  background: z.string().optional(),
  padding: z.number().nonnegative().optional(),
  overrides: z.record(z.string(), z.unknown()).optional(),
}).strict();

const exportConfigSchema = z.object({
  format: exportFormatSchema,
  dpi: z.number().int().min(72).max(1200),
  width: z.number().positive(),
  height: z.number().positive(),
  transparent: z.boolean().optional(),
}).strict();

// ─── ChartSpec 메인 스키마 ─────────────────────────────────

export const chartSpecSchema = z.object({
  version: z.literal('1.0'),
  chartType: chartTypeSchema,
  title: z.string().optional(),
  data: z.object({
    sourceId: z.string().min(1),
    columns: z.array(columnMetaSchema).min(1),
  }).strict(),
  encoding: z.object({
    x: axisSchema,
    y: axisSchema,
    color: colorSchema.optional(),
    shape: shapeSchema.optional(),
    size: z.object({
      field: z.string().min(1),
      type: dataTypeSchema,
    }).strict().optional(),
  }).strict(),
  errorBar: errorBarSchema.optional(),
  aggregate: z.object({
    y: z.enum(['mean', 'median', 'sum', 'count', 'min', 'max']),
    groupBy: z.array(z.string()),
  }).strict().optional(),
  style: styleSchema,
  annotations: z.array(annotationSchema),
  exportConfig: exportConfigSchema,
}).strict();

// ─── AI Patch 스키마 ───────────────────────────────────────

export const chartSpecPatchSchema = z.object({
  op: z.enum(['replace', 'add', 'remove']),
  path: z.string().regex(/^\//, 'JSON Pointer must start with /'),
  value: z.unknown().optional(),
}).strict();

export const aiEditResponseSchema = z.object({
  patches: z.array(chartSpecPatchSchema).min(1),
  explanation: z.string().min(1),
  confidence: z.number().min(0).max(1),
}).strict();

// ─── DataPackage 스키마 ────────────────────────────────────

export const dataPackageSchema = z.object({
  id: z.string().min(1),
  source: z.enum(['smart-flow', 'bio-tools', 'upload', 'species-checker']),
  label: z.string().min(1),
  columns: z.array(columnMetaSchema).min(1),
  data: z.record(z.string(), z.array(z.unknown())),
  context: z.object({
    method: z.string().optional(),
    summary: z.record(z.string(), z.unknown()).optional(),
  }).strict().optional(),
  createdAt: z.string().datetime(),
}).strict();

// ─── 타입 추출 ─────────────────────────────────────────────

export type ChartSpecValidated = z.infer<typeof chartSpecSchema>;
export type ChartSpecPatchValidated = z.infer<typeof chartSpecPatchSchema>;
export type AiEditResponseValidated = z.infer<typeof aiEditResponseSchema>;
export type DataPackageValidated = z.infer<typeof dataPackageSchema>;
