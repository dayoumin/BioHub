/**
 * Calculate Pearson correlation coefficient between two numeric arrays
 * Uses pairwise deletion - only uses rows where both values are valid
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length)
  if (n < 2) return 0

  // Use single-pass algorithm for efficiency
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0

  for (let i = 0; i < n; i++) {
    sumX += x[i]
    sumY += y[i]
    sumXY += x[i] * y[i]
    sumX2 += x[i] * x[i]
    sumY2 += y[i] * y[i]
  }

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

  return denominator === 0 ? 0 : numerator / denominator
}

/**
 * Get paired numeric data from two columns with pairwise deletion
 * Only returns rows where both columns have valid numeric values
 */
export function getPairedNumericData(
  data: Record<string, unknown>[],
  columnNameX: string,
  columnNameY: string
): { x: number[], y: number[] } {
  const xValues: number[] = []
  const yValues: number[] = []

  for (const row of data) {
    const xRaw = row[columnNameX]
    const yRaw = row[columnNameY]

    // Skip if either value is missing
    if (xRaw === null || xRaw === undefined || yRaw === null || yRaw === undefined) {
      continue
    }

    const xNum = typeof xRaw === 'number' ? xRaw : parseFloat(String(xRaw))
    const yNum = typeof yRaw === 'number' ? yRaw : parseFloat(String(yRaw))

    // Only include if both are valid numbers
    if (!isNaN(xNum) && isFinite(xNum) && !isNaN(yNum) && isFinite(yNum)) {
      xValues.push(xNum)
      yValues.push(yNum)
    }
  }

  return { x: xValues, y: yValues }
}

/**
 * Calculate correlation matrix for multiple numeric columns
 * Uses pairwise deletion for each pair to handle missing values correctly
 */
export function calculateCorrelationMatrix(
  data: Record<string, unknown>[],
  columnNames: string[]
): { matrix: number[][], labels: string[] } {
  const matrix: number[][] = []

  for (let i = 0; i < columnNames.length; i++) {
    const row: number[] = []

    for (let j = 0; j < columnNames.length; j++) {
      if (i === j) {
        row.push(1)
      } else {
        // Use pairwise deletion for each pair
        const { x, y } = getPairedNumericData(data, columnNames[i], columnNames[j])
        row.push(calculateCorrelation(x, y))
      }
    }
    matrix.push(row)
  }

  return { matrix, labels: columnNames }
}

/**
 * Extract numeric data from a column with null/undefined handling
 */
export function getNumericColumnData(data: any[], columnName: string): number[] {
  if (!data || !columnName) return []

  return data
    .map(row => row?.[columnName])
    .filter(value => value !== null && value !== undefined)
    .map(value => parseFloat(value))
    .filter(value => !isNaN(value) && isFinite(value))
}