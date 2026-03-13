/**
 * Phase 2: 기술통계 메서드별 E2E 테스트
 * @phase2 @critical
 *
 * descriptive.csv 컬럼: value, category
 * @critical: 기술통계량 (1개)
 */

import { createMethodTestSuite } from '../helpers/method-test-factory'

createMethodTestSuite('@phase2 @critical 기술통계', [
  {
    name: '2.7.1 기술통계량',
    searchTerm: '기술통계',
    methodRegex: /기술통계|descriptive/i,
    csvFile: 'descriptive.csv',
    variables: [{ role: 'variables', variableName: 'value' }],
    expectedResults: { hasStatistic: true, hasPValue: false },
    tags: ['@critical'],
    screenshotName: 'p2-descriptive',
  },
])
