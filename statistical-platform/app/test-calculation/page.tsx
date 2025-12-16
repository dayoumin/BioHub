
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum';

export default function TestCalculationPage() {
    const [status, setStatus] = useState('Idle');
    const [results, setResults] = useState<any>({});

    const runOneWayAnova = async () => {
        try {
            setStatus('Initializing Pyodide...');
            const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service');
            const pyodide = PyodideCoreService.getInstance();
            await pyodide.initialize();

            setStatus('Running ANOVA...');
            const groups = [
                [10, 11, 12],
                [20, 21, 22],
                [15, 16, 17]
            ];

            const result = await pyodide.callWorkerMethod(
                PyodideWorker.NonparametricAnova,
                'one_way_anova',
                { groups }
            );

            setResults(prev => ({ ...prev, anova: result }));
            setStatus('ANOVA Done');
        } catch (e) {
            console.error(e);
            setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
        }
    };

    const runTTest = async () => {
        try {
            setStatus('Initializing Pyodide...');
            const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service');
            const pyodide = PyodideCoreService.getInstance();
            await pyodide.initialize();

            setStatus('Running T-Test...');
            const result = await pyodide.callWorkerMethod(
                PyodideWorker.Hypothesis,
                't_test_two_sample',
                {
                    group1: [10, 12],
                    group2: [20, 22],
                    equalVar: true
                }
            );

            setResults(prev => ({ ...prev, ttest: result }));
            setStatus('T-Test Done');
        } catch (e) {
            console.error(e);
            const msg = e instanceof Error ? `${e.message} \nStack: ${e.stack}` : String(e);
            setStatus(`Error: ${msg}`);
        }
    };

    return (
        <div className="p-8 space-y-4">
            <h1 className="text-2xl font-bold">Calculation Core Test</h1>
            <div data-testid="status" className="p-2 bg-muted whitespace-pre-wrap">{status}</div>

            <div className="flex gap-4">
                <Button onClick={runOneWayAnova} data-testid="btn-anova">Run ANOVA</Button>
                <Button onClick={runTTest} data-testid="btn-ttest">Run T-Test</Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardHeader><CardTitle>ANOVA Result</CardTitle></CardHeader>
                    <CardContent>
                        <pre data-testid="result-anova">{JSON.stringify(results.anova, null, 2)}</pre>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>T-Test Result</CardTitle></CardHeader>
                    <CardContent>
                        <pre data-testid="result-ttest">{JSON.stringify(results.ttest, null, 2)}</pre>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
