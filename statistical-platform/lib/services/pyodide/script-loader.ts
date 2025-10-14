/**
 * Python 스크립트 동적 로딩 유틸리티
 */

// 스크립트 캐시
const scriptCache = new Map<string, string>()

/**
 * Python 스크립트를 로드하고 캐싱
 */
export async function loadPythonScript(scriptPath: string): Promise<string> {
  // 캐시 확인
  if (scriptCache.has(scriptPath)) {
    return scriptCache.get(scriptPath)!
  }

  try {
    // 동적 import 사용 (Webpack이 처리)
    const module = await import(`./scripts/${scriptPath}?raw`)
    const script = module.default

    // 캐싱
    scriptCache.set(scriptPath, script)

    return script
  } catch (error) {
    throw new Error(`Failed to load Python script: ${scriptPath}`)
  }
}

/**
 * 여러 스크립트를 한 번에 로드
 */
export async function loadPythonScripts(scriptPaths: string[]): Promise<Map<string, string>> {
  const scripts = new Map<string, string>()

  await Promise.all(
    scriptPaths.map(async (path) => {
      const script = await loadPythonScript(path)
      scripts.set(path, script)
    })
  )

  return scripts
}

/**
 * Python 함수 실행 헬퍼
 */
export function createPythonFunction(
  script: string,
  functionName: string,
  params: Record<string, any>
): string {
  // 파라미터를 Python 변수로 설정
  const paramSetup = Object.entries(params)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key} = "${value}"`
      }
      return `${key} = ${JSON.stringify(value)}`
    })
    .join('\n')

  return `
${script}

# 파라미터 설정
${paramSetup}

# 함수 실행
result = ${functionName}(${Object.keys(params).join(', ')})
result
`
}

/**
 * 스크립트 캐시 클리어
 */
export function clearScriptCache(): void {
  scriptCache.clear()
}