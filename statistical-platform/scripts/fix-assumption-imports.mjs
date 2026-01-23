/**
 * Fix broken imports for AssumptionTestCard
 */

import { readFileSync, writeFileSync } from 'fs';

const files = [
  'app/(dashboard)/statistics/poisson/page.tsx',
  'app/(dashboard)/statistics/stepwise/page.tsx',
  'app/(dashboard)/statistics/ancova/page.tsx',
  'app/(dashboard)/statistics/anova/page.tsx',
  'app/(dashboard)/statistics/regression/page.tsx'
];

for (const file of files) {
  try {
    let content = readFileSync(file, 'utf8');

    // Fix broken import pattern:
    // import { PValueBadge }
    // import { AssumptionTestCard } from '@/components/statistics/common/AssumptionTestCard' from '@/components/statistics/common/PValueBadge'

    const brokenPattern = /import \{ PValueBadge \}\nimport \{ AssumptionTestCard \} from '@\/components\/statistics\/common\/AssumptionTestCard' from '@\/components\/statistics\/common\/PValueBadge'/g;

    const fixedImport = `import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { AssumptionTestCard } from '@/components/statistics/common/AssumptionTestCard'`;

    if (content.match(brokenPattern)) {
      content = content.replace(brokenPattern, fixedImport);
      writeFileSync(file, content, 'utf8');
      console.log(`✅ Fixed: ${file}`);
    } else {
      console.log(`⏭️  Skipped (no broken pattern): ${file}`);
    }
  } catch (err) {
    console.log(`⚠️  Error reading ${file}: ${err.message}`);
  }
}

console.log('\n✅ Import fix complete');