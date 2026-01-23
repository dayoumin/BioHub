/**
 * Fix statistic/pValue types in stepwise page
 * - statistic: number | undefined (use undefined when no statistic)
 * - pValue: number | null (use null when no p-value)
 */

import { readFileSync, writeFileSync } from 'fs';

const file = 'app/(dashboard)/statistics/stepwise/page.tsx';
let content = readFileSync(file, 'utf8');

// statistic: null -> statistic: undefined (correct)
// but pValue: null should remain null, NOT undefined

// First fix: statistic should be undefined not null
content = content.replace(/statistic: null,/g, 'statistic: undefined,');

// Second fix: pValue: undefined back to pValue: null (if it was changed)
content = content.replace(/pValue: undefined,/g, 'pValue: null,');

writeFileSync(file, content, 'utf8');
console.log('✅ Fixed stepwise page types:');
console.log('   - statistic: null -> undefined');
console.log('   - pValue: null (kept as null)');
