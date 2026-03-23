/**
 * 재현 가능 코드 내보내기 — 타입 정의
 *
 * 통계 분석 결과를 R/Python 스크립트로 변환하기 위한 타입.
 * HistoryRecord → CodeTemplateInput → 템플릿 → .R/.py 파일
 */

import type { VariableMapping } from '@/lib/statistics/variable-mapping'

// ─── 지원 언어 ───

export type CodeLanguage = 'R' | 'python'

// ─── 템플릿 입력 ───

export interface CodeTemplateInput {
  /** CSV 파일명 (read_csv 경로) */
  dataFileName: string

  /** 변수 매핑 — VariableMapping 그대로 사용 */
  variableMapping: VariableMapping

  /** 분석 옵션 */
  options: {
    confidenceLevel: number
    /** 'two-sided' (저장값) 또는 'two.sided' (R 변환 후) */
    alternative: string
    equalVariance?: boolean
    postHocMethod?: string
    testValue?: number
  }

  /** 주석에 포함할 기대 결과 (BioHub 결과와 대조 검증용) */
  expectedResults?: {
    statistic?: number
    pValue?: number
    effectSize?: number
  }

  /** 코드 헤더 메타 정보 */
  meta: {
    generatedAt: string
    methodName: string
    dataRowCount: number
  }
}

// ─── 코드 템플릿 ───

export interface CodeTemplate {
  methodId: string
  language: CodeLanguage
  /** 필요한 라이브러리 목록 (R: c("tidyverse"), Python: ["scipy"]) */
  libraries: string[]
  /** 입력으로부터 전체 스크립트 문자열 생성 */
  generate: (input: CodeTemplateInput) => string
}

// ─── 템플릿 쌍 (R + Python) ───

export interface CodeTemplatePair {
  R: CodeTemplate
  python: CodeTemplate
}

// ─── 내보내기 결과 ───

export interface CodeExportResult {
  success: boolean
  fileName?: string
  content?: string
  error?: string
}
