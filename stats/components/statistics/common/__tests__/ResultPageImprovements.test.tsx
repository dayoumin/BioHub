import React from 'react'
import { vi, Mock } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { EasyExplanation } from '../EasyExplanation'
import { NextStepsCard } from '../NextStepsCard'
import { AssumptionTestCard } from '../AssumptionTestCard'
import { useSettingsStore } from '@/lib/stores/settings-store'

// Mock Settings Store
vi.mock('@/lib/stores/settings-store', () => ({
    useSettingsStore: vi.fn(),
}))

describe('Result Page Improvements', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Default mock for store
        ;(useSettingsStore as unknown as Mock).mockReturnValue({
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
                    effectSize={{ value: 0.8, type: 'cohensD' }}
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

    describe('AssumptionTestCard', () => {
        const mockTests = [
            {
                name: 'Normality',
                passed: false,
                pValue: 0.01,
            }
        ]

        it('should show violation badge when tests fail', () => {
            render(
                <AssumptionTestCard
                    tests={mockTests}
                    testType="t-test"
                />
            )
            expect(screen.getByText(/위반/)).toBeInTheDocument()
        })
    })
})
