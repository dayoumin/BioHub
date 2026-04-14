import { describe, expect, it } from 'vitest';
import {
  CATEGORY_FRIENDLY_TOKENS,
  PREDICTOR_LIKE_TOKENS,
  RESPONSE_LIKE_TOKENS,
  hasIdLikeName,
  hasToken,
  normalizeFieldName,
} from '@/lib/graph-studio/chart-spec-heuristics';

describe('chart-spec-heuristics', () => {
  it('splits camelCase headers into readable lowercase tokens', () => {
    expect(normalizeFieldName('treatmentGroup')).toEqual(['treatment', 'group']);
    expect(normalizeFieldName('bodyWeight')).toEqual(['body', 'weight']);
  });

  it('keeps Korean tokens when normalizing headers', () => {
    expect(normalizeFieldName('처리군_체중')).toEqual(['처리군', '체중']);
    expect(normalizeFieldName('샘플ID')).toEqual(['샘플', 'id']);
  });

  it('recognizes Korean id-like names', () => {
    expect(hasIdLikeName(normalizeFieldName('샘플ID'))).toBe(true);
    expect(hasIdLikeName(normalizeFieldName('환자번호'))).toBe(true);
  });

  it('recognizes Korean category, predictor, and response hints', () => {
    expect(hasToken(normalizeFieldName('처리군'), CATEGORY_FRIENDLY_TOKENS)).toBe(true);
    expect(hasToken(normalizeFieldName('용량'), PREDICTOR_LIKE_TOKENS)).toBe(true);
    expect(hasToken(normalizeFieldName('농도'), PREDICTOR_LIKE_TOKENS)).toBe(true);
    expect(hasToken(normalizeFieldName('체중'), RESPONSE_LIKE_TOKENS)).toBe(true);
  });
});
