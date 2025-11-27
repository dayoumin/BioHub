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

    it('shows AI recommendation when purpose is selected', async () => {
        // Mock recommendation result
        const mockResult = {
            method: { id: 't-test', name: 'Independent t-test', description: 'Compare means', category: 'compare' },
            confidence: 0.9,
            reasoning: ['Two groups detected', 'Numeric dependent variable']
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

        // Click purpose card
        fireEvent.click(screen.getByTestId('purpose-card-그룹 간 차이 비교'))

        // Wait for recommendation card to appear
        await waitFor(() => {
            // Use data-testid to get the specific element
            expect(screen.getByTestId('recommendation-card')).toBeInTheDocument()
        }, { timeout: 3000 })

        // Verify recommended method name within the recommendation card
        const recommendationCard = screen.getByTestId('recommendation-card')
        expect(within(recommendationCard).getByTestId('recommended-method-name')).toHaveTextContent('Independent t-test')

        // Verify Badge shows Rule-based (confidence < 0.95)
        expect(within(recommendationCard).getByText('Rule-based')).toBeInTheDocument()

        // Verify final selected method bar also shows the method
        expect(screen.getByTestId('final-selected-method-name')).toHaveTextContent('Independent t-test')
    })

    it('shows LLM badge when confidence is high', async () => {
        // Mock recommendation with high confidence (LLM)
        const mockResult = {
            method: { id: 't-test', name: 'Independent t-test', description: 'Compare means', category: 'compare' },
            confidence: 0.98, // >= 0.95 shows LLM
            reasoning: ['LLM analyzed data pattern']
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

        fireEvent.click(screen.getByTestId('purpose-card-그룹 간 차이 비교'))

        await waitFor(() => {
            const recommendationCard = screen.getByTestId('recommendation-card')
            expect(within(recommendationCard).getByText('LLM')).toBeInTheDocument()
        }, { timeout: 3000 })
    })

    it('calls onPurposeSubmit when confirm button is clicked', async () => {
        const mockOnPurposeSubmit = jest.fn()
        const mockSetSelectedMethod = jest.fn()
        const mockSetDetectedVariables = jest.fn()

        // Mock store with selector support
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

        // Select purpose
        fireEvent.click(screen.getByTestId('purpose-card-그룹 간 차이 비교'))

        // Wait for recommendation card AND selected method bar to appear
        await waitFor(() => {
            expect(screen.getByTestId('recommendation-card')).toBeInTheDocument()
            expect(screen.getByTestId('selected-method-bar')).toBeInTheDocument()
        }, { timeout: 3000 })

        // Verify confirm button exists and is enabled
        const confirmButton = screen.getByRole('button', { name: /이 방법으로 분석하기/i })
        expect(confirmButton).toBeInTheDocument()
        expect(confirmButton).not.toBeDisabled()

        // Click confirm button using userEvent-like interaction
        await fireEvent.click(confirmButton)

        // The callback should be called synchronously after click
        expect(mockSetSelectedMethod).toHaveBeenCalledWith(mockResult.method)
        expect(mockSetDetectedVariables).toHaveBeenCalled()
        expect(mockOnPurposeSubmit).toHaveBeenCalledWith('그룹 간 차이 비교', mockResult.method)
    })

    it('shows reasoning list in recommendation card', async () => {
        const mockResult = {
            method: { id: 't-test', name: 'Independent t-test', description: 'Compare means', category: 'compare' },
            confidence: 0.85,
            reasoning: ['Two groups detected', 'Numeric variable present', 'Sample size sufficient']
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

        fireEvent.click(screen.getByTestId('purpose-card-그룹 간 차이 비교'))

        await waitFor(() => {
            const recommendationCard = screen.getByTestId('recommendation-card')
            // Check reasoning items are displayed (up to 3)
            expect(within(recommendationCard).getByText(/Two groups detected/)).toBeInTheDocument()
            expect(within(recommendationCard).getByText(/Numeric variable present/)).toBeInTheDocument()
            expect(within(recommendationCard).getByText(/Sample size sufficient/)).toBeInTheDocument()
        }, { timeout: 3000 })
    })
})
