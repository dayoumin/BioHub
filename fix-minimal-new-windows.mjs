// Fix minimal new window implementations in sign-test, runs-test, mood-median
import { readFileSync, writeFileSync } from 'fs';

const files = [
  'statistical-platform/app/(dashboard)/statistics/sign-test/page.tsx',
  'statistical-platform/app/(dashboard)/statistics/runs-test/page.tsx',
  'statistical-platform/app/(dashboard)/statistics/mood-median/page.tsx'
];

const oldHandler = `  // Open new window handler
  const handleOpenNewWindow = useCallback(() => {
    if (!uploadedData) return
    // Open data in new window for detailed view
    const newWindow = window.open('', '_blank')
    if (newWindow) {
      newWindow.document.write(\`<h1>\${uploadedData.fileName}</h1>\`)
    }
  }, [uploadedData])`;

const newHandler = `  // Open new window handler
  const handleOpenNewWindow = useCallback(() => {
    if (!uploadedData) return
    openDataWindow({
      fileName: uploadedData.fileName,
      columns: uploadedData.columns,
      data: uploadedData.data
    })
  }, [uploadedData])`;

for (const filePath of files) {
  let content = readFileSync(filePath, 'utf8');

  // Add import if not exists
  if (!content.includes("import { openDataWindow }")) {
    // Find a good place to add import (after other lib imports)
    if (content.includes("from '@/lib/")) {
      const libImportMatch = content.match(/import .+ from '@\/lib\/[^']+'/g);
      if (libImportMatch) {
        const lastLibImport = libImportMatch[libImportMatch.length - 1];
        content = content.replace(
          lastLibImport,
          lastLibImport + "\nimport { openDataWindow } from '@/lib/utils/open-data-window'"
        );
      }
    } else {
      // Add after 'use client'
      content = content.replace(
        "'use client'",
        "'use client'\n\nimport { openDataWindow } from '@/lib/utils/open-data-window'"
      );
    }
  }

  // Replace handler
  if (content.includes(oldHandler)) {
    content = content.replace(oldHandler, newHandler);
    writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
  } else {
    console.log(`⚠️ Handler not found exactly: ${filePath}`);
  }
}

console.log('\n✅ Done!');
