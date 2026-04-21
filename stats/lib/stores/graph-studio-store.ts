/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Graph Studio Zustand Store
 *
 * 독립 모듈 store — Smart Flow store와 완전 분리
 */

import { create } from 'zustand';
import type {
  AiPanelDock,
  ChartSpec,
  ColumnMeta,
  DataPackage,
  DataType,
  ExportConfig,
  GraphColumnTypeMismatch,
  GraphProject,
  GraphRelinkWarning,
  GraphSourceRef,
  GraphLineageMode,
  GraphStudioState,
} from '@/types/graph-studio';
import {
  createChartSpecFromDataPackage,
  sanitizeChartSpecForRenderer,
} from '@/lib/graph-studio/chart-spec-utils';
import {
  deleteProjectCascade,
  saveProject,
  generateProjectId,
} from '@/lib/graph-studio/project-storage';
import {
  buildGraphProjectProvenanceEdges,
  buildGraphProjectSourceSnapshot,
  getDataPackageSourceRefs,
  normalizePersistedGraphProject,
  resolveDataPackageAnalysisResultId,
  resolveGraphProjectLineage,
  resolveGraphProjectSourceRefs,
} from '@/lib/graph-studio/project-lineage';
import { deleteSnapshots } from '@/lib/graph-studio/chart-snapshot-storage';
import { upsertProjectEntityRef, removeProjectEntityRefsByEntityIds } from '@/lib/research/project-storage';

import { STORAGE_KEYS } from '@/lib/constants/storage-keys'

/** AI 채팅 localStorage 키 (use-ai-chat.ts의 CHAT_STORAGE_KEY와 동일) */
const AI_CHAT_STORAGE_KEY = STORAGE_KEYS.graphStudio.aiChat;

/** 데이터 변경 시 AI 채팅 이력 초기화 */
function clearAiChatHistory(activeDraftSourceId: string | null): void {
  if (typeof window === 'undefined') return;
  const keysToRemove = [
    AI_CHAT_STORAGE_KEY,
    ...(activeDraftSourceId ? [`${AI_CHAT_STORAGE_KEY}:draft:${activeDraftSourceId}`] : []),
  ];

  keysToRemove.forEach((key) => {
    localStorage.removeItem(key);
  });
}

interface LoadDataPackageWithSpecOptions {
  preserveCurrentProject?: boolean;
}

interface ProjectRelinkCompatibility {
  isCompatible: boolean;
  missingFields: string[];
  extraFields: string[];
  typeMismatches: GraphColumnTypeMismatch[];
  semanticMismatchFields: string[];
}

function cleanupEvictedProjects(evictedIds: readonly string[]): void {
  if (evictedIds.length === 0) {
    return;
  }

  const ids = [...evictedIds];
  deleteSnapshots(ids).catch(console.error);
  try {
    removeProjectEntityRefsByEntityIds('figure', ids);
  } catch (err) {
    console.error('[GraphStudioStore] Failed to remove evicted entity refs:', err);
  }
}

function collectReferencedFields(spec: ChartSpec): string[] {
  const fields: Array<string | undefined> = [
    spec.encoding.x?.field,
    spec.encoding.y?.field,
    spec.encoding.y2?.field,
    spec.encoding.color?.field,
    spec.facet?.field,
    ...(spec.aggregate?.groupBy ?? []),
  ];

  return [...new Set(fields.filter((field): field is string => Boolean(field)))];
}

function normalizeSampleValue(value: string): string {
  return value.trim().toLowerCase();
}

function hasSampleValueOverlap(expected: readonly string[], actual: readonly string[]): boolean {
  const expectedValues = expected
    .map(normalizeSampleValue)
    .filter((value) => value.length > 0);
  const actualValues = new Set(
    actual
      .map(normalizeSampleValue)
      .filter((value) => value.length > 0),
  );

  if (expectedValues.length === 0 || actualValues.size === 0) {
    return true;
  }

  return expectedValues.some((value) => actualValues.has(value));
}

function buildColumnMetaMap(columns: readonly ColumnMeta[]): Map<string, ColumnMeta> {
  return new Map(columns.map((column) => [column.name, column]));
}

