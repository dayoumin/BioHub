/**
 * @file survival-timeseries.test.ts
 * @description Tests for new survival analysis and time series pages
 *
 * Tests the following pages:
 * - Kaplan-Meier survival analysis
 * - Cox proportional hazards regression
 * - ARIMA model
 * - Seasonal decomposition
 * - Stationarity test
 */

import { STATISTICS_MENU, getAllMenuItems, getImplementedMenuItems } from '@/lib/statistics/menu-config'
import { STATISTICAL_METHODS } from '@/lib/statistics/method-mapping'
import { STATISTICAL_METHOD_REQUIREMENTS } from '@/lib/statistics/variable-requirements'

describe('Survival Analysis Pages', () => {
  describe('Kaplan-Meier Page', () => {
    it('should be registered in menu-config', () => {
      const survivalCategory = STATISTICS_MENU.find(cat => cat.id === 'survival')
      expect(survivalCategory).toBeDefined()

      const kaplanMeier = survivalCategory?.items.find(item => item.id === 'kaplan-meier')
      expect(kaplanMeier).toBeDefined()
      expect(kaplanMeier?.implemented).toBe(true)
      expect(kaplanMeier?.href).toBe('/statistics/kaplan-meier')
    })

    it('should be registered in method-mapping', () => {
      const method = STATISTICAL_METHODS.find(m => m.id === 'kaplan-meier')
      expect(method).toBeDefined()
      expect(method?.category).toBe('survival')
      expect(method?.requirements.minSampleSize).toBeGreaterThanOrEqual(10)
    })

    it('should have variable requirements defined', () => {
      const requirements = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'kaplan-meier')
      expect(requirements).toBeDefined()
      expect(requirements?.variables).toHaveLength(3) // time, event, group(optional)

      const timeVar = requirements?.variables.find(v => v.role === 'time')
      expect(timeVar).toBeDefined()
      expect(timeVar?.required).toBe(true)

      const eventVar = requirements?.variables.find(v => v.role === 'event')
      expect(eventVar).toBeDefined()
      expect(eventVar?.required).toBe(true)
    })
  })

  describe('Cox Regression Page', () => {
    it('should be registered in menu-config', () => {
      const survivalCategory = STATISTICS_MENU.find(cat => cat.id === 'survival')
      expect(survivalCategory).toBeDefined()

      const coxRegression = survivalCategory?.items.find(item => item.id === 'cox-regression')
      expect(coxRegression).toBeDefined()
      expect(coxRegression?.implemented).toBe(true)
      expect(coxRegression?.href).toBe('/statistics/cox-regression')
    })

    it('should be registered in method-mapping', () => {
      const method = STATISTICAL_METHODS.find(m => m.id === 'cox-regression')
      expect(method).toBeDefined()
      expect(method?.category).toBe('survival')
      expect(method?.requirements.minSampleSize).toBeGreaterThanOrEqual(30)
    })

    it('should have variable requirements defined', () => {
      const requirements = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'cox-regression')
      expect(requirements).toBeDefined()
      expect(requirements?.variables).toHaveLength(3) // time, event, covariates

      const covariateVar = requirements?.variables.find(v => v.role === 'independent')
      expect(covariateVar).toBeDefined()
      expect(covariateVar?.required).toBe(true)
      expect(covariateVar?.multiple).toBe(true)
    })
  })
})

