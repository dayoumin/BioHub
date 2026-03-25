import type { BioTool, BioToolExtendedMeta } from '@/lib/bio-tools/bio-tool-registry'

export interface ToolComponentProps {
  tool: BioTool
  meta: BioToolExtendedMeta
}
