/**
 * AI 해석 섹션별 아이콘 설정
 *
 * 모든 아이콘은 monochrome (text-muted-foreground)로 렌더링.
 * 섹션 카테고리(detail/warning/action)에 따라 스타일링이 결정됨.
 */

import {
  Calculator,
  TrendingUp,
  Target,
  ShieldCheck,
  BarChart3,
  Lightbulb,
  AlertTriangle,
  ArrowRight,
  FileText,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const SECTION_ICONS: Record<string, LucideIcon> = {
  statistics: Calculator,
  effectSize: TrendingUp,
  confidence: Target,
  assumptions: ShieldCheck,
  groupPatterns: BarChart3,
  practical: Lightbulb,
  cautions: AlertTriangle,
  suggestions: ArrowRight,
  unknown: FileText,
}

/** key에서 base 키를 추출 (unknown-0 → unknown) */
export function getBaseKey(key: string): string {
  return key.replace(/-\d+$/, '')
}

/** 섹션 key에 대응하는 아이콘 조회 */
export function getSectionIcon(key: string): LucideIcon {
  const base = getBaseKey(key)
  return SECTION_ICONS[base] ?? FileText
}
