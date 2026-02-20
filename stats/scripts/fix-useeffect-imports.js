/**
 * useEffect import 수정 스크립트
 */

const fs = require('fs')
const path = require('path')
const glob = require('glob')

const basePath = path.join(__dirname, '../app/(dashboard)/statistics')

// 모든 통계 페이지 찾기
const files = glob.sync(`${basePath}/*/page.tsx`)

let fixedCount = 0

files.forEach((filePath) => {
  try {
    let content = fs.readFileSync(filePath, 'utf8')

    // addToRecentStatistics가 있는 파일만 처리
    if (!content.includes('addToRecentStatistics')) {
      return
    }

    // 이미 useEffect가 import되었는지 확인
    const reactImportMatch = content.match(/import React.*from 'react'/)
    if (reactImportMatch && reactImportMatch[0].includes('useEffect')) {
      return // 이미 있으면 스킵
    }

    // React import에 useEffect 추가
    if (reactImportMatch) {
      const oldImport = reactImportMatch[0]

      // 1. import React, { useState, useCallback } from 'react'
      // 2. import React, { useState } from 'react'
      // 3. import React from 'react'
      // 4. import { useState, useCallback } from 'react'

      let newImport
      if (oldImport.includes('{')) {
        // 이미 named imports가 있는 경우
        newImport = oldImport.replace(/\{([^}]+)\}/, (match, imports) => {
          const importList = imports.split(',').map(s => s.trim()).filter(s => s)
          if (!importList.includes('useEffect')) {
            importList.push('useEffect')
          }
          return `{ ${importList.join(', ')} }`
        })
      } else {
        // import React from 'react'인 경우
        newImport = oldImport.replace('from \'react\'', ', { useEffect } from \'react\'')
      }

      content = content.replace(oldImport, newImport)
      fs.writeFileSync(filePath, content, 'utf8')

      const fileName = path.basename(path.dirname(filePath))
      console.log(`✓ Fixed: ${fileName}/page.tsx`)
      fixedCount++
    }

  } catch (error) {
    console.error(`✗ Error: ${filePath}`, error.message)
  }
})

console.log(`\n=== Summary ===`)
console.log(`Fixed: ${fixedCount} files`)
