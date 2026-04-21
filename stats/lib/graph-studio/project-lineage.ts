import type { ProjectEntityKind, ProjectProvenanceEdge } from '@biohub/types'
import type {
  ChartSpec,
  ColumnMeta,
  DataPackage,
  GraphLineageMode,
  GraphProject,
  GraphSourceRef,
  GraphSourceSnapshot,
} from '@/types/graph-studio'

export interface GraphProjectLineageContext {
  analysisId?: string
  sourceRefs: GraphSourceRef[]
  provenanceEdges: ProjectProvenanceEdge[]
  lineageMode: GraphLineageMode
  sourceSchema?: Array<Pick<ColumnMeta, 'name' | 'type'>>
  sourceSnapshot?: GraphSourceSnapshot
}

function collectReferencedFields(spec: ChartSpec): string[] {
  const fields: Array<string | undefined> = [
    spec.encoding.x?.field,
    spec.encoding.y?.field,
    spec.encoding.y2?.field,
    spec.encoding.color?.field,
    spec.facet?.field,
    ...(spec.aggregate?.groupBy ?? []),
  ]

  return [...new Set(fields.filter((field): field is string => Boolean(field)))]
}

function hashSnapshotValue(value: string): string {
  let hash = 5381
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index)
  }
  return Math.abs(hash >>> 0).toString(36)
}

function buildSchemaFingerprint(columns: readonly Pick<ColumnMeta, 'name' | 'type'>[]): string {
  return hashSnapshotValue(JSON.stringify(columns))
}

function buildSourceFingerprint(input: {
  rowCount: number
  columnPreviews: Array<Pick<ColumnMeta, 'name' | 'type' | 'sampleValues'>>
  sourceRefs: readonly GraphSourceRef[]
  referencedFields: readonly string[]
}): string {
  return hashSnapshotValue(JSON.stringify({
    rowCount: input.rowCount,
    columnPreviews: input.columnPreviews,
    sourceRefs: input.sourceRefs,
    referencedFields: input.referencedFields,
  }))
}

function getDataPackageRowCount(dataPackage: DataPackage): number {
  return Object.values(dataPackage.data).reduce((maxRowCount, columnValues) => {
    if (!Array.isArray(columnValues)) {
      return maxRowCount
    }
    return Math.max(maxRowCount, columnValues.length)
  }, 0)
}

export function didGraphDataPackageChange(
  currentProject: GraphProject | null,
  dataPackage: DataPackage | null,
): boolean {
  return currentProject !== null
    && dataPackage !== null
    && currentProject.dataPackageId !== dataPackage.id
}

export function getDataPackageSourceRefs(
  dataPackage: Pick<DataPackage, 'sourceRefs' | 'analysisResultId' | 'label'>,
): GraphSourceRef[] {
  if (dataPackage.sourceRefs && dataPackage.sourceRefs.length > 0) {
    return dataPackage.sourceRefs.map((sourceRef) => ({ ...sourceRef }))
  }

  if (dataPackage.analysisResultId) {
    return [{
      kind: 'analysis',
      sourceId: dataPackage.analysisResultId,
      label: dataPackage.label,
    }]
  }

  return []
}

export function getGraphProjectAnalysisSourceRefs(
  graph: Pick<GraphProject, 'sourceRefs' | 'sourceSnapshot' | 'analysisId' | 'name'>,
): GraphSourceRef[] {
  const canonicalSourceRefs = (graph.sourceRefs ?? [])
    .filter((sourceRef) => sourceRef.kind === 'analysis')
    .map((sourceRef) => ({ ...sourceRef }))

  if (canonicalSourceRefs.length > 0) {
    return canonicalSourceRefs
  }

  const snapshotSourceRefs = (graph.sourceSnapshot?.sourceRefs ?? [])
    .filter((sourceRef) => sourceRef.kind === 'analysis')
    .map((sourceRef) => ({ ...sourceRef }))

  if (snapshotSourceRefs.length > 0) {
    return snapshotSourceRefs
  }

  if (!graph.analysisId) {
    return []
  }

  return [{
    kind: 'analysis',
    sourceId: graph.analysisId,
    label: graph.name,
  }]
}

export function resolveGraphProjectAnalysisId(
  currentProject: GraphProject | null,
  dataPackage: DataPackage | null,
): string | undefined {
  const sourceRefs = resolveGraphProjectSourceRefs(currentProject, dataPackage)
  return sourceRefs.find((sourceRef) => sourceRef.kind === 'analysis')?.sourceId
}

export function resolveGraphProjectSourceRefs(
  currentProject: GraphProject | null,
  dataPackage: DataPackage | null,
): GraphSourceRef[] {
  const dataPackageChanged = didGraphDataPackageChange(currentProject, dataPackage)
  const currentSourceRefs =
    !dataPackageChanged && currentProject?.sourceRefs && currentProject.sourceRefs.length > 0
      ? currentProject.sourceRefs.map((sourceRef) => ({ ...sourceRef }))
      : []
  const dataPackageSourceRefs = dataPackage ? getDataPackageSourceRefs(dataPackage) : []

  if (currentSourceRefs.length > 0) {
    if (dataPackageSourceRefs.length === 0) {
      return currentSourceRefs
    }

    const mergedSourceRefs = [...currentSourceRefs]
    const seen = new Set(currentSourceRefs.map((sourceRef) => `${sourceRef.kind}:${sourceRef.sourceId}`))
    for (const sourceRef of dataPackageSourceRefs) {
      const key = `${sourceRef.kind}:${sourceRef.sourceId}`
      if (seen.has(key)) {
        continue
      }
      seen.add(key)
      mergedSourceRefs.push({ ...sourceRef })
    }
    return mergedSourceRefs
  }

  if (dataPackageSourceRefs.length > 0) {
    return dataPackageSourceRefs
  }

  if (!dataPackageChanged && currentProject) {
    const analysisSourceRefs = getGraphProjectAnalysisSourceRefs(currentProject)
    if (analysisSourceRefs.length > 0) {
      return analysisSourceRefs
    }
  }

  if (dataPackage) {
    return [{
      kind: 'data-package',
      sourceId: dataPackage.id,
      label: dataPackage.label,
    }]
  }

  return []
}

