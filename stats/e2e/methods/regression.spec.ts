/**
 * Phase 2: 회귀분석 메서드별 E2E 테스트
 * @phase2 @critical @important
 *
 * 실제 메서드명: "선형 회귀" (단순/다중 통합)
 * @critical: 선형 회귀 1변수, 선형 회귀 다변수 (2개)
 * @important: 로지스틱 회귀, 단계적 회귀 (2개)
 */

import { createMethodTestSuite } from '../helpers/method-test-factory'
import { selectMultipleIndependentVars } from '../helpers/method-test-factory'

createMethodTestSuite('@phase2 회귀분석', [
  // --- @critical ---
  {
    name: '2.3.1 선형 회귀 (단순 — 1 독립변수)',
    searchTerm: '선형 회귀',
    methodRegex: /선형 회귀|linear.*regression/i,
    csvFile: 'regression.csv',
    variables: {
      independent: 'study_hours',
      dependent: 'score',
    },
    expectedResults: { hasStatistic: true, hasPValue: true },
    tags: ['@critical'],
    screenshotName: 'p2-simple-regression',
  },
  {
    name: '2.3.2 선형 회귀 (다중 — 2+ 독립변수)',
    searchTerm: '선형 회귀',
    methodRegex: /선형 회귀|linear.*regression/i,
    csvFile: 'regression.csv',
    variables: {
      custom: (page) =>
        selectMultipleIndependentVars(page, ['study_hours', 'attendance'], 'score'),
    },
    expectedResults: { hasStatistic: true, hasPValue: true },
    tags: ['@critical'],
    allowSkip: true,
    screenshotName: 'p2-multiple-regression',
  },
  // --- @important ---
  {
    name: '2.3.3 로지스틱 회귀',
    searchTerm: '로지스틱',
    methodRegex: /로지스틱|logistic.*regression/i,
    csvFile: 'regression.csv',
    variables: {
      independent: 'study_hours',
      dependent: 'pass',
    },
    expectedResults: { hasStatistic: true, hasPValue: true },
    tags: ['@important'],
    allowSkip: true,
    screenshotName: 'p2-logistic-regression',
  },
  {
    name: '2.3.4 단계적 회귀',
    searchTerm: '단계적',
    methodRegex: /단계적|stepwise/i,
    csvFile: 'regression.csv',
    variables: {
      custom: (page) =>
        selectMultipleIndependentVars(page, ['study_hours', 'attendance'], 'score'),
    },
    expectedResults: { hasStatistic: true, hasPValue: true },
    tags: ['@important'],
    allowSkip: true,
    screenshotName: 'p2-stepwise-regression',
  },
])