function getProjectRelinkCompatibility(
  spec: ChartSpec,
  pkg: DataPackage,
): ProjectRelinkCompatibility {
  const expectedColumns = spec.data.columns;
  const expectedMap = buildColumnMetaMap(expectedColumns);
  const actualMap = buildColumnMetaMap(pkg.columns);
  const referencedFields = collectReferencedFields(spec);

  const missingFields = referencedFields.filter((field) => !actualMap.has(field));
  const typeMismatches: GraphColumnTypeMismatch[] = referencedFields.flatMap((field) => {
    const expected = expectedMap.get(field);
    const actual = actualMap.get(field);

    if (!expected || !actual || expected.type === actual.type) {
      return [];
    }

    return [{ field, expected: expected.type, actual: actual.type }];
  });

  const extraFields =
    expectedColumns.length === 0
      ? []
      : pkg.columns
        .filter((column) => !expectedMap.has(column.name))
        .map((column) => column.name);

  const schemaMissingFields =
    expectedColumns.length === 0
      ? []
      : expectedColumns
        .filter((column) => !actualMap.has(column.name))
        .map((column) => column.name);

  const semanticMismatchFields = referencedFields.filter((field) => {
    const expected = expectedMap.get(field);
    const actual = actualMap.get(field);

    if (!expected || !actual) {
      return false;
    }

    if (expected.type === 'quantitative' || actual.type === 'quantitative') {
      return false;
    }

    return !hasSampleValueOverlap(expected.sampleValues, actual.sampleValues);
  });

  return {
    isCompatible:
      schemaMissingFields.length === 0 &&
      missingFields.length === 0 &&
      typeMismatches.length === 0 &&
      semanticMismatchFields.length === 0,
    missingFields: [...new Set([...schemaMissingFields, ...missingFields])],
    extraFields,
    typeMismatches,
    semanticMismatchFields,
  };
}


interface GraphStudioActions {
  // 데이터
  /** DataPackage 로드 + 초기 ChartSpec 자동 생성 (원자적 단일 액션) */
  loadDataPackage: (pkg: DataPackage) => void;
  /** DataPackage + 사전에 계산된 ChartSpec을 단일 set()으로 원자적 등록 (중간 렌더 방지) */
  loadDataPackageWithSpec: (
    pkg: DataPackage,
    spec: ChartSpec,
    options?: LoadDataPackageWithSpecOptions,
  ) => void;
  /** DataPackage만 로드 (ChartSpec 미생성) — 차트 설정 단계용 */
  loadDataOnly: (pkg: DataPackage) => void;
  clearData: () => void;

  // chartSpec
  setChartSpec: (spec: ChartSpec) => void;
  updateChartSpec: (spec: ChartSpec) => void;
  /** exportConfig 변경 — undo history에 추가하지 않음 (출력 설정이므로) */
  setExportConfig: (config: ExportConfig) => void;
  undo: () => void;
  redo: () => void;

  // 네비게이션
  /** 에디터→설정 이동: chartSpec 제거 + previousChartSpec에 보관 (dataPackage 유지) */
  goToSetup: () => void;
  restorePreviousChartSpec: () => void;

  // UI
  toggleAiPanel: () => void;
  setAiPanelDock: (dock: AiPanelDock) => void;
  /** Step 1에서 미리 선택한 스타일 템플릿 ID 설정 */
  setPendingTemplateId: (id: string | null) => void;
  clearRelinkWarning: () => void;

  // 프로젝트
  setProject: (project: GraphProject, dataPackage?: DataPackage) => void;
  /** 현재 chartSpec을 프로젝트로 저장 (localStorage). 생성된 projectId 반환, 실패 시 null */
  saveCurrentProject: (name: string) => string | null;
  /** 현재 프로젝트 연결 해제 — 데이터 교체 후 기존 프로젝트 덮어쓰기 방지 */
  disconnectProject: () => void;
  /** 삭제/유실된 프로젝트와의 세션 바인딩을 완전히 제거 */
  detachMissingProject: () => void;
  resetAll: () => void;
}

