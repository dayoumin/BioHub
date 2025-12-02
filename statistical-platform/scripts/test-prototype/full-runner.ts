/**
 * Full Automated Test Runner with HTML Reporting
 * 
 * Covers ~43 statistical methods supported by the engine.
 * Generates test-report.html for user visualization.
 */

import { getInterpretation } from '../../lib/interpretation/engine';
import fs from 'fs';
import path from 'path';

// --- Data Factory (Inline for simplicity in this script) ---

const randomP = (significant: boolean) => significant ? 0.001 : 0.5;
const randomStat = (significant: boolean) => significant ? 10.5 : 0.5;

function collectInterpretationText(result?: { summary?: string; statistical?: string; practical?: string | null }) {
    const parts = [
        result?.summary,
        result?.statistical,
        result?.practical ?? undefined
    ].filter(Boolean) as string[];

    return parts.join(' ');
}

function createMockData(method: string, significant: boolean) {
    const pValue = randomP(significant);
    const statistic = randomStat(significant);
    const methodLower = method.toLowerCase();

    // Base structure with extended type for dynamic properties
    const base: {
        method: string;
        statistic: number;
        pValue: number;
        groupStats: { name: string; mean: number; std: number; n: number }[];
        additional: Record<string, unknown>;
        coefficients?: { name: string; value: number; pvalue: number }[];
        postHoc?: { comparison: string; pValue: number; significant: boolean }[];
    } = {
        method,
        statistic,
        pValue,
        groupStats: [
            { name: 'Group A', mean: 50, std: 10, n: 30 },
            { name: 'Group B', mean: significant ? 60 : 51, std: 10, n: 30 }
        ],
        additional: {}
    };

    // Specific adjustments based on method type
    if (methodLower.includes('regression') || methodLower.includes('logistic') || methodLower.includes('poisson')) {
        base['coefficients'] = [
            { name: 'Intercept', value: 1.0, pvalue: 0.05 },
            { name: 'Predictor', value: significant ? 2.5 : 0.1, pvalue: pValue }
        ];
        base.additional.rSquared = significant ? 0.7 : 0.1;
        if (methodLower.includes('logistic')) base.additional.accuracy = 0.85;
        if (methodLower.includes('poisson')) base.additional.pseudo_r_squared_mcfadden = 0.6;
    }

    if (methodLower.includes('anova') || methodLower.includes('kruskal')) {
        base.groupStats.push({ name: 'Group C', mean: 55, std: 10, n: 30 });
        if (significant) {
            base['postHoc'] = [{ comparison: 'A-B', pValue: 0.001, significant: true }];
        }
    }

    if (methodLower.includes('correlation')) {
        base.statistic = significant ? 0.8 : 0.1; // r value
    }

    if (methodLower.includes('cronbach')) {
        base.additional.alpha = significant ? 0.85 : 0.5;
    }

    if (methodLower.includes('cluster')) {
        base.additional.silhouetteScore = significant ? 0.75 : 0.2;
        base.additional.clusters = [1, 1, 2, 2, 3, 3];
    }

    if (methodLower.includes('pca') || methodLower.includes('factor')) {
        base.additional.explainedVarianceRatio = [0.5, 0.3, 0.1];
    }

    if (methodLower.includes('power')) {
        base.additional = {
            analysisType: 'post-hoc',
            sampleSize: 100,
            power: significant ? 0.9 : 0.4,
            effectSize: 0.5
        };
    }

    if (methodLower.includes('response surface') || methodLower.includes('rsm')) {
        base.statistic = significant ? 25.4 : 4.2;
        const rsmPValue = significant ? 0.004 : 0.18;
        base.pValue = rsmPValue;
        base.additional = {
            ...base.additional,
            rSquared: significant ? 0.88 : 0.45,
            adjRSquared: significant ? 0.85 : 0.55,
            model_type: 'second_order',
            modelCoefficients: [
                { name: 'Intercept', value: 5.1 },
                { name: 'x1', value: significant ? 2.1 : 0.5 },
                { name: 'x2', value: significant ? 1.7 : 0.2 },
                { name: 'x1:x2', value: significant ? 0.9 : 0.1 },
                { name: 'x1^2', value: significant ? -0.8 : -0.1 },
                { name: 'x2^2', value: significant ? -0.6 : -0.05 }
            ]
        };
        base.coefficients = [
            { name: 'Intercept', value: 5.1, pvalue: 0.02 },
            { name: 'x1', value: significant ? 2.1 : 0.5, pvalue: rsmPValue },
            { name: 'x2', value: significant ? 1.7 : 0.2, pvalue: rsmPValue },
            { name: 'x1:x2', value: significant ? 0.9 : 0.1, pvalue: rsmPValue },
            { name: 'x1^2', value: significant ? -0.8 : -0.1, pvalue: rsmPValue },
            { name: 'x2^2', value: significant ? -0.6 : -0.05, pvalue: rsmPValue }
        ];
    }

    if (methodLower.includes('discriminant')) {
        base.additional.accuracy = significant ? 0.85 : 0.4;
        base.additional.wilksLambda = { pValue: pValue, significant };
    }

    if (methodLower.includes('proportion')) {
        base.additional.sampleProportion = 0.6;
        base.additional.nullProportion = 0.5;
        base.additional.pValueExact = pValue;
    }

    if (methodLower.includes('means plot')) {
        const baseMean = 50;
        const diff = significant ? 12 : 3;
        base.additional.plotData = [
            { group: 'Group A', mean: baseMean, ciLower: baseMean - 5, ciUpper: baseMean + 5 },
            { group: 'Group B', mean: baseMean + diff, ciLower: baseMean + diff - 5, ciUpper: baseMean + diff + 5 },
            { group: 'Group C', mean: baseMean - diff / 2, ciLower: baseMean - diff / 2 - 4, ciUpper: baseMean - diff / 2 + 4 }
        ];
        base.additional.descriptives = {
            A: { mean: baseMean, std: 8, n: 25 },
            B: { mean: baseMean + diff, std: 9, n: 26 },
            C: { mean: baseMean - diff / 2, std: 7, n: 24 }
        };
    }

    if (methodLower.includes('one-sample')) {
        base.additional.mean = 55;
        base.additional.testValue = 50;
    }

    if (methodLower.includes('run test') || methodLower.includes('runs test')) {
        const n1 = 22;
        const n2 = 18;
        base.additional.runs = significant ? 6 : 19;
        base.additional.n1 = n1;
        base.additional.n2 = n2;
        base.additional.total = n1 + n2;
        base.additional.expectedRuns = 2 * n1 * n2 / (n1 + n2) + 1;
        base.additional.zScore = significant ? 3.2 : 0.4;
    }

    if (methodLower.includes('descriptive') || methodLower.includes('explore')) {
        base.additional = { mean: 50, median: 50, std: 10, n: 100, skewness: 0.1, kurtosis: 0.1 };
    }

    if (methodLower.includes('sign test')) {
        const positives = significant ? 28 : 14;
        const negatives = significant ? 8 : 16;
        base.statistic = positives - negatives;
        base.pValue = significant ? 0.01 : 0.6;
        base.additional.positives = positives;
        base.additional.negatives = negatives;
        base.additional.ties = 2;
    }

    if (methodLower.includes('binomial')) {
        const trials = 50;
        const successes = significant ? 40 : 27;
        const expectedProb = 0.5;
        base.statistic = successes;
        base.pValue = significant ? 0.012 : 0.42;
        base.additional.trials = trials;
        base.additional.successes = successes;
        base.additional.expectedProbability = expectedProb;
        base.additional.observedProbability = successes / trials;
    }

    return base;
}

