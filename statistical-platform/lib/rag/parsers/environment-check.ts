/**
 * Parser 환경 체크 유틸리티
 *
 * Python, Docling 등 외부 의존성 확인
 */

import { PDFParser } from './pdf-parser'

export interface EnvironmentCheckResult {
  available: boolean
  parser: string
  error?: string
  recommendation?: string
}

/**
 * Docling (PDF Parser) 환경 체크
 */
export async function checkDoclingEnvironment(): Promise<EnvironmentCheckResult> {
  try {
    const pdfParser = new PDFParser()
    const result = await pdfParser.checkPythonEnvironment()

    if (!result.available) {
      return {
        available: false,
        parser: 'pdf-parser',
        error: result.error,
        recommendation: 'PDF 파일 파싱을 사용하려면 Docling을 설치하세요:\npip install docling',
      }
    }

    return {
      available: true,
      parser: 'pdf-parser',
    }
  } catch (error) {
    return {
      available: false,
      parser: 'pdf-parser',
      error: error instanceof Error ? error.message : 'Unknown error',
      recommendation: 'Python 환경 또는 Docling 설치를 확인하세요.',
    }
  }
}

/**
 * 모든 Parser 환경 체크
 */
export async function checkAllParsersEnvironment(): Promise<{
  allAvailable: boolean
  results: EnvironmentCheckResult[]
}> {
  const results: EnvironmentCheckResult[] = []

  // HWP Parser는 JavaScript만 사용하므로 항상 사용 가능
  results.push({
    available: true,
    parser: 'hwp-parser',
  })

  // Markdown Parser는 Node.js fs만 사용하므로 항상 사용 가능
  results.push({
    available: true,
    parser: 'markdown-parser',
  })

  // PDF Parser (Docling) 체크
  const doclingResult = await checkDoclingEnvironment()
  results.push(doclingResult)

  const allAvailable = results.every((r) => r.available)

  return {
    allAvailable,
    results,
  }
}

/**
 * 환경 체크 결과 출력 (콘솔)
 */
export function logEnvironmentCheckResults(results: EnvironmentCheckResult[]): void {
  console.log('\n[Parser Environment Check]')

  results.forEach((result) => {
    const status = result.available ? '✓' : '✗'
    const color = result.available ? '\x1b[32m' : '\x1b[31m' // Green or Red
    const reset = '\x1b[0m'

    console.log(`${color}${status}${reset} ${result.parser}`)

    if (!result.available) {
      if (result.error) {
        console.log(`  Error: ${result.error}`)
      }
      if (result.recommendation) {
        console.log(`  Recommendation: ${result.recommendation}`)
      }
    }
  })

  console.log('')
}
