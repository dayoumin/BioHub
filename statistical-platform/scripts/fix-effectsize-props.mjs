import { readFileSync, writeFileSync } from 'fs';

// The issue: EffectSizeCard uses showVisualScale, ConfidenceIntervalDisplay uses showVisualization
// We need to fix cases where we incorrectly changed EffectSizeCard's prop

const files = [
  'app/(dashboard)/statistics/one-sample-t/page.tsx',
  'app/(dashboard)/statistics/manova/page.tsx',
  'app/(dashboard)/statistics/mann-whitney/page.tsx',
  'app/(dashboard)/statistics/kaplan-meier/page.tsx'
];

// Pattern: EffectSizeCard should have showVisualScale, not showVisualization
for (const filePath of files) {
  try {
    let content = readFileSync(filePath, 'utf8');

    // Find EffectSizeCard components and ensure they have showVisualScale, not showVisualization
    content = content.replace(
      /<EffectSizeCard([^>]*?)showVisualization={true}([^>]*?)\/>/g,
      '<EffectSizeCard$1showVisualScale={true}$2/>'
    );

    writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  } catch (err) {
    console.log(`Skipped (no changes needed or file not found): ${filePath}`);
  }
}

console.log('\nEffectSizeCard prop fixes complete!');
