/**
 * AnalysisInfoCard Component Tests
 *
 * Tests:
 * 1. Basic rendering with various props
 * 2. Data quality summary display
 * 3. Assumption test summary display
 * 4. Variable mapping display
 * 5. Edge cases and null handling
 */

import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { AnalysisInfoCard } from '@/components/smart-flow/components/AnalysisInfoCard'
import { StatisticalMethod, ValidationResults, StatisticalAssumptions } from '@/types/smart-flow'
import { VariableMapping } from '@/lib/statistics/variable-mapping'

// Mock useTerminology (AnalysisInfoCard uses useTerminology())
vi.mock('@/hooks/use-terminology', () => ({
    useTerminology: () => ({
        analysisInfo: {
            cardTitle: '분석 정보',
            labels: {
                fileName: '파일명',
                dataSize: '데이터 크기',
                method: '분석 방법',
                analysisTime: '분석 시간',
                dataQuality: '데이터 품질',
                assumptions: '가정 검정',
                variables: '변수 구성',
            },
            variableRoles: {
                dependent: '종속변수',
                independent: '독립변수',
                group: '그룹변수',
                factor: 'Factor 변수',
                paired: 'Paired 변수',
            },
            dataQuality: {
                missingValues: (count: number, percent: string) => `결측값 ${count}개 (${percent}%)`,
                duplicateRows: (count: number) => `중복 행 ${count}개`,
                warnings: (count: number) => `${count}개 경고`,
            },
            assumptions: {
                normality: '정규성',
                homogeneity: '등분산성',
                independence: '독립성',
                met: '충족',
                partialViolation: '일부 위반',
                allGroupsNormal: '모든 그룹 정규',
                someGroupsNonNormal: '일부 그룹 비정규',
            },
            units: {
                rows: '행',
                nVariables: (count: number) => `${count}개 변수`,
            },
        },
    }),
    useTerminologyContext: () => ({ dictionary: { domain: 'generic' }, setDomain: vi.fn(), currentDomain: 'generic' }),
}))

