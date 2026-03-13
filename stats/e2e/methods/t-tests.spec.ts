/**
 * Phase 2: T-검정 메서드별 E2E 테스트
 * @phase2 @critical
 *
 * 4개 메서드: 독립표본, Welch, 일표본, 대응표본
 */

import { createMethodTestSuite } from '../helpers/method-test-factory'

createMethodTestSuite('@phase2 @critical T-검정', [
  {
    name: '2.1.1 독립표본 t-검정',
    searchTerm: '독립표본',
    methodRegex: /독립표본 t-검정/,
    csvFile: 't-test.csv',
    variables: [
      { role: 'factor', variableName: 'group' },
      { role: 'dependent', variableName: 'value' },
    ],
    expectedResults: { hasStatistic: true, hasPValue: true, hasEffectSize: true },
    tags: ['@critical'],
    screenshotName: 'p2-independent-t',
  },
  {
    name: '2.1.2 Welch t-검정',
    searchTerm: 'Welch',
    methodRegex: /Welch.*t-검정|welch/i,
    csvFile: 'welch-t.csv',
    variables: [
      { role: 'factor', variableName: 'group' },
      { role: 'dependent', variableName: 'value' },
    ],
    expectedResults: { hasStatistic: true, hasPValue: true, hasEffectSize: true },
    tags: ['@critical'],
    screenshotName: 'p2-welch-t',
  },
  {
    name: '2.1.3 일표본 t-검정',
    searchTerm: '일표본',
    methodRegex: /일표본.*t.*검정|one.*sample/i,
    csvFile: 'one-sample-t.csv',
    variables: [{ role: 'dependent', variableName: 'value' }],
    expectedResults: { hasStatistic: true, hasPValue: true, hasEffectSize: true },
    tags: ['@critical'],
    screenshotName: 'p2-one-sample-t',
  },
  {
    name: '2.1.4 대응표본 t-검정',
    searchTerm: '대응표본',
    methodRegex: /대응표본.*t.*검정|paired/i,
    csvFile: 'paired-t-test.csv',
    variables: [
      { role: 'dependent', variableName: 'pre' },
      { role: 'dependent', variableName: 'post' },
    ],
    expectedResults: { hasStatistic: true, hasPValue: true, hasEffectSize: true },
    tags: ['@critical'],
    screenshotName: 'p2-paired-t',
  },
])
