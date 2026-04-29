import { describe, expect, it } from 'vitest'
import {
  buildPreprocessingSourceContract,
  getPreprocessingSourceSummary,
  hasBlockingPreprocessingIssue,
  hasReviewablePreprocessingGap,
} from '../preprocessing-source-contract'

describe('preprocessing source contract', () => {
  it('treats zero missing values as verified validation evidence', () => {
    const contract = buildPreprocessingSourceContract({
      validation: {
        missingValues: 0,
        duplicateRows: 0,
        warnings: [],
        errors: [],
      },
    })

    expect(hasBlockingPreprocessingIssue(contract)).toBe(false)
    expect(hasReviewablePreprocessingGap(contract)).toBe(false)
    expect(contract.steps).toEqual([])
    expect(getPreprocessingSourceSummary(contract, 'ko')).toBe('전처리 source: 기록된 step 0개, 결측 0개, 중복 행 0개')
  })

  it('requires review when missing values exist without user-confirmed handling', () => {
    const contract = buildPreprocessingSourceContract({
      validation: {
        missingValues: 3,
        duplicateRows: 0,
        warnings: [],
        errors: [],
      },
    })

    expect(hasBlockingPreprocessingIssue(contract)).toBe(false)
    expect(hasReviewablePreprocessingGap(contract)).toBe(true)
    expect(contract.warnings).toContain('Missing values are present but handling is not user-confirmed.')
  })

  it('accepts missing data handling only when the user provided it', () => {
    const contract = buildPreprocessingSourceContract({
      validation: {
        missingValues: 3,
        duplicateRows: 0,
        warnings: [],
        errors: [],
      },
      missingDataHandling: '결측값이 포함된 행은 해당 분석에서 제외했다.',
    })

    expect(hasReviewablePreprocessingGap(contract)).toBe(false)
    expect(contract.warnings).toEqual([])
  })

  it('keeps transformations and exclusions reviewable unless rationale is user-confirmed', () => {
    const contract = buildPreprocessingSourceContract({
      validation: {
        missingValues: 0,
        duplicateRows: 0,
        warnings: [],
        errors: [],
      },
      steps: [
        {
          kind: 'standardization',
          label: 'z-score scaling',
          origin: 'pipeline-log',
          affectedVariables: ['length'],
        },
      ],
    })

    expect(contract.steps[0]).toMatchObject({
      kind: 'standardization',
      status: 'unconfirmed',
      affectedVariables: ['length'],
    })
    expect(contract.prohibitedAutoClaims).toContain('standardization')
    expect(hasReviewablePreprocessingGap(contract)).toBe(true)
  })

  it('still requires rationale when transform step is marked user-confirmed', () => {
    const contract = buildPreprocessingSourceContract({
      validation: {
        missingValues: 0,
        duplicateRows: 0,
        warnings: [],
        errors: [],
      },
      steps: [
        {
          kind: 'variable-transform',
          label: 'log transform',
          origin: 'user-input',
          status: 'user-confirmed',
          affectedVariables: ['length'],
        },
      ],
    })

    expect(hasReviewablePreprocessingGap(contract)).toBe(true)
    expect(contract.warnings).toContain('Preprocessing steps include transformations or exclusions without user-confirmed rationale.')
  })

  it('clears review gate when transform rationale is explicit', () => {
    const contract = buildPreprocessingSourceContract({
      validation: {
        missingValues: 0,
        duplicateRows: 0,
        warnings: [],
        errors: [],
      },
      steps: [
        {
          kind: 'variable-transform',
          label: 'log transform',
          origin: 'user-input',
          status: 'user-confirmed',
          affectedVariables: ['length'],
          rationale: '오른쪽 꼬리가 긴 분포를 완화하기 위해 log 변환했다.',
        },
      ],
    })

    expect(hasReviewablePreprocessingGap(contract)).toBe(false)
    expect(contract.warnings).toEqual([])
  })

  it('blocks Methods when validation errors remain', () => {
    const contract = buildPreprocessingSourceContract({
      validation: {
        missingValues: 0,
        duplicateRows: 0,
        warnings: [],
        errors: ['length 컬럼에 숫자가 아닌 값이 있습니다.'],
      },
    })

    expect(hasBlockingPreprocessingIssue(contract)).toBe(true)
    expect(contract.errors).toEqual(['length 컬럼에 숫자가 아닌 값이 있습니다.'])
  })
})
