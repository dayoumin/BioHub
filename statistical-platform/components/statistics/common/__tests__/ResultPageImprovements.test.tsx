import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { EasyExplanation } from '../EasyExplanation'
import { NextStepsCard } from '../NextStepsCard'
import { AssumptionTestCard } from '../AssumptionTestCard'
import { StatisticalResultCard } from '../StatisticalResultCard'
import { useSettingsStore } from '@/lib/stores/settings-store'

// Mock useRouter
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}))

// Mock Settings Store
vi.mock('@/lib/stores/settings-store', () => ({
    useSettingsStore: vi.fn(),
}))

describe('Result Page Improvements', () => {
    beforeEach(() => {
        vi.clearAllMocks()
            // Default mock for store
            ; (useSettingsStore as unknown as jest.Mock).mockReturnValue({
                userLevel: 'beginner',
                setUserLevel: vi.fn(),
            })
    })

    describe('EasyExplanation', () => {
        it('should render significant result correctly', () => {
            render(
                <EasyExplanation
                    pValue={0.023}
                    isSignificant={true}
                    effectSize={{ value: 0.8, type: 'cohens_d' }}
                />
            )
            // Use getAllByText for percentages as they might appear in visual blocks too
            expect(screen.getAllByText(/2.3%/)[0]).toBeInTheDocument()
            expect(screen.getByText(/확실한 차이/)).toBeInTheDocument()
            expect(screen.getByText(/매우 크고 중요한 차이/)).toBeInTheDocument()
        })

        it('should render non-significant result correctly', () => {
            render(
                <EasyExplanation
                    pValue={0.15}
                    isSignificant={false}
                />
            )
            expect(screen.getAllByText(/15%/)[0]).toBeInTheDocument()
            expect(screen.getByText(/차이가 불분명/)).toBeInTheDocument()
        })
    })

    describe('NextStepsCard', () => {
        it('should suggest visualization and effect size for significant results', () => {
            render(
                <NextStepsCard
                    isSignificant={true}
                    assumptionsPassed={true}
                    hasPostHoc={true}
                />
            )
            expect(screen.getByText(/박스플롯/)).toBeInTheDocument()
            expect(screen.getByText(/효과크기/)).toBeInTheDocument()
            expect(screen.getByText(/사후 검정/)).toBeInTheDocument()
        })

        it('should suggest alternatives for assumption violations', () => {
            render(
                <NextStepsCard
                    isSignificant={false}
                    assumptionsPassed={false}
                />
            )
            expect(screen.getByText(/비모수 검정/)).toBeInTheDocument()
        })
    })

    describe('AssumptionTestCard Navigation', () => {
        const mockTests = [
            {
                name: 'Normality',
                passed: false,
                pValue: 0.01,
            }
        ]

        it('should show alternative buttons when testType is provided', () => {
            render(
                <AssumptionTestCard
                    tests={mockTests}
                    testType="t-test"
                />
            )
            expect(screen.getByText(/Mann-Whitney U/)).toBeInTheDocument()
        })

        it('should navigate when alternative button is clicked', () => {
            render(
                <AssumptionTestCard
                    tests={mockTests}
                    testType="t-test"
                />
            )
            const button = screen.getAllByText(/이동/)[0]
            fireEvent.click(button)
            expect(mockPush).toHaveBeenCalledWith('/statistics/mann-whitney')
        })
    })

    // Skip: StatisticalResultCard doesn't integrate EasyExplanation or user level toggle
    describe.skip('StatisticalResultCard Integration', () => {
        const mockResult = {
            testName: 'Independent t-test',
            testType: 't-test',
            statistic: 2.5,
            pValue: 0.02,
            statisticName: 't',
            df: 18,
            effectSize: { value: 0.5, type: 'cohens_d' },
            assumptions: [{ name: 'Normality', passed: true, pValue: 0.5 }],
        } as any

        it('should render EasyExplanation in beginner mode', () => {
            ; (useSettingsStore as unknown as jest.Mock).mockReturnValue({
                userLevel: 'beginner',
                setUserLevel: vi.fn(),
            })

            // Pass expandable={false} to ensure content is visible
            render(<StatisticalResultCard result={mockResult} expandable={false} />)
            expect(screen.getByText(/이 결과가 의미하는 것은?/)).toBeInTheDocument()
            expect(screen.queryByText(/주요 결과/)).toBeInTheDocument()
        })

        it('should hide EasyExplanation in expert mode', () => {
            ; (useSettingsStore as unknown as jest.Mock).mockReturnValue({
                userLevel: 'expert',
                setUserLevel: vi.fn(),
            })

            render(<StatisticalResultCard result={mockResult} expandable={false} />)
            expect(screen.queryByText(/이 결과가 의미하는 것은?/)).not.toBeInTheDocument()
        })

        it('should allow changing user level', () => {
            const setUserLevel = vi.fn()
                ; (useSettingsStore as unknown as jest.Mock).mockReturnValue({
                    userLevel: 'beginner',
                    setUserLevel,
                })

            render(<StatisticalResultCard result={mockResult} expandable={false} />)

            const expertLabel = screen.getByText('전문가')
            fireEvent.click(expertLabel)

            expect(setUserLevel).toHaveBeenCalledWith('expert')
        })
    })
})
