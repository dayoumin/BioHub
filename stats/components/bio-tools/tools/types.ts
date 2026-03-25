import type { BioTool, BioToolExtendedMeta } from '@/lib/bio-tools/bio-tool-registry'
import type { BioToolHistoryEntry } from '@/lib/bio-tools/bio-tool-history'

export interface ToolComponentProps {
  tool: BioTool
  meta: BioToolExtendedMeta
  /** 히스토리에서 복원할 엔트리 (없으면 새 분석) */
  initialEntry?: BioToolHistoryEntry
}