describe('AnalysisInfoCard', () => {
  // Test fixtures
  const mockMethod: StatisticalMethod = {
    id: 'independent-t-test',
    name: 'Independent T-Test',
    description: 'Compare means of two independent groups',
    category: 't-test'
  }

  const mockVariableMapping: VariableMapping = {
    dependentVar: 'score',
    groupVar: 'treatment'
  }

  const mockValidationResults: ValidationResults = {
    isValid: true,
    totalRows: 100,
    columnCount: 5,
    missingValues: 3,
    duplicateRows: 2,
    dataType: 'numeric',
    variables: ['id', 'score', 'treatment', 'age', 'gender'],
    errors: [],
    warnings: ['Some outliers detected']
  }

  const mockAssumptionResults: StatisticalAssumptions = {
    normality: {
      shapiroWilk: {
        statistic: 0.98,
        pValue: 0.15,
        isNormal: true
      }
    },
    homogeneity: {
      levene: {
        statistic: 1.23,
        pValue: 0.27,
        equalVariance: true
      }
    },
    summary: {
      meetsAssumptions: true,
      recommendation: 'Parametric test is appropriate',
      canUseParametric: true,
      reasons: ['Normality satisfied', 'Equal variance confirmed'],
      recommendations: []
    }
  }

  describe('1. Basic Rendering', () => {
    it('renders with minimal props', () => {
      render(<AnalysisInfoCard />)
      expect(screen.getByText('분석 정보')).toBeInTheDocument()
    })

    it('displays file name when provided', () => {
      render(<AnalysisInfoCard fileName="test_data.csv" />)
      expect(screen.getByText('test_data.csv')).toBeInTheDocument()
      expect(screen.getByText('파일명')).toBeInTheDocument()
    })

    it('displays data size correctly', () => {
      render(<AnalysisInfoCard dataRows={150} dataColumns={8} />)
      // Text is split across elements, use regex to match partial content
      expect(screen.getByText(/150\s*행/)).toBeInTheDocument()
      expect(screen.getByText(/8개 변수/)).toBeInTheDocument()
    })

    it('formats large row counts with locale string', () => {
      render(<AnalysisInfoCard dataRows={10000} />)
      expect(screen.getByText(/10,000\s*행/)).toBeInTheDocument()
    })

    it('displays method name when provided', () => {
      render(<AnalysisInfoCard method={mockMethod} />)
      expect(screen.getByText('Independent T-Test')).toBeInTheDocument()
      expect(screen.getByText('분석 방법')).toBeInTheDocument()
    })

    it('displays timestamp when provided', () => {
      const testDate = new Date('2025-11-27T14:30:00')
      render(<AnalysisInfoCard timestamp={testDate} />)
      expect(screen.getByText('분석 시간')).toBeInTheDocument()
      // Date format depends on locale, just check it's present
      expect(screen.getByText(/2025/)).toBeInTheDocument()
    })
  })

  describe('2. Data Quality Summary', () => {
    it('displays missing values count and percentage', () => {
      render(
        <AnalysisInfoCard
          dataRows={100}
          validationResults={mockValidationResults}
        />
      )
      expect(screen.getByText('데이터 품질')).toBeInTheDocument()
      expect(screen.getByText(/결측값 3개/)).toBeInTheDocument()
    })

    it('displays duplicate rows warning', () => {
      render(
        <AnalysisInfoCard
          validationResults={mockValidationResults}
        />
      )
      expect(screen.getByText('중복 행 2개')).toBeInTheDocument()
    })

    it('displays warning count', () => {
      render(
        <AnalysisInfoCard
          validationResults={mockValidationResults}
        />
      )
      expect(screen.getByText('1개 경고')).toBeInTheDocument()
    })

    it('does not show data quality section when no issues', () => {
      const cleanResults: ValidationResults = {
        ...mockValidationResults,
        missingValues: 0,
        duplicateRows: 0,
        warnings: []
      }
      render(<AnalysisInfoCard validationResults={cleanResults} />)
      expect(screen.queryByText('데이터 품질')).not.toBeInTheDocument()
    })

    it('handles zero dataRows gracefully for percentage calculation', () => {
      const resultsWithMissing: ValidationResults = {
        ...mockValidationResults,
        missingValues: 5
      }
      // dataRows is 0/undefined - should show '?' for percentage
      render(<AnalysisInfoCard dataRows={0} validationResults={resultsWithMissing} />)
      expect(screen.getByText(/결측값 5개/)).toBeInTheDocument()
    })
  })

  describe('3. Assumption Test Summary', () => {
    it('displays assumption checks with pass/fail status', () => {
      render(<AnalysisInfoCard assumptionResults={mockAssumptionResults} />)
      expect(screen.getByText('가정 검정')).toBeInTheDocument()
      expect(screen.getByText('정규성')).toBeInTheDocument()
      expect(screen.getByText('등분산성')).toBeInTheDocument()
    })

    it('shows overall assumption status badge', () => {
      render(<AnalysisInfoCard assumptionResults={mockAssumptionResults} />)
      expect(screen.getByText('충족')).toBeInTheDocument()
    })

    it('shows violation status when assumptions not met', () => {
      const failedAssumptions: StatisticalAssumptions = {
        normality: {
          shapiroWilk: {
            statistic: 0.85,
            pValue: 0.001,
            isNormal: false
          }
        },
        summary: {
          meetsAssumptions: false,
          recommendation: 'Consider non-parametric test',
          canUseParametric: false,
          reasons: ['Normality violated'],
          recommendations: ['Use Mann-Whitney U test']
        }
      }
      render(<AnalysisInfoCard assumptionResults={failedAssumptions} />)
      expect(screen.getByText('일부 위반')).toBeInTheDocument()
    })

    it('displays p-values correctly', () => {
      render(<AnalysisInfoCard assumptionResults={mockAssumptionResults} />)
      // p = 0.150 for normality
      expect(screen.getByText(/p = 0\.150/)).toBeInTheDocument()
    })

    it('formats very small p-values correctly', () => {
      const smallPValueAssumptions: StatisticalAssumptions = {
        normality: {
          shapiroWilk: {
            statistic: 0.75,
            pValue: 0.0001,
            isNormal: false
          }
        }
      }
      render(<AnalysisInfoCard assumptionResults={smallPValueAssumptions} />)
      expect(screen.getByText(/p < \.001/)).toBeInTheDocument()
    })

    it('handles group-based normality results', () => {
      const groupNormality: StatisticalAssumptions = {
        normality: {
          group1: { isNormal: true },
          group2: { isNormal: false }
        }
      }
      render(<AnalysisInfoCard assumptionResults={groupNormality} />)
      expect(screen.getByText('정규성')).toBeInTheDocument()
      expect(screen.getByText(/일부 그룹 비정규/)).toBeInTheDocument()
    })

    it('handles independence test results', () => {
      const independenceResults: StatisticalAssumptions = {
        independence: {
          durbin: {
            statistic: 1.95,
            pValue: 0.35,
            isIndependent: true
          }
        }
      }
      render(<AnalysisInfoCard assumptionResults={independenceResults} />)
      expect(screen.getByText('독립성')).toBeInTheDocument()
    })

    // --- testError 시나리오 시뮬레이션 ---

    it('[시뮬레이션] testError + normality 성공: "판정 불가" 표시, "일부 위반" 미표시', () => {
      // 정규성 성공, 등분산성 catch 후 testError=true
      const partialError: StatisticalAssumptions = {
        normality: {
          shapiroWilk: { statistic: 0.97, pValue: 0.12, isNormal: true }
        },
        homogeneity: {},          // levene 없음 (catch 후 빈 객체)
        summary: {
          canUseParametric: true, // catch 전 초기값 유지 (버그: 이전엔 이것이 meetsAssumptions=true로 표시됨)
          reasons: ['등분산성 검정 실패 — 결과 신뢰 불가'],
          recommendations: ['검정 실패 — 가정 판정 불가, 전문가 확인 권장'],
          testError: true,
          meetsAssumptions: undefined // AnalysisExecutionStep에서 testError → undefined 처리
        }
      }
      render(<AnalysisInfoCard assumptionResults={partialError} />)

      // 전체 판정: "판정 불가"여야 함 (이전 버그: "일부 위반"으로 표시됨)
      expect(screen.getByText('판정 불가')).toBeInTheDocument()
      expect(screen.queryByText('일부 위반')).not.toBeInTheDocument()
      expect(screen.queryByText('충족')).not.toBeInTheDocument()

      // 개별 체크: 정규성만 표시 (등분산성은 levene 없음 → 체크 없음)
      expect(screen.getByText('정규성')).toBeInTheDocument()
      expect(screen.queryByText('등분산성')).not.toBeInTheDocument() // false positive 방지
    })

    it('[시뮬레이션] testError + 두 검정 모두 실패: false positive 체크 없음', () => {
      // 정규성/등분산성 모두 catch 후 testError=true
      const bothError: StatisticalAssumptions = {
        normality: {},            // shapiroWilk 없음
        homogeneity: {},          // levene 없음
        summary: {
          canUseParametric: true, // 초기값 유지
          reasons: ['정규성 검정 실패 — 결과 신뢰 불가', '등분산성 검정 실패 — 결과 신뢰 불가'],
          recommendations: ['검정 실패 — 가정 판정 불가, 전문가 확인 권장'],
          testError: true,
          meetsAssumptions: undefined
        }
      }
      render(<AnalysisInfoCard assumptionResults={bothError} />)

      // 개별 체크 배지가 전혀 없어야 함 (이전 버그: 정규성 ✓, 등분산성 ✓ false positive)
      expect(screen.queryByText('정규성')).not.toBeInTheDocument()
      expect(screen.queryByText('등분산성')).not.toBeInTheDocument()

      // 가정 검정 섹션 자체가 checks.length === 0이므로 렌더링 안 됨
      expect(screen.queryByText('가정 검정')).not.toBeInTheDocument()
    })

    it('[시뮬레이션] 빈 객체 homogeneity: 등분산성 체크 미표시 (false positive 방지)', () => {
      // groupVar 없는 분석 (상관분석 등) — homogeneity가 빈 객체로 저장됨
      const noGroupAnalysis: StatisticalAssumptions = {
        normality: { shapiroWilk: { statistic: 0.96, pValue: 0.08, isNormal: true } },
        homogeneity: {},  // levene 없음
        summary: {
          canUseParametric: true,
          reasons: [],
          recommendations: ['모수 검정 사용 가능'],
          meetsAssumptions: true
        }
      }
      render(<AnalysisInfoCard assumptionResults={noGroupAnalysis} />)

      expect(screen.getByText('정규성')).toBeInTheDocument()
      expect(screen.queryByText('등분산성')).not.toBeInTheDocument() // false positive 없어야 함
      expect(screen.getByText('충족')).toBeInTheDocument()
    })
  })

  describe('4. Variable Mapping Display', () => {
    it('displays dependent variable', () => {
      render(<AnalysisInfoCard variableMapping={mockVariableMapping} />)
      expect(screen.getByText('변수 구성')).toBeInTheDocument()
      expect(screen.getByText('종속변수:')).toBeInTheDocument()
      expect(screen.getByText('score')).toBeInTheDocument()
    })

    it('displays group variable', () => {
      render(<AnalysisInfoCard variableMapping={mockVariableMapping} />)
      expect(screen.getByText('그룹변수:')).toBeInTheDocument()
      expect(screen.getByText('treatment')).toBeInTheDocument()
    })

    it('displays array of dependent variables', () => {
      const multiVarMapping: VariableMapping = {
        dependentVar: ['var1', 'var2', 'var3']
      }
      render(<AnalysisInfoCard variableMapping={multiVarMapping} />)
      expect(screen.getByText('var1, var2, var3')).toBeInTheDocument()
    })

    it('displays independent variable', () => {
      const withIndependent: VariableMapping = {
        independentVar: 'predictor'
      }
      render(<AnalysisInfoCard variableMapping={withIndependent} />)
      expect(screen.getByText('독립변수:')).toBeInTheDocument()
      expect(screen.getByText('predictor')).toBeInTheDocument()
    })

    it('displays factor variables for ANOVA', () => {
      const anovaMapping: VariableMapping = {
        dependentVar: 'response',
        factors: ['factorA', 'factorB']
      }
      render(<AnalysisInfoCard variableMapping={anovaMapping} />)
      expect(screen.getByText('Factor 변수:')).toBeInTheDocument()
      expect(screen.getByText('factorA, factorB')).toBeInTheDocument()
    })

    it('displays paired variables', () => {
      const pairedMapping: VariableMapping = {
        pairedVars: ['pre_test', 'post_test']
      }
      render(<AnalysisInfoCard variableMapping={pairedMapping} />)
      expect(screen.getByText('Paired 변수:')).toBeInTheDocument()
      expect(screen.getByText('pre_test vs post_test')).toBeInTheDocument()
    })

    it('does not show variable section when mapping is null', () => {
      render(<AnalysisInfoCard variableMapping={null} />)
      expect(screen.queryByText('변수 구성')).not.toBeInTheDocument()
    })

    it('does not show variable section when mapping is empty', () => {
      render(<AnalysisInfoCard variableMapping={{}} />)
      expect(screen.queryByText('변수 구성')).not.toBeInTheDocument()
    })
  })

  describe('5. Edge Cases', () => {
    it('handles all null/undefined props gracefully', () => {
      expect(() => render(
        <AnalysisInfoCard
          fileName={null}
          dataRows={undefined}
          dataColumns={undefined}
          method={null}
          timestamp={undefined}
          variableMapping={null}
          validationResults={null}
          assumptionResults={null}
        />
      )).not.toThrow()
    })

    it('renders complete card with all props', () => {
      render(
        <AnalysisInfoCard
          fileName="complete_test.csv"
          dataRows={500}
          dataColumns={12}
          method={mockMethod}
          timestamp={new Date()}
          variableMapping={mockVariableMapping}
          validationResults={mockValidationResults}
          assumptionResults={mockAssumptionResults}
        />
      )

      // All sections should be present
      expect(screen.getByText('분석 정보')).toBeInTheDocument()
      expect(screen.getByText('complete_test.csv')).toBeInTheDocument()
      expect(screen.getByText('Independent T-Test')).toBeInTheDocument()
      expect(screen.getByText('데이터 품질')).toBeInTheDocument()
      expect(screen.getByText('가정 검정')).toBeInTheDocument()
      expect(screen.getByText('변수 구성')).toBeInTheDocument()
    })

    it('handles long file names with truncation', () => {
      const longFileName = 'very_long_file_name_that_should_be_truncated_in_the_ui_display.csv'
      render(<AnalysisInfoCard fileName={longFileName} />)
      // Should have title attribute for full name
      const fileElement = screen.getByTitle(longFileName)
      expect(fileElement).toBeInTheDocument()
    })
  })
})
