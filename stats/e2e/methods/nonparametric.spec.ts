/**
 * Phase 2: 비모수 검정 메서드별 E2E 테스트
 * @phase2 @critical @important @nice-to-have
 *
 * @critical: Mann-Whitney U, Wilcoxon 부호순위 (2개)
 * @important: Kruskal-Wallis, Friedman, Spearman (3개)
 * @nice-to-have: 부호검정, McNemar, Cochran Q, 이항검정, 런검정, KS검정, Mood 중앙값 (7개)
 */

import { createMethodTestSuite } from '../helpers/method-test-factory'
import type { Page } from '@playwright/test'

createMethodTestSuite('@phase2 비모수 검정', [
  // --- @critical ---
  {
    name: '2.5.1 Mann-Whitney U 검정',
    searchTerm: 'Mann-Whitney',
    methodRegex: /Mann.*Whitney|맨.*휘트니/i,
    csvFile: 'mann-whitney.csv',
    variables: [
      { role: 'factor', variableName: 'group' },
      { role: 'dependent', variableName: 'value' },
    ],
    expectedResults: { hasStatistic: true, hasPValue: true },
    tags: ['@critical'],
    screenshotName: 'p2-mann-whitney',
  },
  {
    name: '2.5.2 Wilcoxon 부호순위 검정',
    searchTerm: 'Wilcoxon',
    methodRegex: /Wilcoxon|윌콕슨/i,
    csvFile: 'wilcoxon.csv',
    variables: [
      { role: 'dependent', variableName: 'pre' },
      { role: 'dependent', variableName: 'post' },
    ],
    expectedResults: { hasStatistic: true, hasPValue: true },
    tags: ['@critical'],
    screenshotName: 'p2-wilcoxon',
  },
  // --- @important ---
  {
    name: '2.5.3 Kruskal-Wallis 검정',
    searchTerm: 'Kruskal',
    methodRegex: /Kruskal.*Wallis|크루스칼/i,
    csvFile: 'anova.csv',
    variables: [
      { role: 'factor', variableName: 'group' },
      { role: 'dependent', variableName: 'value' },
    ],
    expectedResults: { hasStatistic: true, hasPValue: true },
    tags: ['@important'],
    allowSkip: true,
    screenshotName: 'p2-kruskal-wallis',
  },
  {
    name: '2.5.4 Friedman 검정',
    searchTerm: 'Friedman',
    methodRegex: /Friedman|프리드먼/i,
    csvFile: 'friedman.csv',
    variables: {
      custom: async (page: Page) => {
        for (const v of ['time1', 'time2', 'time3']) {
          const btn = page.locator('button:not([disabled])').filter({ hasText: v })
          if ((await btn.count()) > 0) await btn.first().click()
          await page.waitForTimeout(300)
        }
      },
    },
    expectedResults: { hasStatistic: true, hasPValue: true },
    tags: ['@important'],
    allowSkip: true,
    screenshotName: 'p2-friedman',
  },
  {
    name: '2.5.5 Spearman 순위상관',
    searchTerm: 'Spearman',
    methodRegex: /Spearman|스피어먼/i,
    csvFile: 'correlation.csv',
    variables: [
      { role: 'variables', variableName: 'height' },
      { role: 'variables', variableName: 'weight' },
    ],
    expectedResults: { hasStatistic: true, hasPValue: true },
    tags: ['@important'],
    allowSkip: true,
    screenshotName: 'p2-spearman',
  },
  // --- @nice-to-have ---
  {
    name: '2.5.6 부호검정',
    searchTerm: '부호검정',
    methodRegex: /부호검정|sign.*test/i,
    csvFile: 'sign-test.csv',
    variables: [
      { role: 'dependent', variableName: 'before' },
      { role: 'dependent', variableName: 'after' },
    ],
    expectedResults: { hasStatistic: true, hasPValue: true },
    tags: ['@nice-to-have'],
    allowSkip: true,
    screenshotName: 'p2-sign-test',
  },
  {
    name: '2.5.7 McNemar 검정',
    searchTerm: 'McNemar',
    methodRegex: /McNemar|맥니마/i,
    csvFile: 'mcnemar.csv',
    variables: [
      { role: 'dependent', variableName: 'before' },
      { role: 'dependent', variableName: 'after' },
    ],
    expectedResults: { hasStatistic: true, hasPValue: true },
    tags: ['@nice-to-have'],
    allowSkip: true,
    screenshotName: 'p2-mcnemar',
  },
  {
    name: '2.5.8 Cochran Q 검정',
    searchTerm: 'Cochran',
    methodRegex: /Cochran.*Q|코크란/i,
    csvFile: 'cochran-q.csv',
    variables: {
      custom: async (page: Page) => {
        for (const v of ['test1', 'test2', 'test3']) {
          const btn = page.locator('button:not([disabled])').filter({ hasText: v })
          if ((await btn.count()) > 0) await btn.first().click()
          await page.waitForTimeout(300)
        }
      },
    },
    expectedResults: { hasStatistic: true, hasPValue: true },
    tags: ['@nice-to-have'],
    allowSkip: true,
    screenshotName: 'p2-cochran-q',
  },
  {
    name: '2.5.9 이항검정',
    searchTerm: '이항검정',
    methodRegex: /이항검정|binomial/i,
    csvFile: 'binomial.csv',
    variables: [{ role: 'variables', variableName: 'success' }],
    expectedResults: { hasPValue: true },
    tags: ['@nice-to-have'],
    allowSkip: true,
    screenshotName: 'p2-binomial',
  },
  {
    name: '2.5.10 런 검정',
    searchTerm: '런 검정',
    methodRegex: /런 검정|runs.*test/i,
    csvFile: 'runs-test.csv',
    variables: [{ role: 'variables', variableName: 'value' }],
    expectedResults: { hasStatistic: true, hasPValue: true },
    tags: ['@nice-to-have'],
    allowSkip: true,
    screenshotName: 'p2-runs-test',
  },
  {
    name: '2.5.11 Kolmogorov-Smirnov 검정',
    searchTerm: 'Kolmogorov',
    methodRegex: /Kolmogorov|KS.*검정/i,
    csvFile: 'ks-test.csv',
    variables: [
      { role: 'factor', variableName: 'group' },
      { role: 'dependent', variableName: 'value' },
    ],
    expectedResults: { hasStatistic: true, hasPValue: true },
    tags: ['@nice-to-have'],
    allowSkip: true,
    screenshotName: 'p2-ks-test',
  },
  {
    name: '2.5.12 Mood 중앙값 검정',
    searchTerm: 'Mood',
    methodRegex: /Mood|무드.*중앙값/i,
    csvFile: 'mood-median.csv',
    variables: [
      { role: 'factor', variableName: 'group' },
      { role: 'dependent', variableName: 'value' },
    ],
    expectedResults: { hasStatistic: true, hasPValue: true },
    tags: ['@nice-to-have'],
    allowSkip: true,
    screenshotName: 'p2-mood-median',
  },
])