describe('Time Series Pages', () => {
  describe('ARIMA Page', () => {
    it('should be registered in menu-config', () => {
      const timeseriesCategory = STATISTICS_MENU.find(cat => cat.id === 'timeseries')
      expect(timeseriesCategory).toBeDefined()

      const arima = timeseriesCategory?.items.find(item => item.id === 'arima')
      expect(arima).toBeDefined()
      expect(arima?.implemented).toBe(true)
      expect(arima?.href).toBe('/statistics/arima')
    })

    it('should be registered in method-mapping', () => {
      const method = STATISTICAL_METHODS.find(m => m.id === 'arima')
      expect(method).toBeDefined()
      expect(method?.category).toBe('timeseries')
      expect(method?.requirements.minSampleSize).toBeGreaterThanOrEqual(50)
    })

    it('should have variable requirements defined', () => {
      const requirements = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'arima')
      expect(requirements).toBeDefined()
      expect(requirements?.minSampleSize).toBe(50)

      const dependentVar = requirements?.variables.find(v => v.role === 'dependent')
      expect(dependentVar).toBeDefined()
      expect(dependentVar?.required).toBe(true)
    })
  })

  describe('Seasonal Decomposition Page', () => {
    it('should be registered in menu-config', () => {
      const timeseriesCategory = STATISTICS_MENU.find(cat => cat.id === 'timeseries')
      expect(timeseriesCategory).toBeDefined()

      const seasonalDecompose = timeseriesCategory?.items.find(item => item.id === 'seasonal-decompose')
      expect(seasonalDecompose).toBeDefined()
      expect(seasonalDecompose?.implemented).toBe(true)
      expect(seasonalDecompose?.href).toBe('/statistics/seasonal-decompose')
    })

    it('should be registered in method-mapping', () => {
      const method = STATISTICAL_METHODS.find(m => m.id === 'seasonal-decompose')
      expect(method).toBeDefined()
      expect(method?.category).toBe('timeseries')
      expect(method?.requirements.minSampleSize).toBeGreaterThanOrEqual(24)
    })

    it('should have variable requirements defined', () => {
      const requirements = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'seasonal-decompose')
      expect(requirements).toBeDefined()
      expect(requirements?.minSampleSize).toBe(24)
    })
  })

  describe('Stationarity Test Page', () => {
    it('should be registered in menu-config', () => {
      const timeseriesCategory = STATISTICS_MENU.find(cat => cat.id === 'timeseries')
      expect(timeseriesCategory).toBeDefined()

      const stationarityTest = timeseriesCategory?.items.find(item => item.id === 'stationarity-test')
      expect(stationarityTest).toBeDefined()
      expect(stationarityTest?.implemented).toBe(true)
      expect(stationarityTest?.href).toBe('/statistics/stationarity-test')
    })

    it('should be registered in method-mapping', () => {
      const method = STATISTICAL_METHODS.find(m => m.id === 'stationarity-test')
      expect(method).toBeDefined()
      expect(method?.category).toBe('timeseries')
      expect(method?.requirements.minSampleSize).toBeGreaterThanOrEqual(20)
    })

    it('should have variable requirements defined', () => {
      const requirements = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'stationarity-test')
      expect(requirements).toBeDefined()
      expect(requirements?.minSampleSize).toBe(20)
    })
  })
})

describe('Menu Statistics Summary', () => {
  it('should have survival category with 2 items', () => {
    const survivalCategory = STATISTICS_MENU.find(cat => cat.id === 'survival')
    expect(survivalCategory).toBeDefined()
    expect(survivalCategory?.items).toHaveLength(2)
  })

  it('should have timeseries category with 3 items', () => {
    const timeseriesCategory = STATISTICS_MENU.find(cat => cat.id === 'timeseries')
    expect(timeseriesCategory).toBeDefined()
    expect(timeseriesCategory?.items).toHaveLength(3)
  })

  it('should have all new pages implemented', () => {
    const implementedItems = getImplementedMenuItems()

    const newPageIds = ['kaplan-meier', 'cox-regression', 'arima', 'seasonal-decompose', 'stationarity-test']

    for (const pageId of newPageIds) {
      const found = implementedItems.find(item => item.id === pageId)
      expect(found).toBeDefined()
      expect(found?.implemented).toBe(true)
    }
  })

  it('should not have any comingSoon flags on new pages', () => {
    const allItems = getAllMenuItems()

    const newPageIds = ['kaplan-meier', 'cox-regression', 'arima', 'seasonal-decompose', 'stationarity-test']

    for (const pageId of newPageIds) {
      const item = allItems.find(i => i.id === pageId)
      expect(item?.comingSoon).toBeFalsy()
    }
  })
})
