/**
 * Graph Studio Zustand Store
 *
 * 독립 모듈 store — Smart Flow store와 완전 분리
 */

import { create } from 'zustand';
import type {
  ChartSpec,
  DataPackage,
  GraphProject,
  AiEditResponse,
  GraphStudioState,
} from '@/types/graph-studio';

interface GraphStudioActions {
  // 데이터
  setDataPackage: (pkg: DataPackage) => void;
  clearData: () => void;

  // chartSpec
  setChartSpec: (spec: ChartSpec) => void;
  updateChartSpec: (spec: ChartSpec) => void;
  undo: () => void;
  redo: () => void;

  // AI
  setAiEditing: (editing: boolean) => void;
  setLastAiResponse: (response: AiEditResponse) => void;

  // Export
  setExporting: (exporting: boolean) => void;
  setExportProgress: (progress: number) => void;

  // UI
  setPreviewMode: (mode: 'vega' | 'matplotlib') => void;
  setSidePanel: (panel: GraphStudioState['sidePanel']) => void;

  // 프로젝트
  setProject: (project: GraphProject) => void;
  resetAll: () => void;
}

const initialState: GraphStudioState = {
  currentProject: null,
  dataPackage: null,
  isDataLoaded: false,
  chartSpec: null,
  specHistory: [],
  historyIndex: -1,
  isAiEditing: false,
  lastAiResponse: null,
  isExporting: false,
  exportProgress: 0,
  previewMode: 'vega',
  sidePanel: 'properties',
};

const MAX_HISTORY = 50;

export const useGraphStudioStore = create<GraphStudioState & GraphStudioActions>(
  (set, get) => ({
    ...initialState,

    // ── 데이터 ──

    setDataPackage: (pkg) => set({
      dataPackage: pkg,
      isDataLoaded: true,
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
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }

      set({
        chartSpec: spec,
        specHistory: newHistory,
        historyIndex: newHistory.length - 1,
      });
    },

    undo: () => {
      const { specHistory, historyIndex } = get();
      if (historyIndex <= 0) return;
      const newIndex = historyIndex - 1;
      set({
        chartSpec: specHistory[newIndex],
        historyIndex: newIndex,
      });
    },

    redo: () => {
      const { specHistory, historyIndex } = get();
      if (historyIndex >= specHistory.length - 1) return;
      const newIndex = historyIndex + 1;
      set({
        chartSpec: specHistory[newIndex],
        historyIndex: newIndex,
      });
    },

    // ── AI ──

    setAiEditing: (editing) => set({ isAiEditing: editing }),
    setLastAiResponse: (response) => set({ lastAiResponse: response }),

    // ── Export ──

    setExporting: (exporting) => set({ isExporting: exporting }),
    setExportProgress: (progress) => set({ exportProgress: progress }),

    // ── UI ──

    setPreviewMode: (mode) => set({ previewMode: mode }),
    setSidePanel: (panel) => set({ sidePanel: panel }),

    // ── 프로젝트 ──

    setProject: (project) => set({
      currentProject: project,
      chartSpec: project.chartSpec,
      specHistory: [project.chartSpec],
      historyIndex: 0,
    }),

    resetAll: () => set(initialState),
  }),
);
