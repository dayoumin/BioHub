/**
 * hwp.js API 탐색
 */

async function testHWPAPI() {
  console.log('🔍 hwp.js API 탐색\n')

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hwpModule = (await import('hwp.js')) as any

    console.log('📦 hwp.js 모듈 exports:')
    console.log(Object.keys(hwpModule))

    console.log('\n📦 parse 함수 타입:', typeof hwpModule.parse)
    console.log('📦 Viewer 클래스 타입:', typeof hwpModule.Viewer)

    if (hwpModule.default) {
      console.log('\n📦 default export:')
      console.log(Object.keys(hwpModule.default))
    }

    // 파일 테스트
    const fs = await import('fs')
    const path = await import('path')

    const hwpFilePath = path.join(
      process.cwd(),
      'rag-system',
      'data',
      'hwp',
      '공문서만들기3.hwp'
    )

    console.log(`\n📄 테스트 파일: ${hwpFilePath}`)
    console.log(`📏 파일 존재: ${fs.existsSync(hwpFilePath)}`)

    if (fs.existsSync(hwpFilePath)) {
      const fileBuffer = fs.readFileSync(hwpFilePath)
      console.log(`📏 파일 크기: ${fileBuffer.length} bytes`)

      // 다양한 시도
      console.log('\n🧪 시도 1: Uint8Array')
      try {
        const result1 = hwpModule.parse(new Uint8Array(fileBuffer))
        console.log('✅ 성공! 결과 타입:', typeof result1)
        console.log('결과 keys:', Object.keys(result1).slice(0, 10))
      } catch (e) {
        console.log('❌ 실패:', e instanceof Error ? e.message : String(e))
      }

      console.log('\n🧪 시도 2: Buffer')
      try {
        const result2 = hwpModule.parse(fileBuffer)
        console.log('✅ 성공! 결과 타입:', typeof result2)
      } catch (e) {
        console.log('❌ 실패:', e instanceof Error ? e.message : String(e))
      }

      console.log('\n🧪 시도 3: ArrayBuffer')
      try {
        const result3 = hwpModule.parse(fileBuffer.buffer)
        console.log('✅ 성공! 결과 타입:', typeof result3)
      } catch (e) {
        console.log('❌ 실패:', e instanceof Error ? e.message : String(e))
      }

      console.log('\n🧪 시도 4: File path (string)')
      try {
        const result4 = hwpModule.parse(hwpFilePath)
        console.log('✅ 성공! 결과 타입:', typeof result4)
      } catch (e) {
        console.log('❌ 실패:', e instanceof Error ? e.message : String(e))
      }
    }
  } catch (error) {
    console.error('💥 오류:', error)
  }
}

testHWPAPI()
