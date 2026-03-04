/**
 * Graph Studio Zustand Store
 *
 * 독립 모듈 store — Smart Flow store와 완전 분리
 */

import { create } from 'zustand';
import type {
  AiPanelDock,
  ChartSpec,
  DataPackage,
  ExportConfig,
  GraphProject,
  GraphStudioState,
} from '@/types/graph-studio';
import { createChartSpecFromDataPackage } from '@/lib/graph-studio/chart-spec-utils';
import {
  saveProject,
  generateProjectId,
} from '@/lib/graph-studio/project-storage';

interface GraphStudioActions {
  // 데이터
  /** DataPackage 로드 + 초기 ChartSpec 자동 생성 (원자적 단일 액션) */
  loadDataPackage: (pkg: DataPackage) => void;
  /** DataPackage + 사전에 계산된 ChartSpec을 단일 set()으로 원자적 등록 (중간 렌더 방지) */
  loadDataPackageWithSpec: (pkg: DataPackage, spec: ChartSpec) => void;
  clearData: () => void;

  // chartSpec
  setChartSpec: (spec: ChartSpec) => void;
  updateChartSpec: (spec: ChartSpec) => void;
  /** exportConfig 변경 — undo history에 추가하지 않음 (출력 설정이므로) */
  setExportConfig: (config: ExportConfig) => void;
  undo: () => void;
  redo: () => void;

  // UI
  setSidePanel: (panel: GraphStudioState['sidePanel']) => void;
  toggleAiPanel: () => void;
  setAiPanelDock: (dock: AiPanelDock) => void;

  // 프로젝트
  setProject: (project: GraphProject, dataPackage?: DataPackage) => void;
  /** 현재 chartSpec을 프로젝트로 저장 (localStorage). 생성된 projectId 반환, 실패 시 null */
  saveCurrentProject: (name: string) => string | null;
  resetAll: () => void;
}

const initialState: GraphStudioState = {
  currentProject: null,
  dataPackage: null,
  isDataLoaded: false,
  chartSpec: null,
  specHistory: [],
  historyIndex: -1,
  sidePanel: 'data',
  aiPanelOpen: false,
  aiPanelDock: 'bottom',
};

const MAX_HISTORY = 50;

export const useGraphStudioStore = create<GraphStudioState & GraphStudioActions>(
  (set, get) => ({
    ...initialState,

    // ── 데이터 ──

    loadDataPackage: (pkg) => {
      const spec = createChartSpecFromDataPackage(pkg);
      set({
        dataPackage: pkg,
        isDataLoaded: true,
        chartSpec: spec,
        specHistory: [spec],
        historyIndex: 0,
      });
    },

    loadDataPackageWithSpec: (pkg, spec) => set({
      dataPackage: pkg,
      isDataLoaded: true,
      chartSpec: spec,
      specHistory: [spec],
      historyIndex: 0,
    }),

    clearData: () => set({
      dataPackage: null,
      isDataLoaded: false,
      chartSpec: null,
      specHistory: [],
      historyIndex: -1,
    }),

    // ── chartSpec ──

    setChartSpec: (spec) => set({
      chartSpec: spec,
      specHistory: [spec],
      historyIndex: 0,
    }),

    updateChartSpec: (spec) => {
      const { specHistory, historyIndex } = get();
      // 현재 위치 이후의 히스토리 제거 (새 분기)
      const newHistory = specHistory.slice(0, historyIndex + 1);
      newHistory.push(spec);

      // 히스토리 상한
      while (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }

      set({
        chartSpec: spec,
        specHistory: newHistory,
        historyIndex: newHistory.length - 1,
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
      set({
        // undo와 동일 이유: exportConfig는 redo 대상이 아님
        chartSpec: chartSpec
          ? { ...snapshot, exportConfig: chartSpec.exportConfig }
          : snapshot,
        historyIndex: newIndex,
      });
    },

    // ── UI ──

    setSidePanel: (panel) => set({ sidePanel: panel }),
    toggleAiPanel: () => set(state => ({ aiPanelOpen: !state.aiPanelOpen })),
    setAiPanelDock: (dock) => set({ aiPanelDock: dock }),

    // ── 프로젝트 ──

    setProject: (project, dataPackage) => {
      // 구버전 exportConfig 마이그레이션: width/height/transparent는 삭제됨.
      // localStorage 직렬화 객체에는 런타임에 알 수 없는 키가 있을 수 있으므로
      // format/dpi만 명시적으로 추출해 정규화한다.
      const raw = project.chartSpec;
      const spec: ChartSpec = {
        ...raw,
        exportConfig: {
          format: raw.exportConfig.format,
          dpi: raw.exportConfig.dpi,
          // physicalWidth/Height는 신규 필드이므로 보존 (undefined면 포함 안 함)
          ...(raw.exportConfig.physicalWidth !== undefined && { physicalWidth: raw.exportConfig.physicalWidth }),
          ...(raw.exportConfig.physicalHeight !== undefined && { physicalHeight: raw.exportConfig.physicalHeight }),
        },
      };
      set({
        currentProject: project,
        dataPackage: dataPackage ?? null,
        isDataLoaded: dataPackage != null,
        chartSpec: spec,
        specHistory: [spec],
        historyIndex: 0,
        // 구버전 sidePanel 값('properties', 'ai-chat' 등) 마이그레이션 → 'data'
        sidePanel: 'data',
        // aiPanel 상태는 프로젝트와 독립적 — 구버전 localStorage 값 방지를 위해 초기화
        aiPanelOpen: false,
        aiPanelDock: 'bottom',
      });
    },

    saveCurrentProject: (name) => {
      const { chartSpec, dataPackage, currentProject } = get();
      if (!chartSpec) return null;

      const now = new Date().toISOString();
      // 기존 프로젝트가 있으면 같은 ID로 업데이트, 없으면 새로 생성
      const projectId = currentProject?.id ?? generateProjectId();
      const project: GraphProject = {
        id: projectId,
        name,
        chartSpec,
        dataPackageId: dataPackage?.id ?? '',
        editHistory: currentProject?.editHistory ?? [],
        createdAt: currentProject?.createdAt ?? now,
        updatedAt: now,
      };

      saveProject(project);
      set({ currentProject: project });
      return projectId;
    },

    resetAll: () => set(initialState),
  }),
);
