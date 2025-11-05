/**
 * PWA 아이콘 생성 스크립트
 *
 * SVG → PNG 변환 (192x192, 512x512)
 */

const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const sizes = [
  { size: 192, filename: 'icon-192.png' },
  { size: 512, filename: 'icon-512.png' }
]

const svgPath = path.join(__dirname, '../public/icon.svg')
const outputDir = path.join(__dirname, '../public')

async function generateIcons() {
  console.log('📦 PWA 아이콘 생성 중...\n')

  if (!fs.existsSync(svgPath)) {
    console.error('❌ icon.svg 파일을 찾을 수 없습니다:', svgPath)
    process.exit(1)
  }

  const svgBuffer = fs.readFileSync(svgPath)

  for (const { size, filename } of sizes) {
    try {
      const outputPath = path.join(outputDir, filename)

      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath)

      console.log(`✅ ${filename} (${size}x${size}) 생성 완료`)
    } catch (error) {
      console.error(`❌ ${filename} 생성 실패:`, error.message)
      process.exit(1)
    }
  }

  console.log('\n🎉 모든 아이콘 생성 완료!')
}

generateIcons()
