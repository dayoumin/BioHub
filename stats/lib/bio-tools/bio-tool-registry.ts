/**
 * Bio-Tools 도구 레지스트리
 *
 * 16개 Bio-Tool 메타데이터 + 타입 정의.
 * 도구 추가/수정 시 이 파일만 수정.
 */

import type { LucideIcon } from 'lucide-react'
import {
  Leaf,
  TrendingUp,
  Grid3X3,
  ScatterChart,
  ShieldCheck,
  Link2,
  Fish,
  Ruler,
  Scale,
  Dna,
  GitBranch,
  BarChart3,
  Target,
  Repeat,
  HeartPulse,
  BookCheck,
} from 'lucide-react'

// ─── 타입 ─────────────────────────────────────────

export type BioToolCategory = 'ecology' | 'fisheries' | 'genetics' | 'methods'

export type BioToolInputType = 'csv' | 'fasta' | 'matrix' | 'csv-or-matrix'

export type BioToolStatus = 'ready' | 'coming-soon'

export interface BioTool {
  id: string
  nameEn: string
  nameKo: string
  category: BioToolCategory
  icon: LucideIcon
  description: string
  inputType: BioToolInputType
  computeType: 'pyodide' | 'api'
  status: BioToolStatus
  requiredPackages?: readonly string[]
}

export interface BioToolCategoryMeta {
  id: BioToolCategory
  label: string
  order: number
}

// ─── 카테고리 ─────────────────────────────────────

export const BIO_TOOL_CATEGORIES: readonly BioToolCategoryMeta[] = [
  { id: 'ecology', label: '군집생태', order: 0 },
  { id: 'fisheries', label: '수산학', order: 1 },
  { id: 'genetics', label: '유전학', order: 2 },
  { id: 'methods', label: '방법론', order: 3 },
] as const

// ─── 도구 레지스트리 ──────────────────────────────

