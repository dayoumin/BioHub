/**
 * callWorkerMethod 헬퍼 수동 검증 스크립트
 *
 * 실행 방법:
 * 1. npm run dev로 개발 서버 실행
 * 2. 브라우저 콘솔에서 이 코드 실행
 *
 * 또는:
 * - 통계 분석 페이지에서 기술통계 실행
 * - 결과가 정상적으로 나오면 헬퍼가 제대로 동작하는 것
 */

// 브라우저 콘솔에서 실행할 코드
const testCode = `
// PyodideStatisticsService 가져오기
const { PyodideStatisticsService } = await import('/lib/services/pyodide-statistics.ts')
const service = PyodideStatisticsService.getInstance()

// 테스트 데이터
const testData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

console.log('🧪 Testing callWorkerMethod helper...')
console.log('Test data:', testData)

// descriptiveStats 호출 (내부적으로 callWorkerMethod 사용)
const result = await service.descriptiveStats(testData)

console.log('✅ Result:', result)
console.log('✅ Mean:', result.mean, '(expected: 5.5)')
console.log('✅ Median:', result.median, '(expected: 5.5)')
console.log('✅ Min:', result.min, '(expected: 1)')
console.log('✅ Max:', result.max, '(expected: 10)')
console.log('✅ Std:', result.std)
console.log('✅ Q1:', result.q1)
console.log('✅ Q3:', result.q3)

// 검증
if (
  Math.abs(result.mean - 5.5) < 0.1 &&
  Math.abs(result.median - 5.5) < 0.1 &&
  result.min === 1 &&
  result.max === 10
) {
  console.log('🎉 callWorkerMethod helper is working correctly!')
} else {
  console.error('❌ Unexpected results!')
}
`

export const MANUAL_TEST_INSTRUCTIONS = `
# callWorkerMethod 헬퍼 수동 검증 방법

## 방법 1: 브라우저 콘솔 테스트

1. 개발 서버 실행:
   \`\`\`bash
   npm run dev
   \`\`\`

2. 브라우저에서 http://localhost:3000 열기

3. 개발자 도구 콘솔을 열고 아래 코드 실행:
   \`\`\`javascript
   ${testCode}
   \`\`\`

4. 결과 확인:
   - Mean: 5.5
   - Median: 5.5
   - Min: 1
   - Max: 10

## 방법 2: UI를 통한 검증

1. 개발 서버 실행:
   \`\`\`bash
   npm run dev
   \`\`\`

2. 통계 분석 페이지로 이동

3. 기술통계 분석 선택

4. 샘플 데이터 입력:
   \`\`\`
   1, 2, 3, 4, 5, 6, 7, 8, 9, 10
   \`\`\`

5. 분석 실행 후 결과 확인:
   - ✅ 평균: 5.5
   - ✅ 중앙값: 5.5
   - ✅ 최소값: 1
   - ✅ 최대값: 10
   - ✅ 표준편차, Q1, Q3 등 모든 값이 표시됨

## 성공 기준

- [ ] 에러 없이 결과가 반환됨
- [ ] 평균(mean)이 5.5
- [ ] 중앙값(median)이 5.5
- [ ] 최소값(min)이 1
- [ ] 최대값(max)가 10
- [ ] 표준편차, Q1, Q3, skewness, kurtosis 값이 있음

## 예상 결과

\`\`\`json
{
  "mean": 5.5,
  "median": 5.5,
  "std": 3.0276503540974917,
  "min": 1,
  "max": 10,
  "q1": 3.25,
  "q3": 7.75,
  "skewness": 0,
  "kurtosis": -1.2
}
\`\`\`

## 트러블슈팅

### Pyodide 로딩 에러
- 인터넷 연결 확인 (Pyodide는 CDN에서 로드됨)
- 브라우저 콘솔에서 에러 메시지 확인

### Worker 로딩 실패
- \`public/workers/python/worker1-descriptive.py\` 파일 존재 확인
- 서버 재시작

### 타입 에러
- TypeScript 컴파일 확인: \`npx tsc --noEmit\`
`

console.log(MANUAL_TEST_INSTRUCTIONS)