const initialState: GraphStudioState = {
  currentProject: null,
  linkedResearchProjectId: null,
  relinkWarning: null,
  dataPackage: null,
  isDataLoaded: false,
  chartSpec: null,
  specHistory: [],
  historyIndex: -1,
  previousChartSpec: null,
  aiPanelOpen: false,
  aiPanelDock: 'bottom',
  pendingTemplateId: null,
};

const MAX_HISTORY = 50;

function buildRelinkWarning(
  project: GraphProject,
  dataPackage: DataPackage,
  spec: ChartSpec,
  compatibility: ProjectRelinkCompatibility,
): GraphRelinkWarning {
  const nextSnapshot = buildGraphProjectSourceSnapshot(
    project,
    dataPackage,
    resolveGraphProjectSourceRefs(project, dataPackage),
    spec,
    new Date().toISOString(),
  );

  return {
    projectId: project.id,
    projectName: project.name,
    missingFields: compatibility.missingFields,
    extraFields: compatibility.extraFields,
    typeMismatches: compatibility.typeMismatches,
    semanticMismatchFields: compatibility.semanticMismatchFields,
    previousSchemaFingerprint: project.sourceSnapshot?.schemaFingerprint,
    nextSchemaFingerprint: nextSnapshot?.schemaFingerprint,
    previousSourceFingerprint: project.sourceSnapshot?.sourceFingerprint,
    nextSourceFingerprint: nextSnapshot?.sourceFingerprint,
  };
}

function normalizeDataPackage(dataPackage: DataPackage): DataPackage {
  const sourceRefs = getDataPackageSourceRefs(dataPackage)
  const compatAnalysisResultId = resolveDataPackageAnalysisResultId(dataPackage)
  const inferredLineageMode: GraphLineageMode = sourceRefs.length > 1
    ? 'mixed'
    : sourceRefs.length === 1
      ? 'derived'
      : (dataPackage.lineageMode ?? 'manual')
  const shouldNormalize =
    sourceRefs.length > 0
    || dataPackage.lineageMode !== inferredLineageMode
    || dataPackage.analysisResultId !== compatAnalysisResultId

  if (!shouldNormalize) {
    return dataPackage
  }

  return {
    ...dataPackage,
    ...(sourceRefs.length > 0 ? { sourceRefs } : {}),
    analysisResultId: compatAnalysisResultId,
    lineageMode: inferredLineageMode,
  }
}

function normalizeGraphProject(
  project: GraphProject,
  dataPackage?: DataPackage,
): GraphProject {
  return normalizePersistedGraphProject(project, dataPackage ?? null)
}

