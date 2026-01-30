import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const basePath = 'd:/Projects/Statics/statistical-platform/app/(dashboard)/statistics';

// Method ID mapping
const methodIdMap = {
  'ancova': 'ancova',
  'arima': 'arima',
  'cluster': 'cluster-analysis',
  'cochran-q': 'cochran-q',
  'cox-regression': 'cox-regression',
  'discriminant': 'discriminant-analysis',
  'dose-response': 'dose-response',
  'factor-analysis': 'factor-analysis',
  'kaplan-meier': 'kaplan-meier',
  'manova': 'manova',
  'mann-kendall': 'mann-kendall-test',
  'means-plot': 'means-plot',
  'mixed-model': 'mixed-model',
  'mood-median': 'mood-median',
  'one-sample-t': 'one-sample-t',
  'ordinal-regression': 'ordinal-regression',
  'partial-correlation': 'partial-correlation',
  'pca': 'pca',
  'poisson': 'poisson-regression',
  'power-analysis': 'power-analysis',
  'proportion-test': 'one-sample-proportion',
  'reliability': 'reliability-analysis',
  'repeated-measures-anova': 'repeated-measures-anova',
  'response-surface': 'response-surface',
  'seasonal-decompose': 'seasonal-decompose',
  'stepwise': 'stepwise-regression',
  'welch-t': 'welch-t'
};

// Analysis name descriptions (in Korean)
const analysisDescriptions = {
  'ancova': 'ANCOVA',
  'arima': 'ARIMA',
  'cluster-analysis': 'Cluster Analysis',
  'cochran-q': "Cochran's Q Test",
  'cox-regression': 'Cox Regression',
  'discriminant-analysis': 'Discriminant Analysis',
  'dose-response': 'Dose-Response Analysis',
  'factor-analysis': 'Factor Analysis',
  'kaplan-meier': 'Kaplan-Meier Analysis',
  'manova': 'MANOVA',
  'mann-kendall-test': 'Mann-Kendall Test',
  'means-plot': 'Means Plot',
  'mixed-model': 'Mixed Model',
  'mood-median': "Mood's Median Test",
  'one-sample-t': 'One-Sample t-Test',
  'ordinal-regression': 'Ordinal Regression',
  'partial-correlation': 'Partial Correlation',
  'pca': 'PCA',
  'poisson-regression': 'Poisson Regression',
  'power-analysis': 'Power Analysis',
  'one-sample-proportion': 'One-Sample Proportion Test',
  'reliability-analysis': 'Reliability Analysis',
  'repeated-measures-anova': 'Repeated Measures ANOVA',
  'response-surface': 'Response Surface',
  'seasonal-decompose': 'Seasonal Decomposition',
  'stepwise-regression': 'Stepwise Regression',
  'welch-t': "Welch's t-Test"
};

function findEndOfImports(content) {
  // Find the last complete import statement (ends with line that is not inside a multi-line import)
  // We need to track if we're inside { } braces for multi-line imports

  const lines = content.split('\n');
  let lastImportEndLine = -1;
  let inMultiLineImport = false;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line starts an import
    if (line.trim().startsWith('import ')) {
      // Count braces
      for (const char of line) {
        if (char === '{') braceDepth++;
        if (char === '}') braceDepth--;
      }

      // Check if import ends on this line
      if (line.includes(' from ') && braceDepth === 0) {
        lastImportEndLine = i;
      } else if (braceDepth > 0) {
        inMultiLineImport = true;
      }
    } else if (inMultiLineImport) {
      // Continue counting braces
      for (const char of line) {
        if (char === '{') braceDepth++;
        if (char === '}') braceDepth--;
      }

      // Check if this line ends the multi-line import
      if (line.includes(' from ') && braceDepth === 0) {
        lastImportEndLine = i;
        inMultiLineImport = false;
      } else if (braceDepth === 0 && line.includes("'")) {
        // Line ends with just the from clause
        lastImportEndLine = i;
        inMultiLineImport = false;
      }
    } else if (!line.trim().startsWith('import ') && !line.trim().startsWith('//') && line.trim() !== '' && !line.trim().startsWith('*') && !line.trim().startsWith("'use client'")) {
      // We've gone past imports
      break;
    }
  }

  if (lastImportEndLine === -1) return -1;

  // Find the character position of the end of this line
  let pos = 0;
  for (let i = 0; i <= lastImportEndLine; i++) {
    pos += lines[i].length + 1; // +1 for newline
  }
  return pos - 1; // Position after the line (before next line's newline)
}

