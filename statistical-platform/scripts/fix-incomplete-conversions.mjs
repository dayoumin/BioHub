/**
 * 불완전 변환 + 누락 변환 수정
 */

import { readFileSync, writeFileSync } from 'fs';

const fixes = [
  // === 불완전 변환 (혼합 형태 → 완전한 camelCase) ===
  {
    file: 'app/(dashboard)/statistics/stepwise/page.tsx',
    replacements: [
      ['f_pValue', 'fPValue'],
      ['fChange_p', 'fChangeP'],
    ]
  },
  {
    file: 'app/(dashboard)/statistics/partial-correlation/page.tsx',
    replacements: [
      ['mean_partialCorr', 'meanPartialCorr'],
      ['max_partialCorr', 'maxPartialCorr'],
      ['min_partialCorr', 'minPartialCorr'],
      ['n_pairs', 'nPairs'],
      ['significant_pairs', 'significantPairs'],
    ]
  },
  {
    file: 'app/(dashboard)/statistics/response-surface/page.tsx',
    replacements: [
      ['adjusted_rSquared', 'adjustedRSquared'],
      ['f_pvalue', 'fPvalue'],
    ]
  },
  // === 누락 변환 (cluster) ===
  {
    file: 'app/(dashboard)/statistics/cluster/page.tsx',
    replacements: [
      ['calinski_harabasz_score', 'calinskiHarabaszScore'],
      ['davies_bouldin_score', 'daviesBouldinScore'],
    ]
  },
  // === 누락 변환 (dose-response) ===
  {
    file: 'app/(dashboard)/statistics/dose-response/page.tsx',
    replacements: [
      ['hill_slope', 'hillSlope'],
    ]
  },
  // === 누락 변환 (anova) ===
  {
    file: 'app/(dashboard)/statistics/anova/page.tsx',
    replacements: [
      ['sum_sq', 'sumSq'],
    ]
  },
];

// Python Worker 반환 키도 동기화
const pythonFixes = [
  {
    file: 'public/workers/python/worker2-hypothesis.py',
    replacements: [
      // stepwise: f_p_value, f_change_p 키 수정
      ["'f_p_value'", "'fPValue'"],
      ["'f_change_p'", "'fChangeP'"],
      ["'n_pairs'", "'nPairs'"],
      ["'significant_pairs'", "'significantPairs'"],
      ["'mean_partial_corr'", "'meanPartialCorr'"],
      ["'max_partial_corr'", "'maxPartialCorr'"],
      ["'min_partial_corr'", "'minPartialCorr'"],
    ]
  },
  {
    file: 'public/workers/python/worker4-regression-advanced.py',
    replacements: [
      ["'calinski_harabasz_score'", "'calinskiHarabaszScore'"],
      ["'davies_bouldin_score'", "'daviesBouldinScore'"],
      ["'hill_slope'", "'hillSlope'"],
      ["'adjusted_r_squared'", "'adjustedRSquared'"],
      ["'f_pvalue'", "'fPvalue'"],
    ]
  },
  {
    file: 'public/workers/python/worker3-nonparametric-anova.py',
    replacements: [
      ["'sum_sq'", "'sumSq'"],
    ]
  },
];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let totalChanges = 0;

// TypeScript 파일 수정
for (const { file, replacements } of fixes) {
  let content = readFileSync(file, 'utf8');
  let original = content;
  let changes = 0;

  for (const [from, to] of replacements) {
    const regex = new RegExp(escapeRegex(from), 'g');
    const matches = content.match(regex);
    if (matches) {
      changes += matches.length;
      content = content.replace(regex, to);
    }
  }

  if (content !== original) {
    writeFileSync(file, content, 'utf8');
    console.log(`✅ ${file} (${changes}개)`);
    totalChanges += changes;
  }
}

// Python Worker 수정
for (const { file, replacements } of pythonFixes) {
  let content = readFileSync(file, 'utf8');
  let original = content;
  let changes = 0;

  for (const [from, to] of replacements) {
    const regex = new RegExp(escapeRegex(from), 'g');
    const matches = content.match(regex);
    if (matches) {
      changes += matches.length;
      content = content.replace(regex, to);
    }
  }

  if (content !== original) {
    writeFileSync(file, content, 'utf8');
    console.log(`✅ ${file} (${changes}개)`);
    totalChanges += changes;

    // out/에도 복사
    const outPath = file.replace('public/', 'out/');
    writeFileSync(outPath, content, 'utf8');
  }
}

console.log(`\n📊 총 ${totalChanges}개 수정`);
