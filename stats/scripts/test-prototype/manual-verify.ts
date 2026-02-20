
import { getInterpretation } from '../../lib/interpretation/engine';

// --- Simplified Mock Data Generator for specific tests ---
function createManualMockData(method: string, significant: boolean) {
    const base: any = {
        method,
        statistic: significant ? 10.5 : 0.5,
        pValue: significant ? 0.001 : 0.5,
        groupStats: [
            { name: 'Group A', mean: 50, std: 10, n: 30 },
            { name: 'Group B', mean: significant ? 60 : 51, std: 10, n: 30 }
        ],
        additional: {}
    };

    if (method === 'Independent t-test') {
        // T-test specific structure is largely covered by base
    }

    if (method === 'Pearson Correlation') {
        base.statistic = significant ? 0.85 : 0.15; // r value
        base.additional = {
            // Correlation often doesn't need extra 'additional' fields for basic interpretation
            // but let's ensure it caters to what the engine expects
        };
    }

    return base;
}

async function runManualCheck() {
    console.log('🔍 Manual Verification of 2 Selected Methods\n');

    // 1. Independent t-test
    console.log('--- Case 1: Independent t-test (Significant) ---');
    const tTestData = createManualMockData('Independent t-test', true);
    const tTestResult = getInterpretation(tTestData, '차이 비교');
    console.log('Input:', JSON.stringify(tTestData, null, 2));
    console.log('Result:', JSON.stringify(tTestResult, null, 2));
    console.log('\n---------------------------------------------------\n');

    // 2. Pearson Correlation
    console.log('--- Case 2: Pearson Correlation (Non-Significant) ---');
    const corrData = createManualMockData('Pearson Correlation', false);
    const corrResult = getInterpretation(corrData, '상관 관계');
    console.log('Input:', JSON.stringify(corrData, null, 2));
    console.log('Result:', JSON.stringify(corrResult, null, 2));
}

runManualCheck();