export const BIO_TOOLS: readonly BioTool[] = [
  // === 군집생태 (6개) ===
  {
    id: 'alpha-diversity',
    nameEn: 'Alpha Diversity',
    nameKo: '생물다양성 지수',
    category: 'ecology',
    icon: Leaf,
    description: 'Shannon, Simpson, Margalef, Pielou 다양성 지수 계산',
    inputType: 'csv',
    computeType: 'pyodide',
    status: 'ready',
  },
  {
    id: 'rarefaction',
    nameEn: 'Rarefaction',
    nameKo: '종 희박화 곡선',
    category: 'ecology',
    icon: TrendingUp,
    description: '샘플링 충분성 평가를 위한 종 희박화 곡선',
    inputType: 'csv',
    computeType: 'pyodide',
    status: 'ready',
  },
  {
    id: 'beta-diversity',
    nameEn: 'Beta Diversity',
    nameKo: '베타 다양성',
    category: 'ecology',
    icon: Grid3X3,
    description: 'Bray-Curtis, Jaccard, Sorensen 거리행렬 계산',
    inputType: 'csv',
    computeType: 'pyodide',
    status: 'ready',
  },
  {
    id: 'nmds',
    nameEn: 'NMDS',
    nameKo: '비계량 다차원 척도법',
    category: 'ecology',
    icon: ScatterChart,
    description: '거리행렬 기반 2D 시각화 (Non-metric MDS)',
    inputType: 'csv-or-matrix',
    computeType: 'pyodide',
    status: 'ready',
    requiredPackages: ['scikit-learn'],
  },
  {
    id: 'permanova',
    nameEn: 'PERMANOVA',
    nameKo: '순열 다변량 분산분석',
    category: 'ecology',
    icon: ShieldCheck,
    description: '그룹 간 군집 조성 차이 검정',
    inputType: 'csv-or-matrix',
    computeType: 'pyodide',
    status: 'ready',
  },
  {
    id: 'mantel-test',
    nameEn: 'Mantel Test',
    nameKo: 'Mantel 검정',
    category: 'ecology',
    icon: Link2,
    description: '두 거리행렬 간 상관 검정',
    inputType: 'matrix',
    computeType: 'pyodide',
    status: 'ready',
  },

  // === 수산학 (3개) ===
  {
    id: 'vbgf',
    nameEn: 'VBGF',
    nameKo: 'von Bertalanffy 성장 모델',
    category: 'fisheries',
    icon: Fish,
    description: '성장 곡선 파라미터 추정 (L∞, K, t₀)',
    inputType: 'csv',
    computeType: 'pyodide',
    status: 'ready',
  },
  {
    id: 'length-weight',
    nameEn: 'Length-Weight',
    nameKo: '체장-체중 관계식',
    category: 'fisheries',
    icon: Ruler,
    description: 'W = aL^b 관계식 추정',
    inputType: 'csv',
    computeType: 'pyodide',
    status: 'ready',
  },
  {
    id: 'condition-factor',
    nameEn: 'Condition Factor',
    nameKo: '비만도 (Fulton\'s K)',
    category: 'fisheries',
    icon: Scale,
    description: 'Fulton\'s K 비만도 지수 계산',
    inputType: 'csv',
    computeType: 'pyodide',
    status: 'ready',
  },

  // === 유전학 (3개) ===
  {
    id: 'hardy-weinberg',
    nameEn: 'Hardy-Weinberg',
    nameKo: 'Hardy-Weinberg 검정',
    category: 'genetics',
    icon: Dna,
    description: 'Hardy-Weinberg 평형 검정',
    inputType: 'csv',
    computeType: 'pyodide',
    status: 'coming-soon',
  },
  {
    id: 'species-validation',
    nameEn: 'Species Validation',
    nameKo: '학명 검증',
    category: 'genetics',
    icon: BookCheck,
    description: '학명 유효성 검증 + 국명 매핑 + 법적 보호종 확인',
    inputType: 'csv',
    computeType: 'api',
    status: 'coming-soon',
  },
  {
    id: 'fst',
    nameEn: 'Fst',
    nameKo: '집단 분화 지수',
    category: 'genetics',
    icon: GitBranch,
    description: 'Fixation Index (집단 간 유전적 분화)',
    inputType: 'csv',
    computeType: 'pyodide',
    status: 'coming-soon',
  },

  // === 방법론 (4개) ===
  {
    id: 'meta-analysis',
    nameEn: 'Meta-Analysis',
    nameKo: '메타분석',
    category: 'methods',
    icon: BarChart3,
    description: 'Forest Plot, I², Q-test',
    inputType: 'csv',
    computeType: 'pyodide',
    status: 'ready',
  },
  {
    id: 'roc-auc',
    nameEn: 'ROC / AUC',
    nameKo: 'ROC 곡선',
    category: 'methods',
    icon: Target,
    description: 'ROC 곡선 + AUC 분석',
    inputType: 'csv',
    computeType: 'pyodide',
    status: 'ready',
    requiredPackages: ['scikit-learn'],
  },
  {
    id: 'icc',
    nameEn: 'ICC',
    nameKo: '급내상관계수',
    category: 'methods',
    icon: Repeat,
    description: 'Intraclass Correlation Coefficient',
    inputType: 'csv',
    computeType: 'pyodide',
    status: 'ready',
  },
  {
    id: 'survival',
    nameEn: 'Survival Analysis',
    nameKo: '생존 분석',
    category: 'methods',
    icon: HeartPulse,
    description: 'Kaplan-Meier + Log-rank 검정',
    inputType: 'csv',
    computeType: 'pyodide',
    status: 'ready',
  },
] as const

// ─── 유틸 ─────────────────────────────────────────

export function getBioToolById(id: string): BioTool | undefined {
  return BIO_TOOLS.find(t => t.id === id)
}

export function getBioToolsByCategory(category: BioToolCategory): readonly BioTool[] {
  return BIO_TOOLS.filter(t => t.category === category)
}
