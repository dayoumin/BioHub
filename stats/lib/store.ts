import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// Types
export interface Dataset {
  id: string
  name: string
  description: string
  format: string
  size: string
  rows: number
  columns: number
  status: 'active' | 'processed' | 'error'
  uploadedAt: Date
  data?: Record<string, unknown>[]
}

/**
 * 분석 히스토리 저장용 인터페이스
 * (Smart Flow의 AnalysisResult와는 다른 구조)
 */
export interface AnalysisHistoryRecord {
  id: string
  datasetId: string
  datasetName: string
  testType: string
  testName: string
  method: string
  parameters: Record<string, unknown>
  results: {
    testStatistic: number
    pValue: number
    effectSize: number | null
    confidenceInterval: [number, number] | null
    conclusion: string
    interpretation: string
    rawOutput?: Record<string, unknown>
  }
  assumptions: {
    normality: { passed: boolean; pValue: number; test: string }[]
    homogeneity: { passed: boolean; pValue: number; test: string }[]
    independence: boolean
  }
  recommendations: string[]
  visualizations: string[]
  createdAt: Date
  status: 'running' | 'completed' | 'failed'
  timestamp: Date
}

export interface Project {
  id: string
  name: string
  description: string
  datasetIds: string[]
  analysisIds: string[]
  createdAt: Date
  updatedAt: Date
  status: 'active' | 'completed' | 'archived'
}

export interface UserPreferences {
  defaultSignificanceLevel: number
  defaultConfidenceLevel: number
  multipleComparisonsCorrection: 'bonferroni' | 'holm' | 'fdr' | 'none'
  effectSizeReporting: boolean
  chartStyle: 'professional' | 'minimal' | 'colorful'
  notifications: {
    analysisCompletion: boolean
    dataUploadErrors: boolean
    weeklySummary: boolean
  }
}

interface AppState {
  // Data
  datasets: Dataset[]
  projects: Project[]
  results: AnalysisHistoryRecord[]
  
  // UI State
  isLoading: boolean
  currentPage: string
  sidebarOpen: boolean
  
  // User Preferences
  preferences: UserPreferences
  
  // Actions
  addDataset: (dataset: Omit<Dataset, 'id' | 'uploadedAt'>) => Dataset
  updateDataset: (id: string, updates: Partial<Dataset>) => void
  removeDataset: (id: string) => void
  
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  
  addAnalysisResult: (result: Omit<AnalysisHistoryRecord, 'id' | 'createdAt'>) => string
  updateAnalysisResult: (id: string, updates: Partial<AnalysisHistoryRecord>) => void
  
  setLoading: (loading: boolean) => void
  setCurrentPage: (page: string) => void
  setSidebarOpen: (open: boolean) => void
  
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  
  // Computed
  getDatasetById: (id: string) => Dataset | undefined
  getProjectById: (id: string) => Project | undefined
  getAnalysisResultById: (id: string) => AnalysisHistoryRecord | undefined
  getAnalysisResult: (id: string) => AnalysisHistoryRecord | undefined
  getActiveDatasets: () => Dataset[]
  getRecentAnalyses: (limit?: number) => AnalysisHistoryRecord[]
  getAnalysesByDataset: (datasetId: string) => AnalysisHistoryRecord[]
  getCompletedAnalyses: () => AnalysisHistoryRecord[]
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        datasets: [],
        projects: [],
        results: [],
        isLoading: false,
        currentPage: '/',
        sidebarOpen: true,
        preferences: {
          defaultSignificanceLevel: 0.05,
          defaultConfidenceLevel: 95,
          multipleComparisonsCorrection: 'bonferroni',
          effectSizeReporting: true,
          chartStyle: 'professional',
          notifications: {
            analysisCompletion: true,
            dataUploadErrors: true,
            weeklySummary: false,
          },
        },

        // Dataset actions
        addDataset: (dataset) => {
          const newDataset = {
            ...dataset,
            id: crypto.randomUUID(),
            uploadedAt: new Date(),
          }
          set((state) => ({
            datasets: [...state.datasets, newDataset],
          }))
          return newDataset
        },

        updateDataset: (id, updates) =>
          set((state) => ({
            datasets: state.datasets.map((dataset) =>
              dataset.id === id ? { ...dataset, ...updates } : dataset
            ),
          })),

        removeDataset: (id) =>
          set((state) => ({
            datasets: state.datasets.filter((dataset) => dataset.id !== id),
          })),

        // Project actions
        addProject: (project) =>
          set((state) => ({
            projects: [
              ...state.projects,
              {
                ...project,
                id: crypto.randomUUID(),
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          })),

        updateProject: (id, updates) =>
          set((state) => ({
            projects: state.projects.map((project) =>
              project.id === id
                ? { ...project, ...updates, updatedAt: new Date() }
                : project
            ),
          })),

        // Analysis actions
        addAnalysisResult: (result) => {
          const newId = crypto.randomUUID()
          const newResult = {
            ...result,
            id: newId,
            createdAt: new Date(),
          }
          set((state) => ({
            results: [...state.results, newResult],
          }))
          return newId
        },

        updateAnalysisResult: (id, updates) =>
          set((state) => ({
            results: state.results.map((result) =>
              result.id === id ? { ...result, ...updates } : result
            ),
          })),

        // UI actions
        setLoading: (loading) => set({ isLoading: loading }),
        setCurrentPage: (page) => set({ currentPage: page }),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),

        // Preferences
        updatePreferences: (preferences) =>
          set((state) => ({
            preferences: { ...state.preferences, ...preferences },
          })),

        // Computed getters
        getDatasetById: (id) => {
          const state = get()
          return state.datasets.find((dataset) => dataset.id === id)
        },

        getProjectById: (id) => {
          const state = get()
          return state.projects.find((project) => project.id === id)
        },

        getAnalysisResultById: (id) => {
          const state = get()
          return state.results.find((result) => result.id === id)
        },

        getAnalysisResult: (id) => {
          const state = get()
          return state.results.find((result) => result.id === id)
        },

        getActiveDatasets: () => {
          const state = get()
          return state.datasets.filter((dataset) => dataset.status === 'active')
        },

        getRecentAnalyses: (limit = 10) => {
          const state = get()
          return state.results
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit)
        },

        getAnalysesByDataset: (datasetId) => {
          const state = get()
          return state.results
            .filter((result) => result.datasetId === datasetId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        },

        getCompletedAnalyses: () => {
          const state = get()
          return state.results
            .filter((result) => result.status === 'completed')
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        },
      }),
      {
        name: 'stats-storage',
        partialize: (state) => ({
          datasets: state.datasets,
          projects: state.projects,
          results: state.results,
          preferences: state.preferences,
        }),
      }
    ),
    {
      name: 'stats-store',
    }
  )
)