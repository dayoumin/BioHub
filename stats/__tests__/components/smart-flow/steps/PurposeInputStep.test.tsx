/**
 * PurposeInputStep Tests
 *
 * 전략: L1 (Store-level) + L2 (data-testid)
 *
 * NOTE: PurposeInputStep은 ai-chat → category → subcategory → questions → browse
 * 등 복잡한 FlowStateMachine으로 재설계됨.
 * DOM 인터랙션 테스트는 각 하위 컴포넌트(NaturalLanguageInput, CategorySelector,
 * SubcategorySelector, GuidedQuestions, MethodBrowser)의 개별 테스트에서 수행.
 * 전체 플로우 통합 테스트는 Playwright E2E에서 수행.
 */

import { render, screen } from '@testing-library/react'
import { vi, Mock } from 'vitest'
import { PurposeInputStep } from '@/components/smart-flow/steps/PurposeInputStep'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { useSettingsStore } from '@/lib/stores/settings-store'

// Mock Terminology hooks (TerminologyProvider 없이 테스트)
const mockPurpose = { title: 'Mock', description: 'Mock desc', examples: 'Mock ex' }
vi.mock('@/hooks/use-terminology', () => ({
    useTerminology: () => ({
        domain: 'generic',
        displayName: '범용 통계',
        variables: {},
        validation: {},
        success: {},
        selectorUI: {},
        smartFlow: {
            stepTitles: { purposeInput: '분석 방법 선택' },
            stepShortLabels: { exploration: '', method: '', variable: '', analysis: '' },
            statusMessages: { analyzing: 'Analyzing...' },
            buttons: {},
            resultSections: {},
            executionStages: {
                prepare: { label: '', message: '' }, preprocess: { label: '', message: '' },
                assumptions: { label: '', message: '' }, analysis: { label: '', message: '' },
                additional: { label: '', message: '' }, finalize: { label: '', message: '' },
            },
            layout: {
                appTitle: '', historyTitle: '', historyClose: '',
                historyCount: () => '', aiChatbot: '', helpLabel: '', settingsLabel: '',
                nextStep: '', analyzingDefault: '', dataSizeGuide: '', currentLimits: '',
                memoryRecommendation: '', detectedMemory: () => '',
                limitFileSize: '', limitDataSize: '', limitRecommended: '',
                memoryTier4GB: '', memoryTier8GB: '', memoryTier16GB: '',
            },
            execution: {
                runningTitle: '', resumeButton: '', pauseButton: '', cancelButton: '',
                pauseDisabledTooltip: '', cancelConfirm: '',
                logSectionLabel: () => '', noLogs: '', dataRequired: '',
                unknownError: '', estimatedTimeRemaining: () => '',
            },
        },
        purposeInput: {
            purposes: {
                compare: mockPurpose, relationship: mockPurpose, distribution: mockPurpose,
                prediction: mockPurpose, timeseries: mockPurpose, survival: mockPurpose,
                multivariate: mockPurpose, utility: mockPurpose,
            },
            inputModes: { aiRecommend: 'AI 추천', directSelect: '직접 선택', modeAriaLabel: '분석 방법 선택 모드' },
            buttons: { back: '뒤로', allMethods: '전체', useThisMethod: '선택' },
            labels: { selectionPrefix: '선택:', directBadge: '직접', purposeHeading: '분석 목적' },
            messages: { purposeHelp: '도움말', guidanceAlert: '안내', aiRecommendError: '추천 실패', genericError: '오류 발생' },
            aiLabels: { recommendTitle: 'AI 추천' },
        },
    }),
    useTerminologyContext: () => ({
        dictionary: { domain: 'generic', displayName: '범용 통계' },
        setDomain: vi.fn(),
        currentDomain: 'generic',
    }),
}))

vi.mock('@/lib/stores/smart-flow-store', () => ({
    useSmartFlowStore: vi.fn()
}))

vi.mock('@/lib/stores/settings-store', () => ({
    useSettingsStore: vi.fn()
}))

vi.mock('@/lib/services/decision-tree-recommender', () => ({
    DecisionTreeRecommender: {
        recommend: vi.fn(),
        recommendWithoutAssumptions: vi.fn(),
        recommendWithCompatibility: vi.fn(),
    }
}))

vi.mock('@/lib/services/ollama-recommender', () => ({
    ollamaRecommender: {
        checkHealth: vi.fn().mockResolvedValue(false),
        recommend: vi.fn()
    }
}))

