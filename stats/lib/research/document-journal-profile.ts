import type {
  DocumentBlueprint,
  TargetJournalStylePreset,
  TargetJournalRequirementProfileSnapshot,
} from './document-blueprint-types'

export interface CreateTargetJournalProfileSnapshotOptions {
  stylePreset: TargetJournalStylePreset
  label?: string
  targetJournal?: string
  articleType?: string
  abstractWordLimit?: number
  mainTextWordLimit?: number
  referenceStyle?: string
  requiredStatements?: string[]
  figureTableRequirements?: string[]
  manualRequirements?: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isTargetJournalProfileSnapshot(
  value: unknown,
): value is TargetJournalRequirementProfileSnapshot {
  if (!isRecord(value)) {
    return false
  }

  return typeof value.id === 'string'
    && typeof value.version === 'string'
    && typeof value.label === 'string'
    && (
      value.stylePreset === 'general'
      || value.stylePreset === 'imrad'
      || value.stylePreset === 'apa'
      || value.stylePreset === 'kci'
      || value.stylePreset === 'manual'
    )
}

export function createTargetJournalProfileSnapshot(
  options: CreateTargetJournalProfileSnapshotOptions,
): TargetJournalRequirementProfileSnapshot {
  const targetJournal = options.targetJournal?.trim()
  const articleType = options.articleType?.trim()
  const label = options.label?.trim()
    || targetJournal
    || (options.stylePreset === 'imrad' ? 'IMRAD manuscript' : 'General manuscript')
  const versionParts = [
    'target-journal-profile',
    options.stylePreset,
    targetJournal ?? 'none',
    articleType ?? 'article',
    String(options.abstractWordLimit ?? 'none'),
    String(options.mainTextWordLimit ?? 'none'),
    options.referenceStyle?.trim() ?? 'none',
    ...(options.requiredStatements ?? []).map((item) => item.trim()).filter(Boolean).sort(),
    ...(options.figureTableRequirements ?? []).map((item) => item.trim()).filter(Boolean).sort(),
    ...(options.manualRequirements ?? []).map((item) => item.trim()).filter(Boolean).sort(),
  ]

  return {
    id: versionParts.join(':'),
    version: versionParts.join(':'),
    label,
    stylePreset: options.stylePreset,
    targetJournal,
    articleType,
    abstractWordLimit: options.abstractWordLimit,
    mainTextWordLimit: options.mainTextWordLimit,
    referenceStyle: options.referenceStyle?.trim() || undefined,
    requiredStatements: options.requiredStatements,
    figureTableRequirements: options.figureTableRequirements,
    manualRequirements: options.manualRequirements,
  }
}

export function getDocumentTargetJournalProfileSnapshot(
  document: DocumentBlueprint,
): TargetJournalRequirementProfileSnapshot | null {
  const metadata = document.metadata
  if (isRecord(metadata) && isTargetJournalProfileSnapshot(metadata.targetJournalProfile)) {
    return metadata.targetJournalProfile
  }

  if (isRecord(metadata) && typeof metadata.targetJournal === 'string' && metadata.targetJournal.trim().length > 0) {
    const targetJournal = metadata.targetJournal.trim()
    return {
      id: `legacy-target-journal:${targetJournal}`,
      version: `legacy-target-journal:${targetJournal}`,
      label: targetJournal,
      stylePreset: 'general',
      targetJournal,
    }
  }

  return null
}

export function getDocumentTargetJournalProfileVersion(
  document: DocumentBlueprint,
): string | undefined {
  return getDocumentTargetJournalProfileSnapshot(document)?.version
}

function pushLimitLine(lines: string[], label: string, value: number | undefined): void {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    lines.push(`${label}: ${value} words`)
  }
}

function pushStringLine(lines: string[], label: string, value: string | undefined): void {
  const normalized = value?.trim()
  if (normalized) {
    lines.push(`${label}: ${normalized}`)
  }
}

function pushStringList(lines: string[], label: string, value: unknown): void {
  if (isStringArray(value)) {
    for (const item of value) {
      const normalized = item.trim()
      if (normalized) {
        lines.push(`${label}: ${normalized}`)
      }
    }
  }
}

export function formatTargetJournalProfileForWriting(
  profile: TargetJournalRequirementProfileSnapshot | null,
): string[] {
  if (!profile) {
    return []
  }

  const lines: string[] = [
    `Profile: ${profile.label}`,
    `Style preset: ${profile.stylePreset}`,
  ]

  pushStringLine(lines, 'Target journal', profile.targetJournal)
  pushStringLine(lines, 'Article type', profile.articleType)
  pushLimitLine(lines, 'Abstract limit', profile.abstractWordLimit)
  pushLimitLine(lines, 'Main text limit', profile.mainTextWordLimit)
  pushStringLine(lines, 'Reference style', profile.referenceStyle)
  pushStringList(lines, 'Required statement', profile.requiredStatements)
  pushStringList(lines, 'Figure/table requirement', profile.figureTableRequirements)
  pushStringList(lines, 'Manual requirement', profile.manualRequirements)

  return lines
}
