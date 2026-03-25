import { lazy, type ComponentType } from 'react'
import type { ToolComponentProps } from './types'

export type { ToolComponentProps }

/** 도구 ID → lazy-loaded 컴포넌트 맵 (코드 스플리팅) */
export const TOOL_COMPONENTS: Record<string, ComponentType<ToolComponentProps>> = {
  // 군집생태
  'alpha-diversity': lazy(() => import('./AlphaDiversityTool')),
  'rarefaction': lazy(() => import('./RarefactionTool')),
  'beta-diversity': lazy(() => import('./BetaDiversityTool')),
  'nmds': lazy(() => import('./NmdsTool')),
  'permanova': lazy(() => import('./PermanovaTool')),
  'mantel-test': lazy(() => import('./MantelTestTool')),

  // 수산학
  'vbgf': lazy(() => import('./VbgfTool')),
  'length-weight': lazy(() => import('./LengthWeightTool')),
  'condition-factor': lazy(() => import('./ConditionFactorTool')),

  // 유전학
  'hardy-weinberg': lazy(() => import('./HardyWeinbergTool')),
  'fst': lazy(() => import('./FstTool')),

  // 방법론
  'meta-analysis': lazy(() => import('./MetaAnalysisTool')),
  'roc-auc': lazy(() => import('./RocAucTool')),
  'icc': lazy(() => import('./IccTool')),
  'survival': lazy(() => import('./SurvivalTool')),
}