export function resolveGraphProjectLineageMode(
  currentProject: GraphProject | null,
  dataPackage: DataPackage | null,
  sourceRefs: readonly GraphSourceRef[],
): GraphLineageMode {
  if (dataPackage?.lineageMode) {
    return dataPackage.lineageMode
  }

  if (currentProject?.lineageMode) {
    return currentProject.lineageMode
  }

  if (sourceRefs.length > 1) {
    return 'mixed'
  }

  return sourceRefs.length === 1 ? 'derived' : 'manual'
}

export function buildGraphProjectSourceSchema(
  currentProject: GraphProject | null,
  dataPackage: DataPackage | null,
): Array<Pick<ColumnMeta, 'name' | 'type'>> | undefined {
  if (dataPackage && dataPackage.columns.length > 0) {
    return dataPackage.columns.map((column) => ({
      name: column.name,
      type: column.type,
    }))
  }

  if (currentProject?.sourceSchema && currentProject.sourceSchema.length > 0) {
    return currentProject.sourceSchema.map((column) => ({ ...column }))
  }

  return undefined
}

export function buildGraphProjectProvenanceEdges(
  sourceRefs: readonly GraphSourceRef[],
): ProjectProvenanceEdge[] {
  return sourceRefs
    .flatMap((sourceRef): ProjectProvenanceEdge[] => {
      if (sourceRef.kind === 'upload' || sourceRef.kind === 'data-package') {
        return []
      }

      if (sourceRef.sourceId.trim().length === 0) {
        return []
      }

      return [{
        role: 'derived-from',
        targetKind: sourceRef.kind as ProjectEntityKind,
        targetId: sourceRef.sourceId,
        label: sourceRef.label,
      }]
    })
}

export function buildGraphProjectSourceSnapshot(
  currentProject: GraphProject | null,
  dataPackage: DataPackage | null,
  sourceRefs: readonly GraphSourceRef[],
  chartSpec: ChartSpec,
  capturedAt: string,
): GraphSourceSnapshot | undefined {
  if (dataPackage) {
    const columns = dataPackage.columns.map((column) => ({
      name: column.name,
      type: column.type,
    }))
    const columnPreviews = dataPackage.columns.map((column) => ({
      name: column.name,
      type: column.type,
      sampleValues: column.sampleValues.slice(0, 3),
    }))
    const referencedFields = collectReferencedFields(chartSpec)
    const rowCount = getDataPackageRowCount(dataPackage)

    return {
      capturedAt,
      dataPackageId: dataPackage.id,
      rowCount,
      columns,
      sourceRefs: sourceRefs.map((sourceRef) => ({ ...sourceRef })),
      columnPreviews,
      referencedFields,
      schemaFingerprint: buildSchemaFingerprint(columns),
      sourceFingerprint: buildSourceFingerprint({
        rowCount,
        columnPreviews,
        sourceRefs,
        referencedFields,
      }),
    }
  }

  if (currentProject?.sourceSnapshot) {
    return {
      capturedAt: currentProject.sourceSnapshot.capturedAt,
      dataPackageId: currentProject.sourceSnapshot.dataPackageId,
      rowCount: currentProject.sourceSnapshot.rowCount,
      columns: currentProject.sourceSnapshot.columns.map((column) => ({ ...column })),
      sourceRefs: currentProject.sourceSnapshot.sourceRefs.map((sourceRef) => ({ ...sourceRef })),
      columnPreviews: currentProject.sourceSnapshot.columnPreviews?.map((column) => ({
        ...column,
        sampleValues: [...column.sampleValues],
      })),
      referencedFields: currentProject.sourceSnapshot.referencedFields
        ? [...currentProject.sourceSnapshot.referencedFields]
        : undefined,
      schemaFingerprint: currentProject.sourceSnapshot.schemaFingerprint,
      sourceFingerprint: currentProject.sourceSnapshot.sourceFingerprint,
    }
  }

  return undefined
}

export function resolveGraphProjectLineage(
  currentProject: GraphProject | null,
  dataPackage: DataPackage | null,
  chartSpec: ChartSpec,
  capturedAt: string,
): GraphProjectLineageContext {
  const sourceRefs = resolveGraphProjectSourceRefs(currentProject, dataPackage)

  return {
    analysisId: resolveGraphProjectAnalysisId(currentProject, dataPackage),
    sourceRefs,
    provenanceEdges: buildGraphProjectProvenanceEdges(sourceRefs),
    lineageMode: resolveGraphProjectLineageMode(currentProject, dataPackage, sourceRefs),
    sourceSchema: buildGraphProjectSourceSchema(currentProject, dataPackage),
    sourceSnapshot: buildGraphProjectSourceSnapshot(
      currentProject,
      dataPackage,
      sourceRefs,
      chartSpec,
      capturedAt,
    ),
  }
}
