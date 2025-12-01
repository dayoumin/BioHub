import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { PurposeInputStep } from '@/components/smart-flow/steps/PurposeInputStep'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { useSettingsStore } from '@/lib/stores/settings-store'
import { DecisionTreeRecommender } from '@/lib/services/decision-tree-recommender'

// Mock stores
jest.mock('@/lib/stores/smart-flow-store', () => ({
    useSmartFlowStore: jest.fn()
}))

jest.mock('@/lib/stores/settings-store', () => ({
    useSettingsStore: jest.fn()
}))

// Mock services
jest.mock('@/lib/services/decision-tree-recommender', () => ({
    DecisionTreeRecommender: {
        recommend: jest.fn(),
        recommendWithoutAssumptions: jest.fn()
    }
}))

jest.mock('@/lib/services/ollama-recommender', () => ({
    ollamaRecommender: {
        checkHealth: jest.fn().mockResolvedValue(false),
        recommend: jest.fn()
    }
}))

jest.mock('@/lib/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    }
}))

jest.mock('@/lib/hooks/useReducedMotion', () => ({
    useReducedMotion: jest.fn().mockReturnValue(false)
}))

// Mock UI components to avoid complex rendering
jest.mock('@/components/common/analysis/PurposeCard', () => ({
    PurposeCard: ({ title, onClick, selected }: { title: string; onClick: () => void; selected: boolean }) => (
        <button data-testid={`purpose-card-${title}`} onClick={onClick} aria-selected={selected}>
            {title}
        </button>
    )
}))

jest.mock('@/components/smart-flow/visualization/ConfidenceGauge', () => ({
    ConfidenceGauge: () => <div data-testid="confidence-gauge">Gauge</div>
}))

jest.mock('@/components/smart-flow/visualization/AssumptionResultChart', () => ({
    AssumptionResultChart: () => <div data-testid="assumption-chart">Chart</div>
}))

// Mock MethodBrowser to avoid duplicate text
jest.mock('@/components/smart-flow/steps/purpose/MethodBrowser', () => ({
    MethodBrowser: ({ selectedMethod, recommendedMethodId }: { selectedMethod: { name: string } | null; recommendedMethodId?: string }) => (
        <div data-testid="method-browser">
            <span data-testid="method-browser-selected">{selectedMethod?.name || 'None'}</span>
            <span data-testid="method-browser-recommended">{recommendedMethodId || 'None'}</span>
        </div>
    )
}))

