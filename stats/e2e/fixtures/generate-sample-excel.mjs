/**
 * E2E 테스트용 샘플 Excel 파일 생성 스크립트
 *
 * 사용법: node e2e/fixtures/generate-sample-excel.mjs
 */

import * as XLSX from 'xlsx'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 샘플 데이터 1: 기본 통계 분석용 (t-test, ANOVA 등)
const basicStatsData = [
  ['Group', 'Value', 'Category'],
  ['A', 23.5, 'High'],
  ['A', 25.1, 'High'],
  ['A', 22.8, 'Medium'],
  ['A', 24.3, 'High'],
  ['A', 23.9, 'Medium'],
  ['B', 28.2, 'High'],
  ['B', 27.5, 'Medium'],
  ['B', 29.1, 'High'],
  ['B', 26.8, 'Low'],
  ['B', 28.7, 'High'],
  ['C', 31.2, 'Medium'],
  ['C', 30.5, 'High'],
  ['C', 32.1, 'High'],
  ['C', 29.8, 'Medium'],
  ['C', 31.6, 'Low'],
]

// 샘플 데이터 2: 상관 분석용
const correlationData = [
  ['X1', 'X2', 'X3', 'Y'],
  [1.2, 3.4, 5.6, 10.2],
  [2.3, 4.5, 6.7, 13.5],
  [3.4, 5.6, 7.8, 16.8],
  [4.5, 6.7, 8.9, 20.1],
  [5.6, 7.8, 9.0, 22.4],
  [6.7, 8.9, 10.1, 25.7],
  [7.8, 9.0, 11.2, 28.0],
  [8.9, 10.1, 12.3, 31.3],
  [9.0, 11.2, 13.4, 33.6],
  [10.1, 12.3, 14.5, 36.9],
]

// 샘플 데이터 3: 빈도 분석용
const frequencyData = [
  ['Gender', 'AgeGroup', 'Preference'],
  ['Male', '20-29', 'A'],
  ['Female', '20-29', 'B'],
  ['Male', '30-39', 'A'],
  ['Female', '30-39', 'C'],
  ['Male', '20-29', 'B'],
  ['Female', '40-49', 'A'],
  ['Male', '40-49', 'C'],
  ['Female', '20-29', 'A'],
  ['Male', '30-39', 'B'],
  ['Female', '30-39', 'A'],
  ['Male', '40-49', 'B'],
  ['Female', '40-49', 'C'],
]

// 워크북 생성
function createWorkbook(data, sheetName) {
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  return workbook
}

// 멀티시트 워크북 생성
function createMultiSheetWorkbook() {
  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(basicStatsData), 'BasicStats')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(correlationData), 'Correlation')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(frequencyData), 'Frequency')

  return workbook
}

// 파일 저장
function saveWorkbook(workbook, filename) {
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  const filepath = join(__dirname, filename)
  writeFileSync(filepath, buffer)
  console.log(`Created: ${filepath}`)
}

// 메인 실행
console.log('Generating sample Excel files for E2E tests...\n')

// 1. 기본 통계 분석용
saveWorkbook(createWorkbook(basicStatsData, 'Data'), 'sample-basic-stats.xlsx')

// 2. 상관 분석용
saveWorkbook(createWorkbook(correlationData, 'Data'), 'sample-correlation.xlsx')

// 3. 빈도 분석용
saveWorkbook(createWorkbook(frequencyData, 'Data'), 'sample-frequency.xlsx')

// 4. 멀티시트
saveWorkbook(createMultiSheetWorkbook(), 'sample-multisheet.xlsx')

console.log('\nDone! Sample files created in e2e/fixtures/')
