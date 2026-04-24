import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatThread } from '@/components/analysis/hub/ChatThread'
import type { AIRecommendation, DiagnosticReport } from '@/types/analysis'

const hubChatState = {
  messages: [
    {
      id: 'assistant-1',
      role: 'assistant' as const,
      content: 'Diagnostic result',
      timestamp: Date.now(),
      suggestUpload: true,
      diagnosticReport: {
        uploadNonce: 1,
        basicStats: {
          totalRows: 24,
          groups: [
            { name: 'Control', count: 12 },
            { name: 'Treatment', count: 12 },
          ],
          numericSummaries: [
            { column: 'weight', mean: 10, std: 2, min: 5, max: 15 },
          ],
        },
        assumptions: {
          normality: {
            groups: [
              { groupName: 'Control', statistic: 0.95, pValue: 0.12, passed: true },
              { groupName: 'Treatment', statistic: 0.93, pValue: 0.08, passed: true },
            ],
            overallPassed: true,
            testMethod: 'shapiro-wilk',
          },
          homogeneity: {
            levene: {
              statistic: 4.1,
              pValue: 0.03,
              equalVariance: false,
            },
          },
        },
        variableAssignments: null,
        pendingClarification: null,
      } as unknown as DiagnosticReport,
      diagnosticRecommendation: {} as unknown as AIRecommendation,
    },
  ],
  isStreaming: false,
  streamingStatus: null,
}

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/common/RecommendationCard', () => ({
  RecommendationCard: () => <div data-testid="recommendation-card" />,
}))

vi.mock('@/components/analysis/hub/VariablePicker', () => ({
  VariablePicker: () => <div data-testid="variable-picker" />,
}))

vi.mock('@/lib/stores/hub-chat-store', () => ({
  useHubChatStore: (selector: (state: typeof hubChatState) => unknown) => selector(hubChatState),
}))

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    language: 'en',
  }),
}))

describe('ChatThread', () => {
  it('renders English fallback copy for diagnostic cards and upload CTA', () => {
    render(
      <ChatThread
        onMethodSelect={vi.fn()}
        onUploadClick={vi.fn()}
        onDiagnosticStart={vi.fn()}
        onAlternativeSearch={vi.fn()}
      />
    )

    expect(screen.getByRole('log', { name: 'Conversation history' })).toBeInTheDocument()
    expect(screen.getByText('New chat')).toBeInTheDocument()
    expect(screen.getByText('Diagnostic summary')).toBeInTheDocument()
    expect(screen.getByText(/Normality: Passed/)).toBeInTheDocument()
    expect(screen.getByText(/Homogeneity: Failed/)).toBeInTheDocument()
    expect(screen.getByText('Start analysis')).toBeInTheDocument()
    expect(screen.getByText('Browse alternatives')).toBeInTheDocument()
    expect(screen.getByText('Upload data for more accurate analysis recommendations')).toBeInTheDocument()
  })
})
