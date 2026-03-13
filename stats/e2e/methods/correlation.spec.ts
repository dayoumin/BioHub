/**
 * Phase 2: 상관분석 메서드별 E2E 테스트
 * @phase2 @critical
 *
 * @critical: Pearson 상관 (1개)
 */

import { createMethodTestSuite } from '../helpers/method-test-factory'

createMethodTestSuite('@phase2 @critical 상관분석', [
  {
    name: '2.4.1 Pearson 상관분석',
    searchTerm: 'Pearson',
    methodRegex: /Pearson|피어슨|상관분석/i,
    csvFile: 'correlation.csv',
    variables: [
      { role: 'variables', variableName: 'height' },
      { role: 'variables', variableName: 'weight' },
    ],
    expectedResults: { hasStatistic: true, hasPValue: true },
    tags: ['@critical'],
    screenshotName: 'p2-pearson-correlation',
  },
])
