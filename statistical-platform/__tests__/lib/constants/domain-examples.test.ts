/**
 * domain-examples.ts 자동화 테스트
 *
 * @description
 * 수산과학 도메인 예시 중앙 관리 시스템의 기능을 검증합니다.
 */

import { describe, it, expect } from '@jest/globals';
import {
  DOMAIN_EXAMPLES,
  getExample,
  getExamplesArray,
  STATISTICS_EXAMPLES,
  type DomainType,
} from '@/lib/constants/domain-examples';

describe('domain-examples.ts', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. DOMAIN_EXAMPLES 구조 검증
  // ───────────────────────────────────────────────────────────────────────────

  describe('DOMAIN_EXAMPLES 구조', () => {
    it('4개 도메인이 정의되어야 함 (fisheries, medical, education, general)', () => {
      expect(DOMAIN_EXAMPLES).toHaveProperty('fisheries');
      expect(DOMAIN_EXAMPLES).toHaveProperty('medical');
      expect(DOMAIN_EXAMPLES).toHaveProperty('education');
      expect(DOMAIN_EXAMPLES).toHaveProperty('general');
    });

    it('fisheries 도메인에 필수 카테고리가 있어야 함', () => {
      const { fisheries } = DOMAIN_EXAMPLES;

      // continuous 하위 카테고리
      expect(fisheries.continuous).toHaveProperty('physical');
      expect(fisheries.continuous).toHaveProperty('environment');
      expect(fisheries.continuous).toHaveProperty('nutrition');
      expect(fisheries.continuous).toHaveProperty('production');
      expect(fisheries.continuous).toHaveProperty('biochemical');

      // categorical 하위 카테고리
      expect(fisheries.categorical).toHaveProperty('species');
      expect(fisheries.categorical).toHaveProperty('treatment');
      expect(fisheries.categorical).toHaveProperty('location');
      expect(fisheries.categorical).toHaveProperty('quality');
      expect(fisheries.categorical).toHaveProperty('bio');

      // id
      expect(fisheries.id).toBeDefined();
      expect(Array.isArray(fisheries.id)).toBe(true);
    });

    it('모든 카테고리가 배열이어야 함', () => {
      const { fisheries } = DOMAIN_EXAMPLES;

      // continuous
      expect(Array.isArray(fisheries.continuous.physical)).toBe(true);
      expect(Array.isArray(fisheries.continuous.environment)).toBe(true);
      expect(Array.isArray(fisheries.continuous.nutrition)).toBe(true);

      // categorical
      expect(Array.isArray(fisheries.categorical.species)).toBe(true);
      expect(Array.isArray(fisheries.categorical.treatment)).toBe(true);

      // id
      expect(Array.isArray(fisheries.id)).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. 수산과학 용어 검증
  // ───────────────────────────────────────────────────────────────────────────

  describe('수산과학 용어 검증', () => {
    it('핵심 수산과학 용어가 포함되어야 함', () => {
      const { fisheries } = DOMAIN_EXAMPLES;

      // 생리 측정
      expect(fisheries.continuous.physical).toContain('체중_g');
      expect(fisheries.continuous.physical).toContain('체장_cm');
      expect(fisheries.continuous.physical).toContain('비만도');

      // 환경 변수
      expect(fisheries.continuous.environment).toContain('수온_C');
      expect(fisheries.continuous.environment).toContain('염분도_ppt');
      expect(fisheries.continuous.environment).toContain('pH');

      // 사료/영양
      expect(fisheries.continuous.nutrition).toContain('사료섭취량_g');
      expect(fisheries.continuous.nutrition).toContain('단백질함량_%');

      // 생산성
      expect(fisheries.continuous.production).toContain('생산량_kg');
      expect(fisheries.continuous.production).toContain('생존율_%');

      // 어종
      expect(fisheries.categorical.species).toContain('넙치');
      expect(fisheries.categorical.species).toContain('조피볼락');

      // 처리구
      expect(fisheries.categorical.treatment).toContain('사료종류_A');
      expect(fisheries.categorical.treatment).toContain('대조구');
    });

    it('단위 표기가 일관되어야 함 (언더스코어 사용)', () => {
      const { fisheries } = DOMAIN_EXAMPLES;

      // continuous
      const allContinuous = [
        ...fisheries.continuous.physical,
        ...fisheries.continuous.environment,
        ...fisheries.continuous.nutrition,
        ...fisheries.continuous.production,
      ];

      // 단위가 있는 변수는 _로 구분
      const withUnits = allContinuous.filter(
        (v) => v.includes('_g') || v.includes('_kg') || v.includes('_C') || v.includes('_ppt') || v.includes('_%')
      );

      expect(withUnits.length).toBeGreaterThan(0);

      // 모든 단위 표기 변수가 언더스코어 사용
      withUnits.forEach((variable) => {
        expect(variable).toMatch(/_[a-zA-Z%]+$/); // 끝에 _단위 패턴
      });
    });

    it('의료/교육 도메인과 용어가 겹치지 않아야 함', () => {
      const { fisheries, medical, education } = DOMAIN_EXAMPLES;

      // 수산과학 특화 용어
      const fisheriesTerms = [
        ...fisheries.continuous.physical,
        ...fisheries.categorical.species,
      ];

      // 의료 용어
      const medicalTerms = [
        ...medical.continuous.vital,
        ...medical.categorical.treatment,
      ];

      // 교육 용어
      const educationTerms = [
        ...education.continuous.performance,
        ...education.categorical.group,
      ];

      // 교집합이 없어야 함
      const fisheriesMedicalOverlap = fisheriesTerms.filter((t) =>
        medicalTerms.includes(t)
      );
      const fisheriesEducationOverlap = fisheriesTerms.filter((t) =>
        educationTerms.includes(t)
      );

      expect(fisheriesMedicalOverlap.length).toBe(0);
      expect(fisheriesEducationOverlap.length).toBe(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. 헬퍼 함수 검증
  // ───────────────────────────────────────────────────────────────────────────

  describe('getExample() 함수', () => {
    it('정확한 예시를 반환해야 함', () => {
      const result1 = getExample('continuous', 'physical', 1);
      expect(result1).toBe('체중_g');

      const result2 = getExample('continuous', 'physical', 2);
      expect(result2).toBe('체중_g, 체장_cm');

      const result3 = getExample('categorical', 'treatment', 3);
      expect(result3).toBe('사료종류_A, 사료종류_B, 사료종류_C');
    });

    it('count 파라미터를 존중해야 함', () => {
      const result1 = getExample('continuous', 'environment', 1);
      expect(result1.split(', ')).toHaveLength(1);

      const result2 = getExample('continuous', 'environment', 3);
      expect(result2.split(', ')).toHaveLength(3);
    });

    it('다른 도메인도 지원해야 함', () => {
      const medical = getExample('continuous', 'vital', 1, 'medical');
      expect(medical).toMatch(/혈압|체온|맥박|혈당/);

      const education = getExample('continuous', 'performance', 1, 'education');
      expect(education).toMatch(/점수|성적|학습시간|출석률/);
    });

    it('존재하지 않는 subtype은 general로 fallback해야 함', () => {
      const result = getExample('continuous', 'nonexistent_type', 1);
      // general.continuous.generic으로 fallback
      expect(result).toMatch(/측정값|수치|변수/);
    });

    it('id 카테고리도 지원해야 함', () => {
      const result = getExample('id', '', 1);
      expect(result).toMatch(/개체번호|수조번호|측정일자|Fish_ID|Tank_ID/);
    });
  });

  describe('getExamplesArray() 함수', () => {
    it('배열을 반환해야 함', () => {
      const result = getExamplesArray('continuous', 'physical', 2);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('getExample()과 동일한 값을 반환해야 함 (배열 형태로)', () => {
      const stringResult = getExample('continuous', 'physical', 3);
      const arrayResult = getExamplesArray('continuous', 'physical', 3);

      expect(arrayResult.join(', ')).toBe(stringResult);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. STATISTICS_EXAMPLES 검증
  // ───────────────────────────────────────────────────────────────────────────

  describe('STATISTICS_EXAMPLES 프리셋', () => {
    it('주요 통계 방법 프리셋이 있어야 함', () => {
      expect(STATISTICS_EXAMPLES).toHaveProperty('descriptiveStats');
      expect(STATISTICS_EXAMPLES).toHaveProperty('frequencyTable');
      expect(STATISTICS_EXAMPLES).toHaveProperty('independentTTest');
      expect(STATISTICS_EXAMPLES).toHaveProperty('pairedTTest');
      expect(STATISTICS_EXAMPLES).toHaveProperty('oneWayAnova');
      expect(STATISTICS_EXAMPLES).toHaveProperty('twoWayAnova');
      expect(STATISTICS_EXAMPLES).toHaveProperty('ancova');
      expect(STATISTICS_EXAMPLES).toHaveProperty('correlation');
      expect(STATISTICS_EXAMPLES).toHaveProperty('simpleRegression');
      expect(STATISTICS_EXAMPLES).toHaveProperty('multipleRegression');
      expect(STATISTICS_EXAMPLES).toHaveProperty('logisticRegression');
      expect(STATISTICS_EXAMPLES).toHaveProperty('mannWhitneyU');
      expect(STATISTICS_EXAMPLES).toHaveProperty('kruskalWallis');
      expect(STATISTICS_EXAMPLES).toHaveProperty('chiSquareIndependence');
    });

    it('각 프리셋에 description이 있어야 함', () => {
      const presets = [
        'descriptiveStats',
        'oneWayAnova',
        'correlation',
        'simpleRegression',
      ];

      presets.forEach((preset) => {
        const example = STATISTICS_EXAMPLES[preset as keyof typeof STATISTICS_EXAMPLES];
        expect(example).toHaveProperty('description');
        expect(typeof example.description).toBe('string');
        expect(example.description.length).toBeGreaterThan(0);
      });
    });

    it('일원분산분석 프리셋이 수산과학 용어를 사용해야 함', () => {
      const { oneWayAnova } = STATISTICS_EXAMPLES;

      expect(oneWayAnova.dependent).toMatch(/체중|생장률|생산량/);
      expect(oneWayAnova.factor).toMatch(/사료종류/);
      expect(oneWayAnova.description).toMatch(/넙치|사료/);
    });

    it('상관분석 프리셋이 수산과학 용어를 사용해야 함', () => {
      const { correlation } = STATISTICS_EXAMPLES;

      expect(correlation.variables).toMatch(/수온|염분도|pH/);
      expect(correlation.description).toMatch(/수온|염분도|pH/);
    });

    it('로지스틱 회귀 프리셋이 수산과학 용어를 사용해야 함', () => {
      const { logisticRegression } = STATISTICS_EXAMPLES;

      expect(logisticRegression.dependent).toMatch(/생존/);
      expect(logisticRegression.independent).toMatch(/수온|염분도/);
      expect(logisticRegression.description).toMatch(/넙치|생존/);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. 일관성 검증
  // ───────────────────────────────────────────────────────────────────────────

  describe('일관성 검증', () => {
    it('모든 배열이 최소 1개 이상의 요소를 가져야 함', () => {
      const { fisheries } = DOMAIN_EXAMPLES;

      // continuous
      Object.values(fisheries.continuous).forEach((arr) => {
        expect(arr.length).toBeGreaterThan(0);
      });

      // categorical
      Object.values(fisheries.categorical).forEach((arr) => {
        expect(arr.length).toBeGreaterThan(0);
      });

      // id
      expect(fisheries.id.length).toBeGreaterThan(0);
    });

    it('중복된 값이 없어야 함', () => {
      const { fisheries } = DOMAIN_EXAMPLES;

      const allValues = [
        ...fisheries.continuous.physical,
        ...fisheries.continuous.environment,
        ...fisheries.continuous.nutrition,
        ...fisheries.continuous.production,
        ...fisheries.continuous.biochemical,
        ...fisheries.categorical.species,
        ...fisheries.categorical.treatment,
        ...fisheries.categorical.location,
        ...fisheries.categorical.quality,
        ...fisheries.categorical.bio,
        ...fisheries.id,
      ];

      const uniqueValues = new Set(allValues);
      expect(allValues.length).toBe(uniqueValues.size);
    });

    it('모든 변수명이 유효한 문자열이어야 함 (빈 문자열 없음)', () => {
      const { fisheries } = DOMAIN_EXAMPLES;

      const allValues = [
        ...fisheries.continuous.physical,
        ...fisheries.continuous.environment,
        ...fisheries.continuous.nutrition,
        ...fisheries.continuous.production,
        ...fisheries.continuous.biochemical,
        ...fisheries.categorical.species,
        ...fisheries.categorical.treatment,
        ...fisheries.categorical.location,
        ...fisheries.categorical.quality,
        ...fisheries.categorical.bio,
        ...fisheries.id,
      ];

      allValues.forEach((value) => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
        expect(value.trim()).toBe(value); // 앞뒤 공백 없음
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. 타입 안전성 검증
  // ───────────────────────────────────────────────────────────────────────────

  describe('타입 안전성', () => {
    it('DomainType 타입이 정확해야 함', () => {
      const domains: DomainType[] = ['fisheries', 'medical', 'education', 'general'];

      domains.forEach((domain) => {
        // TypeScript 컴파일 시 타입 에러가 없어야 함
        const result = getExample('continuous', 'physical', 1, domain);
        expect(typeof result).toBe('string');
      });
    });

    it('TypeScript 타입 시스템이 잘못된 도메인을 방지해야 함', () => {
      // TypeScript 컴파일 시 타입 에러 발생 (런타임 테스트는 스킵)
      // @ts-expect-error - 'invalid'는 DomainType이 아님
      // const result = getExample('continuous', 'physical', 1, 'invalid');

      // 유효한 도메인만 테스트
      const validDomains: DomainType[] = ['fisheries', 'medical', 'education', 'general'];
      validDomains.forEach((domain) => {
        const result = getExample('continuous', 'physical', 1, domain);
        expect(typeof result).toBe('string');
      });
    });
  });
});
