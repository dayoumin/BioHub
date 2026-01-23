import { readFileSync, writeFileSync } from 'fs';

// Fix one-sample-t: cohen_d -> cohens_d
const oneSampleTPath = 'app/(dashboard)/statistics/one-sample-t/page.tsx';
let content = readFileSync(oneSampleTPath, 'utf8');
content = content.replace('type="cohen_d"', 'type="cohens_d"');
writeFileSync(oneSampleTPath, content, 'utf8');
console.log('Fixed: one-sample-t cohen_d -> cohens_d');
