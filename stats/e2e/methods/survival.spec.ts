import { test } from '@playwright/test'
import { createMethodTests, waitForAutoConfirm } from '../helpers/method-test-factory'

test.setTimeout(180_000)

test.describe('Phase 2 Survival @important', () => {
  createMethodTests([
    {
      methodId: 'kaplan-meier',
      searchTerm: 'Kaplan',
      methodRegex: /Kaplan.*Meier|카플란|생존분석/i,
      csvFile: 'survival.csv',
      variables: { custom: async (page) => { await waitForAutoConfirm(page) } },
      expectedResults: { hasStatistic: true, hasPValue: true },
      tags: ['@important'],
    },
    {
      methodId: 'cox-regression',
      searchTerm: 'Cox',
      methodRegex: /Cox.*회귀|Cox.*regression|콕스/i,
      csvFile: 'survival.csv',
      variables: { custom: async (page) => { await waitForAutoConfirm(page) } },
      expectedResults: { hasStatistic: true, hasPValue: true },
      tags: ['@important'],
      allowSkip: true,
    },
    {
      methodId: 'roc-curve',
      searchTerm: 'ROC',
      methodRegex: /ROC.*곡선|ROC.*curve|ROC/i,
      csvFile: 'roc-diagnostic.csv',
      variables: { custom: async (page) => { await waitForAutoConfirm(page) } },
      expectedResults: { hasStatistic: true, hasPValue: false },
      tags: ['@important'],
    },
  ])
})
