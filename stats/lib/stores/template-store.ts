/**
 * Template Store
 * 분석 템플릿 상태 관리 (Zustand)
 */

import { create } from 'zustand'
import type {
  AnalysisTemplate,
  TemplateListOptions,
  VariableRoleMapping,
  StatisticalMethod,
  ValidationResults
} from '@/types/smart-flow'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'
import {
  getAllTemplates,
  getTemplate,
  saveTemplate,
  updateTemplate,
  deleteTemplate,
  clearAllTemplates,
  incrementTemplateUsage,
  getRecentTemplates,
  isIndexedDBAvailable
} from '@/lib/utils/indexeddb-templates'

interface TemplateState {
  // 템플릿 목록
  templates: AnalysisTemplate[]
  recentTemplates: AnalysisTemplate[]

  // 선택된 템플릿 (Step 1에서 선택)
  selectedTemplate: AnalysisTemplate | null

  // UI 상태
  isLoading: boolean
  error: string | null

  // 필터/정렬 옵션
  listOptions: TemplateListOptions

  // === Actions ===

  // 초기화 (IndexedDB에서 불러오기)
  loadTemplates: () => Promise<void>

  // 템플릿 저장
  createTemplate: (params: {
    name: string
    description: string
    purpose: string
    method: StatisticalMethod
    variableMapping: VariableMapping
    options?: Record<string, unknown>
    originalData?: {
      fileName?: string
      rowCount?: number
      columnCount?: number
    }
  }) => Promise<AnalysisTemplate>

  // 템플릿 수정
  editTemplate: (id: string, updates: { name?: string; description?: string }) => Promise<void>

  // 템플릿 삭제
  removeTemplate: (id: string) => Promise<void>

  // 템플릿 전체 삭제
  clearTemplates: () => Promise<void>

  // 템플릿 선택 (Step 1에서)
  selectTemplate: (template: AnalysisTemplate | null) => void

  // 템플릿 적용 (사용 횟수 증가)
  applyTemplate: (id: string) => Promise<AnalysisTemplate | null>

  // 필터/정렬 변경
  setListOptions: (options: Partial<TemplateListOptions>) => void

  // 변수 자동 매칭 (템플릿 역할 → 실제 변수명)
  matchVariables: (
    template: AnalysisTemplate,
    validationResults: ValidationResults
  ) => {
    matched: Record<string, string>
    unmatched: string[]
  }
}

/**
 * string | string[] 값을 안전하게 string으로 변환
 */
function toStringValue(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined
  return Array.isArray(value) ? value[0] : value
}

/**
 * string | string[] 값을 안전하게 string[]로 변환
 */
