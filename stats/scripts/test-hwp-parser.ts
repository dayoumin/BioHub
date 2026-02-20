/**
 * HWP Parser 실제 파일 테스트
 */

import { HWPParser } from '../lib/rag/parsers/hwp-parser'
import path from 'path'

async function testHWPParser() {
  console.log('🧪 HWP Parser 실제 파일 테스트\n')

  const hwpParser = new HWPParser()
  const hwpFilePath = path.join(
    process.cwd(),
    'rag-system',
    'data',
    'hwp',
    '공문서만들기3.hwp'
  )

  console.log(`📄 파일 경로: ${hwpFilePath}`)

  try {
    console.log('\n⏳ 파싱 시작...')
    const startTime = Date.now()

    const text = await hwpParser.parse(hwpFilePath)

    const endTime = Date.now()
    const elapsed = endTime - startTime

    console.log('✅ 파싱 성공!')
    console.log(`⏱️  소요 시간: ${elapsed}ms`)
    console.log(`📊 텍스트 길이: ${text.length.toLocaleString()} 문자`)
    console.log('\n📝 첫 500자:')
    console.log('─'.repeat(50))
    console.log(text.slice(0, 500))
    console.log('─'.repeat(50))

    // 메타데이터 확인
    const metadata = hwpParser.getMetadata()
    console.log('\n📋 Parser 메타데이터:')
    console.log(`  - Name: ${metadata.name}`)
    console.log(`  - Version: ${metadata.version}`)
    console.log(`  - Description: ${metadata.description}`)
    console.log(`  - Formats: ${metadata.supportedFormats.join(', ')}`)

    // 통계
    console.log('\n📊 텍스트 통계:')
    const lines = text.split('\n').length
    const paragraphs = text.split('\n\n').filter((p) => p.trim().length > 0).length
    const words = text.split(/\s+/).filter((w) => w.trim().length > 0).length

    console.log(`  - 라인 수: ${lines.toLocaleString()}`)
    console.log(`  - 단락 수: ${paragraphs.toLocaleString()}`)
    console.log(`  - 단어 수: ${words.toLocaleString()}`)

    return true
  } catch (error) {
    console.error('❌ 파싱 실패:')
    console.error(error)
    return false
  }
}

// 실행
testHWPParser()
  .then((success) => {
    if (success) {
      console.log('\n✅ 테스트 완료!')
      process.exit(0)
    } else {
      console.log('\n❌ 테스트 실패!')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('\n💥 예기치 않은 오류:')
    console.error(error)
    process.exit(1)
  })