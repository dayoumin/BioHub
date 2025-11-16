/**
 * TwoPanelLayout 마이그레이션 스크립트
 *
 * StatisticsPageLayout → TwoPanelLayout 자동 변환
 *
 * 사용법:
 *   node scripts/migrate-to-two-panel.js <page-name>
 *   예: node scripts/migrate-to-two-panel.js descriptive
 */

const fs = require('fs');
const path = require('path');

const pageName = process.argv[2];

if (!pageName) {
  console.error('Usage: node scripts/migrate-to-two-panel.js <page-name>');
  process.exit(1);
}

const pagePath = path.join(__dirname, `../app/(dashboard)/statistics/${pageName}/page.tsx`);

if (!fs.existsSync(pagePath)) {
  console.error(`Page not found: ${pagePath}`);
  process.exit(1);
}

let content = fs.readFileSync(pagePath, 'utf-8');

// 백업 생성
const backupPath = `${pagePath}.backup`;
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, content);
  console.log(`✓ Backup created: ${backupPath}`);
}

// 1. Import 변경
const oldImport = `import { StatisticsPageLayout, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'`;
const newImport = `import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataPreviewPanel } from '@/components/statistics/common/DataPreviewPanel'`;

if (content.includes(oldImport)) {
  content = content.replace(oldImport, newImport);
  console.log('✓ Import statements updated');
}

// 2. StatisticsPageLayout 제거 및 TwoPanelLayout 추가 (수동 작업 필요)
console.log(`
⚠️  Manual steps required:

1. Replace <StatisticsPageLayout> with:
   <TwoPanelLayout
     breadcrumbs={[
       { label: '홈', href: '/' },
       { label: '통계 분석', href: '/statistics' },
       { label: '페이지 제목' }
     ]}
     data={uploadedData}
   >
     {/* Main content */}
     <div className="space-y-6">
       {renderMethodology()}
       {/* ... other content ... */}
     </div>

     {/* Bottom panel: Data Preview */}
     <DataPreviewPanel data={uploadedData} />
   </TwoPanelLayout>

2. Remove 'steps' and 'StatisticsStep' related code

3. Add StepProgress component if needed:
   import { StepProgress } from '@/components/statistics/common/StepProgress'

4. Test the page: npm run dev
`);

// 변경된 내용 저장
fs.writeFileSync(pagePath, content);
console.log(`\n✓ File updated: ${pagePath}`);
console.log('✓ Please complete manual steps above');
