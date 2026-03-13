/**
 * Phase 2: 분산분석 메서드별 E2E 테스트
 * @phase2 @critical @important
 *
 * @critical: 일원 분산분석, 이원 분산분석 (2개)
 * @important: Welch ANOVA, 반복측정, ANCOVA (3개)
 */

import { createMethodTestSuite } from '../helpers/method-test-factory'

createMethodTestSuite('@phase2 분산분석', [
  // --- @critical ---
  {
    name: '2.2.1 일원 분산분석 (One-Way ANOVA)',
    searchTerm: '일원',
    methodRegex: /일원.*분산|one.*way.*anova/i,
    csvFile: 'anova.csv',
    variables: [
      { role: 'factor', variableName: 'group' },
      { role: 'dependent', variableName: 'value' },
    ],
    expectedResults: { hasStatistic: true, hasPValue: true, hasEffectSize: true },
    tags: ['@critical'],
    screenshotName: 'p2-oneway-anova',
  },
  {
    name: '2.2.3 이원 분산분석 (Two-Way ANOVA)',
    searchTerm: '이원',
    methodRegex: /이원.*분산|two.*way.*anova/i,
    csvFile: 'twoway-anova-test.csv',
    variables: [
      { role: 'factor', variableName: 'factor1' },
      { role: 'factor', variableName: 'factor2' },
      { role: 'dependent', variableName: 'value' },
    ],
    expectedResults: { hasStatistic: true, hasPValue: true, hasEffectSize: true },
    tags: ['@critical'],
    screenshotName: 'p2-twoway-anova',
  },
  // --- @important ---
  {
    name: '2.2.4 Welch ANOVA',
    searchTerm: 'Welch',
    methodRegex: /Welch.*ANOVA|웰치/i,
    csvFile: 'anova.csv',
    variables: [
      { role: 'factor', variableName: 'group' },
      { role: 'dependent', variableName: 'value' },
    ],
    expectedResults: { hasStatistic: true, hasPValue: true },
    tags: ['@important'],
    allowSkip: true,
    screenshotName: 'p2-welch-anova',
  },
  {
    name: '2.2.5 반복측정 분산분석',
    searchTerm: '반복측정',
    methodRegex: /반복측정|repeated.*measures/i,
    csvFile: 'repeated-measures.csv',
    variables: [
      { role: 'within', variableName: 'time1' },
      { role: 'within', variableName: 'time2' },
      { role: 'within', variableName: 'time3' },
    ],
    expectedResults: { hasStatistic: true, hasPValue: true },
    tags: ['@important'],
    allowSkip: true,
    screenshotName: 'p2-repeated-measures',
  },
  {
    name: '2.2.6 ANCOVA',
    searchTerm: 'ANCOVA',
    methodRegex: /ANCOVA|공분산분석/i,
    csvFile: 'anova.csv',
    variables: [
      { role: 'factor', variableName: 'group' },
      { role: 'dependent', variableName: 'value' },
      { role: 'covariate', variableName: 'covariate' },
    ],
    expectedResults: { hasStatistic: true, hasPValue: true },
    tags: ['@important'],
    allowSkip: true,
    screenshotName: 'p2-ancova',
  },
])
