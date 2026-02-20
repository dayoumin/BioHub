/**
 * 테스트에서 발견된 잔여 snake_case 수정
 */

import { readFileSync, writeFileSync } from 'fs';

const fixes = [
  {
    file: 'app/(dashboard)/statistics/partial-correlation/page.tsx',
    replacements: [
      ['t_stat', 'tStat'],
      ['control_vars', 'controlVars'],
      ['zero_order_correlations', 'zeroOrderCorrelations'],
    ]
  },
  {
    file: 'app/(dashboard)/statistics/normality-test/page.tsx',
    replacements: [
      ['critical_value', 'criticalValue'],
    ]
  },
  {
    file: 'app/(dashboard)/statistics/non-parametric/page.tsx',
    replacements: [
      ['use_cases', 'useCases'],
      ['parametric_equivalent', 'parametricEquivalent'],
    ]
  },
  {
    file: 'app/(dashboard)/statistics/mcnemar/page.tsx',
    replacements: [
      ['first_positive_second_negative', 'firstPositiveSecondNegative'],
      ['first_negative_second_positive', 'firstNegativeSecondPositive'],
      ['both_positive', 'bothPositive'],
      ['both_negative', 'bothNegative'],
    ]
  },
];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let total = 0;

for (const { file, replacements } of fixes) {
  let content = readFileSync(file, 'utf8');
  let original = content;
  let changes = 0;

  for (const [from, to] of replacements) {
    const regex = new RegExp(escapeRegex(from), 'g');
    const m = content.match(regex);
    if (m) { changes += m.length; content = content.replace(regex, to); }
  }

  if (content !== original) {
    writeFileSync(file, content, 'utf8');
    console.log(`✅ ${file} (${changes}개)`);
    total += changes;
  }
}

// Python Worker 동기화 (mcnemar, normality, partial-correlation 반환 키)
const pyFixes = [
  {
    file: 'public/workers/python/worker2-hypothesis.py',
    replacements: [
      ["'critical_value'", "'criticalValue'"],
      ["'control_vars'", "'controlVars'"],
      ["'zero_order_correlations'", "'zeroOrderCorrelations'"],
      ["'t_stat'", "'tStat'"],
    ]
  },
  {
    file: 'public/workers/python/worker3-nonparametric-anova.py',
    replacements: [
      ["'both_positive'", "'bothPositive'"],
      ["'first_positive_second_negative'", "'firstPositiveSecondNegative'"],
      ["'first_negative_second_positive'", "'firstNegativeSecondPositive'"],
      ["'both_negative'", "'bothNegative'"],
      ["'use_cases'", "'useCases'"],
      ["'parametric_equivalent'", "'parametricEquivalent'"],
    ]
  },
  {
    file: 'public/workers/python/worker1-descriptive.py',
    replacements: [
      ["'critical_value'", "'criticalValue'"],
    ]
  },
];

for (const { file, replacements } of pyFixes) {
  let content = readFileSync(file, 'utf8');
  let original = content;
  let changes = 0;

  for (const [from, to] of replacements) {
    const regex = new RegExp(escapeRegex(from), 'g');
    const m = content.match(regex);
    if (m) { changes += m.length; content = content.replace(regex, to); }
  }

  if (content !== original) {
    writeFileSync(file, content, 'utf8');
    const outPath = file.replace('public/', 'out/');
    writeFileSync(outPath, content, 'utf8');
    console.log(`✅ ${file} (${changes}개)`);
    total += changes;
  }
}

console.log(`\n📊 총 ${total}개 수정`);
