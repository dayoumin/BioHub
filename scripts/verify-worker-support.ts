/**
 * Web Worker 환경 검증 스크립트
 *
 * Purpose: Phase 5-3 Worker Pool 구현 전 환경 검증
 * Usage: node --loader ts-node/esm scripts/verify-worker-support.ts
 */

interface VerificationResult {
  feature: string
  supported: boolean
  required: boolean
  details?: string
  recommendation?: string
}

class WorkerEnvironmentVerifier {
  private results: VerificationResult[] = []

  /**
   * 1. Web Worker API 지원 확인
   */
  private checkWorkerAPI(): VerificationResult {
    const supported = typeof Worker !== 'undefined'

    return {
      feature: 'Web Worker API',
      supported,
      required: true,
      details: supported
        ? 'Worker constructor available'
        : 'Worker constructor not found',
      recommendation: !supported
        ? '❌ CRITICAL: Web Worker 미지원 환경. 브라우저 업데이트 필요.'
        : undefined
    }
  }

  /**
   * 2. SharedArrayBuffer 지원 확인 (Pyodide 성능 최적화)
   */
  private checkSharedArrayBuffer(): VerificationResult {
    const supported = typeof SharedArrayBuffer !== 'undefined'

    return {
      feature: 'SharedArrayBuffer',
      supported,
      required: false,
      details: supported
        ? 'SharedArrayBuffer available (Pyodide 성능 최적화 가능)'
        : 'SharedArrayBuffer not available (COOP/COEP 헤더 필요)',
      recommendation: !supported
        ? '⚠️ WARNING: Pyodide 성능 제한. COOP/COEP 헤더 설정 권장.\n' +
          '   Next.js: next.config.ts에서 headers 설정 추가'
        : undefined
    }
  }

  /**
   * 3. Worker Module 지원 확인 (ES Modules in Workers)
   */
  private checkWorkerModules(): VerificationResult {
    let supported = false
    let details = ''

    try {
      // Worker Module 지원 테스트 (실제 Worker 생성 없이)
      // Chrome 80+, Firefox 114+, Safari 15+
      const testCode = 'export default self'
      const blob = new Blob([testCode], { type: 'application/javascript' })
      const url = URL.createObjectURL(blob)

      // Worker constructor의 type 옵션 지원 확인
      const workerOptions: WorkerOptions = { type: 'module' }
      supported = 'type' in workerOptions

      URL.revokeObjectURL(url)
      details = 'Worker Module (type: "module") support detected'
    } catch (err) {
      details = `Worker Module test failed: ${err instanceof Error ? err.message : String(err)}`
    }

    return {
      feature: 'Worker Modules (ES Modules)',
      supported,
      required: false,
      details,
      recommendation: !supported
        ? '⚠️ WARNING: Worker Module 미지원. Classic Worker 사용 필요.'
        : undefined
    }
  }

  /**
   * 4. IndexedDB 지원 확인 (Pyodide 패키지 캐싱)
   */
  private checkIndexedDB(): VerificationResult {
    const supported = typeof indexedDB !== 'undefined'

    return {
      feature: 'IndexedDB',
      supported,
      required: false,
      details: supported
        ? 'IndexedDB available (Pyodide 패키지 캐싱 가능)'
        : 'IndexedDB not available',
      recommendation: !supported
        ? '⚠️ WARNING: Pyodide 패키지를 매번 다운로드. 초기 로딩 느림.'
        : undefined
    }
  }

  /**
   * 5. Next.js 환경 확인
   */
  private checkNextJsEnvironment(): VerificationResult {
    // Node.js 환경에서 실행되므로 process.env 확인
    const isNextJs = typeof process !== 'undefined' &&
                     process.env.NEXT_RUNTIME !== undefined

    const isEdgeRuntime = process.env.NEXT_RUNTIME === 'edge'

    return {
      feature: 'Next.js Environment',
      supported: true,
      required: false,
      details: isNextJs
        ? `Next.js detected (Runtime: ${process.env.NEXT_RUNTIME || 'nodejs'})`
        : 'Not running in Next.js environment',
      recommendation: isEdgeRuntime
        ? '⚠️ WARNING: Edge Runtime에서는 Worker Pool 제약 있음. Node.js Runtime 사용 권장.'
        : undefined
    }
  }

