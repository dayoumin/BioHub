/**
 * localStorage / sessionStorage 키 중앙 레지스트리
 *
 * 모든 스토리지 키를 한 곳에서 관리한다.
 * 키 값 자체는 기존 사용자 데이터와의 호환성을 위해 변경하지 않는다.
 *
 * 사용법:
 *   import { STORAGE_KEYS } from '@/lib/constants/storage-keys'
 *   localStorage.getItem(STORAGE_KEYS.genetics.history)
 */

// ─── localStorage ────────────────────────────────────────

export const STORAGE_KEYS = {
  // Bio-Tools
  bioTools: {
    history: 'biohub:bio-tools:history',
  },

  // Genetics
  genetics: {
    history: 'biohub:genetics:history',
  },

  // Graph Studio
  graphStudio: {
    projects: 'graph_studio_projects',
    styleTemplates: 'graph_studio_style_templates',
    aiChat: 'graph_studio_ai_chat',
  },

  // Research
  research: {
    projects: 'research_projects',
    projectEntityRefs: 'research_project_entity_refs',
    tabSettings: 'biohub:project-tab-settings',
    paperPackages: 'paper_packages',
  },

  // Analysis
  analysis: {
    quickMethods: 'analysis-quick-methods',
    quickAnalysis: 'main-hub-quick-analysis',
    pinnedHistory: 'analysis-history-pinned',
    recentFiles: 'statPlatform_recentFiles',
    recentStatistics: 'statPlatform_recent',
  },

  // RAG / Ollama
  rag: {
    ollamaEndpoint: 'statPlatform_ollamaEndpoint',
    embeddingModel: 'statPlatform_embeddingModel',
    inferenceModel: 'statPlatform_inferenceModel',
    topK: 'statPlatform_topK',
  },

  // Device / System
  device: {
    id: 'biohub_device_id',
    /** @deprecated statPlatform_deviceId → biohub_device_id 마이그레이션 후 제거 */
    legacyId: 'statPlatform_deviceId',
  },

  // Settings
  settings: {
    localStorageEnabled: 'statPlatform_localStorageEnabled',
    notifyAnalysisComplete: 'statPlatform_notifyAnalysisComplete',
    notifyError: 'statPlatform_notifyError',
    favorites: 'statPlatform_favorites',
  },

  // UI State
  ui: {
    theme: 'stats-theme',
    sidebar: 'biohub-sidebar',
    pyodideLoaded: 'pyodide-loaded',
    terminologyDomain: 'terminology-domain',
    environmentCache: 'environment-info-cache',
  },

  // Multi-tab
  multiTab: {
    activeTab: 'app-active-tab',
    heartbeat: 'app-tab-heartbeat',
  },
} as const

// ─── sessionStorage ──────────────────────────────────────

export const SESSION_STORAGE_KEYS = {
  genetics: {
    sequenceTransfer: 'biohub:sequence-transfer',
  },
  analysis: {
    cache: 'analysis-storage',
  },
} as const