function toArrayValue(value: string | string[] | undefined): string[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

/**
 * VariableMapping에서 VariableRoleMapping 추출
 */
function extractVariableRoles(mapping: VariableMapping): VariableRoleMapping {
  const roles: VariableRoleMapping = {}

  // 종속변수
  const dependentVal = toStringValue(mapping.dependentVar)
  if (dependentVal) {
    roles.dependent = {
      role: 'dependent',
      type: 'numeric',
      description: dependentVal
    }
  }

  // 독립변수/그룹변수
  const independentVal = toStringValue(mapping.independentVar)
  if (independentVal) {
    roles.independent = {
      role: 'independent',
      type: 'numeric',
      description: independentVal
    }
  }
  if (mapping.groupVar) {
    roles.independent = {
      role: 'group',
      type: 'categorical',
      description: mapping.groupVar
    }
  }

  // 요인 (between 사용)
  const betweenVars = toArrayValue(mapping.between)
  if (betweenVars.length > 0) {
    roles.factors = betweenVars.map(f => ({
      role: 'factor' as const,
      type: 'categorical' as const,
      description: f
    }))
  }

  // 공변량
  const covariateVars = toArrayValue(mapping.covariate)
  if (covariateVars.length > 0) {
    roles.covariates = covariateVars.map(c => ({
      role: 'covariate' as const,
      type: 'numeric' as const,
      description: c
    }))
  }

  return roles
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  recentTemplates: [],
  selectedTemplate: null,
  isLoading: false,
  error: null,
  listOptions: {
    sortBy: 'recent',
    sortOrder: 'desc'
  },

  loadTemplates: async () => {
    if (!isIndexedDBAvailable()) {
      console.warn('[TemplateStore] IndexedDB not available')
      return
    }

    set({ isLoading: true, error: null })

    try {
      const [templates, recent] = await Promise.all([
        getAllTemplates(get().listOptions),
        getRecentTemplates(5)
      ])

      set({
        templates,
        recentTemplates: recent,
        isLoading: false
      })
    } catch (error) {
      console.error('[TemplateStore] Failed to load templates:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to load templates',
        isLoading: false
      })
    }
  },

  createTemplate: async (params) => {
    const template: AnalysisTemplate = {
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: params.name,
      description: params.description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
      lastUsedAt: null,
      purpose: params.purpose,
      method: {
        id: params.method.id,
        name: params.method.name,
        category: params.method.category,
        description: params.method.description
      },
      variableRoles: extractVariableRoles(params.variableMapping),
      options: params.options,
      originalData: params.originalData
    }

    await saveTemplate(template)

    // UI 갱신
    await get().loadTemplates()

    return template
  },

  editTemplate: async (id, updates) => {
    await updateTemplate(id, updates)
    await get().loadTemplates()
  },

  removeTemplate: async (id) => {
    await deleteTemplate(id)

    // 선택된 템플릿이 삭제되면 선택 해제
    const state = get()
    if (state.selectedTemplate?.id === id) {
      set({ selectedTemplate: null })
    }

    await get().loadTemplates()
  },

  clearTemplates: async () => {
    await clearAllTemplates()
    set({
      templates: [],
      recentTemplates: [],
      selectedTemplate: null
    })
  },

  selectTemplate: (template) => {
    set({ selectedTemplate: template })
  },

  applyTemplate: async (id) => {
    const template = await getTemplate(id)
    if (!template) return null

    // 사용 횟수 증가
    await incrementTemplateUsage(id)

    // 목록 갱신
    await get().loadTemplates()

    return template
  },

  setListOptions: (options) => {
    set((state) => ({
      listOptions: { ...state.listOptions, ...options }
    }))
    // 옵션 변경 시 목록 다시 불러오기
    get().loadTemplates()
  },

  matchVariables: (template, validationResults) => {
    const matched: Record<string, string> = {}
    const unmatched: string[] = []
    const roles = template.variableRoles

    // 컬럼 정보 추출
    const columns = validationResults.columns || validationResults.columnStats || []
    const numericCols = columns
      .filter(c => c.type === 'numeric')
      .map(c => c.name)
    const categoricalCols = columns
      .filter(c => c.type === 'categorical')
      .map(c => c.name)

    // 종속변수 매칭 (첫 번째 수치형)
    if (roles.dependent) {
      if (numericCols.length > 0) {
        matched['dependent'] = numericCols[0]
      } else {
        unmatched.push('dependent')
      }
    }

    // 독립변수/그룹변수 매칭
    if (roles.independent) {
      const type = roles.independent.type
      const candidates = type === 'categorical' ? categoricalCols : numericCols

      if (candidates.length > 0) {
        // 종속변수와 다른 변수 선택
        const available = candidates.filter(c => c !== matched['dependent'])
        if (available.length > 0) {
          matched['independent'] = available[0]
        } else {
          unmatched.push('independent')
        }
      } else {
        unmatched.push('independent')
      }
    }

    // 요인 매칭
    if (roles.factors && roles.factors.length > 0) {
      const usedVars = new Set(Object.values(matched))
      const availableCategorical = categoricalCols.filter(c => !usedVars.has(c))

      roles.factors.forEach((_, index) => {
        if (availableCategorical[index]) {
          matched[`factor_${index}`] = availableCategorical[index]
        } else {
          unmatched.push(`factor_${index}`)
        }
      })
    }

    // 공변량 매칭
    if (roles.covariates && roles.covariates.length > 0) {
      const usedVars = new Set(Object.values(matched))
      const availableNumeric = numericCols.filter(c => !usedVars.has(c))

      roles.covariates.forEach((_, index) => {
        if (availableNumeric[index]) {
          matched[`covariate_${index}`] = availableNumeric[index]
        } else {
          unmatched.push(`covariate_${index}`)
        }
      })
    }

    return { matched, unmatched }
  }
}))