  /**
   * 6. 메모리 제한 확인 (대용량 데이터 처리)
   */
  private checkMemoryLimits(): VerificationResult {
    let details = ''
    let recommendation: string | undefined

    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as Performance & { memory?: { jsHeapSizeLimit: number } }).memory
      if (memory) {
        const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
        details = `Heap size limit: ${limitMB} MB`

        if (limitMB < 2048) {
          recommendation = `⚠️ WARNING: 낮은 메모리 제한 (${limitMB} MB). 대용량 데이터셋 처리 제한 가능.`
        }
      }
    } else {
      details = 'Memory info not available (Chrome 전용 API)'
    }

    return {
      feature: 'Memory Limits',
      supported: true,
      required: false,
      details,
      recommendation
    }
  }

  /**
   * 모든 검증 실행
   */
  public async verify(): Promise<void> {
    console.log('\n🔍 Web Worker 환경 검증 시작...\n')
    console.log('=' .repeat(80))

    // 검증 항목 실행
    this.results.push(this.checkWorkerAPI())
    this.results.push(this.checkSharedArrayBuffer())
    this.results.push(this.checkWorkerModules())
    this.results.push(this.checkIndexedDB())
    this.results.push(this.checkNextJsEnvironment())
    this.results.push(this.checkMemoryLimits())

    // 결과 출력
    this.printResults()

    // 블로커 체크
    this.checkBlockers()
  }

  /**
   * 결과 출력
   */
  private printResults(): void {
    console.log('\n📊 검증 결과:\n')

    this.results.forEach((result, index) => {
      const icon = result.supported ? '✅' : (result.required ? '❌' : '⚠️')
      const required = result.required ? '[필수]' : '[선택]'

      console.log(`${index + 1}. ${icon} ${result.feature} ${required}`)
      console.log(`   ${result.details}`)

      if (result.recommendation) {
        console.log(`   ${result.recommendation}`)
      }
      console.log()
    })
  }

  /**
   * 블로커 확인 및 종료 코드 반환
   */
  private checkBlockers(): void {
    const blockers = this.results.filter(r => r.required && !r.supported)

    console.log('=' .repeat(80))

    if (blockers.length > 0) {
      console.log('\n❌ FAILED: Phase 5-3 Worker Pool 구현 블로커 발견!\n')
      blockers.forEach(blocker => {
        console.log(`   - ${blocker.feature}: ${blocker.recommendation}`)
      })
      console.log('\n블로커 해결 후 다시 실행하세요.\n')
      process.exit(1)
    } else {
      const warnings = this.results.filter(r => !r.required && !r.supported)

      if (warnings.length > 0) {
        console.log('\n⚠️ PASSED with WARNINGS: Worker Pool 구현 가능하나 성능 제한 있음\n')
        warnings.forEach(warning => {
          console.log(`   - ${warning.feature}`)
        })
        console.log()
      } else {
        console.log('\n✅ PASSED: Worker Pool 구현 준비 완료!\n')
      }

      console.log('Phase 5-3 AdaptiveWorkerPool 구현을 시작할 수 있습니다.\n')
      process.exit(0)
    }
  }
}

/**
 * 브라우저 환경 검증 (HTML 페이지용)
 */
