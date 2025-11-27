import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
    PurposeCard: ({ title, onClick, selected }: any) => (
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

// Mock Tabs to render content immediately for testing
jest.mock('@/components/ui/tabs', () => ({
    Tabs: ({ children }: any) => <div>{children}</div>,
    TabsList: ({ children }: any) => <div>{children}</div>,
    TabsTrigger: ({ children }: any) => <button>{children}</button>,
    TabsContent: ({ children }: any) => <div>{children}</div>,
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
        (useSmartFlowStore as unknown as jest.Mock).mockReturnValue({
            assumptionResults: {},
            setSelectedMethod: jest.fn(),
            setDetectedVariables: jest.fn()
        });
        (useSettingsStore as unknown as jest.Mock).mockReturnValue(false); // useOllamaForRecommendation
    })

    it('renders purpose selection cards', () => {
        render(
            <PurposeInputStep
                onPurposeSubmit={jest.fn()}
                validationResults={mockValidationResults as any}
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
            reasoning: ['Reason 1']
        }

        // Setup mock implementation to log calls
        const recommendMock = DecisionTreeRecommender.recommend as jest.Mock;
        recommendMock.mockImplementation((...args) => {
            console.log('Test: DecisionTreeRecommender.recommend called with:', args)
            return mockResult
        })

        render(
            <PurposeInputStep
                onPurposeSubmit={jest.fn()}
                validationResults={mockValidationResults as any}
                data={mockData}
            />
        )

        // Click purpose
        console.log('Test: Clicking purpose card')
        fireEvent.click(screen.getByTestId('purpose-card-그룹 간 차이 비교'))

        // Wait for recommendation
        await waitFor(() => {
            // Check logger calls
            const loggerInfo = (require('@/lib/utils/logger').logger.info as jest.Mock).mock.calls;
            const loggerError = (require('@/lib/utils/logger').logger.error as jest.Mock).mock.calls;
            console.log('Test: Logger Info calls:', loggerInfo)
            console.log('Test: Logger Error calls:', loggerError)

            screen.debug()
            expect(screen.getByText('Independent t-test')).toBeInTheDocument()
            expect(screen.getByText('AI 강력 추천')).toBeInTheDocument()
        }, { timeout: 3000 })
    })
})
