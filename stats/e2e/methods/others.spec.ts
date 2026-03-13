import { test } from '@playwright/test'
import {
  createMethodTests,
  waitForAutoConfirm,
  selectMultipleIndependentVars,
  selectMultivariateVars,
} from '../helpers/method-test-factory'

test.setTimeout(180_000)

test.describe('Phase 2 Others @important', () => {
  createMethodTests([
    {
      methodId: 'power-analysis',
      searchTerm: '검정력',
      methodRegex: /검정력.*분석|power.*analysis/i,
      csvFile: 'anova.csv',
      variables: { custom: async (page) => { await waitForAutoConfirm(page) } },
      expectedResults: { hasStatistic: false, hasPValue: false },
      tags: ['@important'],
      allowSkip: true,
    },
    {
      methodId: 'chi-square-goodness',
      searchTerm: '적합도',
      methodRegex: /적합도.*검정|goodness.*fit/i,
      csvFile: 'chi-square-goodness.csv',
      variables: { custom: async (page) => { await waitForAutoConfirm(page) } },
      expectedResults: { hasStatistic: true, hasPValue: true },
      tags: ['@important'],
      allowSkip: true,
    },
    {
      methodId: 'normality-test',
      searchTerm: '정규성',
      methodRegex: /정규성.*검정|normality/i,
      csvFile: 'descriptive.csv',
      variables: { custom: async (page) => { await waitForAutoConfirm(page) } },
      expectedResults: { hasStatistic: true, hasPValue: true },
      tags: ['@important'],
    },
    {
      methodId: 'explore-data',
      searchTerm: '데이터 탐색',
      methodRegex: /데이터.*탐색|explore.*data/i,
      csvFile: 'descriptive.csv',
      variables: { custom: async (page) => { await waitForAutoConfirm(page) } },
      expectedResults: { hasStatistic: true, hasPValue: false },
      tags: ['@important'],
      allowSkip: true,
    },
  ])
})

test.describe('Phase 2 Others @nice-to-have', () => {
  createMethodTests([
    {
      methodId: 'reliability',
      searchTerm: '신뢰도',
      methodRegex: /신뢰도.*분석|reliability/i,
      csvFile: 'reliability.csv',
      variables: {
        custom: async (page) => {
          await selectMultivariateVars(page, ['item1', 'item2', 'item3', 'item4', 'item5'])
        },
      },
      tags: ['@nice-to-have'],
      allowSkip: true,
    },
    {
      methodId: 'proportion-test',
      searchTerm: '비율',
      methodRegex: /비율.*검정|proportion/i,
      csvFile: 'proportion-test.csv',
      variables: { independent: 'group', dependent: 'outcome' },
      tags: ['@nice-to-have'],
      allowSkip: true,
    },
    {
      methodId: 'dose-response',
      searchTerm: '용량',
      methodRegex: /용량.*반응|dose.*response/i,
      csvFile: 'dose-response.csv',
      variables: { independent: 'dose', dependent: 'response' },
      tags: ['@nice-to-have'],
      allowSkip: true,
    },
    {
      methodId: 'response-surface',
      searchTerm: '반응표면',
      methodRegex: /반응.*표면|response.*surface/i,
      csvFile: 'response-surface.csv',
      variables: {
        custom: async (page) => { await selectMultipleIndependentVars(page, ['x1', 'x2'], 'y') },
      },
      tags: ['@nice-to-have'],
      allowSkip: true,
    },
    {
      methodId: 'means-plot',
      searchTerm: '평균',
      methodRegex: /평균.*플롯|means.*plot/i,
      csvFile: 'anova.csv',
      variables: { independent: 'group', dependent: 'value' },
      expectedResults: { hasStatistic: false, hasPValue: false },
      tags: ['@nice-to-have'],
      allowSkip: true,
    },
    {
      methodId: 'partial-correlation',
      searchTerm: '편상관',
      methodRegex: /편상관|partial.*corr/i,
      csvFile: 'correlation.csv',
      variables: {
        custom: async (page) => { await selectMultivariateVars(page, ['height', 'weight', 'age']) },
      },
      tags: ['@nice-to-have'],
      allowSkip: true,
    },
    {
      methodId: 'poisson',
      searchTerm: '포아송',
      methodRegex: /포아송.*회귀|poisson/i,
      csvFile: 'poisson.csv',
      variables: {
        custom: async (page) => { await selectMultipleIndependentVars(page, ['x1', 'x2'], 'count') },
      },
      tags: ['@nice-to-have'],
      allowSkip: true,
    },
    {
      methodId: 'ordinal-regression',
      searchTerm: '순서형',
      methodRegex: /순서형.*회귀|ordinal/i,
      csvFile: 'ordinal-regression.csv',
      variables: {
        custom: async (page) => { await selectMultipleIndependentVars(page, ['x1', 'x2'], 'ordinal_y') },
      },
      tags: ['@nice-to-have'],
      allowSkip: true,
    },
    {
      methodId: 'manova',
      searchTerm: 'MANOVA',
      methodRegex: /MANOVA|다변량.*분산/i,
      csvFile: 'manova.csv',
      variables: {
        custom: async (page) => { await selectMultivariateVars(page, ['group', 'y1', 'y2', 'y3']) },
      },
      tags: ['@nice-to-have'],
      allowSkip: true,
    },
    {
      methodId: 'mixed-model',
      searchTerm: '혼합',
      methodRegex: /혼합.*모형|mixed.*model/i,
      csvFile: 'mixed-model.csv',
      variables: { custom: async (page) => { await waitForAutoConfirm(page) } },
      tags: ['@nice-to-have'],
      allowSkip: true,
    },
  ])
})
