import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChartSpec, DataPackage } from '@/types/graph-studio';
import { MatplotlibExportService } from '@/lib/services/matplotlib-export.service';

const ensureWorkerLoadedMock = vi.fn();
const callWorkerMethodMock = vi.fn();
const downloadBase64FileMock = vi.fn();

vi.mock('@/lib/services/pyodide/core/pyodide-core.service', () => ({
  PyodideCoreService: {
    getInstance: () => ({
      ensureWorkerLoaded: ensureWorkerLoadedMock,
      callWorkerMethod: callWorkerMethodMock,
    }),
  },
}));

vi.mock('@/lib/graph-studio/export-utils', () => ({
  downloadBase64File: (...args: unknown[]) => downloadBase64FileMock(...args),
}));

function makeSpec(overrides: Partial<ChartSpec> = {}): ChartSpec {
  return {
    version: '1.0',
    chartType: 'line',
    title: 'Growth Curve',
    data: {
      sourceId: 'pkg-1',
      columns: [
        { name: 'time', type: 'quantitative', uniqueCount: 3, sampleValues: ['1', '2', '3'], hasNull: false },
        { name: 'value', type: 'quantitative', uniqueCount: 3, sampleValues: ['10', '20', '30'], hasNull: false },
      ],
    },
    encoding: {
      x: { field: 'time', type: 'quantitative' },
      y: { field: 'value', type: 'quantitative' },
    },
    style: { preset: 'default' },
    annotations: [],
    exportConfig: { format: 'png', dpi: 300 },
    ...overrides,
  };
}

function makeDataPackage(): DataPackage {
  return {
    id: 'pkg-1',
    source: 'upload',
    label: 'growth.csv',
    columns: [],
    data: {
      time: [1, 2, 3],
      value: [10, 20, 30],
    },
    createdAt: new Date().toISOString(),
  };
}

describe('MatplotlibExportService', () => {
  beforeEach(() => {
    ensureWorkerLoadedMock.mockReset();
    callWorkerMethodMock.mockReset();
    downloadBase64FileMock.mockReset();
  });

  it('blocks incompatible specs before calling the worker', async () => {
    const service = MatplotlibExportService.getInstance();

    await expect(service.exportChart(
      makeSpec({ encoding: { x: { field: 'time', type: 'quantitative' }, y: { field: 'value', type: 'quantitative' }, y2: { field: 'secondary', type: 'quantitative' } } }),
      makeDataPackage(),
      { format: 'pdf', dpi: 300, physicalWidthMm: 86, physicalHeightMm: 60, style: 'science' },
    )).rejects.toThrow(/보조 Y축\(y2\)/);

    expect(ensureWorkerLoadedMock).not.toHaveBeenCalled();
    expect(callWorkerMethodMock).not.toHaveBeenCalled();
    expect(downloadBase64FileMock).not.toHaveBeenCalled();
  });

  it('downloads the rendered file and returns worker warnings for supported specs', async () => {
    ensureWorkerLoadedMock.mockResolvedValue(undefined);
    callWorkerMethodMock.mockResolvedValue({
      base64Data: 'QUJD',
      mimeType: 'application/pdf',
      extension: 'pdf',
      warnings: ['SciencePlots fallback active'],
    });
    downloadBase64FileMock.mockResolvedValue(undefined);

    const service = MatplotlibExportService.getInstance();
    const result = await service.exportChart(
      makeSpec(),
      makeDataPackage(),
      { format: 'pdf', dpi: 300, physicalWidthMm: 86, physicalHeightMm: 60, style: 'science' },
    );

    expect(ensureWorkerLoadedMock).toHaveBeenCalledWith(6);
    expect(callWorkerMethodMock).toHaveBeenCalled();
    expect(downloadBase64FileMock).toHaveBeenCalledWith(
      'QUJD',
      'application/pdf',
      'Growth Curve',
      'pdf',
    );
    expect(result.warnings).toEqual(['SciencePlots fallback active']);
  });
});