// --- List of Methods to Test ---
const METHODS = [
    // Group Comparison
    'Independent t-test', 'Paired t-test', 'One-sample t-test',
    'One-way ANOVA', 'Two-way ANOVA', 'Repeated Measures ANOVA', 'ANCOVA', 'MANOVA',
    'Mann-Whitney U Test', 'Wilcoxon Signed-Rank Test', 'Kruskal-Wallis Test', 'Friedman Test',

    // Regression & Prediction
    'Linear Regression', 'Multiple Regression', 'Logistic Regression', 'Ordinal Regression',
    'Poisson Regression', 'Stepwise Regression', 'Discriminant Analysis',

    // Association
    'Pearson Correlation', 'Spearman Correlation', 'Partial Correlation',
    'Chi-square Test', 'Fisher\'s Exact Test', 'McNemar Test',

    // Advanced
    'Mixed Model', 'Response Surface Analysis', 'Dose-Response Analysis', 'Power Analysis',

    // Others
    'Shapiro-Wilk Test', 'Levene\'s Test', 'Cronbach\'s Alpha',
    'K-means Clustering', 'PCA', 'Factor Analysis',
    'Sign Test', 'Run Test', 'Binomial Test', 'Cochran\'s Q Test',
    'Descriptive Statistics', 'Proportion Test', 'Means Plot'
];

