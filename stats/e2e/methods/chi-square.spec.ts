/**
 * Phase 2: 카이제곱 검정 메서드별 E2E 테스트
 * @phase2 @critical
 *
 * @critical: 독립성 검정 (1개)
 */

import { createMethodTestSuite } from '../helpers/method-test-factory'

createMethodTestSuite('@phase2 @critical 카이제곱 검정', [
  {
    name: '2.6.1 카이제곱 독립성 검정',
    searchTerm: '카이제곱 독립',
    methodRegex: /카이제곱 독립성|chi.*square.*independence/i,
    csvFile: 'chi-square-v2.csv',
    variables: [
      { role: 'factor', variableName: 'gender' },
      { role: 'dependent', variableName: 'preference' },
    ],
    expectedResults: { hasStatistic: true, hasPValue: true, hasEffectSize: true },
    tags: ['@critical'],
    screenshotName: 'p2-chi-square-independence',
  },
])
