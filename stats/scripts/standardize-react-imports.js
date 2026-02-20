/**
 * React import 패턴 표준화
 * 모든 파일을 "import React, { ... } from 'react'" 패턴으로 통일
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
    let modified = false

    // Pattern 1: import { ... } from 'react' (React 없이)
    const namedImportMatch = content.match(/^import \{ ([^}]+) \} from 'react'/m)
    if (namedImportMatch && !content.match(/^import React/m)) {
      const hooks = namedImportMatch[1].trim()
      const newImport = `import React, { ${hooks} } from 'react'`
      content = content.replace(namedImportMatch[0], newImport)
      modified = true
    }
    // Pattern 2: import React from 'react' (hooks 없이)
    else if (content.match(/^import React from 'react'$/m)) {
      // useEffect, useState 등이 있는지 확인
      if (content.includes('useEffect') || content.includes('useState') ||
          content.includes('useCallback') || content.includes('useMemo')) {
        // hooks 수집
        const hooks = []
        if (content.includes('useState')) hooks.push('useState')
        if (content.includes('useCallback')) hooks.push('useCallback')
        if (content.includes('useEffect')) hooks.push('useEffect')
        if (content.includes('useMemo')) hooks.push('useMemo')
        if (content.includes('useRef')) hooks.push('useRef')
        if (content.includes('useContext')) hooks.push('useContext')

        if (hooks.length > 0) {
          const newImport = `import React, { ${hooks.join(', ')} } from 'react'`
          content = content.replace(/^import React from 'react'$/m, newImport)
          modified = true
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8')
      const fileName = path.basename(path.dirname(filePath))
      console.log(`✓ Standardized: ${fileName}/page.tsx`)
      fixedCount++
    }

  } catch (error) {
    console.error(`✗ Error: ${path.basename(path.dirname(filePath))}/page.tsx`, error.message)
  }
})

console.log(`\n=== Summary ===`)
console.log(`Standardized: ${fixedCount} files`)
