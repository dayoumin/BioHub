export type MaterialsSourceKind = 'dataset' | 'sample' | 'species'

export type MaterialsSourceOrigin =
  | 'data-file'
  | 'user-input'
  | 'project-entity'
  | 'taxonomy-checker'
  | 'analysis-metadata'

export type MaterialsVerificationStatus =
  | 'verified'
  | 'unverified'
  | 'missing'
  | 'failed'

export type MaterialsProhibitedClaimId =
  | 'equipment-name'
  | 'reagent-name'
  | 'ethics-approval'
  | 'collection-location'
  | 'storage-condition'
  | 'verified-species-identity'

export interface MaterialsSourceInput {
  id?: string
  kind: MaterialsSourceKind
  label: string
  origin: MaterialsSourceOrigin
  scientificName?: string
  commonName?: string
  verificationStatus?: MaterialsVerificationStatus
  verifiedBy?: string
  evidence?: string
}

export interface MaterialsSource {
  id: string
  kind: MaterialsSourceKind
  label: string
  origin: MaterialsSourceOrigin
  scientificName?: string
  commonName?: string
  verification: {
    status: MaterialsVerificationStatus
    verifiedBy?: string
    evidence?: string
  }
  allowedClaims: string[]
}

export interface MaterialsSamplingContext {
  collectionLocation?: string
  collectionPeriod?: string
  storageCondition?: string
  equipment: string[]
  reagents: string[]
  ethicsApproval?: string
}

export interface MaterialsSourceContract {
  sources: MaterialsSource[]
  sampling: MaterialsSamplingContext
  prohibitedAutoClaims: MaterialsProhibitedClaimId[]
  warnings: string[]
  errors: string[]
}

export interface BuildMaterialsSourceContractParams {
  dataFileName?: string | null
  rowCount?: number
  variables?: string[]
  dataDescription?: string
  materialSources?: MaterialsSourceInput[]
  sampling?: Partial<MaterialsSamplingContext>
}

const PROHIBITED_AUTO_CLAIMS: MaterialsProhibitedClaimId[] = [
  'equipment-name',
  'reagent-name',
  'ethics-approval',
  'collection-location',
  'storage-condition',
  'verified-species-identity',
]

function sanitizeText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function sanitizeList(value: string[] | undefined): string[] {
  return (value ?? [])
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

function makeSourceId(input: MaterialsSourceInput, index: number): string {
  if (input.id) return input.id
  const label = input.scientificName ?? input.label
  return `${input.kind}:${label.toLowerCase().replace(/\s+/g, '-')}:${index}`
}

function buildAllowedClaims(source: MaterialsSource): string[] {
  const claims = ['source-label']

  if (source.kind === 'dataset') {
    claims.push('data-file-name', 'row-count', 'variable-count')
  }

  if (source.kind === 'sample') {
    claims.push('sample-label')
  }

  if (source.kind === 'species' && source.verification.status === 'verified') {
    claims.push('verified-species-name')
  }

  return claims
}

function normalizeMaterialSource(input: MaterialsSourceInput, index: number): MaterialsSource {
  const source: MaterialsSource = {
    id: makeSourceId(input, index),
    kind: input.kind,
    label: input.label,
    origin: input.origin,
    scientificName: sanitizeText(input.scientificName),
    commonName: sanitizeText(input.commonName),
    verification: {
      status: input.verificationStatus ?? 'unverified',
      verifiedBy: sanitizeText(input.verifiedBy),
      evidence: sanitizeText(input.evidence),
    },
    allowedClaims: [],
  }

  return {
    ...source,
    allowedClaims: buildAllowedClaims(source),
  }
}

function buildDatasetSource(params: BuildMaterialsSourceContractParams): MaterialsSource | undefined {
  const label = sanitizeText(params.dataFileName) ?? 'Analysis dataset'
  const hasDatasetMetadata = Boolean(
    params.dataFileName
    || typeof params.rowCount === 'number'
    || (params.variables?.length ?? 0) > 0,
  )

  if (!hasDatasetMetadata) return undefined

  const evidenceParts = [
    typeof params.rowCount === 'number' ? `${params.rowCount} rows` : undefined,
    params.variables?.length ? `${params.variables.length} variables` : undefined,
  ].filter((entry): entry is string => Boolean(entry))

  const source: MaterialsSource = {
    id: `dataset:${label.toLowerCase().replace(/\s+/g, '-')}`,
    kind: 'dataset',
    label,
    origin: 'data-file',
    verification: {
      status: 'verified',
      evidence: evidenceParts.join(', ') || undefined,
    },
    allowedClaims: [],
  }

  return {
    ...source,
    allowedClaims: buildAllowedClaims(source),
  }
}

export function buildMaterialsSourceContract(
  params: BuildMaterialsSourceContractParams,
): MaterialsSourceContract {
  const datasetSource = buildDatasetSource(params)
  const sources = [
    ...(datasetSource ? [datasetSource] : []),
    ...(params.materialSources ?? []).map((source, index) => normalizeMaterialSource(source, index)),
  ]
  const unsafeSpecies = sources.filter((source) =>
    source.kind === 'species' && source.verification.status !== 'verified',
  )
  const sampling: MaterialsSamplingContext = {
    collectionLocation: sanitizeText(params.sampling?.collectionLocation),
    collectionPeriod: sanitizeText(params.sampling?.collectionPeriod),
    storageCondition: sanitizeText(params.sampling?.storageCondition),
    equipment: sanitizeList(params.sampling?.equipment),
    reagents: sanitizeList(params.sampling?.reagents),
    ethicsApproval: sanitizeText(params.sampling?.ethicsApproval),
  }

  return {
    sources,
    sampling,
    prohibitedAutoClaims: PROHIBITED_AUTO_CLAIMS,
    warnings: params.dataDescription
      ? []
      : ['Data or sample description is not user-confirmed.'],
    errors: unsafeSpecies.map((source) =>
      `Species source "${source.label}" is ${source.verification.status}.`,
    ),
  }
}

export function hasUnsafeSpeciesSource(contract: MaterialsSourceContract): boolean {
  return contract.sources.some((source) =>
    source.kind === 'species' && source.verification.status !== 'verified',
  )
}

export function getMaterialsSourceSummary(
  contract: MaterialsSourceContract,
  language: 'ko' | 'en',
): string {
  const datasetCount = contract.sources.filter((source) => source.kind === 'dataset').length
  const sampleCount = contract.sources.filter((source) => source.kind === 'sample').length
  const verifiedSpeciesCount = contract.sources.filter((source) =>
    source.kind === 'species' && source.verification.status === 'verified',
  ).length

  if (language === 'en') {
    return `Sources: ${datasetCount} dataset, ${sampleCount} sample, ${verifiedSpeciesCount} verified species.`
  }

  return `source: 데이터셋 ${datasetCount}개, 시료 ${sampleCount}개, 검증된 종 ${verifiedSpeciesCount}개`
}
