/**
 * PDF 파서 (Docling 기반)
 *
 * IBM Research의 Docling을 사용하여 PDF 파일에서 텍스트를 추출
 * Python 브릿지를 통해 Docling 실행
 */

import { spawn } from 'child_process'
import * as path from 'path'
import type { DocumentParser, ParserMetadata } from './base-parser'

/**
 * Docling 파싱 결과
 */
interface DoclingResult {
  success: boolean
  text?: string
  pages?: number
  error?: string
}

export class PDFParser implements DocumentParser {
  name = 'pdf-parser'
  supportedFormats = ['.pdf']
  private pythonCommand: string

  constructor(pythonCommand: string = 'python') {
    this.pythonCommand = pythonCommand
  }

  /**
   * PDF 파일에서 텍스트 추출 (Docling 사용)
   */
  async parse(filePath: string): Promise<string> {
    try {
      // Docling Python 스크립트 경로
      const scriptPath = path.join(
        process.cwd(),
        'scripts',
        'parsers',
        'docling_parser.py'
      )

      // Python 스크립트 실행
      const result = await this.runDocling(scriptPath, filePath)

      if (!result.success) {
        throw new Error(result.error || 'Unknown error from Docling')
      }

      if (!result.text) {
        throw new Error('No text extracted from PDF')
      }

      console.log(`[PDFParser] Extracted ${result.text.length} characters from PDF`)
      if (result.pages) {
        console.log(`[PDFParser] Pages: ${result.pages}`)
      }

      return result.text
    } catch (error) {
      console.error('[PDFParser] Error parsing PDF file:', error)
      throw new Error(
        `Failed to parse PDF file: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Docling Python 스크립트 실행
   */
  private async runDocling(scriptPath: string, pdfPath: string): Promise<DoclingResult> {
    return new Promise((resolve, reject) => {
      const python = spawn(this.pythonCommand, [scriptPath, pdfPath])

      let stdout = ''
      let stderr = ''

      python.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      python.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      python.on('close', (code) => {
        if (code !== 0) {
          // stderr 또는 stdout에서 에러 메시지 추출
          const errorMessage = stderr || stdout || 'Unknown error'

          try {
            // JSON 파싱 시도 (에러 메시지가 JSON 형식일 수 있음)
            const errorJson = JSON.parse(stdout || '{}')
            if (errorJson.error) {
              resolve({
                success: false,
                error: errorJson.error
              })
              return
            }
          } catch {
            // JSON 파싱 실패 시 raw 에러 메시지 사용
          }

          resolve({
            success: false,
            error: `Python script exited with code ${code}: ${errorMessage}`
          })
          return
        }

        try {
          // JSON 파싱
          const result: DoclingResult = JSON.parse(stdout)
          resolve(result)
        } catch (error) {
          resolve({
            success: false,
            error: `Failed to parse JSON output: ${error instanceof Error ? error.message : String(error)}`
          })
        }
      })

      python.on('error', (error) => {
        reject(new Error(`Failed to spawn Python process: ${error.message}`))
      })
    })
  }

  /**
   * 파서 메타데이터 반환
   */
  getMetadata(): ParserMetadata {
    return {
      name: 'pdf-parser',
      version: '1.0.0',
      supportedFormats: this.supportedFormats,
      description: 'PDF file parser using Docling (IBM Research)',
      url: 'https://github.com/DS4SD/docling'
    }
  }

  /**
   * Python 환경 확인 (선택적)
   */
  async checkPythonEnvironment(): Promise<{ available: boolean; error?: string }> {
    try {
      const result = await this.runDocling(
        path.join(process.cwd(), 'scripts', 'parsers', 'docling_parser.py'),
        '--version' // 더미 호출
      )

      if (!result.success && result.error?.includes('Docling not installed')) {
        return {
          available: false,
          error: 'Docling not installed. Please run: pip install docling'
        }
      }

      return { available: true }
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}
