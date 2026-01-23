import { readFileSync, writeFileSync } from 'fs';

// Fix mcnemar - odds_ratio is not a valid type, use 'r' as closest alternative
const mcnemarPath = 'app/(dashboard)/statistics/mcnemar/page.tsx';
let mcnemarContent = readFileSync(mcnemarPath, 'utf8');
mcnemarContent = mcnemarContent.replace(
  `type="odds_ratio"`,
  `type="r"`
);
writeFileSync(mcnemarPath, mcnemarContent, 'utf8');
console.log('mcnemar: Fixed odds_ratio -> r');

// Fix means-plot - showVisualScale -> showVisualization
const meansPlotPath = 'app/(dashboard)/statistics/means-plot/page.tsx';
let meansPlotContent = readFileSync(meansPlotPath, 'utf8');
meansPlotContent = meansPlotContent.replace(
  /showVisualScale={true}/g,
  'showVisualization={true}'
);
writeFileSync(meansPlotPath, meansPlotContent, 'utf8');
console.log('means-plot: Fixed showVisualScale -> showVisualization');

// Fix mixed-model - showVisualScale -> showVisualization
const mixedModelPath = 'app/(dashboard)/statistics/mixed-model/page.tsx';
let mixedModelContent = readFileSync(mixedModelPath, 'utf8');
mixedModelContent = mixedModelContent.replace(
  /showVisualScale={true}/g,
  'showVisualization={true}'
);
writeFileSync(mixedModelPath, mixedModelContent, 'utf8');
console.log('mixed-model: Fixed showVisualScale -> showVisualization');

// Fix one-sample-t - cohens_d -> cohen_d and showVisualScale -> showVisualization
const oneSampleTPath = 'app/(dashboard)/statistics/one-sample-t/page.tsx';
let oneSampleTContent = readFileSync(oneSampleTPath, 'utf8');
oneSampleTContent = oneSampleTContent.replace(
  `type="cohens_d"`,
  `type="cohen_d"`
);
oneSampleTContent = oneSampleTContent.replace(
  /showVisualScale={true}/g,
  'showVisualization={true}'
);
writeFileSync(oneSampleTPath, oneSampleTContent, 'utf8');
console.log('one-sample-t: Fixed cohens_d -> cohen_d and showVisualScale -> showVisualization');

// Fix ordinal-regression - showVisualScale -> showVisualization
const ordinalRegressionPath = 'app/(dashboard)/statistics/ordinal-regression/page.tsx';
let ordinalRegressionContent = readFileSync(ordinalRegressionPath, 'utf8');
ordinalRegressionContent = ordinalRegressionContent.replace(
  /showVisualScale={true}/g,
  'showVisualization={true}'
);
writeFileSync(ordinalRegressionPath, ordinalRegressionContent, 'utf8');
console.log('ordinal-regression: Fixed showVisualScale -> showVisualization');

console.log('\nAll migration errors fixed!');