vi.mock('@/lib/utils/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn()
    }
}))

vi.mock('@/lib/hooks/useReducedMotion', () => ({
    useReducedMotion: vi.fn().mockReturnValue(false)
}))

// Mock subcomponents with data-testid (UI 변경에 안전)
vi.mock('@/components/smart-flow/steps/purpose/NaturalLanguageInput', () => ({
    NaturalLanguageInput: () => <div data-testid="natural-language-input">AI Chat</div>
}))

vi.mock('@/components/smart-flow/steps/purpose/CategorySelector', () => ({
    CategorySelector: () => <div data-testid="category-selector">Categories</div>
}))

vi.mock('@/components/smart-flow/steps/purpose/SubcategorySelector', () => ({
    SubcategorySelector: () => <div data-testid="subcategory-selector">Subcategories</div>
}))

vi.mock('@/components/smart-flow/steps/purpose/GuidedQuestions', () => ({
    GuidedQuestions: () => <div data-testid="guided-questions">Questions</div>
}))

vi.mock('@/components/smart-flow/steps/purpose/RecommendationResult', () => ({
    RecommendationResult: () => <div data-testid="recommendation-result">Recommendation</div>
}))

vi.mock('@/components/smart-flow/steps/purpose/MethodBrowser', () => ({
    MethodBrowser: () => <div data-testid="method-browser">Browser</div>
}))

vi.mock('@/components/common/analysis/PurposeCard', () => ({
    PurposeCard: ({ title, onClick }: { title: string; onClick: () => void }) => (
        <button data-testid={`purpose-card-${title}`} onClick={onClick}>
            {title}
        </button>
    )
}))

vi.mock('@/components/common/analysis/AIAnalysisProgress', () => ({
    AIAnalysisProgress: () => null
}))

describe('PurposeInputStep', () => {
    const mockValidationResults = {
        columns: [
            { name: 'age', type: 'numeric' },
            { name: 'group', type: 'categorical' }
        ]
    }
    const mockData = [{ age: 20, group: 'A' }]

    beforeEach(() => {
        vi.clearAllMocks()

        const defaultStoreState = {
            assumptionResults: {},
            setSelectedMethod: vi.fn(),
            setDetectedVariables: vi.fn(),
            purposeInputMode: 'ai' as const,
            methodCompatibility: null,
        }
        ;(useSmartFlowStore as unknown as Mock).mockImplementation(
            (selector: (state: typeof defaultStoreState) => unknown) => selector(defaultStoreState)
        )

        const defaultSettingsState = {
            useOllamaForRecommendation: false
        }
        ;(useSettingsStore as unknown as Mock).mockImplementation(
            (selector: (state: typeof defaultSettingsState) => unknown) => selector(defaultSettingsState)
        )
    })

    it('renders without crashing', () => {
        render(
            <PurposeInputStep
                onPurposeSubmit={vi.fn()}
                validationResults={mockValidationResults as unknown as Parameters<typeof PurposeInputStep>[0]['validationResults']}
                data={mockData}
            />
        )

        // StepHeader always renders
        expect(screen.getByText('분석 방법 선택')).toBeInTheDocument()
    })

    it('initial state shows NaturalLanguageInput (ai-chat mode)', () => {
        render(
            <PurposeInputStep
                onPurposeSubmit={vi.fn()}
                validationResults={mockValidationResults as unknown as Parameters<typeof PurposeInputStep>[0]['validationResults']}
                data={mockData}
            />
        )

        expect(screen.getByTestId('natural-language-input')).toBeInTheDocument()
    })

    it('renders mode toggle section', () => {
        const { container } = render(
            <PurposeInputStep
                onPurposeSubmit={vi.fn()}
                validationResults={mockValidationResults as unknown as Parameters<typeof PurposeInputStep>[0]['validationResults']}
                data={mockData}
            />
        )

        // FilterToggle area exists (aria-label로 확인)
        const toggleArea = container.querySelector('[aria-label="분석 방법 선택 모드"]')
        expect(toggleArea).toBeInTheDocument()
    })

    it('does not crash with null validationResults', () => {
        render(
            <PurposeInputStep
                onPurposeSubmit={vi.fn()}
                validationResults={null}
                data={null}
            />
        )

        expect(screen.getByText('분석 방법 선택')).toBeInTheDocument()
    })
})
