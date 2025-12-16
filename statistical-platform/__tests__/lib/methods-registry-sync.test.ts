/**
 * Methods Registry 동기화 검증 테스트
 *
 * SSOT(Single Source of Truth) 가드레일:
 * 1. 레지스트리에 등록된 함수가 Python Worker에 실제 존재하는지
 * 2. Python Worker의 함수가 레지스트리에 등록되어 있는지
 * 3. Worker 번호가 올바른지
 *
 * 이 테스트가 실패하면 레지스트리와 실제 코드가 불일치한 것입니다.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import {
  methodsRegistry,
  getWorkerMethods,
  getAllMethods,
  WorkerNumber,
  WORKER_NUM_TO_KEY
} from '@/lib/constants/methods-registry.types'

// Python Worker 파일 경로
const WORKER_DIR = join(__dirname, '../../public/workers/python')

const WORKER_FILES: Record<WorkerNumber, string> = {
  1: 'worker1-descriptive.py',
  2: 'worker2-hypothesis.py',
  3: 'worker3-nonparametric-anova.py',
  4: 'worker4-regression-advanced.py'
}

/**
 * Python Worker 파일에서 public 함수 목록 추출
 * (_로 시작하는 private 함수 제외)
 */
function extractPythonFunctions(workerNum: WorkerNumber): string[] {
  const filePath = join(WORKER_DIR, WORKER_FILES[workerNum])
  const content = readFileSync(filePath, 'utf8')

  // "def function_name(" 패턴 매칭 (private 함수 제외)
  const pattern = /^def ([a-z][a-z0-9_]*)\(/gm
  const functions: string[] = []
  let match

  while ((match = pattern.exec(content)) !== null) {
    functions.push(match[1])
  }

  return functions
}

/**
 * Python 함수의 파라미터 추출
 */
function extractPythonParams(workerNum: WorkerNumber, funcName: string): string[] {
  const filePath = join(WORKER_DIR, WORKER_FILES[workerNum])
  const content = readFileSync(filePath, 'utf8')

  // 멀티라인 함수 정의 지원
  const pattern = new RegExp(`def ${funcName}\\(([^)]*(?:\\([^)]*\\)[^)]*)*)\\)`, 's')
  const match = content.match(pattern)

  if (!match) return []

  const paramStr = match[1]
  if (!paramStr.trim()) return []

  return paramStr
    .split(',')
    .map(p => p.trim())
    .map(p => p.split('=')[0].trim()) // 기본값 제거
    .map(p => p.split(':')[0].trim()) // 타입 힌트 제거
    .filter(p => p.length > 0)
}

describe('Methods Registry SSOT 검증', () => {
  describe('레지스트리 → Python 동기화', () => {
    // 레지스트리에 등록된 모든 함수가 Python에 존재해야 함
    const allMethods = getAllMethods()

    it.each(allMethods.map(m => [m.methodName, m.workerNum]))(
      '레지스트리의 %s가 Worker %d에 존재해야 함',
      (methodName, workerNum) => {
        const pythonFunctions = extractPythonFunctions(workerNum as WorkerNumber)
        expect(pythonFunctions).toContain(methodName)
      }
    )
  })

  describe('Python → 레지스트리 동기화 (주요 함수)', () => {
    // 주요 Python 함수가 레지스트리에 등록되어 있어야 함
    // (모든 헬퍼 함수까지 등록할 필요는 없음)

    const criticalFunctions: Array<{ workerNum: WorkerNumber; funcName: string }> = [
      // Worker 1 - 핵심 기술통계
      { workerNum: 1, funcName: 'descriptive_stats' },
      { workerNum: 1, funcName: 'normality_test' },
      { workerNum: 1, funcName: 'crosstab_analysis' },

      // Worker 2 - 핵심 가설검정
      { workerNum: 2, funcName: 't_test_two_sample' },
      { workerNum: 2, funcName: 't_test_paired' },
      { workerNum: 2, funcName: 'chi_square_test' },
      { workerNum: 2, funcName: 'correlation_test' },

      // Worker 3 - 핵심 ANOVA/비모수
      { workerNum: 3, funcName: 'one_way_anova' },
      { workerNum: 3, funcName: 'two_way_anova' },
      { workerNum: 3, funcName: 'mann_whitney_test' },
      { workerNum: 3, funcName: 'tukey_hsd' },

      // Worker 4 - 핵심 회귀/고급
      { workerNum: 4, funcName: 'linear_regression' },
      { workerNum: 4, funcName: 'multiple_regression' },
      { workerNum: 4, funcName: 'pca_analysis' },
      { workerNum: 4, funcName: 'cluster_analysis' }
    ]

    it.each(criticalFunctions.map(f => [f.funcName, f.workerNum]))(
      'Python의 %s (Worker %d)가 레지스트리에 등록되어 있어야 함',
      (funcName, workerNum) => {
        const registryMethods = getWorkerMethods(workerNum as WorkerNumber)
        expect(registryMethods).toContain(funcName)
      }
    )
  })

  describe('Worker 번호 검증', () => {
    it('Worker 1 메서드가 worker1-descriptive.py에만 존재해야 함', () => {
      const registryMethods = getWorkerMethods(1)
      const pythonFunctions = extractPythonFunctions(1)

      for (const method of registryMethods) {
        expect(pythonFunctions).toContain(method)
      }
    })

    it('Worker 2 메서드가 worker2-hypothesis.py에만 존재해야 함', () => {
      const registryMethods = getWorkerMethods(2)
      const pythonFunctions = extractPythonFunctions(2)

      for (const method of registryMethods) {
        expect(pythonFunctions).toContain(method)
      }
    })

    it('Worker 3 메서드가 worker3-nonparametric-anova.py에만 존재해야 함', () => {
      const registryMethods = getWorkerMethods(3)
      const pythonFunctions = extractPythonFunctions(3)

      for (const method of registryMethods) {
        expect(pythonFunctions).toContain(method)
      }
    })

    it('Worker 4 메서드가 worker4-regression-advanced.py에만 존재해야 함', () => {
      const registryMethods = getWorkerMethods(4)
      const pythonFunctions = extractPythonFunctions(4)

      for (const method of registryMethods) {
        expect(pythonFunctions).toContain(method)
      }
    })
  })

  describe('파라미터 동기화 검증 (샘플)', () => {
    // 주요 메서드의 파라미터가 레지스트리와 일치하는지 확인

    it('t_test_two_sample 파라미터가 일치해야 함', () => {
      const pythonParams = extractPythonParams(2, 't_test_two_sample')
      const registryDef = methodsRegistry.worker2.methods.t_test_two_sample

      // 필수 파라미터 확인
      expect(pythonParams).toContain('group1')
      expect(pythonParams).toContain('group2')

      // 레지스트리에도 동일하게 정의
      expect(registryDef.params).toContain('group1')
      expect(registryDef.params).toContain('group2')
    })

    it('one_way_anova 파라미터가 일치해야 함', () => {
      const pythonParams = extractPythonParams(3, 'one_way_anova')
      const registryDef = methodsRegistry.worker3.methods.one_way_anova

      expect(pythonParams).toContain('groups')
      expect(registryDef.params).toContain('groups')
    })

    it('crosstab_analysis 파라미터가 일치해야 함 (camelCase)', () => {
      const pythonParams = extractPythonParams(1, 'crosstab_analysis')
      const registryDef = methodsRegistry.worker1.methods.crosstab_analysis

      // Python은 camelCase로 수정됨
      expect(pythonParams).toContain('rowValues')
      expect(pythonParams).toContain('colValues')

      // 레지스트리도 camelCase
      expect(registryDef.params).toContain('rowValues')
      expect(registryDef.params).toContain('colValues')
    })
  })

  describe('레지스트리 무결성 검증', () => {
    it('모든 Worker가 최소 1개 이상의 메서드를 가져야 함', () => {
      for (const workerNum of [1, 2, 3, 4] as WorkerNumber[]) {
        const methods = getWorkerMethods(workerNum)
        expect(methods.length).toBeGreaterThan(0)
      }
    })

    it('중복 메서드 이름이 없어야 함', () => {
      const allMethodNames = getAllMethods().map(m => m.methodName)
      const uniqueNames = new Set(allMethodNames)
      expect(allMethodNames.length).toBe(uniqueNames.size)
    })

    it('모든 메서드에 description이 있어야 함', () => {
      const allMethods = getAllMethods()
      for (const { methodName, definition } of allMethods) {
        expect(definition.description).toBeTruthy()
        expect(definition.description.length).toBeGreaterThan(0)
      }
    })

    it('모든 메서드에 params 배열이 있어야 함', () => {
      const allMethods = getAllMethods()
      for (const { methodName, definition } of allMethods) {
        expect(Array.isArray(definition.params)).toBe(true)
      }
    })
  })
})
