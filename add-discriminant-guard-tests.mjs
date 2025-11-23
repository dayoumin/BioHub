// Discriminant Analysis 가드 테스트 추가
// Issue 1: accuracy undefined
// Issue 2: accuracy = 0
// Issue 3: Box's M 경고

import { readFileSync, writeFileSync } from 'fs';

const filePath = 'statistical-platform/__tests__/lib/interpretation/engine-advanced.test.ts';

// UTF-8로 읽기
let content = readFileSync(filePath, 'utf8');

// Discriminant Analysis 섹션 끝에 추가 (describe 블록 내부)
const discriminantEnd = content.indexOf("  }) // Discriminant Analysis");

if (discriminantEnd === -1) {
  console.error('❌ Discriminant Analysis 섹션을 찾을 수 없습니다.');
  process.exit(1);
}

const newTests = `
    // ===== Guard Tests (Issue Fix) =====
    it('Issue 1: accuracy undefined should show neutral practical message', () => {
      const result = getInterpretation({
        method: 'Discriminant Analysis',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          // accuracy 없음
          wilksLambda: { pValue: 0.01, significant: true }
        }
      })

      expect(result).not.toBeNull()
      expect(result?.practical).toBe('판별계수(discriminant coefficients)가 큰 변수가 주요 판별변수입니다. 혼동행렬로 분류 성능을 평가하세요.')
      expect(result?.practical).not.toContain('(%)') // 빈 괄호 없음
    })

    it('Issue 2: accuracy = 0 should display as 0.0%', () => {
      const result = getInterpretation({
        method: 'Discriminant Analysis',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          accuracy: 0.0 // 0%
        }
      })

      expect(result).not.toBeNull()
      expect(result?.practical).toContain('0.0%')
      expect(result?.practical).not.toContain('()%') // 빈 괄호% 없음
    })

    it('Issue 3: Box M warning should appear in high accuracy', () => {
      const result = getInterpretation({
        method: 'Discriminant Analysis',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          accuracy: 0.85, // high
          wilksLambda: { pValue: 0.01, significant: true },
          boxM: { significant: true, pValue: 0.02 }
        }
      })

      expect(result).not.toBeNull()
      expect(result?.statistical).toContain('Box\\'s M 검정이 유의하여')
      expect(result?.practical).toContain('정확도가 높습니다')
    })

    it('Issue 3: Box M warning should appear in moderate accuracy', () => {
      const result = getInterpretation({
        method: 'Discriminant Analysis',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          accuracy: 0.60, // moderate
          boxM: { significant: true, pValue: 0.02 }
        }
      })

      expect(result).not.toBeNull()
      expect(result?.statistical).toContain('Box\\'s M 검정이 유의하여')
      expect(result?.practical).toContain('정확도가 중간 수준입니다')
    })

    it('Issue 3: Box M warning should appear when accuracy is undefined', () => {
      const result = getInterpretation({
        method: 'Discriminant Analysis',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          // accuracy 없음
          boxM: { significant: true, pValue: 0.02 }
        }
      })

      expect(result).not.toBeNull()
      expect(result?.statistical).toContain('Box\\'s M 검정이 유의하여')
    })

`;

content = content.slice(0, discriminantEnd) + newTests + content.slice(discriminantEnd);

// UTF-8로 쓰기
writeFileSync(filePath, content, 'utf8');

console.log('✅ Discriminant Analysis 가드 테스트 5개 추가 완료');
console.log('📍 테스트 구성:');
console.log('  1. accuracy undefined → 중립 메시지');
console.log('  2. accuracy = 0 → 0.0% 표시');
console.log('  3. Box M + high accuracy → statistical에 경고');
console.log('  4. Box M + moderate accuracy → statistical에 경고');
console.log('  5. Box M + accuracy undefined → statistical에 경고');
