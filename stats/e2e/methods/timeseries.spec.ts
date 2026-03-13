import { test } from '@playwright/test'
import { createMethodTests, waitForAutoConfirm } from '../helpers/method-test-factory'

test.setTimeout(180_000)

test.describe('Phase 2 Time Series @important', () => {
  createMethodTests([
    {
      methodId: 'arima',
      searchTerm: 'ARIMA',
      methodRegex: /ARIMA|아리마/i,
      csvFile: 'timeseries.csv',
      variables: { custom: async (page) => { await waitForAutoConfirm(page) } },
      expectedResults: { hasStatistic: true, hasPValue: false },
      tags: ['@important'],
      allowSkip: true,
    },
  ])
})

test.describe('Phase 2 Time Series @nice-to-have', () => {
  createMethodTests([
    {
      methodId: 'seasonal-decompose',
      searchTerm: '계절',
      methodRegex: /계절.*분해|seasonal.*decompos/i,
      csvFile: 'timeseries.csv',
      variables: { custom: async (page) => { await waitForAutoConfirm(page) } },
      expectedResults: { hasStatistic: false, hasPValue: false },
      tags: ['@nice-to-have'],
      allowSkip: true,
    },
    {
      methodId: 'stationarity-test',
      searchTerm: '정상성',
      methodRegex: /정상성.*검정|stationarity|ADF/i,
      csvFile: 'timeseries.csv',
      variables: { custom: async (page) => { await waitForAutoConfirm(page) } },
      tags: ['@nice-to-have'],
      allowSkip: true,
    },
    {
      methodId: 'mann-kendall',
      searchTerm: 'Mann-Kendall',
      methodRegex: /Mann.*Kendall|만.*켄달|추세/i,
      csvFile: 'timeseries.csv',
      variables: { custom: async (page) => { await waitForAutoConfirm(page) } },
      tags: ['@nice-to-have'],
      allowSkip: true,
    },
  ])
})
