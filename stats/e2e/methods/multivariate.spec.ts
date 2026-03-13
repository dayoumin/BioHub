import { test } from '@playwright/test'
import {
  createMethodTests,
  selectMultivariateVars,
  waitForAutoConfirm,
} from '../helpers/method-test-factory'

test.setTimeout(180_000)

test.describe('Phase 2 Multivariate @important', () => {
  createMethodTests([
    {
      methodId: 'pca',
      searchTerm: 'PCA',
      methodRegex: /PCA|주성분/i,
      csvFile: 'pca.csv',
      variables: {
        custom: async (page) => {
          await selectMultivariateVars(page, ['var1', 'var2', 'var3', 'var4'])
        },
      },
      expectedResults: { hasStatistic: true, hasPValue: false },
      tags: ['@important'],
    },
    {
      methodId: 'factor-analysis',
      searchTerm: '요인분석',
      methodRegex: /요인.*분석|factor.*analysis/i,
      csvFile: 'factor-analysis.csv',
      variables: { custom: async (page) => { await waitForAutoConfirm(page) } },
      expectedResults: { hasStatistic: true, hasPValue: false },
      tags: ['@important'],
      allowSkip: true,
    },
  ])
})

test.describe('Phase 2 Multivariate @nice-to-have', () => {
  createMethodTests([
    {
      methodId: 'cluster',
      searchTerm: '군집',
      methodRegex: /군집.*분석|cluster/i,
      csvFile: 'cluster.csv',
      variables: {
        custom: async (page) => { await selectMultivariateVars(page, ['x1', 'x2', 'x3']) },
      },
      expectedResults: { hasStatistic: false, hasPValue: false },
      tags: ['@nice-to-have'],
      allowSkip: true,
    },
    {
      methodId: 'discriminant',
      searchTerm: '판별',
      methodRegex: /판별.*분석|discriminant/i,
      csvFile: 'discriminant.csv',
      variables: {
        custom: async (page) => { await selectMultivariateVars(page, ['group', 'x1', 'x2', 'x3']) },
      },
      tags: ['@nice-to-have'],
      allowSkip: true,
    },
  ])
})
