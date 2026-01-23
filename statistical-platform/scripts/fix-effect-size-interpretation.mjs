// Fix interpretEffectSize function to support all effect size types
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'lib/statistics/formatters.ts';
let content = readFileSync(filePath, 'utf8');

// Find and replace the interpretEffectSize function
const oldFunction = `/**
 * 효과크기 해석 (확장)
 * @param effectSize 효과크기 값
 * @param effectType 효과크기 유형
 * @returns 해석 문자열
 */
export function interpretEffectSize(
  effectSize: number,
  effectType: 'cohen_d' | 'eta_squared' | 'omega_squared' | 'r' | 'phi' | 'cramers_v' = 'cohen_d'
): string {
  const absValue = Math.abs(effectSize)

  switch (effectType) {
    case 'cohen_d':
      if (absValue < EFFECT_SIZE.SMALL) return '매우 작음'
      if (absValue < EFFECT_SIZE.MEDIUM) return '작음'
      if (absValue < EFFECT_SIZE.LARGE) return '중간'
      if (absValue < EFFECT_SIZE.VERY_LARGE) return '큼'
      return '매우 큼'
    case 'eta_squared':
    case 'omega_squared':
      if (absValue < 0.01) return '매우 작음'
      if (absValue < 0.06) return '작음'
      if (absValue < 0.14) return '중간'
      return '큼'
    case 'r':
      if (absValue < 0.1) return '무시할 수준'
      if (absValue < 0.3) return '작음'
      if (absValue < 0.5) return '중간'
      return '큼'
    case 'phi':
    case 'cramers_v':
      if (absValue < 0.1) return '무시할 수준'
      if (absValue < 0.3) return '작음'
      if (absValue < 0.5) return '중간'
      return '큼'
    default:
      return '해석 불가'
  }
}`;

const newFunction = `/**
 * 효과크기 해석 (확장)
 * @param effectSize 효과크기 값
 * @param effectType 효과크기 유형
 * @returns 해석 문자열
 */
export function interpretEffectSize(
  effectSize: number,
  effectType:
    | 'cohen_d' | 'cohens_d' | 'hedges_g' | 'glass_delta'
    | 'eta_squared' | 'partial_eta_squared' | 'omega_squared' | 'epsilon_squared'
    | 'r' | 'r_squared' | 'phi' | 'cramers_v' | 'w' = 'cohen_d'
): string {
  const absValue = Math.abs(effectSize)

  switch (effectType) {
    // Cohen's d 계열 (표준화된 평균 차이)
    case 'cohen_d':
    case 'cohens_d':
    case 'hedges_g':
    case 'glass_delta':
      if (absValue < EFFECT_SIZE.SMALL) return '매우 작음'
      if (absValue < EFFECT_SIZE.MEDIUM) return '작음'
      if (absValue < EFFECT_SIZE.LARGE) return '중간'
      if (absValue < EFFECT_SIZE.VERY_LARGE) return '큼'
      return '매우 큼'
    // Eta squared 계열 (분산 설명 비율)
    case 'eta_squared':
    case 'partial_eta_squared':
    case 'omega_squared':
    case 'epsilon_squared':
      if (absValue < 0.01) return '매우 작음'
      if (absValue < 0.06) return '작음'
      if (absValue < 0.14) return '중간'
      return '큼'
    // 상관계수 및 결정계수
    case 'r':
      if (absValue < 0.1) return '무시할 수준'
      if (absValue < 0.3) return '작음'
      if (absValue < 0.5) return '중간'
      return '큼'
    case 'r_squared':
      // R²는 0-1 범위, Cohen (1988) 기준
      if (absValue < 0.01) return '무시할 수준'
      if (absValue < 0.09) return '작음'
      if (absValue < 0.25) return '중간'
      return '큼'
    // 범주형 변수 연관성
    case 'phi':
    case 'cramers_v':
      if (absValue < 0.1) return '무시할 수준'
      if (absValue < 0.3) return '작음'
      if (absValue < 0.5) return '중간'
      return '큼'
    // Kendall's W (일치도 계수)
    case 'w':
      if (absValue < 0.1) return '매우 약한 일치'
      if (absValue < 0.3) return '약한 일치'
      if (absValue < 0.5) return '보통 일치'
      if (absValue < 0.7) return '강한 일치'
      return '매우 강한 일치'
    default:
      return '해석 불가'
  }
}`;

if (content.includes(oldFunction)) {
  content = content.replace(oldFunction, newFunction);
  writeFileSync(filePath, content, 'utf8');
  console.log('✅ interpretEffectSize function updated successfully');
} else {
  console.log('❌ Could not find the exact function to replace');
  console.log('Searching for partial match...');

  // Try to find by function signature
  if (content.includes("effectType: 'cohen_d' | 'eta_squared' | 'omega_squared' | 'r' | 'phi' | 'cramers_v'")) {
    console.log('Found function signature, manual check needed');
  }
}