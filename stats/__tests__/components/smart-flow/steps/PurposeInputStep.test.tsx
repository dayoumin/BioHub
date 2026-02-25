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

import { render, screen, waitFor } from '@testing-library/react'
import { vi, Mock } from 'vitest'
import { PurposeInputStep } from '@/components/smart-flow/steps/PurposeInputStep'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { llmRecommender } from '@/lib/services/llm-recommender'

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

vi.mock('@/lib/services/decision-tree-recommender', () => ({
    DecisionTreeRecommender: {
        recommend: vi.fn(),
        recommendWithoutAssumptions: vi.fn().mockReturnValue({
            method: { id: 't-test', name: 'T-검정', category: 't-test' },
            confidence: 0.8,
            reasoning: 'Mock reasoning',
        }),
        recommendWithCompatibility: vi.fn(),
    }
}))

vi.mock('@/lib/services/llm-recommender', () => ({
    llmRecommender: {
        recommendFromNaturalLanguage: vi.fn().mockResolvedValue({
            recommendation: null,
            responseText: 'AI 추천 결과입니다.',
            provider: 'mock'
        })
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
            assumptionResults: null,
            setSelectedMethod: vi.fn(),
            setDetectedVariables: vi.fn(),
            setSuggestedSettings: vi.fn(),
            purposeInputMode: 'ai' as const,
            userQuery: null,
            setUserQuery: vi.fn(),
            setLastAiRecommendation: vi.fn(),
        }
        ;(useSmartFlowStore as unknown as Mock).mockImplementation(
            (selector: (state: typeof defaultStoreState) => unknown) => selector(defaultStoreState)
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

    describe('자동 AI 추천 트리거 (auto-trigger)', () => {
        it('data + validationResults 있을 때 LLM 추천을 자동 호출한다', async () => {
            render(
                <PurposeInputStep
                    onPurposeSubmit={vi.fn()}
                    validationResults={mockValidationResults as unknown as Parameters<typeof PurposeInputStep>[0]['validationResults']}
                    data={mockData}
                />
            )

            await waitFor(() => {
                expect(vi.mocked(llmRecommender.recommendFromNaturalLanguage)).toHaveBeenCalledOnce()
            })

            // 기본 쿼리로 호출되어야 함
            const [query] = vi.mocked(llmRecommender.recommendFromNaturalLanguage).mock.calls[0]
            expect(query).toBe('이 데이터에 적합한 통계 분석 방법을 추천해주세요.')
        })

        it('userQuery 있을 때 해당 쿼리로 LLM을 호출한다', async () => {
            const defaultStoreState = {
                assumptionResults: null,
                setSelectedMethod: vi.fn(),
                setDetectedVariables: vi.fn(),
                setSuggestedSettings: vi.fn(),
                purposeInputMode: 'ai' as const,
                userQuery: '두 집단 평균을 비교하고 싶습니다',
                setUserQuery: vi.fn(),
                setLastAiRecommendation: vi.fn(),
            }
            ;(useSmartFlowStore as unknown as Mock).mockImplementation(
                (selector: (state: typeof defaultStoreState) => unknown) => selector(defaultStoreState)
            )

            render(
                <PurposeInputStep
                    onPurposeSubmit={vi.fn()}
                    validationResults={mockValidationResults as unknown as Parameters<typeof PurposeInputStep>[0]['validationResults']}
                    data={mockData}
                />
            )

            await waitFor(() => {
                expect(vi.mocked(llmRecommender.recommendFromNaturalLanguage)).toHaveBeenCalledOnce()
            })

            const [query] = vi.mocked(llmRecommender.recommendFromNaturalLanguage).mock.calls[0]
            expect(query).toBe('두 집단 평균을 비교하고 싶습니다')
        })

        it('data가 null이면 자동 트리거가 실행되지 않는다', () => {
            render(
                <PurposeInputStep
                    onPurposeSubmit={vi.fn()}
                    validationResults={mockValidationResults as unknown as Parameters<typeof PurposeInputStep>[0]['validationResults']}
                    data={null}
                />
            )

            expect(vi.mocked(llmRecommender.recommendFromNaturalLanguage)).not.toHaveBeenCalled()
        })

        it('validationResults가 null이면 자동 트리거가 실행되지 않는다', () => {
            render(
                <PurposeInputStep
                    onPurposeSubmit={vi.fn()}
                    validationResults={null}
                    data={mockData}
                />
            )

            expect(vi.mocked(llmRecommender.recommendFromNaturalLanguage)).not.toHaveBeenCalled()
        })
    })
})
