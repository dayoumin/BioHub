import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PurposeInputStep } from '@/components/smart-flow/steps/PurposeInputStep'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { useSettingsStore } from '@/lib/stores/settings-store'
import { DecisionTreeRecommender } from '@/lib/services/decision-tree-recommender'

jest.mock('@/lib/stores/smart-flow-store', () => ({
    useSmartFlowStore: jest.fn()
}))

jest.mock('@/lib/stores/settings-store', () => ({
    useSettingsStore: jest.fn()
}))

jest.mock('@/lib/services/decision-tree-recommender', () => ({
    DecisionTreeRecommender: {
        recommend: jest.fn(),
        recommendWithoutAssumptions: jest.fn(),
        recommendWithCompatibility: jest.fn(),
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

jest.mock('@/components/common/analysis/PurposeCard', () => ({
    PurposeCard: ({ title, onClick, selected }: { title: string; onClick: () => void; selected: boolean }) => (
        <button data-testid={`purpose-card-${title}`} onClick={onClick} aria-selected={selected}>
            {title}
        </button>
    )
}))

jest.mock('@/components/smart-flow/steps/purpose/MethodBrowser', () => ({
    MethodBrowser: ({ selectedMethod, recommendedMethodId }: { selectedMethod: { name: string } | null; recommendedMethodId?: string }) => (
        <div data-testid="method-browser">
            <span data-testid="method-browser-selected">{selectedMethod?.name || 'None'}</span>
            <span data-testid="method-browser-recommended">{recommendedMethodId || 'None'}</span>
        </div>
    )
}))

describe('PurposeInputStep', () => {
    const mockValidationResults = {
        columns: [
            { name: 'age', type: 'numeric' },
            { name: 'group', type: 'categorical' }
        ]
    }
    const mockData = [{ age: 20, group: 'A' }]

    const goToQuestions = async () => {
        fireEvent.click(screen.getByRole('button', { name: /차이\/비교 분석/ }))

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /어떤 분석/ })).toBeInTheDocument()
        }, { timeout: 3000 })

        fireEvent.click(screen.getByRole('button', { name: /평균/ }))

        await waitFor(() => {
            expect(screen.getByText('직접 선택')).toBeInTheDocument()
        }, { timeout: 3000 })
    }

    beforeEach(() => {
        jest.clearAllMocks()

        const defaultStoreState = {
            assumptionResults: {},
            setSelectedMethod: jest.fn(),
            setDetectedVariables: jest.fn()
        }
        ;(useSmartFlowStore as unknown as jest.Mock).mockImplementation(
            (selector: (state: typeof defaultStoreState) => unknown) => selector(defaultStoreState)
        )

        const defaultSettingsState = {
            useOllamaForRecommendation: false
        }
        ;(useSettingsStore as unknown as jest.Mock).mockImplementation(
            (selector: (state: typeof defaultSettingsState) => unknown) => selector(defaultSettingsState)
        )
    })

    it('renders category selection cards', () => {
        render(
            <PurposeInputStep
                onPurposeSubmit={jest.fn()}
                validationResults={mockValidationResults as unknown as Parameters<typeof PurposeInputStep>[0]['validationResults']}
                data={mockData}
            />
        )

        expect(screen.getByRole('heading', { name: /무엇을 알고/ })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /차이\/비교 분석/ })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /관계 분석/ })).toBeInTheDocument()
    })

    it('shows Guided Questions when subcategory is selected (new flow)', async () => {
        render(
            <PurposeInputStep
                onPurposeSubmit={jest.fn()}
                validationResults={mockValidationResults as unknown as Parameters<typeof PurposeInputStep>[0]['validationResults']}
                data={mockData}
            />
        )

        await goToQuestions()
    })

    it('shows back button in Guided Questions step', async () => {
        render(
            <PurposeInputStep
                onPurposeSubmit={jest.fn()}
                validationResults={mockValidationResults as unknown as Parameters<typeof PurposeInputStep>[0]['validationResults']}
                data={mockData}
            />
        )

        await goToQuestions()

        expect(screen.getByRole('button', { name: /목적 선택으로/ })).toBeInTheDocument()
    })

    it('can go back to subcategory selection from questions', async () => {
        render(
            <PurposeInputStep
                onPurposeSubmit={jest.fn()}
                validationResults={mockValidationResults as unknown as Parameters<typeof PurposeInputStep>[0]['validationResults']}
                data={mockData}
            />
        )

        await goToQuestions()
        fireEvent.click(screen.getByRole('button', { name: /목적 선택으로/ }))

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /어떤 분석/ })).toBeInTheDocument()
        }, { timeout: 3000 })
    })

    it('does not show legacy method selection UI in questions step', async () => {
        render(
            <PurposeInputStep
                onPurposeSubmit={jest.fn()}
                validationResults={mockValidationResults as unknown as Parameters<typeof PurposeInputStep>[0]['validationResults']}
                data={mockData}
            />
        )

        await goToQuestions()

        expect(screen.queryByText('분석 방법 선택')).not.toBeInTheDocument()
    })

    describe('Browse Mode (전체 방법 보기)', () => {
        it('enters browse mode from questions and renders MethodBrowser', async () => {
            render(
                <PurposeInputStep
                    onPurposeSubmit={jest.fn()}
                    validationResults={mockValidationResults as unknown as Parameters<typeof PurposeInputStep>[0]['validationResults']}
                    data={mockData}
                />
            )

            await goToQuestions()
            fireEvent.click(screen.getByText('직접 선택'))

            await waitFor(() => {
                expect(screen.getByTestId('method-browser')).toBeInTheDocument()
            }, { timeout: 3000 })
        })

        it('passes recommended method id into MethodBrowser in browse mode', async () => {
            const mockResult = {
                method: { id: 't-test', name: 'Independent t-test', description: 'Compare means', category: 'compare' },
                confidence: 0.9,
                reasoning: ['Two groups detected', 'Numeric variable']
            }
            ;(DecisionTreeRecommender.recommendWithoutAssumptions as jest.Mock).mockReturnValue(mockResult)

            render(
                <PurposeInputStep
                    onPurposeSubmit={jest.fn()}
                    validationResults={mockValidationResults as unknown as Parameters<typeof PurposeInputStep>[0]['validationResults']}
                    data={mockData}
                />
            )

            await goToQuestions()
            fireEvent.click(screen.getByText('직접 선택'))

            await waitFor(() => {
                expect(screen.getByTestId('method-browser')).toBeInTheDocument()
            }, { timeout: 3000 })

            await waitFor(() => {
                expect(screen.getByTestId('method-browser-recommended')).toHaveTextContent('t-test')
            }, { timeout: 3000 })
        })

        it('shows selected-method-bar and calls onPurposeSubmit', async () => {
            const mockOnPurposeSubmit = jest.fn()
            const mockSetSelectedMethod = jest.fn()
            const mockSetDetectedVariables = jest.fn()

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
            ;(DecisionTreeRecommender.recommendWithoutAssumptions as jest.Mock).mockReturnValue(mockResult)

            render(
                <PurposeInputStep
                    onPurposeSubmit={mockOnPurposeSubmit}
                    validationResults={mockValidationResults as unknown as Parameters<typeof PurposeInputStep>[0]['validationResults']}
                    data={mockData}
                />
            )

            await goToQuestions()
            fireEvent.click(screen.getByText('직접 선택'))

            await waitFor(() => {
                expect(screen.getByTestId('selected-method-bar')).toBeInTheDocument()
            }, { timeout: 3000 })

            expect(screen.getByTestId('final-selected-method-name')).toHaveTextContent('Independent t-test')

            fireEvent.click(screen.getByRole('button', { name: /분석/ }))

            await waitFor(() => {
                expect(mockSetSelectedMethod).toHaveBeenCalledWith(mockResult.method)
                expect(mockSetDetectedVariables).toHaveBeenCalled()
                expect(mockOnPurposeSubmit).toHaveBeenCalledWith(expect.any(String), mockResult.method)
            }, { timeout: 3000 })
        })
    })
})