// Mock Tabs to render content immediately for testing
jest.mock('@/components/ui/tabs', () => ({
    Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TabsTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
    TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
        jest.clearAllMocks()

        // Mock store with selector support
        const defaultStoreState = {
            assumptionResults: {},
            setSelectedMethod: jest.fn(),
            setDetectedVariables: jest.fn()
        }
        ;(useSmartFlowStore as unknown as jest.Mock).mockImplementation(
            (selector: (state: typeof defaultStoreState) => unknown) => selector(defaultStoreState)
        )

        // Settings store mock with selector
        const defaultSettingsState = {
            useOllamaForRecommendation: false
        }
        ;(useSettingsStore as unknown as jest.Mock).mockImplementation(
            (selector: (state: typeof defaultSettingsState) => unknown) => selector(defaultSettingsState)
        )
    })

    it('renders purpose selection cards', () => {
        render(
            <PurposeInputStep
                onPurposeSubmit={jest.fn()}
                validationResults={mockValidationResults as unknown as Parameters<typeof PurposeInputStep>[0]['validationResults']}
                data={mockData}
            />
        )

        expect(screen.getByText('어떤 분석을 하고 싶으신가요?')).toBeInTheDocument()
        expect(screen.getByTestId('purpose-card-그룹 간 차이 비교')).toBeInTheDocument()
    })

    it('shows Guided Questions when purpose is selected (new flow)', async () => {
        render(
            <PurposeInputStep
                onPurposeSubmit={jest.fn()}
                validationResults={mockValidationResults as unknown as Parameters<typeof PurposeInputStep>[0]['validationResults']}
                data={mockData}
            />
        )

        // Click purpose card
        fireEvent.click(screen.getByTestId('purpose-card-그룹 간 차이 비교'))

        // Wait for Guided Questions UI to appear (new flow)
        await waitFor(() => {
            // GuidedQuestions shows "데이터 조건을 알려주세요" header
            expect(screen.getByText('데이터 조건을 알려주세요')).toBeInTheDocument()
        }, { timeout: 3000 })

        // Verify first question is displayed
        expect(screen.getByText(/비교할 그룹이 몇 개인가요/)).toBeInTheDocument()
    })

    it('shows back button in Guided Questions step', async () => {
        render(
            <PurposeInputStep
                onPurposeSubmit={jest.fn()}
                validationResults={mockValidationResults as unknown as Parameters<typeof PurposeInputStep>[0]['validationResults']}
                data={mockData}
            />
        )

        fireEvent.click(screen.getByTestId('purpose-card-그룹 간 차이 비교'))

        await waitFor(() => {
            expect(screen.getByText('뒤로')).toBeInTheDocument()
        }, { timeout: 3000 })
    })

    it('can go back to purpose selection from questions', async () => {
        render(
            <PurposeInputStep
                onPurposeSubmit={jest.fn()}
                validationResults={mockValidationResults as unknown as Parameters<typeof PurposeInputStep>[0]['validationResults']}
                data={mockData}
            />
        )

        // Select purpose
        fireEvent.click(screen.getByTestId('purpose-card-그룹 간 차이 비교'))

        // Wait for questions to appear
        await waitFor(() => {
            expect(screen.getByText('데이터 조건을 알려주세요')).toBeInTheDocument()
        }, { timeout: 3000 })

        // Click back button
        fireEvent.click(screen.getByText('뒤로'))

        // Should return to purpose selection
        await waitFor(() => {
            expect(screen.getByText('어떤 분석을 하고 싶으신가요?')).toBeInTheDocument()
            expect(screen.getByTestId('purpose-card-그룹 간 차이 비교')).toBeInTheDocument()
        })
    })

    it('does not show legacy recommendation card in questions step', async () => {
        render(
            <PurposeInputStep
                onPurposeSubmit={jest.fn()}
                validationResults={mockValidationResults as unknown as Parameters<typeof PurposeInputStep>[0]['validationResults']}
                data={mockData}
            />
        )

        // Select purpose
        fireEvent.click(screen.getByTestId('purpose-card-그룹 간 차이 비교'))

        // Wait for questions
        await waitFor(() => {
            expect(screen.getByText('데이터 조건을 알려주세요')).toBeInTheDocument()
        }, { timeout: 3000 })

        // Legacy recommendation card should NOT appear
        expect(screen.queryByTestId('recommendation-card')).not.toBeInTheDocument()
        expect(screen.queryByTestId('selected-method-bar')).not.toBeInTheDocument()
    })

    it('shows initial guidance when no purpose is selected', () => {
        render(
            <PurposeInputStep
                onPurposeSubmit={jest.fn()}
                validationResults={mockValidationResults as unknown as Parameters<typeof PurposeInputStep>[0]['validationResults']}
                data={mockData}
            />
        )

        expect(screen.getByText(/분석 목적을 선택하면 단계별 질문을 통해 최적의 통계 방법을 추천합니다/)).toBeInTheDocument()
    })

    // ========================================
    // Browse Mode Tests (Legacy UI)
    // ========================================
    describe('Browse Mode (전체 방법 보기)', () => {
        it('shows legacy recommendation card when clicking "전체 방법에서 직접 선택"', async () => {
            // Mock AI recommendation
            const mockResult = {
                method: { id: 't-test', name: 'Independent t-test', description: 'Compare means', category: 'compare' },
                confidence: 0.9,
                reasoning: ['Two groups detected']
            }
            const recommendMock = DecisionTreeRecommender.recommend as jest.Mock
            recommendMock.mockReturnValue(mockResult)

            render(
                <PurposeInputStep
                    onPurposeSubmit={jest.fn()}
                    validationResults={mockValidationResults as unknown as Parameters<typeof PurposeInputStep>[0]['validationResults']}
                    data={mockData}
                />
            )

            // Step 1: Select purpose
            fireEvent.click(screen.getByTestId('purpose-card-그룹 간 차이 비교'))

            // Step 2: Wait for Guided Questions
            await waitFor(() => {
                expect(screen.getByText('데이터 조건을 알려주세요')).toBeInTheDocument()
            }, { timeout: 3000 })

            // Step 3: Click "전체 방법에서 직접 선택" to enter browse mode
            fireEvent.click(screen.getByText('전체 방법에서 직접 선택'))

            // Step 4: Legacy UI should appear
            await waitFor(() => {
                expect(screen.getByText('분석 방법 선택')).toBeInTheDocument()
                expect(screen.getByTestId('method-browser')).toBeInTheDocument()
            }, { timeout: 3000 })
        })

        it('shows MethodBrowser with recommended method in browse mode', async () => {
            const mockResult = {
                method: { id: 't-test', name: 'Independent t-test', description: 'Compare means', category: 'compare' },
                confidence: 0.9,
                reasoning: ['Two groups detected', 'Numeric variable']
            }
            const recommendMock = DecisionTreeRecommender.recommend as jest.Mock
            recommendMock.mockReturnValue(mockResult)

            render(
                <PurposeInputStep
                    onPurposeSubmit={jest.fn()}
                    validationResults={mockValidationResults as unknown as Parameters<typeof PurposeInputStep>[0]['validationResults']}
                    data={mockData}
                />
            )

            // Select purpose → questions → browse
            fireEvent.click(screen.getByTestId('purpose-card-그룹 간 차이 비교'))
            await waitFor(() => {
                expect(screen.getByText('데이터 조건을 알려주세요')).toBeInTheDocument()
            }, { timeout: 3000 })
            fireEvent.click(screen.getByText('전체 방법에서 직접 선택'))

            // Browse mode shows MethodBrowser with AI recommended method ID
            await waitFor(() => {
                expect(screen.getByTestId('method-browser')).toBeInTheDocument()
            }, { timeout: 3000 })

            // Verify recommended method ID is passed to MethodBrowser
            expect(screen.getByTestId('method-browser-recommended')).toHaveTextContent('t-test')
        })

        it('shows selected-method-bar and calls onPurposeSubmit in browse mode', async () => {
            const mockOnPurposeSubmit = jest.fn()
            const mockSetSelectedMethod = jest.fn()
            const mockSetDetectedVariables = jest.fn()

            // Mock store
            const mockStoreState = {
                assumptionResults: {},
                setSelectedMethod: mockSetSelectedMethod,
                setDetectedVariables: mockSetDetectedVariables
            }
            ;(useSmartFlowStore as unknown as jest.Mock).mockImplementation(
                (selector: (state: typeof mockStoreState) => unknown) => selector(mockStoreState)
            )

            const mockResult = {
                method: { id: 't-test', name: 'Independent t-test', description: 'Compare means', category: 'compare' },
                confidence: 0.9,
                reasoning: ['Reason']
            }
            const recommendMock = DecisionTreeRecommender.recommend as jest.Mock
            recommendMock.mockReturnValue(mockResult)

            render(
                <PurposeInputStep
                    onPurposeSubmit={mockOnPurposeSubmit}
                    validationResults={mockValidationResults as unknown as Parameters<typeof PurposeInputStep>[0]['validationResults']}
                    data={mockData}
                />
            )

            // Navigate to browse mode
            fireEvent.click(screen.getByTestId('purpose-card-그룹 간 차이 비교'))
            await waitFor(() => {
                expect(screen.getByText('데이터 조건을 알려주세요')).toBeInTheDocument()
            }, { timeout: 3000 })
            fireEvent.click(screen.getByText('전체 방법에서 직접 선택'))

            // Wait for selected-method-bar
            await waitFor(() => {
                expect(screen.getByTestId('selected-method-bar')).toBeInTheDocument()
            }, { timeout: 3000 })

            // Verify final selected method
            expect(screen.getByTestId('final-selected-method-name')).toHaveTextContent('Independent t-test')

            // Click confirm button
            const confirmButton = screen.getByRole('button', { name: /이 방법으로 분석하기/i })
            await fireEvent.click(confirmButton)

            // Verify callbacks
            expect(mockSetSelectedMethod).toHaveBeenCalledWith(mockResult.method)
            expect(mockSetDetectedVariables).toHaveBeenCalled()
            expect(mockOnPurposeSubmit).toHaveBeenCalledWith('그룹 간 차이 비교', mockResult.method)
        })
    })
})
