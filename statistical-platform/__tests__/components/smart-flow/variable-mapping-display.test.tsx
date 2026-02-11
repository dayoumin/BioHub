/**
 * Test suite for VariableMappingDisplay component
 *
 * Bug #2: dependentVar array formatting (should use join(', ') like independentVar)
 */

import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { VariableMappingDisplay } from '@/components/smart-flow/steps/purpose/VariableMappingDisplay'
import { VariableMapping } from '@/lib/statistics/variable-mapping'

// Mock: Terminology
vi.mock('@/hooks/use-terminology', async () => {
  const { aquaculture } = await import('@/lib/terminology/domains/aquaculture')
  return {
    useTerminology: () => aquaculture,
    useTerminologyContext: () => ({
      dictionary: aquaculture,
      setDomain: vi.fn(),
      currentDomain: 'aquaculture',
    }),
  }
})

describe('VariableMappingDisplay - Array Formatting', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  describe('Bug #2: dependentVar array formatting', () => {
    it('should format single dependentVar as string', () => {
      const mapping: VariableMapping = {
        dependentVar: 'score',
      }

      render(<VariableMappingDisplay mapping={mapping} onClose={mockOnClose} />)

      // Should display as plain string
      expect(screen.getByText('score')).toBeInTheDocument()
    })

    it('should format dependentVar array with comma separator', () => {
      const mapping: VariableMapping = {
        dependentVar: ['before', 'after'],
      }

      render(<VariableMappingDisplay mapping={mapping} onClose={mockOnClose} />)

      // Should display as "before, after" (NOT "beforeafter")
      expect(screen.getByText('before, after')).toBeInTheDocument()
    })

    it('should format multiple dependentVar items correctly', () => {
      const mapping: VariableMapping = {
        dependentVar: ['score1', 'score2', 'score3'],
      }

      render(<VariableMappingDisplay mapping={mapping} onClose={mockOnClose} />)

      expect(screen.getByText('score1, score2, score3')).toBeInTheDocument()
    })
  })

  describe('independentVar array formatting (baseline behavior)', () => {
    it('should format single independentVar as string', () => {
      const mapping: VariableMapping = {
        independentVar: 'treatment',
      }

      render(<VariableMappingDisplay mapping={mapping} onClose={mockOnClose} />)

      expect(screen.getByText('treatment')).toBeInTheDocument()
    })

    it('should format independentVar array with comma separator', () => {
      const mapping: VariableMapping = {
        independentVar: ['group1', 'group2'],
      }

      render(<VariableMappingDisplay mapping={mapping} onClose={mockOnClose} />)

      expect(screen.getByText('group1, group2')).toBeInTheDocument()
    })
  })

  describe('Consistent formatting across variable types', () => {
    it('should use same formatting for both dependent and independent arrays', () => {
      const mapping: VariableMapping = {
        dependentVar: ['before', 'after'],
        independentVar: ['control', 'treatment'],
      }

      render(<VariableMappingDisplay mapping={mapping} onClose={mockOnClose} />)

      // Both should use comma separator
      expect(screen.getByText('before, after')).toBeInTheDocument()
      expect(screen.getByText('control, treatment')).toBeInTheDocument()
    })

    it('should handle variables array formatting', () => {
      const mapping: VariableMapping = {
        variables: ['var1', 'var2', 'var3'],
      }

      render(<VariableMappingDisplay mapping={mapping} onClose={mockOnClose} />)

      expect(screen.getByText('var1, var2, var3')).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('should handle empty array (renders badge but empty content)', () => {
      const mapping: VariableMapping = {
        dependentVar: [],
      }

      render(<VariableMappingDisplay mapping={mapping} onClose={mockOnClose} />)

      // Empty array is truthy in JavaScript, so badge still renders
      // The join(', ') on empty array produces empty string
      const badge = screen.getByText('종속변수')
      expect(badge).toBeInTheDocument()
    })

    it('should handle single-item array', () => {
      const mapping: VariableMapping = {
        dependentVar: ['single'],
      }

      render(<VariableMappingDisplay mapping={mapping} onClose={mockOnClose} />)

      expect(screen.getByText('single')).toBeInTheDocument()
    })

    it('should handle variable names with special characters', () => {
      const mapping: VariableMapping = {
        dependentVar: ['before-test', 'after_test', 'test.score'],
      }

      render(<VariableMappingDisplay mapping={mapping} onClose={mockOnClose} />)

      expect(screen.getByText('before-test, after_test, test.score')).toBeInTheDocument()
    })
  })
})
