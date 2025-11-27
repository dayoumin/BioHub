import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DataExplorationStep } from '@/components/smart-flow/steps/DataExplorationStep'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { ColumnStatistics } from '@/types/smart-flow'

// Mock dependencies
jest.mock('@/lib/stores/smart-flow-store', () => ({
    useSmartFlowStore: jest.fn()
}))

jest.mock('@/components/smart-flow/steps/DataUploadStep', () => ({
    DataUploadStep: () => <div data-testid="data-upload-step">DataUploadStep</div>
}))

jest.mock('@/components/providers/PyodideProvider', () => ({
    usePyodide: () => ({
        isLoaded: true,
        isLoading: false,
        service: {
            checkAllAssumptions: jest.fn().mockResolvedValue({
                summary: 'Mock Summary',
                normality: { shapiroWilk: { isNormal: true, pValue: 0.5, statistic: 0.9 } },
                homogeneity: { levene: { equalVariance: true, pValue: 0.5, statistic: 0.9 } }
            })
        },
        runPython: jest.fn(),
        runAnalysis: jest.fn()
    })
}))

// Mock child components to avoid complex rendering in unit test
jest.mock('@/components/smart-flow/steps/exploration/VariableGallery', () => ({
    VariableGallery: ({ variables, onVariableSelect }: any) => (
        <div data-testid="variable-gallery">
            {variables.map((v: any) => (
                <button key={v.name} onClick={() => onVariableSelect(v)}>
                    {v.name}
                </button>
            ))}
        </div>
    )
}))

jest.mock('@/components/smart-flow/steps/exploration/VariableDetailPanel', () => ({
    VariableDetailPanel: ({ variable }: any) => (
        <div data-testid="variable-detail-panel">
            Detail: {variable?.name}
        </div>
    )
}))

jest.mock('@/components/common/analysis/DataProfileSummary', () => ({
    DataProfileSummary: () => <div data-testid="data-profile-summary">DataProfileSummary</div>
}))

jest.mock('@/components/smart-flow/StepNavigation', () => ({
    StepNavigation: () => <div data-testid="step-navigation">StepNavigation</div>
}))

jest.mock('@/components/common/analysis/DataPreviewTable', () => ({
    DataPreviewTable: () => <div data-testid="data-preview-table">DataPreviewTable</div>
}))

jest.mock('@/components/smart-flow/steps/validation/charts/CorrelationHeatmap', () => ({
    CorrelationHeatmap: () => <div data-testid="correlation-heatmap">CorrelationHeatmap</div>
}))

jest.mock('@/components/charts/scatterplot', () => ({
    Scatterplot: () => <div data-testid="scatterplot">Scatterplot</div>
}))

jest.mock('@/components/charts/histogram', () => ({
    Histogram: () => <div data-testid="histogram">Histogram</div>
}))

jest.mock('@/components/charts/boxplot', () => ({
    BoxPlot: () => <div data-testid="boxplot">BoxPlot</div>
}))

// Mock Recharts to avoid sizing issues in test environment
jest.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    ScatterChart: () => <div>ScatterChart</div>,
    Scatter: () => <div>Scatter</div>,
    XAxis: () => <div>XAxis</div>,
    YAxis: () => <div>YAxis</div>,
    ZAxis: () => <div>ZAxis</div>,
    Tooltip: () => <div>Tooltip</div>,
    CartesianGrid: () => <div>CartesianGrid</div>
}))

describe('DataExplorationStep', () => {
    const mockValidationResults = {
        isValid: true,
        totalRows: 100,
        columnCount: 3,
        missingValues: 0,
        dataType: 'csv',
        variables: ['age', 'income', 'gender'],
        errors: [],
        warnings: [],
        columnStats: [
            { name: 'age', type: 'numeric', uniqueValues: 50, missingCount: 0, mean: 30 } as ColumnStatistics,
            { name: 'income', type: 'numeric', uniqueValues: 100, missingCount: 0, mean: 50000 } as ColumnStatistics,
            { name: 'gender', type: 'categorical', uniqueValues: 2, missingCount: 0, topValues: [{ value: 'M', count: 50 }] } as ColumnStatistics
        ]
    }

    const mockData = [
        { age: 25, income: 30000, gender: 'M' },
        { age: 35, income: 60000, gender: 'F' }
    ]

    beforeEach(() => {
        (useSmartFlowStore as unknown as jest.Mock).mockReturnValue({
            validationResults: mockValidationResults,
            uploadedData: mockData,
            setAnalysisConfig: jest.fn(),
            setCurrentStep: jest.fn(),
            setAssumptionResults: jest.fn(),
            uploadedFile: null,
            uploadedFileName: 'test.csv'
        })
    })

    it('renders the dashboard layout correctly', () => {
        render(
            <DataExplorationStep
                onNext={jest.fn()}
                onPrevious={jest.fn()}
                data={mockData}
                validationResults={mockValidationResults as any}
            />
        )

        // Check for main sections
        expect(screen.getByText('데이터 탐색')).toBeInTheDocument()
        expect(screen.getByText('변수 상세 분석')).toBeInTheDocument()
        expect(screen.getByText('상관관계 분석')).toBeInTheDocument()

        // Check for VariableGallery
        expect(screen.getByTestId('variable-gallery')).toBeInTheDocument()
        expect(screen.getByText('age')).toBeInTheDocument()
        expect(screen.getByText('income')).toBeInTheDocument()
    })

    it('switches tabs correctly', () => {
        render(
            <DataExplorationStep
                onNext={jest.fn()}
                onPrevious={jest.fn()}
                data={mockData}
                validationResults={mockValidationResults as any}
            />
        )

        // Default tab should be Variables
        expect(screen.getByTestId('variable-gallery')).toBeVisible()

        // Click Correlation tab
        fireEvent.click(screen.getByText('상관관계 분석'))

        // Check if correlation content is shown
        expect(screen.getByText('상관계수 행렬')).toBeInTheDocument()
    })

    it('updates detail panel when variable is selected', async () => {
        render(
            <DataExplorationStep
                onNext={jest.fn()}
                onPrevious={jest.fn()}
                data={mockData}
                validationResults={mockValidationResults as any}
            />
        )

        // Click 'income'
        fireEvent.click(screen.getByText('income'))

        // Check detail panel
        await waitFor(() => {
            expect(screen.getByTestId('variable-detail-panel')).toHaveTextContent('Detail: income')
        })
    })
})