// --- HTML Template ---
const generateHtml = (rows: string[]) => `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>Automated Test Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1000px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    .summary { display: flex; gap: 20px; margin-bottom: 20px; }
    .card { flex: 1; padding: 15px; border-radius: 6px; text-align: center; color: white; }
    .pass { background: #10b981; }
    .fail { background: #ef4444; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f9fafb; font-weight: 600; }
    tr:hover { background: #f9fafb; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .badge-pass { background: #d1fae5; color: #065f46; }
    .badge-fail { background: #fee2e2; color: #991b1b; }
    .details { font-size: 12px; color: #666; max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Automated Analysis Engine Test Report</h1>
    <div class="summary">
      <div class="card pass">
        <h2>${rows.filter(r => r.includes('badge-pass')).length}</h2>
        <div>Passed</div>
      </div>
      <div class="card fail">
        <h2>${rows.filter(r => r.includes('badge-fail')).length}</h2>
        <div>Failed</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Method</th>
          <th>Scenario</th>
          <th>Status</th>
          <th>Output Summary</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('\n')}
      </tbody>
    </table>
  </div>
</body>
</html>
`;

async function run() {
    const rows: string[] = [];
    let passCount = 0;
    let failCount = 0;

    console.log('🚀 Running full test suite...');

    for (const method of METHODS) {
        // Test 1: Significant
        try {
            let purpose = undefined;
            if (method.includes('t-test')) purpose = '차이 비교';
            if (method.includes('Regression')) purpose = '회귀 예측';
            if (method.includes('Correlation')) purpose = '상관 관계';

            const dataSig = createMockData(method, true);
            const resultSig = getInterpretation(dataSig as any, purpose);
            const interpretationText = collectInterpretationText(resultSig || undefined);
            const keyPhrases = [
                '\uc720\uc758', // significance
                '\ucc28\uc774', // difference
                '\ud6a8\uacfc', // effect
                '\uad00\uacc4', // relationship
                '\uac15\ud55c', // strong
                '\uc801\ud569', // fit/adequate
                '\ub9cc\uc871', // satisfactory
                '\uacc4\uc218', // coefficient
                '\uad6c\uc870', // structure
                '\uc124\uba85', // explanation
                '\uc815\uaddc', // normality
                '\ubd84\ud3ec', // distribution
                '\ubb34\uc791'  // randomness
            ];

            const isPassSig = !!resultSig && keyPhrases.some(phrase => interpretationText.includes(phrase));


            rows.push(`
        <tr>
          <td>${method}</td>
          <td>Significant</td>
          <td><span class="badge ${isPassSig ? 'badge-pass' : 'badge-fail'}">${isPassSig ? 'PASS' : 'FAIL'}</span></td>
          <td class="details" title="${resultSig?.summary || 'No result'}">${resultSig?.summary || 'No result'}</td>
        </tr>
      `);

            // Test 2: Non-Significant
            const dataNon = createMockData(method, false);
            const resultNon = getInterpretation(dataNon as any, purpose);

            // For non-significant, we just check if it runs and produces output
            // Optionally check for "유의하지 않음" etc.
            const isPassNon = !!resultNon;

            rows.push(`
        <tr>
          <td>${method}</td>
          <td>Non-Significant</td>
          <td><span class="badge ${isPassNon ? 'badge-pass' : 'badge-fail'}">${isPassNon ? 'PASS' : 'FAIL'}</span></td>
          <td class="details" title="${resultNon?.summary || 'No result'}">${resultNon?.summary || 'No result'}</td>
        </tr>
      `);

        } catch (e) {
            console.error(`Error testing ${method}:`, e);
            rows.push(`
        <tr>
          <td>${method}</td>
          <td>Error</td>
          <td><span class="badge badge-fail">ERROR</span></td>
          <td>${e}</td>
        </tr>
      `);
        }
    }

    const html = generateHtml(rows);
    const outputPath = path.join(process.cwd(), 'public', 'test-report.html');
    fs.writeFileSync(outputPath, html);

    console.log(`✅ Report generated at: ${outputPath}`);
}

run();
