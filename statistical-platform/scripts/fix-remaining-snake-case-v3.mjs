import { readFileSync, writeFileSync } from 'fs';

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

const fixes = [
  {
    file: 'app/(dashboard)/statistics/mann-kendall/page.tsx',
    replacements: [['var_s', 'varS']]
  },
];

const pyFixes = [
  {
    file: 'public/workers/python/worker2-hypothesis.py',
    replacements: [
      ["'first_order'", "'firstOrder'"],
      ["'first_order_interaction'", "'firstOrderInteraction'"],
      ["'second_order'", "'secondOrder'"],
      ["'model_quality'", "'modelQuality'"],
      ["'n_outliers'", "'nOutliers'"],
      ["'outlier_indices'", "'outlierIndices'"],
      ["'correlation_matrix'", "'correlationMatrix'"],
      ["'max_correlation'", "'maxCorrelation'"],
      ["'is_acceptable'", "'isAcceptable'"],
    ]
  },
];

let total = 0;

for (const { file, replacements } of [...fixes, ...pyFixes]) {
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
    if (file.startsWith('public/')) {
      writeFileSync(file.replace('public/', 'out/'), content, 'utf8');
    }
    console.log(`✅ ${file} (${changes}개)`);
    total += changes;
  }
}

console.log(`\n📊 총 ${total}개 수정`);