export const useGraphStudioStore = create<GraphStudioState & GraphStudioActions>(
  (set, get) => ({
    ...initialState,

    // ── 데이터 ──

    loadDataPackage: (pkg) => {
      const normalizedPkg = normalizeDataPackage(pkg);
      const { chartSpec, currentProject } = get();
      const existingSpec = chartSpec ? sanitizeChartSpecForRenderer(chartSpec) : null;

      // 프로젝트 복원 모드: ?project= 경유로 setProject가 호출된 뒤 데이터만 재업로드.
      // 기존 chartSpec을 보존하되 dataSourceId만 갱신한다.
      // 동일 필드명만으로 재부착하지 않고, 참조 필드/컬럼 스키마/범주 샘플값 호환성까지 본다.
      if (currentProject && existingSpec) {
        const compatibility = getProjectRelinkCompatibility(existingSpec, normalizedPkg);

        if (compatibility.isCompatible) {
          const restoredSpec: ChartSpec = {
            ...existingSpec,
            data: { ...existingSpec.data, sourceId: normalizedPkg.id },
          };
          set({
            dataPackage: normalizedPkg,
            linkedResearchProjectId: currentProject.projectId ?? normalizedPkg.projectId ?? null,
            isDataLoaded: true,
            chartSpec: restoredSpec,
            specHistory: [restoredSpec],
            historyIndex: 0,
            previousChartSpec: null,
            relinkWarning: null,
            aiPanelOpen: false,
          });
          return;
        }
        console.warn(
          '[graph-studio-store] 프로젝트 데이터 호환성 불일치 — 프로젝트 연결을 해제합니다.',
          {
            projectName: currentProject.name,
            missingFields: compatibility.missingFields,
            extraFields: compatibility.extraFields,
            typeMismatches: compatibility.typeMismatches,
            semanticMismatchFields: compatibility.semanticMismatchFields,
          },
        );
        const relinkWarning = buildRelinkWarning(currentProject, normalizedPkg, existingSpec, compatibility);
        set({
          relinkWarning,
        });
      }

      const spec = createChartSpecFromDataPackage(normalizedPkg);
      set({
        dataPackage: normalizedPkg,
        linkedResearchProjectId: normalizedPkg.projectId ?? null,
        isDataLoaded: true,
        chartSpec: spec,
        specHistory: [spec],
        historyIndex: 0,
        previousChartSpec: null,
        relinkWarning: currentProject ? get().relinkWarning : null,
        // encoding 불일치로 fall-through한 경우 currentProject 해제
        currentProject: null,
        aiPanelOpen: false,
      });
    },

    loadDataPackageWithSpec: (pkg, spec, options) => {
      const normalizedPkg = normalizeDataPackage(pkg);
      const preservedProject = get().currentProject
      const currentProject = options?.preserveCurrentProject
        ? (preservedProject ? normalizeGraphProject(preservedProject, normalizedPkg) : null)
        : null;
      const linkedResearchProjectId = options?.preserveCurrentProject
        ? get().linkedResearchProjectId
        : normalizedPkg.projectId ?? null;
      const sanitizedSpec = sanitizeChartSpecForRenderer(spec);
      set({
        dataPackage: normalizedPkg,
        linkedResearchProjectId,
        relinkWarning: null,
        isDataLoaded: true,
        chartSpec: sanitizedSpec,
        specHistory: [sanitizedSpec],
        historyIndex: 0,
        currentProject,
        aiPanelOpen: false,
        previousChartSpec: null, // 소비 완료
      });
    },

    loadDataOnly: (pkg) => {
      const normalizedPkg = normalizeDataPackage(pkg);
      const { chartSpec, dataPackage, currentProject } = get();
      const activeDraftSourceId = currentProject
        ? null
        : chartSpec?.data.sourceId ?? dataPackage?.id ?? null;
      clearAiChatHistory(activeDraftSourceId);
      set({
        dataPackage: normalizedPkg,
        linkedResearchProjectId: normalizedPkg.projectId ?? null,
        relinkWarning: null,
        isDataLoaded: true,
        chartSpec: null,
        specHistory: [],
        historyIndex: -1,
        currentProject: null,
        aiPanelOpen: false,
        previousChartSpec: null, // 데이터 불일치 방지
      });
    },

    clearData: () => {
      const { chartSpec, dataPackage, currentProject } = get();
      const activeDraftSourceId = currentProject
        ? null
        : chartSpec?.data.sourceId ?? dataPackage?.id ?? null;
      clearAiChatHistory(activeDraftSourceId);
      set({
        dataPackage: null,
        linkedResearchProjectId: null,
        relinkWarning: null,
        isDataLoaded: false,
        chartSpec: null,
        specHistory: [],
        historyIndex: -1,
        currentProject: null,
        aiPanelOpen: false,
        previousChartSpec: null, // 세션 리셋
      });
    },

    // ── chartSpec ──

    setChartSpec: (spec) => {
      const sanitizedSpec = sanitizeChartSpecForRenderer(spec);
      set({
        chartSpec: sanitizedSpec,
        specHistory: [sanitizedSpec],
        historyIndex: 0,
        relinkWarning: null,
      });
    },

    updateChartSpec: (spec) => {
      const { specHistory, historyIndex } = get();
      const sanitizedSpec = sanitizeChartSpecForRenderer(spec);
      // 현재 위치 이후의 히스토리 제거 (새 분기)
      const newHistory = specHistory.slice(0, historyIndex + 1);
      newHistory.push(sanitizedSpec);

      // 히스토리 상한
      while (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }

      set({
        chartSpec: sanitizedSpec,
        specHistory: newHistory,
        historyIndex: newHistory.length - 1,
        relinkWarning: null,
      });
    },

    setExportConfig: (config) => {
      const { chartSpec } = get();
      if (!chartSpec) return;
      // specHistory를 건드리지 않음 — export 설정은 undo 대상이 아님
      set({ chartSpec: { ...chartSpec, exportConfig: config } });
    },

    undo: () => {
      const { specHistory, historyIndex, chartSpec } = get();
      if (historyIndex <= 0) return;
      const newIndex = historyIndex - 1;
      const snapshot = specHistory[newIndex];
      if (!snapshot) return;
      set({
        // exportConfig(포맷/DPI/물리 크기)는 차트 편집 히스토리와 무관한 출력 설정.
        // undo로 차트 내용을 되돌려도 사용자의 출력 설정은 유지해야 하므로
        // 스냅샷 복원 후 현재 exportConfig를 덮어씀.
        // cf. setExportConfig가 specHistory를 갱신하지 않는 이유도 동일.
        chartSpec: chartSpec
          ? { ...snapshot, exportConfig: chartSpec.exportConfig }
          : snapshot,
        historyIndex: newIndex,
      });
    },

    redo: () => {
      const { specHistory, historyIndex, chartSpec } = get();
      if (historyIndex >= specHistory.length - 1) return;
      const newIndex = historyIndex + 1;
      const snapshot = specHistory[newIndex];
      if (!snapshot) return;
      set({
        // undo와 동일 이유: exportConfig는 redo 대상이 아님
        chartSpec: chartSpec
          ? { ...snapshot, exportConfig: chartSpec.exportConfig }
          : snapshot,
        historyIndex: newIndex,
      });
    },

    // ── 네비게이션 ──

    goToSetup: () => {
      const { chartSpec } = get();
      set({
        chartSpec: null,
        specHistory: [],
        historyIndex: -1,
        previousChartSpec: chartSpec, // 이전 spec 보관
        relinkWarning: null,
        aiPanelOpen: false,
      });
    },

    // ── UI ──

    restorePreviousChartSpec: () => {
      const { previousChartSpec } = get();
      if (!previousChartSpec) return;
      const sanitizedSpec = sanitizeChartSpecForRenderer(previousChartSpec);
      set({
        chartSpec: sanitizedSpec,
        specHistory: [sanitizedSpec],
        historyIndex: 0,
        previousChartSpec: null,
        relinkWarning: null,
        aiPanelOpen: false,
      });
    },

    toggleAiPanel: () => set(state => ({ aiPanelOpen: !state.aiPanelOpen })),
    setAiPanelDock: (dock) => set({ aiPanelDock: dock }),
    setPendingTemplateId: (id) => set({ pendingTemplateId: id }),
    clearRelinkWarning: () => set({ relinkWarning: null }),

    // ── 프로젝트 ──

    setProject: (project, dataPackage) => {
      const normalizedDataPackage = dataPackage ? normalizeDataPackage(dataPackage) : undefined
      const normalizedProject = normalizeGraphProject(project, normalizedDataPackage)
      // 구버전 exportConfig 마이그레이션: width/height/transparent는 삭제됨.
      // localStorage 직렬화 객체에는 런타임에 알 수 없는 키가 있을 수 있으므로
      // format/dpi만 명시적으로 추출해 정규화한다.
      const raw = normalizedProject.chartSpec;
      const spec: ChartSpec = sanitizeChartSpecForRenderer({
        ...raw,
        exportConfig: {
          format: raw.exportConfig.format,
          dpi: raw.exportConfig.dpi,
          // physicalWidth/Height는 신규 필드이므로 보존 (undefined면 포함 안 함)
          ...(raw.exportConfig.physicalWidth !== undefined && { physicalWidth: raw.exportConfig.physicalWidth }),
          ...(raw.exportConfig.physicalHeight !== undefined && { physicalHeight: raw.exportConfig.physicalHeight }),
          ...(raw.exportConfig.transparentBackground !== undefined && { transparentBackground: raw.exportConfig.transparentBackground }),
        },
      });
      set({
        currentProject: normalizedProject,
        linkedResearchProjectId: normalizedProject.projectId ?? normalizedDataPackage?.projectId ?? null,
        relinkWarning: null,
        dataPackage: normalizedDataPackage ?? null,
        isDataLoaded: normalizedDataPackage != null,
        chartSpec: spec,
        specHistory: [spec],
        historyIndex: 0,
        previousChartSpec: null, // 외부 프로젝트
        // aiPanel 상태는 프로젝트와 독립적 — 구버전 localStorage 값 방지를 위해 초기화
        aiPanelOpen: false,
        aiPanelDock: 'bottom',
      });
    },

    saveCurrentProject: (name) => {
      const { chartSpec, dataPackage, currentProject, linkedResearchProjectId } = get();
      if (!chartSpec) return null;
      const sanitizedChartSpec = sanitizeChartSpecForRenderer(chartSpec);
      const now = new Date().toISOString();
      const lineage = resolveGraphProjectLineage(
        currentProject,
        dataPackage,
        sanitizedChartSpec,
        now,
      );
      // 기존 프로젝트가 있으면 같은 ID로 업데이트, 없으면 새로 생성
      const projectId = currentProject?.id ?? generateProjectId();
      const project: GraphProject = {
        id: projectId,
        name,
        projectId: currentProject?.projectId ?? linkedResearchProjectId ?? dataPackage?.projectId ?? undefined,
        analysisId: lineage.analysisId,
        sourceRefs: lineage.sourceRefs.length > 0 ? lineage.sourceRefs : undefined,
        lineageMode: lineage.lineageMode,
        sourceSchema: lineage.sourceSchema,
        sourceSnapshot: lineage.sourceSnapshot,
        chartSpec: sanitizedChartSpec,
        dataPackageId: dataPackage?.id ?? '',
        createdAt: currentProject?.createdAt ?? now,
        updatedAt: now,
      };

      try {
        if (project.projectId) {
          upsertProjectEntityRef({
            projectId: project.projectId,
            entityKind: 'figure',
            entityId: project.id,
            label: project.name,
            provenanceEdges: lineage.provenanceEdges.length > 0 ? lineage.provenanceEdges : undefined,
          });
        }

        const evictedIds = saveProject(project);
        cleanupEvictedProjects(evictedIds);
      } catch (error) {
        console.error('[GraphStudioStore] Failed to save linked project:', error);
        if (project.projectId) {
          if (!currentProject) {
            try {
              removeProjectEntityRefsByEntityIds('figure', [project.id]);
            } catch (err) {}
          } else {
            // 메타데이터 롤백: 기존 프로젝트 이름(label)과 provenance 복구
            try {
              removeProjectEntityRefsByEntityIds('figure', [currentProject.id]);
              upsertProjectEntityRef({
                projectId: currentProject.projectId ?? project.projectId,
                entityKind: 'figure',
                entityId: currentProject.id,
                label: currentProject.name,
                provenanceEdges:
                  resolveGraphProjectSourceRefs(currentProject, null).length > 0
                    ? buildGraphProjectProvenanceEdges(resolveGraphProjectSourceRefs(currentProject, null))
                    : undefined,
              });
            } catch (err) {}
          }
        }
        try {
          if (currentProject) {
            const rollbackEvictedIds = saveProject(currentProject);
            cleanupEvictedProjects(rollbackEvictedIds);
          } else {
            deleteProjectCascade(project.id).catch(console.error);
          }
        } catch (rollbackError) {
          console.error('[GraphStudioStore] Failed to rollback linked project save:', rollbackError);
        }
        return null;
      }
      set({
        currentProject: project,
        linkedResearchProjectId: project.projectId ?? null,
        relinkWarning: null,
      });
      return projectId;
    },

    disconnectProject: () => set({ currentProject: null, relinkWarning: null }),

    detachMissingProject: () => set((state) => ({
      currentProject: null,
      linkedResearchProjectId: null,
      relinkWarning: null,
      dataPackage: state.dataPackage
        ? {
            ...state.dataPackage,
            projectId: undefined,
          }
        : null,
    })),

    resetAll: () => set(initialState),
  }),
);
