/**
 * Korean String Extraction Script for Terminology System Migration
 *
 * Usage: npx tsx scripts/scan-korean-strings.ts
 *
 * Scans all Smart Flow component files for hardcoded Korean strings
 * and generates a structured JSON snapshot for bulk conversion.
 */

import * as fs from 'fs'
import * as path from 'path'

interface KoreanString {
  line: number
  text: string
  context: string // surrounding code line
  inJsx: boolean
  inTemplateLiteral: boolean
  hasInterpolation: boolean
}

interface FileReport {
  filePath: string
  relativePath: string
  hasUseTerminology: boolean
  koreanStrings: KoreanString[]
  totalKoreanChars: number
}

const SMART_FLOW_DIR = path.resolve(__dirname, '../components/smart-flow')
const KOREAN_REGEX = /[\uAC00-\uD7AF\u3131-\u3163]/

function getAllTsxFiles(dir: string): string[] {
  const results: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // Skip __tests__ directories and node_modules
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue
      results.push(...getAllTsxFiles(fullPath))
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      // Skip test files
      if (entry.name.includes('.test.') || entry.name.includes('.spec.')) continue
      results.push(fullPath)
    }
  }

  return results
}

function extractKoreanStrings(filePath: string): FileReport {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const relativePath = path.relative(path.resolve(__dirname, '..'), filePath).replace(/\\/g, '/')

  const hasUseTerminology = content.includes('useTerminology')
  const koreanStrings: KoreanString[] = []
  let totalKoreanChars = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip import lines
    if (line.trim().startsWith('import ')) continue
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue

    if (!KOREAN_REGEX.test(line)) continue

    // Extract Korean text segments from the line
    // Match strings in quotes or JSX text content
    const stringPatterns = [
      /['"`]([^'"`]*[\uAC00-\uD7AF\u3131-\u3163][^'"`]*?)['"`]/g,  // quoted strings
      />([^<]*[\uAC00-\uD7AF\u3131-\u3163][^<]*?)</g,               // JSX text content
    ]

    for (const pattern of stringPatterns) {
      let match
      while ((match = pattern.exec(line)) !== null) {
        const text = match[1].trim()
        if (!text || !KOREAN_REGEX.test(text)) continue

        const koreanChars = (text.match(/[\uAC00-\uD7AF\u3131-\u3163]/g) || []).length
        totalKoreanChars += koreanChars

        koreanStrings.push({
          line: i + 1,
          text,
          context: line.trim(),
          inJsx: line.includes('JSX') || line.includes('>') || line.includes('<'),
          inTemplateLiteral: line.includes('`'),
          hasInterpolation: line.includes('${'),
        })
      }
    }
  }

  return {
    filePath,
    relativePath,
    hasUseTerminology,
    koreanStrings,
    totalKoreanChars,
  }
}

function main() {
  console.log('=== Korean String Extraction Snapshot ===\n')

  const files = getAllTsxFiles(SMART_FLOW_DIR)
  const reports: FileReport[] = []

  for (const file of files) {
    const report = extractKoreanStrings(file)
    if (report.koreanStrings.length > 0) {
      reports.push(report)
    }
  }

  // Categorize
  const converted = reports.filter(r => r.hasUseTerminology)
  const needsConversion = reports.filter(r => !r.hasUseTerminology)

  console.log(`Total files with Korean strings: ${reports.length}`)
  console.log(`Already converted: ${converted.length}`)
  console.log(`Needs conversion: ${needsConversion.length}\n`)

  // Summary table for files needing conversion
  console.log('=== FILES NEEDING CONVERSION ===\n')

  // Sort by Korean char count descending
  needsConversion.sort((a, b) => b.totalKoreanChars - a.totalKoreanChars)

  for (const report of needsConversion) {
    console.log(`\n--- ${report.relativePath} (${report.koreanStrings.length} strings, ${report.totalKoreanChars} chars) ---`)
    for (const ks of report.koreanStrings) {
      console.log(`  L${ks.line}: "${ks.text}"`)
    }
  }

  // Also show converted files that still have Korean (residual)
  const convertedWithResidual = converted.filter(r => r.koreanStrings.length > 0)
  if (convertedWithResidual.length > 0) {
    console.log('\n\n=== CONVERTED FILES WITH RESIDUAL KOREAN ===\n')
    for (const report of convertedWithResidual) {
      console.log(`\n--- ${report.relativePath} (${report.koreanStrings.length} residual strings) ---`)
      for (const ks of report.koreanStrings) {
        console.log(`  L${ks.line}: "${ks.text}"`)
      }
    }
  }

  // Write JSON snapshot
  const snapshot = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalFiles: reports.length,
      converted: converted.length,
      needsConversion: needsConversion.length,
      totalStringsToConvert: needsConversion.reduce((sum, r) => sum + r.koreanStrings.length, 0),
    },
    needsConversion: needsConversion.map(r => ({
      path: r.relativePath,
      strings: r.koreanStrings.map(s => ({ line: s.line, text: s.text })),
      charCount: r.totalKoreanChars,
    })),
    convertedWithResidual: convertedWithResidual.map(r => ({
      path: r.relativePath,
      strings: r.koreanStrings.map(s => ({ line: s.line, text: s.text })),
    })),
  }

  const snapshotPath = path.resolve(__dirname, '../korean-strings-snapshot.json')
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8')
  console.log(`\n\nSnapshot saved to: ${snapshotPath}`)
}

main()