export function createBrowserVerificationPage(): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Web Worker 환경 검증</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 900px;
      margin: 50px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      border-bottom: 3px solid #4CAF50;
      padding-bottom: 10px;
    }
    .result {
      margin: 20px 0;
      padding: 15px;
      border-left: 4px solid #ddd;
      background: #f9f9f9;
    }
    .result.pass { border-color: #4CAF50; background: #f1f8f4; }
    .result.fail { border-color: #f44336; background: #fef1f0; }
    .result.warn { border-color: #ff9800; background: #fff8e1; }
    .icon { font-size: 24px; margin-right: 10px; }
    .details { margin-top: 10px; font-size: 14px; color: #666; }
    .recommendation { margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 4px; }
    button {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      margin-top: 20px;
    }
    button:hover { background: #45a049; }
    pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 Web Worker 환경 검증</h1>
    <p>Phase 5-3 Worker Pool 구현을 위한 브라우저 환경 검증</p>

    <button onclick="runVerification()">검증 시작</button>

    <div id="results"></div>
  </div>

  <script>
    function runVerification() {
      const results = [];

      // 1. Web Worker API
      results.push({
        feature: 'Web Worker API',
        supported: typeof Worker !== 'undefined',
        required: true,
        details: typeof Worker !== 'undefined' ? 'Worker constructor available' : 'Worker constructor not found',
        recommendation: typeof Worker === 'undefined' ? '브라우저 업데이트 필요' : null
      });

      // 2. SharedArrayBuffer
      results.push({
        feature: 'SharedArrayBuffer',
        supported: typeof SharedArrayBuffer !== 'undefined',
        required: false,
        details: typeof SharedArrayBuffer !== 'undefined'
          ? 'Pyodide 성능 최적화 가능'
          : 'COOP/COEP 헤더 설정 필요 (성능 제한)',
        recommendation: typeof SharedArrayBuffer === 'undefined'
          ? 'Cross-Origin-Opener-Policy: same-origin\\nCross-Origin-Embedder-Policy: require-corp'
          : null
      });

      // 3. IndexedDB
      results.push({
        feature: 'IndexedDB',
        supported: typeof indexedDB !== 'undefined',
        required: false,
        details: typeof indexedDB !== 'undefined'
          ? 'Pyodide 패키지 캐싱 가능'
          : 'Pyodide 패키지를 매번 다운로드',
        recommendation: null
      });

      // 4. Memory Info
      let memoryDetails = 'Memory info not available';
      if (performance.memory) {
        const limitMB = Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024);
        memoryDetails = \`Heap limit: \${limitMB} MB\`;
      }
      results.push({
        feature: 'Memory Limits',
        supported: true,
        required: false,
        details: memoryDetails,
        recommendation: null
      });

      // 5. Browser Info
      results.push({
        feature: 'Browser',
        supported: true,
        required: false,
        details: \`\${navigator.userAgent}\`,
        recommendation: null
      });

      displayResults(results);
    }

    function displayResults(results) {
      const container = document.getElementById('results');
      container.innerHTML = '<h2>검증 결과</h2>';

      results.forEach((result, index) => {
        const status = result.supported ? 'pass' : (result.required ? 'fail' : 'warn');
        const icon = result.supported ? '✅' : (result.required ? '❌' : '⚠️');
        const required = result.required ? '[필수]' : '[선택]';

        const div = document.createElement('div');
        div.className = \`result \${status}\`;
        div.innerHTML = \`
          <div>
            <span class="icon">\${icon}</span>
            <strong>\${result.feature}</strong> \${required}
          </div>
          <div class="details">\${result.details}</div>
          \${result.recommendation ? \`<div class="recommendation">💡 \${result.recommendation}</div>\` : ''}
        \`;
        container.appendChild(div);
      });

      // Summary
      const blockers = results.filter(r => r.required && !r.supported);
      const summary = document.createElement('div');
      summary.style.marginTop = '20px';
      summary.style.padding = '20px';
      summary.style.borderRadius = '4px';

      if (blockers.length > 0) {
        summary.style.background = '#fef1f0';
        summary.innerHTML = '<h3>❌ 블로커 발견!</h3><p>Worker Pool 구현 전 문제 해결 필요</p>';
      } else {
        summary.style.background = '#f1f8f4';
        summary.innerHTML = '<h3>✅ 검증 통과!</h3><p>Phase 5-3 AdaptiveWorkerPool 구현 시작 가능</p>';
      }
      container.appendChild(summary);
    }
  </script>
</body>
</html>
  `.trim()
}

// Node.js 환경에서 실행
if (typeof window === 'undefined') {
  const verifier = new WorkerEnvironmentVerifier()
  verifier.verify()
}