function applyHookToPage(pageName) {
  const filePath = join(basePath, pageName, 'page.tsx');

  if (!existsSync(filePath)) {
    console.log(`Skipping ${pageName} - file not found`);
    return false;
  }

  let content = readFileSync(filePath, 'utf8');

  const methodId = methodIdMap[pageName];
  const description = analysisDescriptions[methodId] || methodId;

  // Check if already has the hook (properly - not inside corrupted import)
  if (content.includes("import { useAnalysisGuide }") && !content.match(/import \{[\s\S]*import \{ useAnalysisGuide \}/m)) {
    console.log(`Skipping ${pageName} - already has useAnalysisGuide`);
    return false;
  }

  // First, fix any corrupted imports from previous run
  // Pattern: import { ... import { AnalysisGuidePanel ... from 'lucide-react'
  // We need to remove the incorrectly inserted lines

  // Remove corrupted imports
  content = content.replace(/import \{ AnalysisGuidePanel \} from '@\/components\/statistics\/common\/AnalysisGuidePanel'\n/g, '');
  content = content.replace(/import \{ AssumptionChecklist \} from '@\/components\/statistics\/common\/AssumptionChecklist'\n/g, '');
  content = content.replace(/import \{ useAnalysisGuide \} from '@\/hooks\/use-analysis-guide'\n/g, '');

  // Also remove the added hook if it exists
  content = content.replace(/\n\n  \/\/ Analysis Guide Hook\n  const \{ methodMetadata, assumptionItems \} = useAnalysisGuide\(\{\n    methodId: '[^']+'\n  \}\)/g, '');

  // Remove the added UI components if they exist
  content = content.replace(/\n      \{methodMetadata && \(\n        <AnalysisGuidePanel[\s\S]*?\/>\n      \)\}\n\n      \{assumptionItems\.length > 0 && \(\n        <AssumptionChecklist[\s\S]*?\/>\n      \)\}\n\n      /g, '\n      ');

  // 1. Add imports after existing imports
  const importEndPosition = findEndOfImports(content);
  if (importEndPosition > 0) {
    const importsToAdd = `
import { AnalysisGuidePanel } from '@/components/statistics/common/AnalysisGuidePanel'
import { AssumptionChecklist } from '@/components/statistics/common/AssumptionChecklist'
import { useAnalysisGuide } from '@/hooks/use-analysis-guide'`;

    content = content.slice(0, importEndPosition) + importsToAdd + content.slice(importEndPosition);
  }

  // 2. Add hook call after useStatisticsPage
  // Find useStatisticsPage hook call
  const hookPattern = /const \{ state, actions \} = useStatisticsPage[^}]+\}\)/;
  const hookMatch = content.match(hookPattern);

  if (hookMatch) {
    const hookEndPosition = content.indexOf(hookMatch[0]) + hookMatch[0].length;
    const hookToAdd = `

  // Analysis Guide Hook
  const { methodMetadata, assumptionItems } = useAnalysisGuide({
    methodId: '${methodId}'
  })`;

    content = content.slice(0, hookEndPosition) + hookToAdd + content.slice(hookEndPosition);
  }

  // 3. Find renderMethodIntroduction and add components before the closing Button
  const renderMethodPattern = /const renderMethodIntroduction = useCallback\(\(\) => \(/;
  const renderMethodMatch = content.match(renderMethodPattern);

  if (renderMethodMatch) {
    const funcStart = content.indexOf(renderMethodMatch[0]);

    // Look for the pattern of the button section (various forms)
    const buttonPatterns = [
      /<div className="flex justify-end">\s*<Button/,
      /<div className="flex justify-center">\s*<Button/,
      /<div className="text-center">\s*<Button/,
      /<Button onClick=\{\(\) => actions\.setCurrentStep/,
    ];

    let buttonMatch = null;
    let buttonPosition = -1;

    // Search from funcStart onwards (but limit to reasonable range)
    const searchContent = content.slice(funcStart, funcStart + 10000);

    for (const pattern of buttonPatterns) {
      const match = searchContent.match(pattern);
      if (match) {
        const pos = funcStart + searchContent.indexOf(match[0]);
        if (buttonPosition === -1 || pos < buttonPosition) {
          buttonPosition = pos;
          buttonMatch = match[0];
        }
      }
    }

    if (buttonPosition > -1) {
      const componentsToAdd = `{methodMetadata && (
        <AnalysisGuidePanel
          method={methodMetadata}
          sections={['variables', 'assumptions']}
          defaultExpanded={['variables']}
        />
      )}

      {assumptionItems.length > 0 && (
        <AssumptionChecklist
          assumptions={assumptionItems}
          showProgress={true}
          collapsible={true}
          title="Analysis Assumptions"
          description="${description} assumptions to verify before analysis."
        />
      )}

      `;

      content = content.slice(0, buttonPosition) + componentsToAdd + content.slice(buttonPosition);
    }
  }

  // 4. Update useCallback dependencies for renderMethodIntroduction
  const renderMethodStart = content.indexOf('const renderMethodIntroduction = useCallback');
  if (renderMethodStart > -1) {
    // Find the first closing pattern after renderMethodIntroduction
    const afterRenderMethod = content.slice(renderMethodStart);

    // Look for ], [actions]) or ], [])
    const closingPattern = /\), \[(actions)?\]\)/;
    const closingMatch = afterRenderMethod.match(closingPattern);

    if (closingMatch) {
      const closingIndex = renderMethodStart + afterRenderMethod.indexOf(closingMatch[0]);
      const hasActions = closingMatch[1] === 'actions';

      const newDeps = hasActions
        ? '), [actions, methodMetadata, assumptionItems])'
        : '), [methodMetadata, assumptionItems])';

      content = content.slice(0, closingIndex) + newDeps + content.slice(closingIndex + closingMatch[0].length);
    }
  }

  writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${pageName}`);
  return true;
}

// Process all pages
const pages = Object.keys(methodIdMap);
let updated = 0;
let skipped = 0;

for (const page of pages) {
  if (applyHookToPage(page)) {
    updated++;
  } else {
    skipped++;
  }
}

console.log(`\nCompleted: ${updated} updated, ${skipped} skipped`);
