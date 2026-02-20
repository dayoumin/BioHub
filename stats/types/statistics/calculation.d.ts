export interface MetricDatum {
  name: string
  value: number | string
  unit?: string
}

export interface TableDatum {
  name: string
  data: Array<Record<string, string | number | boolean | null>>
  description?: string
}

export interface ChartDatum {
  type: string
  data: unknown
  options?: Record<string, unknown>
}

export interface CalculationPayload {
  metrics?: MetricDatum[]
  tables?: TableDatum[]
  charts?: ChartDatum[]
  interpretation?: string
}

export interface CalculationResult {
  success: boolean
  data?: CalculationPayload
  error?: string
}
