/**
 * Chart data validation utilities with type safety
 */

// Type definitions
type NumericValue = number | string | null | undefined
type CategoricalValue = string | number | null | undefined
type DataArray = unknown[]
type GroupedData = Record<string, unknown[]>

/**
 * Validates and filters numeric data with type safety
 */
export function validateNumericData(data: DataArray): number[] {
  if (!Array.isArray(data)) {
    throw new Error('데이터는 배열 형태여야 합니다')
  }

  const validData = data
    .map((v: unknown) => {
      if (typeof v === 'number' && isFinite(v)) return v
      if (typeof v === 'string') {
        const parsed = Number(v)
        return isFinite(parsed) ? parsed : NaN
      }
      return NaN
    })
    .filter((v): v is number => !isNaN(v) && isFinite(v))

  if (validData.length === 0) {
    throw new Error('유효한 숫자 데이터가 없습니다. 데이터가 숫자 형식인지 확인해주세요')
  }

  return validData
}

/**
 * Validates categorical data with type safety
 */
export function validateCategoricalData(data: DataArray): string[] {
  if (!Array.isArray(data)) {
    throw new Error('데이터는 배열 형태여야 합니다')
  }

  return data
    .filter((v): v is NonNullable<unknown> => v !== null && v !== undefined && v !== '')
    .map(v => String(v))
}

/**
 * Validates data for histogram with type safety
 */
export function validateHistogramData(data: DataArray): {
  valid: number[]
  invalid: number
  total: number
} {
  const total = data.length
  const valid = validateNumericData(data)
  const invalid = total - valid.length

  return { valid, invalid, total }
}

/**
 * Validates data for box plot with type safety
 */
export function validateBoxPlotData(data: DataArray | GroupedData): {
  isGrouped: boolean
  data: number[] | Record<string, number[]>
} {
  if (Array.isArray(data)) {
    return {
      isGrouped: false,
      data: validateNumericData(data)
    }
  }

  const validated: Record<string, number[]> = {}
  for (const [key, values] of Object.entries(data as GroupedData)) {
    if (Array.isArray(values)) {
      validated[key] = validateNumericData(values)
    }
  }

  return {
    isGrouped: true,
    data: validated
  }
}

/**
 * Validates data for scatter plot with type safety
 */
export function validateScatterData(
  xData: DataArray,
  yData: DataArray
): {
  x: number[]
  y: number[]
  validPairs: number
} {
  if (!Array.isArray(xData) || !Array.isArray(yData)) {
    throw new Error('X와 Y 데이터는 모두 배열 형태여야 합니다')
  }

  if (xData.length !== yData.length) {
    throw new Error('X와 Y 데이터의 길이가 동일해야 합니다')
  }

  const validPairs: { x: number[]; y: number[] } = { x: [], y: [] }

  for (let i = 0; i < xData.length; i++) {
    const xRaw = xData[i]
    const yRaw = yData[i]

    const xVal = typeof xRaw === 'number' ? xRaw : Number(xRaw)
    const yVal = typeof yRaw === 'number' ? yRaw : Number(yRaw)

    if (!isNaN(xVal) && !isNaN(yVal) && isFinite(xVal) && isFinite(yVal)) {
      validPairs.x.push(xVal)
      validPairs.y.push(yVal)
    }
  }

  if (validPairs.x.length === 0) {
    throw new Error('유효한 데이터 쌍이 없습니다. 모든 값이 숫자인지 확인해주세요')
  }

  return {
    x: validPairs.x,
    y: validPairs.y,
    validPairs: validPairs.x.length
  }
}

/**
 * Validates data for bar chart with type safety
 */
export function validateBarChartData(
  categories: DataArray,
  values: DataArray
): {
  categories: string[]
  values: number[]
} {
  if (!Array.isArray(categories) || !Array.isArray(values)) {
    throw new Error('카테고리와 값은 모두 배열 형태여야 합니다')
  }

  if (categories.length !== values.length) {
    throw new Error('카테고리와 값의 개수가 동일해야 합니다')
  }

  const validData: { categories: string[]; values: number[] } = {
    categories: [],
    values: []
  }

  for (let i = 0; i < categories.length; i++) {
    const catRaw = categories[i]
    const valRaw = values[i]

    if (catRaw === null || catRaw === undefined || catRaw === '') continue

    const cat = String(catRaw)
    const val = typeof valRaw === 'number' ? valRaw : Number(valRaw)

    if (cat && !isNaN(val) && isFinite(val)) {
      validData.categories.push(cat)
      validData.values.push(val)
    }
  }

  if (validData.categories.length === 0) {
    throw new Error('유효한 데이터가 없습니다. 데이터를 확인해주세요')
  }

  return validData
}

/**
 * Checks if data size is within acceptable limits with type safety
 */
export function checkDataSize(data: DataArray, maxSize: number = 10000): {
  isValid: boolean
  size: number
  shouldSample: boolean
} {
  const size = Array.isArray(data) ? data.length : 0

  return {
    isValid: size > 0,
    size,
    shouldSample: size > maxSize
  }
}

/**
 * Samples large datasets for performance
 */
export function sampleData<T>(data: T[], maxSize: number = 10000): T[] {
  if (data.length <= maxSize) return data

  const step = Math.ceil(data.length / maxSize)
  return data.filter((_, index) => index % step === 0)
}